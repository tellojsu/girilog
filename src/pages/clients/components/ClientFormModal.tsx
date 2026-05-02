import { useState, useEffect } from 'react';
import { Client } from '@/types/girilog';
import { supabase } from '@/lib/supabase';
import PhoneInput from '@/components/common/PhoneInput';
import AddressAutocomplete from '@/components/common/AddressAutocomplete';

interface ClientFormModalProps {
  client?: Client | null;
  onClose: () => void;
  onSaved: (client: Client) => void;
}

type FormData = {
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  short_code: string;
  tax_enabled: boolean;
  default_tax_rate: string;
  default_hourly_rate: string;
};

function suggestCode(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => (i === 0 ? w.slice(0, 4) : w[0]))
    .join('')
    .slice(0, 6);
}

export default function ClientFormModal({ client, onClose, onSaved }: ClientFormModalProps) {
  const isEdit = !!client;
  const [form, setForm] = useState<FormData>({
    name: '',
    company: '',
    email: '',
    phone: '',
    address: '',
    short_code: '',
    tax_enabled: false,
    default_tax_rate: '0',
    default_hourly_rate: '',
  });
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (client) {
      setForm({
        name: client.name || '',
        company: client.company || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        short_code: client.short_code || '',
        tax_enabled: client.tax_enabled ?? false,
        default_tax_rate: String(client.default_tax_rate ?? 0),
        default_hourly_rate: client.default_hourly_rate != null ? String(client.default_hourly_rate) : '',
      });
      setCodeManuallyEdited(true);
    }
  }, [client]);

  const handleChange = (key: keyof FormData, value: string) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      // Auto-suggest short_code from name unless manually edited
      if (key === 'name' && !codeManuallyEdited) {
        next.short_code = suggestCode(value);
      }
      return next;
    });
    setError('');
  };

  const handleCodeChange = (value: string) => {
    setCodeManuallyEdited(true);
    setForm(prev => ({ ...prev, short_code: value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Client name is required'); return; }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const payload = {
        user_id: user.id,
        name: form.name.trim(),
        company: form.company.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        short_code: form.short_code.trim() || null,
        tax_enabled: form.tax_enabled,
        default_tax_rate: parseFloat(form.default_tax_rate) || 0,
        default_hourly_rate: form.default_hourly_rate !== '' ? parseFloat(form.default_hourly_rate) : null,
        updated_at: new Date().toISOString(),
      };

      if (isEdit && client) {
        const { data, error: err } = await supabase
          .from('girilog_clients')
          .update(payload)
          .eq('id', client.id)
          .select()
          .maybeSingle();
        if (err) throw err;
        if (data) onSaved(data as Client);
      } else {
        const { data, error: err } = await supabase
          .from('girilog_clients')
          .insert({ ...payload, created_at: new Date().toISOString() })
          .select()
          .maybeSingle();
        if (err) throw err;
        if (data) onSaved(data as Client);
      }
    } catch {
      setError('Failed to save client. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full bg-[#0D0F14] border border-[#1E2330] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4B5563] focus:outline-none focus:border-[#10B981]/50 transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[#0A0C10] border border-[#1E2330] rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E2330]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
              <i className="ri-user-add-line text-sm text-[#10B981]" />
            </div>
            <h2 className="text-sm font-semibold text-white">
              {isEdit ? 'Edit Client' : 'New Client'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#6B7280] hover:text-white hover:bg-[#1E2330] transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-base" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#8B9AB0] mb-1.5">
              Client Name <span className="text-[#EF4444]">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              placeholder="Jane Smith"
              className={inputClass}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8B9AB0] mb-1.5">Company</label>
            <input
              type="text"
              value={form.company}
              onChange={e => handleChange('company', e.target.value)}
              placeholder="Acme Corporation"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8B9AB0] mb-1.5">
              Invoice Code
              <span className="ml-1.5 text-[#4B5563] font-normal normal-case">used in invoice numbers, e.g. INV-ACME-0001</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={form.short_code}
                onChange={e => handleCodeChange(e.target.value)}
                placeholder="ACME"
                maxLength={8}
                className={`${inputClass} font-mono uppercase tracking-widest pr-16`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#4B5563] font-mono">
                {form.short_code.length}/8
              </span>
            </div>
            {!codeManuallyEdited && form.short_code && (
              <p className="text-[10px] text-[#4B5563] font-mono mt-1">Auto-suggested — edit to customise</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#8B9AB0] mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
                placeholder="jane@acme.com"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8B9AB0] mb-1.5">Phone</label>
              <PhoneInput
                value={form.phone}
                onChange={value => handleChange('phone', value)}
                placeholder="+1 555 000 0000"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8B9AB0] mb-1.5">Address</label>
            <AddressAutocomplete
              value={form.address}
              onChange={value => handleChange('address', value)}
              placeholder={"123 Main St\nSan Francisco, CA 94105"}
            />
          </div>

          {/* Hourly Rate */}
          <div>
            <label className="block text-xs font-medium text-[#8B9AB0] mb-1.5">
              Default Hourly Rate
              <span className="ml-1.5 text-[#4B5563] font-normal normal-case">pre-fills line items on new invoices</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#6B7280] font-mono">$</span>
              <input
                type="number"
                value={form.default_hourly_rate}
                onChange={e => setForm(prev => ({ ...prev, default_hourly_rate: e.target.value }))}
                placeholder="0.00"
                min="0" step="0.01"
                className={`${inputClass} pl-6`}
              />
            </div>
          </div>

          {/* Tax Configuration */}
          <div className="border border-[#1E2330] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#8B9AB0]">Tax on Invoices</p>
                <p className="text-[10px] text-[#4B5563] mt-0.5">Apply tax to invoices for this client</p>
              </div>
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, tax_enabled: !prev.tax_enabled }))}
                className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                  form.tax_enabled ? 'bg-[#10B981]' : 'bg-[#2A3040]'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    form.tax_enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            {form.tax_enabled && (
              <div className="flex items-center gap-3">
                <label className="text-xs text-[#6B7280] whitespace-nowrap">Default rate</label>
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={form.default_tax_rate}
                    onChange={e => setForm(prev => ({ ...prev, default_tax_rate: e.target.value }))}
                    min="0" max="100" step="0.5"
                    className={`${inputClass} pr-8 text-right`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6B7280] font-mono">%</span>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg px-3 py-2">
              <i className="ri-error-warning-line" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-[#6B7280] hover:text-white border border-[#1E2330] hover:border-[#2A3040] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-[#10B981] hover:bg-[#059669] disabled:opacity-60 text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                isEdit ? 'Save Changes' : 'Add Client'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
