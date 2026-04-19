import { useState, useEffect } from 'react';
import { UserPlus, Search, MoreVertical, Mail, Shield, Loader2, Building2, User as UserIcon } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
    case 'Owner':    return 'bg-purple-100 text-purple-700';
    case 'Director': return 'bg-orange-100 text-orange-700';
    case 'Accountant': return 'bg-green-100 text-green-700';
    case 'Employee': return 'bg-blue-100 text-blue-700';
    case 'Personal': return 'bg-gray-100 text-gray-600';
    default:         return 'bg-slate-100 text-slate-700';
  }
};

export function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.roles?.some(r => r.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  console.log('users:', users);
  console.log('Director count:', users.filter(u => u.roles?.includes('Director')).length);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="mt-1 text-muted-foreground">
            {users.length} total users on the platform
          </p>
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
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Stats row */}
      {!isLoading && !error && (
        <div className="grid gap-4 md:grid-cols-4">
          {['Director', 'Employee', 'Accountant', 'Personal'].map((role) => (
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
          {filteredUsers.map((user) => (
            <Card key={user.id} className="p-5 flex flex-col gap-4">
              {/* User header */}
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
                    <DropdownMenuItem>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Email
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Shield className="mr-2 h-4 w-4" />
                      Edit Permissions
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      Deactivate User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Roles */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Roles</p>
                <div className="flex flex-wrap gap-1">
                  {user.roles?.filter(r => r !== null).map((role) => (
                    <span
                      key={role}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${getRoleBadgeColor(role)}`}
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-xs text-muted-foreground">
                  Joined {new Date(user.created_at).toLocaleDateString()}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">View</Button>
                  <Button size="sm">Edit</Button>
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
    </div>
  );
}