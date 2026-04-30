import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  Download, TrendingUp, DollarSign, FileText, Users,
  Loader2, CheckCircle2, XCircle, Clock, TrendingDown, Minus,
  AlertTriangle, Cpu,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { Workspace, User } from '../types';
import api from '../../lib/api';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  approved:       '#10b981',
  pending_review: '#eab308',
  rejected:       '#ef4444',
  draft:          '#94a3b8',
  paid:           '#3b82f6',
  archived:       '#6b7280',
};

const STATUS_LABELS: Record<string, string> = {
  approved:       'Approved',
  pending_review: 'Pending Review',
  rejected:       'Rejected',
  draft:          'Draft',
  paid:           'Paid',
  archived:       'Archived',
};

const PERIOD_LABELS: Record<string, string> = {
  '30d':  'Last 30 days',
  '90d':  'Last 90 days',
  '180d': 'Last 6 months',
  '1y':   'Last year',
};

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── CSV Export Helper ──────────────────────────────────────────────────────────

function exportToCSV(data: any, period: string, isPersonal: boolean) {
  const rows: string[][] = [];
  const periodLabel = PERIOD_LABELS[period] ?? period;

  rows.push([isPersonal ? 'My Invoice Report' : 'Company Invoice Report', periodLabel]);
  rows.push([]);

  // Summary
  rows.push(['Summary']);
  rows.push(['Metric', 'Value']);
  const s = data?.summary ?? {};
  rows.push(['Total Invoices',    String(s.total ?? 0)]);
  rows.push(['Total Amount',      `$${fmt(Number(s.total_amount ?? 0))}`]);
  rows.push(['Average Amount',    `$${fmt(Number(s.avg_amount ?? 0))}`]);
  if (!isPersonal) {
    const total    = Number(s.total ?? 0);
    const approved = Number(s.approved ?? 0);
    rows.push(['Approved',        String(approved)]);
    rows.push(['Rejected',        String(s.rejected ?? 0)]);
    rows.push(['Pending Review',  String(s.pending ?? 0)]);
    rows.push(['Approval Rate',   total > 0 ? `${Math.round((approved / total) * 100)}%` : '0%']);
    rows.push(['Team Members',    String(data?.total_members ?? 0)]);
  }
  rows.push([]);

  // Monthly trend
  const trend = data?.monthly_trend ?? [];
  if (trend.length > 0) {
    rows.push(['Monthly Trend']);
    rows.push(['Month', 'Invoice Count', 'Amount']);
    trend.forEach((t: any) => {
      rows.push([t.month, String(t.count), `$${fmt(Number(t.amount))}`]);
    });
    rows.push([]);
  }

  // Top vendors (company only)
  const vendors = data?.top_vendors ?? [];
  if (!isPersonal && vendors.length > 0) {
    rows.push(['Top Vendors']);
    rows.push(['Rank', 'Vendor', 'Invoice Count', 'Total Amount']);
    vendors.forEach((v: any, i: number) => {
      rows.push([String(i + 1), v.vendor ?? '—', String(v.count), `$${fmt(Number(v.total_amount))}`]);
    });
    rows.push([]);
  }

  // Employee leaderboard (company only)
  const employees = data?.employee_leaderboard ?? [];
  if (!isPersonal && employees.length > 0) {
    rows.push(['Employee Upload Leaderboard']);
    rows.push(['Rank', 'Employee', 'Invoice Count', 'Total Amount']);
    employees.forEach((e: any, i: number) => {
      rows.push([String(i + 1), e.name ?? '—', String(e.count), `$${fmt(Number(e.total_amount))}`]);
    });
  }

  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoice-report-${period}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

/** Skeleton block for loading placeholders */
function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-muted ${className}`} />
  );
}

/** Card skeleton that matches the summary card shape */
function SummaryCardSkeleton() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-36" />
        </div>
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    </Card>
  );
}

/** Trend badge: shows month-over-month % change */
function TrendBadge({ change }: { change?: number | null }) {
  if (change == null) return null;
  const abs = Math.abs(change);
  if (change > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-green-600">
        <TrendingUp className="h-3 w-3" />+{abs}%
      </span>
    );
  }
  if (change < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-red-500">
        <TrendingDown className="h-3 w-3" />-{abs}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
      <Minus className="h-3 w-3" />0%
    </span>
  );
}

/** Summary card */
function SummaryCard({
  label, value, sub, icon, iconBg, iconColor, trend, periodLabel,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  trend?: number | null;
  periodLabel: string;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            {trend != null && <TrendBadge change={trend} />}
          </div>
          <p className="mt-2 text-3xl font-bold text-foreground truncate">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
          <p className="mt-1 text-xs text-muted-foreground/60 italic">{periodLabel}</p>
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
        </div>
      </div>
    </Card>
  );
}

/** Horizontal bar chart for Top Vendors */
function VendorsBarChart({ vendors }: { vendors: any[] }) {
  if (vendors.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        No vendor data available
      </div>
    );
  }
  const data = [...vendors]
    .sort((a, b) => Number(b.total_amount) - Number(a.total_amount))
    .slice(0, 8)
    .map(v => ({ name: v.vendor ?? '—', amount: Number(v.total_amount), count: Number(v.count) }));

  const tooltipStyle = {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--foreground)',
  };

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 44)}>
      <BarChart data={data} layout="vertical" barSize={20} margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis
          type="number"
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickFormatter={v => `$${Number(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
        />
        <YAxis
          type="category"
          dataKey="name"
          stroke="var(--muted-foreground)"
          fontSize={12}
          width={110}
          tick={{ fill: 'var(--foreground)' }}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: any, _: any, props: any) => [
            `$${fmt(Number(v))} · ${props.payload?.count} invoice${props.payload?.count !== 1 ? 's' : ''}`,
            'Total',
          ]}
        />
        <Bar dataKey="amount" fill="#3b82f6" name="Total Amount" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Employee leaderboard */
function EmployeeLeaderboard({ employees }: { employees: any[] }) {
  if (employees.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        No employee data available
      </div>
    );
  }
  const max = Math.max(...employees.map(e => Number(e.count)));
  const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-3">
      {employees.slice(0, 8).map((e: any, i: number) => (
        <div key={i} className="flex items-center gap-3">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: colors[i % colors.length] }}
          >
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-foreground truncate">{e.name ?? '—'}</p>
              <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                {e.count} invoice{Number(e.count) !== 1 ? 's' : ''} · ${fmt(Number(e.total_amount))}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-1.5 rounded-full transition-all duration-500"
                style={{
                  width: max > 0 ? `${(Number(e.count) / max) * 100}%` : '0%',
                  backgroundColor: colors[i % colors.length],
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Top rejection reasons list */
function RejectionReasons({ reasons }: { reasons: any[] }) {
  if (!reasons || reasons.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        No rejection data available
      </div>
    );
  }
  const total = reasons.reduce((s: number, r: any) => s + Number(r.count), 0);

  return (
    <div className="space-y-3">
      {reasons.slice(0, 6).map((r: any, i: number) => {
        const pct = total > 0 ? Math.round((Number(r.count) / total) * 100) : 0;
        return (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm text-foreground truncate pr-2">{r.reason ?? 'Unspecified'}</p>
              <span className="shrink-0 text-xs font-semibold text-red-600">{r.count} ({pct}%)</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-1.5 rounded-full bg-red-400 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function Reports() {
  const { currentWorkspace } = useOutletContext<{
    currentWorkspace: Workspace;
    currentUser: User;
  }>();

  const [period, setPeriod]       = useState('30d');
  const [data, setData]           = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false); // subtle refetch state

  const isPersonal = currentWorkspace?.type === 'personal';
  const periodLabel = PERIOD_LABELS[period] ?? period;

  const fetchData = useCallback(() => {
    if (!currentWorkspace?.id) return;
    // First load → full spinner; subsequent → overlay shimmer only
    if (!data) setIsLoading(true);
    else setIsFetching(true);

    api.get(`/workspaces/${currentWorkspace.id}/invoices/reports`, {
      params: { period },
      headers: { 'x-workspace-id': currentWorkspace.id },
    })
      .then(({ data: d }) => setData(d))
      .catch(() => {})
      .finally(() => {
        setIsLoading(false);
        setIsFetching(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace?.id, period]);

  // Reset data when workspace changes so next load shows skeletons
  useEffect(() => {
    setData(null);
    setIsLoading(true);
  }, [currentWorkspace?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const summary      = data?.summary ?? {};
  const monthlyTrend = data?.monthly_trend ?? [];
  const statusDist   = data?.status_distribution ?? [];
  const topVendors   = data?.top_vendors ?? [];
  const employees    = data?.employee_leaderboard ?? [];
  const rejReasons   = data?.top_rejection_reasons ?? [];
  const totalMembers = Number(data?.total_members ?? 0);
  const changes      = data?.mom_changes ?? {}; // month-over-month deltas

  const total        = Number(summary.total ?? 0);
  const approved     = Number(summary.approved ?? 0);
  const rejected     = Number(summary.rejected ?? 0);
  const pending      = Number(summary.pending ?? 0);
  const totalAmount  = Number(summary.total_amount ?? 0);
  const approvedAmount = Number(summary.approved_amount ?? totalAmount); // prefer separate field
  const avgAmount    = Number(summary.avg_amount ?? 0);
  const processed    = Number(summary.processed ?? 0);
  const failed       = Number(summary.failed ?? 0);
  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
  const ocrSuccessRate = (processed + failed) > 0
    ? Math.round((processed / (processed + failed)) * 100)
    : 0;
  const avgProcessingTime = data?.avg_processing_hours != null
    ? `${Number(data.avg_processing_hours).toFixed(1)}h`
    : null;

  const pieData = statusDist.map((s: any) => ({
    name:  STATUS_LABELS[s.status] ?? s.status,
    value: Number(s.count),
    color: STATUS_COLORS[s.status] ?? '#94a3b8',
  }));

  const hasBarData  = monthlyTrend.length >= 1;
  const hasLineData = monthlyTrend.length >= 2;

  const tooltipStyle = {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--foreground)',
  };

  // ── Period selector ─────────────────────────────────────────────────────────
  const PeriodSelect = () => (
    <Select value={period} onValueChange={setPeriod} disabled={isFetching}>
      <SelectTrigger className="w-[180px] h-10 border border-input bg-background">
        <SelectValue placeholder="Select period" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="30d">Last 30 Days</SelectItem>
        <SelectItem value="90d">Last 90 Days</SelectItem>
        <SelectItem value="180d">Last 6 Months</SelectItem>
        <SelectItem value="1y">Last Year</SelectItem>
      </SelectContent>
    </Select>
  );

  // ── Full loading (first load / workspace switch) ────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-44 rounded-md" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SummaryCardSkeleton key={i} />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="mb-6 h-5 w-40" />
              <Skeleton className="h-[300px] w-full" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ── Refetch overlay ─────────────────────────────────────────────────────────
  const FetchingOverlay = () =>
    isFetching ? (
      <div className="pointer-events-none fixed inset-0 z-10 flex items-start justify-center pt-6">
        <div className="flex items-center gap-2 rounded-full border bg-background/90 px-4 py-2 shadow-lg backdrop-blur-sm text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Refreshing…
        </div>
      </div>
    ) : null;

  // ── Personal view ───────────────────────────────────────────────────────────
  if (isPersonal) {
    return (
      <div className={`space-y-6 transition-opacity duration-200 ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
        <FetchingOverlay />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Reports</h1>
            <p className="mt-1 text-muted-foreground">Your personal invoice statistics</p>
          </div>
          <PeriodSelect />
        </div>

        {/* Summary cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Total Invoices"
            value={total}
            sub={`${pending} pending`}
            icon={<FileText className="h-6 w-6" />}
            iconBg="bg-blue-100" iconColor="text-blue-600"
            trend={changes.total}
            periodLabel={periodLabel}
          />
          <SummaryCard
            label="Total Amount"
            value={`$${fmt(totalAmount)}`}
            sub={`Avg $${fmt(avgAmount)} each`}
            icon={<DollarSign className="h-6 w-6" />}
            iconBg="bg-green-100" iconColor="text-green-600"
            trend={changes.total_amount}
            periodLabel={periodLabel}
          />
          <SummaryCard
            label="OCR Success Rate"
            value={`${ocrSuccessRate}%`}
            sub={`${processed} processed · ${failed} failed`}
            icon={<CheckCircle2 className="h-6 w-6" />}
            iconBg="bg-purple-100" iconColor="text-purple-600"
            trend={changes.ocr_success_rate}
            periodLabel={periodLabel}
          />
          <SummaryCard
            label="In Queue"
            value={pending}
            sub="Currently in OCR queue"
            icon={<Clock className="h-6 w-6" />}
            iconBg="bg-yellow-100" iconColor="text-yellow-600"
            periodLabel={periodLabel}
          />
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h3 className="mb-6 font-semibold text-foreground">Invoice Amount Over Time</h3>
            {!hasLineData ? (
              <div className="flex h-[280px] flex-col items-center justify-center gap-1 text-sm text-muted-foreground">
                <p>Only one data point available.</p>
                <p className="text-xs">Select a longer period or wait for more data.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: any) => [`$${fmt(Number(v))}`, 'Amount']}
                  />
                  <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="mb-6 font-semibold text-foreground">Invoice Count Over Time</h3>
            {!hasBarData ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                No data for this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyTrend} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="#8b5cf6" name="Invoices" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // ── Company / Director view ─────────────────────────────────────────────────
  return (
    <div className={`space-y-6 transition-opacity duration-200 ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
      <FetchingOverlay />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="mt-1 text-muted-foreground">Invoice statistics and performance metrics</p>
        </div>
        <div className="flex gap-3">
          <PeriodSelect />
          <Button variant="outline" onClick={() => exportToCSV(data, period, false)}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary cards — row 1 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total Invoices"
          value={total}
          sub={`${pending} pending review`}
          icon={<FileText className="h-6 w-6" />}
          iconBg="bg-blue-100" iconColor="text-blue-600"
          trend={changes.total}
          periodLabel={periodLabel}
        />
        {/* Fixed label: only show approved amount */}
        <SummaryCard
          label="Approved Amount"
          value={`$${fmt(approvedAmount)}`}
          sub={`Avg $${fmt(avgAmount)} per invoice · all statuses $${fmt(totalAmount)}`}
          icon={<DollarSign className="h-6 w-6" />}
          iconBg="bg-green-100" iconColor="text-green-600"
          trend={changes.approved_amount}
          periodLabel={periodLabel}
        />
        <SummaryCard
          label="Approval Rate"
          value={`${approvalRate}%`}
          sub={`${approved} approved · ${rejected} rejected`}
          icon={<TrendingUp className="h-6 w-6" />}
          iconBg="bg-purple-100" iconColor="text-purple-600"
          trend={changes.approval_rate}
          periodLabel={periodLabel}
        />
        <SummaryCard
          label="Team Members"
          value={totalMembers}
          sub="Active in workspace"
          icon={<Users className="h-6 w-6" />}
          iconBg="bg-orange-100" iconColor="text-orange-600"
          periodLabel={periodLabel}
        />
      </div>

      {/* Summary cards — row 2 (OCR + processing time, previously missing) */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="OCR Success Rate"
          value={`${ocrSuccessRate}%`}
          sub={`${processed} processed · ${failed} failed`}
          icon={<Cpu className="h-6 w-6" />}
          iconBg="bg-sky-100" iconColor="text-sky-600"
          trend={changes.ocr_success_rate}
          periodLabel={periodLabel}
        />
        {avgProcessingTime && (
          <SummaryCard
            label="Avg Processing Time"
            value={avgProcessingTime}
            sub="Upload → approved"
            icon={<Clock className="h-6 w-6" />}
            iconBg="bg-indigo-100" iconColor="text-indigo-600"
            trend={changes.avg_processing_hours != null ? -changes.avg_processing_hours : null} // lower is better → invert sign
            periodLabel={periodLabel}
          />
        )}
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-6 font-semibold text-foreground">Monthly Approved Amount</h3>
          {!hasBarData ? (
            <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
              No data for this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyTrend} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: any) => [`$${fmt(Number(v))}`, 'Amount']}
                />
                <Bar dataKey="amount" fill="#3b82f6" name="Amount" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="mb-6 font-semibold text-foreground">Invoice Status Distribution</h3>
          {pieData.length === 0 ? (
            <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
              No data for this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  labelLine={false}
                  label={({ name, percent }) =>
                    (percent ?? 0) > 0.08
                      ? `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                      : ''
                  }
                >
                  {pieData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-6 font-semibold text-foreground">Invoice Count Trend</h3>
          {!hasLineData ? (
            <div className="flex h-[300px] flex-col items-center justify-center gap-1 text-sm text-muted-foreground">
              <p>Only one data point available.</p>
              <p className="text-xs">Select a longer period or wait for more data.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2}
                  name="Invoices" dot={{ fill: '#8b5cf6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Top Vendors — now a horizontal bar chart */}
        <Card className="p-6">
          <h3 className="mb-6 font-semibold text-foreground">Top Vendors</h3>
          <VendorsBarChart vendors={topVendors} />
        </Card>
      </div>

      {/* Row 3: Rejection reasons + Employee leaderboard */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-6 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <h3 className="font-semibold text-foreground">Top Rejection Reasons</h3>
          </div>
          <RejectionReasons reasons={rejReasons} />
        </Card>

        <Card className="p-6">
          <div className="mb-6 flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            <h3 className="font-semibold text-foreground">Employee Upload Leaderboard</h3>
          </div>
          <EmployeeLeaderboard employees={employees} />
        </Card>
      </div>

      {/* Approval Summary */}
      <Card className="p-6">
        <h3 className="mb-6 font-semibold text-foreground">Approval Summary</h3>
        <div className="grid gap-6 md:grid-cols-3">

          {/* Rate circle */}
          <div className="flex flex-col items-center justify-center rounded-lg border p-6 text-center">
            <p className="text-5xl font-bold text-green-600">{approvalRate}%</p>
            <p className="mt-2 text-sm text-muted-foreground">Approval Rate</p>
            <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />{approved} approved
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-red-500" />{rejected} rejected
              </span>
            </div>
          </div>

          {/* Progress bars */}
          <div className="flex flex-col justify-between h-full space-y-auto">
            {[
              { label: 'Approved',       value: approved, color: 'bg-green-500',  text: 'text-green-600' },
              { label: 'Pending Review', value: pending,  color: 'bg-yellow-500', text: 'text-yellow-600' },
              { label: 'Rejected',       value: rejected, color: 'bg-red-500',    text: 'text-red-600' },
            ].map(({ label, value, color, text }) => (
              <div key={label} className="flex-1 flex flex-col justify-center py-3 border-b last:border-b-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className={`text-sm font-bold ${text}`}>{value}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className={`h-2 rounded-full ${color}`}
                    style={{ width: total > 0 ? `${(value / total) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Amount stats */}
          <div className="space-y-4 rounded-lg border p-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Approved Amount</p>
              <p className="mt-1 text-xl font-bold text-foreground">${fmt(approvedAmount)}</p>
            </div>
            <div className="h-px bg-border" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Average per Invoice</p>
              <p className="mt-1 text-xl font-bold text-foreground">${fmt(avgAmount)}</p>
            </div>
            <div className="h-px bg-border" />
            {avgProcessingTime && (
              <>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg Processing Time</p>
                  <p className="mt-1 text-xl font-bold text-foreground">{avgProcessingTime}</p>
                </div>
                <div className="h-px bg-border" />
              </>
            )}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Team Members</p>
              <p className="mt-1 text-xl font-bold text-foreground">{totalMembers}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}