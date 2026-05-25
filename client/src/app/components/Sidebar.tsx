import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Upload, FileText, BarChart3,
  Settings, Users, History, CreditCard, UserPlus,
  Building2, MessageSquare, GripVertical,
} from 'lucide-react';
import type { Workspace } from '../types';
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, horizontalListSortingStrategy,
  verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useWorkspaceConfig } from '../context/WorkspaceConfigContext';

export type SidebarOrientation = 'vertical' | 'horizontal';

interface SidebarProps {
  currentWorkspace: Workspace;
  chatUnreadCount?: number;
  orientation?: SidebarOrientation;
}

const roleMap: Record<string, string> = {
  'Director':   'director',
  'Employee':   'employee',
  'Accountant': 'accountant',
  'Personal':   'normal',
  'Admin':      'admin',
};

const roleLabel: Record<string, { label: string; color: string }> = {
  director:   { label: 'Director',   color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  employee:   { label: 'Employee',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  accountant: { label: 'Accountant', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  admin:      { label: 'Admin',      color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  normal:     { label: 'Personal',   color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
};

const ALL_NAV = [
  { path: '/dashboard',                       icon: LayoutDashboard, label: 'Dashboard',    roles: ['admin', 'employee', 'accountant', 'director', 'normal'] },
  { path: '/dashboard/upload',                icon: Upload,          label: 'Upload',        roles: ['employee', 'normal'] },
  { path: '/dashboard/invoices',              icon: FileText,        label: 'Invoices',      roles: ['admin', 'employee', 'director', 'normal', 'accountant'] },
  { path: '/dashboard/reports',               icon: BarChart3,       label: 'Reports',       roles: ['accountant', 'director', 'normal'] },
  { path: '/dashboard/team',                  icon: UserPlus,        label: 'Team',          roles: ['director'] },
  { path: '/dashboard/subscription',          icon: CreditCard,      label: 'Subscription',  roles: ['director'] },
  { path: '/dashboard/personal-subscription', icon: CreditCard,      label: 'Subscription',  roles: ['normal'] },
  { path: '/dashboard/users',                 icon: Users,           label: 'Users',         roles: ['admin'] },
  { path: '/dashboard/companies',             icon: Building2,       label: 'Companies',     roles: ['admin'] },
  { path: '/dashboard/chat',                  icon: MessageSquare,   label: 'Chat',          roles: ['admin', 'employee', 'accountant', 'director'] },
  { path: '/dashboard/history',               icon: History,         label: 'History',       roles: ['admin', 'accountant', 'normal', 'employee', 'director'] },
  { path: '/dashboard/settings',              icon: Settings,        label: 'Settings',      roles: ['admin', 'employee', 'accountant', 'director', 'normal'] },
];

// ── Single sortable nav item ─────────────────────────────────────────────────

interface NavItemProps {
  item: typeof ALL_NAV[0];
  active: boolean;
  isEditingLayout: boolean;
  isCustomMode: boolean;
  chatUnreadCount: number;
  orientation: SidebarOrientation;
}

function SortableNavItem({ item, active, isEditingLayout, isCustomMode, chatUnreadCount, orientation }: NavItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.path });
  const Icon = item.icon;
  const horiz = orientation === 'horizontal';

  return (
    <div
      ref={setNodeRef}
      style={{
        transform:  CSS.Transform.toString(transform),
        transition: transition ?? 'transform 200ms ease',
        opacity:    isDragging ? 0.45 : 1,
        display:    'flex',
        alignItems: 'center',
        position:   'relative',
      }}
    >
      {/* Drag handle — vertical only, edit mode only */}
      {isEditingLayout && !horiz && (
        <button
          {...attributes} {...listeners}
          title="Reorder"
          style={{
            position: 'absolute', left: '-2px', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'grab',
            color: 'var(--muted-foreground)', padding: '2px', display: 'flex',
            zIndex: 2,
          }}
        >
          <GripVertical size={13} />
        </button>
      )}

      {horiz ? (
        // ── Horizontal nav link ──
        <Link
          to={item.path}
          {...(isEditingLayout ? { ...attributes, ...listeners } : {})}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 whitespace-nowrap ${
            active
              ? 'bg-primary/10 text-primary dark:bg-primary/20'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
          }`}
          style={{ cursor: isEditingLayout ? 'grab' : 'pointer' }}
        >
          <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-primary' : 'text-sidebar-foreground/50'}`} strokeWidth={active ? 2.5 : 2} />
          <span>{item.label}</span>
          {item.path === '/dashboard/chat' && chatUnreadCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
              {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
            </span>
          )}
        </Link>
      ) : (
        // ── Vertical nav link ──
        <Link
          to={item.path}
          className={`flex flex-1 items-center gap-3 rounded-lg border-l-2 px-3 py-2 text-sm font-medium transition-colors duration-150 ${
            isEditingLayout ? 'pl-6' : ''
          } ${
            active
              ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20'
              : 'border-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
          }`}
        >
          <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-primary' : 'text-sidebar-foreground/50'}`} strokeWidth={active ? 2.5 : 2} />
          <span className="truncate">{item.label}</span>
          {item.path === '/dashboard/chat' && chatUnreadCount > 0 ? (
            <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
              {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
            </span>
          ) : active && !isEditingLayout ? (
            <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
          ) : null}
        </Link>
      )}
    </div>
  );
}

// ── Main Sidebar ─────────────────────────────────────────────────────────────

export function Sidebar({ currentWorkspace, chatUnreadCount = 0, orientation = 'vertical' }: SidebarProps) {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const { config, isEditingLayout, setSidebarOrder } = useWorkspaceConfig();
  const isCustomMode = config.mode === 'custom';

  const sidebarRole = roleMap[currentWorkspace?.role] ?? 'normal';
  const role = roleLabel[sidebarRole] ?? roleLabel.normal;

  // Visible nav items for this role
  const visible = ALL_NAV.filter(item => item.roles.includes(sidebarRole));
  const visiblePaths = visible.map(i => i.path);

  // Apply saved order (only paths that are still valid for this role)
  const savedOrder = config.sidebarOrder.filter(p => visiblePaths.includes(p));
  const missingPaths = visiblePaths.filter(p => !savedOrder.includes(p));
  const order = [...savedOrder, ...missingPaths];
  const navItems = order.map(p => visible.find(i => i.path === p)!).filter(Boolean);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIdx = order.indexOf(String(active.id));
    const newIdx = order.indexOf(String(over.id));
    setSidebarOrder(arrayMove(order, oldIdx, newIdx));
  };

  const horiz = orientation === 'horizontal';

  // ── Horizontal (top/bottom) layout ─────────────────────────────────────────
  if (horiz) {
    return (
      <aside className="flex h-12 w-full items-center bg-sidebar border-b border-sidebar-border shrink-0 px-3 gap-2">
        {/* Compact logo */}
        <img src="/logo-icon.png" alt="EasyFact" className="h-7 w-7 shrink-0 rounded-lg mr-3 object-cover" />

        {/* Nav items */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={order} strategy={horizontalListSortingStrategy}>
            <div className="flex items-center gap-1 overflow-x-auto flex-1 scrollbar-none">
              {navItems.map(item => (
                <SortableNavItem
                  key={item.path}
                  item={item}
                  active={isActive(item.path)}
                  isEditingLayout={isEditingLayout && isCustomMode}
                  isCustomMode={isCustomMode}
                  chatUnreadCount={chatUnreadCount}
                  orientation="horizontal"
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Role badge */}
        <div className={`hidden lg:flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold shrink-0 ${role.color}`}>
          {role.label}
        </div>
      </aside>
    );
  }

  // ── Vertical (left/right) layout ────────────────────────────────────────────
  return (
    <aside className="flex h-screen w-60 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-4 shrink-0 border-b border-sidebar-border">
        <img src="/logo-icon.png" alt="EasyFact" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
        <span className="text-base font-bold tracking-tight text-sidebar-foreground" style={{ fontFamily: "'Syne', sans-serif" }}>
          EasyFact
        </span>
        {isEditingLayout && isCustomMode && (
          <span style={{
            marginLeft:'auto',fontSize:'9px',fontWeight:700,
            background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color:'white',padding:'2px 6px',borderRadius:'10px',letterSpacing:'0.4px',
          }}>
            EDIT
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            {navItems.map(item => (
              <SortableNavItem
                key={item.path}
                item={item}
                active={isActive(item.path)}
                isEditingLayout={isEditingLayout && isCustomMode}
                isCustomMode={isCustomMode}
                chatUnreadCount={chatUnreadCount}
                orientation="vertical"
              />
            ))}
          </SortableContext>
        </DndContext>
      </nav>

      {/* Workspace badge */}
      <div className="shrink-0 p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2.5 rounded-lg bg-sidebar-accent px-3 py-2.5">
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${role.color}`}>
            {role.label[0]}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-sidebar-foreground">{currentWorkspace?.name ?? 'Workspace'}</p>
            <p className="text-[10px] text-muted-foreground">{role.label}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
