import { useState, useEffect } from 'react';
import { Check, CreditCard, Users, FileText, Zap, TrendingUp } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
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

export function Subscription() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { currentSubscription: realSubscription } = useOutletContext<{
    currentSubscription: SubscriptionType
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

  const invoiceUsagePercent = currentSubscription.invoiceLimit > 0
    ? (currentSubscription.invoiceUsed / currentSubscription.invoiceLimit) * 100
    : 0;
  const userUsagePercent = currentSubscription.userLimit > 0
    ? (currentSubscription.userCount / currentSubscription.userLimit) * 100
    : 0;

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
        <p className="mt-1 text-muted-foreground">Manage your subscription plan and view usage</p>
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

      {/* Available Plans from DB */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Available Plans</h2>
        <div className="grid gap-6 lg:grid-cols-4">
          {plans.map((plan) => {
            const isCurrentPlan = plan.name.toLowerCase() === currentSubscription.plan.toLowerCase();
            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col p-6 ${plan.popular ? 'border-2 border-blue-500' : ''}`}
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
                    {plan.max_invoices === null ? 'Unlimited invoices' : `${plan.max_invoices} invoices/month`}
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {plan.max_users === null ? 'Unlimited users' : `Up to ${plan.max_users} users`}
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
          <p className="mt-1 text-sm text-muted-foreground">Invoice submissions vs last month</p>
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
    </div>
  );
}