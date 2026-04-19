import { useState } from 'react';
import { Bell, Search, ChevronDown, LogOut, User as UserIcon, Building2, Check, CheckCircle } from 'lucide-react';

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import type { User, Enterprise, Workspace } from '../types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Badge } from './ui/badge';
import { Link } from 'react-router-dom';
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
  const { theme, setTheme } = useTheme()

  const userEnterprises = user.role === 'accountant' && user.enterpriseIds
    ? (enterprises ?? []).filter(ent => user.enterpriseIds?.includes(ent.id))
    : (enterprises ?? []).filter(ent => ent.id === user.enterpriseId);

  const currentEnterprise = (enterprises ?? []).find(ent => ent.id === currentEnterpriseId);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':      return 'bg-purple-100 text-purple-700';
      case 'accountant': return 'bg-green-100 text-green-700';
      case 'director':   return 'bg-orange-100 text-orange-700';
      default:           return 'bg-blue-100 text-blue-700';
    }
  };

  const handleEnterpriseSwitch = (enterpriseId: string) => {
    setCurrentEnterpriseId(enterpriseId);
    const enterprise = (enterprises ?? []).find(ent => ent.id === enterpriseId);
    toast.success(`Switched to ${enterprise?.name}`);
    onEnterpriseSwitch?.(enterpriseId);
  };

  // ✅ New handler with toast
  const handleWorkspaceSwitch = (workspaceId: string) => {
    const workspace = workspaces.find(w => w.id === workspaceId);
    onSwitchWorkspace(workspaceId);
    toast.success(`Switched to ${workspace?.name}`);
  };

  return (
    <div className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex flex-1 items-center gap-4">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search invoices, vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {user.role === 'accountant' && userEnterprises.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 hover:bg-background">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{currentEnterprise?.name}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
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
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      
      <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <div className="flex items-center gap-4">
        <button
          onClick={onNotificationsClick}
          className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted"
        >
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {notificationCount}
            </span>
          )}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-foreground">{user.name}</div>
              <div className="text-xs text-muted-foreground capitalize">{currentWorkspace.name}</div>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-1">
                <span className="text-sm">{user.name}</span>
                <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {workspaces.map((w) => (
                    <span
                      key={w.id}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        w.role === 'Director' ? 'bg-orange-100 text-orange-700' :
                        w.role === 'Employee' ? 'bg-blue-100 text-blue-700' :
                        w.role === 'Accountant' ? 'bg-green-100 text-green-700' :
                        w.role === 'Personal' ? 'bg-gray-200 text-gray-600' :
                        'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {w.role}
                    </span>
                  ))}
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              Switch Workspace
            </DropdownMenuLabel>
            {workspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                onClick={() => handleWorkspaceSwitch(workspace.id)}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  {workspace.type === 'personal' ? (
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm">{workspace.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{workspace.role}</span>
                  </div>
                </div>
                {currentWorkspace.id === workspace.id && (
                  <Check className="h-4 w-4 text-blue-600" />
                )}
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link to="/dashboard/settings" className="flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                Profile Settings
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={onLogout} className="flex items-center gap-2 text-red-600">
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}