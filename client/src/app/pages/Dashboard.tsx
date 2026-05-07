import { Link, useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import {
  FileText, Upload, CheckCircle2, XCircle, Clock,
  DollarSign, Users, Building2, Shield, CreditCard, ArrowRight,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import type { UserRole, Workspace, User } from '../types';
import { JoinCompany } from '../components/JoinCompany';
import { useState, useEffect } from 'react';
import api from '../../lib/api';

// ── Icon gradient helpers ──────────────────────────────────────────────────────
const ICON_GRADIENTS = {
  blue:   'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
  green:  'linear-gradient(135deg, #059669 0%, #10b981 100%)',
  yellow: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
  red:    'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
  purple: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
  orange: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
  indigo: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)',
  teal:   'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
} as const;

type GradientKey = keyof typeof ICON_GRADIENTS;

interface DashboardProps {
  userRole: UserRole;
}

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
  const isAccountant    = workspaces?.some(w => w.role === 'Accountant');
  const isPersonalOnly  = !hasCompanyRole && !isAccountant && currentWorkspace?.type === 'personal';

  const [companyCode,    setCompanyCode]    = useState<string | null>(null);
  const [stats,          setStats]          = useState<any>(null);
  const [statsLoading,   setStatsLoading]   = useState(false);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    setStats(null);
    setStatsLoading(true);
    api.get(`/workspaces/${currentWorkspace.id}/invoices/dashboard-stats`)
      .then(({ data }) => setStats(data.stats))
      .catch((err) => console.error('Dashboard stats error:', err.response?.data ?? err.message))
      .finally(() => setStatsLoading(false));

    if (currentWorkspace?.type === 'company') {
      api.get(`/company/${currentWorkspace.id}`)
        .then(({ data }) => setCompanyCode(data.company.code))
        .catch(() => {});
    }
  }, [currentWorkspace?.id, currentWorkspace?.role]);

  const [recentCompanies, setRecentCompanies] = useState<any[]>([]);
  useEffect(() => {
    if (userRole === 'admin') {
      api.get('/company')
        .then(({ data }) => setRecentCompanies(data.companies.slice(0, 4)))
        .catch(() => {});
    }
  }, [userRole]);

  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  useEffect(() => {
    if (!currentWorkspace?.id) return;
    if (!['employee', 'accountant'].includes(userRole)) return;
    const params: Record<string, any> = { limit: 5, page: 1 };
    if (userRole === 'accountant') params.status = 'pending_review';
    api.get(`/workspaces/${currentWorkspace.id}/invoices`, { params })
      .then(({ data }) => setRecentInvoices(data.invoices ?? []))
      .catch(() => {});
  }, [currentWorkspace?.id, userRole]);

  // ── Sub-components ────────────────────────────────────────────────────────

  const ACTION_CONFIG: Record<string, { label: string; dot: string }> = {
    'invoice.created':        { label: 'Invoice created',     dot: '#3b82f6' },
    'invoice.status_changed': { label: 'Status changed',      dot: '#f59e0b' },
    'invoice.deleted':        { label: 'Invoice deleted',     dot: '#ef4444' },
    'invoice.updated':        { label: 'Invoice updated',     dot: '#8b5cf6' },
    'member.joined':          { label: 'Member joined',       dot: '#10b981' },
    'member.left':            { label: 'Member removed',      dot: '#ef4444' },
    'invitation.accepted':    { label: 'Invitation accepted', dot: '#10b981' },
    'invitation.rejected':    { label: 'Invitation rejected', dot: '#ef4444' },
    'company.updated':        { label: 'Company updated',     dot: '#3b82f6' },
    'membership.expired':     { label: 'Membership expired',  dot: '#ef4444' },
    'contract.renewed':       { label: 'Contract renewed',    dot: '#10b981' },
  };

  function RecentActivity({ workspaceId, limit = 5 }: { workspaceId: string; limit?: number }) {
    const [activity, setActivity]   = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      if (!workspaceId) return;
      api.get(`/workspaces/${workspaceId}/activity`, {
        params: { limit },
        headers: { 'x-workspace-id': workspaceId },
      })
        .then(({ data }) => setActivity(data.activity ?? []))
        .catch(() => setActivity([]))
        .finally(() => setIsLoading(false));
    }, [workspaceId, limit]);

    if (isLoading) {
      return (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="shimmer-skeleton h-2 w-2 shrink-0 rounded-full" />
              <div className="shimmer-skeleton h-4 flex-1 rounded-lg" />
            </div>
          ))}
        </div>
      );
    }

    if (activity.length === 0) {
      return <p className="text-sm text-muted-foreground">No activity yet.</p>;
    }

    return (
      <div className="space-y-3">
        {activity.map((item: any) => {
          const cfg = ACTION_CONFIG[item.action] ?? { label: item.action, dot: '#94a3b8' };
          return (
            <div key={item.id} className="flex items-start gap-3 group">
              <div
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full ring-4 ring-transparent group-hover:ring-2 transition-all duration-200"
                style={{ background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}60` }}
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

  const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
    draft:          { bg: 'bg-slate-100 dark:bg-slate-800',   text: 'text-slate-600 dark:text-slate-400',  label: 'Draft' },
    pending_review: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400',  label: 'Pending' },
    approved:       { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', label: 'Approved' },
    rejected:       { bg: 'bg-red-50 dark:bg-red-900/20',    text: 'text-red-700 dark:text-red-400',      label: 'Rejected' },
  };

  const InvoicePreview = ({ invoices, emptyMessage, uploadLink = true }: {
    invoices: any[];
    emptyMessage: string;
    uploadLink?: boolean;
  }) => {
    if (invoices.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl mb-4"
            style={{ background: ICON_GRADIENTS.blue, boxShadow: '0 8px 24px rgba(37,99,235,0.25)' }}
          >
            <Upload className="h-7 w-7 text-white" />
          </div>
          <p className="text-sm text-muted-foreground mb-4 max-w-xs">{emptyMessage}</p>
          {uploadLink && (
            <Link to="/dashboard/upload">
              <Button size="sm" style={{ background: 'var(--gradient-brand)', border: 'none' }}>
                <Upload className="mr-2 h-3.5 w-3.5" />
                Upload Invoice
              </Button>
            </Link>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {invoices.map(invoice => {
          const badge = STATUS_CONFIG[invoice.current_status] ?? {
            bg: 'bg-slate-100 dark:bg-slate-800',
            text: 'text-slate-600',
            label: invoice.current_status,
          };
          return (
            <Link
              key={invoice.id}
              to={`/dashboard/invoices/${invoice.id}`}
              className="group flex items-center justify-between rounded-xl border border-border bg-background/50 p-3 transition-all duration-200 hover:border-primary/30 hover:bg-accent/30 hover:shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: ICON_GRADIENTS.blue }}
                >
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {invoice.vendor_name ?? 'Unknown Vendor'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {invoice.invoice_number ?? '—'} · {invoice.invoice_date
                      ? new Date(invoice.invoice_date).toLocaleDateString()
                      : new Date(invoice.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className="text-sm font-semibold text-foreground">
                  {invoice.currency} {Number(invoice.amount ?? 0).toLocaleString()}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.bg} ${badge.text}`}>
                  {badge.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    );
  };

  // ── Shared components ─────────────────────────────────────────────────────

  const StatValue = ({ value }: { value: number | string }) => (
    statsLoading
      ? <div className="shimmer-skeleton mt-2 h-9 w-20 rounded-xl" />
      : <p className="mt-1.5 text-3xl font-bold tracking-tight text-foreground">{value}</p>
  );

  const StatCard = ({
    label, value, icon: Icon, gradient, delay = 0,
  }: {
    label: string;
    value: React.ReactNode;
    icon: React.ElementType;
    gradient: GradientKey;
    delay?: number;
  }) => (
    <div
      className="card-premium animate-fade-up rounded-2xl p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
          {value}
        </div>
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ml-3"
          style={{ background: ICON_GRADIENTS[gradient], boxShadow: `0 6px 20px ${ICON_GRADIENTS[gradient].slice(22, 29)}40` }}
        >
          <Icon className="h-5 w-5 text-white" strokeWidth={2} />
        </div>
      </div>
    </div>
  );

  const SectionHeader = ({ title, action }: { title: string; action?: React.ReactNode }) => (
    <div className="flex items-center justify-between mb-5">
      <h3 className="font-bold text-foreground tracking-tight">{title}</h3>
      {action}
    </div>
  );

  const ViewAllLink = ({ to, label = 'View all' }: { to: string; label?: string }) => (
    <Link
      to={to}
      className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
    >
      {label} <ArrowRight className="h-3 w-3" />
    </Link>
  );

  // ── Normal/Personal ────────────────────────────────────────────────────────
  const renderNormalUserDashboard = () => {
    const totalInvoices = Number(stats?.total ?? 0);
    const pending       = Number(stats?.pending ?? 0);
    const processed     = Number(stats?.processed ?? 0);
    const failed        = Number(stats?.failed ?? 0);
    const totalAmount   = Number(stats?.total_amount ?? 0);

    const invoiceLimit  = currentSubscription?.invoiceLimit ?? 0;
    const invoiceUsed   = currentSubscription?.invoiceUsed ?? 0;
    const usagePct      = invoiceLimit > 0 ? Math.min((invoiceUsed / invoiceLimit) * 100, 100) : 0;
    const nearLimit     = invoiceLimit > 0 && (invoiceUsed / invoiceLimit) >= 0.8;

    return (
      <>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Invoices" value={<StatValue value={totalInvoices} />} icon={FileText}    gradient="blue"   delay={0}   />
          <StatCard label="OCR Processing" value={<StatValue value={pending} />}       icon={Clock}       gradient="yellow" delay={50}  />
          <StatCard label="Total Amount"   value={<StatValue value={`$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />} icon={DollarSign} gradient="green" delay={100} />
          <div className="card-premium animate-fade-up rounded-2xl p-5" style={{ animationDelay: '150ms' }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Current Plan</p>
                <p className="mt-1.5 text-3xl font-bold tracking-tight text-foreground">
                  {currentSubscription?.plan ?? '—'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">${currentSubscription?.price ?? 0}/mo</p>
              </div>
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ml-3"
                style={{ background: ICON_GRADIENTS.purple, boxShadow: '0 6px 20px rgba(124,58,237,0.25)' }}
              >
                <CreditCard className="h-5 w-5 text-white" strokeWidth={2} />
              </div>
            </div>
          </div>
        </div>

        {/* Plan usage */}
        <div className="card-premium animate-fade-up-delay-2 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-foreground tracking-tight">Plan Usage</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {invoiceUsed} of {invoiceLimit === -1 ? '∞' : invoiceLimit} invoices used this month
              </p>
            </div>
            {nearLimit && (
              <Link to="/dashboard/personal-subscription">
                <Button size="sm" className="text-orange-600 border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-900/20" variant="outline">
                  Upgrade
                </Button>
              </Link>
            )}
          </div>
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${usagePct}%`,
                background: nearLimit ? ICON_GRADIENTS.orange : ICON_GRADIENTS.blue,
              }}
            />
          </div>
          {nearLimit && (
            <p className="text-xs text-orange-600 mt-2 font-medium">
              {Math.round(usagePct)}% used — consider upgrading your plan.
            </p>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className={`card-premium rounded-2xl p-5 ${!isPersonalOnly && !isAccountant ? 'lg:col-span-2' : ''}`}>
            <SectionHeader title="My Invoices" action={<ViewAllLink to="/dashboard/invoices" />} />
            <div className="flex flex-col items-center justify-center py-6 text-center">
              {totalInvoices === 0 ? (
                <>
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-2xl mb-4"
                    style={{ background: ICON_GRADIENTS.blue, boxShadow: '0 8px 24px rgba(37,99,235,0.25)' }}
                  >
                    <Upload className="h-7 w-7 text-white" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">No invoices yet. Upload your first invoice.</p>
                  <Link to="/dashboard/upload">
                    <Button size="sm" style={{ background: 'var(--gradient-brand)', border: 'none' }}>
                      <Upload className="mr-2 h-3.5 w-3.5" /> Upload Invoice
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-4 w-full mb-5">
                    {[
                      { value: pending,   label: 'Processing', color: '#d97706' },
                      { value: processed, label: 'Processed',  color: '#059669' },
                      { value: failed,    label: 'Failed',     color: '#dc2626' },
                    ].map(({ value, label, color }) => (
                      <div key={label} className="rounded-xl bg-muted/50 p-3 text-center">
                        <p className="text-2xl font-bold" style={{ color }}>{value}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                  <Link to="/dashboard/invoices">
                    <Button size="sm" style={{ background: 'var(--gradient-brand)', border: 'none' }}>
                      <FileText className="mr-2 h-3.5 w-3.5" /> View All Invoices
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
          {isPersonalOnly && <JoinCompany userRole="normal" />}
          {isAccountant && <JoinCompany userRole="accountant" lockedRole />}
        </div>
      </>
    );
  };

  // ── Employee ───────────────────────────────────────────────────────────────
  const renderEmployeeDashboard = () => {
    const total       = Number(stats?.total ?? 0);
    const pending     = Number(stats?.pending ?? 0);
    const approved    = Number(stats?.approved ?? 0);
    const rejected    = Number(stats?.rejected ?? 0);
    const totalAmount = Number(stats?.total_amount ?? 0);

    return (
      <>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Uploaded"  value={<StatValue value={total} />}    icon={FileText}    gradient="blue"   delay={0}   />
          <StatCard label="Pending Review"  value={<StatValue value={pending} />}  icon={Clock}       gradient="yellow" delay={50}  />
          <StatCard label="Approved"        value={<StatValue value={approved} />} icon={CheckCircle2} gradient="green" delay={100} />
          <StatCard label="Rejected"        value={<StatValue value={rejected} />} icon={XCircle}     gradient="red"    delay={150} />
        </div>

        <div className="card-premium animate-fade-up-delay-2 rounded-2xl p-5">
          <SectionHeader title="My Recent Invoices" action={<ViewAllLink to="/dashboard/invoices" />} />
          <InvoicePreview
            invoices={recentInvoices}
            emptyMessage="No invoices yet. Upload your first invoice to get started."
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card-premium rounded-2xl p-5">
            <SectionHeader title="Quick Actions" />
            <div className="space-y-2">
              <Link to="/dashboard/upload" className="group flex items-center gap-3 rounded-xl border border-border p-3.5 transition-all duration-200 hover:border-primary/30 hover:bg-accent/30">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: ICON_GRADIENTS.blue }}>
                  <Upload className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium text-foreground">Upload New Invoice</span>
                <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link to="/dashboard/invoices" className="group flex items-center gap-3 rounded-xl border border-border p-3.5 transition-all duration-200 hover:border-primary/30 hover:bg-accent/30">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: ICON_GRADIENTS.indigo }}>
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium text-foreground">View All Invoices</span>
                <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          <div className="card-premium rounded-2xl p-5">
            <SectionHeader title="Invoice Summary" />
            <div className="space-y-3">
              {[
                { label: 'Approved', value: approved, color: '#10b981', bar: ICON_GRADIENTS.green },
                { label: 'Pending',  value: pending,  color: '#f59e0b', bar: ICON_GRADIENTS.yellow },
                { label: 'Rejected', value: rejected, color: '#ef4444', bar: ICON_GRADIENTS.red },
              ].map(({ label, value, color, bar }) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-2 w-2 rounded-full shrink-0" style={{ background: color }} />
                    <span className="text-sm text-muted-foreground">{label}</span>
                  </div>
                  <span className="font-bold text-foreground">{value}</span>
                </div>
              ))}
              <div className="my-1 h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total Amount</span>
                <span className="text-lg font-bold text-foreground">
                  ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  // ── Accountant ─────────────────────────────────────────────────────────────
  const renderAccountantDashboard = () => {
    const pendingValidation = Number(stats?.pending_validation ?? 0);
    const validatedToday    = Number(stats?.validated_today ?? 0);
    const approved          = Number(stats?.approved ?? 0);
    const rejected          = Number(stats?.rejected ?? 0);
    const approvalRate = approved + rejected > 0
      ? Math.round((approved / (approved + rejected)) * 100)
      : 0;

    return (
      <>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Pending Validation" value={<StatValue value={pendingValidation} />} icon={Clock}        gradient="orange" delay={0}   />
          <StatCard label="Validated Today"    value={<StatValue value={validatedToday} />}   icon={CheckCircle2} gradient="purple" delay={50}  />
          <StatCard label="Total Approved"     value={<StatValue value={approved} />}         icon={CheckCircle2} gradient="green"  delay={100} />
          <StatCard label="Rejected"           value={<StatValue value={rejected} />}         icon={XCircle}      gradient="red"    delay={150} />
        </div>

        <div className="card-premium animate-fade-up-delay-2 rounded-2xl p-5">
          <SectionHeader
            title="Invoices to Validate"
            action={<ViewAllLink to="/dashboard/invoices?status=pending_review" label={`${pendingValidation} pending`} />}
          />
          <p className="text-xs text-muted-foreground -mt-3 mb-4">
            {pendingValidation} invoice{pendingValidation !== 1 ? 's' : ''} awaiting your review
          </p>
          <InvoicePreview
            invoices={recentInvoices}
            emptyMessage="All caught up! No invoices pending validation."
            uploadLink={false}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card-premium rounded-2xl p-5">
            <SectionHeader title="Recent Activity" />
            <RecentActivity workspaceId={currentWorkspace.id} limit={5} />
          </div>

          <div className="card-premium rounded-2xl p-5">
            <SectionHeader title="Validation Stats" />
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
                <span className="text-sm text-muted-foreground">Total Validated</span>
                <span className="text-2xl font-bold text-foreground">{approved + rejected}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3">
                <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">Approval Rate</span>
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{approvalRate}%</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
                <span className="text-sm text-muted-foreground">Avg. Review Time</span>
                <span className="text-2xl font-bold text-foreground">—</span>
              </div>
            </div>
          </div>
        </div>

        <JoinCompany userRole="accountant" lockedRole />
      </>
    );
  };

  // ── Director ───────────────────────────────────────────────────────────────
  const renderDirectorDashboard = () => {
    const total        = Number(stats?.total ?? 0);
    const approved     = Number(stats?.approved ?? 0);
    const rejected     = Number(stats?.rejected ?? 0);
    const pending      = Number(stats?.pending ?? 0);
    const totalAmount  = Number(stats?.total_amount ?? 0);
    const approvalRate = Number(stats?.approval_rate ?? 0);
    const totalMembers = Number(stats?.total_members ?? 0);

    return (
      <>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Invoices"        value={<StatValue value={total} />}             icon={FileText}    gradient="blue"   delay={0}   />
          <StatCard label="Approved Amount"        value={<StatValue value={`$${totalAmount.toLocaleString()}`} />} icon={DollarSign} gradient="green" delay={50} />
          <StatCard label="Approval Rate"          value={<StatValue value={`${approvalRate}%`} />} icon={CheckCircle2} gradient="purple" delay={100} />
          <StatCard label="Active Members"         value={<StatValue value={totalMembers} />}     icon={Users}       gradient="orange" delay={150} />
        </div>

        {/* Enterprise overview */}
        <div className="card-premium animate-fade-up-delay-2 rounded-2xl p-5">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h3 className="font-bold text-foreground tracking-tight">Enterprise Overview</h3>
              <p className="text-xs text-muted-foreground mt-0.5">All invoices across your organization</p>
            </div>
            <div className="flex gap-2">
              <Link to="/dashboard/team">
                <Button variant="outline" size="sm" className="text-xs gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Manage Team
                </Button>
              </Link>
              <Link to="subscription">
                <Button variant="outline" size="sm" className="text-xs">Subscription</Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3 mb-5">
            {[
              { icon: FileText,    label: 'Total Invoices', value: total,    sub: 'Across all employees', gradient: ICON_GRADIENTS.blue,   bg: 'bg-blue-50 dark:bg-blue-950/30' },
              { icon: CheckCircle2, label: 'Approved',      value: approved, sub: `${total > 0 ? Math.round((approved / total) * 100) : 0}% of total`, gradient: ICON_GRADIENTS.green,  bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
              { icon: XCircle,     label: 'Rejected',       value: rejected, sub: 'Needs attention',       gradient: ICON_GRADIENTS.orange, bg: 'bg-orange-50 dark:bg-orange-950/30' },
            ].map(({ icon: Icon, label, value, sub, gradient, bg }) => (
              <div key={label} className={`flex items-center gap-3 rounded-xl p-4 ${bg}`}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: gradient }}>
                  <Icon className="h-5 w-5 text-white" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Pending Invoices</p>
            {pending > 0 ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ICON_GRADIENTS.yellow }}>
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {pending} invoice{pending !== 1 ? 's' : ''} awaiting review
                  </span>
                </div>
                <Link to="/dashboard/invoices?status=pending_review">
                  <Button size="sm" variant="outline" className="text-xs gap-1">
                    Review <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No pending invoices. All caught up!</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          {/* Status breakdown */}
          <div className="card-premium rounded-2xl p-5 lg:col-span-2">
            <SectionHeader title="Invoice Status Breakdown" action={<ViewAllLink to="/dashboard/reports" label="Reports" />} />
            {total === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            ) : (
              <div className="space-y-4">
                {[
                  { label: 'Approved', value: approved, gradient: ICON_GRADIENTS.green  },
                  { label: 'Pending',  value: pending,  gradient: ICON_GRADIENTS.yellow },
                  { label: 'Rejected', value: rejected, gradient: ICON_GRADIENTS.red    },
                ].map(({ label, value, gradient }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-muted-foreground">{label}</span>
                      <span className="text-sm font-semibold text-foreground">{value}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: total > 0 ? `${(value / total) * 100}%` : '0%',
                          background: gradient,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="card-premium rounded-2xl p-5">
            <SectionHeader title="Recent Activity" action={<ViewAllLink to="/dashboard/history" />} />
            <RecentActivity workspaceId={currentWorkspace.id} limit={4} />
          </div>

          {/* Company code */}
          <div className="card-premium rounded-2xl p-5">
            <SectionHeader title="Company Code" />
            <p className="text-xs text-muted-foreground -mt-3 mb-4">Share with new team members</p>
            <div
              className="rounded-xl p-4 text-center mb-3"
              style={{ background: 'var(--gradient-brand)' }}
            >
              <p className="text-xs font-semibold text-white/70 mb-1">Your Code</p>
              <p className="text-2xl font-extrabold tracking-[0.25em] text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
                {companyCode ?? '···'}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs"
              disabled={!companyCode}
              onClick={() => {
                if (companyCode) {
                  navigator.clipboard.writeText(companyCode);
                  toast.success('Company code copied!');
                }
              }}
            >
              Copy Code
            </Button>
          </div>
        </div>
      </>
    );
  };

  // ── Admin ──────────────────────────────────────────────────────────────────
  const renderAdminDashboard = () => {
    const totalUsers     = Number(stats?.total_users ?? 0);
    const totalCompanies = Number(stats?.total_companies ?? 0);
    const totalInvoices  = Number(stats?.total_invoices ?? 0);
    const roleCounts     = stats?.role_counts ?? {};

    return (
      <>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Users"     value={<StatValue value={totalUsers} />}     icon={Users}    gradient="blue"   delay={0}   />
          <StatCard label="Total Companies" value={<StatValue value={totalCompanies} />} icon={Building2} gradient="purple" delay={50}  />
          <StatCard label="Total Invoices"  value={<StatValue value={totalInvoices} />}  icon={FileText}  gradient="green"  delay={100} />
          <div className="card-premium animate-fade-up rounded-2xl p-5" style={{ animationDelay: '150ms' }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Platform Health</p>
                <p className="mt-1.5 text-3xl font-bold tracking-tight text-emerald-500">99.9%</p>
                <p className="text-xs text-muted-foreground mt-1">Uptime</p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ml-3" style={{ background: ICON_GRADIENTS.teal, boxShadow: '0 6px 20px rgba(13,148,136,0.25)' }}>
                <Shield className="h-5 w-5 text-white" strokeWidth={2} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Recent companies */}
          <div className="card-premium rounded-2xl p-5">
            <SectionHeader title="Recent Companies" action={<ViewAllLink to="/dashboard/companies" />} />
            {recentCompanies.length === 0 ? (
              <p className="text-sm text-muted-foreground">No companies yet.</p>
            ) : (
              <div className="space-y-2">
                {recentCompanies.map(company => (
                  <div key={company.id} className="flex items-center justify-between rounded-xl border border-border p-3 hover:border-primary/30 hover:bg-accent/20 transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
                        style={{ background: ICON_GRADIENTS.blue }}
                      >
                        {company.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{company.name}</p>
                        <p className="text-xs text-muted-foreground">{company.member_count} members</p>
                      </div>
                    </div>
                    <code className="text-xs font-bold tracking-wider text-primary">{company.code}</code>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div className="card-premium rounded-2xl p-5">
            <SectionHeader title="Recent Activity" action={<ViewAllLink to="/dashboard/history" />} />
            <RecentActivity workspaceId={currentWorkspace.id} limit={5} />
          </div>

          {/* User distribution */}
          <div className="card-premium rounded-2xl p-5 lg:col-span-2">
            <SectionHeader title="User Distribution" />
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              {[
                { label: 'Directors',   key: 'director',   gradient: ICON_GRADIENTS.orange, bg: 'bg-orange-50 dark:bg-orange-950/30' },
                { label: 'Employees',   key: 'employee',   gradient: ICON_GRADIENTS.blue,   bg: 'bg-blue-50 dark:bg-blue-950/30' },
                { label: 'Accountants', key: 'accountant', gradient: ICON_GRADIENTS.green,  bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
                { label: 'Personal',    key: 'personal',   gradient: ICON_GRADIENTS.indigo, bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
              ].map(({ label, key, gradient, bg }) => (
                <div key={key} className={`rounded-xl p-4 ${bg}`}>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg mb-2" style={{ background: gradient }}>
                    <Users className="h-4 w-4 text-white" strokeWidth={2} />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{roleCounts[key] ?? 0}</p>
                  <p className="text-xs font-medium text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  };

  // ── Page ──────────────────────────────────────────────────────────────────
  const PAGE_SUBTITLE: Record<string, string> = {
    employee:   'Upload and track your invoices',
    accountant: 'Review and validate pending invoices',
    director:   'Overview of invoice management and analytics',
    admin:      'System overview and administration',
    normal:     'Personal invoice management',
  };

  return (
    <div className="space-y-5">
      <div className="animate-fade-up">
        <h1
          className="text-2xl font-extrabold tracking-tight text-foreground"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{PAGE_SUBTITLE[userRole] ?? ''}</p>
      </div>

      {userRole === 'employee'   && renderEmployeeDashboard()}
      {userRole === 'accountant' && renderAccountantDashboard()}
      {userRole === 'director'   && renderDirectorDashboard()}
      {userRole === 'admin'      && renderAdminDashboard()}
      {userRole === 'normal'     && renderNormalUserDashboard()}
    </div>
  );
}
