import { useState, useEffect } from 'react';
import { Check, CreditCard, Users, FileText, Zap, TrendingUp, X, Lock } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import api from '../../lib/api';
import { toast } from 'sonner';

interface Plan {
  id: number;
  name: string;
  price: number;
  max_invoices: number;
  max_users: number;
  ocr_accuracy: number;
  popular?: boolean;
}

interface SubscriptionType {
  id: string;
  status: string;
  plan: string;
  price: number;
  startDate: string;
  invoiceUsed: number;
  invoiceLimit: number;
  userCount: number;
  userLimit: number;
  features: string[];
}

interface PaymentModal {
  isOpen: boolean;
  plan: Plan | null;
  amountCharged: number;
  credit: number;
}

// Simple card number formatter
const formatCardNumber = (value: string) => {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
};

const formatExpiry = (value: string) => {
  const clean = value.replace(/\D/g, '').slice(0, 4);
  if (clean.length >= 2) return clean.slice(0, 2) + '/' + clean.slice(2);
  return clean;
};

export function Subscription() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentModal, setPaymentModal] = useState<PaymentModal>({
    isOpen: false,
    plan: null,
    amountCharged: 0,
    credit: 0,
  });

  // Card form state
  const [cardData, setCardData] = useState({
    cardName: '',
    cardNumber: '',
    expiry: '',
    cvc: '',
  });

  const { currentSubscription: realSubscription } = useOutletContext<{
    currentSubscription: SubscriptionType;
  }>();

  const currentSubscription = realSubscription || {
    id: '',
    status: 'active',
    plan: 'starter',
    price: 49,
    startDate: new Date().toISOString(),
    invoiceUsed: 0,
    invoiceLimit: 200,
    userCount: 1,
    userLimit: 10,
    features: [],
  };

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await api.get('/subscriptions/plans?type=company');
        setPlans(response.data);
      } catch (err) {
        toast.error('Failed to load plans');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const invoiceUsagePercent =
    currentSubscription.invoiceLimit > 0
      ? (currentSubscription.invoiceUsed / currentSubscription.invoiceLimit) * 100
      : 0;
  const userUsagePercent =
    currentSubscription.userLimit > 0
      ? (currentSubscription.userCount / currentSubscription.userLimit) * 100
      : 0;

  // Called when user clicks Upgrade — preview charge before payment
  const handleUpgradeClick = async (plan: Plan) => {
    try {
      // Pre-calculate what they'll be charged (dry run)
      const workspaceId = localStorage.getItem('activeWorkspaceId');
      const response = await api.post('/subscriptions/preview-upgrade', {
        planId: plan.id,
      }, {
        headers: workspaceId ? { 'x-workspace-id': workspaceId } : {},
      });

      setPaymentModal({
        isOpen: true,
        plan,
        amountCharged: response.data.amountCharged,
        credit: response.data.credit,
      });
    } catch (err: any) {
      // If no preview endpoint yet, just show full price
      setPaymentModal({
        isOpen: true,
        plan,
        amountCharged: parseFloat(plan.price.toString()),
        credit: 0,
      });
    }
  };

  // Validate card fields
  const validateCard = () => {
    const cleanCard = cardData.cardNumber.replace(/\s/g, '');
    if (!cardData.cardName.trim()) {
      toast.error('Please enter cardholder name');
      return false;
    }
    if (cleanCard.length !== 16) {
      toast.error('Card number must be 16 digits');
      return false;
    }
    if (cardData.expiry.length !== 5) {
      toast.error('Please enter a valid expiry date (MM/YY)');
      return false;
    }
    if (cardData.cvc.length < 3) {
      toast.error('CVC must be 3 or 4 digits');
      return false;
    }
    return true;
  };

  // Called when user submits payment form
  const handlePaymentSubmit = async () => {
    if (!validateCard() || !paymentModal.plan) return;

    setIsProcessing(true);

    try {
      // Simulate payment processing delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const workspaceId = localStorage.getItem('activeWorkspaceId');
      const response = await api.patch(
        '/subscriptions/upgrade',
        { planId: paymentModal.plan.id },
        {
          headers: workspaceId ? { 'x-workspace-id': workspaceId } : {},
        }
      );

      const { amountCharged, credit } = response.data;

      setPaymentModal({ isOpen: false, plan: null, amountCharged: 0, credit: 0 });
      setCardData({ cardName: '', cardNumber: '', expiry: '', cvc: '' });

      if (credit > 0) {
        toast.success(
          `Upgraded to ${paymentModal.plan.name}! Credit applied: $${credit}. Charged: $${amountCharged}`
        );
      } else {
        toast.success(
          `Upgraded to ${paymentModal.plan.name}! Amount charged: $${amountCharged}`
        );
      }

      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading subscription...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Subscription & Billing</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your subscription plan and view usage
        </p>
      </div>

      {/* Current Plan */}
      <Card className="p-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-semibold text-foreground">
                Current Plan: {currentSubscription.plan}
              </h3>
              <Badge className="bg-green-100 text-green-700">Active</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Started on {new Date(currentSubscription.startDate).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-foreground">${currentSubscription.price}</p>
            <p className="text-sm text-muted-foreground">per month</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="font-medium">Invoice Usage</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {currentSubscription.invoiceUsed} / {currentSubscription.invoiceLimit}
              </span>
            </div>
            <Progress value={invoiceUsagePercent} className="h-2" />
          </div>
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                <span className="font-medium">User Seats</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {currentSubscription.userCount} / {currentSubscription.userLimit}
              </span>
            </div>
            <Progress value={userUsagePercent} className="h-2" />
          </div>
        </div>
      </Card>

      {/* Available Plans */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Available Plans</h2>
        <div className="grid gap-6 lg:grid-cols-4">
          {plans.map((plan) => {
            const isCurrentPlan =
              plan.name.toLowerCase() === currentSubscription.plan.toLowerCase();
            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col p-6 ${
                  plan.popular ? 'border-2 border-blue-500' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute right-0 top-0 rounded-bl-lg bg-blue-500 px-3 py-1">
                    <span className="text-xs font-semibold text-white">Popular</span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </div>
                <div className="mb-6 flex-1 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {plan.max_invoices === null
                      ? 'Unlimited invoices'
                      : `${plan.max_invoices} invoices/month`}
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {plan.max_users === null
                      ? 'Unlimited users'
                      : `Up to ${plan.max_users} users`}
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {plan.ocr_accuracy}% OCR accuracy
                  </div>
                </div>
                <Button
                  className="w-full"
                  variant={isCurrentPlan ? 'outline' : 'default'}
                  disabled={isCurrentPlan}
                  onClick={() => handleUpgradeClick(plan)}
                >
                  {isCurrentPlan ? 'Current Plan' : 'Upgrade'}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Usage Insights */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-semibold">Monthly Trend</h3>
          </div>
          <p className="text-2xl font-bold">+23%</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Invoice submissions vs last month
          </p>
        </Card>
        <Card className="p-6">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="font-semibold">Active Users</h3>
          </div>
          <p className="text-2xl font-bold">{currentSubscription.userCount}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            out of {currentSubscription.userLimit} seats
          </p>
        </Card>
        <Card className="p-6">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <Zap className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="font-semibold">Efficiency</h3>
          </div>
          <p className="text-2xl font-bold">2.4h</p>
          <p className="mt-1 text-sm text-muted-foreground">Average processing time</p>
        </Card>
      </div>

      {/* Payment Modal */}
      {paymentModal.isOpen && paymentModal.plan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            
            {/* Close button */}
            <button
              onClick={() => setPaymentModal({ isOpen: false, plan: null, amountCharged: 0, credit: 0 })}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-800">Complete Your Upgrade</h2>
              <p className="mt-1 text-sm text-slate-500">
                Upgrading to <span className="font-semibold">{paymentModal.plan.name}</span> plan
              </p>
            </div>

            {/* Order Summary */}
            <div className="mb-6 rounded-lg bg-slate-50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">{paymentModal.plan.name} Plan</span>
                  <span className="font-medium">${paymentModal.plan.price}/mo</span>
                </div>
                {paymentModal.credit > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Credit (unused days)</span>
                    <span>-${paymentModal.credit}</span>
                  </div>
                )}
                <div className="border-t pt-2">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Total Due Today</span>
                    <span>${paymentModal.amountCharged}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="cardName">Cardholder Name</Label>
                <Input
                  id="cardName"
                  placeholder="John Doe"
                  value={cardData.cardName}
                  onChange={(e) => setCardData({ ...cardData, cardName: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="cardNumber">Card Number</Label>
                <div className="relative mt-1">
                  <Input
                    id="cardNumber"
                    placeholder="1234 5678 9012 3456"
                    value={cardData.cardNumber}
                    onChange={(e) =>
                      setCardData({ ...cardData, cardNumber: formatCardNumber(e.target.value) })
                    }
                    maxLength={19}
                  />
                  <CreditCard className="absolute right-3 top-2.5 h-5 w-5 text-slate-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiry">Expiry Date</Label>
                  <Input
                    id="expiry"
                    placeholder="MM/YY"
                    value={cardData.expiry}
                    onChange={(e) =>
                      setCardData({ ...cardData, expiry: formatExpiry(e.target.value) })
                    }
                    maxLength={5}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="cvc">CVC</Label>
                  <Input
                    id="cvc"
                    placeholder="123"
                    value={cardData.cvc}
                    onChange={(e) =>
                      setCardData({
                        ...cardData,
                        cvc: e.target.value.replace(/\D/g, '').slice(0, 4),
                      })
                    }
                    maxLength={4}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Security note */}
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 p-3">
              <Lock className="h-4 w-4 text-green-600" />
              <p className="text-xs text-green-700">
                Your payment is encrypted and secure
              </p>
            </div>

            {/* Submit */}
            <Button
              className="mt-6 w-full"
              onClick={handlePaymentSubmit}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Processing...
                </span>
              ) : (
                `Pay $${paymentModal.amountCharged}`
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}