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
/* import { InvoiceDetail } from './pages/InvoiceDetails'; */
import type { User, Enterprise } from './types';
import api from '../lib/api';


// ─── Auth guard + real data fetcher ───────────────────────────────────────────
// Replaces the hardcoded mockUser / mockEnterprises.
// • Reads user from localStorage (written by Login on success)
// • Fetches enterprises from GET /api/workspaces/my
// • Redirects to /login if no token or user is missing

function ProtectedLayout() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const raw = localStorage.getItem('user');

    // No session → back to login
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

    // Fetch enterprises/workspaces for this user
    // Normalizes both plain array and wrapped responses e.g. { workspaces: [] }
    api
      .get('/workspaces/my')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data
          : Array.isArray(data.workspaces) ? data.workspaces
          : Array.isArray(data.enterprises) ? data.enterprises
          : Array.isArray(data.data) ? data.data
          : [];
        setEnterprises(list);
      })
      .catch((err) => {
        // 401 is handled globally in api.ts (redirects to /login)
        // For other errors just continue with an empty list so the
        // rest of the UI still works.
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

  if (!user) return null; // navigate() already called above

  return <Layout currentUser={user} enterprises={enterprises} />;
}

// ─── Dashboard wrapper — reads role from the real user ─────────────────────────
// No longer hardcodes mockUser.role.
function DashboardWrapper() {
  const raw = localStorage.getItem('user');
  const userRole = raw ? (JSON.parse(raw) as User).role : 'normal';
  return <Dashboard userRole={userRole} />;
}

// ─── Router ────────────────────────────────────────────────────────────────────
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
    // ProtectedLayout handles auth check + data fetching,
    // then renders <Layout> which exposes <Outlet> for children.
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
        path :'users',
        element: <Users />
      }
      /*
      {
        path: 'invoices/:id',
        element: <InvoiceDetail />,
      }
        */
    ],
  },
  // Catch-all: unknown paths go to login
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);
