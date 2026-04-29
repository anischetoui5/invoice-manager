import { Link, useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import {
  FileText, Upload, CheckCircle2, XCircle, Clock,
  TrendingUp, DollarSign, Users, Building2, Shield, CreditCard,
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import type { UserRole, Workspace, User } from '../types';
import { JoinCompany } from '../components/JoinCompany';
import { useState, useEffect } from 'react';
import api from '../../lib/api';

interface DashboardProps {
  userRole: UserRole;
}

export function Dashboard({ userRole }: DashboardProps) {
  const { currentWorkspace, currentUser, workspaces } = useOutletContext<{
    currentWorkspace: Workspace;
    currentUser: User;
    workspaces: Workspace[];
  }>();

  const hasCompanyRole = workspaces?.some(w => 
    w.type === 'company' && ['Employee', 'Director'].includes(w.role)
  );

  const [companyCode, setCompanyCode] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
  if (!currentWorkspace?.id) return;

  setStats(null); // ← clear stale stats immediately

  api.get(`/workspaces/${currentWorkspace.id}/invoices/dashboard-stats`, {
    params: { role: currentWorkspace.role },
    headers: { 'Cache-Control': 'no-cache' },
  })
    .then(({ data }) => setStats(data.stats))
    .catch(() => {});

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

  // ── Normal/Personal ────────────────────────────────────────────────────────
  const renderNormalUserDashboard = () => {
    const totalInvoices = Number(stats?.total ?? 0);
    const pendingCount = Number(stats?.pending ?? 0);

    return (
      <>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Personal Invoices</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{totalInvoices}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending OCR</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{pendingCount}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Plan</p>
                <p className="mt-2 text-2xl font-bold text-foreground">Basic</p>
                <p className="text-xs text-muted-foreground">Free</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <CreditCard className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Personal Invoices</h3>
              <Link to="/dashboard/invoices" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                View all
              </Link>
            </div>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 mb-4">
                <Upload className="h-8 w-8 text-blue-600" />
              </div>
              {totalInvoices === 0 ? (
                <>
                  <p className="text-muted-foreground mb-4">No invoices yet. Upload your first invoice.</p>
                  <Link to="/dashboard/upload">
                    <Button>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Invoice
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground mb-4">
                    You have {totalInvoices} invoice{totalInvoices !== 1 ? 's' : ''}.
                  </p>
                  <Link to="/dashboard/invoices">
                    <Button>
                      <FileText className="mr-2 h-4 w-4" />
                      View All Invoices
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </Card>

          <div className="space-y-6">
            {!hasCompanyRole && <JoinCompany userRole="normal" />}
            <Card className="p-6">
              <div className="mb-4">
                <h3 className="font-semibold text-foreground">Quick Actions</h3>
              </div>
              <div className="space-y-3">
                <Link to="/dashboard/upload">
                  <Button className="w-full justify-start" variant="outline" size="lg">
                    <Upload className="mr-2 h-5 w-5" />
                    Upload Invoice
                  </Button>
                </Link>
                <Link to="personal-subscription">
                  <Button className="w-full justify-start" variant="outline" size="lg">
                    <CreditCard className="mr-2 h-5 w-5" />
                    Upgrade Plan
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </>
    );
  };

  // ── Employee ───────────────────────────────────────────────────────────────
  const renderEmployeeDashboard = () => {
    const total    = Number(stats?.total ?? 0);
    const pending  = Number(stats?.pending ?? 0);
    const approved = Number(stats?.approved ?? 0);
    const rejected = Number(stats?.rejected ?? 0);
    const totalAmount = Number(stats?.total_amount ?? 0);

    return (
      <>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Uploaded</p>
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
                <p className="text-sm font-medium text-muted-foreground">Pending Review</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{pending}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{approved}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{rejected}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">My Invoices</h3>
              <p className="text-sm text-muted-foreground mt-1">Track the status of all your submitted invoices</p>
            </div>
            <Link to="/dashboard/invoices" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 mb-4">
              <Upload className="h-8 w-8 text-blue-600" />
            </div>
            {total === 0 ? (
              <>
                <p className="text-muted-foreground mb-4">No invoices yet. Upload your first invoice to get started.</p>
                <Link to="/dashboard/upload">
                  <Button>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Invoice
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <p className="text-muted-foreground mb-4">You have {total} invoice{total !== 1 ? 's' : ''} submitted.</p>
                <Link to="/dashboard/invoices">
                  <Button>
                    <FileText className="mr-2 h-4 w-4" />
                    View All Invoices
                  </Button>
                </Link>
              </>
            )}
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-foreground">Quick Actions</h3>
            </div>
            <div className="space-y-3">
              <Link to="/dashboard/upload">
                <Button className="w-full justify-start" variant="outline" size="lg">
                  <Upload className="mr-2 h-5 w-5" />
                  Upload New Invoice
                </Button>
              </Link>
              <Link to="/dashboard/invoices">
                <Button className="w-full justify-start" variant="outline" size="lg">
                  <FileText className="mr-2 h-5 w-5" />
                  View All Invoices
                </Button>
              </Link>
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-foreground">Invoice Summary</h3>
              <p className="text-sm text-muted-foreground mt-1">This month</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-sm text-muted-foreground">Approved</span>
                </div>
                <span className="font-medium text-foreground">{approved}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <span className="text-sm text-muted-foreground">Pending</span>
                </div>
                <span className="font-medium text-foreground">{pending}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-sm text-muted-foreground">Rejected</span>
                </div>
                <span className="font-medium text-foreground">{rejected}</span>
              </div>
              <div className="h-px bg-slate-200 my-3" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total Amount</span>
                <span className="text-xl font-bold text-foreground">
                  ${totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </Card>
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Validation</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{pendingValidation}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Validated Today</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{validatedToday}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <CheckCircle2 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Approved</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{approved}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{rejected}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6 my-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Invoices to Validate</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {pendingValidation} invoice{pendingValidation !== 1 ? 's' : ''} pending your review
              </p>
            </div>
            <Link to="/dashboard/invoices?status=pending_review" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className={`flex h-16 w-16 items-center justify-center rounded-full mb-4 ${pendingValidation > 0 ? 'bg-orange-100' : 'bg-green-100'}`}>
              <CheckCircle2 className={`h-8 w-8 ${pendingValidation > 0 ? 'text-orange-600' : 'text-green-600'}`} />
            </div>
            {pendingValidation > 0 ? (
              <>
                <p className="text-muted-foreground mb-4">{pendingValidation} invoice{pendingValidation !== 1 ? 's' : ''} waiting for your review.</p>
                <Link to="/dashboard/invoices?status=pending_review">
                  <Button>Review Now</Button>
                </Link>
              </>
            ) : (
              <p className="text-muted-foreground">All caught up! No invoices pending validation.</p>
            )}
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-foreground">Recent Activity</h3>
            </div>
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          </Card>

          <Card className="p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-foreground">Validation Stats</h3>
              <p className="text-sm text-muted-foreground mt-1">This month</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Validated</span>
                <span className="text-2xl font-bold text-foreground">{approved + rejected}</span>
              </div>
              <div className="h-px bg-slate-200" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Approval Rate</span>
                <span className="text-2xl font-bold text-green-600">{approvalRate}%</span>
              </div>
              <div className="h-px bg-slate-200" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg. Review Time</span>
                <span className="text-2xl font-bold text-foreground">—</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-6">
          {!hasCompanyRole && <JoinCompany userRole={userRole} />}
        </div>
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
                <p className="text-sm font-medium text-muted-foreground">Total Approved Amount</p>
                <p className="mt-2 text-3xl font-bold text-foreground">${totalAmount.toLocaleString()}</p>
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
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <CheckCircle2 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{totalMembers}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Enterprise Overview</h3>
              <p className="text-sm text-muted-foreground mt-1">All invoices across your organization</p>
            </div>
            <div className="flex gap-2">
              <Link to="/dashboard/team">
                <Button variant="outline" size="sm">
                  <Users className="mr-2 h-4 w-4" />
                  Manage Team
                </Button>
              </Link>
              <Link to="subscription">
                <Button variant="outline" size="sm">
                  View Subscription
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <div className="rounded-lg bg-blue-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Total Invoices</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{total}</p>
              <p className="text-xs text-blue-700 mt-1">Across all employees</p>
            </div>

            <div className="rounded-lg bg-green-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Approved</span>
              </div>
              <p className="text-2xl font-bold text-green-900">{approved}</p>
              <p className="text-xs text-green-700 mt-1">
                {total > 0 ? Math.round((approved / total) * 100) : 0}% of total
              </p>
            </div>

            <div className="rounded-lg bg-orange-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-900">Rejected</span>
              </div>
              <p className="text-2xl font-bold text-orange-900">{rejected}</p>
              <p className="text-xs text-orange-700 mt-1">Needs attention</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium text-foreground mb-4">Pending Invoices</h4>
            {pending > 0 ? (
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm text-foreground">{pending} invoice{pending !== 1 ? 's' : ''} awaiting review</span>
                </div>
                <Link to="/dashboard/invoices?status=pending_review" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                  Review
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No pending invoices.</p>
            )}
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-6 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Invoice Status Breakdown</h3>
              <Link to="/dashboard/reports" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                View Reports
              </Link>
            </div>
            {total === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {[
                  { label: 'Approved', value: approved, color: 'bg-green-500' },
                  { label: 'Pending', value: pending, color: 'bg-yellow-500' },
                  { label: 'Rejected', value: rejected, color: 'bg-red-500' },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted-foreground">{label}</span>
                      <span className="text-sm font-medium text-foreground">{value}</span>
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
            )}
          </Card>

          <Card className="p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-foreground">Company Code</h3>
              <p className="text-sm text-muted-foreground mt-1">Share with new team members</p>
            </div>
            <div className="rounded-lg p-4 text-center" style={{ backgroundColor: "var(--info)", color: "var(--info-foreground)" }}>
              <p className="text-sm font-bold">Your Company Code</p>
              <p className="mt-2 text-2xl font-bold tracking-widest">{companyCode ?? '—'}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-4 w-full"
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
            <p className="mt-4 text-xs text-muted-foreground">
              Share this code with employees and accountants to join your company
            </p>
          </Card>
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{totalUsers}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Companies</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{totalCompanies}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <Building2 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Invoices</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{totalInvoices}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Platform Health</p>
                <p className="mt-2 text-3xl font-bold text-green-600">99.9%</p>
                <p className="mt-1 text-xs text-muted-foreground">Uptime</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Recent Companies</h3>
                <p className="text-sm text-muted-foreground mt-1">Latest registered companies</p>
              </div>
              <Link to="/dashboard/companies" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                View all
              </Link>
            </div>
            {recentCompanies.length === 0 ? (
              <p className="text-sm text-muted-foreground">No companies yet.</p>
            ) : (
              <div className="space-y-3">
                {recentCompanies.map(company => (
                  <div key={company.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
                        {company.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{company.name}</p>
                        <p className="text-xs text-muted-foreground">{company.member_count} members</p>
                      </div>
                    </div>
                    <code className="text-xs font-bold tracking-wider text-blue-600">{company.code}</code>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="mb-6">
              <h3 className="font-semibold text-foreground">Recent Activity</h3>
              <p className="text-sm text-muted-foreground mt-1">Platform-wide activity log</p>
            </div>
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          </Card>

          <Card className="lg:col-span-2 p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-foreground">User Distribution</h3>
              <p className="text-sm text-muted-foreground mt-1">By role across the platform</p>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-orange-50 p-4">
                <p className="text-sm font-medium text-orange-900">Directors</p>
                <p className="mt-2 text-2xl font-bold text-orange-900">{roleCounts.director ?? 0}</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-sm font-medium text-blue-900">Employees</p>
                <p className="mt-2 text-2xl font-bold text-blue-900">{roleCounts.employee ?? 0}</p>
              </div>
              <div className="rounded-lg bg-green-50 p-4">
                <p className="text-sm font-medium text-green-900">Accountants</p>
                <p className="mt-2 text-2xl font-bold text-green-900">{roleCounts.accountant ?? 0}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-900">Personal</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{roleCounts.personal ?? 0}</p>
              </div>
            </div>
          </Card>
        </div>
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          {userRole === 'employee'   && 'Upload and track your invoices'}
          {userRole === 'accountant' && 'Review and validate pending invoices'}
          {userRole === 'director'   && 'Overview of invoice management and analytics'}
          {userRole === 'admin'      && 'System overview and administration'}
          {userRole === 'normal'     && 'Personal invoice management'}
        </p>
      </div>

      {userRole === 'employee'   && renderEmployeeDashboard()}
      {userRole === 'accountant' && renderAccountantDashboard()}
      {userRole === 'director'   && renderDirectorDashboard()}
      {userRole === 'admin'      && renderAdminDashboard()}
      {userRole === 'normal'     && renderNormalUserDashboard()}
    </div>
  );
}