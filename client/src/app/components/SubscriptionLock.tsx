import { Lock, AlertTriangle, LogOut } from 'lucide-react';

interface SubscriptionLockProps {
  workspaceName: string;
  onLogout: () => void;
}

export function SubscriptionLock({ workspaceName, onLogout }: SubscriptionLockProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      {/* Icon */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950/40">
        <Lock className="h-10 w-10 text-red-600 dark:text-red-400" />
      </div>

      {/* Title */}
      <h2 className="text-xl font-bold text-foreground mb-2">
        Workspace Access Suspended
      </h2>

      {/* Workspace badge */}
      <div className="mb-4 flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-sm font-medium text-foreground">{workspaceName}</span>
      </div>

      {/* Message */}
      <p className="max-w-sm text-sm text-muted-foreground leading-relaxed mb-2">
        The company subscription has expired. All platform features are currently
        disabled until the subscription is renewed.
      </p>
      <p className="max-w-sm text-sm text-muted-foreground leading-relaxed mb-8">
        Please contact your <span className="font-semibold text-foreground">Director</span> to
        renew the subscription and restore full access.
      </p>

      {/* Divider */}
      <div className="w-full max-w-xs border-t border-border mb-6" />

      {/* Logout */}
      <button
        onClick={onLogout}
        className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <LogOut className="h-4 w-4" />
        Log out
      </button>
    </div>
  );
}
