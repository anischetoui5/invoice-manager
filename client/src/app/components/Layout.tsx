import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { TopBar } from './Topbar';
import { Sidebar } from './Sidebar';
import { NotificationsPanel } from './NotificationsPanel';
import { Toaster } from 'sonner';
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

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleLogout = () => {
    navigate('/login');
  };

const handleSwitchWorkspace = async (workspaceId: string) => {
  await api.patch('/auth/switch-workspace', { workspaceId });

  const workspace = workspaces.find(w => w.id === workspaceId);
  if (workspace) {
    setCurrentWorkspace(workspace); // ← full object, not just {id, name}
    onWorkspaceChange(workspace);
  }

  navigate('/dashboard');
};

  return (
    <div className="flex h-screen overflow-hidden bg-muted">
      <Sidebar currentWorkspace={currentWorkspace} />

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

        <main className="flex-1 overflow-y-auto p-8">
            <Outlet context={{ 
              activeEnterpriseId,
              currentUser,
              enterprises,
              currentWorkspace,
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

      <Toaster position="top-right" />
    </div>
  );
}