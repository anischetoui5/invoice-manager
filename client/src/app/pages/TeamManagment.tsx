import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Users, Check, X, Loader2, Calendar } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import type { Workspace } from '../types';
import api from '../../lib/api';

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  joined_at: string;
  contract_start?: string;
  contract_end?: string;
}

interface Invitation {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'Director':   return 'bg-purple-100 text-purple-700';
    case 'Accountant': return 'bg-green-100 text-green-700';
    case 'Employee':   return 'bg-blue-100 text-blue-700';
    default:           return 'bg-gray-100 text-gray-700';
  }
};

const getRoleAvatarColor = (role: string) => {
  switch (role) {
    case 'Director':   return 'bg-purple-600';
    case 'Accountant': return 'bg-green-600';
    case 'Employee':   return 'bg-blue-600';
    default:           return 'bg-gray-400';
  }
};

export function TeamManagement() {
  const { currentWorkspace } = useOutletContext<{ currentWorkspace: Workspace }>();

  const [members, setMembers]         = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [contractDates, setContractDates] = useState<Record<string, { start: string; end: string }>>({});

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    fetchData();
  }, [currentWorkspace?.id]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [membersRes, invitationsRes] = await Promise.all([
        api.get(`/users/workspace/${currentWorkspace.id}/members`),
        api.get(`/invitations/workspace/${currentWorkspace.id}`),
      ]);
      const filtered = membersRes.data.members.filter(
        (m: Member) => m.role !== 'Personal'
      );
      setMembers(filtered);
      setInvitations(invitationsRes.data.invitations);
    } catch (err: any) {
      toast.error('Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvitation = async (invitationId: string, action: 'accept' | 'reject') => {
    if (action === 'accept') {
      const dates = contractDates[invitationId];
      if (!dates?.start || !dates?.end) {
        toast.error('Please set contract start and end dates before accepting');
        return;
      }
      if (new Date(dates.end) <= new Date(dates.start)) {
        toast.error('Contract end date must be after start date');
        return;
      }
    }

    setActionLoading(invitationId);
    try {
      const body: any = { action };
      if (action === 'accept') {
        const dates = contractDates[invitationId];
        body.contractStart = dates.start;
        body.contractEnd   = dates.end;
      }

      await api.patch(`/invitations/${invitationId}`, body);
      toast.success(`Request ${action}ed successfully`);
      setInvitations(prev => prev.filter(i => i.id !== invitationId));
      if (action === 'accept') fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || `Failed to ${action} request`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    try {
      await api.delete(`/users/workspace/${currentWorkspace.id}/members/${userId}`);
      setMembers(prev => prev.filter(m => m.id !== userId));
      toast.success(`${name} removed from workspace`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to remove member');
    }
  };

  const director    = members.find(m => m.role === 'Director');
  const accountants = members.filter(m => m.role === 'Accountant');
  const employees   = members.filter(m => m.role === 'Employee');

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const MemberRow = ({ member }: { member: Member }) => (
    <div className="flex items-center gap-4 rounded-lg border p-4">
      <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${getRoleAvatarColor(member.role)}`}>
        {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground">{member.name}</p>
        <p className="text-sm text-muted-foreground truncate">{member.email}</p>
        {member.contract_end && (
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Contract until {new Date(member.contract_end).toLocaleDateString()}
          </p>
        )}
      </div>
      <span className={`rounded-full px-3 py-1 text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
        {member.role}
      </span>
      {member.role !== 'Director' && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleRemoveMember(member.id, member.name)}
        >
          Remove
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
        {/* Header */}
        <div>
            <h1 className="text-2xl font-bold text-foreground">Team Management</h1>
            <p className="mt-1 text-muted-foreground">
            Manage your company team members and join requests
            </p>
        </div>

        {/* Summary */}
        <Card className="p-6">
            <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-blue-100">
                <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex-1">
                <h3 className="font-semibold text-foreground">{currentWorkspace?.name}</h3>
                <p className="text-sm text-muted-foreground">{members.length} team members</p>
            </div>
            <div className="flex gap-6 text-center">
                <div>
                <p className="text-2xl font-bold text-foreground">{employees.length}</p>
                <p className="text-xs text-muted-foreground">Employees</p>
                </div>
                <div>
                <p className="text-2xl font-bold text-foreground">{accountants.length}</p>
                <p className="text-xs text-muted-foreground">Accountants</p>
                </div>
                {invitations.length > 0 && (
                <div>
                    <p className="text-2xl font-bold text-yellow-600">{invitations.length}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                </div>
                )}
            </div>
            </div>
        </Card>

        {/* Director */}
        {director && (
            <Card className="p-6">
            <h3 className="mb-4 font-semibold text-foreground">Director</h3>
            <MemberRow member={director} />
            </Card>
        )}

        {/* Accountants */}
        <Card className="p-6">
            <h3 className="mb-4 font-semibold text-foreground">
            Accountants ({accountants.length})
            </h3>
            {accountants.length === 0 ? (
            <p className="text-sm text-muted-foreground">No accountants yet.</p>
            ) : (
            <div className="space-y-3">
                {accountants.map(m => <MemberRow key={m.id} member={m} />)}
            </div>
            )}
        </Card>

        {/* Employees */}
        <Card className="p-6">
            <h3 className="mb-4 font-semibold text-foreground">
            Employees ({employees.length})
            </h3>
            {employees.length === 0 ? (
            <p className="text-sm text-muted-foreground">No employees yet.</p>
            ) : (
            <div className="space-y-3">
                {employees.map(m => <MemberRow key={m.id} member={m} />)}
            </div>
            )}
        </Card>

        {/* Join Requests */}
        <Card className="p-6">
            <div className="mb-6 flex items-center justify-between">
                <div>
                <h3 className="font-semibold text-foreground">Join Requests</h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Review and manage pending membership requests
                </p>
                </div>
                {invitations.length > 0 && (
                <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700">
                    {invitations.length} pending
                </span>
                )}
            </div>

            {invitations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 mb-3">
                    <Check className="h-7 w-7 text-green-600" />
                </div>
                <p className="font-medium text-foreground">All caught up!</p>
                <p className="text-sm text-muted-foreground mt-1">No pending join requests.</p>
                </div>
            ) : (
                <div className="space-y-4">
                {invitations.map(inv => (
                    <div key={inv.id} className="rounded-xl border bg-muted/30 p-5">
                        {/* Top row — user info + role + date */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-bold text-white">
                                {inv.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">{inv.name}</p>
                                <p className="text-xs text-muted-foreground">{inv.email}</p>
                            </div>
                            </div>
                            <div className="flex items-center gap-2">
                            <span className={`rounded-full px-3 py-1 text-xs font-medium ${getRoleBadgeColor(inv.role)}`}>
                                {inv.role}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {new Date(inv.created_at).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric'
                                })}
                            </span>
                            </div>
                        </div>

                        {/* Contract dates row */}
                        <div className="mb-4 grid grid-cols-2 gap-4">
                            <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Contract Start
                            </label>
                            <input
                                type="date"
                                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                onChange={e => setContractDates(prev => ({
                                ...prev,
                                [inv.id]: { ...prev[inv.id], start: e.target.value }
                                }))}
                            />
                            </div>
                            <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Contract End
                            </label>
                            <input
                                type="date"
                                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                onChange={e => setContractDates(prev => ({
                                ...prev,
                                [inv.id]: { ...prev[inv.id], end: e.target.value }
                                }))}
                            />
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex justify-end gap-2">
                            <Button
                                size="sm"
                                className="transition-opacity hover:opacity-80"
                                style={{ backgroundColor: "var(--destructive)", color: "var(--destructive-foreground)" }}
                                onClick={() => handleInvitation(inv.id, 'reject')}
                                disabled={actionLoading === inv.id}
                            >
                                <X className="mr-1.5 h-4 w-4" />
                                Reject
                            </Button>
                            <Button
                                size="sm"
                                className="transition-opacity hover:opacity-80"
                                style={{ backgroundColor: "var(--success)", color: "var(--success-foreground)" }}
                                onClick={() => handleInvitation(inv.id, 'accept')}
                                disabled={actionLoading === inv.id}
                            >
                                {actionLoading === inv.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                <><Check className="mr-1.5 h-4 w-4" />Accept</>
                                )}
                            </Button>
                        </div>
                    </div>
                ))}
                </div>
            )}
        </Card>
    </div>
  );
}