import { useState, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Upload, File, X, CheckCircle2 } from 'lucide-react';
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

export function UploadInvoice() {
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState('');
  const [vendor, setVendor] = useState('');
  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { currentWorkspace } = useOutletContext<{ currentWorkspace: Workspace }>();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (file) =>
        file.type === 'application/pdf' ||
        file.type.startsWith('image/')
    );

    if (droppedFiles.length > 0) {
      setFiles((prev) => [...prev, ...droppedFiles]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(
        (file) =>
          file.type === 'application/pdf' ||
          file.type.startsWith('image/')
      );
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (files.length === 0) {
    toast.error('Please select at least one file');
    return;
  }

  if (!category) {
    toast.error('Please select a category');
    return;
  }

  setIsUploading(true);

  try {
    const token = localStorage.getItem('token');
    const workspaceId = currentWorkspace.id;

    // Step 1 — create the invoice
    const invoiceRes = await fetch(
      `http://localhost:3000/api/workspaces/${workspaceId}/invoices`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vendor_name: vendor || 'Unknown Vendor',
          notes: notes || null,
        }),
      }
    );

    const invoiceData = await invoiceRes.json();

    if (!invoiceRes.ok) {
      toast.error(invoiceData.error || 'Failed to create invoice');
      setIsUploading(false);
      return;
    }

    const invoiceId = invoiceData.invoice.id;

    // Step 2 — upload each file to that invoice
    for (let i = 0; i < files.length; i++) {
      const formData = new FormData();
      formData.append('file', files[i]);
      formData.append('is_primary', i === 0 ? 'true' : 'false');

      const uploadRes = await fetch(
        `http://localhost:3000/api/workspaces/${workspaceId}/invoices/${invoiceId}/documents`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            // ← NO Content-Type here, let browser set it for FormData
          },
          body: formData,
        }
      );

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        toast.error(`Failed to upload ${files[i].name}: ${uploadData.error}`);
        setIsUploading(false);
        return;
      }
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

  const categories = [
    'Office Supplies',
    'Hardware',
    'Software',
    'Consulting',
    'Marketing',
    'Utilities',
    'Food & Beverage',
    'Travel',
    'Other',
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Upload Invoice</h1>
        <p className="mt-1 text-muted-foreground">
          Upload PDF or image files for automatic OCR processing
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-8">
          <div
            className={`relative rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-300 bg-background'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-upload"
              className="hidden"
              multiple
              accept=".pdf,image/*"
              onChange={handleFileInput}
            />
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <Upload className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-medium text-foreground">
                  Drop your invoice files here
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  or{' '}
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer font-medium text-blue-600 hover:text-blue-700"
                  >
                    browse files
                  </label>
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Supports: PDF, JPG, PNG (Max 10MB per file)
              </p>
            </div>
          </div>

          {files.length > 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-medium text-slate-700">
                Selected Files ({files.length})
              </h3>
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border bg-background p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                      <File className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-muted hover:text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 font-semibold text-foreground">Invoice Details</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor (Optional)</Label>
              <Input
                id="vendor"
                placeholder="e.g., Office Supplies Inc."
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
              />
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

        <Card className="p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-foreground">
                What happens next?
              </h4>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>• Your invoice will be automatically processed using OCR</li>
                <li>• Invoice data will be extracted and ready for review</li>
                <li>• Accountants will be notified to validate the invoice</li>
                <li>• You'll receive notifications about the validation status</li>
              </ul>
            </div>
          </div>
        </Card>

        <div className="flex gap-3">
          <Button
            type="submit"
            size="lg"
            disabled={isUploading || files.length === 0}
            className="flex-1"
          >
            {isUploading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-5 w-5" />
                Upload Invoice
              </>
            )}
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={() => navigate('/invoices')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}