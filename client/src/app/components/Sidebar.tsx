import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Upload, FileText, BarChart3,
  Settings, Users, History, CreditCard, UserPlus,
  Building2, Zap,
} from 'lucide-react';
import type { Workspace } from '../types';

interface SidebarProps {
  currentWorkspace: Workspace;
}

export function Sidebar({ currentWorkspace }: SidebarProps) {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const roleMap: Record<string, string> = {
    'Director':   'director',
    'Employee':   'employee',
    'Accountant': 'accountant',
    'Personal':   'normal',
    'Admin':      'admin',
  };

  const sidebarRole = roleMap[currentWorkspace?.role] ?? 'normal';

  const navItems = [
    { path: '/dashboard',                       icon: LayoutDashboard, label: 'Dashboard',    roles: ['admin', 'employee', 'accountant', 'director', 'normal'] },
    { path: '/dashboard/upload',                icon: Upload,          label: 'Upload Invoice', roles: ['employee', 'normal'] },
    { path: '/dashboard/invoices',              icon: FileText,        label: 'Invoices',     roles: ['admin', 'employee', 'director', 'normal', 'accountant'] },
    { path: '/dashboard/reports',              icon: BarChart3,       label: 'Reports',       roles: ['accountant', 'director', 'normal'] },
    { path: '/dashboard/team',                  icon: UserPlus,        label: 'Team',          roles: ['director'] },
    { path: '/dashboard/subscription',          icon: CreditCard,      label: 'Subscription',  roles: ['director'] },
    { path: '/dashboard/personal-subscription', icon: CreditCard,      label: 'Subscription',  roles: ['normal'] },
    { path: '/dashboard/users',                 icon: Users,           label: 'Users',         roles: ['admin'] },
    { path: '/dashboard/companies',             icon: Building2,       label: 'Companies',     roles: ['admin'] },
    { path: '/dashboard/history',               icon: History,         label: 'History',       roles: ['admin', 'accountant', 'normal', 'employee', 'director'] },
    { path: '/dashboard/settings',              icon: Settings,        label: 'Settings',      roles: ['admin', 'employee', 'accountant', 'director', 'normal'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(sidebarRole));

  const roleLabel: Record<string, { label: string; color: string }> = {
    director:   { label: 'Director',   color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    employee:   { label: 'Employee',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    accountant: { label: 'Accountant', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    admin:      { label: 'Admin',      color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
    normal:     { label: 'Personal',   color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  };
  const role = roleLabel[sidebarRole] ?? roleLabel.normal;

  return (
    <aside className="flex h-screen w-60 flex-col bg-sidebar border-r border-sidebar-border">
      {/* ── Logo ── */}
      <div className="flex h-16 items-center gap-3 px-4 shrink-0 border-b border-sidebar-border">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
          <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-base font-bold tracking-tight text-sidebar-foreground">
          EasyFact
        </span>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                active
                  ? 'bg-primary/10 text-primary dark:bg-primary/20'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${active ? 'text-primary' : 'text-sidebar-foreground/50'}`}
                strokeWidth={active ? 2.5 : 2}
              />
              <span className="truncate">{item.label}</span>
              {active && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Workspace badge ── */}
      <div className="shrink-0 p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2.5 rounded-lg bg-sidebar-accent px-3 py-2.5">
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${role.color}`}>
            {role.label[0]}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-sidebar-foreground">
              {currentWorkspace?.name ?? 'Workspace'}
            </p>
            <p className="text-[10px] text-muted-foreground">{role.label}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}