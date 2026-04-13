import { useState, useEffect } from 'react';
import { Building2, AlertCircle } from 'lucide-react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { toast } from 'sonner';
import type { UserRole } from '../types'; // Import your types

type JoinRole = 'employee' | 'accountant';

// 1. Define the props to accept userRole
interface JoinCompanyProps {
  userRole: UserRole;
}

export function JoinCompany({ userRole }: JoinCompanyProps) {
  const [companyCode, setCompanyCode] = useState('');
  const [role, setRole] = useState<JoinRole>('employee');
  const [isValidating, setIsValidating] = useState(false);

  // 2. Lock in the role automatically if they are already an accountant or employee
  useEffect(() => {
    if (userRole === 'accountant' || userRole === 'employee') {
      setRole(userRole);
    }
  }, [userRole]);

  const handleJoinCompany = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyCode.trim()) {
      toast.error('Please enter a company code');
      return;
    }

    setIsValidating(true);

    setTimeout(() => {
      toast.success('Request sent! Waiting for director approval.', { duration: 4000 });
      setCompanyCode('');
      setIsValidating(false);
    }, 1000);
  };

  // 3. Determine if this is a "Normal" user who actually needs to pick a role
  const isNormalUser = userRole === 'normal';

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
        
        {/* 4. Conditional Rendering: Only show radio buttons for normal users */}
        {isNormalUser ? (
          <div className="space-y-2">
            <Label htmlFor="role">Join as</Label>
            <RadioGroup value={role} onValueChange={(value) => setRole(value as JoinRole)}>
              <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-background">
                <RadioGroupItem value="employee" id="employee" />
                <Label htmlFor="employee" className="flex-1 cursor-pointer">
                  <div className="font-medium text-foreground">Employee</div>
                  <div className="text-xs text-muted-foreground">Upload and manage invoices</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-background">
                <RadioGroupItem value="accountant" id="accountant" />
                <Label htmlFor="accountant" className="flex-1 cursor-pointer">
                  <div className="font-medium text-foreground">Accountant</div>
                  <div className="text-xs text-muted-foreground">Validate and approve invoices</div>
                </Label>
              </div>
            </RadioGroup>
          </div>
        ) : (
          // Show a helpful locked badge for accountant/employee instead of options
          <div className="rounded-lg border bg-background p-4">
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">Role</p>
            <p className="font-medium text-foreground capitalize mt-0.5">{userRole}</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="companyCode">Company Code</Label>
          <Input
            id="companyCode"
            type="text"
            placeholder="e.g., ACME2024"
            value={companyCode}
            onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
            className="uppercase"
          />
          <p className="text-xs text-muted-foreground">
            Ask your company director for the company code
          </p>
        </div>

        <Card className="bg-blue-50 p-4">
          <div className="flex gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-blue-600" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">How it works:</p>
              <ul className="mt-1 space-y-1">
                <li>• Enter the company code provided by your director</li>
                <li>• Your request will be sent for approval as an <span className="font-bold">{role}</span></li>
                <li>• You'll get notified when approved</li>
              </ul>
            </div>
          </div>
        </Card>

        <Button type="submit" className="w-full" disabled={isValidating}>
          {isValidating ? 'Validating...' : 'Send Join Request'}
        </Button>
      </form>
    </Card>
  );
}