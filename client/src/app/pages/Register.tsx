import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileText, User, Building2, CreditCard, Users, Check,
  ArrowLeft, Copy, Phone, Mail, MapPin, Crown, Eye, EyeOff, Sun, Moon
} from 'lucide-react';
import { toast } from 'sonner';
import { RegistrationStepper } from '../components/RegistrationStepper';
import api from '../../lib/api';

type RegistrationType = 'personal' | 'company' | 'join';
type JoinRole = 'employee' | 'accountant';
type CompanyCreationStep = 'type' | 'account' | 'company-setup' | 'subscription' | 'payment' | 'confirmation';

interface CompanyPlan {
  name: string;
  price: number;
  type: 'starter' | 'business' | 'professional' | 'enterprise';
  description: string;
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
  const [isDark, setIsDark] = useState(false);

  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    companyName: '', companyCode: '', industry: '',
    companyEmail: '', companyPhone: '', companyAddress: '',
    cardNumber: '', cardExpiry: '', cardCVC: '', cardName: '',
  });

  // ── Same theme token structure as Login ──────────────────────────────────
  const t = isDark ? {
    pageBg: 'linear-gradient(135deg, #1a1d3a 0%, #2d2b69 40%, #1e3a8a 100%)',
    leftBorder: '1px solid rgba(255,255,255,0.06)',
    cardBg: 'rgba(255,255,255,0.04)',
    cardBorder: '1px solid rgba(255,255,255,0.08)',
    titleColor: 'white',
    subColor: 'rgba(255,255,255,0.5)',
    labelColor: 'rgba(255,255,255,0.6)',
    labelTransform: 'uppercase' as const,
    labelTracking: '0.8px',
    labelSize: '12px',
    inputBg: 'rgba(0,0,0,0.25)',
    inputBorder: 'rgba(255,255,255,0.1)',
    inputFocus: '#5865f2',
    inputColor: 'white',
    inputPlaceholder: 'rgba(255,255,255,0.25)',
    inputRadius: '4px',
    btnBg: '#5865f2',
    btnHover: '#4752c4',
    btnShadow: 'rgba(88,101,242,0.4)',
    btnRadius: '4px',
    accentColor: '#5865f2',
    accentHover: '#7983f5',
    signupBg: 'rgba(0,0,0,0.2)',
    signupRadius: '4px',
    signupText: 'rgba(255,255,255,0.5)',
    footerBg: 'rgba(0,0,0,0.25)',
    footerBorder: 'rgba(255,255,255,0.06)',
    footerText: 'rgba(255,255,255,0.3)',
    footerLink: 'rgba(255,255,255,0.4)',
    footerLinkHover: 'rgba(255,255,255,0.8)',
    toggleBg: 'rgba(255,255,255,0.1)',
    toggleColor: 'rgba(255,255,255,0.7)',
    statBg: 'rgba(255,255,255,0.05)',
    statBorder: 'rgba(255,255,255,0.08)',
    statValue: '#818cf8',
    statLabel: 'rgba(255,255,255,0.4)',
    featureDesc: 'rgba(255,255,255,0.45)',
    dotColor: '#5865f2',
    dotShadow: '0 0 8px rgba(88,101,242,0.6)',
    logoText: 'white',
    logoBg: 'rgba(255,255,255,0.05)',
    logoBorder: '2px dashed rgba(255,255,255,0.15)',
    statusDot: '#23a55a',
    eyeColor: 'rgba(255,255,255,0.3)',
    eyeHover: 'rgba(255,255,255,0.7)',
    gridLines: 'rgba(255,255,255,0.03)',
    blobColor1: 'rgba(88,101,242,0.1)',
    blobColor2: 'rgba(30,58,138,0.15)',
    typeCardBg: 'rgba(255,255,255,0.05)',
    typeCardBorder: 'rgba(255,255,255,0.1)',
    typeCardHoverBg: 'rgba(255,255,255,0.09)',
    planCardBg: 'rgba(255,255,255,0.05)',
    planCardBorder: 'rgba(255,255,255,0.1)',
    planCardSelected: 'rgba(88,101,242,0.1)',
    planBadgeBg: '#5865f2',
    summaryBg: 'rgba(88,101,242,0.12)',
    summaryBorder: 'rgba(88,101,242,0.3)',
    codeBg: 'rgba(88,101,242,0.1)',
    codeBorder: 'rgba(88,101,242,0.3)',
    codeColor: '#818cf8',
    codeInnerBg: 'rgba(0,0,0,0.3)',
    copyBtnBg: 'rgba(255,255,255,0.08)',
    copyBtnBorder: 'rgba(255,255,255,0.15)',
    copyBtnColor: 'white',
    successCircle: 'rgba(52,211,153,0.15)',
    successBorder: 'rgba(52,211,153,0.3)',
    successColor: '#34d399',
    nextStepBg: 'rgba(255,255,255,0.04)',
    nextStepBorder: 'rgba(255,255,255,0.07)',
    rolePillBg: 'rgba(0,0,0,0.2)',
    rolePillBorder: 'rgba(255,255,255,0.1)',
    rolePillActiveBg: 'rgba(88,101,242,0.15)',
    securityBg: 'rgba(0,0,0,0.2)',
    textMuted: 'rgba(255,255,255,0.4)',
    textFaint: 'rgba(255,255,255,0.35)',
    trialColor: '#34d399',
    recommendedBg: '#5865f2',
  } : {
    pageBg: '#f0f4ff',
    leftBorder: 'none',
    cardBg: 'white',
    cardBorder: '1px solid rgba(0,0,0,0.06)',
    titleColor: '#0f172a',
    subColor: '#64748b',
    labelColor: '#374151',
    labelTransform: 'none' as const,
    labelTracking: '0.3px',
    labelSize: '13px',
    inputBg: 'white',
    inputBorder: 'rgba(0,0,0,0.08)',
    inputFocus: '#3b82f6',
    inputColor: '#1e293b',
    inputPlaceholder: '#94a3b8',
    inputRadius: '12px',
    btnBg: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    btnHover: 'linear-gradient(135deg, #1d4ed8, #1e40af)',
    btnShadow: 'rgba(37,99,235,0.4)',
    btnRadius: '12px',
    accentColor: '#3b82f6',
    accentHover: '#1d4ed8',
    signupBg: '#f8faff',
    signupRadius: '14px',
    signupText: '#64748b',
    footerBg: 'white',
    footerBorder: 'rgba(0,0,0,0.06)',
    footerText: '#94a3b8',
    footerLink: '#94a3b8',
    footerLinkHover: '#64748b',
    toggleBg: 'rgba(37,99,235,0.1)',
    toggleColor: '#2563eb',
    statBg: 'rgba(255,255,255,0.15)',
    statBorder: 'rgba(255,255,255,0.2)',
    statValue: '#bfdbfe',
    statLabel: 'rgba(255,255,255,0.7)',
    featureDesc: 'rgba(255,255,255,0.7)',
    dotColor: 'rgba(255,255,255,0.6)',
    dotShadow: 'none',
    logoText: 'white',
    logoBg: 'rgba(255,255,255,0.15)',
    logoBorder: '1px solid rgba(255,255,255,0.3)',
    statusDot: '#34d399',
    eyeColor: '#94a3b8',
    eyeHover: '#3b82f6',
    gridLines: 'transparent',
    blobColor1: 'rgba(255,255,255,0.06)',
    blobColor2: 'rgba(255,255,255,0.04)',
    typeCardBg: 'white',
    typeCardBorder: 'rgba(0,0,0,0.08)',
    typeCardHoverBg: '#f8faff',
    planCardBg: 'white',
    planCardBorder: 'rgba(0,0,0,0.08)',
    planCardSelected: '#f0f4ff',
    planBadgeBg: '#2563eb',
    summaryBg: '#f0f4ff',
    summaryBorder: '#bfdbfe',
    codeBg: 'linear-gradient(135deg, #f0f4ff, #f5f0ff)',
    codeBorder: '#c7d2fe',
    codeColor: '#3b6bff',
    codeInnerBg: 'rgba(255,255,255,0.8)',
    copyBtnBg: 'white',
    copyBtnBorder: '#c7d2fe',
    copyBtnColor: '#3b6bff',
    successCircle: '#dcfce7',
    successBorder: '#bbf7d0',
    successColor: '#16a34a',
    nextStepBg: 'white',
    nextStepBorder: 'rgba(0,0,0,0.06)',
    rolePillBg: '#f8faff',
    rolePillBorder: 'rgba(0,0,0,0.08)',
    rolePillActiveBg: '#eff3ff',
    securityBg: '#f0fdf4',
    textMuted: '#64748b',
    textFaint: '#94a3b8',
    trialColor: '#16a34a',
    recommendedBg: '#2563eb',
  };

  const companyPlans: CompanyPlan[] = [
    { name: 'Starter', price: 49, type: 'starter', description: 'Perfect for small companies just getting started', invoiceLimit: 200, userLimit: 10, ocrAccuracy: 90 },
    { name: 'Business', price: 149, type: 'business', description: 'For growing businesses with higher volume', invoiceLimit: 1000, userLimit: 50, ocrAccuracy: 95, popular: true },
    { name: 'Professional', price: 349, type: 'professional', description: 'For established companies with complex needs', invoiceLimit: 5000, userLimit: 200, ocrAccuracy: 98 },
    { name: 'Enterprise', price: 999, type: 'enterprise', description: 'For large organizations with custom requirements', invoiceLimit: -1, userLimit: -1, ocrAccuracy: 99.5 },
  ];

  const industries = ['Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing', 'Education', 'Real Estate', 'Consulting', 'Other'];

  const getStepNumber = (): number => {
    if (registrationType !== 'company') return 0;
    switch (step) {
      case 'account': return 1; case 'company-setup': return 2;
      case 'subscription': return 3; case 'payment': return 4;
      case 'confirmation': return 5; default: return 0;
    }
  };

  const registrationSteps = [
    { number: 1, label: 'Account' }, { number: 2, label: 'Company' },
    { number: 3, label: 'Subscription' }, { number: 4, label: 'Payment' },
    { number: 5, label: 'Complete' },
  ];

  const handleTypeSelection = (type: RegistrationType) => { setRegistrationType(type); setStep('account'); };
  const handleInputChange = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }));

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
    } catch (err: any) { toast.error(err.response?.data?.error || 'Registration failed'); }
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
    } catch (err: any) { toast.error(err.response?.data?.error || 'Registration failed'); }
  };

  const getLeftPanelText = () => {
    if (!registrationType) return { title: 'Start Managing\nInvoices Today', sub: 'Choose the option that fits your needs.' };
    if (registrationType === 'personal') return { title: 'Manage Your\nPersonal Invoices', sub: 'Get started with basic invoice management for personal use.' };
    if (registrationType === 'join') return { title: 'Join Your\nTeam', sub: 'Join an existing company using your company code.' };
    const m: Record<string, { title: string; sub: string }> = {
      account: { title: 'Create Your\nAccount', sub: 'Set up your director account to get started.' },
      'company-setup': { title: 'Set Up Your\nCompany', sub: "Tell us about your company and we'll generate your unique code." },
      subscription: { title: 'Choose Your\nPlan', sub: 'Select the perfect subscription plan for your business needs.' },
      payment: { title: 'Secure\nPayment', sub: 'Complete your subscription with secure payment processing.' },
      confirmation: { title: 'Welcome\nAboard!', sub: 'Your company is ready! Start inviting your team.' },
    };
    return m[step] || { title: 'Start Managing\nInvoices Today', sub: '' };
  };
  const { title, sub } = getLeftPanelText();

  // ── Shared inline style helpers ───────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: t.inputRadius,
    border: isDark ? `1px solid ${t.inputBorder}` : '2px solid transparent',
    background: t.inputBg, fontSize: '15px', fontFamily: 'inherit',
    color: t.inputColor, outline: 'none', transition: 'all 0.25s ease',
    boxSizing: 'border-box', boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: t.labelSize, fontWeight: isDark ? 700 : 600,
    color: t.labelColor, marginBottom: '8px',
    letterSpacing: t.labelTracking, textTransform: t.labelTransform,
    transition: 'all 0.4s ease',
  };

  const btnStyle: React.CSSProperties = {
    width: '100%', padding: '13px', borderRadius: t.btnRadius, border: 'none',
    background: t.btnBg, color: 'white', fontSize: '15px', fontWeight: 600,
    fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.25s ease',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
  };

  const glassCard: React.CSSProperties = {
    background: t.cardBg, backdropFilter: 'blur(20px)',
    borderRadius: isDark ? '8px' : '20px', padding: '28px',
    border: t.cardBorder, boxShadow: isDark ? 'none' : '0 8px 32px rgba(37,99,235,0.08)',
    transition: 'all 0.4s ease',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      background: isDark
        ? t.pageBg
        : '#f0f4ff',
      position: 'relative', overflow: 'hidden', transition: 'all 0.4s ease',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');

        @keyframes fadeSlideUp   { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeSlideRight{ from { opacity:0; transform:translateX(-20px); } to { opacity:1; transform:translateX(0); } }
        @keyframes blob          { 0%,100%{ border-radius:60% 40% 30% 70%/60% 30% 70% 40%; } 50%{ border-radius:30% 60% 70% 40%/50% 60% 30% 60%; } }
        @keyframes glow          { 0%,100%{ box-shadow:0 0 20px rgba(99,102,241,0.3); } 50%{ box-shadow:0 0 40px rgba(99,102,241,0.6); } }
        @keyframes gridMove      { from{ transform:translateY(0); } to{ transform:translateY(40px); } }
        @keyframes spin          { from{ transform:rotate(0deg); } to{ transform:rotate(360deg); } }

        .reg-animate   { animation: fadeSlideUp 0.5s ease both; }
        .left-animate  { animation: fadeSlideRight 0.6s ease both; }

        .reg-input { transition: border-color 0.25s ease, box-shadow 0.25s ease, background 0.25s ease; }
        .reg-input:focus {
          border-color: ${t.inputFocus} !important;
          box-shadow: 0 0 0 ${isDark ? '3px' : '4px'} ${isDark ? 'rgba(88,101,242,0.2)' : 'rgba(59,130,246,0.12)'} !important;
          background: ${isDark ? 'rgba(0,0,0,0.35)' : 'white'} !important;
        }
        .reg-input::placeholder { color: ${t.inputPlaceholder}; }
        select.reg-input option  { background: ${isDark ? '#1a1d3a' : 'white'}; color: ${t.inputColor}; }

        .reg-btn:hover:not(:disabled) {
          background: ${t.btnHover} !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px ${t.btnShadow} !important;
        }
        .reg-btn:active:not(:disabled) { transform: translateY(0) !important; }

        .toggle-btn {
          background: ${t.toggleBg}; border: none; border-radius: 50%;
          width: 40px; height: 40px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: ${t.toggleColor};
          transition: all 0.3s ease;
          position: absolute; top: 20px; right: 20px; z-index: 10;
        }
        .toggle-btn:hover { transform: rotate(20deg) scale(1.1); }

        .type-card {
          background: ${t.typeCardBg};
          border: 1px solid ${t.typeCardBorder};
          border-radius: ${isDark ? '8px' : '14px'};
          padding: 20px; cursor: pointer;
          transition: all 0.2s ease;
          display: flex; align-items: flex-start; gap: 16px;
        }
        .type-card:hover {
          background: ${t.typeCardHoverBg};
          border-color: ${isDark ? '#5865f2' : '#3b82f6'};
          transform: translateY(-2px);
          box-shadow: ${isDark ? '0 8px 24px rgba(0,0,0,0.3)' : '0 8px 24px rgba(37,99,235,0.12)'};
        }

        .plan-card {
          background: ${t.planCardBg};
          border: ${isDark ? '1px solid rgba(255,255,255,0.1)' : '1.5px solid rgba(0,0,0,0.08)'};
          border-radius: ${isDark ? '8px' : '14px'};
          padding: 18px; cursor: pointer;
          transition: all 0.2s ease; position: relative;
        }
        .plan-card:hover { border-color: ${isDark ? 'rgba(88,101,242,0.5)' : '#93c5fd'}; }
        .plan-card.selected {
          border-color: ${isDark ? '#5865f2' : '#3b82f6'};
          background: ${t.planCardSelected};
          box-shadow: 0 0 0 ${isDark ? '2px' : '3px'} ${isDark ? 'rgba(88,101,242,0.3)' : 'rgba(59,130,246,0.15)'};
        }

        .role-pill {
          flex: 1; padding: 12px;
          border-radius: ${isDark ? '6px' : '10px'};
          cursor: pointer; border: 1px solid ${t.rolePillBorder};
          background: ${t.rolePillBg}; transition: all 0.2s; text-align: left;
          font-family: inherit;
        }
        .role-pill.active {
          border-color: ${isDark ? '#5865f2' : '#3b82f6'};
          background: ${t.rolePillActiveBg};
        }
        .role-pill:hover:not(.active) { border-color: ${isDark ? 'rgba(88,101,242,0.4)' : '#93c5fd'}; }

        .next-step-row {
          display: flex; align-items: center; gap: 14px;
          background: ${t.nextStepBg};
          border: ${isDark ? '1px solid rgba(255,255,255,0.07)' : '1.5px solid rgba(0,0,0,0.06)'};
          border-radius: ${isDark ? '8px' : '12px'};
          padding: 14px; cursor: pointer; transition: all 0.2s;
        }
        .next-step-row:hover {
          background: ${isDark ? 'rgba(255,255,255,0.07)' : '#f8faff'};
          border-color: ${isDark ? 'rgba(255,255,255,0.12)' : '#bfdbfe'};
        }

        .eye-btn {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: ${t.eyeColor}; display: flex; align-items: center;
          transition: color 0.2s; padding: 0;
        }
        .eye-btn:hover { color: ${t.eyeHover}; }

        .footer-link {
          color: ${t.footerLink}; text-decoration: none; font-size: 13px; transition: color 0.2s;
        }
        .footer-link:hover { color: ${t.footerLinkHover}; }

        .blob1 {
          position: absolute; width: 500px; height: 500px;
          background: ${t.blobColor1};
          border-radius: 60% 40% 30% 70%/60% 30% 70% 40%;
          animation: blob 12s ease-in-out infinite;
          top: -100px; left: -150px; pointer-events: none;
        }
        .blob2 {
          position: absolute; width: 400px; height: 400px;
          background: ${t.blobColor2};
          border-radius: 30% 60% 70% 40%/50% 60% 30% 60%;
          animation: blob 15s ease-in-out infinite reverse;
          bottom: -100px; right: -100px; pointer-events: none;
        }
        .grid-bg {
          position: absolute; inset: 0;
          background-image: linear-gradient(${t.gridLines} 1px, transparent 1px), linear-gradient(90deg, ${t.gridLines} 1px, transparent 1px);
          background-size: 40px 40px; pointer-events: none;
          animation: gridMove 8s linear infinite alternate;
        }
      `}</style>

      <div className="blob1" />
      <div className="blob2" />
      {isDark && <div className="grid-bg" />}

      {/* Theme toggle */}
      <button className="toggle-btn" onClick={() => setIsDark(!isDark)} title="Toggle theme">
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* ── Left panel ── */}
      <div className="left-animate" style={{
        display: 'none', width: '42%',
        flexDirection: 'column', justifyContent: 'space-between',
        padding: '48px', position: 'relative', zIndex: 1,
        background: isDark ? 'transparent' : 'linear-gradient(145deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%)',
        borderRight: t.leftBorder, transition: 'all 0.4s ease',
      }}
        ref={(el) => { if (el) el.style.display = window.innerWidth >= 1024 ? 'flex' : 'none'; }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: t.logoBg, border: t.logoBorder,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'glow 3s ease-in-out infinite', overflow: 'hidden',
            backdropFilter: 'blur(10px)',
          }}>
            <span style={{ fontSize: '9px', color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.5)' }}>LOGO</span>
          </div>
          <span style={{ fontFamily: "'Syne', sans-serif", fontSize: '22px', fontWeight: 800, color: t.logoText, transition: 'color 0.4s ease' }}>
            EasyFact
          </span>
        </div>

        {/* Headline */}
        <div>
          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: isDark ? '40px' : '42px', fontWeight: 800,
            color: 'white', lineHeight: 1.15, letterSpacing: '-1px',
            whiteSpace: 'pre-line', marginBottom: '16px', transition: 'all 0.4s ease',
          }}>{title}</h1>
          <p style={{ fontSize: '16px', color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.8)', lineHeight: 1.6, transition: 'all 0.4s ease' }}>
            {sub}
          </p>
          <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { label: 'OCR Extraction', desc: 'AI-powered invoice scanning' },
              { label: 'Team Workflows', desc: 'Collaborate with your accountants' },
              { label: 'Real-time Analytics', desc: 'Track your finances at a glance' },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: isDark ? '8px' : '32px', height: isDark ? '8px' : '32px',
                  borderRadius: isDark ? '50%' : '10px',
                  background: isDark ? t.dotColor : 'rgba(255,255,255,0.15)',
                  boxShadow: t.dotShadow, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.4s ease',
                }}>
                  {!isDark && <span style={{ fontSize: '12px', fontWeight: 700, color: 'white' }}>✓</span>}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>{item.label}</div>
                  <div style={{ fontSize: '12px', color: t.featureDesc, marginTop: '2px', transition: 'color 0.4s ease' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '16px' }}>
          {[
            { value: '12,847', label: 'Invoices processed' },
            { value: '98.5%', label: 'OCR accuracy' },
            { value: '2,400+', label: 'Companies' },
          ].map((stat) => (
            <div key={stat.label} style={{
              flex: 1, background: t.statBg, borderRadius: isDark ? '10px' : '14px',
              padding: '14px', border: `1px solid ${t.statBorder}`, textAlign: 'center',
              backdropFilter: 'blur(12px)', transition: 'all 0.4s ease',
            }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: t.statValue, transition: 'color 0.4s ease' }}>{stat.value}</div>
              <div style={{ fontSize: '11px', color: t.statLabel, marginTop: '2px', transition: 'color 0.4s ease' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', position: 'relative', zIndex: 1 }}>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '40px 32px' }}>
          <div style={{ width: '100%', maxWidth: '480px' }}>

            {/* Mobile logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px', justifyContent: 'center' }}>
              <div style={{
                width: '40px', height: '40px',
                background: isDark ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #2563eb, #3b82f6)',
                border: isDark ? '2px dashed rgba(255,255,255,0.2)' : 'none',
                borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', transition: 'all 0.4s ease',
              }}>
                <span style={{ fontSize: '9px', color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.6)' }}>LOGO</span>
              </div>
              <span style={{ fontFamily: "'Syne', sans-serif", fontSize: '22px', fontWeight: 800, color: isDark ? 'white' : '#1e293b', transition: 'color 0.4s ease' }}>
                EasyFact
              </span>
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
                color: isDark ? 'rgba(255,255,255,0.5)' : '#64748b',
                fontSize: '14px', fontFamily: 'inherit', marginBottom: '20px', transition: 'color 0.2s',
              }}
                onMouseEnter={(e) => (e.currentTarget.style.color = isDark ? 'white' : '#1e293b')}
                onMouseLeave={(e) => (e.currentTarget.style.color = isDark ? 'rgba(255,255,255,0.5)' : '#64748b')}
              >
                <ArrowLeft size={16} /> Back
              </button>
            )}

            {/* ══════════ TYPE SELECTION ══════════ */}
            {step === 'type' && (
              <div className="reg-animate">
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '26px', fontWeight: 800, color: t.titleColor, marginBottom: '8px', transition: 'color 0.4s ease' }}>
                  Create an account
                </h2>
                <p style={{ fontSize: '15px', color: t.subColor, marginBottom: '28px', transition: 'color 0.4s ease' }}>
                  Choose how you want to use EasyFact
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { type: 'personal' as RegistrationType, icon: <User size={22} color={isDark ? '#818cf8' : '#3b82f6'} />, bg: isDark ? 'rgba(88,101,242,0.15)' : '#eff3ff', title: 'Personal Account', desc: 'For individual use. Manage your personal invoices with basic features.', badge: 'Free to start', badgeColor: isDark ? '#818cf8' : '#3b82f6' },
                    { type: 'company' as RegistrationType, icon: <Building2 size={22} color={isDark ? '#a78bfa' : '#7c3aed'} />, bg: isDark ? 'rgba(167,139,250,0.12)' : '#f3efff', title: 'Create a Company', desc: 'Become a director. Create your company and invite your team.', badge: '14-day free trial', badgeColor: isDark ? '#a78bfa' : '#7c3aed' },
                    { type: 'join' as RegistrationType, icon: <Users size={22} color={isDark ? '#34d399' : '#059669'} />, bg: isDark ? 'rgba(52,211,153,0.12)' : '#ecfdf5', title: 'Join a Company', desc: 'Join an existing company as an employee or accountant using a company code.', badge: 'Request approval', badgeColor: isDark ? '#34d399' : '#059669' },
                  ].map((item) => (
                    <div key={item.type} className="type-card" onClick={() => handleTypeSelection(item.type)}>
                      <div style={{ width: '44px', height: '44px', flexShrink: 0, background: item.bg, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {item.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: t.titleColor, fontSize: '15px', marginBottom: '4px', transition: 'color 0.4s ease' }}>{item.title}</div>
                        <div style={{ fontSize: '13px', color: t.subColor, lineHeight: 1.4, marginBottom: '8px', transition: 'color 0.4s ease' }}>{item.desc}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Check size={13} color={item.badgeColor} />
                          <span style={{ fontSize: '12px', color: item.badgeColor, fontWeight: 500 }}>{item.badge}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ══════════ ACCOUNT ══════════ */}
            {step === 'account' && (
              <div className="reg-animate">
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '24px', fontWeight: 800, color: t.titleColor, marginBottom: '6px', transition: 'color 0.4s ease' }}>
                  Create your account
                </h2>
                <p style={{ fontSize: '14px', color: t.subColor, marginBottom: '24px', transition: 'color 0.4s ease' }}>
                  {registrationType === 'personal' && 'Set up your personal account'}
                  {registrationType === 'company' && 'Set up your director account'}
                  {registrationType === 'join' && 'Set up your account and join a company'}
                </p>
                <div style={glassCard}>
                  <form onSubmit={handleAccountSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {registrationType === 'join' && (
                      <>
                        <div>
                          <label style={labelStyle}>I want to join as</label>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            {(['employee', 'accountant'] as JoinRole[]).map((role) => (
                              <button key={role} type="button" className={`role-pill ${joinRole === role ? 'active' : ''}`} onClick={() => setJoinRole(role)}>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: t.titleColor, textTransform: 'capitalize', transition: 'color 0.4s ease' }}>{role}</div>
                                <div style={{ fontSize: '11px', color: t.subColor, marginTop: '2px', transition: 'color 0.4s ease' }}>{role === 'employee' ? 'Upload invoices' : 'Validate invoices'}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label style={labelStyle}>Company Code</label>
                          <input className="reg-input" style={inputStyle} type="text" placeholder="e.g., ACME2024"
                            value={formData.companyCode} onChange={(e) => handleInputChange('companyCode', e.target.value)} required />
                        </div>
                      </>
                    )}
                    <div>
                      <label style={labelStyle}>Full Name</label>
                      <input className="reg-input" style={inputStyle} type="text" placeholder="John Doe"
                        value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} required />
                    </div>
                    <div>
                      <label style={labelStyle}>Email</label>
                      <input className="reg-input" style={inputStyle} type="email" placeholder="you@company.com"
                        value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} required />
                    </div>
                    <div>
                      <label style={labelStyle}>Password</label>
                      <div style={{ position: 'relative' }}>
                        <input className="reg-input" style={{ ...inputStyle, paddingRight: '44px' }}
                          type={showPassword ? 'text' : 'password'} placeholder="At least 8 characters"
                          value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)} required />
                        <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Confirm Password</label>
                      <div style={{ position: 'relative' }}>
                        <input className="reg-input" style={{ ...inputStyle, paddingRight: '44px' }}
                          type={showConfirmPassword ? 'text' : 'password'} placeholder="Re-enter your password"
                          value={formData.confirmPassword} onChange={(e) => handleInputChange('confirmPassword', e.target.value)} required />
                        <button type="button" className="eye-btn" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <button type="submit" className="reg-btn" style={{ ...btnStyle, marginTop: '8px' }}>
                      {registrationType === 'company' ? 'Continue to Company Setup' : 'Create Account'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ══════════ COMPANY SETUP ══════════ */}
            {step === 'company-setup' && (
              <div className="reg-animate">
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '24px', fontWeight: 800, color: t.titleColor, marginBottom: '6px', transition: 'color 0.4s ease' }}>
                  Company Setup
                </h2>
                <p style={{ fontSize: '14px', color: t.subColor, marginBottom: '24px', transition: 'color 0.4s ease' }}>Tell us about your company</p>
                <div style={glassCard}>
                  <form onSubmit={handleCompanySetupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div>
                      <label style={labelStyle}>Company Name *</label>
                      <input className="reg-input" style={inputStyle} type="text" placeholder="Acme Corporation"
                        value={formData.companyName} onChange={(e) => handleInputChange('companyName', e.target.value)} required />
                    </div>
                    <div>
                      <label style={labelStyle}>Industry (Optional)</label>
                      <select className="reg-input" style={{ ...inputStyle, appearance: 'none' as any }}
                        value={formData.industry} onChange={(e) => handleInputChange('industry', e.target.value)}>
                        <option value="">Select your industry</option>
                        {industries.map((i) => <option key={i} value={i}>{i}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div>
                        <label style={labelStyle}><Mail size={12} style={{ display: 'inline', marginRight: 4 }} />Email (Optional)</label>
                        <input className="reg-input" style={inputStyle} type="email" placeholder="contact@company.com"
                          value={formData.companyEmail} onChange={(e) => handleInputChange('companyEmail', e.target.value)} />
                      </div>
                      <div>
                        <label style={labelStyle}><Phone size={12} style={{ display: 'inline', marginRight: 4 }} />Phone (Optional)</label>
                        <input className="reg-input" style={inputStyle} type="tel" placeholder="+1 (555) 000-0000"
                          value={formData.companyPhone} onChange={(e) => handleInputChange('companyPhone', e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}><MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />Address (Optional)</label>
                      <textarea className="reg-input" style={{ ...inputStyle, resize: 'vertical', minHeight: '72px' } as any}
                        placeholder="123 Main Street, City, State, ZIP"
                        value={formData.companyAddress} onChange={(e) => handleInputChange('companyAddress', e.target.value)} rows={2} />
                    </div>
                    <button type="submit" className="reg-btn" style={btnStyle}>Continue to Plan Selection</button>
                  </form>
                </div>
              </div>
            )}

            {/* ══════════ SUBSCRIPTION ══════════ */}
            {step === 'subscription' && (
              <div className="reg-animate">
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '24px', fontWeight: 800, color: t.titleColor, marginBottom: '6px', transition: 'color 0.4s ease' }}>
                  Choose Your Plan
                </h2>
                <p style={{ fontSize: '14px', color: t.subColor, marginBottom: '24px', transition: 'color 0.4s ease' }}>Select the subscription that fits your needs</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  {companyPlans.map((plan) => (
                    <div key={plan.type} className={`plan-card ${selectedPlan === plan.type ? 'selected' : ''}`}
                      onClick={() => setSelectedPlan(plan.type)}>
                      {plan.popular && (
                        <div style={{
                          position: 'absolute', top: 0, right: 0,
                          background: t.recommendedBg, color: 'white',
                          fontSize: '10px', fontWeight: 700, padding: '4px 10px',
                          borderRadius: isDark ? '0 8px 0 8px' : '0 14px 0 10px', letterSpacing: '0.5px',
                        }}>RECOMMENDED</div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '15px', fontWeight: 700, color: t.titleColor, marginBottom: '4px', transition: 'color 0.4s ease' }}>{plan.name}</div>
                          <div style={{ fontSize: '12px', color: t.textMuted, marginBottom: '10px', transition: 'color 0.4s ease' }}>{plan.description}</div>
                          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: t.textMuted, transition: 'color 0.4s ease' }}>
                            <span>{plan.invoiceLimit === -1 ? 'Unlimited' : plan.invoiceLimit.toLocaleString()} invoices</span>
                            <span>{plan.userLimit === -1 ? 'Unlimited' : plan.userLimit} users</span>
                            <span>{plan.ocrAccuracy}% OCR</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', marginLeft: '16px' }}>
                          <div style={{ fontSize: '24px', fontWeight: 800, color: t.titleColor, transition: 'color 0.4s ease' }}>${plan.price}</div>
                          <div style={{ fontSize: '11px', color: t.textMuted }}>/month</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="reg-btn" style={btnStyle} onClick={handleSubscriptionSubmit}>
                  <CreditCard size={16} /> Continue to Payment
                </button>
                <p style={{ textAlign: 'center', fontSize: '12px', color: t.textFaint, marginTop: '12px' }}>
                  14-day free trial — Cancel anytime
                </p>
              </div>
            )}

            {/* ══════════ PAYMENT ══════════ */}
            {step === 'payment' && (
              <div className="reg-animate">
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '24px', fontWeight: 800, color: t.titleColor, marginBottom: '6px', transition: 'color 0.4s ease' }}>
                  Payment Information
                </h2>
                <p style={{ fontSize: '14px', color: t.subColor, marginBottom: '20px', transition: 'color 0.4s ease' }}>Complete your subscription setup</p>

                {/* Plan summary */}
                <div style={{
                  background: t.summaryBg, border: `1px solid ${t.summaryBorder}`,
                  borderRadius: isDark ? '8px' : '14px', padding: '16px', marginBottom: '20px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  transition: 'all 0.4s ease',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <Crown size={15} color={isDark ? '#818cf8' : '#3b82f6'} />
                      <span style={{ fontSize: '14px', fontWeight: 600, color: t.titleColor, transition: 'color 0.4s ease' }}>
                        {companyPlans.find(p => p.type === selectedPlan)?.name} Plan
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: t.textMuted }}>{formData.companyName}</div>
                    <div style={{ fontSize: '12px', color: t.trialColor, marginTop: '6px', transition: 'color 0.4s ease' }}>
                      ✓ 14-day free trial — you won't be charged today
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: t.titleColor, transition: 'color 0.4s ease' }}>
                      ${companyPlans.find(p => p.type === selectedPlan)?.price}
                    </div>
                    <div style={{ fontSize: '11px', color: t.textMuted }}>/month</div>
                  </div>
                </div>

                <div style={glassCard}>
                  <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div>
                      <label style={labelStyle}>Cardholder Name</label>
                      <input className="reg-input" style={inputStyle} type="text" placeholder="John Doe"
                        value={formData.cardName} onChange={(e) => handleInputChange('cardName', e.target.value)} required />
                    </div>
                    <div>
                      <label style={labelStyle}>Card Number</label>
                      <input className="reg-input" style={inputStyle} type="text" placeholder="1234 5678 9012 3456"
                        value={formData.cardNumber} onChange={(e) => handleInputChange('cardNumber', e.target.value)} maxLength={19} required />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div>
                        <label style={labelStyle}>Expiry Date</label>
                        <input className="reg-input" style={inputStyle} type="text" placeholder="MM/YY"
                          value={formData.cardExpiry} onChange={(e) => handleInputChange('cardExpiry', e.target.value)} maxLength={5} required />
                      </div>
                      <div>
                        <label style={labelStyle}>CVC</label>
                        <input className="reg-input" style={inputStyle} type="text" placeholder="123"
                          value={formData.cardCVC} onChange={(e) => handleInputChange('cardCVC', e.target.value)} maxLength={4} required />
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: t.securityBg, borderRadius: isDark ? '6px' : '10px', transition: 'background 0.4s ease' }}>
                      <span style={{ fontSize: '14px' }}>🔒</span>
                      <span style={{ fontSize: '12px', color: t.textMuted, transition: 'color 0.4s ease' }}>Your payment is encrypted and secure</span>
                    </div>
                    <button type="submit" className="reg-btn" style={btnStyle}>Confirm and Create Company</button>
                  </form>
                </div>
              </div>
            )}

            {/* ══════════ CONFIRMATION ══════════ */}
            {step === 'confirmation' && (
              <div className="reg-animate" style={{ textAlign: 'center' }}>
                <div style={{
                  width: '72px', height: '72px', borderRadius: '50%',
                  background: t.successCircle, border: `2px solid ${t.successBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px', transition: 'all 0.4s ease',
                }}>
                  <Check size={32} color={t.successColor} />
                </div>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '24px', fontWeight: 800, color: t.titleColor, marginBottom: '8px', transition: 'color 0.4s ease' }}>
                  Company Created!
                </h2>
                <p style={{ fontSize: '14px', color: t.subColor, marginBottom: '28px', transition: 'color 0.4s ease' }}>
                  Welcome to EasyFact, {formData.name}
                </p>

                {/* Company code */}
                <div style={{ background: t.codeBg, border: `1px solid ${t.codeBorder}`, borderRadius: isDark ? '12px' : '16px', padding: '24px', marginBottom: '24px', transition: 'all 0.4s ease' }}>
                  <Building2 size={28} color={isDark ? '#818cf8' : '#3b82f6'} style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontSize: '14px', fontWeight: 600, color: t.titleColor, marginBottom: '4px', transition: 'color 0.4s ease' }}>{formData.companyName}</div>
                  <div style={{ fontSize: '12px', color: t.textMuted, marginBottom: '16px' }}>Company Code</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <code style={{ background: t.codeInnerBg, borderRadius: '8px', padding: '10px 20px', fontSize: '22px', fontWeight: 800, color: t.codeColor, letterSpacing: '4px', transition: 'all 0.4s ease' }}>
                      {generatedCompanyCode || formData.companyCode}
                    </code>
                    <button onClick={copyCompanyCode} style={{ background: t.copyBtnBg, border: `1px solid ${t.copyBtnBorder}`, borderRadius: '8px', padding: '10px 14px', cursor: 'pointer', color: t.copyBtnColor, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontFamily: 'inherit', transition: 'all 0.2s' }}>
                      <Copy size={14} /> Copy
                    </button>
                  </div>
                  <p style={{ fontSize: '12px', color: t.textFaint, marginTop: '12px' }}>Share this code with your team members to invite them</p>
                </div>

                {/* Next steps */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px', textAlign: 'left' }}>
                  {[
                    { icon: <Users size={18} color={isDark ? '#818cf8' : '#3b82f6'} />, bg: isDark ? 'rgba(88,101,242,0.15)' : '#eff3ff', title: 'Invite Employees', desc: 'Add team members to upload invoices' },
                    { icon: <User size={18} color={isDark ? '#a78bfa' : '#7c3aed'} />, bg: isDark ? 'rgba(167,139,250,0.12)' : '#f3efff', title: 'Invite Accountant', desc: 'Add accountants to validate invoices' },
                    { icon: <FileText size={18} color={isDark ? '#34d399' : '#059669'} />, bg: isDark ? 'rgba(52,211,153,0.12)' : '#ecfdf5', title: 'Upload First Invoice', desc: 'Start processing invoices with OCR' },
                  ].map((item, i) => (
                    <div key={i} className="next-step-row">
                      <div style={{ width: '36px', height: '36px', background: item.bg, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.4s ease' }}>
                        {item.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: t.titleColor, transition: 'color 0.4s ease' }}>{item.title}</div>
                        <div style={{ fontSize: '12px', color: t.textMuted, transition: 'color 0.4s ease' }}>{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <button className="reg-btn" style={btnStyle} onClick={() => navigate('/dashboard')}>
                  Go to Dashboard
                </button>
              </div>
            )}

            {/* Sign in link */}
            <div style={{ marginTop: '24px', padding: '16px', background: t.signupBg, borderRadius: t.signupRadius, textAlign: 'center', border: isDark ? 'none' : '1px solid rgba(0,0,0,0.04)', transition: 'all 0.4s ease' }}>
              <span style={{ fontSize: '14px', color: t.signupText, transition: 'color 0.4s ease' }}>Already have an account? </span>
              <Link to="/login" style={{ color: t.accentColor, fontWeight: 600, fontSize: '14px', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = t.accentHover)}
                onMouseLeave={(e) => (e.currentTarget.style.color = t.accentColor)}
              >
                Sign in
              </Link>
            </div>

            {/* Trust badges */}
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '24px' }}>
              {['Secure', 'Fast', 'AI-Powered'].map((badge) => (
                <span key={badge} style={{ fontSize: '12px', color: isDark ? 'rgba(255,255,255,0.25)' : '#94a3b8', fontWeight: 500 }}>{badge}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer style={{ background: t.footerBg, backdropFilter: 'blur(10px)', borderTop: `1px solid ${t.footerBorder}`, padding: '20px 32px', transition: 'all 0.4s ease' }}>
          <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontFamily: "'Syne', sans-serif", fontSize: '13px', fontWeight: 800, color: t.footerText, transition: 'color 0.4s ease' }}>
              EasyFact © {new Date().getFullYear()}
            </span>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {['Privacy Policy', 'Terms', 'Security', 'Support'].map((link) => (
                <a key={link} href="#" className="footer-link">{link}</a>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.statusDot, boxShadow: `0 0 6px ${t.statusDot}` }} />
              <span style={{ fontSize: '13px', color: t.footerText, transition: 'color 0.4s ease' }}>All systems operational</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}