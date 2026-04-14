import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  CheckCircle2,
  XCircle,
  Edit2,
  Save,
  AlertCircle,
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { WorkflowStepper } from '../components/WorkflowStepper';
 
type InvoiceStatus = 'pending' | 'processing' | 'validated' | 'approved' | 'rejected';
 
interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}
 
interface OcrData {
  invoiceNumber: string;
  vendor: string;
  date: string;
  dueDate: string;
  items: LineItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  confidence: number;
}
 
interface Invoice {
  id: string;
  number: string;
  vendor: string;
  status: InvoiceStatus;
  employeeName: string;
  uploadDate: string;
  category: string;
  dueDate: string;
  notes?: string;
  validatedBy?: string;
  validatedDate?: string;
  documentUrl?: string;
  ocrData?: OcrData;
}
 
interface InvoiceDetailProps {
  invoices: Invoice[];
}
 
export function InvoiceDetail({ invoices }: InvoiceDetailProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const invoice = invoices.find((inv) => inv.id === id);
 
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(invoice?.ocrData);
  const [notes, setNotes] = useState(invoice?.notes || '');
 
  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-slate-400" />
        <h2 className="mt-4 text-xl font-semibold text-slate-800">Invoice not found</h2>
        <p className="mt-2 text-slate-600">The invoice you're looking for doesn't exist.</p>
        <Button asChild className="mt-6">
          <Link to="/dashboard/invoices">Back to Invoices</Link>
        </Button>
      </div>
    );
  }
 
  const getStatusBadge = (status: InvoiceStatus) => {
    const config: Record<InvoiceStatus, { color: string; label: string }> = {
      pending: { color: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
      processing: { color: 'bg-blue-100 text-blue-700', label: 'Processing' },
      validated: { color: 'bg-purple-100 text-purple-700', label: 'Validated' },
      approved: { color: 'bg-green-100 text-green-700', label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-700', label: 'Rejected' },
    };
    return config[status];
  };
 
  const handleSave = () => {
    setIsEditing(false);
    toast.success('Invoice data updated successfully');
  };
 
  const handleApprove = () => {
    toast.success('Invoice approved successfully');
    setTimeout(() => navigate('/dashboard/invoices'), 1000);
  };
 
  const handleReject = () => {
    if (!notes.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    toast.error('Invoice rejected');
    setTimeout(() => navigate('/dashboard/invoices'), 1000);
  };
 
  const badge = getStatusBadge(invoice.status);
 
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/invoices')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800">{invoice.number}</h1>
              <Badge className={badge.color}>{badge.label}</Badge>
            </div>
            <p className="mt-1 text-slate-600">{invoice.vendor}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
      </div>
 
      <WorkflowStepper status={invoice.status} />
 
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left side - Invoice preview */}
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="border-b bg-slate-50 px-6 py-4">
              <h2 className="font-semibold text-slate-800">Invoice Document</h2>
            </div>
            <div className="p-6">
              <div className="overflow-hidden rounded-lg border bg-slate-100">
                {invoice.documentUrl ? (
                  <img
                    src={invoice.documentUrl}
                    alt="Invoice document"
                    className="h-auto w-full"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center text-slate-400">
                    <AlertCircle className="mr-2 h-5 w-5" />
                    <span className="text-sm">No document available</span>
                  </div>
                )}
              </div>
              <p className="mt-3 text-center text-sm text-slate-500">
                PDF preview - Click to view full document
              </p>
            </div>
          </Card>
 
          <Card className="p-6">
            <h3 className="mb-4 font-semibold text-slate-800">Invoice Information</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-slate-600">Uploaded by</dt>
                <dd className="text-sm font-medium text-slate-800">{invoice.employeeName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-600">Upload date</dt>
                <dd className="text-sm font-medium text-slate-800">
                  {format(new Date(invoice.uploadDate), 'MMM dd, yyyy HH:mm')}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-600">Category</dt>
                <dd className="text-sm font-medium text-slate-800">{invoice.category}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-600">Due date</dt>
                <dd className="text-sm font-medium text-slate-800">
                  {format(new Date(invoice.dueDate), 'MMM dd, yyyy')}
                </dd>
              </div>
              {invoice.validatedBy && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-sm text-slate-600">Validated by</dt>
                    <dd className="text-sm font-medium text-slate-800">{invoice.validatedBy}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-slate-600">Validation date</dt>
                    <dd className="text-sm font-medium text-slate-800">
                      {invoice.validatedDate &&
                        format(new Date(invoice.validatedDate), 'MMM dd, yyyy HH:mm')}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </Card>
        </div>
 
        {/* Right side - OCR extracted data */}
        <div className="space-y-6">
          {invoice.ocrData && (
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-800">Extracted Data (OCR)</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Confidence: {(invoice.ocrData.confidence * 100).toFixed(0)}%
                  </p>
                </div>
                {!isEditing ? (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleSave}>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                )}
              </div>
 
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Invoice Number</Label>
                    <Input
                      value={editedData?.invoiceNumber}
                      onChange={(e) =>
                        setEditedData((prev) => prev && { ...prev, invoiceNumber: e.target.value })
                      }
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vendor</Label>
                    <Input
                      value={editedData?.vendor}
                      onChange={(e) =>
                        setEditedData((prev) => prev && { ...prev, vendor: e.target.value })
                      }
                      disabled={!isEditing}
                    />
                  </div>
                </div>
 
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      value={editedData?.date}
                      onChange={(e) =>
                        setEditedData((prev) => prev && { ...prev, date: e.target.value })
                      }
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input
                      value={editedData?.dueDate}
                      onChange={(e) =>
                        setEditedData((prev) => prev && { ...prev, dueDate: e.target.value })
                      }
                      disabled={!isEditing}
                    />
                  </div>
                </div>
 
                <div className="space-y-3 rounded-lg border p-4">
                  <h4 className="text-sm font-medium text-slate-700">Line Items</h4>
                  {editedData?.items.map((item, index) => (
                    <div key={index} className="grid gap-2 border-b pb-3 last:border-b-0 last:pb-0">
                      <Input
                        value={item.description}
                        placeholder="Description"
                        disabled={!isEditing}
                        className="text-sm"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          type="number"
                          value={item.quantity}
                          placeholder="Qty"
                          disabled={!isEditing}
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          value={item.unitPrice}
                          placeholder="Unit Price"
                          disabled={!isEditing}
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          value={item.total}
                          placeholder="Total"
                          disabled
                          className="text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
 
                <div className="space-y-2 rounded-lg border p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-medium text-slate-800">
                      ${editedData?.subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Tax</span>
                    <span className="font-medium text-slate-800">
                      ${editedData?.taxAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-base">
                    <span className="font-medium text-slate-800">Total</span>
                    <span className="font-bold text-slate-900">
                      ${editedData?.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )}
 
          {!invoice.ocrData && (
            <Card className="p-6">
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <AlertCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-800">OCR Processing</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Invoice data is being extracted. This usually takes a few minutes.
                  </p>
                </div>
              </div>
            </Card>
          )}
 
          <Card className="p-6">
            <h3 className="mb-4 font-semibold text-slate-800">Notes</h3>
            <Textarea
              placeholder="Add notes or reason for rejection..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px]"
            />
          </Card>
 
          {(invoice.status === 'pending' || invoice.status === 'processing') && (
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
      </div>
    </div>
  );
}
 