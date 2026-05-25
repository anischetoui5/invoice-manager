import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Upload, History, Settings,
  MessageSquare, Users, BarChart2, CreditCard, Grid3x3,
  Building2, UserCog, X, Camera,
} from 'lucide-react';

interface NavItem {
  to: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;
  label: string;
  roles: string[];
  requiresChat?: boolean;
}

const ALL_ITEMS: NavItem[] = [
  { to: '/dashboard',                    icon: LayoutDashboard, label: 'Home',         roles: ['admin', 'employee', 'accountant', 'director', 'normal'] },
  { to: '/dashboard/invoices',           icon: FileText,        label: 'Invoices',     roles: ['admin', 'employee', 'accountant', 'director', 'normal'] },
  { to: '/dashboard/upload',             icon: Camera,          label: 'Scan',         roles: ['employee', 'normal'] },
  { to: '/dashboard/reports',            icon: BarChart2,       label: 'Reports',      roles: ['accountant', 'director', 'normal'] },
  { to: '/dashboard/chat',               icon: MessageSquare,   label: 'Chat',         roles: ['admin', 'employee', 'accountant', 'director'], requiresChat: true },
  { to: '/dashboard/history',            icon: History,         label: 'History',      roles: ['admin', 'accountant', 'normal', 'employee', 'director'] },
  { to: '/dashboard/team',               icon: Users,           label: 'Team',         roles: ['director'] },
  { to: '/dashboard/subscription',       icon: CreditCard,      label: 'Plan',         roles: ['director'] },
  { to: '/dashboard/personal-subscription', icon: CreditCard,   label: 'Plan',         roles: ['normal'] },
  { to: '/dashboard/settings',           icon: Settings,        label: 'Settings',     roles: ['admin', 'employee', 'accountant', 'director', 'normal'] },
  { to: '/dashboard/users',              icon: UserCog,         label: 'Users',        roles: ['admin'] },
  { to: '/dashboard/companies',          icon: Building2,       label: 'Companies',    roles: ['admin'] },
];

interface MobileNavProps {
  role?: string;
  hasChat?: boolean;
}

export function MobileNav({ role, hasChat }: MobileNavProps) {
  const [showMore, setShowMore] = useState(false);
  const raw = (role ?? 'personal').toLowerCase();
  const normalizedRole = raw === 'personal' ? 'normal' : raw;

  const accessible = ALL_ITEMS.filter(item => {
    if (!item.roles.includes(normalizedRole)) return false;
    if (item.requiresChat && !hasChat) return false;
    return true;
  });

  const bottomItems = accessible.slice(0, 4);
  const moreItems = accessible.slice(4);

  const NavBtn = ({ to, icon: Icon, label }: { to: string; icon: NavItem['icon']; label: string }) => (
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
            width: '36px', height: '36px', borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isActive ? '#eff6ff' : 'transparent',
            transition: 'background 0.15s',
          }}>
            <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} color={isActive ? '#2563eb' : '#94a3b8'} />
          </div>
          <span style={{ fontSize: '10px', fontWeight: isActive ? '700' : '500', letterSpacing: '0.01em' }}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  );

  return (
    <>
      {/* Bottom nav bar */}
      <nav
        className="md:hidden"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          height: '64px',
          background: 'white',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          zIndex: 100,
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.08)',
        }}
      >
        {bottomItems.map(item => <NavBtn key={item.to} {...item} />)}

        {moreItems.length > 0 && (
          <button
            onClick={() => setShowMore(true)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '3px', border: 'none', background: 'none', cursor: 'pointer',
            }}
            className="text-slate-400"
          >
            <div style={{ width: '36px', height: '36px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Grid3x3 size={20} strokeWidth={1.8} color="#94a3b8" />
            </div>
            <span style={{ fontSize: '10px', fontWeight: '500', letterSpacing: '0.01em' }}>More</span>
          </button>
        )}
      </nav>

      {/* More drawer */}
      {showMore && (
        <div className="md:hidden" style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
          {/* Backdrop */}
          <div
            onClick={() => setShowMore(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
          />
          {/* Sheet */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'white',
            borderRadius: '20px 20px 0 0',
            padding: '12px 16px 20px',
            paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
            animation: 'slideUp 0.25s ease',
          }}>
            <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

            {/* Handle */}
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: '#e2e8f0', margin: '0 auto 16px' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontWeight: '700', fontSize: '16px', color: '#0f172a' }}>More</span>
              <button
                onClick={() => setShowMore(false)}
                style={{ border: 'none', background: '#f1f5f9', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={16} color="#64748b" />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {moreItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setShowMore(false)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textDecoration: 'none', padding: '14px 8px', borderRadius: '14px', background: '#f8fafc' }}
                  className={({ isActive }) => isActive ? 'text-blue-600' : 'text-slate-600'}
                >
                  {({ isActive }) => (
                    <>
                      <div style={{
                        width: '46px', height: '46px', borderRadius: '13px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isActive ? '#eff6ff' : 'white',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                      }}>
                        <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} color={isActive ? '#2563eb' : '#64748b'} />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: isActive ? '700' : '500', color: isActive ? '#2563eb' : '#475569', textAlign: 'center', lineHeight: '1.2' }}>
                        {label}
                      </span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
