import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  Users, Check, X, Loader2, Calendar, LogOut, AlertTriangle, RefreshCw, Copy,
} from 'lucide-react';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import type { Workspace } from '../types';
import api from '../../lib/api';

interface Member {
  id: string; name: string; email: string; role: string;
  joined_at: string; contract_start?: string; contract_end?: string;
}

interface Invitation {
  id: string; user_id: string; name: string; email: string;
  role: string; created_at: string;
  type: 'join_request' | 'leave_request' | 'renewal_request';
}

interface ConfirmDialog {
  open: boolean; title: string; description: string;
  confirmLabel: string; confirmStyle?: 'danger' | 'default'; onConfirm: () => void;
}

const normalizeType = (type: string | null | undefined): Invitation['type'] => {
  if (type === 'leave_request')   return 'leave_request';
  if (type === 'renewal_request') return 'renewal_request';
  return 'join_request';
};

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'Director':   return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    case 'Accountant': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'Employee':   return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    default:           return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
  }
};

const getRoleAvatarColor = (role: string) => {
  switch (role) {
    case 'Director':   return 'bg-orange-500';
    case 'Accountant': return 'bg-emerald-600';
    case 'Employee':   return 'bg-blue-600';
    default:           return 'bg-slate-400';
  }
};

function ConfirmDialog({ dialog, onClose }: { dialog: ConfirmDialog; onClose: () => void }) {
  if (!dialog.open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl mx-4">
        <h3 className="text-base font-semibold text-foreground">{dialog.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{dialog.description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => { dialog.onConfirm(); onClose(); }}
            style={dialog.confirmStyle === 'danger' ? { backgroundColor: 'var(--destructive)', color: 'var(--destructive-foreground)' } : undefined}>
            {dialog.confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MemberRow({ member, onRemove, isLocked }: {
  member: Member; onRemove: (id: string, name: string) => void; isLocked: boolean;
}) {
  const contractExpired = member.contract_end ? new Date(member.contract_end) < new Date() : false;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3.5">
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${getRoleAvatarColor(member.role)}`}>
        {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm">{member.name}</p>
        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
        {member.contract_end && (
          <p className={`text-xs mt-0.5 flex items-center gap-1 ${contractExpired ? 'text-destructive' : 'text-muted-foreground'}`}>
            {contractExpired
              ? <><AlertTriangle className="h-3 w-3" /> Contract expired {new Date(member.contract_end).toLocaleDateString()}</>
              : <><Calendar className="h-3 w-3" /> Until {new Date(member.contract_end).toLocaleDateString()}</>
            }
          </p>
        )}
      </div>
      <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${getRoleBadgeColor(member.role)}`}>
        {member.role}
      </span>
      {member.role !== 'Director' && (
        <Button variant="outline" size="sm" className="h-7 text-xs" disabled={isLocked} onClick={() => onRemove(member.id, member.name)}>
          Remove
        </Button>
      )}
    </div>
  );
}

function InvitationCard({ inv, actionLoading, contractDates, setContractDates, onAccept, onReject, isLocked }: {
  inv: Invitation; actionLoading: string | null;
  contractDates: Record<string, { start: string; end: string }>;
  setContractDates: React.Dispatch<React.SetStateAction<Record<string, { start: string; end: string }>>>;
  onAccept: (inv: Invitation) => void; onReject: (inv: Invitation) => void; isLocked: boolean;
}) {
  const isLeave   = inv.type === 'leave_request';
  const isRenewal = inv.type === 'renewal_request';
  const isJoin    = inv.type === 'join_request';

  const cardBg = isLeave
    ? 'border-destructive/20 bg-destructive/5'
    : isRenewal
      ? 'border-primary/20 bg-primary/5'
      : 'border-border bg-background';

  const avatarBg = isLeave ? 'bg-red-500' : isRenewal ? 'bg-blue-600' : 'bg-primary';

  return (
    <div className={`rounded-lg border p-4 ${cardBg}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${avatarBg}`}>
            {inv.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-foreground text-sm">{inv.name}</p>
            <p className="text-xs text-muted-foreground">{inv.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${getRoleBadgeColor(inv.role)}`}>{inv.role}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>

      {isLeave && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
          <LogOut className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
          <p className="text-xs text-destructive font-medium">Approving will immediately remove this member.</p>
        </div>
      )}
      {isRenewal && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2">
          <RefreshCw className="h-3.5 w-3.5 text-primary flex-shrink-0" />
          <p className="text-xs text-primary font-medium">Set a new contract end date to approve.</p>
        </div>
      )}

      {(isJoin || isRenewal) && (
        <div className="mb-3 grid grid-cols-2 gap-3">
          {isJoin && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contract Start</label>
              <input type="date" value={contractDates[inv.id]?.start ?? ''}
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                onChange={e => setContractDates(prev => ({ ...prev, [inv.id]: { ...prev[inv.id], start: e.target.value } }))} />
            </div>
          )}
          <div className={isRenewal ? 'col-span-2' : ''}>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {isRenewal ? 'New Contract End Date' : 'Contract End'}
            </label>
            <input type="date" value={contractDates[inv.id]?.end ?? ''}
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              onChange={e => setContractDates(prev => ({ ...prev, [inv.id]: { ...prev[inv.id], end: e.target.value } }))} />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button size="sm" className="h-7 text-xs"
          style={{ backgroundColor: 'var(--destructive)', color: 'var(--destructive-foreground)' }}
          onClick={() => onReject(inv)} disabled={isLocked || actionLoading === inv.id}>
          <X className="mr-1.5 h-3.5 w-3.5" />{isLeave ? 'Deny' : 'Reject'}
        </Button>
        <Button size="sm" className="h-7 text-xs"
          style={{ backgroundColor: 'var(--success)', color: 'var(--success-foreground)' }}
          onClick={() => onAccept(inv)} disabled={isLocked || actionLoading === inv.id}>
          {actionLoading === inv.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (
            <><Check className="mr-1.5 h-3.5 w-3.5" />{isLeave ? 'Approve' : isRenewal ? 'Renew' : 'Accept'}</>
          )}
        </Button>
      </div>
    </div>
  );
}

export function TeamManagement() {
  const { currentWorkspace } = useOutletContext<{ currentWorkspace: Workspace }>();
  const { isLocked } = useSubscriptionGuard();

  const isDirector = currentWorkspace?.role === 'Director';

  const [members, setMembers]                 = useState<Member[]>([]);
  const [joinRequests, setJoinRequests]       = useState<Invitation[]>([]);
  const [leaveRequests, setLeaveRequests]     = useState<Invitation[]>([]);
  const [renewalRequests, setRenewalRequests] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading]             = useState(true);
  const [actionLoading, setActionLoading]     = useState<string | null>(null);
  const [contractDates, setContractDates]     = useState<Record<string, { start: string; end: string }>>({});
  const [companyCode, setCompanyCode]         = useState<string | null>(null);

  const [dialog, setDialog] = useState<ConfirmDialog>({
    open: false, title: '', description: '', confirmLabel: 'Confirm', onConfirm: () => {},
  });

  const closeDialog = () => setDialog(d => ({ ...d, open: false }));
  const openDialog  = (opts: Omit<ConfirmDialog, 'open'>) => setDialog({ ...opts, open: true });

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    fetchData();
    if (isDirector) {
      api.get(`/company/${currentWorkspace.id}`)
        .then(({ data }) => setCompanyCode(data.company?.code ?? null))
        .catch(() => {});
    }
  }, [currentWorkspace?.id]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [membersRes, invitationsRes] = await Promise.all([
        api.get(`/users/workspace/${currentWorkspace.id}/members`),
        api.get(`/invitations/workspace/${currentWorkspace.id}`),
      ]);
      const filtered = membersRes.data.members.filter((m: Member) => m.role !== 'Personal');
      setMembers(filtered);
      const all: Invitation[] = (invitationsRes.data.invitations as any[]).map(i => ({ ...i, type: normalizeType(i.type) }));
      setJoinRequests(all.filter(i => i.type === 'join_request'));
      setLeaveRequests(all.filter(i => i.type === 'leave_request'));
      setRenewalRequests(all.filter(i => i.type === 'renewal_request'));
    } catch { toast.error('Failed to load team data'); }
    finally { setIsLoading(false); }
  };

  const handleInvitation = async (invitationId: string, action: 'accept' | 'reject', type: Invitation['type']) => {
    if (action === 'accept') {
      if (type === 'join_request') {
        const dates = contractDates[invitationId];
        if (!dates?.start || !dates?.end) { toast.error('Please set contract start and end dates before accepting'); return; }
        if (new Date(dates.end) <= new Date(dates.start)) { toast.error('Contract end date must be after start date'); return; }
      }
      if (type === 'renewal_request') {
        if (!contractDates[invitationId]?.end) { toast.error('Please set a new contract end date before approving'); return; }
      }
    }
    setActionLoading(invitationId);
    try {
      const body: any = { action };
      if (type === 'join_request' && action === 'accept') { body.contractStart = contractDates[invitationId].start; body.contractEnd = contractDates[invitationId].end; }
      if (type === 'renewal_request' && action === 'accept') { body.contractEnd = contractDates[invitationId].end; }
      await api.patch(`/invitations/workspace/${currentWorkspace.id}/invitations/${invitationId}`, body);
      const successMsg =
        type === 'leave_request'   ? (action === 'accept' ? 'Member removed' : 'Leave request rejected') :
        type === 'renewal_request' ? (action === 'accept' ? 'Contract renewed' : 'Renewal rejected') :
                                     (action === 'accept' ? 'Join request accepted' : 'Join request rejected');
      toast.success(successMsg);
      if (type === 'join_request')    setJoinRequests(prev => prev.filter(i => i.id !== invitationId));
      if (type === 'leave_request')   setLeaveRequests(prev => prev.filter(i => i.id !== invitationId));
      if (type === 'renewal_request') setRenewalRequests(prev => prev.filter(i => i.id !== invitationId));
      if (action === 'accept') fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || `Failed to ${action} request`);
    } finally { setActionLoading(null); }
  };

  const handleRemoveMember = (userId: string, name: string) => {
    openDialog({
      title: 'Remove member',
      description: `Are you sure you want to remove ${name} from the company? This cannot be undone.`,
      confirmLabel: 'Remove', confirmStyle: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/users/workspace/${currentWorkspace.id}/members/${userId}`, { headers: { 'x-workspace-id': currentWorkspace.id } });
          setMembers(prev => prev.filter(m => m.id !== userId));
          toast.success(`${name} removed from workspace`);
        } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to remove member'); }
      },
    });
  };

  const handleInvitationAccept = (inv: Invitation) => {
    if (inv.type === 'leave_request') {
      openDialog({ title: 'Approve leave request', description: `${inv.name} will be immediately removed. This cannot be undone.`,
        confirmLabel: 'Approve & Remove', confirmStyle: 'danger', onConfirm: () => handleInvitation(inv.id, 'accept', inv.type) });
    } else { handleInvitation(inv.id, 'accept', inv.type); }
  };

  const handleInvitationReject = (inv: Invitation) => {
    const labels: Record<Invitation['type'], { title: string; description: string; confirmLabel: string }> = {
      leave_request:   { title: 'Deny leave request',    description: `${inv.name} will stay in the company.`,                    confirmLabel: 'Deny'   },
      renewal_request: { title: 'Reject renewal request', description: `${inv.name}'s renewal request will be rejected.`,          confirmLabel: 'Reject' },
      join_request:    { title: 'Reject join request',    description: `${inv.name}'s request to join will be rejected.`,          confirmLabel: 'Reject' },
    };
    const { title, description, confirmLabel } = labels[inv.type];
    openDialog({ title, description, confirmLabel, confirmStyle: 'danger', onConfirm: () => handleInvitation(inv.id, 'reject', inv.type) });
  };

  const director     = members.find(m => m.role === 'Director');
  const accountants  = members.filter(m => m.role === 'Accountant');
  const employees    = members.filter(m => m.role === 'Employee');
  const pendingCount = joinRequests.length + leaveRequests.length + renewalRequests.length;

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const SectionCard = ({ title, subtitle, badge, badgeColor, emptyIcon, emptyTitle, emptySubtitle, items, renderItem }: {
    title: string; subtitle: string; badge?: number; badgeColor?: string;
    emptyIcon?: React.ReactNode; emptyTitle: string; emptySubtitle: string;
    items: any[]; renderItem: (item: any) => React.ReactNode;
  }) => (
    <div className="erp-card rounded-lg p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        {badge !== undefined && badge > 0 && (
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeColor}`}>{badge} pending</span>
        )}
      </div>
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted mb-3">
            {emptyIcon ?? <Check className="h-5 w-5 text-muted-foreground" />}
          </div>
          <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{emptySubtitle}</p>
        </div>
      ) : (
        <div className="space-y-3">{items.map(renderItem)}</div>
      )}
    </div>
  );

  return (
    <>
      <ConfirmDialog dialog={dialog} onClose={closeDialog} />
      <div className="space-y-5 page-enter">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Team Management</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Manage your company team members and requests</p>
        </div>

        {isLocked && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>Your subscription has expired. Renew to continue.</span>
            <Link to="/dashboard/settings" className="ml-auto font-medium underline underline-offset-2">Renew</Link>
          </div>
        )}

        {/* Summary */}
        <div className="erp-card rounded-lg p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">{currentWorkspace?.name}</h3>
              <p className="text-xs text-muted-foreground">{members.length} team members</p>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-xl font-bold text-foreground tabular-nums">{employees.length}</p>
                <p className="text-xs text-muted-foreground">Employees</p>
              </div>
              <div>
                <p className="text-xl font-bold text-foreground tabular-nums">{accountants.length}</p>
                <p className="text-xs text-muted-foreground">Accountants</p>
              </div>
              {pendingCount > 0 && (
                <div>
                  <p className="text-xl font-bold text-amber-600 tabular-nums">{pendingCount}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              )}
            </div>
          </div>

          {isDirector && companyCode && (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Company Join Code</p>
                <code className="mt-1 text-xl font-bold tracking-widest text-primary">{companyCode}</code>
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(companyCode); toast.success('Company code copied!'); }}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Copy className="h-3.5 w-3.5" /> Copy
              </button>
            </div>
          )}
        </div>

        {/* Director */}
        {director && (
          <div className="erp-card rounded-lg p-5">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Director</h3>
            <MemberRow member={director} onRemove={handleRemoveMember} isLocked={isLocked} />
          </div>
        )}

        {/* Accountants */}
        <div className="erp-card rounded-lg p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Accountants ({accountants.length})</h3>
          {accountants.length === 0
            ? <p className="text-sm text-muted-foreground">No accountants yet.</p>
            : <div className="space-y-2">{accountants.map(m => <MemberRow key={m.id} member={m} onRemove={handleRemoveMember} isLocked={isLocked} />)}</div>
          }
        </div>

        {/* Employees */}
        <div className="erp-card rounded-lg p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Employees ({employees.length})</h3>
          {employees.length === 0
            ? <p className="text-sm text-muted-foreground">No employees yet.</p>
            : <div className="space-y-2">{employees.map(m => <MemberRow key={m.id} member={m} onRemove={handleRemoveMember} isLocked={isLocked} />)}</div>
          }
        </div>

        {/* Join Requests */}
        <SectionCard
          title="Join Requests" subtitle="Review pending membership requests"
          badge={joinRequests.length} badgeColor="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          emptyTitle="All caught up!" emptySubtitle="No pending join requests."
          items={joinRequests}
          renderItem={inv => (
            <InvitationCard key={inv.id} inv={inv} actionLoading={actionLoading}
              contractDates={contractDates} setContractDates={setContractDates}
              onAccept={handleInvitationAccept} onReject={handleInvitationReject} isLocked={isLocked} />
          )}
        />

        {/* Renewal Requests */}
        <SectionCard
          title="Renewal Requests" subtitle="Accountants requesting a contract renewal"
          badge={renewalRequests.length} badgeColor="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
          emptyTitle="No renewal requests" emptySubtitle="No contracts pending renewal."
          items={renewalRequests}
          renderItem={inv => (
            <InvitationCard key={inv.id} inv={inv} actionLoading={actionLoading}
              contractDates={contractDates} setContractDates={setContractDates}
              onAccept={handleInvitationAccept} onReject={handleInvitationReject} isLocked={isLocked} />
          )}
        />

        {/* Leave Requests */}
        <SectionCard
          title="Leave Requests" subtitle="Members requesting to leave the company"
          badge={leaveRequests.length} badgeColor="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          emptyTitle="No leave requests" emptySubtitle="All members are staying."
          items={leaveRequests}
          renderItem={inv => (
            <InvitationCard key={inv.id} inv={inv} actionLoading={actionLoading}
              contractDates={contractDates} setContractDates={setContractDates}
              onAccept={handleInvitationAccept} onReject={handleInvitationReject} isLocked={isLocked} />
          )}
        />
      </div>
    </>
  );
}