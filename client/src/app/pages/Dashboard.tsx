import { Link } from 'react-router-dom';
import {
  FileText, Upload, CheckCircle2, XCircle, Clock,
  TrendingUp, DollarSign, Users, Activity, Building2, Shield, CreditCard,
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import type { UserRole } from '../types';
import { JoinCompany } from '../components/JoinCompany';

interface DashboardProps {
  userRole: UserRole;
}

export function Dashboard({ userRole }: DashboardProps) {
  const pendingInvoices: any[] = [];
  const processingInvoices: any[] = [];
  const validatedInvoices: any[] = [];
  const approvedInvoices: any[] = [];
  const rejectedInvoices: any[] = [];
  const totalAmount = 0;


   const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; label: string }> = {
      pending: { color: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
      processing: { color: 'bg-blue-100 text-blue-700', label: 'Processing' },
      validated: { color: 'bg-purple-100 text-purple-700', label: 'Validated' },
      approved: { color: 'bg-green-100 text-green-700', label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-700', label: 'Rejected' },
    };
    return config[status];
  };

  const renderNormalUserDashboard = () => {
    // Mock personal invoices for normal user
    const personalInvoices: any[] = [];
    const personalPending = personalInvoices.filter(inv => inv.status === 'pending' || inv.status === 'processing');

    return (
      <>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Personal Invoices</p>
                <p className="mt-2 text-3xl font-bold text-slate-800">{personalInvoices.length}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Pending OCR</p>
                <p className="mt-2 text-3xl font-bold text-slate-800">{personalPending.length}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Current Plan</p>
                <p className="mt-2 text-2xl font-bold text-slate-800">Basic</p>
                <p className="text-xs text-slate-500">Free</p>
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
              <h3 className="font-semibold text-slate-800">Personal Invoices</h3>
              <Link to="/dashboard/invoices" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {personalInvoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 mb-4">
                    <Upload className="h-8 w-8 text-blue-600" />
                  </div>
                  <p className="text-slate-600 mb-4">No invoices yet. Upload your first invoice.</p>
                  <Link to="/dashboard/upload">
                    <Button>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Invoice
                    </Button>
                  </Link>
                </div>
              ) : (
                personalInvoices.map((invoice) => {
                  const badge = getStatusBadge(invoice.status);
                  return (
                    <Link
                      key={invoice.id}
                      to={`/dashboard/invoices/${invoice.id}`}
                      className="flex items-center gap-3 rounded-lg border p-4 transition-all hover:border-blue-300 hover:shadow-md"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-slate-800">{invoice.vendor}</p>
                          <Badge className={`${badge.color} text-xs`}>{badge.label}</Badge>
                        </div>
                        <p className="text-sm text-slate-600">{invoice.number}</p>
                        <p className="text-sm font-medium text-slate-800 mt-1">
                          ${invoice.amount.toLocaleString()}
                        </p>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </Card>

          <div className="space-y-6">
            <JoinCompany userRole={'normal'}/>

            <Card className="p-6">
              <div className="mb-4">
                <h3 className="font-semibold text-slate-800">Quick Actions</h3>
              </div>
              <div className="space-y-3">
                <Link to="/dashboard/upload">
                  <Button className="w-full justify-start" variant="outline" size="lg">
                    <Upload className="mr-2 h-5 w-5" />
                    Upload Invoice
                  </Button>
                </Link>
                <Link to="/personal-subscription">
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

  const renderAdminDashboard = () => {
    return (
      <>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Users</p>
                <p className="mt-2 text-3xl font-bold text-slate-800">0</p>
                <p className="mt-1 flex items-center text-xs text-green-600">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  +3 this week
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Companies</p>
                <p className="mt-2 text-3xl font-bold text-slate-800">0</p>
                <p className="mt-1 flex items-center text-xs text-green-600">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  +1 this month
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <Building2 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Invoices</p>
                <p className="mt-2 text-3xl font-bold text-slate-800">0</p>
                <p className="mt-1 flex items-center text-xs text-green-600">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  +12% growth
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Platform Health</p>
                <p className="mt-2 text-3xl font-bold text-green-600">99.9%</p>
                <p className="mt-1 text-xs text-slate-500">Uptime</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800">All Companies</h3>
                <p className="text-sm text-slate-600 mt-1">Platform-wide company overview</p>
              </div>
              <Link to="/dashboard/users" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                Manage
              </Link>
            </div>
            <p className="text-sm text-slate-500">No companies yet.</p>
          </Card>

          <Card className="p-6">
            <div className="mb-6">
              <h3 className="font-semibold text-slate-800">Recent Activity</h3>
              <p className="text-sm text-slate-600 mt-1">Platform-wide activity log</p>
            </div>
            <p className="text-sm text-slate-500">No activity yet.</p>
          </Card>

          <Card className="lg:col-span-2 p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-800">User Distribution</h3>
              <p className="text-sm text-slate-600 mt-1">By role across the platform</p>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-sm font-medium text-blue-900">Directors</p>
                <p className="mt-2 text-2xl font-bold text-blue-900">0</p>
              </div>
              <div className="rounded-lg bg-green-50 p-4">
                <p className="text-sm font-medium text-green-900">Employees</p>
                <p className="mt-2 text-2xl font-bold text-green-900">0</p>
              </div>
              <div className="rounded-lg bg-purple-50 p-4">
                <p className="text-sm font-medium text-purple-900">Accountants</p>
                <p className="mt-2 text-2xl font-bold text-purple-900">0</p>
              </div>
              <div className="rounded-lg bg-orange-50 p-4">
                <p className="text-sm font-medium text-orange-900">Normal Users</p>
                <p className="mt-2 text-2xl font-bold text-orange-900">0</p>
              </div>
            </div>
          </Card>
        </div>
      </>
    );
  };

  const renderEmployeeDashboard = () => {
    const myInvoices: any[] = [];
    const myPending: any[] = [];
    const myApproved: any[] = [];
    const myRejected: any[] = [];

    return (
      <>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Uploaded</p>
                <p className="mt-2 text-3xl font-bold text-slate-800">{myInvoices.length}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Pending Review</p>
                <p className="mt-2 text-3xl font-bold text-slate-800">{myPending.length}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Approved</p>
                <p className="mt-2 text-3xl font-bold text-slate-800">{myApproved.length}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Rejected</p>
                <p className="mt-2 text-3xl font-bold text-slate-800">{myRejected.length}</p>
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
              <h3 className="font-semibold text-slate-800">My Invoices</h3>
              <p className="text-sm text-slate-600 mt-1">Track the status of all your submitted invoices</p>
            </div>
            <Link to="/dashboard/invoices" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 mb-4">
              <Upload className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-slate-600 mb-4">No invoices yet. Upload your first invoice to get started.</p>
            <Link to="/dashboard/upload">
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload Invoice
              </Button>
            </Link>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-800">Quick Actions</h3>
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
              <h3 className="font-semibold text-slate-800">Invoice Summary</h3>
              <p className="text-sm text-slate-600 mt-1">This month</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  <span className="text-sm text-slate-600">Approved</span>
                </div>
                <span className="font-medium text-slate-800">{myApproved.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                  <span className="text-sm text-slate-600">Pending</span>
                </div>
                <span className="font-medium text-slate-800">{myPending.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500"></div>
                  <span className="text-sm text-slate-600">Rejected</span>
                </div>
                <span className="font-medium text-slate-800">{myRejected.length}</span>
              </div>
              <div className="h-px bg-slate-200 my-3"></div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Total Amount</span>
                <span className="text-xl font-bold text-slate-800">$0</span>
              </div>
            </div>
          </Card>
        </div>
      </>
    );
  };

const renderAccountantDashboard = () => {
    const invoicesToValidate = [...pendingInvoices, ...processingInvoices];

    return (
      <>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Pending Validation</p>
                <p className="mt-2 text-3xl font-bold text-slate-800">{invoicesToValidate.length}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Validated Today</p>
                <p className="mt-2 text-3xl font-bold text-slate-800">{validatedInvoices.length}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <CheckCircle2 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Approved</p>
                <p className="mt-2 text-3xl font-bold text-slate-800">{approvedInvoices.length}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Rejected</p>
                <p className="mt-2 text-3xl font-bold text-slate-800">{rejectedInvoices.length}</p>
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
              <h3 className="font-semibold text-slate-800">Invoices to Validate</h3>
              <p className="text-sm text-slate-600 mt-1">0 invoices pending your review</p>
            </div>
            <Link to="/dashboard/invoices?status=pending" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-slate-600">All caught up! No invoices pending validation.</p>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-800">Recent Activity</h3>
            </div>
            <p className="text-sm text-slate-500">No activity yet.</p>
          </Card>

          <Card className="p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-800">Validation Stats</h3>
              <p className="text-sm text-slate-600 mt-1">This month</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Total Validated</span>
                <span className="text-2xl font-bold text-slate-800">0</span>
              </div>
              <div className="h-px bg-slate-200"></div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Approval Rate</span>
                <span className="text-2xl font-bold text-green-600">0%</span>
              </div>
              <div className="h-px bg-slate-200"></div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Avg. Review Time</span>
                <span className="text-2xl font-bold text-slate-800">—</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-6">
          <JoinCompany userRole={userRole} />
        </div>
      </>
    );
  };

  const renderDirectorDashboard = () => {
    return (
      <>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Invoices</p>
                <p className="mt-2 text-3xl font-bold text-slate-800">0</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Approved Amount</p>
                <p className="mt-2 text-3xl font-bold text-slate-800">${totalAmount.toLocaleString()}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Approval Rate</p>
                <p className="mt-2 text-3xl font-bold text-slate-800">0%</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <CheckCircle2 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Active Users</p>
                <p className="mt-2 text-3xl font-bold text-slate-800">0</p>
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
              <h3 className="font-semibold text-slate-800">Enterprise Overview</h3>
              <p className="text-sm text-slate-600 mt-1">All invoices across your organization</p>
            </div>
            <div className="flex gap-2">
              <Link to="/dashboard/team">
                <Button variant="outline" size="sm">
                  <Users className="mr-2 h-4 w-4" />
                  Manage Team
                </Button>
              </Link>
              <Link to="/company-subscription">
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
              <p className="text-2xl font-bold text-blue-900">0</p>
              <p className="text-xs text-blue-700 mt-1">Across all employees</p>
            </div>

            <div className="rounded-lg bg-green-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Validated</span>
              </div>
              <p className="text-2xl font-bold text-green-900">0</p>
              <p className="text-xs text-green-700 mt-1">0% of total</p>
            </div>

            <div className="rounded-lg bg-orange-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-900">Rejected</span>
              </div>
              <p className="text-2xl font-bold text-orange-900">0</p>
              <p className="text-xs text-orange-700 mt-1">Needs attention</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium text-slate-800 mb-4">Employee Submissions</h4>
            <p className="text-sm text-slate-500">No employees yet.</p>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-6 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Invoice Status Breakdown</h3>
              <Link to="/dashboard/reports" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                View Reports
              </Link>
            </div>
            <p className="text-sm text-slate-500">No data yet.</p>
          </Card>

          <Card className="p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-800">Company Code</h3>
              <p className="text-sm text-slate-600 mt-1">Share with new team members</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-4 text-center">
              <p className="text-sm font-medium text-blue-900">Your Company Code</p>
              <p className="mt-2 text-2xl font-bold text-blue-600">—</p>
              <Button size="sm" variant="outline" className="mt-4 w-full">
                Copy Code
              </Button>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Share this code with employees and accountants to join your company
            </p>
          </Card>
        </div>
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="mt-1 text-slate-600">
          {userRole === 'employee' && 'Upload and track your invoices'}
          {userRole === 'accountant' && 'Review and validate pending invoices'}
          {userRole === 'director' && 'Overview of invoice management and analytics'}
          {userRole === 'admin' && 'System overview and administration'}
          {userRole === 'normal' && 'Personal invoice management'}
        </p>
      </div>

      {userRole === 'employee' && renderEmployeeDashboard()}
      {userRole === 'accountant' && renderAccountantDashboard()}
      {userRole === 'director' && renderDirectorDashboard()}
      {userRole === 'admin' && renderAdminDashboard()}
      {userRole === 'normal' && renderNormalUserDashboard()}

      {(userRole === 'accountant' || userRole === 'normal') && (
        <div className="mt-6">
          <JoinCompany userRole={userRole} />
        </div>
      )}
    </div>
  );
}