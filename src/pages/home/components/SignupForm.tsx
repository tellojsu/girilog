import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function SignupForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/dashboard', { replace: true });
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      if (data.session) {
        navigate('/dashboard', { replace: true });
      } else {
        setMessage({ text: 'Account created!', ok: true });
        setEmail('');
        setPassword('');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      setMessage({ text: msg, ok: false });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full bg-[#1E2330] border border-[#2A3040] rounded-xl px-4 py-3 text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-primary/50 transition-colors font-mono';

  return (
    <div className="w-full max-w-sm mx-auto text-left">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-[#6B7280] font-mono uppercase tracking-wider mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs text-[#6B7280] font-mono uppercase tracking-wider mb-1.5">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className={`${inputClass} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-secondary hover:text-[#8B9AB0] transition-colors cursor-pointer"
            >
              <i className={showPassword ? 'ri-eye-off-line text-sm' : 'ri-eye-line text-sm'} />
            </button>
          </div>
        </div>

        {message && (
          <div className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-mono ${message.ok ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444]'}`}>
            <i className={`${message.ok ? 'ri-checkbox-circle-line' : 'ri-error-warning-line'} text-base shrink-0 mt-0.5`} />
            <span>{message.text}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap text-base mt-2"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <i className="ri-user-add-line" />
          )}
          {loading ? 'Creating account...' : 'Create free account'}
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-[#6B7280] font-mono">
        Already have an account? <a href="/login" className="text-primary hover:underline">Sign in</a>
      </p>
    </div>
  );
}
