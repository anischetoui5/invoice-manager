import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import {
  ArrowLeft, Download, CheckCircle2, XCircle,
  Edit2, Save, AlertCircle, Loader2,
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import api from '../../lib/api';
import type { Workspace, User } from '../types';

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

  const [invoice, setInvoice]       = useState<Invoice | null>(null);
  const [fields, setFields]         = useState<ExtractedField[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [isEditing, setIsEditing]   = useState(false);
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const [notes, setNotes]           = useState('');
  const [rejecting, setRejecting]   = useState(false);

  useEffect(() => {
    if (!id || !currentWorkspace?.id) return;

    const fetchInvoice = async () => {
      setIsLoading(true);
      try {
        // Fetch invoice details
        const { data: invoiceData } = await api.get(
          `/workspaces/${currentWorkspace.id}/invoices/${id}`
        );
        setInvoice(invoiceData.invoice);
        setNotes(invoiceData.invoice.notes || '');

        // Fetch OCR extracted fields
        const { data: fieldsData } = await api.get(
          `/workspaces/${currentWorkspace.id}/invoices/${id}/fields`
        );
        setFields(fieldsData.fields || []);

        // Set initial editable values
        const initial: Record<string, string> = {};
        fieldsData.fields?.forEach((f: ExtractedField) => {
          initial[f.field_name] = f.field_value;
        });
        setEditedFields(initial);

      } catch (err: any) {
        toast.error('Failed to load invoice');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoice();
  }, [id, currentWorkspace?.id]);

  const handleSaveFields = async () => {
    try {
      for (const [fieldName, value] of Object.entries(editedFields)) {
        await api.patch(
          `/workspaces/${currentWorkspace.id}/invoices/${id}/fields/${fieldName}`,
          { value }
        );
      }
      toast.success('Fields updated successfully');
      setIsEditing(false);

      // Refresh fields
      const { data } = await api.get(
        `/workspaces/${currentWorkspace.id}/invoices/${id}/fields`
      );
      setFields(data.fields || []);
    } catch (err: any) {
      toast.error('Failed to save fields');
    }
  };

  const handleApprove = async () => {
    try {
      await api.patch(
        `/workspaces/${currentWorkspace.id}/invoices/${id}/status`,
        { status: 'approved', comment: 'Approved by accountant' }
      );
      toast.success('Invoice approved successfully');
      setTimeout(() => navigate('/dashboard/invoices'), 1000);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to approve invoice');
    }
  };

  const handleReject = async () => {
    if (!notes.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    try {
      await api.patch(
        `/workspaces/${currentWorkspace.id}/invoices/${id}/status`,
        { status: 'rejected', comment: notes }
      );
      toast.success('Invoice rejected');
      setTimeout(() => navigate('/dashboard/invoices'), 1000);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reject invoice');
    }
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
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-slate-400" />
        <h2 className="mt-4 text-xl font-semibold">Invoice not found</h2>
        <Button className="mt-6" onClick={() => navigate('/dashboard/invoices')}>
          Back to Invoices
        </Button>
      </div>
    );
  }

  const badge = STATUS_CONFIG[invoice.current_status] ?? {
    color: 'bg-gray-100 text-gray-700',
    label: invoice.current_status,
  };

  const canValidate = ['Director', 'Accountant'].includes(currentWorkspace?.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/invoices')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800">
                {invoice.invoice_number || 'No Invoice Number'}
              </h1>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${badge.color}`}>
                {badge.label}
              </span>
            </div>
            <p className="mt-1 text-slate-600">{invoice.vendor_name}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left — Invoice Info */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="mb-4 font-semibold text-slate-800">Invoice Information</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-slate-600">Uploaded by</dt>
                <dd className="text-sm font-medium">{invoice.created_by_name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-600">Upload date</dt>
                <dd className="text-sm font-medium">
                  {new Date(invoice.created_at).toLocaleDateString()}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-600">Amount</dt>
                <dd className="text-sm font-medium">
                  {invoice.currency} {Number(invoice.amount).toLocaleString()}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-600">Invoice date</dt>
                <dd className="text-sm font-medium">
                  {invoice.invoice_date
                    ? new Date(invoice.invoice_date).toLocaleDateString()
                    : '—'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-600">Due date</dt>
                <dd className="text-sm font-medium">
                  {invoice.due_date
                    ? new Date(invoice.due_date).toLocaleDateString()
                    : '—'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-600">OCR Status</dt>
                <dd className="text-sm font-medium capitalize">{invoice.ocr_status}</dd>
              </div>
              {invoice.ocr_confidence && (
                <div className="flex justify-between">
                  <dt className="text-sm text-slate-600">OCR Confidence</dt>
                  <dd className="text-sm font-medium">
                    {Number(invoice.ocr_confidence).toFixed(1)}%
                  </dd>
                </div>
              )}
            </dl>
          </Card>

          {/* Notes */}
          <Card className="p-6">
            <h3 className="mb-4 font-semibold text-slate-800">Notes</h3>
            <Textarea
              placeholder="Add notes or reason for rejection..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px]"
            />
          </Card>

          {/* Validation Actions */}
          {canValidate && invoice.current_status !== 'approved' && invoice.current_status !== 'rejected' && (
            <Card className="p-6">
              <h3 className="mb-4 font-semibold text-slate-800">Validation Actions</h3>
              <div className="flex gap-3">
                <Button className="flex-1" onClick={handleApprove}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve
                </Button>
                <Button variant="destructive" className="flex-1" onClick={handleReject}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Right — OCR Extracted Fields */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-800">Extracted Data (OCR)</h2>
                {invoice.ocr_confidence && (
                  <p className="mt-1 text-sm text-slate-500">
                    Confidence: {Number(invoice.ocr_confidence).toFixed(1)}%
                  </p>
                )}
              </div>
              {fields.length > 0 && canValidate && (
                !isEditing ? (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleSaveFields}>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                )
              )}
            </div>

            {invoice.ocr_status === 'processing' && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-sm text-slate-600">OCR is processing your document...</p>
              </div>
            )}

            {invoice.ocr_status === 'failed' && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <p className="text-sm text-slate-600">OCR processing failed for this document.</p>
              </div>
            )}

            {invoice.ocr_status === 'pending' && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <AlertCircle className="h-8 w-8 text-yellow-500" />
                <p className="text-sm text-slate-600">OCR has not started yet.</p>
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
                        <span className="text-xs text-slate-500">
                          {Number(field.confidence).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <Input
                      value={editedFields[field.field_name] ?? field.field_value}
                      onChange={(e) =>
                        setEditedFields((prev) => ({
                          ...prev,
                          [field.field_name]: e.target.value,
                        }))
                      }
                      disabled={!isEditing}
                      className={field.needs_review ? 'border-yellow-400' : ''}
                    />
                  </div>
                ))}
              </div>
            )}

            {fields.length === 0 && invoice.ocr_status === 'completed' && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <AlertCircle className="h-8 w-8 text-slate-400" />
                <p className="text-sm text-slate-600">
                  No fields could be extracted from this document.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}