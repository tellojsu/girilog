-- GiriLog Database Schema Initialization
-- This script creates the necessary tables and enables Row Level Security (RLS)

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
    logo_url TEXT,
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
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='girilog_clients' AND column_name='logo_url') THEN
        ALTER TABLE public.girilog_clients ADD COLUMN logo_url TEXT;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.girilog_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.girilog_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.girilog_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.girilog_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Clients
CREATE POLICY "Users can manage their own clients" ON public.girilog_clients
    FOR ALL USING (auth.uid() = user_id);

-- Invoices
CREATE POLICY "Users can manage their own invoices" ON public.girilog_invoices
    FOR ALL USING (auth.uid() = user_id);

-- Line Items
CREATE POLICY "Users can manage their own line items" ON public.girilog_line_items
    FOR ALL USING (auth.uid() = user_id);

-- Settings
CREATE POLICY "Users can manage their own settings" ON public.girilog_settings
    FOR ALL USING (auth.uid() = user_id);

-- 5. User Initialization Trigger
-- This ensures every new user gets a default settings record automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.girilog_settings (
      user_id,
      business_name,
      business_email,
      invoice_prefix,
      currency
    )
    VALUES (
      new.id,
      'My Business',
      new.email,
      'INV-',
      'USD'
    )
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not create initial settings for user %: %', new.id, SQLERRM;
  END;
  RETURN new;
END;
$$;

-- Apply the trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RPC Function for on-the-fly initialization
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
        logo_url TEXT,
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
$$;
