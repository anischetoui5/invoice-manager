import { useState } from 'react';
import { User as UserIcon, Mail, Lock, Bell, Shield, Save, Building2 } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { JoinCompany } from '../components/JoinCompany';
import type { User, Enterprise, Workspace } from '../types';
import api from '../../lib/api';

export function Settings() {
  const { currentUser, enterprises, currentWorkspace } = useOutletContext<{
  currentUser: User;
  enterprises: Enterprise[];
  currentWorkspace: Workspace;
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

  const currentEnterprise = enterprises.find(ent => ent.id === currentWorkspace?.id);
  

  // ── Profile ────────────────────────────────────────────────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    if (!email.trim()) {
      toast.error('Email cannot be empty');
      return;
    }

    // Nothing changed — don't bother calling the API
    if (name === currentUser.name && email === currentUser.email) {
      toast.info('No changes to save');
      return;
    }

    setSavingProfile(true);
    try {
      await api.put('/users/me', { name, email });
      // Update localStorage so the rest of the UI reflects the new name/email
      const stored = localStorage.getItem('user');
      if (stored) {
        const updated = { ...JSON.parse(stored), name, email };
        localStorage.setItem('user', JSON.stringify(updated));
      }
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Password ───────────────────────────────────────────────────────────────
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error('Please enter your current password');
      return;
    }
    if (!newPassword) {
      toast.error('Please enter a new password');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (currentPassword === newPassword) {
      toast.error('New password must be different from current password');
      return;
    }

    setSavingPassword(true);
    try {
      await api.put('/users/me/password', { currentPassword, newPassword });
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  // ── Notifications ──────────────────────────────────────────────────────────
  const handleSaveNotifications = async () => {
    try {
      await api.put('/users/me/notifications', notifications);
      toast.success('Notification preferences saved');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save preferences');
    }
  };

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
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
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
          {currentUser.role == 'normal' && <JoinCompany userRole={currentUser.role} /> }
          
          {currentUser.role == 'accountant' && <JoinCompany userRole={currentUser.role} /> }
          
          {currentUser.role !== 'normal' && (
            <Card className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Company Information</h3>
                  <p className="text-sm text-muted-foreground">View your company details</p>
                </div>
              </div>

              {currentEnterprise ? (
                <div className="space-y-4">
                  <div>
                    <Label>Company Name</Label>
                    <p className="mt-1 text-sm text-foreground">
                        {currentWorkspace.companyName ?? currentWorkspace.name}
                    </p>
                  </div>
                  <div>
                    <Label>Your Role</Label>
                    <p className="mt-1 text-sm capitalize text-foreground">{currentUser.role}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You are not currently part of any company. Use the "Join a Company" section above to join one.
                </p>
              )}
            </Card>
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
                  <Input
                    id="currentPassword"
                    type="password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
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
                { key: 'pushNotifications',    label: 'Push notifications', desc: 'Browser push notifications' },
                { key: 'weeklyReport',         label: 'Weekly report', desc: 'Summary email every Monday' },
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
