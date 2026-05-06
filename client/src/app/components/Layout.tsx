// Layout.tsx
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
import type { User, Enterprise, Notification, Workspace } from '../types';

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
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>(initialWorkspace);
  const [currentSubscription, setCurrentSubscription] = useState(null);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications ?? []);
    } catch {
      // silently ignore — user may not be authenticated yet
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    pollingRef.current = setInterval(fetchNotifications, 30_000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchNotifications]);

  useEffect(() => {
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
          invoiceUsed: parseInt(sub.invoice_used) || 0,
          invoiceLimit: sub.max_invoices ?? 0,
          userCount: parseInt(sub.user_count) || 0,
          userLimit: sub.max_users ?? 0,
        } : null);
      } catch (err) {
        console.error('Failed to load subscription');
      }
    };

    if (currentWorkspace?.id) fetchSubscription();
  }, [currentWorkspace?.id]);

  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch { /* ignore */ }
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await api.patch('/notifications/read-all');
    } catch { /* ignore */ }
  };

  const handleLogout = () => {
    navigate('/login');
  };

  const handleSwitchWorkspace = async (workspaceId: string) => {
    await api.patch('/auth/switch-workspace', { workspaceId });

    const workspace = workspaces.find(w => w.id === workspaceId);
    if (workspace) {
      setCurrentWorkspace(workspace);
      onWorkspaceChange(workspace);
      toast.success(`Switched to ${workspace.name}`);
    }

    if (!window.location.pathname.startsWith('/dashboard')) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="flex overflow-hidden bg-muted" style={{ height: '100dvh' }}>
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
          onEnterpriseSwitch={(id) => setActiveEnterpriseId(id)}
          workspaces={workspaces}
          currentWorkspace={currentWorkspace}
          onSwitchWorkspace={handleSwitchWorkspace}
        />

        {/* Extra bottom padding on mobile so content clears the nav bar */}
        <main className="flex-1 overflow-y-auto overscroll-y-none p-4 md:p-8 pb-20 md:pb-8">
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
      <MobileNav />
      <InstallPWA />
    </div>
  );
}