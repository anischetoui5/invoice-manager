import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Upload, X, CheckCircle2, FileText, Image as ImageIcon,
  ChevronRight, File,
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import type { Workspace } from '../types';

// ── Types ──────────────────────────────────────────────────────────────────

interface FileEntry {
  file: File;
  objectUrl: string;
  isPdf: boolean;
  // enriched metadata
  pageCount?: number;       // PDFs only (estimated from size or from API if available)
  dimensions?: string;      // Images: "1200 × 900"
  metaLoading: boolean;
}

// ── Step indicator ─────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Select Files' },
  { id: 2, label: 'Add Details' },
  { id: 3, label: 'Upload' },
];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-0 w-full max-w-sm mx-auto">
      {STEPS.map((step, i) => {
        const done    = currentStep > step.id;
        const active  = currentStep === step.id;
        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            {/* Circle */}
            <div className="flex flex-col items-center gap-1">
              <div className={`
                flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold
                border-2 transition-all duration-300
                ${done   ? 'bg-primary border-primary text-primary-foreground'
                         : active ? 'bg-background border-primary text-primary'
                         : 'bg-background border-muted-foreground/30 text-muted-foreground'}
              `}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : step.id}
              </div>
              <span className={`text-xs whitespace-nowrap font-medium transition-colors ${
                active ? 'text-primary' : done ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div className={`
                flex-1 h-0.5 mb-5 mx-1 transition-all duration-500
                ${done ? 'bg-primary' : 'bg-muted-foreground/20'}
              `} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── File metadata helpers ──────────────────────────────────────────────────

function loadImageDimensions(url: string): Promise<string> {
  return new Promise(resolve => {
    const img = new window.Image();
    img.onload = () => resolve(`${img.naturalWidth} × ${img.naturalHeight}`);
    img.onerror = () => resolve('');
    img.src = url;
  });
}

// PDFs: we can't read page count client-side without a library,
// so we estimate from file size as a rough proxy and mark it clearly.
function estimatePdfPages(bytes: number): number {
  // rough average: ~100 KB per page for scanned invoices
  return Math.max(1, Math.round(bytes / 100_000));
}

// ── Main component ─────────────────────────────────────────────────────────

export function UploadInvoice() {
  const navigate = useNavigate();
  const { currentWorkspace } = useOutletContext<{ currentWorkspace: Workspace }>();

  const [dragActive, setDragActive]     = useState(false);
  const [dragPulse, setDragPulse]       = useState(false);   // for glow animation
  const [entries, setEntries]           = useState<FileEntry[]>([]);
  const [category, setCategory]         = useState('');
  const [vendor, setVendor]             = useState('');
  const [notes, setNotes]               = useState('');
  const [isUploading, setIsUploading]   = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  // Step derived from state
  const step = entries.length === 0 ? 1 : isUploading ? 3 : 2;

  // Revoke object URLs on unmount
  useEffect(() => {
    return () => { entries.forEach(e => URL.revokeObjectURL(e.objectUrl)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pulse animation while dragging
  useEffect(() => {
    if (!dragActive) { setDragPulse(false); return; }
    const id = setInterval(() => setDragPulse(p => !p), 600);
    return () => clearInterval(id);
  }, [dragActive]);

  const enrichEntry = async (entry: FileEntry): Promise<FileEntry> => {
    if (entry.isPdf) {
      const pages = estimatePdfPages(entry.file.size);
      return { ...entry, pageCount: pages, metaLoading: false };
    } else {
      const dimensions = await loadImageDimensions(entry.objectUrl);
      return { ...entry, dimensions, metaLoading: false };
    }
  };

  const addFiles = async (incoming: File[]) => {
    const valid = incoming.filter(
      f => f.type === 'application/pdf' || f.type.startsWith('image/')
    );
    if (!valid.length) return;

    const newEntries: FileEntry[] = valid.map(f => ({
      file: f,
      objectUrl: URL.createObjectURL(f),
      isPdf: f.type === 'application/pdf',
      metaLoading: true,
    }));

    setEntries(prev => [...prev, ...newEntries]);
    setPreviewIndex(prev => prev === null ? 0 : prev);

    // Enrich metadata asynchronously
    const enriched = await Promise.all(newEntries.map(enrichEntry));
    setEntries(prev => {
      const updated = [...prev];
      // Replace the last N entries (the ones we just added)
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
      const token = localStorage.getItem('token');
      const workspaceId = currentWorkspace.id;

      const invoiceRes = await fetch(
        `http://localhost:3000/api/workspaces/${workspaceId}/invoices`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ vendor_name: vendor || 'Unknown Vendor', notes: notes || null }),
        }
      );
      const invoiceData = await invoiceRes.json();
      if (!invoiceRes.ok) { toast.error(invoiceData.error || 'Failed to create invoice'); setIsUploading(false); return; }

      const invoiceId = invoiceData.invoice.id;
      for (let i = 0; i < entries.length; i++) {
        const fd = new FormData();
        fd.append('file', entries[i].file);
        fd.append('is_primary', i === 0 ? 'true' : 'false');
        const uploadRes = await fetch(
          `http://localhost:3000/api/workspaces/${workspaceId}/invoices/${invoiceId}/documents`,
          { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd }
        );
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          toast.error(`Failed to upload ${entries[i].file.name}: ${uploadData.error}`);
          setIsUploading(false);
          return;
        }
      }

      toast.success('Invoice uploaded successfully!');
      navigate('/dashboard/invoices');
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong. Please try again.');
      setIsUploading(false);
    }
  };

  const categories = ['Office Supplies', 'Hardware', 'Software', 'Consulting', 'Marketing', 'Utilities', 'Food & Beverage', 'Travel', 'Other'];
  const activeEntry = previewIndex !== null ? entries[previewIndex] : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header + step indicator */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Upload Invoice</h1>
          <p className="mt-1 text-muted-foreground">Upload PDF or image files for automatic OCR processing</p>
        </div>
        <StepIndicator currentStep={step} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Drop zone ── */}
        <Card className="p-6">
          {/* Animated drop area */}
          <div
            className={`
              relative rounded-xl border-2 border-dashed p-10 text-center
              transition-all duration-300 cursor-pointer
              ${dragActive
                ? 'border-blue-500 scale-[1.01]'
                : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/30'}
            `}
            style={dragActive ? {
              background: dragPulse
                ? 'radial-gradient(ellipse at center, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0.04) 100%)'
                : 'radial-gradient(ellipse at center, rgba(59,130,246,0.06) 0%, transparent 100%)',
              boxShadow: dragPulse
                ? '0 0 0 4px rgba(59,130,246,0.15), inset 0 0 30px rgba(59,130,246,0.05)'
                : '0 0 0 2px rgba(59,130,246,0.1)',
              transition: 'all 0.3s ease',
            } : {}}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input type="file" id="file-upload" className="hidden" multiple accept=".pdf,image/*" onChange={handleFileInput} />
            <input type="file" id="camera-capture" className="hidden" accept="image/*" capture="environment" onChange={handleFileInput} />

            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-4">
              {/* Animated icon */}
              <div className={`
                flex h-16 w-16 items-center justify-center rounded-full
                transition-all duration-300
                ${dragActive ? 'bg-blue-500 scale-110' : 'bg-blue-100'}
              `}>
                <Upload className={`h-8 w-8 transition-colors duration-300 ${dragActive ? 'text-white' : 'text-blue-600'}`} />
              </div>

              <div>
                <p className={`text-lg font-medium transition-colors duration-200 ${dragActive ? 'text-blue-600' : 'text-foreground'}`}>
                  {dragActive ? 'Release to add files' : 'Drop your invoice files here'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  or <span className="font-medium text-blue-600 hover:text-blue-700">browse files</span>
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Supports: PDF, JPG, PNG · Max 10 MB per file</p>
            </label>

            {/* Mobile camera button */}
            <label
              htmlFor="camera-capture"
              className="md:hidden mt-4 inline-flex items-center gap-2 cursor-pointer rounded-xl px-5 py-3 text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 14px rgba(37,99,235,0.4)' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              Take Photo of Invoice
            </label>
          </div>

          {/* ── File list + preview ── */}
          {entries.length > 0 && (
            <div className="mt-6 flex gap-4">

              {/* Left: file list */}
              <div className="w-64 flex-shrink-0 space-y-2">
                <h3 className="text-sm font-medium text-slate-700">
                  Selected Files <span className="text-muted-foreground font-normal">({entries.length})</span>
                </h3>
                {entries.map((entry, index) => (
                  <div
                    key={index}
                    onClick={() => setPreviewIndex(index)}
                    className={`
                      flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-all
                      ${previewIndex === index
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-border bg-background hover:bg-muted/50'}
                    `}
                  >
                    {/* Thumbnail */}
                    <div className="h-12 w-10 flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
                      {entry.isPdf ? (
                        <div className="flex h-full w-full items-center justify-center bg-red-50">
                          <FileText className="h-5 w-5 text-red-500" />
                        </div>
                      ) : (
                        <img src={entry.objectUrl} alt={entry.file.name} className="h-full w-full object-cover" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground leading-tight">{entry.file.name}</p>

                      {/* File type + size */}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {entry.isPdf ? 'PDF' : 'Image'} · {(entry.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>

                      {/* Enriched metadata */}
                      {entry.metaLoading ? (
                        <p className="text-xs text-muted-foreground/60 mt-0.5 animate-pulse">Loading info…</p>
                      ) : entry.isPdf && entry.pageCount ? (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          ~{entry.pageCount} page{entry.pageCount !== 1 ? 's' : ''}
                          <span className="text-muted-foreground/50 ml-1">(est.)</span>
                        </p>
                      ) : entry.dimensions ? (
                        <p className="text-xs text-muted-foreground mt-0.5">{entry.dimensions} px</p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); removeFile(index); }}
                      className="flex-shrink-0 mt-0.5 rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                {/* Add more */}
                <label
                  htmlFor="file-upload"
                  className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 p-2 text-xs text-muted-foreground hover:border-blue-400 hover:text-blue-600 transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Add more files
                </label>
              </div>

              {/* Right: preview */}
              {activeEntry && (
                <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-slate-50">
                  {/* Preview header */}
                  <div className="flex items-center justify-between border-b border-border bg-background px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {activeEntry.isPdf
                        ? <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />
                        : <ImageIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      }
                      <span className="max-w-[200px] truncate text-sm font-medium text-foreground">
                        {activeEntry.file.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{(activeEntry.file.size / 1024 / 1024).toFixed(2)} MB</span>
                      {activeEntry.isPdf && activeEntry.pageCount && (
                        <span>~{activeEntry.pageCount}p</span>
                      )}
                      {activeEntry.dimensions && (
                        <span>{activeEntry.dimensions}</span>
                      )}
                    </div>
                  </div>

                  {/* Preview body */}
                  <div className="flex flex-1 items-center justify-center overflow-auto bg-slate-100 p-2" style={{ minHeight: '420px' }}>
                    {activeEntry.isPdf ? (
                      <object
                        data={activeEntry.objectUrl}
                        type="application/pdf"
                        className="h-full w-full rounded"
                        style={{ minHeight: '400px' }}
                      >
                        <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
                          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                            <FileText className="h-10 w-10 text-red-500" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{activeEntry.file.name}</p>
                            <p className="mt-1 text-sm text-muted-foreground">PDF preview not available in this browser</p>
                          </div>
                          <a
                            href={activeEntry.objectUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                          >
                            Open PDF
                          </a>
                        </div>
                      </object>
                    ) : (
                      <img
                        src={activeEntry.objectUrl}
                        alt={activeEntry.file.name}
                        className="max-h-[480px] max-w-full rounded object-contain shadow-sm"
                      />
                    )}
                  </div>

                  {/* File navigation */}
                  {entries.length > 1 && (
                    <div className="flex items-center justify-center gap-3 border-t border-border bg-background px-4 py-2">
                      <button
                        type="button"
                        onClick={() => setPreviewIndex(p => Math.max(0, (p ?? 0) - 1))}
                        disabled={previewIndex === 0}
                        className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-muted disabled:opacity-30 transition-colors"
                      >
                        ← Prev
                      </button>
                      <span className="text-xs text-muted-foreground">
                        {(previewIndex ?? 0) + 1} / {entries.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewIndex(p => Math.min(entries.length - 1, (p ?? 0) + 1))}
                        disabled={previewIndex === entries.length - 1}
                        className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-muted disabled:opacity-30 transition-colors"
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* ── Invoice details — only shown once files are selected ── */}
        <div className={`space-y-6 transition-all duration-300 ${entries.length === 0 ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
          <Card className="p-6">
            <h3 className="mb-4 font-semibold text-foreground">Invoice Details</h3>
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
                  className="min-h-[100px] w-full rounded-lg border border-border p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-background"
                  placeholder="Add any additional notes or context..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* What happens next */}
          <Card className="p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
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
          </Card>
        </div>

        {/* ── Actions ── */}
        <div className="flex gap-3">
          <Button
            type="submit"
            size="lg"
            disabled={isUploading || entries.length === 0}
            className="flex-1"
          >
            {isUploading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Uploading {entries.length} file{entries.length !== 1 ? 's' : ''}…
              </>
            ) : (
              <>
                <Upload className="mr-2 h-5 w-5" />
                Upload {entries.length > 0 ? `${entries.length} File${entries.length !== 1 ? 's' : ''}` : 'Invoice'}
              </>
            )}
          </Button>
          <Button type="button" size="lg" variant="outline" onClick={() => navigate('/dashboard/invoices')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}