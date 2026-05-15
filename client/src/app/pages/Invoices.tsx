import { useState, useEffect } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import {
  Search, Filter, Download, Eye, Loader2, Trash2, X,
  ArrowUpDown, ArrowUp, ArrowDown, FileX, AlertTriangle,
} from 'lucide-react';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

type SortKey = 'invoice_number' | 'vendor_name' | 'amount' | 'invoice_date' | 'due_date' | 'current_status';
type SortDir = 'asc' | 'desc';

const STATUS_CONFIG: Record<string, { pill: string; label: string; row: string; border: string }> = {
  draft:          { pill: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',          label: 'Draft',          row: '',                                     border: 'border-l-slate-300 dark:border-l-slate-600' },
  pending_review: { pill: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',       label: 'Pending Review', row: 'bg-amber-50/40 dark:bg-amber-900/10',  border: 'border-l-amber-400' },
  approved:       { pill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', label: 'Approved',     row: 'bg-emerald-50/30 dark:bg-emerald-900/10', border: 'border-l-emerald-500' },
  rejected:       { pill: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',               label: 'Rejected',       row: 'bg-red-50/30 dark:bg-red-900/10',      border: 'border-l-red-400' },
  paid:           { pill:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',         label:  'Paid',          row:    'bg-blue-50/30 dark:bg-blue-900/10', border: 'border-l-blue-500'},
};

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-muted mb-4">
        <FileX className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">
        {hasFilters ? 'No matching invoices' : 'No invoices yet'}
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">
        {hasFilters
          ? 'Try adjusting your filters or search query.'
          : 'Upload your first invoice and it will appear here once processed.'}
      </p>
      {!hasFilters && (
        <Button asChild size="sm">
          <Link to="/dashboard/upload">Upload Invoice</Link>
        </Button>
      )}
    </div>
  );
}

function SortableHead({ label, sortKey, currentKey, currentDir, onSort }: {
  label: string; sortKey: SortKey; currentKey: SortKey | null;
  currentDir: SortDir; onSort: (key: SortKey) => void;
}) {
  const active = currentKey === sortKey;
  return (
    <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => onSort(sortKey)}>
      <div className="flex items-center gap-1 group">
        <span className={active ? 'text-foreground font-semibold' : ''}>{label}</span>
        {active ? (
          currentDir === 'asc'
            ? <ArrowUp className="h-3.5 w-3.5 text-primary" />
            : <ArrowDown className="h-3.5 w-3.5 text-primary" />
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    </TableHead>
  );
}

function DeleteConfirmModal({ invoice, onClose, onConfirm, deleting }: {
  invoice: Invoice; onClose: () => void; onConfirm: () => void; deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-background rounded-xl border border-border shadow-xl w-full max-w-md p-6 mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">Delete Invoice</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 mb-6">
          <p className="text-sm font-medium text-destructive mb-1">This action is irreversible.</p>
          <p className="text-sm text-muted-foreground">
            Deleting <span className="font-semibold text-foreground">{invoice.invoice_number || 'this invoice'}</span> will
            permanently remove the invoice, all documents and its history.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={deleting}>Cancel</Button>
          <Button
            className="flex-1"
            style={{ backgroundColor: 'var(--destructive)', color: 'var(--destructive-foreground)' }}
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Delete Invoice
          </Button>
        </div>
      </div>
    </div>
  );
}

function exportToPDF(invoices: Invoice[], workspaceName: string) {
  const doc = new jsPDF();
  const date = new Date().toLocaleDateString('en-GB');
  doc.setFontSize(18);
  doc.setTextColor(30, 64, 175);
  doc.text('EASYfact — Invoice Report', 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Workspace: ${workspaceName}`, 14, 26);
  doc.text(`Generated: ${date}`, 14, 32);
  autoTable(doc, {
    startY: 40,
    head: [['#', 'Invoice No.', 'Vendor', 'Amount', 'Currency', 'Date', 'Status']],
    body: invoices.map((inv, i) => [
      i + 1,
      inv.invoice_number || '—',
      inv.vendor_name || '—',
      inv.amount != null ? Number(inv.amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '—',
      inv.currency || '—',
      inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('en-GB') : '—',
      STATUS_CONFIG[inv.current_status]?.label ?? inv.current_status,
    ]),
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 244, 255] },
    styles: { fontSize: 9, cellPadding: 4 },
  });
  doc.save(`invoices-${new Date().toISOString().split('T')[0]}.pdf`);
}

function sortInvoices(invoices: Invoice[], key: SortKey | null, dir: SortDir): Invoice[] {
  if (!key) return invoices;
  return [...invoices].sort((a, b) => {
    let av: any = a[key];
    let bv: any = b[key];
    if (key === 'amount') { av = Number(av ?? 0); bv = Number(bv ?? 0); }
    else if (key === 'invoice_date' || key === 'due_date') {
      av = av ? new Date(av).getTime() : 0;
      bv = bv ? new Date(bv).getTime() : 0;
    } else {
      av = (av ?? '').toString().toLowerCase();
      bv = (bv ?? '').toString().toLowerCase();
    }
    if (av < bv) return dir === 'asc' ? -1 : 1;
    if (av > bv) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}

export function InvoiceList() {
  const { currentWorkspace, currentUser } = useOutletContext<{ currentWorkspace: Workspace; currentUser: User }>();
  const { isLocked } = useSubscriptionGuard();
  const [searchParams] = useSearchParams();

  const [invoices, setInvoices]               = useState<Invoice[]>([]);
  const [total, setTotal]                     = useState(0);
  const [page, setPage]                       = useState(1);
  const [isLoading, setIsLoading]             = useState(true);
  const [error, setError]                     = useState<string | null>(null);
  const [searchInput, setSearchInput]         = useState(() => searchParams.get('q') ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get('q') ?? '');
  const [statusFilter, setStatusFilter]       = useState('all');
  const [deleteTarget, setDeleteTarget]       = useState<Invoice | null>(null);
  const [deleting, setDeleting]               = useState(false);
  const [sortKey, setSortKey]                 = useState<SortKey | null>(null);
  const [sortDir, setSortDir]                 = useState<SortDir>('asc');

  const limit   = 20;
  const isAdmin = currentWorkspace?.role === 'Admin';
  const role    = currentWorkspace?.role;

  const canDelete = (invoice: Invoice) => {
    if (role === 'Director' && !['approved', 'paid', 'archived'].includes(invoice.current_status)) return true;
    if ((role === 'Employee' || role === 'Personal') && invoice.current_status === 'draft' && invoice.created_by === currentUser?.id) return true;
    return false;
  };

  const handleSort = (key: SortKey) => {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc'); }
    else if (sortDir === 'asc') { setSortDir('desc'); }
    else { setSortKey(null); setSortDir('asc'); }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    const fetch = async () => {
      setIsLoading(true); setError(null);
      try {
        const params: Record<string, any> = { role, page, limit };
        if (statusFilter !== 'all') params.status = statusFilter;
        if (debouncedSearch.trim()) params.vendor_name = debouncedSearch.trim();
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
    fetch();
  }, [currentWorkspace?.id, role, page, statusFilter, debouncedSearch]);

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

  const totalPages        = Math.ceil(total / limit);
  const hasFilters        = statusFilter !== 'all' || debouncedSearch.trim() !== '';
  const displayedInvoices = sortInvoices(invoices, sortKey, sortDir);

  return (
    <div className="space-y-5 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Invoices</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {role === 'Employee' || role === 'Personal' ? 'Your submitted invoices' : 'All invoices across your organization'}
          </p>
        </div>
        <Button asChild size="sm" disabled={isLocked}>
          <Link to={isLocked ? '#' : '/dashboard/upload'}>Upload Invoice</Link>
        </Button>
      </div>

      {isLocked && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>Your subscription has expired. Renew to continue.</span>
          <Link to="/dashboard/settings" className="ml-auto font-medium underline underline-offset-2">Renew</Link>
        </div>
      )}

      {/* Filters */}
      <div className="erp-card rounded-lg p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by vendor name..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[160px] h-9">
                <Filter className="mr-2 h-3.5 w-3.5" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                {role !== 'Personal' && <SelectItem value="pending_review">Pending Review</SelectItem>}
                {role !== 'Personal' && <SelectItem value="approved">Approved</SelectItem>}
                {role !== 'Personal' && <SelectItem value="rejected">Rejected</SelectItem>}
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => exportToPDF(invoices, currentWorkspace?.name ?? 'Workspace')}>
              <Download className="mr-2 h-3.5 w-3.5" />Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="erp-card rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-destructive">
            <p className="text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={() => setPage(1)}>Retry</Button>
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState hasFilters={hasFilters} />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border">
                    <TableHead className="w-1 p-0" />
                    <SortableHead label="Invoice #"    sortKey="invoice_number" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                    {isAdmin && <TableHead>Company</TableHead>}
                    <SortableHead label="Vendor"       sortKey="vendor_name"    currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                    {role !== 'Employee' && role !== 'Personal' && <TableHead>Uploaded By</TableHead>}
                    <SortableHead label="Amount"       sortKey="amount"         currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                    <SortableHead label="Invoice Date" sortKey="invoice_date"   currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                    <SortableHead label="Due Date"     sortKey="due_date"       currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                    {role !== 'Personal' && <SortableHead label="Status" sortKey="current_status" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />}
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedInvoices.map(invoice => {
                    const cfg = STATUS_CONFIG[invoice.current_status] ?? {
                      pill: 'bg-slate-100 text-slate-600', label: invoice.current_status,
                      row: '', border: 'border-l-slate-300',
                    };
                    const isPersonalRole = role === 'Personal';
                    return (
                      <TableRow key={invoice.id} className={`${isPersonalRole ? 'border-l-4 border-l-transparent' : `border-l-4 ${cfg.border} ${cfg.row}`} transition-colors hover:bg-muted/30`}>
                        <TableCell className="w-0 p-0" />
                        <TableCell className="font-medium text-sm">{invoice.invoice_number ?? '—'}</TableCell>
                        {isAdmin && (
                          <TableCell className="text-sm text-muted-foreground">
                            {(invoice as any).company_name ?? (invoice as any).workspace_name}
                          </TableCell>
                        )}
                        <TableCell className="text-sm">{invoice.vendor_name ?? '—'}</TableCell>
                        {role !== 'Employee' && role !== 'Personal' && (
                          <TableCell className="text-sm text-muted-foreground">{invoice.created_by_name}</TableCell>
                        )}
                        <TableCell className="text-sm font-medium tabular-nums">
                          {invoice.currency} {Number(invoice.amount ?? 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground tabular-nums">
                          {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground tabular-nums">
                          {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '—'}
                        </TableCell>
                        {!isPersonalRole && (
                          <TableCell>
                            <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${cfg.pill}`}>
                              {cfg.label}
                            </span>
                          </TableCell>
                        )}
                        <TableCell className="w-[120px]">
                          <div className="flex items-center gap-1">
                            <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
                              <Link to={`/dashboard/invoices/${invoice.id}`}>
                                <Eye className="mr-1.5 h-3.5 w-3.5" />View
                              </Link>
                            </Button>
                            {canDelete(invoice) ? (
                              <Button
                                variant="ghost" size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteTarget(invoice)}
                                disabled={isLocked}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            ) : (
                              <div className="w-7" />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="flex flex-col gap-2 p-3 md:hidden">
              {displayedInvoices.map(invoice => {
                const cfg = STATUS_CONFIG[invoice.current_status] ?? {
                  pill: 'bg-slate-100 text-slate-600', label: invoice.current_status,
                  row: '', border: 'border-l-slate-300',
                };
                const isMobilePersonal = role === 'Personal';
                return (
                  <Link key={invoice.id} to={`/dashboard/invoices/${invoice.id}`}>
                    <div className={`rounded-lg border border-border bg-background p-4 transition-colors active:bg-muted/50 ${isMobilePersonal ? '' : `border-l-4 ${cfg.border} ${cfg.row}`}`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="font-medium text-foreground text-sm">{invoice.vendor_name || 'Unknown vendor'}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">#{invoice.invoice_number ?? '—'}</p>
                        </div>
                        {!isMobilePersonal && (
                          <span className={`rounded px-2 py-0.5 text-[11px] font-medium flex-shrink-0 ${cfg.pill}`}>
                            {cfg.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-base font-semibold text-foreground tabular-nums">
                          {invoice.currency} {Number(invoice.amount ?? 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : '—'}
                        </p>
                      </div>
                      {canDelete(invoice) && !isLocked && (
                        <button
                          className="mt-3 w-full rounded-md py-1.5 text-xs font-medium text-destructive border border-destructive/20 bg-destructive/5 transition-colors"
                          onClick={e => { e.preventDefault(); setDeleteTarget(invoice); }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {invoices.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {invoices.length} of {total} invoices
            {sortKey && <span className="ml-2">· sorted by {sortKey.replace('_', ' ')} ({sortDir})</span>}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

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