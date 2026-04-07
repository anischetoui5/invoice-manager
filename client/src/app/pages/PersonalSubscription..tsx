import { Check, ArrowLeft, Sparkles, Star, Zap, Shield, TrendingUp } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { useNavigate, useSearchParams, useOutletContext } from 'react-router-dom';

// 1. Types for our data safety
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
  const isRegistration = searchParams.get('from') === 'registration';
  
  // 2. Grab real data from context (with fallback for testing)
  const context = useOutletContext<PersonalContext>();

  const fakeData: PersonalContext = {
    user: { planType: 'free' },
    usage: { invoicesUsed: 8, storageUsed: 2.3 }
  };

  // Use real context if available, otherwise use fakeData
  const activeData = context?.user ? context : fakeData;
  const currentPlan = activeData.user?.planType || 'free';

  // 3. Plan Logic Mapping
  const limitsMap = {
    free: { invoices: 10, storage: 5 },
    basic: { invoices: 50, storage: 25 },
    plus: { invoices: 200, storage: 100 },
    premium: { invoices: -1, storage: 500 },
  };

  const currentLimits = limitsMap[currentPlan];
  const invoicesUsed = activeData.usage?.invoicesUsed || 0;
  const storageUsed = activeData.usage?.storageUsed || 0;

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
      features: ['10 invoices per month', '5 GB storage', 'Basic OCR (85% accuracy)', 'Standard validation', '3 months history', 'Email support', 'Mobile app access'],
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
      features: ['50 invoices per month', '25 GB storage', 'Advanced OCR (92% accuracy)', 'Priority validation', '12 months history', 'Priority email support', 'Mobile app access', 'Export to PDF/Excel', 'Basic analytics'],
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
      description: 'For professionals with higher volume needs',
      features: ['200 invoices per month', '100 GB storage', 'Premium OCR (96% accuracy)', 'Express validation', '24 months history', 'Priority chat support', 'Mobile app access', 'Export to all formats', 'Advanced analytics & reports', 'Custom categories', 'Recurring invoice templates'],
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
      features: ['Unlimited invoices', '500 GB storage', 'AI-powered OCR (99% accuracy)', 'Instant validation', 'Unlimited history', '24/7 priority support', 'Mobile app access', 'Export to all formats', 'Premium analytics & insights', 'Custom categories & tags', 'Recurring invoice automation', 'API access', 'Multi-device sync', 'Advanced security features'],
      invoiceLimit: -1,
      storageGB: 500,
      ocrAccuracy: 99,
      historyMonths: -1,
    },
  ];

  const handleSelectPlan = (planType: string) => {
    console.log('Action for:', planType);
    if (isRegistration || planType !== 'free') {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
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
            <h1 className="text-3xl font-bold text-slate-800">Personal Subscription Plans</h1>
            <p className="mt-2 text-lg text-slate-600">
              {isRegistration ? 'Choose the plan that fits your needs' : 'Upgrade your personal account for more features'}
            </p>
          </div>
        </div>

        {/* Current Plan Usage */}
        {!isRegistration && (
          <Card className="mb-8 p-6">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-semibold text-slate-800">
                    Current Plan: {personalPlans.find(p => p.type === currentPlan)?.name || 'Free'}
                  </h3>
                  <Badge className="bg-green-100 text-green-700">Active</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {currentPlan === 'free' ? 'You are on the free plan' : 'Next billing date: April 15, 2026'}
                </p>
              </div>
              {currentPlan !== 'free' && (
                <div className="text-right">
                  <p className="text-3xl font-bold text-slate-800">${personalPlans.find(p => p.type === currentPlan)?.price}</p>
                  <p className="text-sm text-slate-600">per month</p>
                </div>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-medium text-slate-800">Invoices This Month</span>
                  <span className="text-sm text-slate-600">
                    {invoicesUsed} / {currentLimits.invoices === -1 ? '∞' : currentLimits.invoices}
                  </span>
                </div>
                {currentLimits.invoices !== -1 && (
                  <>
                    <Progress value={invoiceUsagePercent} className="h-2" />
                    <p className="mt-2 text-xs text-slate-600">
                      {currentLimits.invoices - invoicesUsed} invoices remaining
                    </p>
                  </>
                )}
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-medium text-slate-800">Storage Used</span>
                  <span className="text-sm text-slate-600">
                    {storageUsed} GB / {currentLimits.storage} GB
                  </span>
                </div>
                <Progress value={storageUsagePercent} className="h-2" />
                <p className="mt-2 text-xs text-slate-600">
                  {(currentLimits.storage - storageUsed).toFixed(1)} GB available
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Plan Comparison */}
        <div className="mb-8 grid gap-6 lg:grid-cols-4">
          {personalPlans.map((plan) => {
            const isCurrentUserPlan = !isRegistration && plan.type === currentPlan;
            return (
              <Card key={plan.type} className={`relative flex flex-col overflow-hidden p-6 ${plan.popular || plan.recommended ? 'border-2 border-blue-500 shadow-lg' : ''}`}>
                {(plan.popular || plan.recommended) && (
                  <div className={`absolute right-0 top-0 rounded-bl-lg px-3 py-1 ${plan.recommended ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-blue-500'}`}>
                    <span className="text-xs font-semibold text-white">{plan.recommended ? 'Recommended' : 'Most Popular'}</span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-slate-800">{plan.name}</h3>
                  <p className="mt-2 min-h-[40px] text-sm text-slate-600">{plan.description}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-slate-800">{plan.price === 0 ? 'Free' : `$${plan.price}`}</span>
                    {plan.price !== 0 && <span className="text-slate-600">/month</span>}
                  </div>
                </div>

                <div className="mb-4 space-y-2 rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Invoices/mo:</span>
                    <span className="font-semibold text-slate-800">{plan.invoiceLimit === -1 ? 'Unlimited' : plan.invoiceLimit}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Storage:</span>
                    <span className="font-semibold text-slate-800">{plan.storageGB} GB</span>
                  </div>
                </div>

                <div className="mb-6 flex-1 space-y-2.5">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                        <Check className="h-3 w-3 text-green-600" />
                      </div>
                      <span className="text-sm text-slate-700">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  className="w-full"
                  variant={isCurrentUserPlan ? 'outline' : (plan.popular || plan.recommended ? 'default' : 'outline')}
                  disabled={isCurrentUserPlan}
                  onClick={() => handleSelectPlan(plan.type)}
                >
                  {isCurrentUserPlan ? 'Current Plan' : (plan.type === 'free' ? 'Start Free' : (isRegistration ? 'Choose Plan' : 'Upgrade'))}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}