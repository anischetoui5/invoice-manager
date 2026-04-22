import { useState, useEffect } from 'react';
import { Building2, Search, Users, FileText, Loader2, X, Trash2, Eye } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import api from '../../lib/api';

interface Company {
  id: string;
  workspace_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  code: string;
  created_at: string;
  member_count: number;
  invoice_count: number;
}

function ViewCompanyModal({ company, onClose }: { company: Company; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Company Details</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-blue-600 text-2xl font-bold text-white">
            {company.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-xl font-semibold">{company.name}</h3>
            <p className="text-muted-foreground">{company.email ?? '—'}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Members</p>
              <p className="text-xl font-bold text-foreground mt-1">{company.member_count}</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Invoices</p>
              <p className="text-xl font-bold text-foreground mt-1">{company.invoice_count}</p>
            </div>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">Company Code</p>
            <code className="text-lg font-bold tracking-widest text-blue-600">{company.code}</code>
          </div>
          {company.phone && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="font-medium">{company.phone}</p>
            </div>
          )}
          {company.address && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Address</p>
              <p className="font-medium">{company.address}</p>
            </div>
          )}
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">Registered</p>
            <p className="font-medium">{new Date(company.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        <Button variant="outline" className="w-full mt-6" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}

function DeleteCompanyModal({ company, onClose, onConfirm, deleting }: {
  company: Company;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-destructive">Delete Company</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 mb-6">
          <p className="text-sm font-medium text-destructive mb-1">This action is irreversible.</p>
          <p className="text-sm text-muted-foreground">
            Deleting <span className="font-semibold text-foreground">{company.name}</span> will permanently remove:
          </p>
          <ul className="mt-2 text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>The company profile and workspace</li>
            <li>All {company.invoice_count} invoices</li>
            <li>All {company.member_count} memberships</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={deleting}>Cancel</Button>
          <Button
            className="flex-1 transition-opacity hover:opacity-80"
            style={{ backgroundColor: "var(--destructive)", color: "var(--destructive-foreground)" }}
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Delete Company
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewCompany, setViewCompany] = useState<Company | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get('/company')
      .then(({ data }) => setCompanies(data.companies))
      .catch(err => setError(err.response?.data?.error || 'Failed to load companies'))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/company/${deleteTarget.workspace_id}`);
      setCompanies(prev => prev.filter(c => c.id !== deleteTarget.id));
      toast.success(`${deleteTarget.name} has been deleted`);
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete company');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Companies</h1>
          <p className="mt-1 text-muted-foreground">{companies.length} companies registered on the platform</p>
        </div>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email or code..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Stats */}
      {!isLoading && !error && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Companies</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{companies.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Members</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {companies.reduce((sum, c) => sum + Number(c.member_count), 0)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Invoices</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {companies.reduce((sum, c) => sum + Number(c.invoice_count), 0)}
            </p>
          </Card>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card className="p-12 border-destructive/50 bg-destructive/10">
          <div className="text-center text-destructive">
            <p className="font-bold">Error</p>
            <p>{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </Card>
      ) : filteredCompanies.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          No companies found.
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCompanies.map(company => (
            <Card key={company.id} className="p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white flex-shrink-0">
                    {company.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground leading-tight">{company.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{company.email ?? '—'}</p>
                  </div>
                </div>
                <code className="text-xs font-bold tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                  {company.code}
                </code>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-muted p-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <Users className="h-3.5 w-3.5" />
                    <span className="text-xs">Members</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">{company.member_count}</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <FileText className="h-3.5 w-3.5" />
                    <span className="text-xs">Invoices</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">{company.invoice_count}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-xs text-muted-foreground">
                  Since {new Date(company.created_at).toLocaleDateString()}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setViewCompany(company)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    className="transition-opacity hover:opacity-80"
                    style={{ backgroundColor: "var(--destructive)", color: "var(--destructive-foreground)" }}
                    onClick={() => setDeleteTarget(company)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {viewCompany && <ViewCompanyModal company={viewCompany} onClose={() => setViewCompany(null)} />}
      {deleteTarget && (
        <DeleteCompanyModal
          company={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          deleting={deleting}
        />
      )}
    </div>
  );
}