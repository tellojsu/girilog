import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '@/components/feature/AppLayout';
import ClientAvatar from '@/components/common/ClientAvatar';
import ClientFormModal from '@/pages/clients/components/ClientFormModal';
import LineItemsEditor from './components/LineItemsEditor';
import InvoicePreview from './components/InvoicePreview';
import StatusBadge from '@/components/base/StatusBadge';
import { supabase } from '@/lib/supabase';
import { Client, LineItem, Invoice, Settings, InvoiceStatusEnum } from '@/types/girilog';

interface FormState {
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  issueDate: string;
  dueDate: string;
  taxRate: string;
  discountRate: string;
  notes: string;
  status: InvoiceStatusEnum;
}

const today = new Date().toISOString().split('T')[0];
const thirtyDays = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

const DEFAULT_FORM: FormState = {
  clientId: '',
  clientName: '',
  clientEmail: '',
  clientAddress: '',
  issueDate: today,
  dueDate: thirtyDays,
  taxRate: '0',
  discountRate: '0',
  notes: '',
  status: InvoiceStatusEnum.Draft,
};

function LoadingSkeleton({ showPreview = true }: { showPreview?: boolean }) {
  return (
    <div className="flex gap-6 animate-pulse">
      <div className="flex-1 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-[#0A0C10] border border-[#1E2330] rounded-xl p-5">
            <div className="h-4 bg-[#1E2330] rounded w-32 mb-4" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-9 bg-[#1E2330] rounded-lg" />
              <div className="h-9 bg-[#1E2330] rounded-lg" />
              <div className="h-9 bg-[#1E2330] rounded-lg" />
              <div className="h-9 bg-[#1E2330] rounded-lg" />
            </div>
          </div>
        ))}
      </div>
      <div className={`shrink-0 hidden lg:block ${showPreview ? 'w-[420px]' : 'w-0 overflow-hidden'}`}>
        <div className="h-[600px] bg-[#0A0C10] border border-[#1E2330] rounded-xl" />
      </div>
    </div>
  );
}

