import { useState, useEffect } from 'react';
import { Building2, Search, Users, FileText, Loader2, X, Trash2, Eye, Pencil, Save, Plus, EyeOff, Eye as EyeIcon } from 'lucide-react';
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

function CreateCompanyModal({ onClose, onCreate }: { onClose: () => void; onCreate: (company: Company) => void }) {
  const [form, setForm] = useState({ companyName: '', companyEmail: '', companyPhone: '', companyAddress: '', directorName: '', directorEmail: '', directorPassword: '' });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const set = (field: string, val: string) => setForm(p => ({ ...p, [field]: val }));

  const handleCreate = async () => {
    if (!form.companyName.trim() || !form.directorName.trim() || !form.directorEmail.trim() || !form.directorPassword) {
      setError('Company name and director details are required'); return;
    }
    setSaving(true); setError(null);
    try {
      const { data } = await api.post('/company/admin', form);
      toast.success('Company created successfully');
      onCreate(data.company);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create company');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Create Company</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Company Details</p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground">Company Name *</label>
                <Input className="mt-1" value={form.companyName} onChange={e => set('companyName', e.target.value)} placeholder="Acme Corporation" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground">Email</label>
                  <Input className="mt-1" type="email" value={form.companyEmail} onChange={e => set('companyEmail', e.target.value)} placeholder="contact@company.com" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Phone</label>
                  <Input className="mt-1" value={form.companyPhone} onChange={e => set('companyPhone', e.target.value)} placeholder="+1 555 000-0000" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Address</label>
                <Input className="mt-1" value={form.companyAddress} onChange={e => set('companyAddress', e.target.value)} placeholder="123 Main St, City" />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Director Account</p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground">Full Name *</label>
                <Input className="mt-1" value={form.directorName} onChange={e => set('directorName', e.target.value)} placeholder="John Doe" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Email *</label>
                <Input className="mt-1" type="email" value={form.directorEmail} onChange={e => set('directorEmail', e.target.value)} placeholder="director@company.com" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Password *</label>
                <div className="relative mt-1">
                  <Input type={showPw ? 'text' : 'password'} value={form.directorPassword} onChange={e => set('directorPassword', e.target.value)} placeholder="Min. 8 characters" className="pr-10" />
                  <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button className="flex-1" onClick={handleCreate} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Create Company
          </Button>
        </div>
      </div>
    </div>
  );
}

function EditCompanyModal({ company, onClose, onSave }: { company: Company; onClose: () => void; onSave: (updated: Company) => void }) {
  const [form, setForm] = useState({ name: company.name, email: company.email ?? '', phone: company.phone ?? '', address: company.address ?? '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Company name is required'); return; }
    setSaving(true); setError(null);
    try {
      const { data } = await api.put(`/company/admin/${company.workspace_id}`, form);
      toast.success('Company updated successfully');
      onSave({ ...company, ...data.company });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update company');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Edit Company</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Company Name</label>
            <Input className="mt-1" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Company name" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Email</label>
            <Input className="mt-1" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Company email" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Phone</label>
            <Input className="mt-1" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="Phone number" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Address</label>
            <Input className="mt-1" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Address" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
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
  const [viewCompany, setViewCompany]   = useState<Company | null>(null);
  const [editCompany, setEditCompany]   = useState<Company | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [deleting, setDeleting]         = useState(false);
  const [showCreate, setShowCreate]     = useState(false);

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
      await api.delete(`/company/admin/${deleteTarget.workspace_id}`);
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
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Company
        </Button>
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
                  <Button size="sm" variant="outline" onClick={() => setEditCompany(company)}>
                    <Pencil className="h-4 w-4" />
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

      {showCreate && (
        <CreateCompanyModal
          onClose={() => setShowCreate(false)}
          onCreate={company => { setCompanies(prev => [company, ...prev]); setShowCreate(false); }}
        />
      )}
      {viewCompany && <ViewCompanyModal company={viewCompany} onClose={() => setViewCompany(null)} />}
      {editCompany && (
        <EditCompanyModal
          company={editCompany}
          onClose={() => setEditCompany(null)}
          onSave={updated => { setCompanies(prev => prev.map(c => c.id === updated.id ? updated : c)); setEditCompany(null); }}
        />
      )}
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