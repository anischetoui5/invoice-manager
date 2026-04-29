import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Save, AlertCircle, Loader2,
  CheckCircle2, XCircle, FileText, Clock, RefreshCw,
  ChevronLeft, ChevronRight, ExternalLink,
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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

interface Document {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  is_primary: boolean;
  created_at: string;
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

const parseToInputDate = (dateStr: string): string => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const dmy = dateStr.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  } catch { /* ignore */ }
  return '';
};

const isPdf = (doc: Document) =>
  doc.file_type === 'application/pdf' || doc.file_name?.toLowerCase().endsWith('.pdf');

const isImage = (doc: Document) =>
  doc.file_type?.startsWith('image/') ||
  /\.(jpe?g|png|gif|webp|tiff?)$/i.test(doc.file_name ?? '');

export function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentWorkspace } = useOutletContext<{
    currentWorkspace: Workspace;
    currentUser: User;
  }>();

  const [invoice, setInvoice]               = useState<Invoice | null>(null);
  const [fields, setFields]                 = useState<ExtractedField[]>([]);
  const [documents, setDocuments]           = useState<Document[]>([]);
  const [docIndex, setDocIndex]             = useState(0);
  const [docUrl, setDocUrl]                 = useState<string | null>(null);
  const [docLoading, setDocLoading]         = useState(false);
  const [isLoading, setIsLoading]           = useState(true);
  const [isEditing, setIsEditing]           = useState(false);
  const [editedFields, setEditedFields]     = useState<Record<string, string>>({});
  const [notes, setNotes]                   = useState('');
  const [notesError, setNotesError]         = useState(false);
  const [status, setStatus]                 = useState('draft');
  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [isPollingOCR, setIsPollingOCR]     = useState(false);
  const [zoomOpen, setZoomOpen]             = useState(false);
  const [basicForm, setBasicForm] = useState({
    invoice_number: '', vendor_name: '', amount: '', invoice_date: '', due_date: '',
  });

  const fetchDocuments = async (invoiceId: string, workspaceId: string) => {
    try {
      const { data } = await api.get(
        `/workspaces/${workspaceId}/invoices/${invoiceId}/documents`
      );
      const docs: Document[] = data.documents || [];
      const sorted = [...docs].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
      setDocuments(sorted);
      if (sorted.length > 0) {
        setDocIndex(0);
        await loadDocumentUrl(sorted[0], invoiceId, workspaceId);
      }
    } catch {
      setDocuments([]);
    }
  };

  const loadDocumentUrl = async (doc: Document, invoiceId: string, workspaceId: string) => {
    setDocLoading(true);
    setDocUrl(null);
    try {
      const res = await api.get(
        `/workspaces/${workspaceId}/invoices/${invoiceId}/documents/${doc.id}/download`,
        { responseType: 'blob' }
      );
      const blob = res.data;
      const mime = isPdf(doc) ? 'application/pdf' : (doc.file_type || 'image/jpeg');
      const typedBlob = new Blob([blob], { type: mime });
      const url = URL.createObjectURL(typedBlob);
      setDocUrl(url);
    } catch {
      toast.error('Failed to load document preview');
      setDocUrl(null);
    } finally {
      setDocLoading(false);
    }
  };

  const switchDocument = async (index: number) => {
    if (!id || !currentWorkspace?.id) return;
    setDocIndex(index);
    await loadDocumentUrl(documents[index], id, currentWorkspace.id);
  };

  const fetchFields = async (invoiceId: string, workspaceId: string) => {
    try {
      const { data: fieldsData } = await api.get(
        `/workspaces/${workspaceId}/invoices/${invoiceId}/fields`
      );
      const fetchedFields = fieldsData.fields || [];
      setFields(fetchedFields);
      const initial: Record<string, string> = {};
      fetchedFields.forEach((f: ExtractedField) => { initial[f.field_name] = f.field_value; });
      setEditedFields(initial);
      return initial;
    } catch {
      setFields([]);
      return {};
    }
  };

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

        const [initial] = await Promise.all([
          fetchFields(id, currentWorkspace.id),
          fetchDocuments(id, currentWorkspace.id),
        ]);

        if (Object.keys(initial).length > 0) {
          setBasicForm(prev => ({
            invoice_number: prev.invoice_number || initial['invoice_number'] || '',
            vendor_name:    prev.vendor_name    || initial['supplier_name']  || '',
            amount:         prev.amount         || initial['total_amount']   || '',
            invoice_date:   prev.invoice_date   || parseToInputDate(initial['invoice_date'] || '') || '',
            due_date:       prev.due_date       || '',
          }));
        }
      } catch {
        toast.error('Failed to load invoice');
      } finally {
        setIsLoading(false);
      }
    };
    fetchInvoice();
  }, [id, currentWorkspace?.id]);

  useEffect(() => {
    return () => { if (docUrl) URL.revokeObjectURL(docUrl); };
  }, [docUrl]);

  useEffect(() => {
    if (!invoice || !id || !currentWorkspace?.id) return;
    if (invoice.ocr_status !== 'processing') return;
    setIsPollingOCR(true);
    const interval = setInterval(async () => {
      try {
        const { data: invoiceData } = await api.get(
          `/workspaces/${currentWorkspace.id}/invoices/${id}`
        );
        const inv = invoiceData.invoice;
        if (inv.ocr_status !== 'processing') {
          setInvoice(inv);
          setStatus(inv.current_status);
          setIsPollingOCR(false);
          clearInterval(interval);
          if (inv.ocr_status === 'completed') {
            const initial = await fetchFields(id, currentWorkspace.id);
            setBasicForm(prev => ({
              invoice_number: prev.invoice_number || initial['invoice_number'] || '',
              vendor_name:    prev.vendor_name    || initial['supplier_name']  || '',
              amount:         prev.amount         || initial['total_amount']   || '',
              invoice_date:   prev.invoice_date   || parseToInputDate(initial['invoice_date'] || '') || '',
              due_date:       prev.due_date       || '',
            }));
            toast.success(`OCR completed — confidence: ${Number(inv.ocr_confidence).toFixed(1)}%`);
          } else if (inv.ocr_status === 'failed') {
            toast.error('OCR processing failed');
          }
        }
      } catch {
        clearInterval(interval);
        setIsPollingOCR(false);
      }
    }, 3000);
    return () => { clearInterval(interval); setIsPollingOCR(false); };
  }, [invoice?.ocr_status, id, currentWorkspace?.id]);

  const role = currentWorkspace?.role;
  const canSubmitForReview = status === 'draft' && (role === 'Employee' || role === 'Director');
  const canApproveReject   = role === 'Accountant' && status === 'pending_review';
  const canEditOCR         = status === 'draft' && (role === 'Director' || role === 'Employee' || role === 'Personal') && fields.length > 0;
  const canEditBasic       = status === 'draft' && (role === 'Employee' || role === 'Director' || role === 'Personal');
  const canDelete          = role === 'Director' && !['approved', 'paid', 'archived'].includes(status);

  const handleSyncFromOCR = () => {
    const ocrMap: Record<string, string> = {};
    fields.forEach(f => { ocrMap[f.field_name] = f.field_value; });
    setBasicForm(prev => ({
      invoice_number: ocrMap['invoice_number'] || prev.invoice_number,
      vendor_name:    ocrMap['supplier_name']  || prev.vendor_name,
      amount:         ocrMap['total_amount']   || prev.amount,
      invoice_date:   parseToInputDate(ocrMap['invoice_date'] || '') || prev.invoice_date,
      due_date:       prev.due_date,
    }));
    setIsEditingBasic(true);
    toast.info('Invoice fields populated from OCR — review and save');
  };

  const handleSubmitForReview = async () => {
    try {
      await api.patch(`/workspaces/${currentWorkspace.id}/invoices/${id}/status`, { status: 'pending_review' });
      setStatus('pending_review');
      toast.success('Invoice submitted for review');
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to submit invoice'); }
  };

  const handleApprove = async () => {
    try {
      await api.patch(`/workspaces/${currentWorkspace.id}/invoices/${id}/status`, { status: 'approved', comment: notes || null });
      setStatus('approved');
      toast.success('Invoice approved successfully');
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to approve invoice'); }
  };

  const handleReject = async () => {
    if (!notes.trim()) { setNotesError(true); toast.error('Please add rejection notes before rejecting'); return; }
    try {
      await api.patch(`/workspaces/${currentWorkspace.id}/invoices/${id}/status`, { status: 'rejected', comment: notes });
      setStatus('rejected');
      toast.error('Invoice rejected');
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to reject invoice'); }
  };

  const handleSaveOCRFields = async () => {
    try {
      await api.patch(`/workspaces/${currentWorkspace.id}/invoices/${id}/fields`, { fields: editedFields });
      toast.success('Fields updated successfully');
      setIsEditing(false);
      await fetchFields(id!, currentWorkspace.id);
    } catch { toast.error('Failed to save fields'); }
  };

  const handleSaveBasic = async () => {
    try {
      await api.put(`/workspaces/${currentWorkspace.id}/invoices/${id}`, basicForm);
      const { data: fresh } = await api.get(`/workspaces/${currentWorkspace.id}/invoices/${id}`);
      setInvoice(fresh.invoice);
      setIsEditingBasic(false);
      toast.success('Invoice updated successfully');
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to update invoice'); }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) return;
    try {
      await api.delete(`/workspaces/${currentWorkspace.id}/invoices/${id}`);
      toast.success('Invoice deleted successfully');
      navigate('/dashboard/invoices');
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to delete invoice'); }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
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
        <Button variant="outline" onClick={() => navigate('/dashboard/invoices')}>Back to Invoices</Button>
      </div>
    );
  }

  const badge = STATUS_CONFIG[status] ?? { color: 'bg-gray-100 text-gray-700', label: status };
  const activeDoc = documents[docIndex] ?? null;

  return (
    <div className="space-y-6">

      {/* Zoom Modal */}
      {zoomOpen && docUrl && activeDoc && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setZoomOpen(false)}
        >
          {/* Modal header */}
          <div
            style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 24px',
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>
              {activeDoc.file_name}
            </span>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <a
                href={docUrl}
                download={activeDoc.file_name}
                style={{
                  color: 'rgba(255,255,255,0.7)', fontSize: '13px',
                  textDecoration: 'none', padding: '6px 14px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '6px', transition: 'all 0.2s',
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.background = 'transparent'; }}
              >
                Download
              </a>
              <button
                onClick={() => setZoomOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '6px', color: 'white',
                  width: '32px', height: '32px',
                  cursor: 'pointer', fontSize: '18px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >×</button>
            </div>
          </div>

          {/* Modal content */}
          <div
            style={{ width: '90vw', height: '85vh', marginTop: '60px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {isPdf(activeDoc) ? (
              <iframe
                src={docUrl}
                title={activeDoc.file_name}
                style={{ width: '100%', height: '100%', borderRadius: '8px', border: 'none' }}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'auto',
              }}>
                <img
                  src={docUrl}
                  alt={activeDoc.file_name}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }}
                />
              </div>
            )}
          </div>

          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '12px' }}>
            Click outside to close
          </p>
        </div>
      )}

      {/* Header */}
      <><div className="flex items-center justify-between">
  <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/invoices')}>
    <ArrowLeft className="mr-2 h-4 w-4" /> Back
  </Button>
  {canDelete && (
    <Button size="sm" style={{ backgroundColor: 'var(--destructive)', color: 'var(--destructive-foreground)' }} onClick={handleDelete}>
      <XCircle className="mr-2 h-4 w-4" /> Delete Invoice
    </Button>
  )}
