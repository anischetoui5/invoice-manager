import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { FileText, LogIn } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

const handleLogin = (e: React.FormEvent) => {
  e.preventDefault();
  navigate('/');
};

  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="hidden w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 lg:flex lg:flex-col lg:justify-center lg:px-16">

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
            <FileText className="h-7 w-7 text-white" />
          </div>
          <span className="text-3xl font-bold text-white">EasyFact</span>
        </div>

        <h1 className="mt-8 text-4xl font-bold leading-tight text-white">
          Streamline Your Invoice Management
        </h1>

        <p className="mt-4 text-lg text-blue-100">
          Automated OCR extraction, validation workflows, and powerful analytics for your business.
        </p>
        
        <div className="mt-12 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
              <span className="text-sm font-semibold text-white">1</span>
            </div>
            <div>
              <h3 className="font-semibold text-white">Upload Invoices</h3>
              <p className="text-sm text-blue-100">
                Drag and drop PDF or image files
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
              <span className="text-sm font-semibold text-white">2</span>
            </div>
            <div>
              <h3 className="font-semibold text-white">Automatic OCR Extraction</h3>
              <p className="text-sm text-blue-100">
                AI-powered data extraction from invoices
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
              <span className="text-sm font-semibold text-white">3</span>
            </div>
            <div>
              <h3 className="font-semibold text-white">Review & Approve</h3>
              <p className="text-sm text-blue-100">
                Validate and approve with easy workflows
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex w-full flex-col justify-center px-8 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center justify-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-slate-800">InvoiceFlow</span>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-slate-800">Welcome back</h2>
          <p className="mt-2 text-slate-600">
            Sign in to your account to continue
          </p>

          <form onSubmit={handleLogin} className="mt-8 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-600">Remember me</span>
              </label>
              <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                Forgot password?
              </a>
            </div>

            <Button type="submit" className="w-full bg-black text-white hover:bg-gray-800" size="lg">
              <LogIn className="mr-2 h-5 w-5" />
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            Don't have an account?{' '}
            <Link to="/registrer" className="font-medium text-blue-600 hover:text-blue-700">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}