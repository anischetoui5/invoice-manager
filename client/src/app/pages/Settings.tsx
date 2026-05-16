import { useState, useEffect } from 'react';
import {
  User as UserIcon, Mail, Lock, Bell, Shield, Save,
  Building2, Pencil, Phone, Copy, CreditCard, LogOut,
  CalendarClock, AlertTriangle, CheckCircle2, Clock,
  ChevronDown, Check, RefreshCw, LayoutDashboard, Sparkles,
  PanelLeft, PanelRight, PanelTop, PanelBottom, Camera,
} from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { useWorkspaceConfig } from '../context/WorkspaceConfigContext';
import type { SidebarPosition } from '../../lib/workspaceConfig';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { JoinCompany } from '../components/JoinCompany';
import type { User, Enterprise, Workspace } from '../types';
import api from '../../lib/api';

// ── Types ──────────────────────────────────────────────────────────────────

type NotificationKey =
  | 'emailInvoiceUploaded'
  | 'emailInvoiceValidated'
  | 'emailInvoiceRejected'
  | 'pendingReviewReminder'
  | 'newJoinRequest'
  | 'weeklyReport'
  | 'pushNotifications'
  | 'ocrCompleted'
  | 'ocrFailed';

interface Subscription {
  status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired';
  trial_ends_at: string | null;
  current_period_end: string | null;
  credits: number;
  plan_name: string;
  price: number;
  max_invoices: number | null;
  max_users: number | null;
}

interface MyContract {
  contract_start: string | null;
  contract_end: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const ALL_NOTIFICATIONS: {
  key: NotificationKey; label: string; desc: string; roles: string[];
}[] = [
  { key: 'emailInvoiceUploaded',  label: 'Invoice uploaded',        desc: 'When a new invoice is submitted',                          roles: ['Personal','Employee','Accountant','Director','Admin'] },
  { key: 'ocrCompleted',          label: 'OCR completed',           desc: 'When your invoice has been scanned and data extracted',    roles: ['Personal'] },
  { key: 'ocrFailed',             label: 'OCR failed',              desc: 'When OCR processing fails on your invoice',                roles: ['Personal'] },
  { key: 'emailInvoiceValidated', label: 'Invoice approved',        desc: 'When your invoice is approved',                           roles: ['Employee','Director','Admin'] },
  { key: 'emailInvoiceRejected',  label: 'Invoice rejected',        desc: 'When your invoice is rejected',                           roles: ['Employee','Director','Admin'] },
  { key: 'pendingReviewReminder', label: 'Pending review reminder', desc: 'Daily reminder when invoices are waiting for your review', roles: ['Accountant','Director'] },
  { key: 'newJoinRequest',        label: 'New join request',        desc: 'When someone requests to join your workspace',             roles: ['Director','Admin'] },
  { key: 'weeklyReport',          label: 'Weekly report',           desc: 'Summary email every Monday',                              roles: ['Accountant','Director','Admin'] },
  { key: 'pushNotifications',     label: 'Push notifications',      desc: 'Browser push notifications for real-time updates',        roles: ['Personal','Employee','Accountant','Director','Admin'] },
];

function getNotificationOptions(role: string | undefined, isAdmin: boolean) {
  const r = isAdmin ? 'Admin' : (role ?? 'Personal');
  return ALL_NOTIFICATIONS.filter(n => n.roles.includes(r));
}

function Avatar({ name, size = 72 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.3, fontWeight: '700', color: 'white',
      boxShadow: '0 4px 20px rgba(37,99,235,0.35)',
      flexShrink: 0, border: '3px solid white',
    }}>{initials}</div>
  );
}

function passwordStrength(pw: string): 0 | 1 | 2 | 3 {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score as 0 | 1 | 2 | 3;
}
const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Strong'];
const STRENGTH_COLOR = ['', '#ef4444', '#f59e0b', '#22c55e'];

