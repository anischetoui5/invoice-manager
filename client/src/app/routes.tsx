import { createBrowserRouter, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { Layout } from './components/Layout';
import { Subscription } from './pages/Subscription';
import { PersonalSubscription } from './pages/PersonalSubscription';
import { UploadInvoice } from './pages/UploadInvoice';
import { InvoiceList } from './pages/Invoices';
import { Users } from './pages/Users';
import type { User, Enterprise, Workspace } from './types';
import api from '../lib/api';


function ProtectedLayout() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const raw = localStorage.getItem('user');

    if (!token || !raw) {
      navigate('/login', { replace: true });
      return;
    }

    let parsed: User;
    try {
      parsed = JSON.parse(raw);
    } catch {
      navigate('/login', { replace: true });
      return;
    }

    setUser(parsed);

    api
      .get('/workspaces/my')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data
          : Array.isArray(data.workspaces) ? data.workspaces
          : Array.isArray(data.enterprises) ? data.enterprises
          : Array.isArray(data.data) ? data.data
          : [];

        setEnterprises(list);
        setWorkspaces(list);

        // Pick the active workspace, fall back to first in list
        const active = list.find((w: Workspace) => w.isActive) ?? list[0];
        if (active) {
          setCurrentWorkspace(active);
        }
      })
      .catch((err) => {
        if (err.response?.status !== 401) {
          console.error('Failed to load workspaces:', err);
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm text-slate-500">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Still waiting for workspace to resolve
  if (!currentWorkspace) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm text-slate-500">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <Layout
      currentUser={user}
      enterprises={enterprises}
      workspaces={workspaces}
      currentWorkspace={currentWorkspace}
      onWorkspaceChange={setCurrentWorkspace}
    />
  );
}


function DashboardWrapper() {
  const raw = localStorage.getItem('user');
  const userRole = raw ? (JSON.parse(raw) as User).role : 'normal';
  return <Dashboard userRole={userRole} />;
}


export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  { path: '/personal-subscription', element: <PersonalSubscription /> },
  {
    path: '/dashboard',
    element: <ProtectedLayout />,
    children: [
      {
        index: true,
        element: <DashboardWrapper />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
      {
        path: 'subscription',
        element: <Subscription />,
      },
      {
        path: 'upload',
        element: <UploadInvoice />,
      },
      {
        path: 'invoices',
        element: <InvoiceList />,
      },
      {
        path: 'users',
        element: <Users />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);