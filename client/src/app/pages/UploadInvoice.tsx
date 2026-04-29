import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Upload, X, CheckCircle2, FileText, ZoomIn, ZoomOut } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import type { Workspace } from '../types';

// ── per-file preview state ─────────────────────────────────────────────────
interface FileEntry {
  file: File;
  objectUrl: string;   // for images: img src  |  for PDFs: object/embed src
  isPdf: boolean;
}

export function UploadInvoice() {
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [category, setCategory] = useState('');
  const [vendor, setVendor] = useState('');
  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const { currentWorkspace } = useOutletContext<{ currentWorkspace: Workspace }>();

  // Revoke object URLs on unmount to avoid memory leaks
  useEffect(() => {
    return () => { entries.forEach((e) => URL.revokeObjectURL(e.objectUrl)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = (incoming: File[]) => {
    const valid = incoming.filter(
      (f) => f.type === 'application/pdf' || f.type.startsWith('image/')
    );
    if (!valid.length) return;
    const newEntries: FileEntry[] = valid.map((f) => ({
      file: f,
      objectUrl: URL.createObjectURL(f),
      isPdf: f.type === 'application/pdf',
    }));
    setEntries((prev) => [...prev, ...newEntries]);
    // Auto-open preview for first file added if none open
    setPreviewIndex((prev) => (prev === null ? 0 : prev));
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(entries[index].objectUrl);
    setEntries((prev) => prev.filter((_, i) => i !== index));
    setPreviewIndex((prev) => {
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
      if (!invoiceRes.ok) { toast.error(invoiceData.error || 'Failed to create invoice'); return; }

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
        if (!uploadRes.ok) { toast.error(`Failed to upload ${entries[i].file.name}: ${uploadData.error}`); return; }
      }

      toast.success('Invoice uploaded successfully!');
      navigate('/dashboard/invoices');
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const categories = ['Office Supplies', 'Hardware', 'Software', 'Consulting', 'Marketing', 'Utilities', 'Food & Beverage', 'Travel', 'Other'];

  const activeEntry = previewIndex !== null ? entries[previewIndex] : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Upload Invoice</h1>
        <p className="mt-1 text-muted-foreground">Upload PDF or image files for automatic OCR processing</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Drop zone ── */}
        <Card className="p-8">
          <div
            className={`relative rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
              dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-background'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input type="file" id="file-upload" className="hidden" multiple accept=".pdf,image/*" onChange={handleFileInput} />
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <Upload className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-medium text-foreground">Drop your invoice files here</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  or{' '}
                  <label htmlFor="file-upload" className="cursor-pointer font-medium text-blue-600 hover:text-blue-700">
                    browse files
                  </label>
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Supports: PDF, JPG, PNG (Max 10MB per file)</p>
            </div>
          </div>

          {/* ── File list + preview panel ── */}
          {entries.length > 0 && (
            <div className="mt-6 flex gap-4">

              {/* Left: file list */}
              <div className="w-64 flex-shrink-0 space-y-2">
                <h3 className="text-sm font-medium text-slate-700">Selected Files ({entries.length})</h3>
                {entries.map((entry, index) => (
                  <div
                    key={index}
                    onClick={() => setPreviewIndex(index)}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 transition-colors ${
                      previewIndex === index
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-border bg-background hover:bg-muted/50'
                    }`}
                  >
                    {/* Thumbnail or PDF icon */}
                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
                      {entry.isPdf ? (
                        <div className="flex h-full w-full items-center justify-center bg-red-50">
                          <FileText className="h-5 w-5 text-red-500" />
                        </div>
                      ) : (
                        <img
                          src={entry.objectUrl}
                          alt={entry.file.name}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">{entry.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.isPdf ? 'PDF' : 'Image'} · {(entry.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                      className="flex-shrink-0 rounded p-1 text-slate-400 hover:bg-muted hover:text-red-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Right: preview */}
              {activeEntry && (
                <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-slate-50">
                  {/* Preview header */}
                  <div className="flex items-center justify-between border-b border-border bg-background px-4 py-2">
                    <div className="flex items-center gap-2">
                      {activeEntry.isPdf ? (
                        <FileText className="h-4 w-4 text-red-500" />
                      ) : (
                        <div className="h-4 w-4 overflow-hidden rounded bg-slate-200">
                          <img src={activeEntry.objectUrl} alt="" className="h-full w-full object-cover" />
                        </div>
                      )}
                      <span className="max-w-[240px] truncate text-sm font-medium text-foreground">
                        {activeEntry.file.name}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {(activeEntry.file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
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
                        {/* Fallback for browsers that can't embed PDFs */}
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

                  {/* Navigation between files */}
                  {entries.length > 1 && (
                    <div className="flex items-center justify-center gap-3 border-t border-border bg-background px-4 py-2">
                      <button
                        type="button"
                        onClick={() => setPreviewIndex((p) => Math.max(0, (p ?? 0) - 1))}
                        disabled={previewIndex === 0}
                        className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-muted disabled:opacity-30"
                      >
                        ← Prev
                      </button>
                      <span className="text-xs text-muted-foreground">
                        {(previewIndex ?? 0) + 1} / {entries.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewIndex((p) => Math.min(entries.length - 1, (p ?? 0) + 1))}
                        disabled={previewIndex === entries.length - 1}
                        className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-muted disabled:opacity-30"
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

        {/* ── Invoice details ── */}
        <Card className="p-6">
          <h3 className="mb-4 font-semibold text-foreground">Invoice Details</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category"><SelectValue placeholder="Select a category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor (Optional)</Label>
              <Input id="vendor" placeholder="e.g., Office Supplies Inc." value={vendor} onChange={(e) => setVendor(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <textarea
                id="notes"
                className="min-h-[100px] w-full rounded-lg border border-border p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Add any additional notes or context..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* ── What happens next ── */}
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

        {/* ── Actions ── */}
        <div className="flex gap-3">
          <Button type="submit" size="lg" disabled={isUploading || entries.length === 0} className="flex-1">
            {isUploading ? (
              <><div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Uploading...</>
            ) : (
              <><Upload className="mr-2 h-5 w-5" />Upload Invoice</>
            )}
          </Button>
          <Button type="button" size="lg" variant="outline" onClick={() => navigate('/invoices')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}