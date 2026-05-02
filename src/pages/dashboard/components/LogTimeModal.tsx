import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Client, Invoice, InvoiceStatusEnum } from '@/types/girilog';

interface LogTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function LogTimeModal({ isOpen, onClose, onSaved }: LogTimeModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [clientId, setClientId] = useState('');
  const [description, setDescription] = useState('');
  const [hours, setHours] = useState('1');
  const [rate, setRate] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [project, setProject] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchClients();
    }
  }, [isOpen]);

  const fetchClients = async () => {
    setLoadingClients(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('girilog_clients')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    
    if (data) setClients(data as Client[]);
    setLoadingClients(false);
  };

  const handleClientChange = (id: string) => {
    setClientId(id);
    const client = clients.find(c => String(c.id) === id);
    if (client) {
      if (client.default_hourly_rate != null) {
        setRate(String(client.default_hourly_rate));
      } else {
        setRate('');
      }
      if (client.projects && client.projects.length > 0) {
        setProject(client.projects[0]);
      } else {
        setProject('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) { setError('Please select a client'); return; }
    if (!description.trim()) { setError('Please enter a description'); return; }
    if (!hours || parseFloat(hours) <= 0) { setError('Please enter valid hours'); return; }

    setSaving(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const selectedClient = clients.find(c => String(c.id) === clientId)!;
      
      // 1. Find WIP (Draft) invoice for this client
      let { data: wipInvoice } = await supabase
        .from('girilog_invoices')
        .select('*')
        .eq('user_id', user.id)
        .eq('client_id', selectedClient.id)
        .eq('status', InvoiceStatusEnum.Draft)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let invoiceId: number;

      if (!wipInvoice) {
        // 2. Create new WIP invoice if none exists
        const { count } = await supabase
          .from('girilog_invoices')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', selectedClient.id);
        
        const next = String((count ?? 0) + 1).padStart(4, '0');
        const slug = selectedClient.short_code || String(selectedClient.id);
        const invoiceNumber = `INV-${slug}-${next}`;

        const today = new Date().toISOString().split('T')[0];
        const thirtyDays = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

        const { data: newInvoice, error: invError } = await supabase
          .from('girilog_invoices')
          .insert({
            user_id: user.id,
            invoice_number: invoiceNumber,
            client_id: selectedClient.id,
            client_name: selectedClient.name,
            client_email: selectedClient.email,
            client_address: selectedClient.address,
            status: InvoiceStatusEnum.Draft,
            issue_date: today,
            due_date: thirtyDays,
            subtotal: 0,
            tax_rate: selectedClient.tax_enabled ? selectedClient.default_tax_rate : 0,
            tax_amount: 0,
            discount_amount: 0,
            total: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (invError) throw invError;
        invoiceId = newInvoice.id;
      } else {
        invoiceId = wipInvoice.id;
      }

      // 3. Add line item
      const qty = parseFloat(hours);
      const unitPrice = parseFloat(rate) || 0;
      const amount = qty * unitPrice;

      const { error: itemError } = await supabase
        .from('girilog_line_items')
        .insert({
          user_id: user.id,
          invoice_id: invoiceId,
          description: description.trim(),
          quantity: qty,
          unit_price: unitPrice,
          amount: amount,
          date: date,
          project: project || null,
        });

      if (itemError) throw itemError;

      // 4. Update invoice totals
      const { data: allItems } = await supabase
        .from('girilog_line_items')
        .select('amount')
        .eq('invoice_id', invoiceId);
      
      const newSubtotal = (allItems || []).reduce((sum, item) => sum + (item.amount || 0), 0);
      
      // Fetch current invoice to get tax rate and discount
      const { data: currentInv } = await supabase
        .from('girilog_invoices')
        .select('tax_rate, discount_amount')
        .eq('id', invoiceId)
        .single();
      
      const taxRate = currentInv?.tax_rate || 0;
      const discountAmount = currentInv?.discount_amount || 0;
      const taxAmount = newSubtotal * (taxRate / 100);
      const newTotal = newSubtotal + taxAmount - discountAmount;

      await supabase
        .from('girilog_invoices')
        .update({
          subtotal: newSubtotal,
          tax_amount: taxAmount,
          total: newTotal,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      onSaved();
      onClose();
      // Reset form
      setClientId('');
      setDescription('');
      setHours('1');
      setRate('');
      setDate(new Date().toISOString().split('T')[0]);
      setProject('');
    } catch (err: any) {
      console.error('[DEBUG_LOG] Error logging time:', err);
      setError(err.message || 'Failed to log time');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const selectedClient = clients.find(c => String(c.id) === clientId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0A0C10] border border-[#1E2330] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1E2330] flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">Log Time</h2>
          <button onClick={onClose} className="text-secondary hover:text-white transition-colors">
            <i className="ri-close-line text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-1.5">Client</label>
            <select
              value={clientId}
              onChange={(e) => handleClientChange(e.target.value)}
              className="w-full bg-[#161B26] border border-[#1E2330] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              disabled={loadingClients}
            >
              <option value="">Select a client</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#161B26] border border-[#1E2330] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-1.5">Project</label>
              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                disabled={!selectedClient || !selectedClient.show_project}
                className="w-full bg-[#161B26] border border-[#1E2330] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-50"
              >
                <option value="">No Project</option>
                {selectedClient?.projects?.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you work on?"
              className="w-full bg-[#161B26] border border-[#1E2330] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all h-20 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-1.5">Hours</label>
              <input
                type="number"
                step="0.25"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-full bg-[#161B26] border border-[#1E2330] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary uppercase tracking-wider mb-1.5">Hourly Rate</label>
              <input
                type="number"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#161B26] border border-[#1E2330] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-primary hover:bg-[#059669] text-white font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Log Time'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
