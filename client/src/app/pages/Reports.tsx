import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Download, TrendingUp, DollarSign, FileText, Users, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { Workspace, User } from '../types';
import api from '../../lib/api';

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

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function Reports() {
  const { currentWorkspace } = useOutletContext<{
    currentWorkspace: Workspace;
    currentUser: User;
  }>();

  const [period, setPeriod]       = useState('30d');
  const [data, setData]           = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isPersonal = currentWorkspace?.type === 'personal';

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    setIsLoading(true);
    api.get(`/workspaces/${currentWorkspace.id}/invoices/reports`, {
      params: { period },
      headers: { 'x-workspace-id': currentWorkspace.id },
    })
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [currentWorkspace?.id, period]);

  const summary      = data?.summary ?? {};
  const monthlyTrend = data?.monthly_trend ?? [];
  const statusDist   = data?.status_distribution ?? [];
  const topVendors   = data?.top_vendors ?? [];
  const totalMembers = Number(data?.total_members ?? 0);

  const total        = Number(summary.total ?? 0);
  const approved     = Number(summary.approved ?? 0);
  const rejected     = Number(summary.rejected ?? 0);
  const pending      = Number(summary.pending ?? 0);
  const totalAmount  = Number(summary.total_amount ?? 0);
  const avgAmount    = Number(summary.avg_amount ?? 0);
  const processed    = Number(summary.processed ?? 0);
  const failed       = Number(summary.failed ?? 0);
  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
  const ocrSuccessRate = (processed + failed) > 0
    ? Math.round((processed / (processed + failed)) * 100)
    : 0;

  const pieData = statusDist.map((s: any) => ({
    name:  STATUS_LABELS[s.status] ?? s.status,
    value: Number(s.count),
    color: STATUS_COLORS[s.status] ?? '#94a3b8',
  }));

  const hasBarData  = monthlyTrend.length >= 1;
  const hasLineData = monthlyTrend.length >= 2;

  const PeriodSelect = () => (
    <Select value={period} onValueChange={setPeriod}>
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

  const tooltipStyle = {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--foreground)',
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Personal Reports ───────────────────────────────────────────────────────
  if (isPersonal) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Reports</h1>
            <p className="mt-1 text-muted-foreground">Your personal invoice statistics</p>
          </div>
          <PeriodSelect />
        </div>

        {/* Personal summary cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Invoices</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{total}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                <p className="mt-2 text-3xl font-bold text-foreground">${fmt(totalAmount)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Avg ${fmt(avgAmount)} each</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">OCR Success Rate</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{ocrSuccessRate}%</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {processed} processed · {failed} failed
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <CheckCircle2 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Processing</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{pending}</p>
                <p className="mt-1 text-xs text-muted-foreground">Currently in OCR queue</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Personal charts */}
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
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }}
                  />
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

  // ── Company Reports (Director / Accountant) ────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="mt-1 text-muted-foreground">Invoice statistics and performance metrics</p>
        </div>
        <div className="flex gap-3">
          <PeriodSelect />
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Invoices</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{total}</p>
              <p className="mt-1 text-xs text-muted-foreground">{pending} pending review</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Approved Amount</p>
              <p className="mt-2 text-3xl font-bold text-foreground">${fmt(totalAmount)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Avg ${fmt(avgAmount)} per invoice</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Approval Rate</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{approvalRate}%</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {approved} approved · {rejected} rejected
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Team Members</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{totalMembers}</p>
              <p className="mt-1 text-xs text-muted-foreground">Active in workspace</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row 1 */}
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
                      ? `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
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

      {/* Charts Row 2 */}
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
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  name="Invoices"
                  dot={{ fill: '#8b5cf6', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="mb-6 font-semibold text-foreground">Top Vendors</h3>
          {topVendors.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                No vendor data available
            </div>
          ) : (
            <div className="space-y-3">
              {topVendors.map((vendor: any, index: number) => (
                <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{vendor.vendor ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">
                        {vendor.count} invoice{Number(vendor.count) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-foreground">
                    ${fmt(Number(vendor.total_amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Approval Summary */}
      <Card className="p-6">
        <h3 className="mb-6 font-semibold text-foreground">Approval Summary</h3>
        <div className="grid gap-6 md:grid-cols-3">

          {/* Rate */}
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
          <div className="space-y-4">
            {[
              { label: 'Approved',       value: approved, color: 'bg-green-500',  text: 'text-green-600' },
              { label: 'Pending Review', value: pending,  color: 'bg-yellow-500', text: 'text-yellow-600' },
              { label: 'Rejected',       value: rejected, color: 'bg-red-500',    text: 'text-red-600' },
            ].map(({ label, value, color, text }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
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
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Approved</p>
              <p className="mt-1 text-xl font-bold text-foreground">${fmt(totalAmount)}</p>
            </div>
            <div className="h-px bg-border" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Average per Invoice</p>
              <p className="mt-1 text-xl font-bold text-foreground">${fmt(avgAmount)}</p>
            </div>
            <div className="h-px bg-border" />
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