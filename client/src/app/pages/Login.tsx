import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

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

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
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
        @keyframes blob {
          0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; transform: scale(1); }
          50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; transform: scale(1.05); }
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

        .card-animate { animation: fadeSlideUp 0.6s ease both; }
        .card-animate:nth-child(1) { animation-delay: 0.1s; }
        .card-animate:nth-child(2) { animation-delay: 0.2s; }
        .card-animate:nth-child(3) { animation-delay: 0.3s; }
        .card-animate:nth-child(4) { animation-delay: 0.4s; }
        .card-animate:nth-child(5) { animation-delay: 0.5s; }

        .input-dark {
          width: 100%;
          padding: 13px 16px;
          border-radius: 4px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(0,0,0,0.3);
          font-size: 16px;
          font-family: inherit;
          color: white;
          outline: none;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }
        .input-dark:focus {
          border-color: #5865f2;
          background: rgba(0,0,0,0.4);
          box-shadow: 0 0 0 3px rgba(88,101,242,0.2);
        }
        .input-dark::placeholder { color: rgba(255,255,255,0.3); }

        .btn-primary {
          width: 100%;
          padding: 14px;
          border-radius: 4px;
          border: none;
          background: #5865f2;
          color: white;
          font-size: 16px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }
        .btn-primary:hover:not(:disabled) {
          background: #4752c4;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(88,101,242,0.4);
        }
        .btn-primary:active:not(:disabled) { transform: translateY(0); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

        .footer-link {
          color: rgba(255,255,255,0.4);
          text-decoration: none;
          font-size: 13px;
          transition: color 0.2s;
        }
        .footer-link:hover { color: rgba(255,255,255,0.8); }

        .blob1 {
          position: absolute;
          width: 500px; height: 500px;
          background: rgba(88,101,242,0.12);
          border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
          animation: blob 12s ease-in-out infinite;
          top: -100px; left: -150px;
          pointer-events: none;
        }
        .blob2 {
          position: absolute;
          width: 400px; height: 400px;
          background: rgba(30,58,138,0.2);
          border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%;
          animation: blob 15s ease-in-out infinite reverse;
          bottom: -100px; right: -100px;
          pointer-events: none;
        }
        .blob3 {
          position: absolute;
          width: 300px; height: 300px;
          background: rgba(99,102,241,0.08);
          border-radius: 50% 50% 30% 70% / 40% 60% 40% 60%;
          animation: blob 10s ease-in-out infinite;
          animation-delay: -5s;
          top: 50%; right: 10%;
          pointer-events: none;
        }

        .grid-bg {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
          animation: gridMove 8s linear infinite alternate;
        }
      `}</style>

      {/* Background effects */}
      <div className="blob1" />
      <div className="blob2" />
      <div className="blob3" />
      <div className="grid-bg" />

      {/* Main content */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          width: '100%',
          maxWidth: '460px',
          animation: 'fadeSlideUp 0.5s ease both',
        }}>

          {/* Logo area */}
          <div className="card-animate" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '32px',
          }}>
            {/* Logo placeholder — replace with your image */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              background: 'rgba(255,255,255,0.05)',
              border: '2px dashed rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              animation: 'glow 3s ease-in-out infinite',
              overflow: 'hidden',
            }}>
              {/* Replace this div with: <img src="/your-logo.png" style={{width:'100%',height:'100%',objectFit:'contain'}} /> */}
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '8px' }}>
                LOGO
              </span>
            </div>
            <span style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: '26px',
              fontWeight: '800',
              color: 'white',
              letterSpacing: '-0.5px',
            }}>EasyFact</span>
          </div>

          {/* Card */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)',
            borderRadius: '8px',
            padding: '32px',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }}>

            <div className="card-animate" style={{ marginBottom: '24px' }}>
              <h2 style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: '24px',
                fontWeight: '700',
                color: 'white',
                marginBottom: '6px',
              }}>Welcome back!</h2>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
                Sign in to continue to EasyFact
              </p>
            </div>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Email */}
              <div className="card-animate">
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: 'rgba(255,255,255,0.7)',
                  marginBottom: '8px',
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                }}>Email</label>
                <input
                  className="input-dark"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password */}
              <div className="card-animate">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: 'rgba(255,255,255,0.7)',
                    letterSpacing: '0.8px',
                    textTransform: 'uppercase',
                  }}>Password</label>
                  <a href="#" style={{
                    fontSize: '13px',
                    color: '#5865f2',
                    textDecoration: 'none',
                    fontWeight: '500',
                    transition: 'color 0.2s',
                  }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#7983f5')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#5865f2')}
                  >Forgot password?</a>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input-dark"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ paddingRight: '46px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: '12px', top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'rgba(255,255,255,0.3)',
                      display: 'flex', alignItems: 'center',
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <div className="card-animate" style={{ marginTop: '8px' }}>
                <button type="submit" className="btn-primary" disabled={isLoading}>
                  {isLoading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <div style={{
                        width: '16px', height: '16px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: 'white',
                        borderRadius: '50%',
                        animation: 'spin 0.7s linear infinite',
                      }} />
                      Signing in...
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <LogIn size={17} />
                      Sign In
                    </span>
                  )}
                </button>
              </div>

            </form>

            {/* Sign up */}
            <div className="card-animate" style={{
              marginTop: '20px',
              padding: '16px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '4px',
              textAlign: 'center',
            }}>
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
                Need an account?{' '}
              </span>
              <Link to="/register" style={{
                color: '#5865f2',
                fontWeight: '600',
                fontSize: '14px',
                textDecoration: 'none',
                transition: 'color 0.2s',
              }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#7983f5')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#5865f2')}
              >
                Register
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        position: 'relative',
        zIndex: 1,
        background: 'rgba(0,0,0,0.25)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '24px 40px',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
        }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: '16px',
              fontWeight: '800',
              color: 'rgba(255,255,255,0.6)',
            }}>EasyFact</span>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>
              © {new Date().getFullYear()}
            </span>
          </div>

          {/* Links */}
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            {['Privacy Policy', 'Terms of Service', 'Security', 'Support', 'Contact'].map((link) => (
              <a key={link} href="#" className="footer-link">{link}</a>
            ))}
          </div>

          {/* Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '8px', height: '8px',
              borderRadius: '50%',
              background: '#23a55a',
              boxShadow: '0 0 6px rgba(35,165,90,0.6)',
            }} />
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>All systems operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}