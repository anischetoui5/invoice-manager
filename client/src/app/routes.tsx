import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { Layout } from './components/Layout';
import type { User , Enterprise } from './types';


const mockEnterprises: Enterprise[] = [
  {
    id: 'ent-1',
    name: 'Acme Corporation',
    directorId: 'dir-1',
    createdDate: '2026-01-15T10:00:00Z',
    employeeIds: ['emp-1', 'emp-2'],
    accountantIds: ['1'], // Pointing to John Doe's ID
    subscriptionId: 'sub-premium',
    companyCode: 'ACME2026',
  },
  {
    id: 'ent-2',
    name: 'TechStart Inc.',
    directorId: 'dir-2',
    createdDate: '2026-02-01T08:30:00Z',
    employeeIds: ['emp-3'],
    accountantIds: ['1', 'accountant-2'], // John Doe works here too!
    subscriptionId: 'sub-basic',
    companyCode: 'TECH26',
  },
];

const mockUser: User = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'director',
  enterpriseId: 'ent-1',
  enterpriseIds: ['ent-1', 'ent-2'],
};



function DashboardWrapper() {
  return <Dashboard userRole={mockUser.role} />;
}


export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/dashboard',
    element: <Layout currentUser={mockUser} enterprises={mockEnterprises} />,
    children: [
      {
        index: true,
        element: <DashboardWrapper />,
      },
      {
        path: 'settings',
        element: <Settings />,
      }
    ],
  },
]);