</div><div className="flex items-center gap-3">
    <h1 className="text-2xl font-bold text-foreground">{invoice.invoice_number || 'Untitled Invoice'}</h1>
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${badge.color}`}>{badge.label}</span>
  </div></>

      {['approved', 'paid', 'archived'].includes(status) && (
        <div className="rounded-lg px-4 py-3 text-sm font-medium" style={{ backgroundColor: 'var(--info)', color: 'var(--info-foreground)' }}>
          This invoice has been {status} — no further edits are allowed.
        </div>
      )}

      {role !== 'Personal' && <WorkflowStepper status={status as any} />}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">

          {/* Document Viewer */}
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">Invoice Document</h2>
              </div>
              {activeDoc && docUrl && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setZoomOpen(true)}
                    className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Expand
                  </button>
                </div>
              )}
            </div>

            {/* Viewer area */}
            <div className="overflow-hidden rounded-lg border border-border bg-slate-50" style={{ minHeight: 420 }}>
              {docLoading ? (
                <div className="flex h-[420px] items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : !activeDoc || !docUrl ? (
                <div className="flex h-[420px] flex-col items-center justify-center gap-3 text-center px-8">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No document uploaded yet</p>
                  <p className="text-xs text-muted-foreground">Upload a file to see it here</p>
                </div>
              ) : isPdf(activeDoc) ? (
                <div style={{ position: 'relative', height: '420px' }}>
                  <iframe
                    src={docUrl}
                    title={activeDoc.file_name}
                    className="h-full w-full rounded-lg border-0"
                    style={{ display: 'block', pointerEvents: 'none' }}
                  />
                  <div
                    onClick={() => setZoomOpen(true)}
                    style={{
                      position: 'absolute', inset: 0,
                      cursor: 'zoom-in',
                      background: 'transparent',
                    }}
                  />
                </div>
              ) : isImage(activeDoc) ? (
                <div
                  className="flex h-[420px] items-center justify-center overflow-auto bg-slate-100 p-3"
                  onClick={() => setZoomOpen(true)}
                  style={{ cursor: 'zoom-in' }}
                >
                  <img
                    src={docUrl}
                    alt={activeDoc.file_name}
                    className="max-h-full max-w-full rounded object-contain shadow-sm"
                  />
                </div>
              ) : (
                <div className="flex h-[420px] flex-col items-center justify-center gap-3 text-center px-8">
                  <FileText className="h-12 w-12 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{activeDoc.file_name}</p>
                  <a href={docUrl} target="_blank" rel="noopener noreferrer"
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                    Download File
                  </a>
                </div>
              )}
            </div>

            {/* Document tabs */}
            {documents.length > 0 && (
              <div className="mt-3">
                {documents.length === 1 ? (
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                    {isPdf(documents[0]) ? (
                      <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded bg-slate-200 flex-shrink-0 overflow-hidden">
                        {docUrl && isImage(documents[0]) && (
                          <img src={docUrl} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                    )}
                    <span className="truncate text-xs text-muted-foreground">{documents[0].file_name}</span>
                    {documents[0].is_primary && (
                      <span className="ml-auto rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 flex-shrink-0">Primary</span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => switchDocument(Math.max(0, docIndex - 1))}
                      disabled={docIndex === 0}
                      className="rounded-lg border border-border p-1.5 hover:bg-muted disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="flex flex-1 gap-1 overflow-x-auto">
                      {documents.map((doc, i) => (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => switchDocument(i)}
                          className={`flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left transition-colors ${
                            i === docIndex
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-border bg-background hover:bg-muted/50'
                          }`}
                        >
                          <FileText className={`h-3.5 w-3.5 flex-shrink-0 ${isPdf(doc) ? 'text-red-500' : 'text-blue-500'}`} />
                          <span className="truncate text-xs">{doc.file_name}</span>
                          {doc.is_primary && (
                            <span className="ml-auto flex-shrink-0 rounded-full bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">P</span>
                          )}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => switchDocument(Math.min(documents.length - 1, docIndex + 1))}
                      disabled={docIndex === documents.length - 1}
                      className="rounded-lg border border-border p-1.5 hover:bg-muted disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Invoice Information */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Invoice Information</h2>
              <div className="flex gap-2">
                {fields.length > 0 && canEditBasic && !isEditingBasic && (
                  <Button variant="outline" size="sm" onClick={handleSyncFromOCR}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Sync from OCR
                  </Button>
                )}
                {canEditBasic && !isEditingBasic && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditingBasic(true)}>
                    <Edit2 className="mr-2 h-4 w-4" /> Edit
                  </Button>
                )}
                {isEditingBasic && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveBasic}><Save className="mr-2 h-4 w-4" />Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setIsEditingBasic(false)}>Cancel</Button>
                  </div>
                )}
              </div>
            </div>

            {isEditingBasic ? (
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Invoice Number', key: 'invoice_number', type: 'text' },
                  { label: 'Vendor', key: 'vendor_name', type: 'text' },
                  { label: `Amount (${invoice.currency})`, key: 'amount', type: 'number' },
                  { label: 'Invoice Date', key: 'invoice_date', type: 'date' },
                  { label: 'Due Date', key: 'due_date', type: 'date' },
                ].map(({ label, key, type }) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
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
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${invoice.ocr_confidence}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{Number(invoice.ocr_confidence).toFixed(1)}%</p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Right column */}
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
                    <Edit2 className="mr-2 h-4 w-4" /> Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveOCRFields}><Save className="mr-2 h-4 w-4" />Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                  </div>
                )
              )}
            </div>

            {(invoice.ocr_status === 'processing' || isPollingOCR) ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-sm text-muted-foreground">OCR is processing your document...</p>
                <p className="text-xs text-muted-foreground">This page will update automatically</p>
              </div>
            ) : invoice.ocr_status === 'failed' ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-sm text-muted-foreground">OCR processing failed for this document.</p>
              </div>
            ) : (invoice.ocr_status === 'pending' || !invoice.ocr_status) ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Clock className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">OCR processing not yet available.</p>
                <p className="text-xs text-muted-foreground">Data will appear here once processed.</p>
              </div>
            ) : fields.length > 0 ? (
              <div className="space-y-4">
                {fields.map((field) => (
                  <div key={field.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">{FIELD_LABELS[field.field_name] || field.field_name}</Label>
                      <div className="flex items-center gap-2">
                        {field.needs_review && (
                          <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">Needs Review</span>
                        )}
                        {field.manually_corrected && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">Corrected</span>
                        )}
                        <span className="text-xs text-muted-foreground">{Number(field.confidence).toFixed(0)}%</span>
                      </div>
                    </div>
                    <Input
                      value={editedFields[field.field_name] ?? field.field_value}
                      onChange={e => setEditedFields(prev => ({ ...prev, [field.field_name]: e.target.value }))}
                      disabled={!isEditing}
                      className={field.needs_review ? 'border-yellow-400' : ''}
                    />
                  </div>
                ))}
              </div>
            ) : (
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
              disabled={['approved', 'paid', 'archived'].includes(status)}
              className={`w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                notesError ? 'border-red-500 focus:ring-red-500' : 'border-input'
              }`}
            />
            {notesError && (
              <p className="text-xs text-destructive mt-1">Please add rejection notes before rejecting</p>
            )}
          </Card>

          {canSubmitForReview && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Actions</h2>
              <Button className="w-full" onClick={handleSubmitForReview}>Submit for Review</Button>
            </Card>
          )}

          {canApproveReject && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Validation Actions</h2>
              <div className="space-y-3">
                <Button
                  className="w-full"
                  style={{ backgroundColor: 'var(--success)', color: 'var(--success-foreground)' }}
                  onClick={handleApprove}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Approve Invoice
                </Button>
                <Button
                  className="w-full"
                  style={{ backgroundColor: 'var(--destructive)', color: 'var(--destructive-foreground)' }}
                  onClick={handleReject}
                >
                  <XCircle className="mr-2 h-4 w-4" /> Reject Invoice
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}