export default function InvoiceCreator() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [clients, setClients] = useState<Client[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unit_price: 0, amount: 0 },
  ]);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [autoNumber, setAutoNumber] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');
  const [isDirty, setIsDirty] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [showPreview, setShowPreview] = useState(() => {
    const saved = localStorage.getItem('girilog_show_preview');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('girilog_show_preview', showPreview.toString());
  }, [showPreview]);
  const [showTaxOverride, setShowTaxOverride] = useState(false);
  const [showDiscountOverride, setShowDiscountOverride] = useState(false);
  const [pendingNav, setPendingNav] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const originalRef = useRef<{ form: FormState; lineItems: LineItem[]; invoiceNumber: string } | null>(null);

  // Warn on browser tab close / refresh when dirty
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Safe navigate — shows modal if dirty
  const safeNavigate = useCallback((path: string) => {
    if (isDirty) {
      setPendingNav(path);
      setShowDiscardModal(true);
    } else {
      navigate(path);
    }
  }, [isDirty, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: clientsData }, { data: settingsData }] = await Promise.all([
        supabase.from('girilog_clients').select('*').eq('user_id', user.id).order('name'),
        supabase.from('girilog_settings').select('*').eq('user_id', user.id).maybeSingle(),
      ]);
      if (clientsData) setClients(clientsData as Client[]);

      if (isEdit && id) {
        const [{ data: inv }, { data: items }] = await Promise.all([
          supabase.from('girilog_invoices').select('*').eq('id', id).eq('user_id', user.id).maybeSingle(),
          supabase.from('girilog_line_items').select('*').eq('invoice_id', id).eq('user_id', user.id).order('id'),
        ]);

        if (inv) {
          // Look up the client to apply their current tax/rate config
          const matchedClient = inv.client_id
            ? (clientsData as Client[] | null)?.find(c => c.id === inv.client_id) ?? null
            : null;

          const resolvedTaxRate = matchedClient
            ? (matchedClient.tax_enabled ? String(matchedClient.default_tax_rate ?? 0) : '0')
            : String(inv.tax_rate ?? settingsData?.default_tax_rate ?? 0);

          const loadedForm: FormState = {
            clientId: String(inv.client_id || ''),
            clientName: inv.client_name || '',
            clientEmail: inv.client_email || '',
            clientAddress: inv.client_address || '',
            issueDate: inv.issue_date || today,
            dueDate: inv.due_date || '',
            taxRate: resolvedTaxRate,
            discountRate: String(inv.discount_rate || 0),
            notes: inv.notes || '',
            status: inv.status as Invoice['status'],
          };

          // Apply client hourly rate to any line items that have unit_price 0
          const rawItems: LineItem[] = items && items.length > 0
            ? (items as LineItem[])
            : [{ description: '', quantity: 1, unit_price: 0, amount: 0 }];

          const loadedItems: LineItem[] = matchedClient?.default_hourly_rate != null
            ? rawItems.map(item =>
                item.unit_price === 0
                  ? { ...item, unit_price: matchedClient.default_hourly_rate as number, amount: item.quantity * (matchedClient.default_hourly_rate as number) }
                  : item
              )
            : rawItems;

          setInvoiceNumber(inv.invoice_number);
          setForm(loadedForm);
          setLineItems(loadedItems);
          // Store originals for dirty check
          originalRef.current = {
            form: loadedForm,
            lineItems: loadedItems,
            invoiceNumber: inv.invoice_number,
          };
        }
      } else {
        // New invoice — start with no client, number will be set when client is picked
        const defaultForm = {
          ...DEFAULT_FORM,
          taxRate: String(settingsData?.default_tax_rate ?? 0),
        };
        setInvoiceNumber('INV-???-0001');
        setForm(defaultForm);
        setAutoNumber(true);
        originalRef.current = null;
      }

      if (settingsData) setSettings(settingsData as Settings);
      setLoading(false);
    };
    fetchData();
  }, [id, isEdit]);

  // Track dirty state
  useEffect(() => {
    if (!isEdit || !originalRef.current) {
      // For new invoices, dirty if anything filled in
      const hasContent = form.clientName || lineItems.some(i => i.description) || form.notes;
      setIsDirty(Boolean(hasContent));
      return;
    }
    const orig = originalRef.current;
    const formChanged = JSON.stringify(form) !== JSON.stringify(orig.form);
    const itemsChanged = JSON.stringify(lineItems) !== JSON.stringify(orig.lineItems);
    const numChanged = invoiceNumber !== orig.invoiceNumber;
    setIsDirty(formChanged || itemsChanged || numChanged);
  }, [form, lineItems, invoiceNumber, isEdit]);

  const setField = useCallback((field: keyof FormState, value: string) => {
    setForm(f => {
      const next = { ...f, [field]: value };
      if (field === 'issueDate' && value) {
        // value is YYYY-MM-DD
        const [year, month, day] = value.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          // Calculate last day of month: next month day 0
          const lastDay = new Date(year, month, 0);
          // Convert to local YYYY-MM-DD
          const y = lastDay.getFullYear();
          const m = String(lastDay.getMonth() + 1).padStart(2, '0');
          const d = String(lastDay.getDate()).padStart(2, '0');
          next.dueDate = `${y}-${m}-${d}`;
        }
      }
      return next;
    });
  }, []);

  const selectClient = useCallback(async (client: Client) => {
    setClients(prev => {
      const exists = prev.find(c => c.id === client.id);
      if (exists) return prev.map(c => c.id === client.id ? client : c);
      return [...prev, client].sort((a, b) => a.name.localeCompare(b.name));
    });
    setForm(f => ({
      ...f,
      clientId: String(client.id),
      clientName: client.name,
      clientEmail: client.email || '',
      clientAddress: client.address || '',
      // Apply client tax config
      taxRate: client.tax_enabled ? String(client.default_tax_rate ?? 0) : '0',
    }));
    // Pre-fill hourly rate on blank line items
    if (client.default_hourly_rate != null) {
      setLineItems(items =>
        items.map(item =>
          item.unit_price === 0
            ? { ...item, unit_price: client.default_hourly_rate as number, amount: item.quantity * (client.default_hourly_rate as number) }
            : item
        )
      );
    }
    setClientSearch('');
    // Auto-generate invoice number for this client
    if (autoNumber) {
      const { count } = await supabase
        .from('girilog_invoices')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', client.id);
      const next = String((count ?? 0) + 1).padStart(4, '0');
      const slug = client.short_code || String(client.id);
      setInvoiceNumber(`INV-${slug}-${next}`);
    }
  }, [autoNumber]);

  const handleClientSaved = useCallback((client: Client) => {
    selectClient(client);
    setShowNewClientModal(false);
  }, [selectClient]);

  const clearClient = useCallback(() => {
    setForm(f => ({ ...f, clientId: '', clientName: '', clientEmail: '', clientAddress: '' }));
  }, []);

  const subtotal = lineItems.reduce((s, i) => s + i.amount, 0);
  const taxRate = parseFloat(form.taxRate) || 0;
  const discountRate = parseFloat(form.discountRate) || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const discountAmount = subtotal * (discountRate / 100);
  const total = subtotal + taxAmount - discountAmount;

  const handleSave = async (statusOverride?: InvoiceStatusEnum) => {
    setSaving(true);
    setSaveMsg(null);
    const finalStatus = statusOverride || form.status;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const payload = {
        user_id: user.id,
        invoice_number: invoiceNumber,
        client_id: form.clientId ? parseInt(form.clientId) : null,
        client_name: form.clientName || null,
        client_email: form.clientEmail || null,
        client_address: form.clientAddress || null,
        status: finalStatus,
        issue_date: form.issueDate,
        due_date: form.dueDate && !isNaN(Date.parse(form.dueDate)) ? form.dueDate : null,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        discount_rate: discountRate,
        total,
        notes: form.notes || null,
        updated_at: new Date().toISOString(),
      };

      let invoiceId: number;

      if (isEdit && id) {
        const { error } = await supabase
          .from('girilog_invoices')
          .update(payload)
          .eq('id', id)
          .eq('user_id', user.id);
        if (error) throw error;
        invoiceId = parseInt(id);
        await supabase
          .from('girilog_line_items')
          .delete()
          .eq('invoice_id', invoiceId)
          .eq('user_id', user.id);
      } else {
        const { data, error } = await supabase
          .from('girilog_invoices')
          .insert({ ...payload, created_at: new Date().toISOString() })
          .select('id')
          .single();
        if (error) throw error;
        invoiceId = data.id;
      }

      const validItems = lineItems.filter(i => i.description.trim() || i.amount > 0);
      if (validItems.length > 0) {
        const { error: itemsError } = await supabase.from('girilog_line_items').insert(
          validItems.map(i => ({
            user_id: user.id,
            invoice_id: invoiceId,
            description: i.description || 'No description',
            quantity: i.quantity,
            unit_price: i.unit_price,
            amount: i.amount,
            date: i.date || today,
            project: i.project || null,
          }))
        );
        if (itemsError) throw itemsError;
      }

      setIsDirty(false);
      setSaveMsg({ text: isEdit ? 'Changes saved!' : 'Invoice created!', ok: true });
      setTimeout(() => navigate(`/invoices/${invoiceId}`), 700);
    } catch (err) {
      console.error('[DEBUG_LOG] Error saving invoice:', err);
      setSaveMsg({ text: 'Failed to save. Try again.', ok: false });
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setIsDirty(false);
    setShowDiscardModal(false);
    const dest = pendingNav ?? (isEdit ? `/invoices/${id}` : '/invoices');
    setPendingNav(null);
    navigate(dest);
  };

  const filteredClients = clients.filter(c =>
    !clientSearch || c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(clientSearch.toLowerCase())
  );

  const inputClass = 'w-full bg-[#1E2330] border border-[#2A3040] rounded-lg px-3 py-2 text-sm text-white placeholder-secondary focus:outline-none focus:border-primary/50 transition-colors font-mono';
  const labelClass = 'block text-xs text-[#6B7280] font-mono uppercase tracking-wider mb-1.5';

  return (
    <>
      <AppLayout
        title={
          loading
            ? (isEdit ? 'Loading Invoice...' : 'New Invoice')
            : (isEdit ? `Editing ${invoiceNumber}` : 'New Invoice')
        }
        subtitle={
          isEdit
            ? (isDirty ? 'Unsaved changes' : 'No changes')
            : 'Fill in the details below'
        }
        actions={
          <div className="flex items-center gap-2">
            {/* Dirty indicator */}
            {isDirty && !saving && (
              <span className="text-xs font-mono text-[#F59E0B] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] inline-block" />
                Unsaved
              </span>
            )}
            {saveMsg && (
              <span className={`text-xs font-mono ${saveMsg.ok ? 'text-primary' : 'text-[#EF4444]'}`}>
                {saveMsg.ok ? <><i className="ri-checkbox-circle-line mr-1" /></> : <><i className="ri-error-warning-line mr-1" /></>}
                {saveMsg.text}
              </span>
            )}

            {/* Discard / Back */}
            {isEdit && (
              <button
                onClick={() => safeNavigate(`/invoices/${id}`)}
                className="px-3 py-2 text-sm text-[#6B7280] hover:text-white border border-[#2A3040] hover:border-[#3A4050] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                {isDirty ? 'Discard' : '← Back'}
              </button>
            )}

            <button
              onClick={() => handleSave(InvoiceStatusEnum.Draft)}
              disabled={saving || loading}
              className="px-4 py-2 text-sm font-medium text-[#6B7280] hover:text-white border border-[#2A3040] hover:border-[#3A4050] rounded-lg transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40"
            >
              Save WIP
            </button>
            <button
              onClick={() => handleSave(isEdit ? form.status : InvoiceStatusEnum.Sent)}
              disabled={saving || loading}
              className="flex items-center gap-2 bg-primary hover:bg-[#059669] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className={isEdit ? 'ri-save-line text-sm' : 'ri-send-plane-line text-sm'} />
                </div>
              )}
              {isEdit ? 'Save Changes' : 'Send Invoice'}
            </button>
          </div>
        }
      >
        {/* Edit mode banner */}
        {isEdit && !loading && (
          <div className="flex items-center gap-3 bg-[#F59E0B]/5 border border-[#F59E0B]/20 rounded-xl px-4 py-3 mb-5">
            <div className="w-5 h-5 flex items-center justify-center shrink-0">
              <i className="ri-edit-box-line text-[#F59E0B] text-sm" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-[#F59E0B] font-mono font-medium">Editing invoice </span>
              <span className="text-xs text-white font-mono font-bold">{invoiceNumber}</span>
              <span className="text-xs text-[#6B7280] font-mono"> · Current status: </span>
              <StatusBadge status={form.status as InvoiceStatus} size="sm" />
            </div>
            <button
              onClick={() => safeNavigate(`/invoices/${id}`)}
              className="text-xs text-[#6B7280] hover:text-white font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              View invoice →
            </button>
          </div>
        )}

        {/* Mobile Tab Toggle / Preview Toggle */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 lg:hidden flex bg-[#0A0C10] border border-[#1E2330] rounded-lg p-1">
            <button
              onClick={() => setActiveTab('form')}
              className={`flex-1 py-2 text-sm font-mono rounded-md transition-all cursor-pointer whitespace-nowrap ${activeTab === 'form' ? 'bg-primary text-white' : 'text-[#6B7280]'}`}
            >
              Form
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex-1 py-2 text-sm font-mono rounded-md transition-all cursor-pointer whitespace-nowrap ${activeTab === 'preview' ? 'bg-primary text-white' : 'text-[#6B7280]'}`}
            >
              Preview
            </button>
          </div>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`hidden lg:flex items-center gap-2 px-3 py-1.5 text-xs font-mono rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
              showPreview 
                ? 'bg-[#1E2330] border-[#2A3040] text-secondary hover:text-white' 
                : 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20'
            }`}
          >
            <i className={showPreview ? 'ri-eye-off-line' : 'ri-eye-line'} />
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>

        {loading ? (
          <LoadingSkeleton showPreview={showPreview} />
        ) : (
          <div className="flex gap-6">
            {/* ── Form Panel ── */}
            <div className={`flex-1 min-w-0 space-y-4 ${activeTab === 'preview' ? 'hidden lg:block' : ''}`}>

              {/* ── Step 1: Client ── */}
              <div className={`bg-[#0A0C10] border rounded-xl p-5 transition-colors ${
                form.clientId ? 'border-primary/30' : 'border-[#1E2330]'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono shrink-0 ${
                      form.clientId ? 'bg-primary text-white' : 'bg-[#1E2330] text-[#6B7280]'
                    }`}>1</div>
                    Client
                  </h3>
                  {form.clientId && (
                    <button
                      onClick={clearClient}
                      className="text-xs text-[#6B7280] hover:text-[#EF4444] font-mono transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap"
                    >
                      <i className="ri-close-line text-xs" /> Clear
                    </button>
                  )}
                </div>

                {form.clientId ? (() => {
                  const selectedClient = clients.find(c => String(c.id) === form.clientId);
                  if (!selectedClient) return null;
                  return (
                    <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 mb-4">
                      <ClientAvatar client={selectedClient} size="sm" className="bg-primary/15 border-primary/20" fallbackClassName="text-primary" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white">{selectedClient?.name || form.clientName}</div>
                        {form.clientEmail && <div className="text-xs text-[#6B7280] font-mono truncate">{form.clientEmail}</div>}
                      </div>
                      <div className="w-5 h-5 flex items-center justify-center ml-auto shrink-0">
                        <i className="ri-checkbox-circle-fill text-primary" />
                      </div>
                    </div>
                  );
                })() : null}

                {/* Client Search/Selector */}
                <div className="relative mb-4">
                  <label className={labelClass}>{form.clientId ? 'Change client' : 'Select client'}</label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center">
                        <i className="ri-search-line text-secondary text-sm" />
                      </div>
                      <input
                        type="text"
                        value={clientSearch}
                        onChange={e => setClientSearch(e.target.value)}
                        placeholder={form.clientId ? 'Search to change client...' : 'Search for a client...'}
                        className={`${inputClass} pl-10`}
                      />
                    </div>
                    {!form.clientId && (
                      <button
                        onClick={() => setShowNewClientModal(true)}
                        className="p-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors cursor-pointer group flex items-center gap-2 px-3 h-[38px]"
                        title="Create new client"
                      >
                        <i className="ri-user-add-line" />
                        <span className="text-xs font-medium">New</span>
                      </button>
                    )}
                  </div>

                  {clientSearch && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#1A1F2E] border border-[#2A3040] rounded-xl overflow-hidden z-20 shadow-2xl">
                      <div className="max-h-48 overflow-y-auto">
                        {filteredClients.map(client => (
                          <button
                            key={client.id}
                            onClick={() => selectClient(client)}
                            className={`w-full px-3 py-2.5 text-left hover:bg-[#2A3040] transition-colors cursor-pointer flex items-center gap-3 ${String(client.id) === form.clientId ? 'bg-primary/10' : ''}`}
                          >
                            <ClientAvatar client={client} size="xs" className="bg-primary/10 border-primary/10" fallbackClassName="text-primary" />
                            <div className="min-w-0">
                              <div className="text-sm text-white truncate">{client.name}</div>
                              {client.email && <div className="text-xs text-secondary font-mono truncate">{client.email}</div>}
                            </div>
                            {String(client.id) === form.clientId && (
                              <div className="w-4 h-4 flex items-center justify-center ml-auto shrink-0">
                                <i className="ri-check-line text-primary text-sm" />
                              </div>
                            )}
                          </button>
                        ))}
                        {filteredClients.length === 0 && (
                          <div className="p-4 text-center">
                            <p className="text-xs text-secondary font-mono mb-3">
                              No clients matching "{clientSearch}"
                            </p>
                            <button
                              onClick={() => {
                                setShowNewClientModal(true);
                                setClientSearch('');
                              }}
                              className="inline-flex items-center gap-2 bg-primary hover:bg-[#059669] text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                              <i className="ri-user-add-line" />
                              Create "{clientSearch}"
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Manual client fields — only visible when no client selected and no search results (fallback) */}
                {/* Actually, user said: "we shouldn't show the client name, email, address as inputs, those should just be used from the client that is picked." */}
                {/* "if a name is not found then there should be a button to create a new client that takes them to that experience" */}
                {!form.clientId && clients.length === 0 && (
                   <div className="flex flex-col items-center justify-center py-8 px-4 bg-[#1E2330]/30 border border-dashed border-[#2A3040] rounded-xl">
                     <div className="w-12 h-12 bg-[#1E2330] rounded-full flex items-center justify-center mb-3">
                       <i className="ri-user-search-line text-secondary text-xl" />
                     </div>
                     <p className="text-sm text-[#6B7280] text-center mb-4">You haven't added any clients yet.</p>
                     <button
                       onClick={() => setShowNewClientModal(true)}
                       className="bg-primary hover:bg-[#059669] text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2"
                     >
                       <i className="ri-user-add-line" />
                       Add Your First Client
                     </button>
                   </div>
                )}
              </div>

              {/* ── Step 2: Invoice Details ── */}
              <div className="bg-[#0A0C10] border border-[#1E2330] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#1E2330] flex items-center justify-center text-[10px] font-bold font-mono text-[#6B7280] shrink-0">2</div>
                  Invoice Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Invoice Number</label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={e => { setInvoiceNumber(e.target.value); setAutoNumber(false); }}
                      className={inputClass}
                    />
                    {!isEdit && autoNumber && (
                      <p className="text-[10px] text-secondary font-mono mt-1">
                        {form.clientId ? 'Auto-generated for this client' : 'Select a client to generate number'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Status</label>
                    <select
                      value={form.status}
                      onChange={e => setField('status', e.target.value)}
                      className={`${inputClass} cursor-pointer appearance-none`}
                    >
                      <option value="draft">WIP</option>
                      <option value="pending">Sent</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="issueDate" className={labelClass}>Issue Date</label>
                    <input
                      id="issueDate"
                      type="date"
                      value={form.issueDate}
                      onChange={e => setField('issueDate', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="dueDate" className={labelClass}>Due Date</label>
                    <input
                      id="dueDate"
                      type="date"
                      value={form.dueDate}
                      onChange={e => setField('dueDate', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {/* ── Step 3: Line Items ── */}
              <div className="bg-[#0A0C10] border border-[#1E2330] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#1E2330] flex items-center justify-center text-[10px] font-bold font-mono text-[#6B7280] shrink-0">3</div>
                  Line Items
                </h3>
                <LineItemsEditor 
                  items={lineItems} 
                  onChange={setLineItems} 
                  client={clients.find(c => String(c.id) === form.clientId)}
                />
              </div>

              {/* ── Step 4: Notes & Totals ── */}
              <div className="bg-[#0A0C10] border border-[#1E2330] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#1E2330] flex items-center justify-center text-[10px] font-bold font-mono text-[#6B7280] shrink-0">4</div>
                  Notes &amp; Totals
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  {/* Notes */}
                  <div>
                    <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3 flex items-center gap-2">
                      <div className="w-4 h-4 flex items-center justify-center">
                        <i className="ri-sticky-note-line text-primary text-sm" />
                      </div>
                      Notes
                    </h4>
                    <textarea
                      value={form.notes}
                      onChange={e => setField('notes', e.target.value)}
                      placeholder="Payment terms, thank you message..."
                      rows={5}
                      maxLength={500}
                      className={`${inputClass} resize-none`}
                    />
                    <p className="text-[10px] text-secondary font-mono mt-1 text-right">
                      {form.notes.length}/500
                    </p>
                  </div>

                  {/* Totals */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider flex items-center gap-2">
                        <div className="w-4 h-4 flex items-center justify-center">
                          <i className="ri-calculator-line text-primary text-sm" />
                        </div>
                        Totals
                      </h4>
                    <div className="flex items-center gap-2">
                      {form.clientId && !clients.find(c => String(c.id) === form.clientId)?.tax_enabled && !showTaxOverride && (
                        <button
                          type="button"
                          onClick={() => setShowTaxOverride(true)}
                          className="text-[10px] font-mono text-primary hover:text-[#059669] transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <i className="ri-add-line" />
                          Add Tax
                        </button>
                      )}
                      {!showDiscountOverride && Number(form.discountRate) === 0 && (
                        <button
                          type="button"
                          onClick={() => setShowDiscountOverride(true)}
                          className="text-[10px] font-mono text-primary hover:text-[#059669] transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <i className="ri-add-line" />
                          Add Discount
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-[#1E2330]">
                      <span className="text-xs text-[#6B7280] font-mono">Subtotal</span>
                      <span className={`text-sm font-mono ${subtotal < 0 ? 'text-danger' : 'text-white'}`}>
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(subtotal)}
                      </span>
                    </div>
                    
                    {(() => {
                      const selectedClient = clients.find(c => String(c.id) === form.clientId);
                      const isTaxVisible = (selectedClient?.tax_enabled !== false) || showTaxOverride;
                      const isDiscountVisible = showDiscountOverride || Number(form.discountRate) > 0;

                      return (
                        <>
                          {isTaxVisible && (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-[#6B7280] font-mono whitespace-nowrap w-16">Tax %</span>
                                <input
                                  type="number"
                                  value={form.taxRate}
                                  onChange={e => setField('taxRate', e.target.value)}
                                  min="0" max="100" step="0.5"
                                  className="flex-1 bg-[#1E2330] border border-[#2A3040] rounded-lg px-2 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-primary/50 text-right"
                                />
                                <span className={`text-xs font-mono whitespace-nowrap ${taxAmount < 0 ? 'text-danger' : 'text-[#6B7280]'}`}>
                                  = {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(taxAmount)}
                                </span>
                              </div>
                              {form.clientId && selectedClient && selectedClient.tax_enabled !== false && (
                                <p className="text-[10px] font-mono pl-[76px] text-secondary">
                                  {selectedClient.tax_enabled
                                    ? `From client config (${selectedClient.default_tax_rate}%) — override above`
                                    : 'Client has no tax — set above to override'}
                                </p>
                              )}
                            </div>
                          )}

                          {isDiscountVisible && (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-[#6B7280] font-mono whitespace-nowrap w-16">Disc. %</span>
                                <input
                                  type="number"
                                  value={form.discountRate}
                                  onChange={e => setField('discountRate', e.target.value)}
                                  min="0" max="100" step="0.1"
                                  className="flex-1 bg-[#1E2330] border border-[#2A3040] rounded-lg px-2 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-primary/50 text-right"
                                />
                                <span className={`text-xs font-mono whitespace-nowrap ${discountAmount > 0 ? 'text-primary' : 'text-[#6B7280]'}`}>
                                  = {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(discountAmount)}
                                </span>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}

                      <div className="flex items-center justify-between pt-3 border-t border-[#1E2330]">
                        <span className="text-sm font-semibold text-white font-mono">Total</span>
                        <span className={`text-xl font-bold font-mono ${total < 0 ? 'text-danger' : 'text-primary'}`}>
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Preview Panel ── */}
            {showPreview && (
              <div className={`w-[420px] shrink-0 ${activeTab === 'form' ? 'hidden lg:block' : ''}`}>
                <div className="sticky top-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-[#6B7280] font-mono uppercase tracking-wider">Live Preview</span>
                    <span className="text-xs text-secondary font-mono">Updates as you type</span>
                  </div>
                    <InvoicePreview
                      invoiceNumber={invoiceNumber}
                      clientName={form.clientName}
                      clientEmail={form.clientEmail}
                      clientAddress={form.clientAddress}
                      issueDate={form.issueDate}
                      dueDate={form.dueDate}
                      lineItems={lineItems}
                      taxRate={taxRate}
                      discountRate={discountRate}
                      notes={form.notes}
                      businessName={settings?.business_name || 'GiriLog Studio'}
                      businessEmail={settings?.business_email || ''}
                      businessAddress={settings?.business_address || ''}
                      logoUrl={settings?.logo_url || ''}
                      showDate={clients.find(c => String(c.id) === form.clientId)?.show_date}
                      showProject={clients.find(c => String(c.id) === form.clientId)?.show_project}
                    />
                </div>
              </div>
            )}
          </div>
        )}
      </AppLayout>

      {/* Discard Changes Modal */}
      {showDiscardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => {
            setShowDiscardModal(false);
            setPendingNav(null);
          }} />
          <div className="relative bg-[#0A0C10] border border-[#1E2330] rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center shrink-0">
                <i className="ri-error-warning-line text-[#F59E0B] text-lg" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Discard changes?</h3>
                <p className="text-xs text-[#6B7280] mt-0.5">Your unsaved edits will be lost.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDiscardModal(false);
                  setPendingNav(null);
                }}
                className="flex-1 py-2 text-sm text-[#6B7280] hover:text-white border border-[#1E2330] hover:border-[#2A3040] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                Keep Editing
              </button>
              <button
                onClick={handleDiscard}
                className="flex-1 py-2 text-sm font-medium bg-[#F59E0B] hover:bg-amber-500 text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewClientModal && (
        <ClientFormModal
          isOpen={showNewClientModal}
          onClose={() => setShowNewClientModal(false)}
          onSave={handleClientSaved}
        />
      )}
    </>
  );
}
