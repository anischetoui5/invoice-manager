import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('activeWorkspaceId', response.data.activeWorkspaceId);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  // Theme tokens
  const t = isDark ? {
    pageBg: 'linear-gradient(135deg, #1a1d3a 0%, #2d2b69 40%, #1e3a8a 100%)',
    leftBg: 'transparent',
    leftBorder: '1px solid rgba(255,255,255,0.06)',
    cardBg: 'rgba(255,255,255,0.05)',
    cardBorder: '1px solid rgba(255,255,255,0.08)',
    cardShadow: '0 20px 60px rgba(0,0,0,0.4)',
    titleColor: 'white',
    subColor: 'rgba(255,255,255,0.5)',
    labelColor: 'rgba(255,255,255,0.6)',
    inputBg: 'rgba(0,0,0,0.25)',
    inputBorder: 'rgba(255,255,255,0.1)',
    inputFocus: '#5865f2',
    inputColor: 'white',
    inputPlaceholder: 'rgba(255,255,255,0.25)',
    btnBg: '#5865f2',
    btnHover: '#4752c4',
    btnShadow: 'rgba(88,101,242,0.4)',
    accentColor: '#5865f2',
    accentHover: '#7983f5',
    signupBg: 'rgba(0,0,0,0.2)',
    signupText: 'rgba(255,255,255,0.5)',
    footerBg: 'rgba(0,0,0,0.25)',
    footerBorder: 'rgba(255,255,255,0.06)',
    footerText: 'rgba(255,255,255,0.3)',
    footerLink: 'rgba(255,255,255,0.4)',
    toggleBg: 'rgba(255,255,255,0.1)',
    toggleColor: 'rgba(255,255,255,0.7)',
    statBg: 'rgba(255,255,255,0.05)',
    statBorder: 'rgba(255,255,255,0.08)',
    statValue: '#818cf8',
    statLabel: 'rgba(255,255,255,0.4)',
    featureColor: 'white',
    featureDesc: 'rgba(255,255,255,0.45)',
    dotColor: '#5865f2',
    logoText: 'white',
    statusDot: '#23a55a',
    statusText: 'rgba(255,255,255,0.4)',
    checkboxAccent: '#5865f2',
    forgotColor: '#5865f2',
    eyeColor: 'rgba(255,255,255,0.3)',
    eyeHover: 'rgba(255,255,255,0.7)',
    gridLines: 'rgba(255,255,255,0.03)',
    blobColor1: 'rgba(88,101,242,0.12)',
    blobColor2: 'rgba(30,58,138,0.2)',
  } : {
    pageBg: '#f0f4ff',
    leftBg: 'linear-gradient(145deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%)',
    leftBorder: 'none',
    cardBg: 'white',
    cardBorder: '1px solid rgba(0,0,0,0.06)',
    cardShadow: '0 8px 32px rgba(37,99,235,0.1)',
    titleColor: '#0f172a',
    subColor: '#64748b',
    labelColor: '#374151',
    inputBg: 'white',
    inputBorder: 'rgba(0,0,0,0.08)',
    inputFocus: '#3b82f6',
    inputColor: '#1e293b',
    inputPlaceholder: '#94a3b8',
    btnBg: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    btnHover: 'linear-gradient(135deg, #1d4ed8, #1e40af)',
    btnShadow: 'rgba(37,99,235,0.4)',
    accentColor: '#3b82f6',
    accentHover: '#1d4ed8',
    signupBg: '#f8faff',
    signupText: '#64748b',
    footerBg: 'white',
    footerBorder: 'rgba(0,0,0,0.06)',
    footerText: '#94a3b8',
    footerLink: '#94a3b8',
    toggleBg: 'rgba(37,99,235,0.1)',
    toggleColor: '#2563eb',
    statBg: 'rgba(255,255,255,0.15)',
    statBorder: 'rgba(255,255,255,0.2)',
    statValue: '#bfdbfe',
    statLabel: 'rgba(255,255,255,0.7)',
    featureColor: 'white',
    featureDesc: 'rgba(255,255,255,0.7)',
    dotColor: 'rgba(255,255,255,0.6)',
    logoText: 'white',
    statusDot: '#34d399',
    statusText: 'rgba(255,255,255,0.7)',
    checkboxAccent: '#3b82f6',
    forgotColor: '#3b82f6',
    eyeColor: '#94a3b8',
    eyeHover: '#3b82f6',
    gridLines: 'transparent',
    blobColor1: 'rgba(255,255,255,0.06)',
    blobColor2: 'rgba(255,255,255,0.04)',
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      background: t.pageBg,
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.4s ease',
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
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.3); }
          50% { box-shadow: 0 0 40px rgba(99,102,241,0.6); }
        }
        @keyframes gridMove {
          from { transform: translateY(0); }
          to { transform: translateY(40px); }
        }

        .login-card-animate { animation: fadeSlideUp 0.5s ease both; }
        .login-left-animate { animation: fadeSlideRight 0.6s ease both; }
        .float-card { animation: float 6s ease-in-out infinite; }
        .float-card:nth-child(2) { animation-delay: -3s; }

        .login-input {
          width: 100%;
          padding: 13px 16px;
          border-radius: ${isDark ? '4px' : '12px'};
          font-size: 15px;
          font-family: inherit;
          outline: none;
          transition: all 0.25s ease;
          box-sizing: border-box;
          background: ${t.inputBg};
          border: ${isDark ? `1px solid ${t.inputBorder}` : `2px solid transparent`};
          color: ${t.inputColor};
          box-shadow: ${isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.08)'};
        }
        .login-input:focus {
          border-color: ${t.inputFocus};
          box-shadow: 0 0 0 ${isDark ? '3px' : '4px'} ${isDark ? 'rgba(88,101,242,0.2)' : 'rgba(59,130,246,0.12)'};
        }
        .login-input::placeholder { color: ${t.inputPlaceholder}; }

        .login-btn {
          width: 100%;
          padding: 14px;
          border-radius: ${isDark ? '4px' : '12px'};
          border: none;
          background: ${t.btnBg};
          color: white;
          font-size: 15px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.25s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .login-btn:hover:not(:disabled) {
          background: ${t.btnHover};
          transform: translateY(-2px);
          box-shadow: 0 8px 25px ${t.btnShadow};
        }
        .login-btn:active:not(:disabled) { transform: translateY(0); }
        .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .toggle-btn {
          background: ${t.toggleBg};
          border: none;
          border-radius: 50%;
          width: 40px; height: 40px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          color: ${t.toggleColor};
          transition: all 0.3s ease;
          position: absolute;
          top: 20px; right: 20px;
          z-index: 10;
        }
        .toggle-btn:hover { transform: rotate(20deg) scale(1.1); }

        .footer-lnk {
          color: ${t.footerLink};
          text-decoration: none;
          font-size: 13px;
          transition: color 0.2s;
        }
        .footer-lnk:hover { color: ${isDark ? 'rgba(255,255,255,0.8)' : '#64748b'}; }

        .blob1 {
          position: absolute; pointer-events: none;
          width: 500px; height: 500px;
          background: ${t.blobColor1};
          border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
          animation: blob 12s ease-in-out infinite;
          top: -100px; left: -150px;
        }
        .blob2 {
          position: absolute; pointer-events: none;
          width: 400px; height: 400px;
          background: ${t.blobColor2};
          border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%;
          animation: blob 15s ease-in-out infinite reverse;
          bottom: -100px; right: -100px;
        }
        .grid-bg {
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(${t.gridLines} 1px, transparent 1px),
            linear-gradient(90deg, ${t.gridLines} 1px, transparent 1px);
          background-size: 40px 40px;
          animation: gridMove 8s linear infinite alternate;
        }
      `}</style>

      {/* Background */}
      <div className="blob1" />
      <div className="blob2" />
      {isDark && <div className="grid-bg" />}

      {/* Theme toggle */}
      <button className="toggle-btn" onClick={() => setIsDark(!isDark)} title="Toggle theme">
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', zIndex: 1 }}>

        {/* Left panel */}
        <div className="login-left-animate" style={{
          display: 'none',
          width: '50%',
          background: t.leftBg,
          borderRight: t.leftBorder,
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.4s ease',
        }}
        ref={(el) => { if (el) el.style.display = window.innerWidth >= 1024 ? 'flex' : 'none'; }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '52px', height: '52px',
              borderRadius: '16px',
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              border: isDark ? '2px dashed rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
              animation: 'glow 3s ease-in-out infinite',
            }}>
              {/* Replace with your logo: <img src="/logo.png" style={{width:'100%',height:'100%',objectFit:'contain'}} /> */}
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>LOGO</span>
            </div>
            <span style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: '26px', fontWeight: '800',
              color: t.logoText,
            }}>EasyFact</span>
          </div>

          {/* Center content */}
          <div>
            <h1 style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: isDark ? '40px' : '42px',
              fontWeight: '800',
              color: 'white',
              lineHeight: '1.15',
              letterSpacing: '-1px',
              marginBottom: '16px',
            }}>
              {isDark ? 'Smart Invoice\nManagement' : 'Streamline Your\nInvoice Management'}
            </h1>
            <p style={{
              fontSize: '17px',
              color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.8)',
              lineHeight: '1.6',
              marginBottom: '40px',
            }}>
              Automate your invoice workflow with AI-powered OCR extraction and real-time analytics.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {[
                { label: 'Upload Invoices', desc: 'Drag and drop PDF or image files' },
                { label: 'OCR Extraction', desc: 'AI-powered data extraction instantly' },
                { label: 'Review & Approve', desc: 'Validate with smart workflows' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: isDark ? '8px' : '32px',
                    height: isDark ? '8px' : '32px',
                    borderRadius: isDark ? '50%' : '10px',
                    background: isDark ? t.dotColor : 'rgba(255,255,255,0.15)',
                    boxShadow: isDark ? `0 0 8px ${t.dotColor}` : 'none',
                    flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.4s ease',
                  }}>
                    {!isDark && <span style={{ fontSize: '12px', fontWeight: '700', color: 'white' }}>0{i + 1}</span>}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', color: 'white', fontSize: '15px' }}>{item.label}</div>
                    <div style={{ fontSize: '13px', color: t.featureDesc, marginTop: '2px' }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '14px' }}>
            {[
              { value: '12,847', label: 'Invoices processed' },
              { value: '98.5%', label: 'OCR accuracy' },
            ].map((stat) => (
              <div key={stat.label} className="float-card" style={{
                flex: 1,
                background: t.statBg,
                backdropFilter: 'blur(12px)',
                borderRadius: isDark ? '10px' : '14px',
                padding: '14px',
                border: `1px solid ${t.statBorder}`,
                transition: 'all 0.4s ease',
              }}>
                <div style={{ fontSize: '11px', color: t.statLabel, marginBottom: '4px' }}>{stat.label}</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: t.statValue }}>{stat.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px 32px',
        }}>
          <div style={{ width: '100%', maxWidth: '420px' }}>

            {/* Mobile logo */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              marginBottom: '36px', justifyContent: 'center',
            }}>
              <div style={{
                width: '44px', height: '44px',
                background: isDark ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #2563eb, #3b82f6)',
                border: isDark ? '2px dashed rgba(255,255,255,0.2)' : 'none',
                borderRadius: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
                transition: 'all 0.4s ease',
              }}>
                {/* Replace with your logo */}
                <span style={{ fontSize: '9px', color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.6)' }}>LOGO</span>
              </div>
              <span style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: '22px', fontWeight: '800',
                color: isDark ? 'white' : '#1e293b',
                transition: 'color 0.4s ease',
              }}>EasyFact</span>
            </div>

            {/* Card */}
            <div className="login-card-animate" style={{
              background: t.cardBg,
              backdropFilter: 'blur(20px)',
              borderRadius: isDark ? '8px' : '20px',
              padding: '32px',
              border: t.cardBorder,
              boxShadow: t.cardShadow,
              transition: 'all 0.4s ease',
            }}>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: '26px', fontWeight: '800',
                  color: t.titleColor,
                  marginBottom: '6px',
                  transition: 'color 0.4s ease',
                }}>Welcome back!</h2>
                <p style={{ fontSize: '14px', color: t.subColor, transition: 'color 0.4s ease' }}>
                  Sign in to continue to EasyFact
                </p>
              </div>

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

                {/* Email */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: isDark ? '12px' : '13px',
                    fontWeight: isDark ? '700' : '600',
                    color: t.labelColor,
                    marginBottom: '8px',
                    letterSpacing: isDark ? '0.8px' : '0.3px',
                    textTransform: isDark ? 'uppercase' : 'none',
                    transition: 'all 0.4s ease',
                  }}>Email</label>
                  <input
                    className="login-input"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                {/* Password */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{
                      fontSize: isDark ? '12px' : '13px',
                      fontWeight: isDark ? '700' : '600',
                      color: t.labelColor,
                      letterSpacing: isDark ? '0.8px' : '0.3px',
                      textTransform: isDark ? 'uppercase' : 'none',
                      transition: 'all 0.4s ease',
                    }}>Password</label>
                    <a href="#" style={{
                      fontSize: '13px', color: t.forgotColor,
                      textDecoration: 'none', fontWeight: '500',
                      transition: 'color 0.2s',
                    }}>Forgot password?</a>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="login-input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      style={{ paddingRight: '46px' }}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                      position: 'absolute', right: '12px', top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: t.eyeColor, display: 'flex', alignItems: 'center',
                      transition: 'color 0.2s',
                    }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = t.eyeHover)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = t.eyeColor)}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {/* Remember me */}
                {!isDark && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" style={{ width: '16px', height: '16px', accentColor: t.checkboxAccent }} />
                    <span style={{ fontSize: '13px', color: t.subColor }}>Remember me</span>
                  </label>
                )}

                {/* Submit */}
                <button type="submit" className="login-btn" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <div style={{
                        width: '16px', height: '16px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: 'white', borderRadius: '50%',
                        animation: 'spin 0.7s linear infinite',
                      }} />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn size={17} />
                      Sign In
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Sign up */}
            <div style={{
              marginTop: '16px', padding: '16px',
              background: t.signupBg,
              borderRadius: isDark ? '4px' : '14px',
              textAlign: 'center',
              border: isDark ? 'none' : '1px solid rgba(0,0,0,0.04)',
              transition: 'all 0.4s ease',
            }}>
              <span style={{ fontSize: '14px', color: t.signupText }}>
                Need an account?{' '}
              </span>
              <Link to="/register" style={{
                color: t.accentColor, fontWeight: '600',
                fontSize: '14px', textDecoration: 'none',
              }}>
                Create account
              </Link>
            </div>

            {/* Trust badges */}
            <div style={{
              marginTop: '20px',
              display: 'flex', justifyContent: 'center', gap: '24px',
            }}>
              {['Secure', 'Fast', 'AI-Powered'].map((badge) => (
                <span key={badge} style={{
                  fontSize: '12px',
                  color: isDark ? 'rgba(255,255,255,0.25)' : '#94a3b8',
                  fontWeight: '500',
                }}>{badge}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        position: 'relative', zIndex: 1,
        background: t.footerBg,
        backdropFilter: 'blur(10px)',
        borderTop: `1px solid ${t.footerBorder}`,
        padding: '20px 40px',
        transition: 'all 0.4s ease',
      }}>
        <div style={{
          maxWidth: '1200px', margin: '0 auto',
          display: 'flex', flexWrap: 'wrap',
          justifyContent: 'space-between', alignItems: 'center', gap: '12px',
        }}>
          <span style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: '15px', fontWeight: '800',
            color: t.footerText,
          }}>EasyFact © {new Date().getFullYear()}</span>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            {['Privacy Policy', 'Terms of Service', 'Security', 'Support', 'Contact'].map((link) => (
              <a key={link} href="#" className="footer-lnk">{link}</a>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: t.statusDot,
              boxShadow: `0 0 6px ${t.statusDot}`,
            }} />
            <span style={{ fontSize: '13px', color: t.statusText }}>All systems operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}