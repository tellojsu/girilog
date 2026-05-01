import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

type Mode = 'login' | 'signup' | 'forgot';

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate(redirect, { replace: true });
    });
  }, [navigate, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset`,
        });
        if (error) throw error;
        setMessage({ text: 'Check your email for a reset link.', ok: true });
        setLoading(false);
        return;
      }

      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ text: 'Account created! Check your email to confirm.', ok: true });
        setLoading(false);
        return;
      }

      // Login
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate(redirect, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      setMessage({ text: msg, ok: false });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full bg-[#1E2330] border border-[#2A3040] rounded-xl px-4 py-3 text-sm text-white placeholder-[#4B5563] focus:outline-none focus:border-[#10B981]/50 transition-colors font-mono';

  const titles: Record<Mode, { heading: string; sub: string; btn: string }> = {
    login: { heading: 'Welcome back', sub: 'Sign in to your GiriLog workspace', btn: 'Sign in' },
    signup: { heading: 'Create account', sub: 'Start managing invoices for free', btn: 'Create account' },
    forgot: { heading: 'Reset password', sub: 'We\'ll send a reset link to your email', btn: 'Send reset link' },
  };

  const { heading, sub, btn } = titles[mode];

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setOauthLoading(provider);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      setMessage({ text: error.message, ok: false });
      setOauthLoading(null);
    }
    // On success the browser redirects — no need to reset loading
  };

  return (
    <div className="min-h-screen bg-[#0D0F14] flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2.5 cursor-pointer">
          <img
            src="https://static.readdy.ai/image/9e0ec1f08df5eac0f8e6ee60a23adb36/f0b2bffe117229733d1297ec943beb71.png"
            alt="GiriLog"
            className="w-7 h-7 object-contain"
          />
          <span className="text-white font-bold text-lg tracking-tight font-mono">GiriLog</span>
        </Link>
        <Link to="/" className="text-sm text-[#6B7280] hover:text-white transition-colors font-mono cursor-pointer">
          ← Back to home
        </Link>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Glow */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#10B981]/6 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative bg-[#0A0C10] border border-[#1E2330] rounded-2xl p-8">
            {/* Icon */}
            <div className="w-12 h-12 rounded-2xl bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center mb-6">
              <i className={`${mode === 'forgot' ? 'ri-lock-password-line' : mode === 'signup' ? 'ri-user-add-line' : 'ri-login-box-line'} text-[#10B981] text-xl`} />
            </div>

            <h1 className="text-2xl font-bold text-white mb-1">{heading}</h1>
            <p className="text-sm text-[#6B7280] font-mono mb-6">{sub}</p>

            {/* Social login hidden for now */}
            {/* {mode !== 'forgot' && (
              <div className="space-y-3 mb-6">
                <button
                  type="button"
                  onClick={() => handleOAuth('google')}
                  disabled={oauthLoading !== null}
                  className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-800 font-medium py-3 rounded-xl transition-colors cursor-pointer whitespace-nowrap text-sm border border-gray-200"
                >
                  {oauthLoading === 'google' ? (
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
                    </svg>
                  )}
                  Continue with Google
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuth('apple')}
                  disabled={oauthLoading !== null}
                  className="w-full flex items-center justify-center gap-3 bg-[#1A1A1A] hover:bg-[#222] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors cursor-pointer whitespace-nowrap text-sm border border-[#2A2A2A]"
                >
                  {oauthLoading === 'apple' ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg width="17" height="20" viewBox="0 0 17 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13.769 10.557c-.02-2.107 1.72-3.12 1.797-3.17-0.978-1.43-2.5-1.627-3.044-1.648-1.296-.131-2.53.763-3.187.763-.657 0-1.672-.745-2.748-.725-1.41.02-2.712.822-3.437 2.083-1.468 2.543-.376 6.313 1.054 8.378.698 1.007 1.527 2.135 2.614 2.095 1.052-.04 1.449-.676 2.72-.676 1.272 0 1.629.676 2.74.654 1.132-.02 1.845-1.025 2.534-2.036.8-1.163 1.13-2.29 1.148-2.349-.025-.01-2.196-.842-2.191-3.369ZM11.617 4.14C12.17 3.47 12.55 2.543 12.44 1.6c-.8.033-1.77.534-2.343 1.204-.514.596-.965 1.55-.843 2.463.89.069 1.8-.453 2.363-1.127Z" fill="white"/>
                    </svg>
                  )}
                  Continue with Apple
                </button>

                <div className="relative flex items-center gap-3 pt-1">
                  <div className="flex-1 h-px bg-[#1E2330]" />
                  <span className="text-xs text-[#4B5563] font-mono">or continue with email</span>
                  <div className="flex-1 h-px bg-[#1E2330]" />
                </div>
              </div>
            )} */}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-[#6B7280] font-mono uppercase tracking-wider mb-1.5">Email</label>
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className={inputClass}
                />
              </div>

              {mode !== 'forgot' && (
                <div>
                  <label className="block text-xs text-[#6B7280] font-mono uppercase tracking-wider mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      className={`${inputClass} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-[#4B5563] hover:text-[#8B9AB0] transition-colors cursor-pointer"
                    >
                      <i className={showPassword ? 'ri-eye-off-line text-sm' : 'ri-eye-line text-sm'} />
                    </button>
                  </div>
                  {mode === 'login' && (
                    <div className="text-right mt-1.5">
                      <button
                        type="button"
                        onClick={() => { setMode('forgot'); setMessage(null); }}
                        className="text-xs text-[#6B7280] hover:text-[#10B981] font-mono transition-colors cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}
                </div>
              )}

              {message && (
                <div className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-mono ${message.ok ? 'bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981]' : 'bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444]'}`}>
                  <i className={`${message.ok ? 'ri-checkbox-circle-line' : 'ri-error-warning-line'} text-base shrink-0 mt-0.5`} />
                  <span>{message.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors cursor-pointer whitespace-nowrap text-sm mt-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <i className={mode === 'forgot' ? 'ri-send-plane-line' : 'ri-arrow-right-line'} />
                )}
                {loading ? 'Please wait...' : btn}
              </button>
            </form>

            {/* Mode switcher */}
            <div className="mt-6 pt-6 border-t border-[#1E2330] text-center">
              {mode === 'login' && (
                <p className="text-sm text-[#6B7280] font-mono">
                  Don&apos;t have an account?{' '}
                  <button onClick={() => { setMode('signup'); setMessage(null); }} className="text-[#10B981] hover:text-[#34D399] transition-colors cursor-pointer font-medium">
                    Sign up
                  </button>
                </p>
              )}
              {mode === 'signup' && (
                <p className="text-sm text-[#6B7280] font-mono">
                  Already have an account?{' '}
                  <button onClick={() => { setMode('login'); setMessage(null); }} className="text-[#10B981] hover:text-[#34D399] transition-colors cursor-pointer font-medium">
                    Sign in
                  </button>
                </p>
              )}
              {mode === 'forgot' && (
                <button onClick={() => { setMode('login'); setMessage(null); }} className="text-sm text-[#6B7280] hover:text-white font-mono transition-colors cursor-pointer">
                  ← Back to sign in
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
