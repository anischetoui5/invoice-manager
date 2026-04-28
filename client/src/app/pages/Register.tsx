import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileText, User, Building2, CreditCard, Users, Check, ArrowLeft, Copy, Phone, Mail, MapPin, Crown, Eye, EyeOff } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    companyName: '', companyCode: '', industry: '',
    companyEmail: '', companyPhone: '', companyAddress: '',
    cardNumber: '', cardExpiry: '', cardCVC: '', cardName: '',
  });

  const companyPlans: CompanyPlan[] = [
    {
      name: 'Starter', price: 49, type: 'starter',
      description: 'Perfect for small companies just getting started',
      features: ['200 invoices per month', 'Up to 10 team members', 'Basic OCR (90% accuracy)', 'Standard validation workflow', 'Email support'],
      invoiceLimit: 200, userLimit: 10, ocrAccuracy: 90,
    },
    {
      name: 'Business', price: 149, type: 'business',
      description: 'For growing businesses with higher volume',
      features: ['1,000 invoices per month', 'Up to 50 team members', 'Advanced OCR (95% accuracy)', 'Custom validation workflows', 'Priority support', 'API access'],
      invoiceLimit: 1000, userLimit: 50, ocrAccuracy: 95, popular: true,
    },
    {
      name: 'Professional', price: 349, type: 'professional',
      description: 'For established companies with complex needs',
      features: ['5,000 invoices per month', 'Up to 200 team members', 'Premium OCR (98% accuracy)', 'Dedicated accountant assignments', 'White-label options'],
      invoiceLimit: 5000, userLimit: 200, ocrAccuracy: 98,
    },
    {
      name: 'Enterprise', price: 999, type: 'enterprise',
      description: 'For large organizations with custom requirements',
      features: ['Unlimited invoices', 'Unlimited team members', 'AI-powered OCR (99.5%)', 'Dedicated account manager', 'SLA guarantee (99.9% uptime)'],
      invoiceLimit: -1, userLimit: -1, ocrAccuracy: 99.5,
    },
  ];

  const industries = ['Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing', 'Education', 'Real Estate', 'Consulting', 'Other'];

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
    toast.success('Company code copied!');
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (registrationType === 'company') { setStep('company-setup'); return; }
    try {
      const response = await api.post('/auth/register', {
        name: formData.name, email: formData.email, password: formData.password,
        registrationType, companyCode: formData.companyCode, joinRole,
      });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    }
  };

  const handleCompanySetupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName.trim()) { toast.error('Please enter your company name'); return; }
    setStep('subscription');
  };

  const handleSubscriptionSubmit = () => setStep('payment');

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cardNumber || !formData.cardExpiry || !formData.cardCVC || !formData.cardName) {
      toast.error('Please fill in all payment details'); return;
    }
    try {
      const response = await api.post('/auth/register', {
        name: formData.name, email: formData.email, password: formData.password,
        registrationType, companyName: formData.companyName, companyEmail: formData.companyEmail,
        companyPhone: formData.companyPhone, companyAddress: formData.companyAddress,
        industry: formData.industry, plan: selectedPlan, cardName: formData.cardName,
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

  const getLeftPanelText = () => {
    if (!registrationType) return { title: 'Start Managing\nInvoices Today', sub: 'Choose the option that fits your needs.' };
    if (registrationType === 'personal') return { title: 'Manage Your\nPersonal Invoices', sub: 'Get started with basic invoice management for personal use.' };
    if (registrationType === 'join') return { title: 'Join Your\nTeam', sub: 'Join an existing company using your company code.' };
    const stepTexts: Record<string, { title: string; sub: string }> = {
      account: { title: 'Create Your\nAccount', sub: 'Set up your director account to get started.' },
      'company-setup': { title: 'Set Up Your\nCompany', sub: "Tell us about your company and we'll generate your unique code." },
      subscription: { title: 'Choose Your\nPlan', sub: 'Select the perfect subscription plan for your business needs.' },
      payment: { title: 'Secure\nPayment', sub: 'Complete your subscription with secure payment processing.' },
      confirmation: { title: 'Welcome\nAboard!', sub: 'Your company is ready! Start inviting your team.' },
    };
    return stepTexts[step] || { title: 'Start Managing\nInvoices Today', sub: '' };
  };

  const { title, sub } = getLeftPanelText();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      background: 'linear-gradient(135deg, #1a1d3a 0%, #2d2b69 40%, #1e3a8a 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');

        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideRight {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes blob {
          0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
          50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.3); }
          50% { box-shadow: 0 0 40px rgba(99,102,241,0.6); }
        }
        @keyframes gridMove {
          from { transform: translateY(0); }
          to { transform: translateY(40px); }
        }

        .reg-animate { animation: fadeSlideUp 0.5s ease both; }
        .left-animate { animation: fadeSlideRight 0.6s ease both; }

        .input-dark {
          width: 100%;
          padding: 12px 14px;
          border-radius: 4px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(0,0,0,0.25);
          font-size: 15px;
          font-family: inherit;
          color: white;
          outline: none;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }
        .input-dark:focus {
          border-color: #5865f2;
          background: rgba(0,0,0,0.35);
          box-shadow: 0 0 0 3px rgba(88,101,242,0.2);
        }
        .input-dark::placeholder { color: rgba(255,255,255,0.25); }

        .btn-discord {
          width: 100%;
          padding: 13px;
          border-radius: 4px;
          border: none;
          background: #5865f2;
          color: white;
          font-size: 15px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-discord:hover { background: #4752c4; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(88,101,242,0.4); }
        .btn-discord:active { transform: translateY(0); }

        .type-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }
        .type-card:hover {
          background: rgba(255,255,255,0.09);
          border-color: #5865f2;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        }

        .plan-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 18px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .plan-card:hover { border-color: rgba(88,101,242,0.5); }
        .plan-card.selected {
          border-color: #5865f2;
          background: rgba(88,101,242,0.1);
          box-shadow: 0 0 0 2px rgba(88,101,242,0.3);
        }

        .label-dark {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: rgba(255,255,255,0.6);
          margin-bottom: 8px;
          letter-spacing: 0.8px;
          text-transform: uppercase;
        }

        .footer-link {
          color: rgba(255,255,255,0.4);
          text-decoration: none;
          font-size: 13px;
          transition: color 0.2s;
        }
        .footer-link:hover { color: rgba(255,255,255,0.8); }

        .blob1 { position: absolute; width: 500px; height: 500px; background: rgba(88,101,242,0.1); border-radius: 60% 40% 30% 70%/60% 30% 70% 40%; animation: blob 12s ease-in-out infinite; top: -100px; left: -150px; pointer-events: none; }
        .blob2 { position: absolute; width: 400px; height: 400px; background: rgba(30,58,138,0.15); border-radius: 30% 60% 70% 40%/50% 60% 30% 60%; animation: blob 15s ease-in-out infinite reverse; bottom: -100px; right: -100px; pointer-events: none; }
        .grid-bg { position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px); background-size: 40px 40px; pointer-events: none; animation: gridMove 8s linear infinite alternate; }
      `}</style>

      <div className="blob1" />
      <div className="blob2" />
      <div className="grid-bg" />

      {/* Left panel — hidden on mobile */}
      <div className="left-animate" style={{
        display: 'none',
        width: '42%',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px',
        position: 'relative',
        zIndex: 1,
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
      ref={(el) => { if (el) el.style.display = window.innerWidth >= 1024 ? 'flex' : 'none'; }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '48px', height: '48px',
            borderRadius: '14px',
            background: 'rgba(255,255,255,0.05)',
            border: '2px dashed rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'glow 3s ease-in-out infinite',
            overflow: 'hidden',
          }}>
            {/* Replace with: <img src="/your-logo.png" style={{width:'100%',height:'100%',objectFit:'contain'}} /> */}
            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>LOGO</span>
          </div>
          <span style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: '22px', fontWeight: '800', color: 'white',
          }}>EasyFact</span>
        </div>

        {/* Main text */}
        <div>
          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: '40px', fontWeight: '800',
            color: 'white', lineHeight: '1.15',
            letterSpacing: '-1px',
            whiteSpace: 'pre-line',
            marginBottom: '16px',
            transition: 'all 0.4s ease',
          }}>{title}</h1>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.55)', lineHeight: '1.6', transition: 'all 0.4s ease' }}>{sub}</p>

          <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { label: 'OCR Extraction', desc: 'AI-powered invoice scanning' },
              { label: 'Team Workflows', desc: 'Collaborate with your accountants' },
              { label: 'Real-time Analytics', desc: 'Track your finances at a glance' },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: '#5865f2',
                  boxShadow: '0 0 8px rgba(88,101,242,0.6)',
                  flexShrink: 0,
                }} />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>{item.label}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stats */}
        <div style={{ display: 'flex', gap: '20px' }}>
          {[
            { value: '12,847', label: 'Invoices processed' },
            { value: '98.5%', label: 'OCR accuracy' },
            { value: '2,400+', label: 'Companies trust us' },
          ].map((stat) => (
            <div key={stat.label} style={{
              flex: 1,
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '10px',
              padding: '14px',
              border: '1px solid rgba(255,255,255,0.08)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#818cf8' }}>{stat.value}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          padding: '40px 32px',
        }}>
          <div style={{ width: '100%', maxWidth: '480px' }}>

            {/* Mobile logo */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              marginBottom: '32px', justifyContent: 'center',
            }}>
              <div style={{
                width: '40px', height: '40px',
                background: 'rgba(255,255,255,0.08)',
                border: '2px dashed rgba(255,255,255,0.2)',
                borderRadius: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}>
                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>LOGO</span>
              </div>
              <span style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: '22px', fontWeight: '800', color: 'white',
              }}>EasyFact</span>
            </div>

            {/* Stepper */}
            {registrationType === 'company' && step !== 'type' && step !== 'confirmation' && (
              <div className="reg-animate" style={{ marginBottom: '24px' }}>
                <RegistrationStepper currentStep={getStepNumber()} steps={registrationSteps} />
              </div>
            )}

            {/* Back button */}
            {step !== 'type' && step !== 'confirmation' && (
              <button onClick={handleBack} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.5)', fontSize: '14px',
                fontFamily: 'inherit', marginBottom: '20px',
                transition: 'color 0.2s',
              }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'white')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
              >
                <ArrowLeft size={16} />
                Back
              </button>
            )}

            {/* ── TYPE SELECTION ── */}
            {step === 'type' && (
              <div className="reg-animate">
                <h2 style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: '26px', fontWeight: '800',
                  color: 'white', marginBottom: '8px',
                }}>Create an account</h2>
                <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', marginBottom: '28px' }}>
                  Choose how you want to use EasyFact
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { type: 'personal' as RegistrationType, icon: <User size={22} color="#818cf8" />, bg: 'rgba(88,101,242,0.15)', title: 'Personal Account', desc: 'For individual use. Manage your personal invoices with basic features.', badge: 'Free to start', badgeColor: '#818cf8' },
                    { type: 'company' as RegistrationType, icon: <Building2 size={22} color="#a78bfa" />, bg: 'rgba(167,139,250,0.12)', title: 'Create a Company', desc: 'Become a director. Create your company and invite your team.', badge: '14-day free trial', badgeColor: '#a78bfa' },
                    { type: 'join' as RegistrationType, icon: <Users size={22} color="#34d399" />, bg: 'rgba(52,211,153,0.12)', title: 'Join a Company', desc: 'Join an existing company as an employee or accountant using a company code.', badge: 'Request approval', badgeColor: '#34d399' },
                  ].map((item) => (
                    <div key={item.type} className="type-card" onClick={() => handleTypeSelection(item.type)}>
                      <div style={{
                        width: '44px', height: '44px', flexShrink: 0,
                        background: item.bg, borderRadius: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>{item.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', color: 'white', fontSize: '15px', marginBottom: '4px' }}>{item.title}</div>
                        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.4', marginBottom: '8px' }}>{item.desc}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Check size={13} color={item.badgeColor} />
                          <span style={{ fontSize: '12px', color: item.badgeColor, fontWeight: '500' }}>{item.badge}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── ACCOUNT FORM ── */}
            {step === 'account' && (
              <div className="reg-animate">
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '24px', fontWeight: '800', color: 'white', marginBottom: '6px' }}>
                  Create your account
                </h2>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', marginBottom: '28px' }}>
                  {registrationType === 'personal' && 'Set up your personal account'}
                  {registrationType === 'company' && 'Set up your director account'}
                  {registrationType === 'join' && 'Set up your account and join a company'}
                </p>

                <div style={{
                  background: 'rgba(255,255,255,0.04)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: '8px',
                  padding: '28px',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <form onSubmit={handleAccountSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

                    {registrationType === 'join' && (
                      <>
                        <div>
                          <label className="label-dark">I want to join as</label>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            {['employee', 'accountant'].map((role) => (
                              <div key={role} onClick={() => setJoinRole(role as JoinRole)} style={{
                                flex: 1, padding: '12px', borderRadius: '6px', cursor: 'pointer',
                                border: `1px solid ${joinRole === role ? '#5865f2' : 'rgba(255,255,255,0.1)'}`,
                                background: joinRole === role ? 'rgba(88,101,242,0.15)' : 'rgba(0,0,0,0.2)',
                                transition: 'all 0.2s',
                              }}>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: 'white', textTransform: 'capitalize' }}>{role}</div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                  {role === 'employee' ? 'Upload invoices' : 'Validate invoices'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="label-dark">Company Code</label>
                          <input className="input-dark" type="text" placeholder="e.g., ACME2024"
                            value={formData.companyCode}
                            onChange={(e) => handleInputChange('companyCode', e.target.value)} required />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="label-dark">Full Name</label>
                      <input className="input-dark" type="text" placeholder="John Doe"
                        value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} required />
                    </div>

                    <div>
                      <label className="label-dark">Email</label>
                      <input className="input-dark" type="email" placeholder="you@company.com"
                        value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} required />
                    </div>

                    <div>
                      <label className="label-dark">Password</label>
                      <div style={{ position: 'relative' }}>
                        <input className="input-dark" type={showPassword ? 'text' : 'password'}
                          placeholder="At least 8 characters" style={{ paddingRight: '44px' }}
                          value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)} required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                          position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)',
                          display: 'flex', alignItems: 'center', transition: 'color 0.2s',
                        }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="label-dark">Confirm Password</label>
                      <div style={{ position: 'relative' }}>
                        <input className="input-dark" type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Re-enter your password" style={{ paddingRight: '44px' }}
                          value={formData.confirmPassword} onChange={(e) => handleInputChange('confirmPassword', e.target.value)} required />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{
                          position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)',
                          display: 'flex', alignItems: 'center', transition: 'color 0.2s',
                        }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <button type="submit" className="btn-discord" style={{ marginTop: '8px' }}>
                      {registrationType === 'company' ? 'Continue to Company Setup' : 'Create Account'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ── COMPANY SETUP ── */}
            {step === 'company-setup' && (
              <div className="reg-animate">
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '24px', fontWeight: '800', color: 'white', marginBottom: '6px' }}>Company Setup</h2>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', marginBottom: '28px' }}>Tell us about your company</p>

                <div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', borderRadius: '8px', padding: '28px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <form onSubmit={handleCompanySetupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div>
                      <label className="label-dark">Company Name *</label>
                      <input className="input-dark" type="text" placeholder="Acme Corporation"
                        value={formData.companyName} onChange={(e) => handleInputChange('companyName', e.target.value)} required />
                    </div>

                    <div>
                      <label className="label-dark">Industry (Optional)</label>
                      <select className="input-dark" value={formData.industry}
                        onChange={(e) => handleInputChange('industry', e.target.value)}
                        style={{ appearance: 'none' }}>
                        <option value="">Select your industry</option>
                        {industries.map((i) => <option key={i} value={i} style={{ background: '#1a1d3a' }}>{i}</option>)}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div>
                        <label className="label-dark">Company Email</label>
                        <input className="input-dark" type="email" placeholder="contact@company.com"
                          value={formData.companyEmail} onChange={(e) => handleInputChange('companyEmail', e.target.value)} />
                      </div>
                      <div>
                        <label className="label-dark">Phone</label>
                        <input className="input-dark" type="tel" placeholder="+1 (555) 000-0000"
                          value={formData.companyPhone} onChange={(e) => handleInputChange('companyPhone', e.target.value)} />
                      </div>
                    </div>

                    <div>
                      <label className="label-dark">Address (Optional)</label>
                      <textarea className="input-dark" placeholder="123 Main Street, City, State, ZIP"
                        value={formData.companyAddress} onChange={(e) => handleInputChange('companyAddress', e.target.value)}
                        rows={2} style={{ resize: 'vertical', minHeight: '72px' }} />
                    </div>

                    <button type="submit" className="btn-discord">Continue to Plan Selection</button>
                  </form>
                </div>
              </div>
            )}

            {/* ── SUBSCRIPTION ── */}
            {step === 'subscription' && (
              <div className="reg-animate">
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '24px', fontWeight: '800', color: 'white', marginBottom: '6px' }}>Choose Your Plan</h2>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', marginBottom: '24px' }}>Select the subscription that fits your needs</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  {companyPlans.map((plan) => (
                    <div key={plan.type} className={`plan-card ${selectedPlan === plan.type ? 'selected' : ''}`}
                      onClick={() => setSelectedPlan(plan.type)} style={{ position: 'relative' }}>
                      {plan.popular && (
                        <div style={{
                          position: 'absolute', top: '0', right: '0',
                          background: '#5865f2', color: 'white', fontSize: '10px',
                          fontWeight: '700', padding: '4px 10px', borderRadius: '0 8px 0 8px',
                          letterSpacing: '0.5px',
                        }}>RECOMMENDED</div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>{plan.name}</span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px' }}>{plan.description}</div>
                          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                            <span>{plan.invoiceLimit === -1 ? 'Unlimited' : plan.invoiceLimit.toLocaleString()} invoices</span>
                            <span>{plan.userLimit === -1 ? 'Unlimited' : plan.userLimit} users</span>
                            <span>{plan.ocrAccuracy}% OCR</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', marginLeft: '16px' }}>
                          <div style={{ fontSize: '24px', fontWeight: '800', color: 'white' }}>${plan.price}</div>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>/month</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button className="btn-discord" onClick={handleSubscriptionSubmit} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}>
                  <CreditCard size={16} /> Continue to Payment
                </button>
                <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '12px' }}>
                  14-day free trial — Cancel anytime
                </p>
              </div>
            )}

            {/* ── PAYMENT ── */}
            {step === 'payment' && (
              <div className="reg-animate">
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '24px', fontWeight: '800', color: 'white', marginBottom: '6px' }}>Payment Information</h2>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', marginBottom: '20px' }}>Complete your subscription setup</p>

                {/* Plan summary */}
                <div style={{
                  background: 'rgba(88,101,242,0.12)', border: '1px solid rgba(88,101,242,0.3)',
                  borderRadius: '8px', padding: '16px', marginBottom: '20px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>
                      {companyPlans.find(p => p.type === selectedPlan)?.name} Plan
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{formData.companyName}</div>
                    <div style={{ fontSize: '12px', color: '#34d399', marginTop: '6px' }}>
                      14-day free trial — you won't be charged today
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: 'white' }}>
                      ${companyPlans.find(p => p.type === selectedPlan)?.price}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>/month</div>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', borderRadius: '8px', padding: '28px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div>
                      <label className="label-dark">Cardholder Name</label>
                      <input className="input-dark" type="text" placeholder="John Doe"
                        value={formData.cardName} onChange={(e) => handleInputChange('cardName', e.target.value)} required />
                    </div>
                    <div>
                      <label className="label-dark">Card Number</label>
                      <input className="input-dark" type="text" placeholder="1234 5678 9012 3456"
                        value={formData.cardNumber} onChange={(e) => handleInputChange('cardNumber', e.target.value)} maxLength={19} required />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div>
                        <label className="label-dark">Expiry Date</label>
                        <input className="input-dark" type="text" placeholder="MM/YY"
                          value={formData.cardExpiry} onChange={(e) => handleInputChange('cardExpiry', e.target.value)} maxLength={5} required />
                      </div>
                      <div>
                        <label className="label-dark">CVC</label>
                        <input className="input-dark" type="text" placeholder="123"
                          value={formData.cardCVC} onChange={(e) => handleInputChange('cardCVC', e.target.value)} maxLength={4} required />
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '10px' }}>🔒</span>
                      </div>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Your payment is encrypted and secure</span>
                    </div>

                    <button type="submit" className="btn-discord">Confirm and Create Company</button>
                  </form>
                </div>
              </div>
            )}

            {/* ── CONFIRMATION ── */}
            {step === 'confirmation' && (
              <div className="reg-animate" style={{ textAlign: 'center' }}>
                <div style={{
                  width: '72px', height: '72px', borderRadius: '50%',
                  background: 'rgba(52,211,153,0.15)', border: '2px solid rgba(52,211,153,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px',
                }}>
                  <Check size={32} color="#34d399" />
                </div>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '24px', fontWeight: '800', color: 'white', marginBottom: '8px' }}>
                  Company Created!
                </h2>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '28px' }}>
                  Welcome to EasyFact, {formData.name}
                </p>

                {/* Company code */}
                <div style={{
                  background: 'rgba(88,101,242,0.1)', border: '1px solid rgba(88,101,242,0.3)',
                  borderRadius: '12px', padding: '24px', marginBottom: '24px',
                }}>
                  <Building2 size={28} color="#818cf8" style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'white', marginBottom: '4px' }}>{formData.companyName}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>Company Code</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <code style={{
                      background: 'rgba(0,0,0,0.3)', borderRadius: '8px',
                      padding: '10px 20px', fontSize: '22px', fontWeight: '800',
                      color: '#818cf8', letterSpacing: '4px',
                    }}>
                      {generatedCompanyCode || formData.companyCode}
                    </code>
                    <button onClick={copyCompanyCode} style={{
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px', padding: '10px 14px', cursor: 'pointer',
                      color: 'white', display: 'flex', alignItems: 'center', gap: '6px',
                      fontSize: '13px', fontFamily: 'inherit', transition: 'all 0.2s',
                    }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                    >
                      <Copy size={14} /> Copy
                    </button>
                  </div>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '12px' }}>
                    Share this code with your team members to invite them
                  </p>
                </div>

                {/* Next steps */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px', textAlign: 'left' }}>
                  {[
                    { icon: <Users size={18} color="#818cf8" />, bg: 'rgba(88,101,242,0.15)', title: 'Invite Employees', desc: 'Add team members to upload invoices' },
                    { icon: <User size={18} color="#a78bfa" />, bg: 'rgba(167,139,250,0.12)', title: 'Invite Accountant', desc: 'Add accountants to validate invoices' },
                    { icon: <FileText size={18} color="#34d399" />, bg: 'rgba(52,211,153,0.12)', title: 'Upload First Invoice', desc: 'Start processing invoices with OCR' },
                  ].map((item, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '14px',
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '8px', padding: '14px', cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                    >
                      <div style={{ width: '36px', height: '36px', background: item.bg, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.icon}</div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>{item.title}</div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <button className="btn-discord" onClick={() => navigate('/dashboard')}>
                  Go to Dashboard
                </button>
              </div>
            )}

            {/* Sign in link */}
            <div style={{
              marginTop: '24px', padding: '16px',
              background: 'rgba(0,0,0,0.2)', borderRadius: '4px',
              textAlign: 'center',
            }}>
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
                Already have an account?{' '}
              </span>
              <Link to="/login" style={{ color: '#5865f2', fontWeight: '600', fontSize: '14px', textDecoration: 'none' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#7983f5')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#5865f2')}
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer style={{
          background: 'rgba(0,0,0,0.25)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '20px 32px',
        }}>
          <div style={{
            maxWidth: '480px', margin: '0 auto',
            display: 'flex', flexWrap: 'wrap',
            justifyContent: 'space-between', alignItems: 'center', gap: '12px',
          }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', fontFamily: "'Syne', sans-serif", fontWeight: '700' }}>
              EasyFact © {new Date().getFullYear()}
            </span>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {['Privacy Policy', 'Terms', 'Security', 'Support'].map((link) => (
                <a key={link} href="#" className="footer-link">{link}</a>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}