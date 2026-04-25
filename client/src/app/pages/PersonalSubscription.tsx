import { useState, useEffect } from 'react';
import { Check, ArrowLeft, Sparkles, CreditCard, X, Lock, AlertCircle } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useNavigate, useSearchParams, useOutletContext } from 'react-router-dom';
import api from '../../lib/api';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PersonalPlan {
  id: number;
  name: string;
  price: number;
  plan_type: string;
  max_invoices: number;
  ocr_accuracy: number;
  is_active: boolean;
}

interface PersonalContext {
  user?: { planType: string };
  usage?: { invoicesUsed: number; storageUsed: number };
}

interface ConfirmModal {
  isOpen: boolean;
  plan: PersonalPlan | null;
  currentPlanName: string | null;
  cycleEndDate: string | null;
}

interface PaymentModal {
  isOpen: boolean;
  plan: PersonalPlan | null;
  amountCharged: number;
  /** true = register after payment, false = upgrade after payment */
  isRegistration: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCardNumber = (value: string) =>
  value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

const formatExpiry = (value: string) => {
  const clean = value.replace(/\D/g, '').slice(0, 4);
  return clean.length >= 2 ? `${clean.slice(0, 2)}/${clean.slice(2)}` : clean;
};

const formatCycleEnd = (dateStr: string | null) => {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
};

// ─── Component ────────────────────────────────────────────────────────────────

export function PersonalSubscription() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isRegistration =
    searchParams.get('from') === 'registration' ||
    searchParams.get('from') === 'onboarding';

  const context = useOutletContext<PersonalContext>();
  const currentPlan = isRegistration ? null : (context?.user?.planType || 'free');
  const invoicesUsed = context?.usage?.invoicesUsed || 0;
  const storageUsed  = context?.usage?.storageUsed  || 0;