function SubscriptionBadge({ status }: { status: Subscription['status'] }) {
  const map: Record<Subscription['status'], { label: string; className: string; icon: React.ReactNode }> = {
    active:    { label: 'Active',    className: 'bg-green-100 text-green-700',    icon: <CheckCircle2 className="h-3 w-3" /> },
    trialing:  { label: 'Trialing',  className: 'bg-blue-100 text-blue-700',     icon: <Clock className="h-3 w-3" /> },
    past_due:  { label: 'Past Due',  className: 'bg-yellow-100 text-yellow-700', icon: <AlertTriangle className="h-3 w-3" /> },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700',       icon: <AlertTriangle className="h-3 w-3" /> },
    expired:   { label: 'Expired',   className: 'bg-gray-100 text-gray-600',     icon: <AlertTriangle className="h-3 w-3" /> },
  };
  const { label, className, icon } = map[status] ?? map.expired;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      {icon}{label}
    </span>
  );
}

function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`border-t px-6 py-5 ${className}`}>
      {children}
    </div>
  );
}

// ── CompanyCard ────────────────────────────────────────────────────────────

function CompanyCard({
  workspace, isActive, currentUser,
}: {
  workspace: Workspace;
  isActive: boolean;
  currentUser: User;
}) {
  const [open, setOpen] = useState(isActive);
  const [loaded, setLoaded] = useState(false);

  const [companyDetails, setCompanyDetails] = useState<{
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    code?: string;
    subscription?: Subscription;
    myContract?: MyContract;
    myRole?: string;
  } | null>(null);

  const [isEditing, setIsEditing]               = useState(false);
  const [saving, setSaving]                     = useState(false);
  const [leavePending, setLeavePending]         = useState(false);
  const [submittingLeave, setSubmittingLeave]   = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [renewalPending, setRenewalPending]     = useState(false);
  const [submittingRenewal, setSubmittingRenewal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });

  useEffect(() => {
    if (!open || loaded) return;
    setLoaded(true);
    api.get(`/company/${workspace.id}`)
      .then(({ data }) => {
        setCompanyDetails(data.company);
        setForm({
          name: data.company.name ?? '',
          email: data.company.email ?? '',
          phone: data.company.phone ?? '',
          address: data.company.address ?? '',
        });
      })
      .catch(() => {});
    api.get(`/invitations/leave-status/${workspace.id}`)
      .then(({ data }) => setLeavePending(!!data.pending))
      .catch(() => {});
    api.get(`/invitations/renew-status/${workspace.id}`)
      .then(({ data }) => setRenewalPending(!!data.pending))
      .catch(() => {});
  }, [open, loaded, workspace.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put(`/company/${workspace.id}`, form);
      setCompanyDetails(prev => ({ ...prev, ...data.company }));
      setIsEditing(false);
      toast.success('Company updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update company');
    } finally {
      setSaving(false);
    }
  };

  const confirmLeaveRequest = async () => {
    setShowLeaveConfirm(false);
    setSubmittingLeave(true);
    try {
      await api.post('/invitations/leave', { workspaceId: workspace.id });
      setLeavePending(true);
      toast.success('Leave request submitted. Waiting for director approval.');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit leave request');
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleRenewalRequest = async () => {
    setSubmittingRenewal(true);
    try {
      await api.post('/invitations/renew', { workspaceId: workspace.id });
      setRenewalPending(true);
      toast.success('Renewal request submitted. Waiting for director approval.');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit renewal request');
    } finally {
      setSubmittingRenewal(false);
    }
  };

  const role         = companyDetails?.myRole ?? workspace.role;
  const isDirector   = role === 'Director';
  const isAccountant = role === 'Accountant';
  const sub          = companyDetails?.subscription;
  const contract     = companyDetails?.myContract;

  const expiryDate = sub?.current_period_end ?? sub?.trial_ends_at;
  const expiryFormatted = expiryDate
    ? new Date(expiryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const contractEnd = contract?.contract_end ? new Date(contract.contract_end) : null;
  const now = new Date();
  const contractEndFormatted = contractEnd
    ? contractEnd.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;
  const contractExpired = contractEnd ? contractEnd < now : false;
  const daysUntilExpiry = contractEnd
    ? Math.ceil((contractEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const canRenew = daysUntilExpiry !== null && daysUntilExpiry <= 30;
  const renewableFrom = contractEnd
    ? new Date(contractEnd.getTime() - 30 * 24 * 60 * 60 * 1000)
        .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  const displayName = companyDetails?.name ?? workspace.name;
  const displayRole = role ?? workspace.role;

  const membershipActionDesc = (() => {
    if (!contractEnd) return 'Request a contract renewal or leave the company.';
    if (contractExpired) return 'Your contract has expired. Request a renewal to stay in the company.';
    if (canRenew) return `Your contract expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}. You can request a renewal.`;
    return `Renewal available from ${renewableFrom}.`;
  })();

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 flex-shrink-0">
            <Building2 className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{displayName}</span>
              {isActive && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Active</span>
              )}
            </div>
            <span className="text-xs text-muted-foreground capitalize">{displayRole}</span>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          {/* Subscription — Directors only */}
          {isDirector && sub && (
            <Section>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 flex-shrink-0">
                  <CreditCard className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Subscription</p>
                  <p className="text-xs text-muted-foreground">Your current plan and billing</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Plan</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{sub.plan_name}</p>
                  <p className="text-xs text-muted-foreground">${sub.price}/mo</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</p>
                  <div className="mt-1"><SubscriptionBadge status={sub.status} /></div>
                </div>
                {expiryFormatted && (
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {sub.status === 'trialing' ? 'Trial ends' : 'Renews'}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <CalendarClock className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">{expiryFormatted}</p>
                    </div>
                  </div>
                )}
                {Number(sub.credits) > 0 && (
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Credits</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">${Number(sub.credits).toFixed(2)}</p>
                  </div>
                )}
                {(sub.max_invoices || sub.max_users) && (
                  <div className="rounded-lg bg-muted/40 p-3 sm:col-span-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Plan Limits</p>
                    <div className="flex gap-6">
                      {sub.max_invoices && <div><p className="text-sm font-semibold text-foreground">{sub.max_invoices.toLocaleString()}</p><p className="text-xs text-muted-foreground">Max invoices/mo</p></div>}
                      {sub.max_users    && <div><p className="text-sm font-semibold text-foreground">{sub.max_users}</p><p className="text-xs text-muted-foreground">Max users</p></div>}
                    </div>
                  </div>
                )}
              </div>
              {(sub.status === 'past_due' || sub.status === 'expired') && (
                <div className="mt-3 flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 p-3">
                  <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Action required</p>
                    <p className="text-xs text-red-600 mt-0.5">
                      Your subscription is {sub.status === 'past_due' ? 'past due' : 'expired'}.
                      Please update your billing to avoid service interruption.
                    </p>
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* Contract + actions — Accountants only */}
          {isAccountant && (
            <Section>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 flex-shrink-0">
                  <CalendarClock className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Your Contract</p>
                  <p className="text-xs text-muted-foreground">Contract dates and membership</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {contract?.contract_start && (
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Start Date</p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {new Date(contract.contract_start).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                )}
                <div className={`rounded-lg p-3 ${contractExpired ? 'bg-red-50 border border-red-200' : 'bg-muted/40'}`}>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">End Date</p>
                  {contractEndFormatted ? (
                    <div className="mt-1 flex items-center gap-1.5">
                      {contractExpired && <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                      <p className={`text-sm font-medium ${contractExpired ? 'text-red-700' : 'text-foreground'}`}>{contractEndFormatted}</p>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">Not specified</p>
                  )}
                  {contractExpired && <p className="text-xs text-red-500 mt-0.5">Contract has expired</p>}
                </div>
              </div>
              {contractExpired && (
                <div className="mt-3 flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 p-3">
                  <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Contract expired</p>
                    <p className="text-xs text-red-600 mt-0.5">
                      Your contract expired on {contractEndFormatted}. You will be automatically removed unless your director renews it.
                    </p>
                  </div>
                </div>
              )}
              <div className="mt-4 pt-4 border-t">
                {leavePending ? (
                  <div className="flex items-center gap-3 rounded-lg bg-yellow-50 border border-yellow-200 p-3">
                    <Clock className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Leave request pending</p>
                      <p className="text-xs text-yellow-600 mt-0.5">Awaiting director approval.</p>
                    </div>
                  </div>
                ) : showLeaveConfirm ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="text-sm font-medium text-red-800">Are you sure?</p>
                    <p className="text-xs text-red-600 mt-1">Your request will be sent to the director. You will only be removed once they approve.</p>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" style={{ backgroundColor: 'var(--destructive)', color: 'var(--destructive-foreground)' }} onClick={confirmLeaveRequest} disabled={submittingLeave}>
                        {submittingLeave ? 'Submitting…' : 'Yes, send request'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowLeaveConfirm(false)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">Membership Actions</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{membershipActionDesc}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {renewalPending ? (
                        <div className="flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5">
                          <Clock className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                          <p className="text-xs font-medium text-blue-700">Renewal pending</p>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm"
                          className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={handleRenewalRequest}
                          disabled={!canRenew || submittingRenewal}
                          title={!canRenew ? `Renewal available from ${renewableFrom}` : undefined}
                        >
                          <RefreshCw className="h-4 w-4" />
                          {submittingRenewal ? 'Submitting…' : 'Renew'}
                        </Button>
                      )}
                      <Button variant="outline" size="sm"
                        className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                        onClick={() => setShowLeaveConfirm(true)}
                        disabled={submittingLeave}
                      >
                        <LogOut className="h-4 w-4" />
                        Leave
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Company details / edit */}
          <Section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 flex-shrink-0">
                  <Building2 className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Company Details</p>
                  <p className="text-xs text-muted-foreground">{isEditing ? 'Update company information' : 'Company information'}</p>
                </div>
              </div>
              {isDirector && !isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-1.5">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
              )}
            </div>
            {isEditing ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Company Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input type="email" className="pl-10" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input type="tel" className="pl-10" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Textarea rows={3} value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
                </div>
                <div className="flex gap-3">
                  <Button type="submit" className="flex-1" disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? 'Saving…' : 'Save Changes'}</Button>
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>Cancel</Button>
                </div>
              </form>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Company Name</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{companyDetails?.name ?? '—'}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your Role</p>
                  <p className="mt-1 text-sm font-medium text-foreground capitalize">{displayRole}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Company Email</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{companyDetails?.email ?? '—'}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{companyDetails?.phone ?? '—'}</p>
                </div>
                {companyDetails?.address && (
                  <div className="rounded-lg bg-muted/40 p-3 sm:col-span-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Address</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{companyDetails.address}</p>
                  </div>
                )}
                {isDirector && companyDetails?.code && (
                  <div className="rounded-lg bg-muted/40 p-3 sm:col-span-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Company Code</p>
                    <div className="mt-1 flex items-center gap-3">
                      <code className="text-lg font-bold tracking-widest text-blue-600">{companyDetails.code}</code>
                      <button onClick={() => { navigator.clipboard.writeText(companyDetails?.code ?? ''); toast.success('Company code copied!'); }}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground underline">
                        <Copy className="h-3 w-3" /> Copy
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Share this code with your team to invite them</p>
                  </div>
                )}
              </div>
            )}
          </Section>
        </>
      )}
    </Card>
  );
}

// ── Settings page ──────────────────────────────────────────────────────────

export function Settings() {
  const { currentUser, enterprises, currentWorkspace, workspaces } = useOutletContext<{
    currentUser: User;
    enterprises: Enterprise[];
    currentWorkspace: Workspace;
    workspaces: Workspace[];
  }>();

  const [name, setName]                       = useState(currentUser.name);
  const [email, setEmail]                     = useState(currentUser.email);
  const [avatarUrl, setAvatarUrl]             = useState<string | null>((currentUser as any).avatar_url ?? null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile]     = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword]   = useState(false);

  const [notifications, setNotifications] = useState<Record<NotificationKey, boolean>>({
    emailInvoiceUploaded:  true,
    emailInvoiceValidated: true,
    emailInvoiceRejected:  true,
    pendingReviewReminder: true,
    newJoinRequest:        true,
    weeklyReport:          false,
    pushNotifications:     true,
    ocrCompleted:          true,
    ocrFailed:             true,
  });

  const { config, setMode, setSidebarPosition, resetLayout } = useWorkspaceConfig();

  const isAdmin        = currentUser?.role?.toLowerCase() === 'admin';
  const hasCompanyRole = workspaces?.some(w =>
    w.type === 'company' && ['Employee', 'Director', 'Accountant'].includes(w.role)
  );
  const isAccountant   = workspaces?.some(w => w.role === 'Accountant');
  const isPersonalOnly = !isAdmin && !hasCompanyRole && !isAccountant && currentWorkspace?.type === 'personal';

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim())  { toast.error('Name cannot be empty');  return; }
    if (!email.trim()) { toast.error('Email cannot be empty'); return; }
    if (name === currentUser.name && email === currentUser.email) { toast.info('No changes to save'); return; }
    setSavingProfile(true);
    try {
      await api.put('/users/me', { name, email });
      const stored = localStorage.getItem('user');
      if (stored) localStorage.setItem('user', JSON.stringify({ ...JSON.parse(stored), name, email }));
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return; }
    const formData = new FormData();
    formData.append('avatar', file);
    setUploadingAvatar(true);
    try {
      const { data } = await api.post('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = data.user.avatar_url;
      setAvatarUrl(url);
      const stored = localStorage.getItem('user');
      if (stored) localStorage.setItem('user', JSON.stringify({ ...JSON.parse(stored), avatar_url: url }));
      toast.success('Profile picture updated');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword)                { toast.error('Please enter your current password'); return; }
    if (!newPassword)                    { toast.error('Please enter a new password'); return; }
    if (newPassword.length < 8)          { toast.error('New password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('New passwords do not match'); return; }
    if (currentPassword === newPassword) { toast.error('New password must be different from current password'); return; }
    setSavingPassword(true);
    try {
      await api.put('/users/me/password', { currentPassword, newPassword });
      toast.success('Password updated successfully');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      await api.put('/users/me/notifications', notifications);
      toast.success('Notification preferences saved');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save preferences');
    }
  };

  const companyWorkspaces = workspaces?.filter(w => w.type === 'company') ?? [];

  // Determine which tabs to show. We always render ALL TabsContent nodes so
  // Radix never remounts them (remounting causes width recalculation = twitch).
  // We just hide the trigger for tabs the user shouldn't see.
  const showCompanyTab = !isAdmin;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className={`bg-background grid w-full ${showCompanyTab ? 'grid-cols-5' : 'grid-cols-4'}`}>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {showCompanyTab && <TabsTrigger value="company">Company</TabsTrigger>}
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
        </TabsList>

        {/* ── Profile ── */}
        <TabsContent value="profile">
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <div style={{ background: 'linear-gradient(135deg,#1e40af,#3b82f6)', height: 72 }} />
              <div className="px-6 pb-6">
                <div className="flex items-end gap-4 -mt-9 mb-5">
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    {avatarUrl ? (
                      <img
                        src={avatarUrl.startsWith('http') ? avatarUrl : `http://${window.location.hostname}:3000${avatarUrl}`}
                        alt={name}
                        style={{
                          width: 72, height: 72, borderRadius: '50%',
                          objectFit: 'cover', border: '3px solid white',
                          boxShadow: '0 4px 20px rgba(37,99,235,0.35)',
                        }}
                      />
                    ) : (
                      <Avatar name={name} size={72} />
                    )}
                    <label
                      htmlFor="avatar-upload"
                      title="Change profile picture"
                      style={{
                        position: 'absolute', bottom: 0, right: 0,
                        width: 24, height: 24, borderRadius: '50%',
                        background: uploadingAvatar ? '#94a3b8' : 'linear-gradient(135deg,#1e40af,#3b82f6)',
                        border: '2px solid white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: uploadingAvatar ? 'not-allowed' : 'pointer',
                        transition: 'background 0.2s',
                      }}
                    >
                      <Camera size={12} color="white" />
                    </label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleAvatarChange}
                      disabled={uploadingAvatar}
                    />
                  </div>
                  <div className="pb-1">
                    <h2 className="text-lg font-semibold text-foreground">{name}</h2>
                    <p className="text-sm capitalize text-muted-foreground">{currentUser?.role ?? ''}</p>
                    {uploadingAvatar && <p className="text-xs text-blue-500 mt-0.5">Uploading…</p>}
                  </div>
                </div>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input id="name" value={name} onChange={e => setName(e.target.value)} className="pl-10" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input id="role" value={currentUser?.role ?? ''} disabled className="capitalize" />
                    <p className="text-xs text-muted-foreground">Contact your administrator to change your role</p>
                  </div>
                  <Button type="submit" className="w-full" style={{ background: 'linear-gradient(135deg,#1e40af,#3b82f6)', color: 'white' }} disabled={savingProfile}>
                    <Save className="mr-2 h-4 w-4" />{savingProfile ? 'Saving…' : 'Save Changes'}
                  </Button>
                </form>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ── Company — always mounted, shown only for non-admins ── */}
        <TabsContent value="company">
          <div className="space-y-4">
            {showCompanyTab ? (
              <>
                {isPersonalOnly && <JoinCompany userRole={currentUser.role} />}
                {isAccountant   && <JoinCompany userRole="accountant" lockedRole />}
                {companyWorkspaces.length === 0 ? (
                  <Card className="p-6">
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 mb-3">
                        <Building2 className="h-7 w-7 text-blue-600" />
                      </div>
                      <p className="font-medium text-foreground">No company yet</p>
                      <p className="text-sm text-muted-foreground mt-1">You are not currently part of any company.</p>
                    </div>
                  </Card>
                ) : (
                  companyWorkspaces.map(workspace => (
                    <CompanyCard
                      key={workspace.id}
                      workspace={workspace}
                      isActive={workspace.id === currentWorkspace?.id}
                      currentUser={currentUser}
                    />
                  ))
                )}
              </>
            ) : null}
          </div>
        </TabsContent>

        {/* ── Security ── */}
        <TabsContent value="security">
          <div className="space-y-6">
            <Card className="p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                  <Shield className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Password & Security</h3>
                  <p className="text-sm text-muted-foreground">Update your password</p>
                </div>
              </div>
              <form onSubmit={handleSavePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input id="currentPassword" type="password" placeholder="Enter current password"
                      value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input id="newPassword" type="password" placeholder="At least 8 characters"
                      value={newPassword} onChange={e => setNewPassword(e.target.value)} className="pl-10" required />
                  </div>
                  {newPassword && (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {[1,2,3].map(i => (
                          <div key={i} className="h-1.5 flex-1 rounded-full transition-all duration-300"
                            style={{ background: passwordStrength(newPassword) >= i ? STRENGTH_COLOR[passwordStrength(newPassword)] : '#e2e8f0' }} />
                        ))}
                      </div>
                      <p className="text-xs font-medium" style={{ color: STRENGTH_COLOR[passwordStrength(newPassword)] }}>
                        {STRENGTH_LABEL[passwordStrength(newPassword)]}
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input id="confirmPassword" type="password" placeholder="Repeat new password"
                      value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="pl-10" required />
                  </div>
                  {confirmPassword && newPassword && (
                    <p className={`text-xs font-medium flex items-center gap-1 ${confirmPassword === newPassword ? 'text-green-600' : 'text-red-500'}`}>
                      {confirmPassword === newPassword ? <><Check className="h-3 w-3" /> Passwords match</> : '✗ Passwords do not match'}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full" style={{ background: 'linear-gradient(135deg,#ea580c,#f97316)', color: 'white' }} disabled={savingPassword}>
                  <Lock className="mr-2 h-4 w-4" />{savingPassword ? 'Updating…' : 'Update Password'}
                </Button>
              </form>
            </Card>
          </div>
        </TabsContent>

        {/* ── Notifications ── */}
        <TabsContent value="notifications">
          <div className="space-y-6">
            <Card className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Bell className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Notification Preferences</h3>
                  <p className="text-sm text-muted-foreground">Choose what you want to be notified about</p>
                </div>
              </div>
              <div className="space-y-3">
                {getNotificationOptions(currentWorkspace?.role, isAdmin).map(({ key, label, desc }) => (
                  <div key={key}
                    onClick={() => setNotifications(prev => ({ ...prev, [key]: !prev[key] }))}
                    className="flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-all hover:border-purple-200 hover:bg-purple-50/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full flex-shrink-0 ${notifications[key] ? 'bg-purple-500' : 'bg-gray-300'}`} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications[key]}
                      onCheckedChange={val => setNotifications(prev => ({ ...prev, [key]: val }))}
                      onClick={e => e.stopPropagation()}
                    />
                  </div>
                ))}
                <Button onClick={handleSaveNotifications} className="w-full mt-1" style={{ background: 'linear-gradient(135deg,#7c3aed,#8b5cf6)', color: 'white' }}>
                  <Save className="mr-2 h-4 w-4" />Save Preferences
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ── Workspace ── */}
        <TabsContent value="workspace">
          <div className="space-y-6">

            {/* Mode selector */}
            <Card className="p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                  <LayoutDashboard className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Workspace Mode</h3>
                  <p className="text-sm text-muted-foreground">Choose how you want to use EasyFact</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Basic card */}
                <button
                  type="button"
                  onClick={() => { setMode('basic'); toast.success('Switched to Basic mode'); }}
                  className="text-left rounded-xl border-2 p-5 transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    borderColor: config.mode === 'basic' ? '#6366f1' : 'var(--border)',
                    background:  config.mode === 'basic' ? 'rgba(99,102,241,0.06)' : 'var(--card)',
                    boxShadow:   config.mode === 'basic' ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                      <LayoutDashboard className="h-4 w-4 text-slate-600" />
                    </div>
                    {config.mode === 'basic' && (
                      <span className="flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                        <Check className="h-3 w-3" /> Active
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-foreground text-sm mb-1">Basic Mode</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">Clean, focused layout. Jump straight into managing your invoices.</p>
                </button>

                {/* Custom card */}
                <button
                  type="button"
                  onClick={() => { setMode('custom'); toast.success('Switched to Custom mode'); }}
                  className="text-left rounded-xl border-2 p-5 transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    borderColor: config.mode === 'custom' ? '#6366f1' : 'var(--border)',
                    background:  config.mode === 'custom'
                      ? 'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(139,92,246,0.08))'
                      : 'var(--card)',
                    boxShadow: config.mode === 'custom' ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg"
                      style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    {config.mode === 'custom' ? (
                      <span className="flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                        <Check className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white"
                        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>NEW</span>
                    )}
                  </div>
                  <p className="font-semibold text-foreground text-sm mb-1">Custom Mode</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">Fully personalised — reorder sidebar, move the AI bubble, rearrange dashboard sections.</p>
                </button>
              </div>
            </Card>

            {/* Sidebar position — only in custom mode */}
            {config.mode === 'custom' && (
              <Card className="p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                    <PanelLeft className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Sidebar Position</h3>
                    <p className="text-sm text-muted-foreground">Where the navigation sits on screen</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {([
                    { pos: 'left',   label: 'Left',   Icon: PanelLeft   },
                    { pos: 'right',  label: 'Right',  Icon: PanelRight  },
                    { pos: 'top',    label: 'Top',    Icon: PanelTop    },
                    { pos: 'bottom', label: 'Bottom', Icon: PanelBottom },
                  ] as { pos: SidebarPosition; label: string; Icon: React.ElementType }[]).map(({ pos, label, Icon }) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => { setSidebarPosition(pos); toast.success(`Sidebar moved to ${label.toLowerCase()}`); }}
                      className="flex flex-col items-center gap-2 rounded-xl border-2 py-4 px-3 transition-all duration-150 hover:-translate-y-0.5"
                      style={{
                        borderColor: config.sidebarPosition === pos ? '#8b5cf6' : 'var(--border)',
                        background:  config.sidebarPosition === pos ? 'rgba(139,92,246,0.08)' : 'var(--card)',
                      }}
                    >
                      <Icon className="h-5 w-5" style={{ color: config.sidebarPosition === pos ? '#8b5cf6' : 'var(--muted-foreground)' }} />
                      <span className="text-xs font-medium" style={{ color: config.sidebarPosition === pos ? '#8b5cf6' : 'var(--foreground)' }}>{label}</span>
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {/* Reset layout — only in custom mode */}
            {config.mode === 'custom' && (
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                      <RefreshCw className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Reset Layout</h3>
                      <p className="text-sm text-muted-foreground">Restore all positions and orders to defaults</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                    onClick={() => { resetLayout(); toast.success('Layout reset to defaults'); }}
                  >
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reset
                  </Button>
                </div>
              </Card>
            )}

          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}