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
        <h3 className="mb-4 font-semibold text-foreground">
          Join Requests
          {invitations.length > 0 && (
            <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
              {invitations.length} pending
            </span>
          )}
        </h3>
        {invitations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending join requests.</p>
        ) : (
          <div className="space-y-4">
            {invitations.map(inv => (
              <div key={inv.id} className="rounded-lg border p-4 space-y-4">
                {/* User info */}
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-600">
                    {inv.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{inv.name}</p>
                    <p className="text-sm text-muted-foreground">{inv.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Requested {new Date(inv.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${getRoleBadgeColor(inv.role)}`}>
                    {inv.role}
                  </span>
                </div>

                {/* Contract dates */}
                <div className="rounded-lg bg-muted p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Set Contract Duration (required to accept)
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Start Date</label>
                      <input
                        type="date"
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        onChange={e => setContractDates(prev => ({
                          ...prev,
                          [inv.id]: { ...prev[inv.id], start: e.target.value }
                        }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">End Date</label>
                      <input
                        type="date"
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        onChange={e => setContractDates(prev => ({
                          ...prev,
                          [inv.id]: { ...prev[inv.id], end: e.target.value }
                        }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleInvitation(inv.id, 'accept')}
                    disabled={actionLoading === inv.id}
                  >
                    {actionLoading === inv.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <><Check className="mr-1 h-4 w-4" />Accept</>
                    }
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleInvitation(inv.id, 'reject')}
                    disabled={actionLoading === inv.id}
                  >
                    <X className="mr-1 h-4 w-4" />Reject
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