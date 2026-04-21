import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileText, User, Building2, CreditCard, Users, Check, ArrowLeft, Copy, Phone, Mail, MapPin, Crown } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { toast } from 'sonner';
import { RegistrationStepper } from '../components/RegistrationStepper';
import { Textarea } from '../components/ui/textarea';
import api from '../../lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

type RegistrationType = 'personal' | 'company' | 'join';
type JoinRole = 'employee' | 'accountant';
type CompanyCreationStep = 'type' | 'account' | 'company-setup' | 'subscription' | 'payment' | 'confirmation';

interface CompanyPlan {
  name: string;
  price: number;
  type: 'starter' | 'business' | 'professional' | 'enterprise';
  description: string;
  features: string[];
  invoiceLimit: number;
  userLimit: number;
  ocrAccuracy: number;
  popular?: boolean;
}

export function Register() {
  const navigate = useNavigate();
  const [registrationType, setRegistrationType] = useState<RegistrationType | null>(null);
  const [step, setStep] = useState<CompanyCreationStep>('type');
  const [joinRole, setJoinRole] = useState<JoinRole>('employee');
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'business' | 'professional' | 'enterprise'>('business');
  const [generatedCompanyCode, setGeneratedCompanyCode] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    companyCode: '',
    industry: '',
    companyEmail: '',
    companyPhone: '',
    companyAddress: '',
    cardNumber: '',
    cardExpiry: '',
    cardCVC: '',
    cardName: '',
  });

  const companyPlans: CompanyPlan[] = [
    {
      name: 'Starter',
      price: 49,
      type: 'starter',
      description: 'Perfect for small companies just getting started',
      features: [
        '200 invoices per month',
        'Up to 10 team members',
        'Basic OCR (90% accuracy)',
        'Standard validation workflow',
        'Email notifications',
        'Basic reports & analytics',
        'Email support (24h response)',
        '30-day data retention',
      ],
      invoiceLimit: 200,
      userLimit: 10,
      ocrAccuracy: 90,
    },
    {
      name: 'Business',
      price: 149,
      type: 'business',
      description: 'For growing businesses with higher volume',
      features: [
        '1,000 invoices per month',
        'Up to 50 team members',
        'Advanced OCR (95% accuracy)',
        'Custom validation workflows',
        'Multi-accountant support',
        'Advanced reports & analytics',
        'Priority support (4h response)',
        '1-year data retention',
        'API access',
        'Custom integrations',
      ],
      invoiceLimit: 1000,
      userLimit: 50,
      ocrAccuracy: 95,
      popular: true,
    },
    {
      name: 'Professional',
      price: 349,
      type: 'professional',
      description: 'For established companies with complex needs',
      features: [
        '5,000 invoices per month',
        'Up to 200 team members',
        'Premium OCR (98% accuracy)',
        'Fully customizable workflows',
        'Dedicated accountant assignments',
        'Custom dashboards & reports',
        'Priority support (1h response)',
        '3-year data retention',
        'Advanced API & webhooks',
        'White-label options',
        'Audit trail & compliance',
      ],
      invoiceLimit: 5000,
      userLimit: 200,
      ocrAccuracy: 98,
    },
    {
      name: 'Enterprise',
      price: 999,
      type: 'enterprise',
      description: 'For large organizations with custom requirements',
      features: [
        'Unlimited invoices',
        'Unlimited team members',
        'AI-powered OCR (99.5% accuracy)',
        'Enterprise-grade workflows',
        'Dedicated account manager',
        'Custom feature development',
        'Dedicated support (immediate)',
        'Unlimited data retention',
        'Enterprise API & SSO',
        'On-premise deployment option',
        'Advanced security & compliance',
        'SLA guarantee (99.9% uptime)',
      ],
      invoiceLimit: -1,
      userLimit: -1,
      ocrAccuracy: 99.5,
    },
  ];

  const industries = [
    'Technology', 'Healthcare', 'Finance', 'Retail',
    'Manufacturing', 'Education', 'Real Estate', 'Consulting', 'Other',
  ];

  const getStepNumber = (): number => {
    if (registrationType !== 'company') return 0;
    switch (step) {
      case 'account': return 1;
      case 'company-setup': return 2;
      case 'subscription': return 3;
      case 'payment': return 4;
      case 'confirmation': return 5;
      default: return 0;
    }
  };

  const registrationSteps = [
    { number: 1, label: 'Account' },
    { number: 2, label: 'Company' },
    { number: 3, label: 'Subscription' },
    { number: 4, label: 'Payment' },
    { number: 5, label: 'Complete' },
  ];

  const handleTypeSelection = (type: RegistrationType) => {
    setRegistrationType(type);
    setStep('account');
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBack = () => {
    if (step === 'account') { setStep('type'); setRegistrationType(null); }
    else if (step === 'company-setup') setStep('account');
    else if (step === 'subscription') setStep('company-setup');
    else if (step === 'payment') setStep('subscription');
  };

  const copyCompanyCode = () => {
    navigator.clipboard.writeText(generatedCompanyCode || formData.companyCode);
    toast.success('Company code copied to clipboard!');
  };

  // ── Step 1: Account — validate only, no API call for company flow ──────────
  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (registrationType === 'company') {
      setStep('company-setup');
      return;
    }

    // personal / join — call API immediately
    try {
      const response = await api.post('/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        registrationType,
        companyCode: formData.companyCode,
        joinRole, // ← already in your state
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      toast.success('Account created successfully!');

      if (registrationType === 'join') {
        toast.info('Account created! You can now join a company from your dashboard.');
      }

      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    }
  };

  // ── Step 2: Company setup — validate only, no API call ────────────────────
  const handleCompanySetupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName.trim()) {
      toast.error('Please enter your company name');
      return;
    }
    setStep('subscription');
  };

  // ── Step 3: Subscription — just move forward ──────────────────────────────
  const handleSubscriptionSubmit = () => {
    setStep('payment');
  };

  // ── Step 4: Payment — single API call with all collected data ─────────────
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.cardNumber || !formData.cardExpiry || !formData.cardCVC || !formData.cardName) {
      toast.error('Please fill in all payment details');
      return;
    }

    try {
      const response = await api.post('/auth/register', {
        // Step 1
        name: formData.name,
        email: formData.email,
        password: formData.password,
        registrationType,
        // Step 2
        companyName: formData.companyName,
        companyEmail: formData.companyEmail,
        companyPhone: formData.companyPhone,
        companyAddress: formData.companyAddress,
        industry: formData.industry,
        // Step 3
        plan: selectedPlan,
        // Step 4
        cardName: formData.cardName,
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      if (response.data.companyCode) {
        setGeneratedCompanyCode(response.data.companyCode);
        handleInputChange('companyCode', response.data.companyCode);
      }

      toast.success('Payment processed successfully!');
      setStep('confirmation');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="hidden w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background/10 backdrop-blur">
            <FileText className="h-7 w-7 text-white" />
          </div>
          <span className="text-3xl font-bold text-white">InvoiceFlow</span>
        </div>
        <h1 className="mt-8 text-4xl font-bold leading-tight text-white">
          {registrationType === 'personal' && 'Manage Your Personal Invoices'}
          {registrationType === 'company' && step === 'account' && 'Create Your Account'}
          {registrationType === 'company' && step === 'company-setup' && 'Set Up Your Company'}
          {registrationType === 'company' && step === 'subscription' && 'Choose Your Plan'}
          {registrationType === 'company' && step === 'payment' && 'Secure Payment'}
          {registrationType === 'company' && step === 'confirmation' && 'Welcome Aboard!'}
          {registrationType === 'join' && 'Join Your Team'}
          {!registrationType && 'Start Managing Invoices Today'}
        </h1>
        <p className="mt-4 text-lg text-blue-100">
          {registrationType === 'personal' && 'Get started with basic invoice management for personal use.'}
          {registrationType === 'company' && step === 'account' && 'Set up your director account to get started.'}
          {registrationType === 'company' && step === 'company-setup' && "Tell us about your company and we'll generate your unique code."}
          {registrationType === 'company' && step === 'subscription' && 'Select the perfect subscription plan for your business needs.'}
          {registrationType === 'company' && step === 'payment' && 'Complete your subscription with secure payment processing.'}
          {registrationType === 'company' && step === 'confirmation' && 'Your company is ready! Start inviting your team.'}
          {registrationType === 'join' && 'Join an existing company using your company code.'}
          {!registrationType && 'Choose the option that fits your needs.'}
        </p>
        <div className="mt-12 space-y-4">
          {['Automated OCR', 'Team Collaboration', 'Free Trial'].map((title, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background/10">
                <span className="text-sm font-semibold text-white">✓</span>
              </div>
              <div>
                <h3 className="font-semibold text-white">{title}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right side */}
      <div className="flex w-full flex-col justify-center px-8 py-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center justify-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-foreground">InvoiceFlow</span>
            </div>
          </div>

          {registrationType === 'company' && step !== 'type' && step !== 'confirmation' && (
            <RegistrationStepper currentStep={getStepNumber()} steps={registrationSteps} />
          )}

          {step !== 'type' && step !== 'confirmation' && (
            <Button variant="ghost" onClick={handleBack} className="mb-4 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}

          {/* ── Type selection ── */}
          {step === 'type' && (
            <>
              <h2 className="text-3xl font-bold text-foreground">Get Started</h2>
              <p className="mt-2 text-muted-foreground">Choose how you want to use InvoiceFlow</p>
              <div className="mt-8 space-y-4">
                <Card className="cursor-pointer p-6 transition-all hover:border-blue-400 hover:shadow-md" onClick={() => handleTypeSelection('personal')}>
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">Personal Account</h3>
                      <p className="mt-1 text-sm text-muted-foreground">For individual use. Manage your personal invoices with basic features.</p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-blue-600">
                        <Check className="h-4 w-4" /><span>Free to start</span>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="cursor-pointer p-6 transition-all hover:border-blue-400 hover:shadow-md" onClick={() => handleTypeSelection('company')}>
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100">
                      <Building2 className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">Create a Company</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Become a director. Create your company and invite your team.</p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-purple-600">
                        <Check className="h-4 w-4" /><span>14-day free trial</span>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="cursor-pointer p-6 transition-all hover:border-blue-400 hover:shadow-md" onClick={() => handleTypeSelection('join')}>
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-green-100">
                      <Users className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">Join a Company</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Join an existing company as an employee or accountant using a company code.</p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
                        <Check className="h-4 w-4" /><span>Request approval</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </>
          )}

          {/* ── Account form ── */}
          {step === 'account' && (
            <>
              <h2 className="text-3xl font-bold text-foreground">Create your account</h2>
              <p className="mt-2 text-muted-foreground">
                {registrationType === 'personal' && 'Set up your personal account'}
                {registrationType === 'company' && 'Set up your director account'}
                {registrationType === 'join' && 'Set up your account and join'}
              </p>

              <form onSubmit={handleAccountSubmit} className="mt-8 space-y-6">
                {registrationType === 'join' && (
                  <>
                    <Card className="p-4">
                      <Label className="mb-3 block text-sm font-medium text-slate-700">I want to join as:</Label>
                      <RadioGroup value={joinRole} onValueChange={(value) => setJoinRole(value as JoinRole)}>
                        <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-background">
                          <RadioGroupItem value="employee" id="employee-role" />
                          <Label htmlFor="employee-role" className="flex-1 cursor-pointer">
                            <div className="font-medium text-foreground">Employee</div>
                            <div className="text-xs text-muted-foreground">Upload and manage invoices</div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-background">
                          <RadioGroupItem value="accountant" id="accountant-role" />
                          <Label htmlFor="accountant-role" className="flex-1 cursor-pointer">
                            <div className="font-medium text-foreground">Accountant</div>
                            <div className="text-xs text-muted-foreground">Validate and approve invoices</div>
                          </Label>
                        </div>
                      </RadioGroup>
                    </Card>
                    <div className="space-y-2">
                      <Label htmlFor="companyCode">Company Code</Label>
                      <Input
                        id="companyCode" type="text" placeholder="e.g., ACME2024"
                        value={formData.companyCode}
                        onChange={(e) => handleInputChange('companyCode', e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">Enter the code provided by your company director</p>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" type="text" placeholder="John Doe" value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@company.com" value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" placeholder="At least 8 characters" value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input id="confirmPassword" type="password" placeholder="Re-enter your password" value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)} required />
                </div>

                <Button type="submit" className="w-full" size="lg">
                  {registrationType === 'company' ? 'Continue to Company Setup' : 'Create Account'}
                </Button>
              </form>
            </>
          )}

          {/* ── Company setup ── */}
          {step === 'company-setup' && (
            <>
              <h2 className="text-3xl font-bold text-foreground">Company Setup</h2>
              <p className="mt-2 text-muted-foreground">Tell us about your company</p>
              <form onSubmit={handleCompanySetupSubmit} className="mt-8 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name <span className="text-red-500">*</span></Label>
                  <Input id="companyName" type="text" placeholder="Acme Corporation" value={formData.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry (Optional)</Label>
                  <Select value={formData.industry} onValueChange={(value) => handleInputChange('industry', value)}>
                    <SelectTrigger className="w-full h-10 rounded-md border border-input bg-[#f3f3f5] px-3 py-2 text-sm">
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map((industry) => (
                        <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="companyEmail"><Mail className="mb-1 mr-1 inline h-4 w-4" />Company Email (Optional)</Label>
                    <Input id="companyEmail" type="email" placeholder="contact@company.com" value={formData.companyEmail}
                      onChange={(e) => handleInputChange('companyEmail', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyPhone"><Phone className="mb-1 mr-1 inline h-4 w-4" />Phone (Optional)</Label>
                    <Input id="companyPhone" type="tel" placeholder="+1 (555) 000-0000" value={formData.companyPhone}
                      onChange={(e) => handleInputChange('companyPhone', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyAddress"><MapPin className="mb-1 mr-1 inline h-4 w-4" />Address (Optional)</Label>
                  <Textarea className="w-full h-10 rounded-md border border-input bg-[#f3f3f5] px-3 py-2 text-sm"
                    id="companyAddress" placeholder="123 Main Street, City, State, ZIP"
                    value={formData.companyAddress}
                    onChange={(e) => handleInputChange('companyAddress', e.target.value)} rows={3} />
                </div>
                <Button type="submit" className="w-full" size="lg">Continue to Plan Selection</Button>
              </form>
            </>
          )}

          {/* ── Subscription ── */}
          {step === 'subscription' && (
            <>
              <h2 className="text-3xl font-bold text-foreground">Choose Your Plan</h2>
              <p className="mt-2 text-muted-foreground">Select the subscription that fits your needs</p>
              <div className="mt-8 space-y-4">
                {companyPlans.map((plan) => (
                  <Card key={plan.type}
                    className={`cursor-pointer p-5 transition-all ${selectedPlan === plan.type ? 'border-2 border-blue-500 bg-muted shadow-md' : 'hover:border-blue-300 hover:shadow-sm'}`}
                    onClick={() => setSelectedPlan(plan.type)}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{plan.name}</h3>
                          {plan.popular && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">Recommended</span>}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                        <div className="mt-3 flex items-baseline gap-1">
                          <span className="text-3xl font-bold text-foreground">${plan.price}</span>
                          <span className="text-sm text-muted-foreground">/month</span>
                        </div>
                        <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                          <span>📄 {plan.invoiceLimit === -1 ? 'Unlimited' : plan.invoiceLimit.toLocaleString()} invoices</span>
                          <span>👥 {plan.userLimit === -1 ? 'Unlimited' : plan.userLimit} users</span>
                          <span>🎯 {plan.ocrAccuracy}% OCR</span>
                        </div>
                      </div>
                      <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 ${selectedPlan === plan.type ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`}>
                        {selectedPlan === plan.type && <Check className="h-4 w-4 text-white" />}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              <Button onClick={handleSubscriptionSubmit} className="mt-6 w-full" size="lg">
                <CreditCard className="mr-2 h-5 w-5" />Continue to Payment
              </Button>
              <p className="mt-4 text-center text-xs text-muted-foreground">14-day free trial • Cancel anytime</p>
            </>
          )}

          {/* ── Payment ── */}
          {step === 'payment' && (
            <>
              <h2 className="text-3xl font-bold text-foreground">Payment Information</h2>
              <p className="mt-2 text-muted-foreground">Complete your subscription setup</p>
              <Card className="mt-6 p-5" style={{ backgroundColor: "var(--info)", color: "var(--info-foreground)" }}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-foreground">{companyPlans.find(p => p.type === selectedPlan)?.name} Plan</h3>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{formData.companyName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-foreground">${companyPlans.find(p => p.type === selectedPlan)?.price}</p>
                    <p className="text-xs text-muted-foreground">per month</p>
                  </div>
                </div>
                <div className="mt-3 rounded-lg bg-background/60 p-3">
                  <p className="text-xs font-medium text-green-700">✓ 14-day free trial included - you won't be charged today</p>
                </div>
              </Card>
              <form onSubmit={handlePaymentSubmit} className="mt-8 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="cardName">Cardholder Name</Label>
                  <Input id="cardName" type="text" placeholder="John Doe" value={formData.cardName}
                    onChange={(e) => handleInputChange('cardName', e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input id="cardNumber" type="text" placeholder="1234 5678 9012 3456" value={formData.cardNumber}
                    onChange={(e) => handleInputChange('cardNumber', e.target.value)} maxLength={19} required />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cardExpiry">Expiry Date</Label>
                    <Input id="cardExpiry" type="text" placeholder="MM/YY" value={formData.cardExpiry}
                      onChange={(e) => handleInputChange('cardExpiry', e.target.value)} maxLength={5} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cardCVC">CVC</Label>
                    <Input id="cardCVC" type="text" placeholder="123" value={formData.cardCVC}
                      onChange={(e) => handleInputChange('cardCVC', e.target.value)} maxLength={4} required />
                  </div>
                </div>
                <Button type="submit" className="w-full" size="lg">Confirm and Create Company</Button>
              </form>
            </>
          )}

          {/* ── Confirmation ── */}
          {step === 'confirmation' && (
            <>
              <div className="text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                  <Check className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-foreground">Company Created Successfully!</h2>
                <p className="mt-2 text-muted-foreground">Welcome to InvoiceFlow, {formData.name}</p>
              </div>
              <Card className="mt-8 border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-6">
                <div className="text-center">
                  <Building2 className="mx-auto mb-3 h-8 w-8 text-blue-600" />
                  <h3 className="font-semibold text-foreground">{formData.companyName}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Company Code</p>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <code className="rounded-lg bg-background px-4 py-2 text-2xl font-bold tracking-wider text-blue-600">
                      {generatedCompanyCode || formData.companyCode}
                    </code>
                    <Button variant="outline" size="sm" onClick={copyCompanyCode} className="gap-2">
                      <Copy className="h-4 w-4" />Copy
                    </Button>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">Share this code with your team members to invite them</p>
                </div>
              </Card>
              <div className="mt-8 space-y-3">
                <h3 className="font-semibold text-foreground">Suggested Next Steps</h3>
                {[
                  { icon: <Users className="h-5 w-5 text-blue-600" />, bg: 'bg-blue-100', title: 'Invite Employees', desc: 'Add team members to upload invoices' },
                  { icon: <User className="h-5 w-5 text-purple-600" />, bg: 'bg-purple-100', title: 'Invite Accountant', desc: 'Add accountants to validate invoices' },
                  { icon: <FileText className="h-5 w-5 text-green-600" />, bg: 'bg-green-100', title: 'Upload First Invoice', desc: 'Start processing invoices with OCR' },
                ].map((item, i) => (
                  <Card key={i} className="cursor-pointer p-4 transition-colors hover:bg-background">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.bg}`}>{item.icon}</div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              <Button onClick={() => navigate('/dashboard')} className="mt-8 w-full" size="lg">
                Go to Dashboard
              </Button>
            </>
          )}

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}