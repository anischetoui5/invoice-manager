import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Upload, History, User } from 'lucide-react';

const ALL_LINKS = [
  { to: '/dashboard',          icon: LayoutDashboard, label: 'Home',     roles: ['admin', 'employee', 'accountant', 'director', 'normal'] },
  { to: '/dashboard/invoices', icon: FileText,         label: 'Invoices', roles: ['admin', 'employee', 'accountant', 'director', 'normal'] },
  { to: '/dashboard/upload',   icon: Upload,           label: 'Scan',     roles: ['employee', 'normal'] },
  { to: '/dashboard/history',  icon: History,          label: 'History',  roles: ['admin', 'accountant', 'normal', 'employee', 'director'] },
  { to: '/dashboard/settings', icon: User,             label: 'Profile',  roles: ['admin', 'employee', 'accountant', 'director', 'normal'] },
];

interface MobileNavProps {
  role?: string;
}

export function MobileNav({ role }: MobileNavProps) {
  const normalizedRole = (role ?? 'normal').toLowerCase();
  const links = ALL_LINKS.filter(l => l.roles.includes(normalizedRole));

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      height: '64px',
      background: 'white',
      borderTop: '1px solid #e2e8f0',
      display: 'flex',
      zIndex: 100,
      paddingBottom: 'env(safe-area-inset-bottom)',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.08)',
    }}
      className="md:hidden"
    >
      {links.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/dashboard'}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', gap: '3px', transition: 'color 0.15s' }}
          className={({ isActive }) => isActive ? 'text-blue-600' : 'text-slate-400'}
        >
          {({ isActive }) => (
            <>
              <div style={{
                width: '36px', height: '36px',
                borderRadius: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isActive ? '#eff6ff' : 'transparent',
                transition: 'background 0.15s',
              }}>
                {label === 'Scan'
                  ? <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} color={isActive ? '#2563eb' : '#94a3b8'} />
                  : <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} color={isActive ? '#2563eb' : '#94a3b8'} />
                }
              </div>
              <span style={{ fontSize: '10px', fontWeight: isActive ? '700' : '500', letterSpacing: '0.01em' }}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
