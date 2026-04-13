import { Check, ArrowLeft, Sparkles, Star, Zap, Shield, TrendingUp } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { useNavigate, useSearchParams, useOutletContext } from 'react-router-dom';
import api from '../../lib/api';
import { toast } from 'sonner';

// 1. Types for data safety
interface PersonalPlan {
  name: string;
  price: number;
  type: 'free' | 'basic' | 'plus' | 'premium';
  description: string;
  features: string[];
  invoiceLimit: number;
  storageGB: number;
  ocrAccuracy: number;
  historyMonths: number;
  popular?: boolean;
  recommended?: boolean;
}

interface PersonalContext {
  user?: {
    planType: 'free' | 'basic' | 'plus' | 'premium';
  };
  usage?: {
    invoicesUsed: number;
    storageUsed: number;
  }
}

export function PersonalSubscription() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // FACE DETECTION: Detects both 'registration' and 'onboarding' from the URL
  const isRegistration = searchParams.get('from') === 'registration' || 
                         searchParams.get('from') === 'onboarding';
  
  const context = useOutletContext<PersonalContext>();

  // If registering, we treat currentPlan as null so all buttons are active
  const currentPlan = isRegistration ? null : (context?.user?.planType || 'free');

  const limitsMap = {
    free: { invoices: 10, storage: 5 },
    basic: { invoices: 50, storage: 25 },
    plus: { invoices: 200, storage: 100 },
    premium: { invoices: -1, storage: 500 },
  };

  const activePlanData = context?.user ? context : { usage: { invoicesUsed: 0, storageUsed: 0 } };
  const currentLimits = currentPlan ? limitsMap[currentPlan] : limitsMap['free'];
  const invoicesUsed = activePlanData.usage?.invoicesUsed || 0;
  const storageUsed = activePlanData.usage?.storageUsed || 0;

  const invoiceUsagePercent = currentLimits.invoices === -1 
    ? 0 
    : (invoicesUsed / currentLimits.invoices) * 100;
  const storageUsagePercent = (storageUsed / currentLimits.storage) * 100;

  const personalPlans: PersonalPlan[] = [
    {
      name: 'Free',
      price: 0,
      type: 'free',
      description: 'Perfect for trying out our service',
      features: ['10 invoices per month', '5 GB storage', 'Basic OCR (85% accuracy)', '3 months history', 'Mobile app access'],
      invoiceLimit: 10,
      storageGB: 5,
      ocrAccuracy: 85,
      historyMonths: 3,
    },
    {
      name: 'Basic',
      price: 9,
      type: 'basic',
      description: 'Great for freelancers and individuals',
      features: ['50 invoices per month', '25 GB storage', 'Advanced OCR (92% accuracy)', '12 months history', 'Export to PDF/Excel'],
      invoiceLimit: 50,
      storageGB: 25,
      ocrAccuracy: 92,
      historyMonths: 12,
      popular: true,
    },
    {
      name: 'Plus',
      price: 19,
      type: 'plus',
      description: 'For professionals with higher volume',
      features: ['200 invoices per month', '100 GB storage', 'Premium OCR (96% accuracy)', '24 months history', 'Advanced analytics'],
      invoiceLimit: 200,
      storageGB: 100,
      ocrAccuracy: 96,
      historyMonths: 24,
      recommended: true,
    },
    {
      name: 'Premium',
      price: 39,
      type: 'premium',
      description: 'Ultimate features for power users',
      features: ['Unlimited invoices', '500 GB storage', 'AI-powered OCR (99% accuracy)', 'Unlimited history', 'API access'],
      invoiceLimit: -1,
      storageGB: 500,
      ocrAccuracy: 99,
      historyMonths: -1,
    },
  ];

const handleSelectPlan = async (planType: string) => {
  if (isRegistration) {
    // Get the pending registration data from localStorage
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
        plan: planType,
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      if (response.data.personalWorkspaceId) {
        localStorage.setItem('activeWorkspaceId', response.data.personalWorkspaceId);
      }
      localStorage.removeItem('pendingRegistration');

      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    }
  } else {
    // Already logged in, just upgrading plan
    navigate('/dashboard');
  }
};

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Header Section */}
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
              {isRegistration ? 'Complete your registration by selecting a plan below.' : 'Upgrade your account to unlock more features.'}
            </p>
          </div>
        </div>

        {/* Current Plan Usage - STRICTLY HIDDEN DURING REGISTRATION */}
        {!isRegistration && currentPlan && (
          <Card className="mb-8 p-6">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-semibold text-foreground">
                    Current Plan: {personalPlans.find(p => p.type === currentPlan)?.name}
                  </h3>
                  <Badge className="bg-green-100 text-green-700">Active</Badge>
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="mb-3 flex items-center justify-between font-medium">
                  <span>Invoices This Month</span>
                  <span className="text-sm">{invoicesUsed} / {currentLimits.invoices === -1 ? '∞' : currentLimits.invoices}</span>
                </div>
                <Progress value={invoiceUsagePercent} className="h-2" />
              </div>
              <div>
                <div className="mb-3 flex items-center justify-between font-medium">
                  <span>Storage Used</span>
                  <span className="text-sm">{storageUsed} GB / {currentLimits.storage} GB</span>
                </div>
                <Progress value={storageUsagePercent} className="h-2" />
              </div>
            </div>
          </Card>
        )}

        {/* Plan Cards Grid */}
        <div className="grid gap-6 lg:grid-cols-4">
          {personalPlans.map((plan) => {
            const isCurrentUserPlan = !isRegistration && plan.type === currentPlan;
            
            return (
              <Card key={plan.type} className={`relative flex flex-col p-6 ${plan.popular || plan.recommended ? 'border-2 border-blue-500 shadow-lg' : ''}`}>
                {(plan.popular || plan.recommended) && (
                  <div className={`absolute right-0 top-0 px-3 py-1 text-xs font-bold text-white ${plan.recommended ? 'bg-purple-600' : 'bg-blue-500'}`}>
                    {plan.recommended ? 'Recommended' : 'Popular'}
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
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" /> {f}
                    </div>
                  ))}
                </div>

                <Button
                  className="w-full"
                  variant={isCurrentUserPlan ? 'outline' : 'default'}
                  disabled={isCurrentUserPlan}
                  onClick={() => handleSelectPlan(plan.type)}
                >
                  {isRegistration 
                    ? 'Select Plan' 
                    : (isCurrentUserPlan ? 'Current Plan' : 'Upgrade Now')}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}