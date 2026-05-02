import { useEffect, useState } from 'react';
import { Database, AlertTriangle, Terminal, CheckCircle2, Copy, Play } from 'lucide-react';
import { checkDatabaseHealth, initializeDatabase } from '@/lib/db-setup';

export default function DatabaseSetup() {
  const [status, setStatus] = useState<'checking' | 'missing' | 'ready' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);

  const check = async () => {
    setStatus('checking');
    const result = await checkDatabaseHealth();
    if (result.ok) {
      setStatus('ready');
    } else if (result.error === 'Tables are missing') {
      setStatus('missing');
    } else {
      setStatus('error');
      setErrorMessage(result.error || 'Unknown error');
    }
  };

  useEffect(() => {
    check();
  }, []);

  const handleInitialize = async () => {
    setInitializing(true);
    const result = await initializeDatabase();
    if (result.ok) {
      await check();
    } else {
      setErrorMessage(result.error || 'Failed to initialize. Make sure the RPC function is created.');
    }
    setInitializing(false);
  };

  const sqlContent = `-- Copy this to your Supabase SQL Editor to create the RPC function first:

CREATE OR REPLACE FUNCTION public.initialize_girilog_schema()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Clients Table
    CREATE TABLE IF NOT EXISTS public.girilog_clients (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID NOT NULL DEFAULT auth.uid(),
        name TEXT NOT NULL,
        company TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        short_code TEXT,
        tax_enabled BOOLEAN DEFAULT FALSE,
        default_tax_rate NUMERIC DEFAULT 0,
        default_hourly_rate NUMERIC,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 2. Invoices Table
    CREATE TABLE IF NOT EXISTS public.girilog_invoices (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID NOT NULL DEFAULT auth.uid(),
        invoice_number TEXT NOT NULL,
        client_id BIGINT REFERENCES public.girilog_clients(id) ON DELETE SET NULL,
        client_name TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
        due_date DATE,
        subtotal NUMERIC NOT NULL DEFAULT 0,
        tax_rate NUMERIC NOT NULL DEFAULT 0,
        tax_amount NUMERIC NOT NULL DEFAULT 0,
        discount_amount NUMERIC NOT NULL DEFAULT 0,
        total NUMERIC NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'USD',
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 3. Line Items Table
    CREATE TABLE IF NOT EXISTS public.girilog_line_items (
        id BIGSERIAL PRIMARY KEY,
        invoice_id BIGINT NOT NULL REFERENCES public.girilog_invoices(id) ON DELETE CASCADE,
        user_id UUID NOT NULL DEFAULT auth.uid(),
        description TEXT NOT NULL,
        quantity NUMERIC NOT NULL DEFAULT 1,
        unit_price NUMERIC NOT NULL DEFAULT 0,
        amount NUMERIC NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 4. Settings Table
    CREATE TABLE IF NOT EXISTS public.girilog_settings (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID NOT NULL UNIQUE DEFAULT auth.uid(),
        business_name TEXT,
        business_email TEXT,
        business_address TEXT,
        business_phone TEXT,
        logo_url TEXT,
        invoice_prefix TEXT DEFAULT 'INV-',
        default_tax_rate NUMERIC DEFAULT 0,
        currency TEXT DEFAULT 'USD',
        annual_revenue_goal NUMERIC DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Ensure missing columns exist (for existing tables)
    DO $$ 
    BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='girilog_settings' AND column_name='business_address') THEN
            ALTER TABLE public.girilog_settings ADD COLUMN business_address TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='girilog_settings' AND column_name='annual_revenue_goal') THEN
            ALTER TABLE public.girilog_settings ADD COLUMN annual_revenue_goal NUMERIC DEFAULT 0;
        END IF;

        -- Add missing columns to girilog_clients
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='girilog_clients' AND column_name='short_code') THEN
            ALTER TABLE public.girilog_clients ADD COLUMN short_code TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='girilog_clients' AND column_name='tax_enabled') THEN
            ALTER TABLE public.girilog_clients ADD COLUMN tax_enabled BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='girilog_clients' AND column_name='default_tax_rate') THEN
            ALTER TABLE public.girilog_clients ADD COLUMN default_tax_rate NUMERIC DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='girilog_clients' AND column_name='default_hourly_rate') THEN
            ALTER TABLE public.girilog_clients ADD COLUMN default_hourly_rate NUMERIC;
        END IF;
    END $$;

    -- Enable RLS
    ALTER TABLE public.girilog_clients ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.girilog_invoices ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.girilog_line_items ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.girilog_settings ENABLE ROW LEVEL SECURITY;

    -- RLS Policies
    BEGIN
        CREATE POLICY "Users can manage their own clients" ON public.girilog_clients FOR ALL USING (auth.uid() = user_id);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        CREATE POLICY "Users can manage their own invoices" ON public.girilog_invoices FOR ALL USING (auth.uid() = user_id);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        CREATE POLICY "Users can manage their own line items" ON public.girilog_line_items FOR ALL USING (auth.uid() = user_id);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        CREATE POLICY "Users can manage their own settings" ON public.girilog_settings FOR ALL USING (auth.uid() = user_id);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    -- 5. User Initialization Trigger
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $inner$
    BEGIN
      BEGIN
        INSERT INTO public.girilog_settings (user_id, business_name, business_email, invoice_prefix, currency)
        VALUES (new.id, 'My Business', new.email, 'INV-', 'USD')
        ON CONFLICT (user_id) DO NOTHING;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Could not create initial settings for user %: %', new.id, SQLERRM;
      END;
      RETURN new;
    END;
    $inner$;

    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
END;
$$;`;

  return (
    <div className="min-h-screen bg-[#0D0F14] text-white p-8 font-mono">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4 mb-12">
          <div className="p-3 bg-[#10B981]/10 rounded-lg">
            <Database className="w-8 h-8 text-[#10B981]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Database Initialization</h1>
            <p className="text-[#6B7280]">Connect and repair your Supabase environment</p>
          </div>
        </div>

        {status === 'checking' && (
          <div className="flex items-center gap-3 text-[#6B7280] animate-pulse">
            <Terminal className="w-5 h-5" />
            <span>Scanning database structure...</span>
          </div>
        )}

        {status === 'ready' && (
          <div className="bg-[#10B981]/5 border border-[#10B981]/20 rounded-xl p-8 text-center space-y-4">
            <div className="inline-flex p-3 bg-[#10B981]/10 rounded-full">
              <CheckCircle2 className="w-12 h-12 text-[#10B981]" />
            </div>
            <h2 className="text-xl font-bold">Database is Healthy</h2>
            <p className="text-[#6B7280]">All required tables and policies are present.</p>
            <button 
              onClick={() => window.location.href = '/dashboard'}
              className="px-6 py-2 bg-[#10B981] hover:bg-[#059669] text-black font-bold rounded-lg transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {status === 'missing' && (
          <div className="space-y-6">
            <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-8 space-y-4">
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-8 h-8 text-orange-500 shrink-0" />
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-orange-500">Missing Tables Detected</h2>
                  <p className="text-[#9CA3AF]">
                    The required tables for GiriLog do not exist in your current Supabase project. 
                    You can initialize them "on-the-fly" by setting up an RPC function.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-[#21262D] border-b border-[#30363D]">
                <div className="flex items-center gap-2 text-sm text-[#8B949E]">
                  <Terminal className="w-4 h-4" />
                  <span>Setup SQL script</span>
                </div>
                <button 
                  onClick={() => navigator.clipboard.writeText(sqlContent)}
                  className="p-1 hover:bg-[#30363D] rounded transition-colors text-[#8B949E]"
                  title="Copy SQL"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 overflow-auto max-h-96 text-xs text-[#E6EDF3]">
                <pre>{sqlContent}</pre>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-[#6B7280] text-center max-w-lg">
                After running the SQL above in your Supabase SQL Editor, click the button below 
                to trigger the initialization from the app.
              </p>
              <button 
                onClick={handleInitialize}
                disabled={initializing}
                className="flex items-center gap-2 px-8 py-3 bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-black font-bold rounded-xl transition-all"
              >
                {initializing ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <Play className="w-5 h-5 fill-current" />
                )}
                Initialize Tables on the fly
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-8 space-y-4">
            <div className="flex items-center gap-3 text-red-500">
              <AlertTriangle className="w-6 h-6" />
              <h2 className="text-xl font-bold">Connection Error</h2>
            </div>
            <p className="text-[#9CA3AF]">{errorMessage}</p>
            <button 
              onClick={check}
              className="px-6 py-2 bg-[#30363D] hover:bg-[#3c444d] rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
