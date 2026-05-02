import { useEffect, useState, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { checkDatabaseHealth } from '@/lib/db-setup';

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      if (!data.session) {
        navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
        return;
      }

      // Check database health after session is confirmed
      const health = await checkDatabaseHealth();
      if (!health.ok && health.error === 'Tables are missing' && location.pathname !== '/db-setup') {
        navigate('/db-setup', { replace: true });
      }

      setChecking(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (!session) {
        navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0D0F14] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#6B7280]">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-sm font-mono">Loading...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
