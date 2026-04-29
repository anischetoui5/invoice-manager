// JoinCompany.tsx
import { useState, useEffect } from 'react';
import { Building2, AlertCircle } from 'lucide-react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { toast } from 'sonner';
import type { UserRole } from '../types';
import api from '../../lib/api';

type JoinRole = 'employee' | 'accountant';

interface JoinCompanyProps {
  userRole: UserRole | string;
  lockedRole?: boolean; // ← new prop
}

export function JoinCompany({ userRole, lockedRole = false }: JoinCompanyProps) {
  const [companyCode, setCompanyCode] = useState('');
  const [role, setRole] = useState<JoinRole>('employee');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (userRole === 'accountant' || userRole === 'Accountant') {
      setRole('accountant');
    } else if (userRole === 'employee' || userRole === 'Employee') {
      setRole('employee');
    }
  }, [userRole]);

  const handleJoinCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyCode.trim()) {
      toast.error('Please enter a company code');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/invitations/request', { code: companyCode.trim(), role });
      toast.success('Join request sent! Waiting for director approval.', { duration: 4000 });
      setCompanyCode('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send join request');
    } finally {
      setIsSubmitting(false);
    }
  };

  // show role selector only for normal users who aren't locked into a role
  const showRoleSelector = !lockedRole && (userRole === 'normal' || userRole === 'Personal');

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="flex items-center gap-2 font-semibold text-foreground">
          <Building2 className="h-5 w-5 text-blue-600" />
          Join a Company
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter a company code to request access to their invoice management system
        </p>
      </div>

      <form onSubmit={handleJoinCompany} className="space-y-4">
        {showRoleSelector ? (
          <div className="space-y-2">
            <Label>Join as</Label>
            <RadioGroup value={role} onValueChange={v => setRole(v as JoinRole)}>
              <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-muted">
                <RadioGroupItem value="employee" id="employee" />
                <Label htmlFor="employee" className="flex-1 cursor-pointer">
                  <div className="font-medium text-foreground">Employee</div>
                  <div className="text-xs text-muted-foreground">Upload and manage invoices</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-muted">
                <RadioGroupItem value="accountant" id="accountant" />
                <Label htmlFor="accountant" className="flex-1 cursor-pointer">
                  <div className="font-medium text-foreground">Accountant</div>
                  <div className="text-xs text-muted-foreground">Validate and approve invoices</div>
                </Label>
              </div>
            </RadioGroup>
          </div>
        ) : (
          <div className="rounded-lg border bg-muted p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Joining as
            </p>
            <p className="mt-0.5 font-medium capitalize text-foreground">{role}</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="companyCode">Company Code</Label>
          <Input
            id="companyCode"
            type="text"
            placeholder="e.g., A1B2C3D4"
            value={companyCode}
            onChange={e => setCompanyCode(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Ask your company director for the company code
          </p>
        </div>

        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: 'var(--info)', color: 'var(--info-foreground)' }}
        >
          <div className="flex gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-semibold">How it works:</p>
              <ul className="mt-1 space-y-1">
                <li>• Enter the company code provided by your director</li>
                <li>• Your request will be sent for approval</li>
                <li>• You'll get access once the director approves</li>
              </ul>
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Sending...' : 'Send Join Request'}
        </Button>
      </form>
    </Card>
  );
}