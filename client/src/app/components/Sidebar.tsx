import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Upload,
  FileText,
  BarChart3,
  Settings,
  Users,
  History,
  CreditCard,
  UserPlus,
} from 'lucide-react';
import type { UserRole } from '../types';

interface SidebarProps {
  userRole: UserRole;
}

export function Sidebar({ userRole }: SidebarProps) {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'employee', 'accountant', 'director', 'normal'] },
  { path: '/dashboard/upload', icon: Upload, label: 'Upload Invoice', roles: ['employee', 'admin', 'normal'] },
  { path: '/dashboard/invoices', icon: FileText, label: 'Invoices', roles: ['admin', 'employee', 'accountant', 'director', 'normal'] },
  { path: '/dashboard/reports', icon: BarChart3, label: 'Reports', roles: ['admin', 'accountant', 'director'] },
  { path: '/dashboard/team', icon: UserPlus, label: 'Team Management', roles: ['director', 'admin'] },
  { path: '/dashboard/subscription', icon: CreditCard, label: 'Subscription', roles: ['director', 'admin'] },
  { path: '/personal-subscription', icon: CreditCard, label: 'Subscription', roles: ['normal', 'admin'] },
  { path: '/dashboard/users', icon: Users, label: 'Users', roles: ['admin'] },
  { path: '/dashboard/history', icon: History, label: 'History', roles: ['admin', 'accountant', 'normal'] },
  { path: '/dashboard/settings', icon: Settings, label: 'Settings', roles: ['admin', 'employee', 'accountant', 'director', 'normal'] },
];

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-background">
      <div className="flex h-16 items-center border-b px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold text-foreground">InvoiceFlow</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                active
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-muted-foreground hover:bg-muted hover:text-slate-900'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <div className="rounded-lg bg-blue-50 p-3">
          <p className="text-xs font-medium text-blue-900">Need Help?</p>
          <p className="mt-1 text-xs text-blue-700">
            Check our documentation or contact support.
          </p>
        </div>
      </div>
    </div>
  );
}