import { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  History as HistoryIcon, ChevronLeft, ChevronRight,
  Loader2, Clock, FileText, UserPlus, UserMinus,
  XCircle, Trash2, Building2, ArrowRightLeft, CheckCircle2,
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import api from '../../lib/api';
import type { Workspace } from '../types';

interface ActivityEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, string>;
  created_at: string;
  user_name: string;
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  draft:          { color: 'bg-gray-100 text-gray-700',    label: 'Draft' },
  pending_review: { color: 'bg-yellow-100 text-yellow-700', label: 'Pending Review' },
  approved:       { color: 'bg-green-100 text-green-700',   label: 'Approved' },
  rejected:       { color: 'bg-red-100 text-red-700',       label: 'Rejected' },
  paid:           { color: 'bg-blue-100 text-blue-700',     label: 'Paid' },
  archived:       { color: 'bg-slate-100 text-slate-700',   label: 'Archived' },
};

function getActionConfig(entry: ActivityEntry) {
  const m = entry.metadata;
  const invoiceLabel = m.invoice_number || 'Invoice';

  switch (entry.action) {
    case 'invoice.created':
      return {
        icon: <FileText className="h-4 w-4 text-blue-600" />,
        bg: 'bg-blue-50',
        text: <>Invoice <span className="font-medium">{invoiceLabel}</span>{m.vendor_name ? ` — ${m.vendor_name}` : ''} was created</>,
        clickable: true,
      };
    case 'invoice.status_changed': {
      const cfg = STATUS_CONFIG[m.status] ?? { color: 'bg-gray-100 text-gray-700', label: m.status };
      return {
        icon: <ArrowRightLeft className="h-4 w-4 text-orange-500" />,
        bg: 'bg-orange-50',
        text: <>Invoice <span className="font-medium">{invoiceLabel}</span> moved to{' '}
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
          {m.comment ? <span className="italic text-muted-foreground"> — "{m.comment}"</span> : null}</>,
        clickable: true,
      };
    }
    case 'invoice.deleted':
      return {
        icon: <Trash2 className="h-4 w-4 text-red-500" />,
        bg: 'bg-red-50',
        text: <>Invoice <span className="font-medium">{invoiceLabel}</span>{m.vendor_name ? ` — ${m.vendor_name}` : ''} was deleted</>,
        clickable: false,
      };
    case 'member.joined':
      return {
        icon: <UserPlus className="h-4 w-4 text-green-600" />,
        bg: 'bg-green-50',
        text: <><span className="font-medium">{m.user_name}</span> joined as <span className="font-medium">{m.role}</span></>,
        clickable: false,
      };
    case 'member.left':
      return {
        icon: <UserMinus className="h-4 w-4 text-red-500" />,
        bg: 'bg-red-50',
        text: <><span className="font-medium">{m.user_name}</span> ({m.role}) was removed from the workspace</>,
        clickable: false,
      };
    case 'invitation.rejected':
      return {
        icon: <XCircle className="h-4 w-4 text-red-500" />,
        bg: 'bg-red-50',
        text: <><span className="font-medium">{m.user_name}</span>'s join request was rejected</>,
        clickable: false,
      };
    case 'company.updated':
      return {
        icon: <Building2 className="h-4 w-4 text-purple-500" />,
        bg: 'bg-purple-50',
        text: <>Company information for <span className="font-medium">{m.company_name}</span> was updated</>,
        clickable: false,
      };
    default:
      return {
        icon: <CheckCircle2 className="h-4 w-4 text-muted-foreground" />,
        bg: 'bg-muted',
        text: <>{entry.action}</>,
        clickable: false,
      };
  }
}

const FILTERS = [
  { value: '',        label: 'All' },
  { value: 'invoice', label: 'Invoices' },
  { value: 'member',  label: 'Members' },
  { value: 'company', label: 'Company' },
];

export function History() {
  const { currentWorkspace } = useOutletContext<{ currentWorkspace: Workspace }>();
  const navigate = useNavigate();

  const [entries, setEntries]           = useState<ActivityEntry[]>([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [isLoading, setIsLoading]       = useState(true);
  const [entityFilter, setEntityFilter] = useState('');

  const LIMIT = 30;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const load = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: LIMIT };
      if (entityFilter) params.entity_type = entityFilter;
      const { data } = await api.get(`/workspaces/${currentWorkspace.id}/activity`, { params });
      setEntries(data.activity || []);
      setTotal(data.total || 0);
    } catch {
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id, page, entityFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HistoryIcon className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Activity History</h1>
            <p className="text-sm text-muted-foreground">{total} event{total !== 1 ? 's' : ''} recorded</p>
          </div>
        </div>

        <div className="flex gap-1 rounded-lg border border-border p-1">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => { setEntityFilter(f.value); setPage(1); }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                entityFilter === f.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {f.label}
            </button>
          ))}
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
            <p className="text-sm text-muted-foreground">Actions will appear here as your team works.</p>
          </div>
        ) : (
          <ol className="relative border-l border-border ml-3 space-y-5">
            {entries.map((entry) => {
              const { icon, bg, text, clickable } = getActionConfig(entry);
              return (
                <li key={entry.id} className="ml-5">
                  <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <span className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${bg}`}>
                        {icon}
                      </span>
                      <div className="space-y-0.5">
                        <p className="text-sm text-foreground leading-snug">
                          {clickable && entry.entity_id ? (
                            <button
                              onClick={() => navigate(`/dashboard/invoices/${entry.entity_id}`)}
                              className="text-left hover:underline"
                            >
                              {text}
                            </button>
                          ) : text}
                        </p>
                        <p className="text-xs text-muted-foreground">by {entry.user_name ?? '—'}</p>
                      </div>
                    </div>
                    <time className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString()}
                    </time>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t pt-4">
            <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
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
