import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useOutletContext, Link } from 'react-router-dom';
import {
  Upload, X, CheckCircle2, FileText, Image as ImageIcon, AlertTriangle,
} from 'lucide-react';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import type { Workspace } from '../types';
import api from '../../lib/api';

interface FileEntry {
  file: File;
  objectUrl: string;
  isPdf: boolean;
  pageCount?: number;
  dimensions?: string;
  metaLoading: boolean;
}

const STEPS = [
  { id: 1, label: 'Select Files' },
  { id: 2, label: 'Add Details' },
  { id: 3, label: 'Upload' },
];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center w-full max-w-xs mx-auto">
      {STEPS.map((step, i) => {
        const done   = currentStep > step.id;
        const active = currentStep === step.id;
        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={`
                flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold border-2 transition-all duration-300
                ${done   ? 'bg-primary border-primary text-primary-foreground'
                         : active ? 'bg-background border-primary text-primary'
                         : 'bg-background border-border text-muted-foreground'}
              `}>
                {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : step.id}
              </div>
              <span className={`text-[11px] whitespace-nowrap font-medium ${active ? 'text-primary' : done ? 'text-foreground' : 'text-muted-foreground'}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mb-5 mx-1 transition-all duration-500 ${done ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function loadImageDimensions(url: string): Promise<string> {
  return new Promise(resolve => {
    const img = new window.Image();
    img.onload = () => resolve(`${img.naturalWidth} × ${img.naturalHeight}`);
    img.onerror = () => resolve('');
    img.src = url;
  });
}

function estimatePdfPages(bytes: number): number {
  return Math.max(1, Math.round(bytes / 100_000));
}

export function UploadInvoice() {
  const navigate = useNavigate();
  const { currentWorkspace, currentSubscription, refreshSubscription } = useOutletContext<{ currentWorkspace: Workspace; currentSubscription: any; refreshSubscription?: () => void }>();
  const { isLocked } = useSubscriptionGuard();

  const invoiceLimit = currentSubscription?.invoiceLimit ?? 0;
  const invoiceUsed  = currentSubscription?.invoiceUsed  ?? 0;
  const isAtLimit    = invoiceLimit > 0 && invoiceLimit !== -1 && invoiceUsed >= invoiceLimit;

  const [dragActive, setDragActive]     = useState(false);
  const [entries, setEntries]           = useState<FileEntry[]>([]);
  const [category, setCategory]         = useState('');
  const [vendor, setVendor]             = useState('');
  const [notes, setNotes]               = useState('');
  const [isUploading, setIsUploading]   = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const step = entries.length === 0 ? 1 : isUploading ? 3 : 2;

  useEffect(() => {
    return () => { entries.forEach(e => URL.revokeObjectURL(e.objectUrl)); };
  }, []);

  const enrichEntry = async (entry: FileEntry): Promise<FileEntry> => {
    if (entry.isPdf) {
      return { ...entry, pageCount: estimatePdfPages(entry.file.size), metaLoading: false };
    }
    const dimensions = await loadImageDimensions(entry.objectUrl);
    return { ...entry, dimensions, metaLoading: false };
  };

  const addFiles = async (incoming: File[]) => {
    const valid = incoming.filter(f => f.type === 'application/pdf' || f.type.startsWith('image/'));
    if (!valid.length) return;
    const newEntries: FileEntry[] = valid.map(f => ({
      file: f, objectUrl: URL.createObjectURL(f),
      isPdf: f.type === 'application/pdf', metaLoading: true,
    }));
    setEntries(prev => [...prev, ...newEntries]);
    setPreviewIndex(prev => prev === null ? 0 : prev);
    const enriched = await Promise.all(newEntries.map(enrichEntry));
    setEntries(prev => {
      const updated = [...prev];
      const startIdx = updated.length - enriched.length;
      enriched.forEach((e, i) => { updated[startIdx + i] = e; });
      return updated;
    });
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(entries[index].objectUrl);
    setEntries(prev => prev.filter((_, i) => i !== index));
    setPreviewIndex(prev => {
      if (prev === null) return null;
      if (prev === index) return entries.length > 1 ? Math.max(0, index - 1) : null;
      if (prev > index) return prev - 1;
      return prev;
    });
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (entries.length === 0) { toast.error('Please select at least one file'); return; }
    if (!category) { toast.error('Please select a category'); return; }
    setIsUploading(true);
    try {
      const workspaceId = currentWorkspace.id;
      const baseUrl = import.meta.env.VITE_API_URL ?? `http://${window.location.hostname}:3000/api`;
      const token = localStorage.getItem('token');

      const invoiceRes = await api.post(`/workspaces/${workspaceId}/invoices`, {
        vendor_name: vendor || 'Unknown Vendor', notes: notes || null, category: category || null,
      });
      const invoiceId = invoiceRes.data.invoice.id;

      for (let i = 0; i < entries.length; i++) {
        const fd = new FormData();
        fd.append('file', entries[i].file);
        fd.append('is_primary', i === 0 ? 'true' : 'false');
        const uploadRes = await fetch(
          `${baseUrl}/workspaces/${workspaceId}/invoices/${invoiceId}/documents`,
          { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd }
        );
        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({}));
          toast.error(`Failed to upload ${entries[i].file.name}: ${err.error ?? uploadRes.status}`);
          setIsUploading(false); return;
        }
      }
      toast.success('Invoice uploaded successfully!');
      refreshSubscription?.();
      navigate('/dashboard/invoices');
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
      setIsUploading(false);
    }
  };

  const categories = ['Office Supplies', 'Hardware', 'Software', 'Consulting', 'Marketing', 'Utilities', 'Food & Beverage', 'Travel', 'Other'];
  const activeEntry = previewIndex !== null ? entries[previewIndex] : null;

  return (
    <div className="mx-auto max-w-5xl space-y-5 page-enter">
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Upload Invoice</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Upload PDF or image files for automatic OCR processing</p>
        </div>
        <StepIndicator currentStep={step} />
      </div>

      {isLocked && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>Your subscription has expired. Renew to upload invoices.</span>
          <Link to="/dashboard/settings" className="ml-auto font-medium underline underline-offset-2">Renew</Link>
        </div>
      )}

      {isAtLimit && !isLocked && (
        <div className="overflow-hidden rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20">
          <div className="flex items-start gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/40">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-red-800 dark:text-red-300">Invoice Limit Reached</p>
              <p className="mt-0.5 text-sm text-red-600 dark:text-red-400">
                You've used <strong>{invoiceUsed}</strong> of <strong>{invoiceLimit}</strong> invoices on your current plan.
                Upgrade to continue uploading.
              </p>
            </div>
            <Link to={currentWorkspace?.type === 'company' ? '/dashboard/subscription' : '/dashboard/personal-subscription'}>
              <Button size="sm" className="shrink-0 bg-red-600 hover:bg-red-700 text-white border-0">
                Upgrade Now
              </Button>
            </Link>
          </div>
          <div className="border-t border-red-200 dark:border-red-900/50 bg-red-100/50 dark:bg-red-900/20 px-5 py-2.5">
            <p className="text-xs text-red-600 dark:text-red-400">
              If no action is taken within <strong>30 days</strong>, your account data may be permanently removed.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className={`space-y-5 ${isLocked || isAtLimit ? 'pointer-events-none opacity-50' : ''}`}>
        {/* Drop zone */}
        <div className="erp-card rounded-lg p-5">
          <div
            className={`relative rounded-lg border-2 border-dashed p-10 text-center transition-all duration-200 cursor-pointer
              ${dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'}`}
            onDragEnter={handleDrag} onDragLeave={handleDrag}
            onDragOver={handleDrag} onDrop={handleDrop}
          >
            <input type="file" id="file-upload" className="hidden" multiple accept=".pdf,image/*" onChange={handleFileInput} />
            <input type="file" id="camera-capture" className="hidden" accept="image/*" capture="environment" onChange={handleFileInput} />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-3">
              <div className={`flex h-14 w-14 items-center justify-center rounded-lg transition-all duration-200 ${dragActive ? 'bg-primary' : 'bg-primary/10'}`}>
                <Upload className={`h-7 w-7 transition-colors duration-200 ${dragActive ? 'text-white' : 'text-primary'}`} />
              </div>
              <div>
                <p className={`text-base font-medium transition-colors duration-200 ${dragActive ? 'text-primary' : 'text-foreground'}`}>
                  {dragActive ? 'Release to add files' : 'Drop your invoice files here'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  or <span className="font-medium text-primary">browse files</span>
                </p>
              </div>
              <p className="text-xs text-muted-foreground">PDF, JPG, PNG · Max 10 MB per file</p>
            </label>
            <label
              htmlFor="camera-capture"
              className="md:hidden mt-4 inline-flex items-center gap-2 cursor-pointer rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              Take Photo
            </label>
          </div>

          {entries.length > 0 && (
            <div className="mt-5 flex gap-4">
              {/* File list */}
              <div className="w-60 flex-shrink-0 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Selected Files ({entries.length})
                </p>
                {entries.map((entry, index) => (
                  <div
                    key={index}
                    onClick={() => setPreviewIndex(index)}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-all
                      ${previewIndex === index ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-muted/50'}`}
                  >
                    <div className="h-10 w-9 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                      {entry.isPdf ? (
                        <div className="flex h-full w-full items-center justify-center bg-red-50 dark:bg-red-950/30">
                          <FileText className="h-4 w-4 text-red-500" />
                        </div>
                      ) : (
                        <img src={entry.objectUrl} alt={entry.file.name} className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">{entry.file.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {entry.isPdf ? 'PDF' : 'Image'} · {(entry.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      {entry.metaLoading ? (
                        <p className="text-xs text-muted-foreground/50 mt-0.5 animate-pulse">Loading…</p>
                      ) : entry.isPdf && entry.pageCount ? (
                        <p className="text-xs text-muted-foreground mt-0.5">~{entry.pageCount}p (est.)</p>
                      ) : entry.dimensions ? (
                        <p className="text-xs text-muted-foreground mt-0.5">{entry.dimensions}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); removeFile(index); }}
                      className="flex-shrink-0 mt-0.5 rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <label
                  htmlFor="file-upload"
                  className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-border p-2 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" /> Add more files
                </label>
              </div>

              {/* Preview */}
              {activeEntry && (
                <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center justify-between border-b border-border bg-background px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {activeEntry.isPdf
                        ? <FileText className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                        : <ImageIcon className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      }
                      <span className="max-w-[200px] truncate text-sm font-medium text-foreground">{activeEntry.file.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{(activeEntry.file.size / 1024 / 1024).toFixed(2)} MB</span>
                      {activeEntry.isPdf && activeEntry.pageCount && <span>~{activeEntry.pageCount}p</span>}
                      {activeEntry.dimensions && <span>{activeEntry.dimensions}</span>}
                    </div>
                  </div>
                  <div className="flex flex-1 items-center justify-center overflow-auto bg-muted/20 p-2" style={{ minHeight: '380px' }}>
                    {activeEntry.isPdf ? (
                      <object data={activeEntry.objectUrl} type="application/pdf" className="h-full w-full rounded" style={{ minHeight: '360px' }}>
                        <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/30">
                            <FileText className="h-8 w-8 text-red-500" />
                          </div>
                          <p className="font-medium text-foreground text-sm">{activeEntry.file.name}</p>
                          <a href={activeEntry.objectUrl} target="_blank" rel="noopener noreferrer"
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                            Open PDF
                          </a>
                        </div>
                      </object>
                    ) : (
                      <img src={activeEntry.objectUrl} alt={activeEntry.file.name} className="max-h-[440px] max-w-full rounded object-contain shadow-sm" />
                    )}
                  </div>
                  {entries.length > 1 && (
                    <div className="flex items-center justify-center gap-3 border-t border-border bg-background px-4 py-2">
                      <button type="button" onClick={() => setPreviewIndex(p => Math.max(0, (p ?? 0) - 1))} disabled={previewIndex === 0}
                        className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors">← Prev</button>
                      <span className="text-xs text-muted-foreground">{(previewIndex ?? 0) + 1} / {entries.length}</span>
                      <button type="button" onClick={() => setPreviewIndex(p => Math.min(entries.length - 1, (p ?? 0) + 1))} disabled={previewIndex === entries.length - 1}
                        className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors">Next →</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Invoice details */}
        <div className={`space-y-4 transition-all duration-300 ${entries.length === 0 ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
          <div className="erp-card rounded-lg p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Invoice Details</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category"><SelectValue placeholder="Select a category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                <Input id="vendor" placeholder="e.g., Office Supplies Inc." value={vendor} onChange={e => setVendor(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                <textarea
                  id="notes"
                  className="min-h-[90px] w-full rounded-lg border border-border bg-input-background p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Add any additional notes or context..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="erp-card rounded-lg p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-foreground">What happens next?</h4>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>• Your invoice will be automatically processed using OCR</li>
                  <li>• Invoice data will be extracted and ready for review</li>
                  <li>• Accountants will be notified to validate the invoice</li>
                  <li>• You'll receive notifications about the validation status</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="submit" disabled={isUploading || entries.length === 0 || isLocked} className="flex-1">
            {isUploading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Uploading {entries.length} file{entries.length !== 1 ? 's' : ''}…
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload {entries.length > 0 ? `${entries.length} File${entries.length !== 1 ? 's' : ''}` : 'Invoice'}
              </>
            )}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/dashboard/invoices')}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}