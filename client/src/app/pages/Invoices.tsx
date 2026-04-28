import { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Search, Filter, Download, Eye, Loader2, Trash2, X } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import type { Workspace, User } from '../types';
import api from '../../lib/api';

interface Invoice {
  id: string;
  invoice_number: string;
  vendor_name: string;
  created_by_name: string;
  created_by: string;
  amount: number;
  currency: string;
  invoice_date: string;
  due_date: string;
  current_status: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  draft:          { color: 'bg-gray-100 text-gray-700',    label: 'Draft' },
  pending_review: { color: 'bg-yellow-100 text-yellow-700', label: 'Pending Review' },
  approved:       { color: 'bg-green-100 text-green-700',   label: 'Approved' },
  rejected:       { color: 'bg-red-100 text-red-700',      label: 'Rejected' },
};

function DeleteConfirmModal({ invoice, onClose, onConfirm, deleting }: {
  invoice: Invoice;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-destructive">Delete Invoice</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 mb-6">
          <p className="text-sm font-medium text-destructive mb-1">This action is irreversible.</p>
          <p className="text-sm text-muted-foreground">
            Deleting <span className="font-semibold text-foreground">
              {invoice.invoice_number || 'this invoice'}
            </span> will permanently remove the invoice, all documents and its history.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button
            className="flex-1 transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--destructive)', color: 'var(--destructive-foreground)' }}
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting
              ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
              : <Trash2 className="h-4 w-4 mr-2" />
            }
            Delete Invoice
          </Button>
        </div>
      </div>
    </div>
  );
}

export function InvoiceList() {
  const { currentWorkspace, currentUser } = useOutletContext<{
    currentWorkspace: Workspace;
    currentUser: User;
  }>();

  const [invoices, setInvoices]         = useState<Invoice[]>([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [searchQuery, setSearchQuery]   = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [deleting, setDeleting]         = useState(false);

  const limit = 20;
  const isAdmin = currentWorkspace?.role === 'Admin';
  const role = currentWorkspace?.role;

  const canDelete = (invoice: Invoice) => {
    if (role === 'Director' && !['approved', 'paid', 'archived'].includes(invoice.current_status)) {
      return true;
    }
    if (role === 'Employee' && 
        invoice.current_status === 'draft' && 
        invoice.created_by === currentUser?.id) {
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    const fetchInvoices = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params: Record<string, any> = { role, page, limit };
        if (statusFilter !== 'all') params.status = statusFilter;
        if (searchQuery.trim()) params.vendor_name = searchQuery.trim();

        const { data } = isAdmin
          ? await api.get('/invoices', { params })
          : await api.get(`/workspaces/${currentWorkspace.id}/invoices`, { params });

        setInvoices(data.invoices);
        setTotal(data.total);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load invoices');
      } finally {
        setIsLoading(false);
      }
    };
    fetchInvoices();
  }, [currentWorkspace?.id, role, page, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => setPage(1), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/workspaces/${currentWorkspace.id}/invoices/${deleteTarget.id}`);
      setInvoices(prev => prev.filter(i => i.id !== deleteTarget.id));
      setTotal(prev => prev - 1);
      toast.success('Invoice deleted successfully');
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete invoice');
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          <p className="mt-1 text-muted-foreground">
            {role === 'Employee' || role === 'Personal'
              ? 'Your submitted invoices'
              : 'All invoices across your organization'}
          </p>
        </div>
        <Button asChild>
          <Link to="/dashboard/upload">Upload Invoice</Link>
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by vendor name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-3">
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_review">Pending Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-destructive">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={() => setPage(1)}>Retry</Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                {isAdmin && <TableHead>Company</TableHead>}
                <TableHead>Vendor</TableHead>
                {role !== 'Employee' && role !== 'Personal' && (
                  <TableHead>Uploaded By</TableHead>
                )}
                <TableHead>Amount</TableHead>
                <TableHead>Invoice Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-muted-foreground">No invoices found</p>
                      <Button asChild variant="outline" size="sm">
                        <Link to="/dashboard/upload">Upload Invoice</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map(invoice => {
                  const badge = STATUS_CONFIG[invoice.current_status] ?? {
                    color: 'bg-gray-100 text-gray-700',
                    label: invoice.current_status,
                  };
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.invoice_number ?? '—'}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-muted-foreground">
                          {(invoice as any).company_name ?? (invoice as any).workspace_name}
                        </TableCell>
                      )}
                      <TableCell>{invoice.vendor_name ?? '—'}</TableCell>
                      {role !== 'Employee' && role !== 'Personal' && (
                        <TableCell className="text-muted-foreground">
                          {invoice.created_by_name}
                        </TableCell>
                      )}
                      <TableCell className="font-medium">
                        {invoice.currency} {Number(invoice.amount ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {invoice.invoice_date
                          ? new Date(invoice.invoice_date).toLocaleDateString()
                          : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {invoice.due_date
                          ? new Date(invoice.due_date).toLocaleDateString()
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.color}`}>
                          {badge.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button asChild variant="ghost" size="sm">
                            <Link to={`/dashboard/invoices/${invoice.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Link>
                          </Button>
                          {canDelete(invoice) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteTarget(invoice)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {invoices.length} of {total} invoices
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            Next
          </Button>
        </div>
      </div>

      {deleteTarget && (
        <DeleteConfirmModal
          invoice={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          deleting={deleting}
        />
      )}
    </div>
  );
}