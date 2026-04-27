import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Save, AlertCircle, Loader2,
  CheckCircle2, XCircle, FileText, Clock,
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import api from '../../lib/api';
import type { Workspace, User } from '../types';
import { WorkflowStepper } from '../components/WorkflowStepper';

interface ExtractedField {
  id: string;
  field_name: string;
  field_value: string;
  confidence: number;
  needs_review: boolean;
  manually_corrected: boolean;
}

interface Invoice {
  id: string;
  invoice_number: string;
  vendor_name: string;
  amount: number;
  currency: string;
  invoice_date: string;
  due_date: string;
  current_status: string;
  ocr_status: string;
  ocr_confidence: number;
  created_at: string;
  created_by_name: string;
  notes: string;
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  draft:          { color: 'bg-gray-100 text-gray-700',    label: 'Draft' },
  pending_review: { color: 'bg-yellow-100 text-yellow-700', label: 'Pending Review' },
  approved:       { color: 'bg-green-100 text-green-700',   label: 'Approved' },
  rejected:       { color: 'bg-red-100 text-red-700',      label: 'Rejected' },
  paid:           { color: 'bg-blue-100 text-blue-700',    label: 'Paid' },
  archived:       { color: 'bg-slate-100 text-slate-700',  label: 'Archived' },
};

const FIELD_LABELS: Record<string, string> = {
  invoice_number: 'Invoice Number',
  invoice_date:   'Invoice Date',
  total_amount:   'Total Amount',
  tax_amount:     'Tax Amount',
  supplier_name:  'Supplier Name',
};

