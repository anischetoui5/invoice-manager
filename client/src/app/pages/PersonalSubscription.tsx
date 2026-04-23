import { useState, useEffect } from 'react';
import { Check, ArrowLeft, Sparkles } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { useNavigate, useSearchParams, useOutletContext } from 'react-router-dom';
import api from '../../lib/api';
import { toast } from 'sonner';

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
  user?: { planType: 'free' | 'basic' | 'plus' | 'premium' };
  usage?: { invoicesUsed: number; storageUsed: number };
}

export function PersonalSubscription() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState<PersonalPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isRegistration = searchParams.get('from') === 'registration' ||
                         searchParams.get('from') === 'onboarding';

  const context = useOutletContext<PersonalContext>();
  const currentPlan = isRegistration ? null : (context?.user?.planType || 'free');
  const invoicesUsed = context?.usage?.invoicesUsed || 0;
  const storageUsed = context?.usage?.storageUsed || 0;

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await api.get('/subscriptions/plans?type=personal');
        setPlans(response.data);
      } catch (err) {
        toast.error('Failed to load plans');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const handleSelectPlan = async (planName: string) => {
    if (isRegistration) {
      const pending = localStorage.getItem('pendingRegistration');
      if (!pending) {
        toast.error('Registration data lost. Please start again.');
        navigate('/register');
        return;
      }
      try {
        const { name, email, password } = JSON.parse(pending);
        const response = await api.post('/auth/register', {
          name,
          email,
          password,
          registrationType: 'personal',
          plan: planName,
        });
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.removeItem('pendingRegistration');
        toast.success('Account created successfully!');
        navigate('/dashboard');
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Registration failed');
      }
    } else {
      toast.success('Plan updated!');
      navigate('/dashboard');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading plans...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

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

        {/* Current usage - only show when not registering */}
        {!isRegistration && currentPlan && (
          <Card className="mb-8 p-6">
            <div className="mb-4 flex items-center gap-3">
              <h3 className="text-xl font-semibold">Current Plan: {currentPlan}</h3>
              <Badge className="bg-green-100 text-green-700">Active</Badge>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span>Invoices Used</span>
                  <span>{invoicesUsed}</span>
                </div>
                <Progress value={(invoicesUsed / 10) * 100} className="h-2" />
              </div>
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span>Storage Used</span>
                  <span>{storageUsed} GB</span>
                </div>
                <Progress value={(storageUsed / 5) * 100} className="h-2" />
              </div>
            </div>
          </Card>
        )}

        {/* Plan Cards */}
        <div className="grid gap-6 lg:grid-cols-4">
          {plans.map((plan) => {
            const isCurrentUserPlan = !isRegistration &&
              plan.name.toLowerCase() === currentPlan?.toLowerCase();

            return (
              <Card key={plan.id} className="relative flex flex-col p-6">
                <div className="mb-6">
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>
                </div>

                <div className="mb-6 flex-1 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {plan.max_invoices === -1 ? 'Unlimited invoices' : `${plan.max_invoices} invoices/month`}
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {plan.ocr_accuracy}% OCR accuracy
                  </div>
                </div>

                <Button
                  className="w-full"
                  variant={isCurrentUserPlan ? 'outline' : 'default'}
                  disabled={isCurrentUserPlan}
                  onClick={async () => {
                    if (isRegistration) {
                      handleSelectPlan(plan.name.toLowerCase());
                    } else {
                      try {
                        await api.patch('/subscriptions/upgrade', { planId: plan.id });
                        toast.success(`Upgraded to ${plan.name}!`);
                        window.location.reload();
                      } catch (err: any) {
                        toast.error(err.response?.data?.error || 'Upgrade failed');
                      }
                    }
                  }}
                >
                  {isRegistration
                    ? 'Select Plan'
                    : isCurrentUserPlan ? 'Current Plan' : 'Upgrade Now'}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}