  // ── State ──
  const [plans, setPlans]             = useState<PersonalPlan[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [confirmModal, setConfirmModal] = useState<ConfirmModal>({
    isOpen: false, plan: null, currentPlanName: null, cycleEndDate: null,
  });

  const [paymentModal, setPaymentModal] = useState<PaymentModal>({
    isOpen: false, plan: null, amountCharged: 0, isRegistration: false,
  });

  const [cardData, setCardData] = useState({
    cardName: '', cardNumber: '', expiry: '', cvc: '',
  });

  // ── Fetch plans ──
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await api.get('/subscriptions/plans?type=personal');
        setPlans(response.data);
      } catch {
        toast.error('Failed to load plans');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPlans();
  }, []);

  // ── Card validation ──
  const validateCard = () => {
    const cleanCard = cardData.cardNumber.replace(/\s/g, '');
    if (!cardData.cardName.trim())   { toast.error('Please enter cardholder name'); return false; }
    if (cleanCard.length !== 16)     { toast.error('Card number must be 16 digits'); return false; }
    if (cardData.expiry.length !== 5){ toast.error('Please enter a valid expiry date (MM/YY)'); return false; }
    if (cardData.cvc.length < 3)     { toast.error('CVC must be 3 or 4 digits'); return false; }
    return true;
  };

  const resetCard = () =>
    setCardData({ cardName: '', cardNumber: '', expiry: '', cvc: '' });

  // ─────────────────────────────────────────────────────────────────────────────
  // FLOW 1 — Registration: click plan → payment modal → register
  // ─────────────────────────────────────────────────────────────────────────────
  const handleRegistrationPlanClick = (plan: PersonalPlan) => {
    setPaymentModal({
      isOpen: true,
      plan,
      amountCharged: parseFloat(plan.price.toString()),
      isRegistration: true,
    });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // FLOW 2 — Logged-in upgrade: click plan → confirmation modal → payment modal → upgrade
  // ─────────────────────────────────────────────────────────────────────────────
  const handleUpgradeClick = async (plan: PersonalPlan) => {
    try {
      const response = await api.get(`/subscriptions/preview-upgrade?planId=${plan.id}`);
      const { currentPlanName, cycleEndDate } = response.data;
      setConfirmModal({ isOpen: true, plan, currentPlanName, cycleEndDate });
    } catch {
      // Fallback: open confirmation with no cycle info
      setConfirmModal({ isOpen: true, plan, currentPlanName: currentPlan, cycleEndDate: null });
    }
  };

  const handleConfirmUpgrade = () => {
    if (!confirmModal.plan) return;
    setConfirmModal({ isOpen: false, plan: null, currentPlanName: null, cycleEndDate: null });
    setPaymentModal({
      isOpen: true,
      plan: confirmModal.plan,
      amountCharged: parseFloat(confirmModal.plan.price.toString()),
      isRegistration: false,
    });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Payment submit — handles both registration and upgrade
  // ─────────────────────────────────────────────────────────────────────────────
  const handlePaymentSubmit = async () => {
    if (!validateCard() || !paymentModal.plan) return;
    setIsProcessing(true);

    try {
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (paymentModal.isRegistration) {
        // ── Register ──
        const pending = localStorage.getItem('pendingRegistration');
        if (!pending) {
          toast.error('Registration data lost. Please start again.');
          navigate('/register');
          return;
        }

        const { name, email, password } = JSON.parse(pending);
        const response = await api.post('/auth/register', {
          name,
          email,
          password,
          registrationType: 'personal',
          plan: paymentModal.plan.name.toLowerCase(),
        });

        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        if (response.data.activeWorkspaceId) {
          localStorage.setItem('activeWorkspaceId', String(response.data.activeWorkspaceId));
        }
        localStorage.removeItem('pendingRegistration');

        toast.success('Account created successfully!');
        navigate('/dashboard');

      } else {
        // ── Upgrade ──
        await api.patch('/subscriptions/upgrade', { planId: paymentModal.plan.id });
        toast.success(`Upgraded to ${paymentModal.plan.name}!`);
        setTimeout(() => window.location.reload(), 1000);
      }

      setPaymentModal({ isOpen: false, plan: null, amountCharged: 0, isRegistration: false });
      resetCard();

    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading plans...</p>
      </div>
    );
  }

  // Find current plan data for usage bar limits
  const currentPlanData = plans.find(p => p.name.toLowerCase() === currentPlan?.toLowerCase());
  const invoiceLimit    = currentPlanData?.max_invoices ?? 10;
  const invoiceUsagePct = invoiceLimit === -1 ? 0 : Math.min((invoicesUsed / invoiceLimit) * 100, 100);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <div className="mb-8">
          {!isRegistration && (
            <Button variant="ghost" className="mb-4" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          )}
          <div className="text-center">
            <div className="mb-3 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              {isRegistration ? 'Final Step: Choose Your Plan' : 'Personal Subscription Plans'}
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              {isRegistration
                ? 'Complete your registration by selecting a plan below.'
                : 'Upgrade your account to unlock more features.'}
            </p>
          </div>
        </div>

        {/* ── Current usage (logged-in only) ── */}
        {!isRegistration && currentPlan && (
          <Card className="mb-8 p-6">
            <div className="mb-4 flex items-center gap-3">
              <h3 className="text-xl font-semibold">
                Current Plan: {currentPlanData?.name || currentPlan}
              </h3>
              <Badge className="bg-green-100 text-green-700">Active</Badge>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="mb-2 flex justify-between text-sm font-medium">
                  <span>Invoices Used</span>
                  <span>{invoicesUsed} / {invoiceLimit === -1 ? '∞' : invoiceLimit}</span>
                </div>
                <Progress value={invoiceUsagePct} className="h-2" />
              </div>
              <div>
                <div className="mb-2 flex justify-between text-sm font-medium">
                  <span>Storage Used</span>
                  <span>{storageUsed} GB</span>
                </div>
                <Progress value={Math.min(storageUsed * 10, 100)} className="h-2" />
              </div>
            </div>
          </Card>
        )}

        {/* ── Plan Cards ── */}
        <div className="grid gap-6 lg:grid-cols-4">
          {plans.map((plan) => {
            const isCurrentUserPlan =
              !isRegistration &&
              plan.name.toLowerCase() === currentPlan?.toLowerCase();

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col p-6 transition-shadow hover:shadow-md ${
                  plan.name.toLowerCase() === 'plus'
                    ? 'border-2 border-blue-500 shadow-lg'
                    : ''
                }`}
              >
                {plan.name.toLowerCase() === 'plus' && (
                  <div className="absolute right-0 top-0 rounded-bl-lg bg-blue-500 px-3 py-1">
                    <span className="text-xs font-semibold text-white">Popular</span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>
                </div>

                <div className="mb-6 flex-1 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-green-500" />
                    {plan.max_invoices === -1
                      ? 'Unlimited invoices'
                      : `${plan.max_invoices} invoices/month`}
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-green-500" />
                    {plan.ocr_accuracy}% OCR accuracy
                  </div>
                </div>

                <Button
                  className="w-full"
                  variant={isCurrentUserPlan ? 'outline' : 'default'}
                  disabled={isCurrentUserPlan}
                  onClick={() =>
                    isRegistration
                      ? handleRegistrationPlanClick(plan)
                      : isCurrentUserPlan
                        ? undefined
                        : handleUpgradeClick(plan)
                  }
                >
                  {isRegistration
                    ? 'Select Plan'
                    : isCurrentUserPlan
                      ? 'Current Plan'
                      : 'Upgrade Now'}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL 1 — Upgrade Confirmation (logged-in only)
      ════════════════════════════════════════════════════════════════════════ */}
      {confirmModal.isOpen && confirmModal.plan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <button
              onClick={() =>
                setConfirmModal({ isOpen: false, plan: null, currentPlanName: null, cycleEndDate: null })
              }
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-5">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Before you upgrade</h2>
              <p className="mt-1 text-sm text-slate-500">
                Please read the following before proceeding.
              </p>
            </div>

            <div className="mb-6 space-y-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
              <p>
                You are currently on the{' '}
                <span className="font-semibold">{confirmModal.currentPlanName || currentPlan}</span> plan.
              </p>
              {confirmModal.cycleEndDate && (
                <p>
                  Your current billing cycle ends on{' '}
                  <span className="font-semibold">
                    {formatCycleEnd(confirmModal.cycleEndDate)}
                  </span>.
                </p>
              )}
              <p className="font-medium text-amber-700">
                ⚠ Personal plans do not carry over unused days. Upgrading now will charge you the
                full price of the <span className="font-semibold">{confirmModal.plan.name}</span> plan (
                <span className="font-semibold">${confirmModal.plan.price}/mo</span>) immediately.
              </p>
              <p>You can also wait until your current cycle ends and upgrade then.</p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() =>
                  setConfirmModal({ isOpen: false, plan: null, currentPlanName: null, cycleEndDate: null })
                }
              >
                Wait Until Cycle Ends
              </Button>
              <Button className="flex-1" onClick={handleConfirmUpgrade}>
                Upgrade Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL 2 — Payment
      ════════════════════════════════════════════════════════════════════════ */}
      {paymentModal.isOpen && paymentModal.plan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <button
              onClick={() => {
                setPaymentModal({ isOpen: false, plan: null, amountCharged: 0, isRegistration: false });
                resetCard();
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-800">
                {paymentModal.isRegistration ? 'Complete Registration' : 'Complete Your Upgrade'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {paymentModal.isRegistration
                  ? `You selected the ${paymentModal.plan.name} plan`
                  : `Upgrading to ${paymentModal.plan.name} plan`}
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
                <div className="flex justify-between text-slate-500">
                  <span>Credit applied</span>
                  <span>$0.00</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Total Due Today</span>
                    <span>${paymentModal.amountCharged.toFixed(2)}</span>
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

            <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 p-3">
              <Lock className="h-4 w-4 text-green-600" />
              <p className="text-xs text-green-700">Your payment is encrypted and secure</p>
            </div>

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
                `Pay $${paymentModal.amountCharged.toFixed(2)}`
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}