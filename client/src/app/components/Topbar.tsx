import { useState } from 'react';
import {
  Bell, Search, ChevronDown, LogOut, User as UserIcon,
  Building2, Check, CheckCircle, Sun, Moon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import type { User, Enterprise, Workspace } from '../types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface TopBarProps {
  user: User;
  enterprises?: Enterprise[];
  notificationCount: number;
  onNotificationsClick: () => void;
  onLogout: () => void;
  onEnterpriseSwitch?: (enterpriseId: string) => void;
  workspaces: Workspace[];
  currentWorkspace: { id: string; name: string };
  onSwitchWorkspace: (workspaceId: string) => void;
}

export function TopBar({
  user,
  enterprises,
  notificationCount,
  onNotificationsClick,
  onLogout,
  onEnterpriseSwitch,
  workspaces,
  currentWorkspace,
  onSwitchWorkspace,
}: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentEnterpriseId, setCurrentEnterpriseId] = useState(user.enterpriseId);
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !searchQuery.trim()) return;
    navigate(`/dashboard/invoices?q=${encodeURIComponent(searchQuery.trim())}`);
    setSearchQuery('');
  };

  const userEnterprises = user.role === 'accountant' && user.enterpriseIds
    ? (enterprises ?? []).filter(ent => user.enterpriseIds?.includes(ent.id))
    : (enterprises ?? []).filter(ent => ent.id === user.enterpriseId);

  const currentEnterprise = (enterprises ?? []).find(ent => ent.id === currentEnterpriseId);

  const handleEnterpriseSwitch = (enterpriseId: string) => {
    setCurrentEnterpriseId(enterpriseId);
    const enterprise = (enterprises ?? []).find(ent => ent.id === enterpriseId);
    toast.success(`Switched to ${enterprise?.name}`);
    onEnterpriseSwitch?.(enterpriseId);
  };

  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const roleBadgeStyle = (role: string): string => {
    switch (role) {
      case 'Director':   return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'Accountant': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'Employee':   return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Admin':      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      default:           return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  return (
    <header className="glass-panel flex h-16 shrink-0 items-center justify-between px-4 md:px-6">
      {/* ── Left: search + enterprise switcher ── */}
      <div className="flex flex-1 items-center gap-3">
        <div className="relative hidden md:block w-72">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search invoices, vendors… ↵"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            className="h-9 w-full rounded-lg border border-border bg-input-background py-2 pl-9 pr-4 text-sm placeholder:text-muted-foreground/60 transition-colors focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {user.role === 'accountant' && userEnterprises.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border border-border bg-input-background px-3 py-2 text-sm font-medium transition-colors hover:bg-muted focus:outline-none">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-foreground">{currentEnterprise?.name}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Switch Enterprise</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {userEnterprises.map((enterprise) => (
                <DropdownMenuItem
                  key={enterprise.id}
                  onClick={() => handleEnterpriseSwitch(enterprise.id)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{enterprise.name}</span>
                  </div>
                  {enterprise.id === currentEnterpriseId && (
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* ── Right: theme + bell + user ── */}
      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Toggle theme"
        >
          {theme === 'dark'
            ? <Sun className="h-4 w-4" />
            : <Moon className="h-4 w-4" />
          }
        </button>

        {/* Notifications */}
        <button
          onClick={onNotificationsClick}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {notificationCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted focus:outline-none ml-1">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
              {initials}
            </div>
            <div className="hidden text-left md:block">
              <div className="text-sm font-semibold leading-tight text-foreground">{user.name}</div>
              <div className="text-[11px] leading-tight text-muted-foreground truncate max-w-[120px]">
                {currentWorkspace.name}
              </div>
            </div>
            <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground md:block" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {[...new Set(workspaces.map(w => w.role))].map(role => (
                    <span
                      key={role}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${roleBadgeStyle(role)}`}
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Workspaces
            </DropdownMenuLabel>
            {workspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                onClick={() => onSwitchWorkspace(workspace.id)}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {workspace.type === 'personal' ? (
                    <UserIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm">{workspace.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{workspace.role}</p>
                  </div>
                </div>
                {currentWorkspace.id === workspace.id && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                )}
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link to="/dashboard/settings" className="flex items-center gap-2">
                <UserIcon className="h-3.5 w-3.5" />
                Profile Settings
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={onLogout}
              className="flex items-center gap-2 text-destructive focus:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}