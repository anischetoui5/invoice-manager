import React, { createContext, useContext, useState, useCallback } from 'react';
import type { WorkspaceConfig, AppMode, SidebarPosition } from '../../lib/workspaceConfig';
import { loadConfig, saveConfig, DEFAULT_CONFIG } from '../../lib/workspaceConfig';

interface CtxValue {
  config:          WorkspaceConfig;
  isEditingLayout: boolean;
  setMode:              (m: AppMode) => void;
  setSidebarPosition:   (p: SidebarPosition) => void;
  setSidebarOrder:      (order: string[]) => void;
  setAiPosition:        (pos: { x: number; y: number } | null) => void;
  setDashboardSections: (role: string, order: string[]) => void;
  setEditingLayout:     (v: boolean) => void;
  resetLayout:          () => void;
}

const Ctx = createContext<CtxValue | null>(null);

export function WorkspaceConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig]           = useState<WorkspaceConfig>(loadConfig);
  const [isEditingLayout, setEditing] = useState(false);

  const patch = useCallback((updates: Partial<WorkspaceConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...updates };
      saveConfig(next);
      return next;
    });
  }, []);

  const value: CtxValue = {
    config,
    isEditingLayout,
    setMode:             (mode)           => patch({ mode }),
    setSidebarPosition:  (sidebarPosition) => patch({ sidebarPosition }),
    setSidebarOrder:     (sidebarOrder)    => patch({ sidebarOrder }),
    setAiPosition:       (aiPosition)      => patch({ aiPosition }),
    setDashboardSections: (role, order) =>
      patch({ dashboardSections: { ...config.dashboardSections, [role]: order } }),
    setEditingLayout: setEditing,
    resetLayout: () => {
      const fresh = { ...DEFAULT_CONFIG, mode: 'custom' as AppMode };
      saveConfig(fresh);
      setConfig(fresh);
      setEditing(false);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkspaceConfig() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useWorkspaceConfig must be inside WorkspaceConfigProvider');
  return ctx;
}
