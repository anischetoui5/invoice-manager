// Persistent workspace customization config — stored in localStorage.
// Basic mode = app as-is. Custom mode = user-controlled layout.

export type AppMode         = 'basic' | 'custom';
export type SidebarPosition = 'left' | 'right' | 'top' | 'bottom';

export interface WorkspaceConfig {
  mode:             AppMode | null;        // null = never chosen
  sidebarPosition:  SidebarPosition;
  sidebarOrder:     string[];              // ordered nav paths; [] = default
  aiPosition:       { x: number; y: number } | null;
  dashboardSections: Record<string, string[]>; // role → ordered section ids
}

const KEY = 'easyfact_workspace_v1';

export const DEFAULT_CONFIG: WorkspaceConfig = {
  mode:             null,
  sidebarPosition:  'left',
  sidebarOrder:     [],
  aiPosition:       null,
  dashboardSections: {},
};

export function loadConfig(): WorkspaceConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch { /* ignore parse errors */ }
  return { ...DEFAULT_CONFIG };
}

export function saveConfig(cfg: WorkspaceConfig): void {
  try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch { /* ignore */ }
}

export function clearConfig(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
