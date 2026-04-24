import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowLeft, Edit, Save, FileText, Clock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { WorkflowStepper } from '../components/WorkflowStepper';
import type { Workspace, User } from '../types';
import api from '../../lib/api';

interface Invoice {
  id: string;
  invoice_number: string;
  vendor_name: string;
  amount: number;
  currency: string;
  invoice_date: string;
  due_date: string;
  notes: string;
  current_status: string;
  created_at: string;
  created_by_name?: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft:          { label: 'Draft',          className: 'bg-gray-100 text-gray-700 border-gray-200' },
  pending_review: { label: 'Pending Review', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  approved:       { label: 'Approved',       className: 'bg-green-100 text-green-700 border-green-200' },
  rejected:       { label: 'Rejected',       className: 'bg-red-100 text-red-700 border-red-200' },
};

export function InvoiceDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { currentWorkspace, currentUser } = useOutletContext<{
    currentWorkspace: Workspace;
    currentUser: User;
  }>();

  const [invoice, setInvoice]         = useState<Invoice | null>(null);
  const [status, setStatus]           = useState('draft');
  const [notes, setNotes]             = useState('');
  const [loading, setLoading]         = useState(true);
  const [notesError, setNotesError]   = useState(false);
  const [isEditing, setIsEditing]     = useState(false);
  const [editForm, setEditForm]       = useState({
    invoice_number: '',
    vendor_name: '',
    amount: '',
    invoice_date: '',
    due_date: '',
  });

  const canSubmitForReview = status === 'draft' && 
  (currentWorkspace?.role === 'Employee' || currentWorkspace?.role === 'Director');

  useEffect(() => {
    if (!currentWorkspace?.id || !id) return;
    api.get(`/workspaces/${currentWorkspace.id}/invoices/${id}`)
      .then(({ data }) => {
        const inv = data.invoice;
        setInvoice(inv);
        setStatus(inv.current_status);
        setNotes(inv.notes ?? '');
        setEditForm({
          invoice_number: inv.invoice_number ?? '',
          vendor_name: inv.vendor_name ?? '',
          amount: inv.amount ?? '',
          invoice_date: inv.invoice_date?.split('T')[0] ?? '',
          due_date: inv.due_date?.split('T')[0] ?? '',
        });
      })
      .catch(() => toast.error('Failed to load invoice'))
      .finally(() => setLoading(false));
  }, [currentWorkspace?.id, id]);

  const handleApprove = async () => {
    try {
      await api.patch(`/workspaces/${currentWorkspace.id}/invoices/${id}/status`, {
        status: 'approved',
        comment: notes || null,
      });
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
      await api.patch(`/workspaces/${currentWorkspace.id}/invoices/${id}/status`, {
        status: 'rejected',
        comment: notes,
      });
      setStatus('rejected');
      toast.error('Invoice rejected');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reject invoice');
    }
  };

  const handleSaveEdit = async () => {
    try {
      const { data } = await api.put(`/workspaces/${currentWorkspace.id}/invoices/${id}`, editForm);
      setInvoice(prev => prev ? { ...prev, ...data.invoice } : prev);
      setIsEditing(false);
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

  const canApproveReject = currentWorkspace?.role === 'Accountant' && status === 'pending_review';
  const canEdit = (currentWorkspace?.role === 'Accountant' || currentWorkspace?.role === 'Employee') && status === 'draft';

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Clock className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <p className="text-muted-foreground">Invoice not found</p>
        <Button variant="outline" onClick={() => navigate('/dashboard/invoices')}>
          Back to Invoices
        </Button>
      </div>
    );
  }

  const badge = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/invoices')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">
            {invoice.invoice_number ?? 'Untitled Invoice'}
          </h1>
          <Badge className={`border ${badge.className}`} variant="outline">
            {badge.label}
          </Badge>
        </div>
      </div>

      {/* Workflow Stepper */}
      <WorkflowStepper status={status as any} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — PDF + Invoice Info */}

        <div className="bg-card rounded-lg border p-6">
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
        </div>

        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Invoice Information</h2>
            {canEdit && !isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
            {isEditing && (
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit}>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </div>

          {/* Always show the grid — edit form overlays only when editing */}
          {isEditing ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Invoice Number</label>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editForm.invoice_number}
                  onChange={e => setEditForm(p => ({ ...p, invoice_number: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vendor</label>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editForm.vendor_name}
                  onChange={e => setEditForm(p => ({ ...p, vendor_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount ({invoice.currency})</label>
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editForm.amount}
                  onChange={e => setEditForm(p => ({ ...p, amount: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Invoice Date</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editForm.invoice_date}
                  onChange={e => setEditForm(p => ({ ...p, invoice_date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Due Date</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editForm.due_date}
                  onChange={e => setEditForm(p => ({ ...p, due_date: e.target.value }))}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Invoice Number</p>
                <p className="mt-1 font-medium text-foreground">{invoice.invoice_number ?? '—'}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Vendor</p>
                <p className="mt-1 font-medium text-foreground">{invoice.vendor_name ?? '—'}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Amount</p>
                <p className="mt-1 font-medium text-foreground">
                  {invoice.currency} {Number(invoice.amount ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Uploaded By</p>
                <p className="mt-1 font-medium text-foreground">{invoice.created_by_name ?? '—'}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Invoice Date</p>
                <p className="mt-1 font-medium text-foreground">{formatDate(invoice.invoice_date)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Due Date</p>
                <p className="mt-1 font-medium text-foreground">{formatDate(invoice.due_date)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
                <p className="mt-1 font-medium text-foreground capitalize">{status.replace('_', ' ')}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Submitted</p>
                <p className="mt-1 font-medium text-foreground">{formatDate(invoice.created_at)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right — Notes + Actions */}
        <div className="space-y-6">

          {/* OCR placeholder */}
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">OCR Data</h2>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">OCR processing not yet available</p>
              <p className="text-xs text-muted-foreground mt-1">Data will appear here once processed</p>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Notes</h2>
            <textarea
              value={notes}
              onChange={e => {
                setNotes(e.target.value);
                if (notesError && e.target.value.trim()) setNotesError(false);
              }}
              placeholder="Add notes about this invoice..."
              rows={4}
              disabled={currentWorkspace?.role === 'Director'}
              className={`w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                notesError ? 'border-red-500 focus:ring-red-500' : 'border-input'
              }`}
            />
            {notesError && (
              <p className="text-xs text-destructive mt-1">
                Please add rejection notes before rejecting
              </p>
            )}
          </div>

          {canSubmitForReview && (
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Actions</h2>
              <Button
                className="w-full"
                onClick={async () => {
                  try {
                    await api.patch(`/workspaces/${currentWorkspace.id}/invoices/${id}/status`, {
                      status: 'pending_review',
                    });
                    setStatus('pending_review');
                    toast.success('Invoice submitted for review');
                  } catch (err: any) {
                    toast.error(err.response?.data?.error || 'Failed to submit invoice');
                  }
                }}
              >
                Submit for Review
              </Button>
            </div>
          )}

          {/* Validation Actions */}
          {canApproveReject && (
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Validation Actions</h2>
              <div className="space-y-3">
                <Button
                  className="w-full transition-opacity hover:opacity-80"
                  style={{ backgroundColor: 'var(--success)', color: 'var(--success-foreground)' }}
                  onClick={handleApprove}
                >
                  Approve Invoice
                </Button>
                <Button
                  className="w-full transition-opacity hover:opacity-80"
                  style={{ backgroundColor: 'var(--destructive)', color: 'var(--destructive-foreground)' }}
                  onClick={handleReject}
                >
                  Reject Invoice
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}