import { useState, useEffect } from 'react';
import { Check, CreditCard, Users, FileText, Zap, TrendingUp, X, Lock, AlertTriangle } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import api from '../../lib/api';
import { toast } from 'sonner';

interface Plan {
  id: number; name: string; price: number;
  max_invoices: number; max_users: number; ocr_accuracy: number; popular?: boolean;
}

interface SubscriptionType {
  id: string; status: string; plan: string; price: number; startDate: string;
  invoiceUsed: number; invoiceLimit: number; userCount: number; userLimit: number; features: string[];
}

interface PaymentModal {
  isOpen: boolean; plan: Plan | null; amountCharged: number; credit: number;
}

const formatCardNumber = (value: string) =>
  value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

const formatExpiry = (value: string) => {
  const clean = value.replace(/\D/g, '').slice(0, 4);
  if (clean.length >= 2) return clean.slice(0, 2) + '/' + clean.slice(2);
  return clean;
};

const STATUS_BADGE: Record<string, string> = {
  active:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  trialing:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  past_due:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  expired:   'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Active', trialing: 'Trialing', past_due: 'Past Due', cancelled: 'Cancelled', expired: 'Expired',
};

export function Subscription() {
  const [plans, setPlans]               = useState<Plan[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentModal, setPaymentModal] = useState<PaymentModal>({ isOpen: false, plan: null, amountCharged: 0, credit: 0 });
  const [cardData, setCardData]         = useState({ cardName: '', cardNumber: '', expiry: '', cvc: '' });

  const { currentSubscription: realSubscription, currentWorkspace } = useOutletContext<{
    currentSubscription: SubscriptionType;
    currentWorkspace: { id: string };
  }>();

  const currentSubscription = realSubscription || {
    id: '', status: 'active', plan: 'starter', price: 49,
    startDate: new Date().toISOString(), invoiceUsed: 0, invoiceLimit: 200,
    userCount: 1, userLimit: 10, features: [],
  };

  useEffect(() => {
    api.get('/subscriptions/plans?type=company')
      .then(r => setPlans(r.data))
      .catch(() => toast.error('Failed to load plans'))
      .finally(() => setIsLoading(false));
  }, []);

  const invoiceUsagePercent = currentSubscription.invoiceLimit > 0
    ? (currentSubscription.invoiceUsed / currentSubscription.invoiceLimit) * 100 : 0;
  const userUsagePercent = currentSubscription.userLimit > 0
    ? (currentSubscription.userCount / currentSubscription.userLimit) * 100 : 0;

  const handleUpgradeClick = async (plan: Plan) => {
    try {
      const response = await api.get('/subscriptions/preview-upgrade', {
        params: { planId: plan.id },
        headers: { 'x-workspace-id': currentWorkspace?.id },
      });
      setPaymentModal({ isOpen: true, plan, amountCharged: response.data.amountCharged, credit: response.data.credit });
    } catch {
      setPaymentModal({ isOpen: true, plan, amountCharged: parseFloat(plan.price.toString()), credit: 0 });
    }
  };

  const validateCard = () => {
    const cleanCard = cardData.cardNumber.replace(/\s/g, '');
    if (!cardData.cardName.trim())  { toast.error('Please enter cardholder name'); return false; }
    if (cleanCard.length !== 16)    { toast.error('Card number must be 16 digits'); return false; }
    if (cardData.expiry.length !== 5) { toast.error('Please enter a valid expiry date (MM/YY)'); return false; }
    if (cardData.cvc.length < 3)    { toast.error('CVC must be 3 or 4 digits'); return false; }
    return true;
  };

  const handlePaymentSubmit = async () => {
    if (!validateCard() || !paymentModal.plan) return;
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const response = await api.patch('/subscriptions/upgrade',
        { planId: paymentModal.plan.id },
        { headers: { 'x-workspace-id': currentWorkspace?.id } }
      );
      const { amountCharged, credit } = response.data;
      setPaymentModal({ isOpen: false, plan: null, amountCharged: 0, credit: 0 });
      setCardData({ cardName: '', cardNumber: '', expiry: '', cvc: '' });
      toast.success(credit > 0
        ? `Upgraded to ${paymentModal.plan.name}! Credit: $${credit}. Charged: $${amountCharged}`
        : `Upgraded to ${paymentModal.plan.name}! Charged: $${amountCharged}`
      );
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const isExpiredOrPastDue = ['expired', 'past_due', 'cancelled'].includes(currentSubscription.status);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading subscription…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 page-enter">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Subscription & Billing</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Manage your subscription plan and view usage</p>
      </div>

      {/* Expired / past due warning */}
      {isExpiredOrPastDue && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            {currentSubscription.status === 'expired' && 'Your subscription has expired. Your workspace is in read-only mode.'}
            {currentSubscription.status === 'past_due' && 'Your payment is past due. Please update your billing to avoid service interruption.'}
            {currentSubscription.status === 'cancelled' && 'Your subscription has been cancelled.'}
          </span>
        </div>
      )}

      {/* Current plan */}
      <div className="erp-card rounded-lg p-5">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-semibold text-foreground capitalize">{currentSubscription.plan} Plan</h3>
              <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[currentSubscription.status] ?? STATUS_BADGE.expired}`}>
                {STATUS_LABEL[currentSubscription.status] ?? currentSubscription.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Started {new Date(currentSubscription.startDate).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground tabular-nums">${currentSubscription.price}</p>
            <p className="text-xs text-muted-foreground">per month</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Invoice Usage</span>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {currentSubscription.invoiceUsed} / {currentSubscription.invoiceLimit}
              </span>
            </div>
            <Progress value={invoiceUsagePercent} className="h-1.5" />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">User Seats</span>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {currentSubscription.userCount} / {currentSubscription.userLimit}
              </span>
            </div>
            <Progress value={userUsagePercent} className="h-1.5" />
          </div>
        </div>
      </div>

      {/* Available Plans */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Available Plans</h2>
        <div className="grid gap-4 lg:grid-cols-4">
          {plans.map(plan => {
            const isCurrentPlan = plan.name.toLowerCase() === currentSubscription.plan.toLowerCase();
            return (
              <div
                key={plan.id}
                className={`erp-card relative flex flex-col rounded-lg p-5 ${plan.popular ? 'border-primary ring-1 ring-primary' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-px right-4 rounded-b-md bg-primary px-2.5 py-0.5">
                    <span className="text-[10px] font-semibold text-primary-foreground">Popular</span>
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-foreground">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-foreground tabular-nums">${plan.price}</span>
                    <span className="text-xs text-muted-foreground">/mo</span>
                  </div>
                </div>
                <div className="mb-4 flex-1 space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                    {plan.max_invoices === null ? 'Unlimited invoices' : `${plan.max_invoices} invoices/mo`}
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                    {plan.max_users === null ? 'Unlimited users' : `Up to ${plan.max_users} users`}
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                    {plan.ocr_accuracy}% OCR accuracy
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  variant={isCurrentPlan ? 'outline' : 'default'}
                  disabled={isCurrentPlan}
                  onClick={() => handleUpgradeClick(plan)}
                >
                  {isCurrentPlan ? 'Current Plan' : 'Upgrade'}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Usage Insights */}
      <div className="grid gap-4 lg:grid-cols-3">
        {[
          { icon: TrendingUp, color: 'text-primary bg-primary/10', title: 'Monthly Trend', value: '+23%', sub: 'vs last month' },
          { icon: Users,      color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30', title: 'Active Users', value: String(currentSubscription.userCount), sub: `of ${currentSubscription.userLimit} seats` },
          { icon: Zap,        color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30', title: 'Efficiency', value: '2.4h', sub: 'avg processing time' },
        ].map(({ icon: Icon, color, title, value, sub }) => (
          <div key={title} className="erp-card rounded-lg p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      {/* Payment Modal */}
      {paymentModal.isOpen && paymentModal.plan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-2xl mx-4">
            <button
              onClick={() => setPaymentModal({ isOpen: false, plan: null, amountCharged: 0, credit: 0 })}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-5">
              <h2 className="text-base font-semibold text-foreground">Complete Your Upgrade</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Upgrading to <span className="font-medium text-foreground">{paymentModal.plan.name}</span> plan
              </p>
            </div>

            <div className="mb-5 rounded-lg border border-border bg-muted/30 p-4">
              <h3 className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{paymentModal.plan.name} Plan</span>
                  <span className="font-medium text-foreground">${paymentModal.plan.price}/mo</span>
                </div>
                {paymentModal.credit > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Credit (unused days)</span>
                    <span>-${paymentModal.credit}</span>
                  </div>
                )}
                <div className="border-t border-border pt-2 flex justify-between font-semibold text-foreground">
                  <span>Total Due Today</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>${paymentModal.amountCharged}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cardName">Cardholder Name</Label>
                <Input id="cardName" placeholder="John Doe" value={cardData.cardName}
                  onChange={e => setCardData({ ...cardData, cardName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Card Number</Label>
                <div className="relative">
                  <Input id="cardNumber" placeholder="1234 5678 9012 3456" value={cardData.cardNumber} maxLength={19}
                    onChange={e => setCardData({ ...cardData, cardNumber: formatCardNumber(e.target.value) })} />
                  <CreditCard className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiry</Label>
                  <Input id="expiry" placeholder="MM/YY" value={cardData.expiry} maxLength={5}
                    onChange={e => setCardData({ ...cardData, expiry: formatExpiry(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvc">CVC</Label>
                  <Input id="cvc" placeholder="123" value={cardData.cvc} maxLength={4}
                    onChange={e => setCardData({ ...cardData, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3">
              <Lock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <p className="text-xs text-emerald-700 dark:text-emerald-400">Your payment is encrypted and secure</p>
            </div>

            <Button className="mt-4 w-full" onClick={handlePaymentSubmit} disabled={isProcessing}>
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Processing…
                </span>
              ) : `Pay $${paymentModal.amountCharged}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}