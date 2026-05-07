import { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  Search, Filter, Download, Eye, Loader2, Trash2, X,
  ArrowUpDown, ArrowUp, ArrowDown, FileX,
} from 'lucide-react';
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

// ── Types ──────────────────────────────────────────────────────────────────

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

// ── Status config — includes row accent color ──────────────────────────────

const STATUS_CONFIG: Record<string, { pill: string; label: string; row: string; border: string }> = {
  draft:          { pill: 'bg-gray-100 text-gray-600',     label: 'Draft',          row: '',                   border: 'border-l-gray-300' },
  pending_review: { pill: 'bg-amber-100 text-amber-700',   label: 'Pending Review', row: 'bg-amber-50/40',     border: 'border-l-amber-400' },
  approved:       { pill: 'bg-emerald-100 text-emerald-700', label: 'Approved',     row: 'bg-emerald-50/30',   border: 'border-l-emerald-500' },
  rejected:       { pill: 'bg-red-100 text-red-600',       label: 'Rejected',       row: 'bg-red-50/30',       border: 'border-l-red-400' },
};

// ── Empty state illustration ───────────────────────────────────────────────

function EmptyState({ hasFilters, onUpload }: { hasFilters: boolean; onUpload?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="relative mb-6">
        {/* Stacked document illustration */}
        <div className="relative mx-auto w-32 h-36">
          {/* Back doc */}
          <div className="absolute top-3 left-3 w-24 h-30 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 rotate-6" style={{ height: '7rem' }} />
          {/* Mid doc */}
          <div className="absolute top-1.5 left-1.5 w-24 rounded-xl border-2 border-dashed border-slate-300 bg-slate-100 -rotate-3" style={{ height: '7rem' }} />
          {/* Front doc */}
          <div className="absolute top-0 left-0 w-24 rounded-xl border-2 border-slate-200 bg-white shadow-md flex flex-col items-center justify-center gap-2" style={{ height: '7rem' }}>
            <FileX className="h-8 w-8 text-slate-300" />
            <div className="space-y-1 w-14">
              <div className="h-1.5 rounded-full bg-slate-200" />
              <div className="h-1.5 rounded-full bg-slate-200 w-10" />
              <div className="h-1.5 rounded-full bg-slate-200 w-8" />
            </div>
          </div>
        </div>
      </div>

      <h3 className="text-base font-semibold text-foreground mb-1">
        {hasFilters ? 'No matching invoices' : 'No invoices yet'}
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">
        {hasFilters
          ? 'Try adjusting your filters or search query to find what you\'re looking for.'
          : 'Upload your first invoice and it will appear here once processed.'}
      </p>
      {!hasFilters && (
        <Button asChild>
          <Link to="/dashboard/upload">Upload Invoice</Link>
        </Button>
      )}
    </div>
  );
}

// ── Sortable column header ─────────────────────────────────────────────────

