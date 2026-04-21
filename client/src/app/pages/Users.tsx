import { useState, useEffect } from 'react';
import { UserPlus, Search, MoreVertical, Mail, Shield, Loader2, X, Save, Trash2} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import api from '../../lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
  created_at: string;
}

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'Owner':      return 'bg-purple-100 text-purple-700';
    case 'Director':   return 'bg-orange-100 text-orange-700';
    case 'Accountant': return 'bg-green-100 text-green-700';
    case 'Employee':   return 'bg-blue-100 text-blue-700';
    case 'Personal':   return 'bg-gray-100 text-gray-600';
    default:           return 'bg-slate-100 text-slate-700';
  }
};

// ── View Modal ─────────────────────────────────────────────────────────────
function ViewUserModal({ user, onClose, onEdit }: { user: User; onClose: () => void; onEdit: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">User Details</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
            {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <h3 className="text-xl font-semibold">{user.name}</h3>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <p className="text-xs text-muted-foreground mb-1">Member since</p>
            <p className="font-medium">{new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          <div className="rounded-lg bg-muted p-4">
            <p className="text-xs text-muted-foreground mb-2">Roles</p>
            <div className="flex flex-wrap gap-2">
              {user.roles?.length > 0 ? user.roles.map(role => (
                <span key={role} className={`rounded-full px-3 py-1 text-xs font-medium ${getRoleBadgeColor(role)}`}>
                  {role}
                </span>
              )) : (
                <span className="text-sm text-muted-foreground">No roles assigned</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
          <Button className="flex-1" onClick={onEdit}>Edit User</Button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Modal ─────────────────────────────────────────────────────────────
function EditUserModal({ user, onClose, onSave }: { user: User; onClose: () => void; onSave: (updated: User) => void }) {
  const [name, setName]       = useState(user.name);
  const [email, setEmail]     = useState(user.email);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleSave = async () => {
    if (!name && !email) return;
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.put(`/users/${user.id}`, { name, email });
      toast.success('User updated successfully');
      onSave({ ...user, name: data.user.name, email: data.user.email });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Edit User</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Full Name</label>
            <Input
              className="mt-1"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Email</label>
            <Input
              className="mt-1"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ user, onClose, onConfirm, deleting }: {
  user: User;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-destructive">Delete User</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 mb-6">
          <p className="text-sm text-destructive font-medium mb-1">This action is irreversible.</p>
          <p className="text-sm text-muted-foreground">
            Deleting <span className="font-semibold text-foreground">{user.name}</span> will permanently remove:
          </p>
          <ul className="mt-2 text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Their account and profile</li>
            <li>All their invoices</li>
            <li>All their workspace memberships</li>
            {user.roles?.includes('Director') && (
              <li className="text-destructive font-medium">
                Their company and all associated workspaces
              </li>
            )}
          </ul>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting
              ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
              : <Trash2 className="h-4 w-4 mr-2" />
            }
            Delete User
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export function Users() {
  const [users, setUsers]           = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [viewUser, setViewUser]     = useState<User | null>(null);
  const [editUser, setEditUser]     = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting]         = useState(false);


  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/users');
        setUsers(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load users');
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.roles?.some(r => r.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleUserSaved = (updated: User) => {
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    setEditUser(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
      toast.success(`${deleteTarget.name} has been deleted`);
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="mt-1 text-muted-foreground">{users.length} total users on the platform</p>
        </div>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email or role..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Stats row */}
      {!isLoading && !error && (
        <div className="grid gap-4 md:grid-cols-4">
          {['Director', 'Employee', 'Accountant', 'Personal'].map(role => (
            <Card key={role} className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{role}s</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {users.filter(u => u.roles?.includes(role)).length}
              </p>
            </Card>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card className="p-12 border-destructive/50 bg-destructive/10">
          <div className="text-center text-destructive">
            <p className="font-bold">Error</p>
            <p>{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map(user => (
            <Card key={user.id} className="p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white flex-shrink-0">
                    {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground leading-tight">{user.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setViewUser(user)}>
                      <Mail className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEditUser(user)}>
                      <Shield className="mr-2 h-4 w-4" />
                      Edit User
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(user)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Roles</p>
                <div className="flex flex-wrap gap-1">
                  {user.roles?.filter(r => r !== null).map(role => (
                    <span key={role} className={`rounded-full px-2 py-0.5 text-xs font-medium ${getRoleBadgeColor(role)}`}>
                      {role}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-xs text-muted-foreground">
                  Joined {new Date(user.created_at).toLocaleDateString()}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setViewUser(user)}>View</Button>
                  <Button size="sm" onClick={() => setEditUser(user)}>Edit</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filteredUsers.length === 0 && (
        <Card className="p-12 text-center text-muted-foreground">
          No users found matching your search.
        </Card>
      )}

      {/* Modals */}
      {viewUser && (
        <ViewUserModal
          user={viewUser}
          onClose={() => setViewUser(null)}
          onEdit={() => { setEditUser(viewUser); setViewUser(null); }}
        />
      )}
      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSave={handleUserSaved}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          user={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          deleting={deleting}
        />
      )}
    </div>
  );
}