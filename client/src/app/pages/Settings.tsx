import { useState } from 'react';
import { User as UserIcon, Mail, Lock, Bell, Shield, Save, Building2 } from 'lucide-react';
import { useOutletContext } from 'react-router-dom'; // Added this
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { JoinCompany } from '../components/JoinCompany';
import type { User, Enterprise } from '../types'; // Adjust path as needed

export function Settings() {
  // 1. Grab the real data from the Layout context
  const { currentUser, enterprises } = useOutletContext<{ 
    currentUser: User; 
    enterprises: Enterprise[] 
  }>();

  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  
  const [notifications, setNotifications] = useState({
    emailInvoiceUploaded: true,
    emailInvoiceValidated: true,
    emailInvoiceRejected: true,
    pushNotifications: true,
    weeklyReport: false,
  });

  // Find the current enterprise object to show real details
  const currentEnterprise = enterprises.find(ent => ent.id === currentUser.enterpriseId);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Profile updated successfully');
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Password updated successfully');
  };

  const handleSaveNotifications = () => {
    toast.success('Notification preferences saved');
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="mt-1 text-slate-600">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card className="p-6">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white">
                {currentUser.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">{currentUser.name}</h2>
                <p className="text-sm capitalize text-slate-600">{currentUser.role}</p>
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
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  value={currentUser.role}
                  disabled
                  className="capitalize"
                />
                <p className="text-xs text-slate-500">
                  Contact your administrator to change your role
                </p>
              </div>

              <Button type="submit" className="w-full">
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="space-y-6">
          {/* 2. JoinCompany updated with current user role prop */}
          <JoinCompany userRole={currentUser.role} />
          
          {currentUser.role !== 'normal' && (
            <Card className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Company Information</h3>
                  <p className="text-sm text-slate-600">View your company details</p>
                </div>
              </div>
              
              {currentEnterprise ? (
                <div className="space-y-4">
                  <div>
                    <Label>Company Name</Label>
                    <p className="mt-1 text-sm text-slate-800">{currentEnterprise.name}</p>
                  </div>
                  <div>
                    <Label>Your Role</Label>
                    <p className="mt-1 text-sm capitalize text-slate-800">{currentUser.role}</p>
                  </div>
                  <div>
                    <Label>Member Since</Label>
                    <p className="mt-1 text-sm text-slate-800">January 15, 2024</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-600">
                  You are not currently part of any company. Use the "Join a Company" section above to join one.
                </p>
              )}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="security" className="space-y-6">

            <Card className="p-6">
                <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                    <Shield className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-800">Password & Security</h3>
                    <p className="text-sm text-slate-600">Update your password</p>
                </div>
                </div>
                <form onSubmit={handleSavePassword} className="space-y-4">
                    <Input type="password" placeholder="Current Password" />
                    <Input type="password" placeholder="New Password" />
                    <Button type="submit" className="w-full">Update Password</Button>
                </form>
            </Card>  
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
            <Card className="p-6">
                <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label>Email Notifications</Label>
                    <Switch 
                    checked={notifications.emailInvoiceUploaded} 
                    onCheckedChange={(val) => setNotifications({...notifications, emailInvoiceUploaded: val})} 
                    />
                </div>
                <Button onClick={handleSaveNotifications} className="w-full">Save Preferences</Button>
                </div>
             </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}