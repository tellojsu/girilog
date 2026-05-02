import { useEffect, useState, useCallback } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import SettingsSection from './components/SettingsSection';
import SettingsField from './components/SettingsField';
import LogoUploader from './components/LogoUploader';
import { supabase } from '@/lib/supabase';
import { Settings } from '@/types/girilog';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 'SGD', 'AED', 'CHF'];

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function inputClass(focused?: boolean) {
  return `w-full bg-[#0D0F14] border ${focused ? 'border-[#10B981]/50' : 'border-[#1E2330]'} rounded-lg px-3 py-2 text-sm text-white placeholder-[#4B5563] focus:outline-none focus:border-[#10B981]/50 transition-colors`;
}

function formatPhoneNumber(value: string) {
  if (!value) return value;
  const phoneNumber = value.replace(/[^\d]/g, '');
  const phoneNumberLength = phoneNumber.length;
  if (phoneNumberLength < 4) return phoneNumber;
  if (phoneNumberLength < 7) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
  }
  return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
}

export default function SettingsPage() {
  const [annualGoal, setAnnualGoal] = useState<number>(0);
  const [settings, setSettings] = useState<Partial<Settings>>({
    business_name: '',
    business_email: '',
    business_phone: '',
    business_address: '',
    logo_url: '',
    invoice_prefix: 'INV-',
    default_tax_rate: 0,
    currency: 'USD',
    annual_revenue_goal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [resetConfirm, setResetConfirm] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('girilog_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        const settingsData = data as Settings;
        if (settingsData.business_phone) {
          settingsData.business_phone = formatPhoneNumber(settingsData.business_phone);
        }
        setSettings(settingsData);
        setAnnualGoal(Number((data as Record<string, unknown>).annual_revenue_goal) || 0);
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleChange = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaveState('idle');
  }, []);

  const handleSave = async () => {
    setSaveState('saving');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const payload = {
        business_name: settings.business_name,
        business_email: settings.business_email,
        business_phone: settings.business_phone,
        business_address: settings.business_address,
        logo_url: settings.logo_url,
        invoice_prefix: settings.invoice_prefix,
        default_tax_rate: Number(settings.default_tax_rate),
        currency: settings.currency,
        annual_revenue_goal: Number(annualGoal),
      };

      console.log('[DEBUG_LOG] Payload to save:', payload);

      let error;
      if (settings.id) {
        const res = await supabase
          .from('girilog_settings')
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', settings.id)
          .eq('user_id', user.id);
        error = res.error;
        console.log('[DEBUG_LOG] Update response:', res);
      } else {
        const res = await supabase
          .from('girilog_settings')
          .insert({
            ...payload,
            user_id: user.id,
          })
          .select()
          .single();
      error = res.error;
      console.log('[DEBUG_LOG] Insert response:', res);
      if (res.data) {
        const settingsData = res.data as Settings;
        if (settingsData.business_phone) {
          settingsData.business_phone = formatPhoneNumber(settingsData.business_phone);
        }
        setSettings(settingsData);
      }
    }

      if (error) {
        console.error('[DEBUG_LOG] Error saving settings:', error);
        throw error;
      }
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 3000);
    } catch {
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 4000);
    }
  };

  const handleResetDefaults = async () => {
    if (!resetConfirm) { setResetConfirm(true); return; }
    const defaults = {
      business_name: 'My Business',
      business_email: '',
      business_phone: '',
      business_address: '',
      logo_url: '',
      invoice_prefix: 'INV-',
      default_tax_rate: 0,
      currency: 'USD',
      annual_revenue_goal: 0,
    };
    setSettings(prev => ({ ...prev, ...defaults }));
    setAnnualGoal(0);
    setResetConfirm(false);
    setSaveState('idle');
  };

  if (loading) {
    return (
      <AppLayout title="Settings" subtitle="Business profile & preferences">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3 text-[#6B7280]">
            <div className="w-5 h-5 border-2 border-[#10B981]/30 border-t-[#10B981] rounded-full animate-spin" />
            <span className="text-sm font-mono">Loading settings...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Settings"
      subtitle="Business profile &amp; preferences"
      actions={
        <div className="flex items-center gap-3">
          {saveState === 'saved' && (
            <div className="flex items-center gap-1.5 text-[#10B981] text-sm font-mono animate-pulse">
              <div className="w-4 h-4 flex items-center justify-center">
                <i className="ri-checkbox-circle-line text-sm" />
              </div>
              Saved
            </div>
          )}
          {saveState === 'error' && (
            <div className="flex items-center gap-1.5 text-[#EF4444] text-sm font-mono">
              <div className="w-4 h-4 flex items-center justify-center">
                <i className="ri-error-warning-line text-sm" />
              </div>
              Save failed
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saveState === 'saving'}
            className="flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            {saveState === 'saving' ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-save-line text-sm" />
                </div>
                Save Changes
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="max-w-3xl space-y-6">

        {/* Business Profile */}
        <SettingsSection
          title="Business Profile"
          description="This information appears on all generated invoices"
          icon="ri-building-2-line"
        >
          <SettingsField label="Business Logo" hint="Shown in the invoice header">
            <LogoUploader
              value={settings.logo_url || ''}
              onChange={url => handleChange('logo_url', url)}
            />
          </SettingsField>

          <SettingsField label="Business Name" hint="Your company or freelance name">
            <input
              type="text"
              value={settings.business_name || ''}
              onChange={e => handleChange('business_name', e.target.value)}
              placeholder="Acme Corp"
              className={inputClass()}
            />
          </SettingsField>

          <SettingsField label="Email Address" hint="Contact email on invoices">
            <input
              type="email"
              value={settings.business_email || ''}
              onChange={e => handleChange('business_email', e.target.value)}
              placeholder="billing@acmecorp.com"
              className={inputClass()}
            />
          </SettingsField>

          <SettingsField label="Phone Number">
            <input
              type="tel"
              value={settings.business_phone || ''}
              onChange={e => handleChange('business_phone', formatPhoneNumber(e.target.value))}
              placeholder="(555) 000-0000"
              className={inputClass()}
            />
          </SettingsField>

          <SettingsField label="Business Address" hint="Full mailing address">
            <textarea
              value={settings.business_address || ''}
              onChange={e => handleChange('business_address', e.target.value)}
              placeholder={"123 Main Street\nSan Francisco, CA 94105\nUnited States"}
              rows={3}
              maxLength={500}
              className={`${inputClass()} resize-none`}
            />
          </SettingsField>
        </SettingsSection>

        {/* Annual Revenue Goal */}
        <SettingsSection
          title="Annual Revenue Goal"
          description="Track your yearly revenue target on the dashboard"
          icon="ri-trophy-line"
        >
          <SettingsField
            label="Revenue Goal"
            hint={`Your ${new Date().getFullYear()} target — shown as a progress bar on the dashboard`}
          >
            <div className="flex items-center gap-3">
              <div className="relative max-w-[200px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280] text-sm font-mono">$</span>
                <input
                  type="number"
                  value={annualGoal || ''}
                  onChange={e => setAnnualGoal(Math.max(0, parseFloat(e.target.value) || 0))}
                  min={0}
                  step={1000}
                  placeholder="100000"
                  className={`${inputClass()} font-mono pl-7`}
                />
              </div>
              {annualGoal > 0 && (
                <span className="text-xs text-[#6B7280] font-mono">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: settings.currency || 'USD', maximumFractionDigits: 0 }).format(annualGoal)} target
                </span>
              )}
            </div>
            <p className="text-xs text-[#4B5563] mt-1.5 font-mono">Set to 0 to hide the goal tracker.</p>
          </SettingsField>
        </SettingsSection>

        {/* Invoice Defaults */}
        <SettingsSection
          title="Invoice Defaults"
          description="Default values applied when creating new invoices"
          icon="ri-file-settings-line"
        >
          <SettingsField
            label="Invoice Number Prefix"
            hint="Prepended to every invoice number"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-[200px]">
                <input
                  type="text"
                  value={settings.invoice_prefix || ''}
                  onChange={e => handleChange('invoice_prefix', e.target.value.toUpperCase())}
                  placeholder="INV-"
                  maxLength={10}
                  className={`${inputClass()} font-mono uppercase`}
                />
              </div>
              <div className="flex items-center gap-1.5 text-[#6B7280] text-sm font-mono">
                <span>→</span>
                <span className="text-white">{settings.invoice_prefix || 'INV-'}0042</span>
              </div>
            </div>
            <p className="text-xs text-[#4B5563] mt-1.5 font-mono">Max 10 characters. Numbers are appended automatically.</p>
          </SettingsField>

          <SettingsField
            label="Default Tax Rate"
            hint="Applied to new invoices by default"
          >
            <div className="flex items-center gap-3">
              <div className="relative max-w-[160px]">
                <input
                  type="number"
                  value={settings.default_tax_rate ?? 0}
                  onChange={e => handleChange('default_tax_rate', Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                  min={0}
                  max={100}
                  step={0.1}
                  className={`${inputClass()} font-mono pr-8`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] text-sm font-mono">%</span>
              </div>
              <span className="text-xs text-[#6B7280] font-mono">
                {settings.default_tax_rate === 0 ? 'No tax by default' : `${settings.default_tax_rate}% tax on subtotal`}
              </span>
            </div>
          </SettingsField>

          <SettingsField
            label="Currency"
            hint="Default currency for all invoices"
          >
            <div className="relative max-w-[200px]">
              <select
                value={settings.currency || 'USD'}
                onChange={e => handleChange('currency', e.target.value)}
                className="w-full bg-[#0D0F14] border border-[#1E2330] rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#10B981]/50 transition-colors cursor-pointer appearance-none pr-8"
              >
                {CURRENCIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center pointer-events-none">
                <i className="ri-arrow-down-s-line text-[#6B7280] text-sm" />
              </div>
            </div>
          </SettingsField>
        </SettingsSection>

        {/* Preview Card */}
        <div className="bg-[#0A0C10] border border-[#1E2330] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-eye-line text-[#10B981] text-sm" />
            </div>
            <span className="text-xs text-[#6B7280] font-mono uppercase tracking-wider">Invoice Header Preview</span>
          </div>
          <div className="bg-[#0D0F14] border border-[#1E2330] rounded-lg p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {settings.logo_url ? (
                  <img
                    src={settings.logo_url}
                    alt="logo"
                    className="w-10 h-10 object-contain rounded"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-[#10B981]/10 flex items-center justify-center">
                    <i className="ri-building-line text-[#10B981]" />
                  </div>
                )}
                <div>
                  <div className="text-white font-semibold text-sm">{settings.business_name || 'Your Business Name'}</div>
                  {settings.business_email && <div className="text-[#6B7280] text-xs font-mono">{settings.business_email}</div>}
                  {settings.business_phone && <div className="text-[#6B7280] text-xs font-mono">{settings.business_phone}</div>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[#10B981] font-mono font-bold text-lg">{settings.invoice_prefix || 'INV-'}0042</div>
                <div className="text-[#6B7280] text-xs font-mono mt-0.5">Issued: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                <div className="text-[#6B7280] text-xs font-mono">Currency: {settings.currency || 'USD'}</div>
              </div>
            </div>
            {settings.business_address && (
              <div className="mt-3 pt-3 border-t border-[#1E2330]">
                <p className="text-[#6B7280] text-xs font-mono whitespace-pre-line">{settings.business_address}</p>
              </div>
            )}
          </div>
        </div>

        {/* Danger Zone */}
        <SettingsSection
          title="Danger Zone"
          description="Irreversible actions — proceed with caution"
          icon="ri-error-warning-line"
          accent
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white font-medium">Reset to Defaults</p>
              <p className="text-xs text-[#6B7280] mt-0.5">Clear all business profile data and restore factory settings</p>
            </div>
            <button
              onClick={handleResetDefaults}
              onBlur={() => setTimeout(() => setResetConfirm(false), 200)}
              className={`text-sm px-4 py-2 rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                resetConfirm
                  ? 'bg-[#EF4444] border-[#EF4444] text-white'
                  : 'border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/10'
              }`}
            >
              {resetConfirm ? 'Click again to confirm' : 'Reset Defaults'}
            </button>
          </div>
        </SettingsSection>

      </div>
    </AppLayout>
  );
}