function SortableHead({
  label, sortKey, currentKey, currentDir, onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey | null;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const active = currentKey === sortKey;
  return (
    <TableHead
      className="cursor-pointer select-none whitespace-nowrap"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1 group">
        <span className={active ? 'text-foreground font-semibold' : ''}>{label}</span>
        {active ? (
          currentDir === 'asc'
            ? <ArrowUp className="h-3.5 w-3.5 text-primary" />
            : <ArrowDown className="h-3.5 w-3.5 text-primary" />
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
        {/* Hint: clicking a desc-sorted column a third time resets it */}
        {active && currentDir === 'desc' && (
          <span className="text-[10px] text-muted-foreground/50 leading-none">↺</span>
        )}
      </div>
    </TableHead>
  );
}

// ── Delete confirm modal ───────────────────────────────────────────────────

function DeleteConfirmModal({ invoice, onClose, onConfirm, deleting }: {
  invoice: Invoice;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 mx-4">
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
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={deleting}>Cancel</Button>
          <Button
            className="flex-1 transition-opacity hover:opacity-80"
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

// ── PDF export ─────────────────────────────────────────────────────────────

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

// ── Client-side sort ───────────────────────────────────────────────────────

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

// ── Main component ─────────────────────────────────────────────────────────

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
  const [sortKey, setSortKey]           = useState<SortKey | null>(null);
  const [sortDir, setSortDir]           = useState<SortDir>('asc');

  const limit = 20;
  const isAdmin = currentWorkspace?.role === 'Admin';
  const role = currentWorkspace?.role;

  const canDelete = (invoice: Invoice) => {
    if (role === 'Director' && !['approved', 'paid', 'archived'].includes(invoice.current_status)) return true;
    if ((role === 'Employee' || role === 'Personal') && invoice.current_status === 'draft' && invoice.created_by === currentUser?.id) return true;
    return false;
  };

  const handleSort = (key: SortKey) => {
    if (sortKey !== key) {
      // New column — start asc
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      // Second click — go desc
      setSortDir('desc');
    } else {
      // Third click — clear sort, back to default order
      setSortKey(null);
      setSortDir('asc');
    }
  };

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    const fetch = async () => {
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
    fetch();
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
  const hasFilters = statusFilter !== 'all' || searchQuery.trim() !== '';
  const displayedInvoices = sortInvoices(invoices, sortKey, sortDir);

  return (
    <div className="space-y-6">
      {/* Header */}
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
            <Button variant="outline" onClick={() => exportToPDF(invoices, currentWorkspace?.name ?? 'Workspace')}>
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-destructive">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={() => setPage(1)}>Retry</Button>
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState hasFilters={hasFilters} />
        ) : (
          <>
            {/* ── Desktop table ── */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {/* Left border spacer column */}
                    <TableHead className="w-1 p-0" />
                    <SortableHead label="Invoice #"    sortKey="invoice_number" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                    {isAdmin && <TableHead>Company</TableHead>}
                    <SortableHead label="Vendor"       sortKey="vendor_name"    currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                    {role !== 'Employee' && role !== 'Personal' && <TableHead>Uploaded By</TableHead>}
                    <SortableHead label="Amount"       sortKey="amount"         currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                    <SortableHead label="Invoice Date" sortKey="invoice_date"   currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                    <SortableHead label="Due Date"     sortKey="due_date"       currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                    <SortableHead label="Status"       sortKey="current_status" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                    <TableHead className="w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedInvoices.map(invoice => {
                    const cfg = STATUS_CONFIG[invoice.current_status] ?? {
                      pill: 'bg-gray-100 text-gray-600', label: invoice.current_status,
                      row: '', border: 'border-l-gray-300',
                    };
                    return (
                      <TableRow
                        key={invoice.id}
                        className={`border-l-4 ${cfg.border} ${cfg.row} transition-colors`}
                      >
                        {/* Invisible spacer so border-l shows on the row itself */}
                        <TableCell className="w-0 p-0" />
                        <TableCell className="font-medium">{invoice.invoice_number ?? '—'}</TableCell>
                        {isAdmin && (
                          <TableCell className="text-muted-foreground">
                            {(invoice as any).company_name ?? (invoice as any).workspace_name}
                          </TableCell>
                        )}
                        <TableCell>{invoice.vendor_name ?? '—'}</TableCell>
                        {role !== 'Employee' && role !== 'Personal' && (
                          <TableCell className="text-muted-foreground">{invoice.created_by_name}</TableCell>
                        )}
                        <TableCell className="font-medium tabular-nums">
                          {invoice.currency} {Number(invoice.amount ?? 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground tabular-nums">
                          {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground tabular-nums">
                          {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.pill}`}>
                            {cfg.label}
                          </span>
                        </TableCell>
                        <TableCell className="w-[140px]">
                          <div className="flex items-center gap-2">
                            <Button asChild variant="ghost" size="sm" className={`${canDelete(invoice) ? '' : 'w-full justify-center'}`}>
                              <Link to={`/dashboard/invoices/${invoice.id}`}>
                                <Eye className="mr-2 h-4 w-4" />View
                              </Link>
                            </Button>
                            {canDelete(invoice) ? (
                              <Button
                                variant="ghost" size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                                onClick={() => setDeleteTarget(invoice)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : (
                              <div className="w-9 flex-shrink-0" />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* ── Mobile cards ── */}
            <div className="flex flex-col gap-3 p-3 md:hidden">
              {displayedInvoices.map(invoice => {
                const cfg = STATUS_CONFIG[invoice.current_status] ?? {
                  pill: 'bg-gray-100 text-gray-600', label: invoice.current_status,
                  row: '', border: 'border-l-gray-300',
                };
                return (
                  <Link key={invoice.id} to={`/dashboard/invoices/${invoice.id}`} style={{ textDecoration: 'none' }}>
                    <div className={`rounded-xl border-l-4 ${cfg.border} border border-border bg-background p-4 shadow-sm active:scale-95 transition-transform ${cfg.row}`}>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <p className="font-semibold text-foreground text-sm">{invoice.vendor_name || 'Unknown vendor'}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">#{invoice.invoice_number ?? '—'}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium flex-shrink-0 ${cfg.pill}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-bold text-foreground tabular-nums">
                          {invoice.currency} {Number(invoice.amount ?? 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : '—'}
                        </p>
                      </div>
                      {canDelete(invoice) && (
                        <button
                          className="mt-3 w-full rounded-lg py-1.5 text-xs font-medium text-red-500 border border-red-100 bg-red-50 active:bg-red-100 transition-colors"
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
      </Card>

      {/* Pagination */}
      {invoices.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {invoices.length} of {total} invoices
            {sortKey && (
              <span className="ml-2 text-xs text-muted-foreground">
                · sorted by {sortKey.replace('_', ' ')} ({sortDir})
              </span>
            )}
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