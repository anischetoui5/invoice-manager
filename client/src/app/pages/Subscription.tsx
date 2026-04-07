import { Check, CreditCard, TrendingUp, Users, FileText, Zap } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import type { Subscription as SubscriptionType } from '../types';

export function Subscription() {
  // 1. Grab the real subscription data from the Layout context
  const { currentSubscription: realSubscription } = useOutletContext<{ 
    currentSubscription: SubscriptionType 
  }>();

  // --- FAKE DATA FOR TESTING ---
  const fakeSubscription: SubscriptionType = {
    id: 'sub_12345',          // Added missing id
    enterpriseId: 'ent_9876', // Added missing enterpriseId
    status: 'active',         // Added missing status
    plan: 'pro',
    price: 99,
    startDate: '2024-01-01',
    invoiceUsed: 342,
    invoiceLimit: 500,
    userCount: 12,
    userLimit: 20,
    features: [
      'Up to 500 invoices per month',
      'Up to 20 users',
      'Advanced OCR with 95% accuracy',
      'Custom validation workflows',
      'Priority support'
    ]
  };

  // Switch this to realSubscription when your Layout.tsx is ready
  const currentSubscription = realSubscription || fakeSubscription;

  // 2. Safety check: Commented out for layout testing
  /*
  if (!currentSubscription) {
    return <div className="p-8 text-center text-slate-600">Loading subscription details...</div>;
  }
  */

  const invoiceUsagePercent = (currentSubscription.invoiceUsed / currentSubscription.invoiceLimit) * 100;
  const userUsagePercent = (currentSubscription.userCount / currentSubscription.userLimit) * 100;

  const plans = [
    {
      name: 'Basic',
      price: 29,
      type: 'basic' as const,
      description: 'Perfect for small teams getting started',
      features: [
        'Up to 100 invoices per month',
        'Up to 5 users',
        'Basic OCR with 85% accuracy',
        'Standard validation workflows',
        'Email support',
        'Basic analytics',
      ],
      invoiceLimit: 100,
      userLimit: 5,
    },
    {
      name: 'Pro',
      price: 99,
      type: 'pro' as const,
      description: 'For growing businesses with advanced needs',
      features: [
        'Up to 500 invoices per month',
        'Up to 20 users',
        'Advanced OCR with 95% accuracy',
        'Custom validation workflows',
        'Priority support',
        'Advanced analytics and reports',
        'API access',
      ],
      invoiceLimit: 500,
      userLimit: 20,
      popular: true,
    },
    {
      name: 'Enterprise',
      price: 299,
      type: 'enterprise' as const,
      description: 'For large organizations with custom requirements',
      features: [
        'Unlimited invoices',
        'Unlimited users',
        'Premium OCR with 99% accuracy',
        'Fully customizable workflows',
        'Dedicated account manager',
        'Custom integrations',
        'SLA guarantee',
        'Advanced security features',
      ],
      invoiceLimit: -1,
      userLimit: -1,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Subscription & Billing</h1>
        <p className="mt-1 text-slate-600">
          Manage your subscription plan and view usage
        </p>
      </div>

      {/* Current Plan */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-semibold text-slate-800">Current Plan: {plans.find(p => p.type === currentSubscription.plan)?.name}</h3>
              <Badge className="bg-green-100 text-green-700">Active</Badge>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Started on {new Date(currentSubscription.startDate).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-slate-800">${currentSubscription.price}</p>
            <p className="text-sm text-slate-600">per month</p>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-slate-800">Invoice Usage</span>
              </div>
              <span className="text-sm text-slate-600">
                {currentSubscription.invoiceUsed} / {currentSubscription.invoiceLimit}
              </span>
            </div>
            <Progress value={invoiceUsagePercent} className="h-2" />
            <p className="mt-2 text-xs text-slate-600">
              {currentSubscription.invoiceLimit - currentSubscription.invoiceUsed} invoices remaining this month
            </p>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                <span className="font-medium text-slate-800">User Seats</span>
              </div>
              <span className="text-sm text-slate-600">
                {currentSubscription.userCount} / {currentSubscription.userLimit}
              </span>
            </div>
            <Progress value={userUsagePercent} className="h-2" />
            <p className="mt-2 text-xs text-slate-600">
              {currentSubscription.userLimit - currentSubscription.userCount} user seats available
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="mt-6 border-t pt-6">
          <h4 className="mb-4 font-medium text-slate-800">Your Plan Features</h4>
          <div className="grid gap-3 md:grid-cols-2">
            {currentSubscription.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
                  <Check className="h-3 w-3 text-green-600" />
                </div>
                <span className="text-sm text-slate-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Available Plans */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-slate-800">Available Plans</h2>
        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => {
            const isCurrentPlan = plan.type === currentSubscription.plan;

            return (
              <Card
                key={plan.type}
                className={`relative overflow-hidden p-6 ${plan.popular ? 'border-blue-500 border-2' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute right-0 top-0 rounded-bl-lg bg-blue-500 px-3 py-1">
                    <span className="text-xs font-semibold text-white">Most Popular</span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-slate-800">{plan.name}</h3>
                  <p className="mt-1 text-sm text-slate-600">{plan.description}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-slate-800">${plan.price}</span>
                    <span className="text-slate-600">/month</span>
                  </div>
                </div>

                <div className="mb-6 space-y-3">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                        <Check className="h-3 w-3 text-green-600" />
                      </div>
                      <span className="text-sm text-slate-700">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  className="w-full"
                  variant={isCurrentPlan ? 'outline' : plan.popular ? 'default' : 'outline'}
                  disabled={isCurrentPlan}
                >
                  {isCurrentPlan ? 'Current Plan' : plan.type === 'enterprise' ? 'Contact Sales' : 'Upgrade'}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Billing History */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Billing History</h3>
          <Button variant="outline" size="sm">
            <CreditCard className="mr-2 h-4 w-4" />
            Update Payment Method
          </Button>
        </div>
        <div className="space-y-3">
          {[
            { date: '2024-03-01', amount: 99, status: 'Paid', invoice: 'INV-2024-003' },
            { date: '2024-02-01', amount: 99, status: 'Paid', invoice: 'INV-2024-002' },
            { date: '2024-01-15', amount: 99, status: 'Paid', invoice: 'INV-2024-001' },
          ].map((bill) => (
            <div key={bill.invoice} className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                  <CreditCard className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-800">{bill.invoice}</p>
                  <p className="text-sm text-slate-600">{new Date(bill.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge className="bg-green-100 text-green-700">{bill.status}</Badge>
                <span className="font-medium text-slate-800">${bill.amount}</span>
                <Button variant="outline" size="sm">
                  Download
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Usage Insights */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-800">Monthly Trend</h3>
          </div>
          <p className="text-2xl font-bold text-slate-800">+23%</p>
          <p className="text-sm text-slate-600 mt-1">Invoice submissions vs last month</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-slate-800">Active Users</h3>
          </div>
          <p className="text-2xl font-bold text-slate-800">{currentSubscription.userCount}</p>
          <p className="text-sm text-slate-600 mt-1">out of {currentSubscription.userLimit} seats</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <Zap className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-slate-800">Efficiency</h3>
          </div>
          <p className="text-2xl font-bold text-slate-800">2.4h</p>
          <p className="text-sm text-slate-600 mt-1">Average processing time</p>
        </Card>
      </div>
    </div>
  );
}