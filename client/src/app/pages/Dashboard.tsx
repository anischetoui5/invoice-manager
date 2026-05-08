import { Link, useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import {
  FileText, Upload, CheckCircle2, XCircle, Clock,
  DollarSign, Users, Building2, Shield, CreditCard, ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import type { UserRole, Workspace, User } from '../types';
import { JoinCompany } from '../components/JoinCompany';
import { useState, useEffect, useRef } from 'react';
import api from '../../lib/api';

interface DashboardProps {
  userRole: UserRole;
}

// ── Status badge config ────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  draft:          { bg: 'bg-slate-100 dark:bg-slate-800',        text: 'text-slate-600 dark:text-slate-400',    label: 'Draft' },
  pending_review: { bg: 'bg-amber-50 dark:bg-amber-900/20',      text: 'text-amber-700 dark:text-amber-400',    label: 'Pending' },
  approved:       { bg: 'bg-emerald-50 dark:bg-emerald-900/20',  text: 'text-emerald-700 dark:text-emerald-400', label: 'Approved' },
  rejected:       { bg: 'bg-red-50 dark:bg-red-900/20',         text: 'text-red-600 dark:text-red-400',        label: 'Rejected' },
};

// ── Activity labels ────────────────────────────────────────────────────────
const ACTION_CONFIG: Record<string, { label: string; dot: string }> = {
  'invoice.created':        { label: 'Invoice created',     dot: 'var(--chart-1)' },
  'invoice.status_changed': { label: 'Status changed',      dot: 'var(--chart-3)' },
  'invoice.deleted':        { label: 'Invoice deleted',     dot: 'var(--chart-5)' },
  'invoice.updated':        { label: 'Invoice updated',     dot: 'var(--chart-4)' },
  'member.joined':          { label: 'Member joined',       dot: 'var(--chart-2)' },
  'member.left':            { label: 'Member removed',      dot: 'var(--chart-5)' },
  'invitation.accepted':    { label: 'Invitation accepted', dot: 'var(--chart-2)' },
  'invitation.rejected':    { label: 'Invitation rejected', dot: 'var(--chart-5)' },
  'company.updated':        { label: 'Company updated',     dot: 'var(--chart-1)' },
  'membership.expired':     { label: 'Membership expired',  dot: 'var(--chart-5)' },
  'contract.renewed':       { label: 'Contract renewed',    dot: 'var(--chart-2)' },
};

// ── Shared UI primitives ───────────────────────────────────────────────────

function IconBox({ icon: Icon, color }: { icon: React.ElementType; color: string }) {
  const styleMap: Record<string, { background: string; boxShadow: string }> = {
    blue:   { background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)', boxShadow: '0 4px 12px rgba(29,78,216,0.35)' },
    green:  { background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)', boxShadow: '0 4px 12px rgba(22,163,74,0.35)' },
    yellow: { background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', boxShadow: '0 4px 12px rgba(217,119,6,0.35)' },
    red:    { background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)', boxShadow: '0 4px 12px rgba(220,38,38,0.35)' },
    purple: { background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)', boxShadow: '0 4px 12px rgba(124,58,237,0.35)' },
    orange: { background: 'linear-gradient(135deg, #ea580c 0%, #fb923c 100%)', boxShadow: '0 4px 12px rgba(234,88,12,0.35)' },
    slate:  { background: 'linear-gradient(135deg, #475569 0%, #94a3b8 100%)', boxShadow: '0 4px 12px rgba(71,85,105,0.25)' },
  };
  const s = styleMap[color] ?? styleMap.slate;
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
      style={s}
    >
      <Icon className="h-5 w-5 text-white" strokeWidth={2} />
    </div>
  );
}

// Stat card — stable, no animation class (parent handles page-enter)
function StatCard({
  label, value, icon, color, loading,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  color: string;
  loading?: boolean;
}) {
  return (
    <div className="erp-card rounded-lg p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          {loading
            ? <div className="shimmer-skeleton mt-2 h-8 w-16 rounded" />
            : <p className="mt-1.5 text-2xl font-semibold text-foreground tabular-nums">{value}</p>
          }
        </div>
        <IconBox icon={icon} color={color} />
      </div>
    </div>
  );
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {action}
    </div>
  );
}

