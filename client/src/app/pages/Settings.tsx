import { useState, useEffect } from 'react';
import { User as UserIcon, Mail, Lock, Bell, Shield, Save, Building2, Pencil, Phone, Copy } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
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


// ── CompanyCard ────────────────────────────────────────────────────────────────
function CompanyCard({ workspace, isActive, currentUser }: {
  workspace: Workspace;
  isActive: boolean;
  currentUser: User;
}) {
  const [companyDetails, setCompanyDetails] = useState<{
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    code?: string;
  } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });

  useEffect(() => {
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
  }, [workspace.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put(`/company/${workspace.id}`, form);
      setCompanyDetails(data.company);
      setIsEditing(false);
      toast.success('Company updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update company');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-blue-600 text-2xl font-bold text-white">
              {companyDetails?.name?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">
                  {companyDetails?.name ?? workspace.name}
                </h2>
                {isActive && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    Active
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{companyDetails?.email}</p>
              <div className="mt-1">
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 capitalize">
                  {workspace.role}
                </span>
              </div>
            </div>
          </div>

          {workspace.role === 'Director' && !isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-2">
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </Card>

      {/* Details / Edit */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Company Details</h3>
            <p className="text-sm text-muted-foreground">
              {isEditing ? 'Update company information' : 'Company information'}
            </p>
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Company Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="email"
                  className="pl-10"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="tel"
                  className="pl-10"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea
                rows={3}
                value={form.address}
                onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" className="flex-1" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Company Name</p>
              <p className="mt-1 text-sm font-medium text-foreground">{companyDetails?.name ?? '—'}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your Role</p>
              <p className="mt-1 text-sm font-medium text-foreground capitalize">{workspace.role}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Company Email</p>
              <p className="mt-1 text-sm font-medium text-foreground">{companyDetails?.email ?? '—'}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone</p>
              <p className="mt-1 text-sm font-medium text-foreground">{companyDetails?.phone ?? '—'}</p>
            </div>
            {companyDetails?.address && (
              <div className="rounded-lg border p-4 sm:col-span-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Address</p>
                <p className="mt-1 text-sm font-medium text-foreground">{companyDetails.address}</p>
              </div>
            )}
            <div className="rounded-lg border p-4 sm:col-span-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Company Code</p>
              <div className="mt-1 flex items-center gap-3">
                <code className="text-lg font-bold tracking-widest text-blue-600">{companyDetails?.code}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(companyDetails?.code ?? '');
                    toast.success('Company code copied!');
                  }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground underline"
                >
                  <Copy className="h-3 w-3" /> Copy
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Share this code with your team to invite them</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}


// ── Settings ───────────────────────────────────────────────────────────────────
export function Settings() {
  const { currentUser, enterprises, currentWorkspace, workspaces } = useOutletContext<{
    currentUser: User;
    enterprises: Enterprise[];
    currentWorkspace: Workspace;
    workspaces: Workspace[];
  }>();

  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [notifications, setNotifications] = useState({
    emailInvoiceUploaded: true,
    emailInvoiceValidated: true,
    emailInvoiceRejected: true,
    pushNotifications: true,
    weeklyReport: false,
  });

  // ── Profile ──────────────────────────────────────────────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Name cannot be empty'); return; }
    if (!email.trim()) { toast.error('Email cannot be empty'); return; }
    if (name === currentUser.name && email === currentUser.email) {
      toast.info('No changes to save'); return;
    }
    setSavingProfile(true);
    try {
      await api.put('/users/me', { name, email });
      const stored = localStorage.getItem('user');
      if (stored) {
        localStorage.setItem('user', JSON.stringify({ ...JSON.parse(stored), name, email }));
      }
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Password ─────────────────────────────────────────────────────────────
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) { toast.error('Please enter your current password'); return; }
    if (!newPassword) { toast.error('Please enter a new password'); return; }
    if (newPassword.length < 8) { toast.error('New password must be at least 8 characters'); return; }
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

  // ── Notifications ─────────────────────────────────────────────────────────
  const handleSaveNotifications = async () => {
    try {
      await api.put('/users/me/notifications', notifications);
      toast.success('Notification preferences saved');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save preferences');
    }
  };

  const companyWorkspaces = workspaces?.filter(w => w.type === 'company') ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-background grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* ── Profile tab ── */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="p-6">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white">
                {name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{name}</h2>
                <p className="text-sm capitalize text-muted-foreground">{currentUser.role}</p>
              </div>
            </div>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="pl-10" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input id="role" value={currentUser.role} disabled className="capitalize" />
                <p className="text-xs text-muted-foreground">Contact your administrator to change your role</p>
              </div>
              <Button type="submit" className="w-full" disabled={savingProfile}>
                <Save className="mr-2 h-4 w-4" />
                {savingProfile ? 'Saving…' : 'Save Changes'}
              </Button>
            </form>
          </Card>
        </TabsContent>

        {/* ── Company tab ── */}
        <TabsContent value="company" className="space-y-6">
          {(currentUser.role === 'normal' || currentUser.role === 'accountant') && (
            <JoinCompany userRole={currentUser.role} />
          )}

          {companyWorkspaces.length === 0 ? (
            <Card className="p-6">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 mb-3">
                  <Building2 className="h-7 w-7 text-blue-600" />
                </div>
                <p className="font-medium text-foreground">No company yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You are not currently part of any company.
                </p>
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
        </TabsContent>

        {/* ── Security tab ── */}
        <TabsContent value="security" className="space-y-6">
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
                  <Input id="currentPassword" type="password" placeholder="Enter current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="pl-10" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input id="newPassword" type="password" placeholder="At least 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="pl-10" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input id="confirmPassword" type="password" placeholder="Repeat new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10" required />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={savingPassword}>
                <Lock className="mr-2 h-4 w-4" />
                {savingPassword ? 'Updating…' : 'Update Password'}
              </Button>
            </form>
          </Card>
        </TabsContent>

        {/* ── Notifications tab ── */}
        <TabsContent value="notifications" className="space-y-6">
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
            <div className="space-y-4">
              {[
                { key: 'emailInvoiceUploaded', label: 'Invoice uploaded', desc: 'When a new invoice is submitted' },
                { key: 'emailInvoiceValidated', label: 'Invoice validated', desc: 'When an invoice passes validation' },
                { key: 'emailInvoiceRejected', label: 'Invoice rejected', desc: 'When an invoice is rejected' },
                { key: 'pushNotifications', label: 'Push notifications', desc: 'Browser push notifications' },
                { key: 'weeklyReport', label: 'Weekly report', desc: 'Summary email every Monday' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <Switch
                    checked={notifications[key as keyof typeof notifications]}
                    onCheckedChange={(val) => setNotifications({ ...notifications, [key]: val })}
                  />
                </div>
              ))}
              <Button onClick={handleSaveNotifications} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                Save Preferences
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}