export function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentWorkspace, currentUser } = useOutletContext<{
    currentWorkspace: Workspace;
    currentUser: User;
  }>();

  const [invoice, setInvoice]           = useState<Invoice | null>(null);
  const [fields, setFields]             = useState<ExtractedField[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [isEditing, setIsEditing]       = useState(false);
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const [notes, setNotes]               = useState('');
  const [notesError, setNotesError]     = useState(false);
  const [status, setStatus]             = useState('draft');

  // Basic field editing (for when OCR hasn't run yet)
  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [basicForm, setBasicForm] = useState({
    invoice_number: '',
    vendor_name: '',
    amount: '',
    invoice_date: '',
    due_date: '',
  });

  useEffect(() => {
    if (!id || !currentWorkspace?.id) return;

    const fetchInvoice = async () => {
      setIsLoading(true);
      try {
        const { data: invoiceData } = await api.get(
          `/workspaces/${currentWorkspace.id}/invoices/${id}`
        );
        const inv = invoiceData.invoice;
        setInvoice(inv);
        setStatus(inv.current_status);
        setNotes(inv.notes || '');
        setBasicForm({
          invoice_number: inv.invoice_number ?? '',
          vendor_name:    inv.vendor_name ?? '',
          amount:         inv.amount ?? '',
          invoice_date:   inv.invoice_date?.split('T')[0] ?? '',
          due_date:       inv.due_date?.split('T')[0] ?? '',
        });

        // Fetch OCR fields
        try {
          const { data: fieldsData } = await api.get(
            `/workspaces/${currentWorkspace.id}/invoices/${id}/fields`
          );
          setFields(fieldsData.fields || []);
          const initial: Record<string, string> = {};
          fieldsData.fields?.forEach((f: ExtractedField) => {
            initial[f.field_name] = f.field_value;
          });
          setEditedFields(initial);
        } catch {
          // OCR fields not available yet — that's fine
          setFields([]);
        }

      } catch {
        toast.error('Failed to load invoice');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoice();
  }, [id, currentWorkspace?.id]);

  // ── Role-based permissions ─────────────────────────────────────────────────
  const role = currentWorkspace?.role;

  // Employee: can submit draft for review
  // Director: can also submit draft for review
  const canSubmitForReview = status === 'draft' &&
    (role === 'Employee' || role === 'Director');

  // Accountant only: can approve or reject when pending_review
  const canApproveReject = role === 'Accountant' && status === 'pending_review';

  // Accountant and Director can edit OCR fields
  const canEditOCR = (role === 'Accountant' || role === 'Director') && fields.length > 0;

  // Employee and Accountant can edit basic fields on draft
  const canEditBasic = status === 'draft' &&
    (role === 'Employee' || role === 'Accountant' || role === 'Director');

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSubmitForReview = async () => {
    try {
      await api.patch(
        `/workspaces/${currentWorkspace.id}/invoices/${id}/status`,
        { status: 'pending_review' }
      );
      setStatus('pending_review');
      toast.success('Invoice submitted for review');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit invoice');
    }
  };

  const handleApprove = async () => {
    try {
      await api.patch(
        `/workspaces/${currentWorkspace.id}/invoices/${id}/status`,
        { status: 'approved', comment: notes || null }
      );
      setStatus('approved');
      toast.success('Invoice approved successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to approve invoice');
    }
  };

  const handleReject = async () => {
    if (!notes.trim()) {
      setNotesError(true);
      toast.error('Please add rejection notes before rejecting');
      return;
    }
    try {
      await api.patch(
        `/workspaces/${currentWorkspace.id}/invoices/${id}/status`,
        { status: 'rejected', comment: notes }
      );
      setStatus('rejected');
      toast.error('Invoice rejected');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reject invoice');
    }
  };

  const handleSaveOCRFields = async () => {
    try {
      for (const [fieldName, value] of Object.entries(editedFields)) {
        await api.patch(
          `/workspaces/${currentWorkspace.id}/invoices/${id}/fields/${fieldName}`,
          { value }
        );
      }
      toast.success('Fields updated successfully');
      setIsEditing(false);
      const { data } = await api.get(
        `/workspaces/${currentWorkspace.id}/invoices/${id}/fields`
      );
      setFields(data.fields || []);
    } catch {
      toast.error('Failed to save fields');
    }
  };

  const handleSaveBasic = async () => {
    try {
      const { data } = await api.put(
        `/workspaces/${currentWorkspace.id}/invoices/${id}`,
        basicForm
      );
      setInvoice(prev => prev ? { ...prev, ...data.invoice } : prev);
      setIsEditingBasic(false);
      toast.success('Invoice updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update invoice');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Invoice not found</h2>
        <Button variant="outline" onClick={() => navigate('/dashboard/invoices')}>
          Back to Invoices
        </Button>
      </div>
    );
  }

  const badge = STATUS_CONFIG[status] ?? { color: 'bg-gray-100 text-gray-700', label: status };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/invoices')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">
          {invoice.invoice_number || 'Untitled Invoice'}
        </h1>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${badge.color}`}>
          {badge.label}
        </span>
      </div>

      {/* Workflow Stepper */}
      <WorkflowStepper status={status as any} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Left column ── */}
        <div className="space-y-6">

          {/* PDF Placeholder */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Invoice Document</h2>
            </div>
            <div
              className="bg-muted rounded-lg flex flex-col items-center justify-center border cursor-pointer hover:bg-muted/70 transition-colors py-10"
              onClick={() => toast.info('Document viewer coming soon')}
            >
              <FileText className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No document uploaded yet</p>
              <p className="text-xs text-muted-foreground mt-1">Click to view full document</p>
            </div>
          </Card>

          {/* Invoice Information */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Invoice Information</h2>
              {canEditBasic && !isEditingBasic && (
                <Button variant="outline" size="sm" onClick={() => setIsEditingBasic(true)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              )}
              {isEditingBasic && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveBasic}>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditingBasic(false)}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            {isEditingBasic ? (
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Invoice Number', key: 'invoice_number', type: 'text' },
                  { label: 'Vendor',         key: 'vendor_name',    type: 'text' },
                  { label: `Amount (${invoice.currency})`, key: 'amount', type: 'number' },
                  { label: 'Invoice Date',   key: 'invoice_date',   type: 'date' },
                  { label: 'Due Date',       key: 'due_date',       type: 'date' },
                ].map(({ label, key, type }) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {label}
                    </label>
                    <input
                      type={type}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={(basicForm as any)[key]}
                      onChange={e => setBasicForm(p => ({ ...p, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Invoice Number', value: invoice.invoice_number ?? '—' },
                  { label: 'Vendor',         value: invoice.vendor_name ?? '—' },
                  { label: 'Amount',         value: `${invoice.currency} ${Number(invoice.amount ?? 0).toLocaleString()}` },
                  { label: 'Uploaded By',    value: invoice.created_by_name ?? '—' },
                  { label: 'Invoice Date',   value: formatDate(invoice.invoice_date) },
                  { label: 'Due Date',       value: formatDate(invoice.due_date) },
                  { label: 'Submitted',      value: formatDate(invoice.created_at) },
                  { label: 'Status',         value: status.replace('_', ' ') },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
                    <p className="mt-1 font-medium text-foreground capitalize">{value}</p>
                  </div>
                ))}
                {invoice.ocr_confidence && (
                  <div className="rounded-lg border p-3 col-span-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">OCR Confidence</p>
                    <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${invoice.ocr_confidence}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{Number(invoice.ocr_confidence).toFixed(1)}%</p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-6">

          {/* OCR Extracted Fields */}
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-foreground">Extracted Data (OCR)</h2>
                {invoice.ocr_confidence && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Confidence: {Number(invoice.ocr_confidence).toFixed(1)}%
                  </p>
                )}
              </div>
              {canEditOCR && (
                !isEditing ? (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleSaveOCRFields}>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                )
              )}
            </div>

            {invoice.ocr_status === 'processing' && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-sm text-muted-foreground">OCR is processing your document...</p>
              </div>
            )}

            {invoice.ocr_status === 'failed' && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-sm text-muted-foreground">OCR processing failed for this document.</p>
              </div>
            )}

            {(invoice.ocr_status === 'pending' || !invoice.ocr_status) && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Clock className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">OCR processing not yet available.</p>
                <p className="text-xs text-muted-foreground">Data will appear here once processed.</p>
              </div>
            )}

            {fields.length > 0 && (
              <div className="space-y-4">
                {fields.map((field) => (
                  <div key={field.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">
                        {FIELD_LABELS[field.field_name] || field.field_name}
                      </Label>
                      <div className="flex items-center gap-2">
                        {field.needs_review && (
                          <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
                            Needs Review
                          </span>
                        )}
                        {field.manually_corrected && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                            Corrected
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {Number(field.confidence).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <Input
                      value={editedFields[field.field_name] ?? field.field_value}
                      onChange={e => setEditedFields(prev => ({
                        ...prev,
                        [field.field_name]: e.target.value,
                      }))}
                      disabled={!isEditing}
                      className={field.needs_review ? 'border-yellow-400' : ''}
                    />
                  </div>
                ))}
              </div>
            )}

            {fields.length === 0 && invoice.ocr_status === 'completed' && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No fields could be extracted from this document.
                </p>
              </div>
            )}
          </Card>

          {/* Notes */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Notes</h2>
            <textarea
              value={notes}
              onChange={e => {
                setNotes(e.target.value);
                if (notesError && e.target.value.trim()) setNotesError(false);
              }}
              placeholder="Add notes about this invoice..."
              rows={4}
              disabled={role === 'Director' && status !== 'draft'}
              className={`w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                notesError ? 'border-red-500 focus:ring-red-500' : 'border-input'
              }`}
            />
            {notesError && (
              <p className="text-xs text-destructive mt-1">
                Please add rejection notes before rejecting
              </p>
            )}
          </Card>

          {/* Submit for Review — Employee or Director on draft */}
          {canSubmitForReview && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Actions</h2>
              <Button className="w-full" onClick={handleSubmitForReview}>
                Submit for Review
              </Button>
            </Card>
          )}

          {/* Approve / Reject — Accountant only on pending_review */}
          {canApproveReject && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Validation Actions</h2>
              <div className="space-y-3">
                <Button
                  className="w-full transition-opacity hover:opacity-80"
                  style={{ backgroundColor: 'var(--success)', color: 'var(--success-foreground)' }}
                  onClick={handleApprove}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve Invoice
                </Button>
                <Button
                  className="w-full transition-opacity hover:opacity-80"
                  style={{ backgroundColor: 'var(--destructive)', color: 'var(--destructive-foreground)' }}
                  onClick={handleReject}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject Invoice
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}