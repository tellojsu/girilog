import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/feature/AppLayout';
import InvoiceTable from '../components/InvoiceTable';
import { supabase } from '@/lib/supabase';
import { Invoice, InvoiceStatus } from '@/types/girilog';

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Pending', value: 'pending' },
  { label: 'Paid', value: 'paid' },
  { label: 'Overdue', value: 'overdue' },
];

export default function InvoiceList() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('girilog_invoices')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setInvoices(data as Invoice[]);
      setLoading(false);
    };
    fetchInvoices();
  }, []);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    let result = [...invoices];
    if (statusFilter !== 'all') result = result.filter(i => i.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(i =>
        i.invoice_number.toLowerCase().includes(q) ||
        (i.client_name || '').toLowerCase().includes(q) ||
        (i.client_email || '').toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortField];
      const bv = (b as Record<string, unknown>)[sortField];
      const aStr = String(av ?? '');
      const bStr = String(bv ?? '');
      const cmp = aStr.localeCompare(bStr, undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [invoices, statusFilter, search, sortField, sortDir]);

  const counts = useMemo(() => ({
    all: invoices.length,
    draft: invoices.filter(i => i.status === 'draft').length,
    pending: invoices.filter(i => i.status === 'pending').length,
    paid: invoices.filter(i => i.status === 'paid').length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
  }), [invoices]);

  return (
    <AppLayout
      title="Invoices"
      subtitle={`${filtered.length} of ${invoices.length} invoices`}
      actions={
        <button
          onClick={() => navigate('/invoices/new')}
          className="flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
        >
          <div className="w-4 h-4 flex items-center justify-center">
            <i className="ri-add-line text-sm" />
          </div>
          New Invoice
        </button>
      }
    >
      {/* Filters Bar */}
      <div className="bg-[#0A0C10] border border-[#1E2330] rounded-xl p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center">
              <i className="ri-search-line text-sm text-[#4B5563]" />
            </div>
            <input
              type="text"
              placeholder="Search invoices, clients..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#1E2330] border border-[#2A3040] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-[#4B5563] font-mono focus:outline-none focus:border-[#10B981]/50 transition-colors"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-[#1E2330] rounded-lg p-1">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === f.value
                    ? 'bg-[#10B981] text-white'
                    : 'text-[#6B7280] hover:text-white'
                }`}
              >
                {f.label}
                <span className={`ml-1.5 text-xs ${statusFilter === f.value ? 'text-white/70' : 'text-[#4B5563]'}`}>
                  {counts[f.value as keyof typeof counts]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0A0C10] border border-[#1E2330] rounded-xl overflow-hidden">
        <InvoiceTable
          invoices={filtered}
          loading={loading}
          sortField={sortField}
          sortDir={sortDir}
          onSort={handleSort}
        />
      </div>

      {/* Footer */}
      {!loading && filtered.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-xs text-[#4B5563] font-mono">
          <span>Showing {filtered.length} invoice{filtered.length !== 1 ? 's' : ''}</span>
          <span>
            Total: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
              filtered.reduce((s, i) => s + Number(i.total), 0)
            )}
          </span>
        </div>
      )}
    </AppLayout>
  );
}
