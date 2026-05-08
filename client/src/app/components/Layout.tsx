import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Outlet, useNavigate } from 'react-router-dom';
import { TopBar } from './Topbar';
import { Sidebar } from './Sidebar';
import { NotificationsPanel } from './NotificationsPanel';
import { AiChat } from './AiChat';
import { MobileNav } from './MobileNav';
import { InstallPWA } from './InstallPWA';
import api from '../../lib/api';
import type { User, Enterprise, Notification, Workspace, Subscription } from '../types';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';

interface LayoutProps {
  currentUser: User;
  enterprises: Enterprise[];
  initialNotifications?: Notification[];
  workspaces: Workspace[];
  currentWorkspace: Workspace;
  onWorkspaceChange: (workspace: Workspace) => void;
}

export function Layout({
  currentUser,
  enterprises,
  initialNotifications = [],
  workspaces,
  currentWorkspace: initialWorkspace,
  onWorkspaceChange,
}: LayoutProps) {
  const navigate = useNavigate();
  const [activeEnterpriseId, setActiveEnterpriseId] = useState(currentUser.enterpriseId);
  const [notifications, setNotifications]           = useState<Notification[]>(initialNotifications);
  const [showNotifications, setShowNotifications]   = useState(false);
  const [currentWorkspace, setCurrentWorkspace]     = useState<Workspace>(initialWorkspace);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);

  const unreadCount = notifications.filter(n => !n.read).length;
  const pollingRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications ?? []);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    pollingRef.current = setInterval(fetchNotifications, 30_000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [fetchNotifications]);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    const fetchSubscription = async () => {
      try {
        const isCompany = currentWorkspace?.type === 'company';
        const { data } = await api.get('/subscriptions/my', {
          headers: isCompany ? { 'x-workspace-id': currentWorkspace.id } : {},
        });
        const sub = data.subscription;
        setCurrentSubscription(sub ? {
          ...sub,
          plan: sub.plan_name,
          price: parseFloat(sub.price),
          startDate: sub.billing_start,
          invoiceUsed:  parseInt(sub.invoice_used) || 0,
          invoiceLimit: sub.max_invoices ?? 0,
          userCount:    parseInt(sub.user_count) || 0,
          userLimit:    sub.max_users ?? 0,
        } : null);
      } catch {
        // ignore
      }
    };
    fetchSubscription();
  }, [currentWorkspace?.id]);

  const handleMarkAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try { await api.patch(`/notifications/${id}/read`); } catch { /* ignore */ }
  };

  const handleMarkAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try { await api.patch('/notifications/read-all'); } catch { /* ignore */ }
  };

  const handleLogout = () => navigate('/login');

  const handleSwitchWorkspace = async (workspaceId: string) => {
    await api.patch('/auth/switch-workspace', { workspaceId });
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (workspace) {
      setCurrentWorkspace(workspace);
      onWorkspaceChange(workspace);
      toast.success(`Switched to ${workspace.name}`);
    }
    if (!window.location.pathname.startsWith('/dashboard')) navigate('/dashboard');
  };

  return (
    <div className="flex overflow-hidden bg-background" style={{ height: '100dvh' }}>
      {/* Sidebar — hidden on mobile */}
      <div className="hidden md:flex">
        <Sidebar currentWorkspace={currentWorkspace} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          user={currentUser}
          enterprises={enterprises}
          notificationCount={unreadCount}
          onNotificationsClick={() => setShowNotifications(true)}
          onLogout={handleLogout}
          onEnterpriseSwitch={id => setActiveEnterpriseId(id)}
          workspaces={workspaces}
          currentWorkspace={currentWorkspace}
          onSwitchWorkspace={handleSwitchWorkspace}
        />

        <main className="flex-1 overflow-y-auto overscroll-y-none p-4 md:p-8 pb-20 md:pb-8">
          {/* Subscription expired banner */}
          {currentWorkspace?.type === 'company' && currentSubscription?.status === 'expired' && (
            <div className="mb-4 flex items-center gap-3 rounded-md border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-300">Subscription expired</p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                  Your workspace is in read-only mode. Renew to continue.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30 flex-shrink-0"
                onClick={() => navigate('/dashboard/settings')}
              >
                Renew
              </Button>
            </div>
          )}

          {/* Payment past due banner */}
          {currentWorkspace?.type === 'company' && currentSubscription?.status === 'past_due' && (
            <div className="mb-4 flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Payment past due</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                  Update your billing to avoid service interruption.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/30 flex-shrink-0"
                onClick={() => navigate('/dashboard/settings')}
              >
                Update Billing
              </Button>
            </div>
          )}

          <Outlet context={{
            activeEnterpriseId,
            currentUser,
            enterprises,
            currentWorkspace,
            workspaces,
            currentSubscription,
          }} />
        </main>
      </div>

      <NotificationsPanel
        notifications={notifications}
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
      />

      <AiChat workspaceId={currentWorkspace.id} />

      <div className="md:hidden">
        <MobileNav />
      </div>
      <InstallPWA />
    </div>
  );
}