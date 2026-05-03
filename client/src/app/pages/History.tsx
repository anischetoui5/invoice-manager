import { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { History as HistoryIcon, ChevronLeft, ChevronRight, Filter, Loader2, Clock } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import api from '../../lib/api';
import type { Workspace } from '../types';

interface HistoryEntry {
  id: string;
  status: string;
  changed_at: string;
  comment: string | null;
  changed_by_name: string;
  invoice_id: string;
  invoice_number: string;
  vendor_name: string;
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  draft:          { color: 'bg-gray-100 text-gray-700',    label: 'Draft' },
  pending_review: { color: 'bg-yellow-100 text-yellow-700', label: 'Pending Review' },
  approved:       { color: 'bg-green-100 text-green-700',   label: 'Approved' },
  rejected:       { color: 'bg-red-100 text-red-700',       label: 'Rejected' },
  paid:           { color: 'bg-blue-100 text-blue-700',     label: 'Paid' },
  archived:       { color: 'bg-slate-100 text-slate-700',   label: 'Archived' },
};

const STATUS_OPTIONS = ['', 'draft', 'pending_review', 'approved', 'rejected', 'paid', 'archived'];

export function History() {
  const { currentWorkspace } = useOutletContext<{ currentWorkspace: Workspace }>();
  const navigate = useNavigate();

  const [entries, setEntries]     = useState<HistoryEntry[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const LIMIT = 30;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const load = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: LIMIT };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get(
        `/workspaces/${currentWorkspace.id}/invoices/workspace-history`,
        { params }
      );
      setEntries(data.history || []);
      setTotal(data.total || 0);
    } catch {
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id, page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HistoryIcon className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Activity History</h1>
            <p className="text-sm text-muted-foreground">{total} status change{total !== 1 ? 's' : ''} recorded</p>
          </div>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={e => handleFilterChange(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>
                {s ? (STATUS_CONFIG[s]?.label ?? s) : 'All statuses'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Card className="p-6">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Clock className="h-12 w-12 text-muted-foreground" />
            <p className="font-medium text-muted-foreground">No activity yet</p>
            <p className="text-sm text-muted-foreground">Status changes will appear here once invoices are processed.</p>
          </div>
        ) : (
          <ol className="relative border-l border-border ml-3 space-y-6">
            {entries.map((entry) => {
              const cfg = STATUS_CONFIG[entry.status] ?? { color: 'bg-gray-100 text-gray-700', label: entry.status };
              return (
                <li key={entry.id} className="ml-5">
                  <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />

                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      {/* Invoice link */}
                      <button
                        onClick={() => navigate(`/dashboard/invoices/${entry.invoice_id}`)}
                        className="text-sm font-semibold text-foreground hover:text-blue-600 hover:underline text-left"
                      >
                        {entry.invoice_number || 'Untitled Invoice'}
                        {entry.vendor_name && (
                          <span className="ml-1 font-normal text-muted-foreground">— {entry.vendor_name}</span>
                        )}
                      </button>

                      {/* Status badge + actor */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          by {entry.changed_by_name ?? '—'}
                        </span>
                      </div>

                      {/* Comment */}
                      {entry.comment && (
                        <p className="text-xs text-muted-foreground italic">"{entry.comment}"</p>
                      )}
                    </div>

                    {/* Timestamp */}
                    <time className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(entry.changed_at).toLocaleString()}
                    </time>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
