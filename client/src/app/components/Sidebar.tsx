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
    { path: '/dashboard',                    icon: LayoutDashboard, label: 'Dashboard',       roles: ['admin', 'employee', 'accountant', 'director', 'normal'] },
    { path: '/dashboard/upload',             icon: Upload,          label: 'Upload Invoice',  roles: ['employee', 'normal'] },
    { path: '/dashboard/invoices',           icon: FileText,        label: 'Invoices',        roles: ['admin', 'employee', 'director', 'normal', 'accountant'] },
    { path: '/dashboard/reports',            icon: BarChart3,       label: 'Reports',         roles: ['accountant', 'director', 'normal'] },
    { path: '/dashboard/team',               icon: UserPlus,        label: 'Team',            roles: ['director'] },
    { path: '/dashboard/subscription',       icon: CreditCard,      label: 'Subscription',    roles: ['director'] },
    { path: '/dashboard/personal-subscription', icon: CreditCard,   label: 'Subscription',    roles: ['normal'] },
    { path: '/dashboard/users',              icon: Users,           label: 'Users',           roles: ['admin'] },
    { path: '/dashboard/companies',          icon: Building2,       label: 'Companies',       roles: ['admin'] },
    { path: '/dashboard/history',            icon: History,         label: 'History',         roles: ['admin', 'accountant', 'normal', 'employee', 'director'] },
    { path: '/dashboard/settings',           icon: Settings,        label: 'Settings',        roles: ['admin', 'employee', 'accountant', 'director', 'normal'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(sidebarRole));

  const roleLabel: Record<string, { label: string; color: string }> = {
    director:   { label: 'Director',   color: 'from-orange-500 to-amber-500' },
    employee:   { label: 'Employee',   color: 'from-blue-500 to-cyan-500' },
    accountant: { label: 'Accountant', color: 'from-emerald-500 to-teal-500' },
    admin:      { label: 'Admin',      color: 'from-purple-500 to-violet-500' },
    normal:     { label: 'Personal',   color: 'from-slate-400 to-slate-500' },
  };
  const role = roleLabel[sidebarRole] ?? roleLabel.normal;

  return (
    <aside
      className="flex h-screen w-64 flex-col"
      style={{
        background: 'var(--sidebar)',
        borderRight: '1px solid var(--sidebar-border)',
        boxShadow: 'var(--shadow-sidebar)',
      }}
    >
      {/* ── Logo ── */}
      <div className="flex h-16 items-center gap-3 px-5 shrink-0" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'var(--gradient-brand)', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}
        >
          <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
        </div>
        <span
          className="text-lg font-extrabold tracking-tight"
          style={{ fontFamily: "'Syne', sans-serif", color: 'var(--sidebar-foreground)' }}
        >
          EasyFact
        </span>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200"
              style={active ? {
                background: 'var(--gradient-brand)',
                color: '#ffffff',
                boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
              } : {
                color: 'var(--sidebar-foreground)',
                opacity: 0.75,
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'var(--sidebar-accent)';
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.color = 'var(--sidebar-accent-foreground)';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = '';
                  e.currentTarget.style.opacity = '0.75';
                  e.currentTarget.style.color = 'var(--sidebar-foreground)';
                }
              }}
            >
              <Icon
                className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110"
                strokeWidth={active ? 2.5 : 2}
              />
              <span className="truncate">{item.label}</span>
              {active && (
                <span
                  className="absolute right-3 h-1.5 w-1.5 rounded-full bg-white/70"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Workspace badge ── */}
      <div className="shrink-0 px-3 pb-4 space-y-2">
        <div
          className="rounded-xl p-3"
          style={{ background: 'var(--gradient-brand-soft)', border: '1px solid var(--sidebar-border)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${role.color}`}>
              <span className="text-[10px] font-bold text-white">{role.label[0]}</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold" style={{ color: 'var(--sidebar-accent-foreground)' }}>
                {currentWorkspace?.name ?? 'Workspace'}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>{role.label}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