function ViewAllLink({ to, label = 'View all' }: { to: string; label?: string }) {
  return (
    <Link to={to} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
      {label} <ArrowRight className="h-3 w-3" />
    </Link>
  );
}

// Recent activity — stable inner state, never causes parent flicker
function RecentActivity({ workspaceId, limit = 5 }: { workspaceId: string; limit?: number }) {
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    api.get(`/workspaces/${workspaceId}/activity`, {
      params: { limit },
      headers: { 'x-workspace-id': workspaceId },
    })
      .then(({ data }) => setActivity(data.activity ?? []))
      .catch(() => setActivity([]))
      .finally(() => setLoading(false));
  }, [workspaceId, limit]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="shimmer-skeleton h-2 w-2 shrink-0 rounded-full" />
            <div className="shimmer-skeleton h-3.5 flex-1 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (activity.length === 0) {
    return <p className="text-xs text-muted-foreground">No activity yet.</p>;
  }

  return (
    <div className="space-y-3">
      {activity.map((item: any) => {
        const cfg = ACTION_CONFIG[item.action] ?? { label: item.action, dot: 'var(--muted-foreground)' };
        return (
          <div key={item.id} className="flex items-start gap-2.5">
            <div
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: cfg.dot }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">
                <span className="font-medium">{cfg.label}</span>
                {item.user_name && <span className="text-muted-foreground"> · {item.user_name}</span>}
                {item.metadata?.vendor_name && (
                  <span className="text-muted-foreground"> · {item.metadata.vendor_name}</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(item.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Invoice preview list
function InvoicePreview({ invoices, emptyMessage, uploadLink = true }: {
  invoices: any[];
  emptyMessage: string;
  uploadLink?: boolean;
}) {
  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <IconBox icon={Upload} color="blue" />
        <p className="text-sm text-muted-foreground mt-3 mb-4 max-w-xs">{emptyMessage}</p>
        {uploadLink && (
          <Link to="/dashboard/upload">
            <Button size="sm"><Upload className="mr-1.5 h-3.5 w-3.5" />Upload Invoice</Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {invoices.map(invoice => {
        const badge = STATUS_CONFIG[invoice.current_status] ?? {
          bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600', label: invoice.current_status,
        };
        return (
          <Link
            key={invoice.id}
            to={`/dashboard/invoices/${invoice.id}`}
            className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2.5 transition-colors hover:bg-muted/50 hover:border-border-strong"
          >
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {invoice.vendor_name ?? 'Unknown Vendor'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {invoice.invoice_number ?? '—'} · {invoice.invoice_date
                    ? new Date(invoice.invoice_date).toLocaleDateString()
                    : new Date(invoice.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 ml-3">
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {invoice.currency} {Number(invoice.amount ?? 0).toLocaleString()}
              </span>
              <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${badge.bg} ${badge.text}`}>
                {badge.label}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────

export function Dashboard({ userRole }: DashboardProps) {
  const { currentWorkspace, currentUser, workspaces, currentSubscription } = useOutletContext<{
    currentWorkspace: Workspace;
    currentUser: User;
    workspaces: Workspace[];
    currentSubscription: any;
  }>();

  const hasCompanyRole = workspaces?.some(w =>
    w.type === 'company' && ['Employee', 'Director', 'Accountant'].includes(w.role)
  );
  const isAccountant   = workspaces?.some(w => w.role === 'Accountant');
  const isPersonalOnly = !hasCompanyRole && !isAccountant && currentWorkspace?.type === 'personal';

  const [companyCode, setCompanyCode] = useState<string | null>(null);
  const [stats, setStats]             = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Use a ref to track the workspace ID that was last fetched
  // This prevents re-fetching (and re-flickering) when unrelated state changes
  const lastFetchedWorkspace = useRef<string | null>(null);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    if (lastFetchedWorkspace.current === currentWorkspace.id) return;
    lastFetchedWorkspace.current = currentWorkspace.id;

    setStats(null);
    setStatsLoading(true);

    api.get(`/workspaces/${currentWorkspace.id}/invoices/dashboard-stats`)
      .then(({ data }) => setStats(data.stats))
      .catch(() => {})
      .finally(() => setStatsLoading(false));

    if (currentWorkspace?.type === 'company') {
      api.get(`/company/${currentWorkspace.id}`)
        .then(({ data }) => setCompanyCode(data.company.code))
        .catch(() => {});
    }
  }, [currentWorkspace?.id]);

  // Reset ref when workspace actually changes so re-fetch happens
  useEffect(() => {
    lastFetchedWorkspace.current = null;
  }, [currentWorkspace?.id]);

  const [recentCompanies, setRecentCompanies] = useState<any[]>([]);
  useEffect(() => {
    if (userRole !== 'admin') return;
    api.get('/company')
      .then(({ data }) => setRecentCompanies(data.companies.slice(0, 4)))
      .catch(() => {});
  }, [userRole]);

  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  useEffect(() => {
    if (!currentWorkspace?.id) return;
    const normalizedRole = userRole?.toLowerCase();
    if (!['employee', 'accountant'].includes(normalizedRole)) return;
    const params: Record<string, any> = { limit: 5, page: 1 };
    if (normalizedRole === 'accountant') params.status = 'pending_review';
    api.get(`/workspaces/${currentWorkspace.id}/invoices`, { params })
      .then(({ data }) => setRecentInvoices(data.invoices ?? []))
      .catch(() => {});
  }, [currentWorkspace?.id, userRole]);

  // ── Stat helpers ───────────────────────────────────────────────────────────

  const S = (key: string, fallback = 0) => Number(stats?.[key] ?? fallback);
  const sv = (v: number | string) => statsLoading ? undefined : v;

  // ── Normal / Personal ──────────────────────────────────────────────────────
  const renderNormalUserDashboard = () => {
    const invoiceLimit = currentSubscription?.invoiceLimit ?? 0;
    const invoiceUsed  = currentSubscription?.invoiceUsed ?? 0;
    const usagePct     = invoiceLimit > 0 ? Math.min((invoiceUsed / invoiceLimit) * 100, 100) : 0;
    const nearLimit    = invoiceLimit > 0 && (invoiceUsed / invoiceLimit) >= 0.8;

    return (
      <>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Invoices" value={sv(S('total'))}   icon={FileText}   color="blue"   loading={statsLoading} />
          <StatCard label="Processing"     value={sv(S('pending'))} icon={Clock}      color="yellow" loading={statsLoading} />
          <StatCard label="Total Amount"   value={sv(`$${S('total_amount').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)} icon={DollarSign} color="green" loading={statsLoading} />
          <div className="erp-card rounded-lg p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Plan</p>
                <p className="mt-1.5 text-2xl font-semibold text-foreground">{currentSubscription?.plan ?? '—'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">${currentSubscription?.price ?? 0}/mo</p>
              </div>
              <IconBox icon={CreditCard} color="purple" />
            </div>
          </div>
        </div>

        <div className="erp-card rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Plan Usage</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {invoiceUsed} of {invoiceLimit === -1 ? 'Unlimited' : invoiceLimit} invoices this month
              </p>
            </div>
            {nearLimit && (
              <Link to="/dashboard/personal-subscription">
                <Button size="sm" variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-900/20">
                  Upgrade
                </Button>
              </Link>
            )}
          </div>
          <Progress value={usagePct} className="h-2" />
          {nearLimit && (
            <p className="text-xs text-amber-600 mt-2">{Math.round(usagePct)}% used — consider upgrading.</p>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className={`erp-card rounded-lg p-5 ${!isPersonalOnly && !isAccountant ? 'lg:col-span-2' : ''}`}>
            <SectionHeader title="My Invoices" action={<ViewAllLink to="/dashboard/invoices" />} />
            {S('total') === 0 && !statsLoading ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <IconBox icon={Upload} color="blue" />
                <p className="text-sm text-muted-foreground mt-3 mb-4">No invoices yet.</p>
                <Link to="/dashboard/upload"><Button size="sm"><Upload className="mr-1.5 h-3.5 w-3.5" />Upload Invoice</Button></Link>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: S('pending'),   label: 'Processing', color: 'text-amber-600' },
                  { value: S('processed'), label: 'Processed',  color: 'text-emerald-600' },
                  { value: S('failed'),    label: 'Failed',     color: 'text-red-600' },
                ].map(({ value, label, color }) => (
                  <div key={label} className="rounded-md bg-muted/50 border border-border p-3 text-center">
                    <p className={`text-2xl font-semibold tabular-nums ${color}`}>{value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          {isPersonalOnly && <JoinCompany userRole="normal" />}
          {isAccountant   && <JoinCompany userRole="accountant" lockedRole />}
        </div>
      </>
    );
  };

  // ── Employee ───────────────────────────────────────────────────────────────
  const renderEmployeeDashboard = () => (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Uploaded"  value={sv(S('total'))}    icon={FileText}    color="blue"   loading={statsLoading} />
        <StatCard label="Pending Review"  value={sv(S('pending'))}  icon={Clock}       color="yellow" loading={statsLoading} />
        <StatCard label="Approved"        value={sv(S('approved'))} icon={CheckCircle2} color="green" loading={statsLoading} />
        <StatCard label="Rejected"        value={sv(S('rejected'))} icon={XCircle}     color="red"    loading={statsLoading} />
      </div>

      <div className="erp-card rounded-lg p-5">
        <SectionHeader title="Recent Invoices" action={<ViewAllLink to="/dashboard/invoices" />} />
        <InvoicePreview invoices={recentInvoices} emptyMessage="No invoices yet. Upload your first invoice." />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="erp-card rounded-lg p-5">
          <SectionHeader title="Quick Actions" />
          <div className="space-y-2">
            {[
              { to: '/dashboard/upload',   icon: Upload,    label: 'Upload New Invoice' },
              { to: '/dashboard/invoices', icon: FileText,  label: 'View All Invoices'  },
            ].map(({ to, icon: Icon, label }) => (
              <Link key={to} to={to} className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/50">
                <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                {label}
                <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>

        <div className="erp-card rounded-lg p-5">
          <SectionHeader title="Summary" />
          <div className="space-y-3">
            {[
              { label: 'Approved', value: S('approved'), color: 'bg-emerald-500' },
              { label: 'Pending',  value: S('pending'),  color: 'bg-amber-500' },
              { label: 'Rejected', value: S('rejected'), color: 'bg-red-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${color}`} />
                  <span className="text-sm text-muted-foreground">{label}</span>
                </div>
                <span className="text-sm font-semibold tabular-nums text-foreground">{value}</span>
              </div>
            ))}
            <div className="pt-2 border-t border-border flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Amount</span>
              <span className="text-base font-semibold tabular-nums text-foreground">
                ${S('total_amount').toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // ── Accountant ─────────────────────────────────────────────────────────────
  const renderAccountantDashboard = () => {
    const approved     = S('approved');
    const rejected     = S('rejected');
    const approvalRate = approved + rejected > 0 ? Math.round((approved / (approved + rejected)) * 100) : 0;

    return (
      <>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Pending Validation" value={sv(S('pending_validation'))} icon={Clock}        color="orange" loading={statsLoading} />
          <StatCard label="Validated Today"    value={sv(S('validated_today'))}   icon={CheckCircle2} color="purple" loading={statsLoading} />
          <StatCard label="Approved"           value={sv(approved)}               icon={CheckCircle2} color="green"  loading={statsLoading} />
          <StatCard label="Rejected"           value={sv(rejected)}               icon={XCircle}      color="red"    loading={statsLoading} />
        </div>

        <div className="erp-card rounded-lg p-5">
          <SectionHeader
            title="Invoices Pending Validation"
            action={<ViewAllLink to="/dashboard/invoices?status=pending_review" label={`${S('pending_validation')} pending`} />}
          />
          <InvoicePreview invoices={recentInvoices} emptyMessage="All caught up — no invoices pending validation." uploadLink={false} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="erp-card rounded-lg p-5">
            <SectionHeader title="Recent Activity" />
            <RecentActivity workspaceId={currentWorkspace.id} limit={5} />
          </div>

          <div className="erp-card rounded-lg p-5">
            <SectionHeader title="Validation Stats" />
            <div className="space-y-2.5">
              {[
                { label: 'Total Validated', value: approved + rejected, highlight: false },
                { label: 'Approval Rate',   value: `${approvalRate}%`,  highlight: true  },
              ].map(({ label, value, highlight }) => (
                <div key={label} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2.5">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className={`text-xl font-semibold tabular-nums ${highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <JoinCompany userRole="accountant" lockedRole />
      </>
    );
  };

  // ── Director ───────────────────────────────────────────────────────────────
  const renderDirectorDashboard = () => {
    const total    = S('total');
    const approved = S('approved');
    const rejected = S('rejected');
    const pending  = S('pending');

    return (
      <>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Invoices"  value={sv(total)}                   icon={FileText}    color="blue"   loading={statsLoading} />
          <StatCard label="Approved Amount" value={sv(`$${S('total_amount').toLocaleString()}`)} icon={DollarSign} color="green" loading={statsLoading} />
          <StatCard label="Approval Rate"   value={sv(`${S('approval_rate')}%`)} icon={TrendingUp}  color="purple" loading={statsLoading} />
          <StatCard label="Team Members"    value={sv(S('total_members'))}       icon={Users}       color="orange" loading={statsLoading} />
        </div>

        {/* Overview panel */}
        <div className="erp-card rounded-lg p-5">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Organisation Overview</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Invoice activity across all employees</p>
            </div>
            <div className="flex gap-2">
              <Link to="/dashboard/team">
                <Button variant="outline" size="sm"><Users className="mr-1.5 h-3.5 w-3.5" />Team</Button>
              </Link>
              <Link to="subscription">
                <Button variant="outline" size="sm">Subscription</Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3 mb-4">
            {[
              { icon: FileText,    label: 'Total',    value: total,    sub: 'All employees',     color: 'blue' },
              { icon: CheckCircle2, label: 'Approved', value: approved, sub: `${total > 0 ? Math.round((approved / total) * 100) : 0}% of total`, color: 'green' },
              { icon: XCircle,     label: 'Rejected', value: rejected, sub: 'Needs attention',  color: 'red' },
            ].map(({ icon, label, value, sub, color }) => (
              <div key={label} className="flex items-center gap-3 rounded-md border border-border p-4">
                <IconBox icon={icon} color={color} />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-md border border-border p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-foreground">
                {pending > 0 ? `${pending} invoice${pending !== 1 ? 's' : ''} awaiting review` : 'No pending invoices'}
              </span>
            </div>
            {pending > 0 && (
              <Link to="/dashboard/invoices?status=pending_review">
                <Button size="sm" variant="outline" className="text-xs">Review <ArrowRight className="ml-1 h-3 w-3" /></Button>
              </Link>
            )}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <div className="erp-card rounded-lg p-5 lg:col-span-2">
            <SectionHeader title="Status Breakdown" action={<ViewAllLink to="/dashboard/reports" label="Reports" />} />
            {total === 0 ? <p className="text-xs text-muted-foreground">No data yet.</p> : (
              <div className="space-y-3">
                {[
                  { label: 'Approved', value: approved, color: 'bg-emerald-500' },
                  { label: 'Pending',  value: pending,  color: 'bg-amber-500' },
                  { label: 'Rejected', value: rejected, color: 'bg-red-500' },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <span className="text-xs font-semibold text-foreground tabular-nums">{value}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full rounded-full ${color} transition-all duration-500`}
                        style={{ width: total > 0 ? `${(value / total) * 100}%` : '0%' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="erp-card rounded-lg p-5">
            <SectionHeader title="Recent Activity" action={<ViewAllLink to="/dashboard/history" />} />
            <RecentActivity workspaceId={currentWorkspace.id} limit={4} />
          </div>

          <div className="erp-card rounded-lg p-5">
            <SectionHeader title="Company Code" />
            <p className="text-xs text-muted-foreground -mt-2 mb-3">Share to invite team members</p>
            <div className="rounded-md border border-border bg-muted/30 p-3 text-center mb-3">
              <p className="text-xs text-muted-foreground mb-1">Code</p>
              <p className="text-xl font-bold tracking-[0.2em] text-foreground font-mono">
                {companyCode ?? '———'}
              </p>
            </div>
            <Button size="sm" variant="outline" className="w-full text-xs" disabled={!companyCode}
              onClick={() => { if (companyCode) { navigator.clipboard.writeText(companyCode); toast.success('Copied!'); } }}>
              Copy Code
            </Button>
          </div>
        </div>
      </>
    );
  };

  // ── Admin ──────────────────────────────────────────────────────────────────
  const renderAdminDashboard = () => {
    const roleCounts = stats?.role_counts ?? {};
    return (
      <>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Users"     value={sv(S('total_users'))}     icon={Users}    color="blue"   loading={statsLoading} />
          <StatCard label="Total Companies" value={sv(S('total_companies'))} icon={Building2} color="purple" loading={statsLoading} />
          <StatCard label="Total Invoices"  value={sv(S('total_invoices'))}  icon={FileText}  color="green"  loading={statsLoading} />
          <div className="erp-card rounded-lg p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Platform Health</p>
                <p className="mt-1.5 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">99.9%</p>
                <p className="text-xs text-muted-foreground mt-0.5">Uptime</p>
              </div>
              <IconBox icon={Shield} color="green" />
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="erp-card rounded-lg p-5">
            <SectionHeader title="Recent Companies" action={<ViewAllLink to="/dashboard/companies" />} />
            {recentCompanies.length === 0 ? <p className="text-xs text-muted-foreground">No companies yet.</p> : (
              <div className="space-y-1.5">
                {recentCompanies.map(company => (
                  <div key={company.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-xs font-bold text-primary-foreground">
                        {company.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{company.name}</p>
                        <p className="text-xs text-muted-foreground">{company.member_count} members</p>
                      </div>
                    </div>
                    <code className="text-xs font-mono font-semibold text-primary">{company.code}</code>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="erp-card rounded-lg p-5">
            <SectionHeader title="Recent Activity" action={<ViewAllLink to="/dashboard/history" />} />
            <RecentActivity workspaceId={currentWorkspace.id} limit={5} />
          </div>

          <div className="erp-card rounded-lg p-5 lg:col-span-2">
            <SectionHeader title="User Distribution" />
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              {[
                { label: 'Directors',   key: 'director',   color: 'orange' },
                { label: 'Employees',   key: 'employee',   color: 'blue' },
                { label: 'Accountants', key: 'accountant', color: 'green' },
                { label: 'Personal',    key: 'personal',   color: 'slate' },
              ].map(({ label, key, color }) => (
                <div key={key} className="erp-card rounded-md p-4 flex items-center gap-3">
                  <IconBox icon={Users} color={color} />
                  <div>
                    <p className="text-xl font-semibold tabular-nums text-foreground">{roleCounts[key] ?? 0}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  };

  // ── Page subtitle ──────────────────────────────────────────────────────────
  const PAGE_SUBTITLE: Record<string, string> = {
    employee:   'Upload and track your invoices',
    accountant: 'Review and validate pending invoices',
    director:   'Invoice management and organisation overview',
    admin:      'Platform administration',
    normal:     'Personal invoice management',
  };

  return (
    // page-enter fires once when the component mounts — not on every re-render
    // because the animation is CSS-driven and doesn't reset on state updates
    <div className="space-y-5 page-enter">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{PAGE_SUBTITLE[userRole] ?? ''}</p>
      </div>

      {userRole === 'employee'   && renderEmployeeDashboard()}
      {userRole === 'accountant' && renderAccountantDashboard()}
      {userRole === 'director'   && renderDirectorDashboard()}
      {userRole === 'admin'      && renderAdminDashboard()}
      {userRole === 'normal'     && renderNormalUserDashboard()}
    </div>
  );
}