import { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/feature/AppLayout';
import ClientCard from './components/ClientCard';
import ClientFormModal from './components/ClientFormModal';
import ClientDetailDrawer from './components/ClientDetailDrawer';
import { clientService, invoiceService } from '@/services';
import { Client, Invoice, InvoiceStatusEnum } from '@/types/girilog';

type SortOption = 'name' | 'recent' | 'billed';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [invoiceMap, setInvoiceMap] = useState<Record<number, Invoice[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('name');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clientList, invoiceList] = await Promise.all([
        clientService.getClients(),
        invoiceService.getAllInvoices(),
      ]);

      // Group invoices by client_id
      const map: Record<number, Invoice[]> = {};
      invoiceList.forEach(inv => {
        if (inv.client_id) {
          if (!map[inv.client_id]) map[inv.client_id] = [];
          map[inv.client_id].push(inv);
        }
      });

      setClients(clientList);
      setInvoiceMap(map);
    } catch (err) {
      console.error('Error fetching clients and invoices:', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleClientSaved = (saved: Client) => {
    setClients(prev => {
      const exists = prev.find(c => c.id === saved.id);
      if (exists) return prev.map(c => c.id === saved.id ? saved : c);
      return [saved, ...prev];
    });
    setShowModal(false);
    setEditingClient(null);
    // If we were viewing this client in the drawer, update it
    if (selectedClient?.id === saved.id) setSelectedClient(saved);
  };

  const handleClientDeleted = (id: number) => {
    setClients(prev => prev.filter(c => c.id !== id));
    setInvoiceMap(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setShowModal(true);
    setSelectedClient(null);
  };

  const filtered = useMemo(() => {
    let result = [...clients];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.company || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q)
      );
    }
    if (sort === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'recent') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sort === 'billed') {
      result.sort((a, b) => {
        const aTotal = (invoiceMap[a.id] || []).reduce((s, i) => s + Number(i.total), 0);
        const bTotal = (invoiceMap[b.id] || []).reduce((s, i) => s + Number(i.total), 0);
        return bTotal - aTotal;
      });
    }
    return result;
  }, [clients, search, sort, invoiceMap]);

  const totalBilled = useMemo(() =>
    Object.values(invoiceMap).flat().reduce((s, i) => s + Number(i.total), 0),
    [invoiceMap]
  );
  const totalPaid = useMemo(() =>
    Object.values(invoiceMap).flat().filter(i => i.status === InvoiceStatusEnum.Paid).reduce((s, i) => s + Number(i.total), 0),
    [invoiceMap]
  );

  return (
    <>
      <AppLayout
        title="Clients"
        subtitle={`${clients.length} client${clients.length !== 1 ? 's' : ''}`}
        actions={
          <button
            onClick={() => { setEditingClient(null); setShowModal(true); }}
            className="flex items-center gap-2 bg-primary hover:bg-[#059669] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-user-add-line text-sm" />
            </div>
            Add Client
          </button>
        }
      >
        {/* Summary bar */}
        {!loading && clients.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total Clients', value: String(clients.length), icon: 'ri-group-line', color: 'var(--color-primary, #10B981)' },
              { label: 'Total Billed', value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalBilled), icon: 'ri-money-dollar-circle-line', color: 'var(--color-primary, #10B981)' },
              { label: 'Total Paid', value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalPaid), icon: 'ri-checkbox-circle-line', color: 'var(--color-primary, #10B981)' },
              { label: 'Avg per Client', value: clients.length > 0 ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalBilled / clients.length) : '$0', icon: 'ri-bar-chart-line', color: '#F59E0B' },
            ].map(stat => (
              <div key={stat.label} className="bg-[#0A0C10] border border-[#1E2330] rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${stat.color}18` }}>
                  <i className={`${stat.icon} text-sm`} style={{ color: stat.color }} />
                </div>
                <div>
                  <div className="text-sm font-mono font-bold text-white">{stat.value}</div>
                  <div className="text-[10px] text-secondary">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="bg-[#0A0C10] border border-[#1E2330] rounded-xl p-4 mb-5">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center">
                <i className="ri-search-line text-sm text-secondary" />
              </div>
              <input
                type="text"
                placeholder="Search clients, companies..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-[#1E2330] border border-[#2A3040] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-secondary font-mono focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1 bg-[#1E2330] rounded-lg p-1">
              {([
                { value: 'name', label: 'A–Z' },
                { value: 'recent', label: 'Recent' },
                { value: 'billed', label: 'Top Billed' },
              ] as { value: SortOption; label: string }[]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSort(opt.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap ${
                    sort === opt.value
                      ? 'bg-primary text-white'
                      : 'text-[#6B7280] hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3 text-[#6B7280]">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-sm font-mono">Loading clients...</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#0A0C10] border border-[#1E2330] flex items-center justify-center mb-4">
              <i className="ri-group-line text-2xl text-secondary" />
            </div>
            <p className="text-[#6B7280] text-sm font-mono">
              {search ? 'No clients match your search' : 'No clients yet'}
            </p>
            {!search && (
              <button
                onClick={() => { setEditingClient(null); setShowModal(true); }}
                className="mt-3 text-xs text-primary hover:text-[#059669] transition-colors cursor-pointer"
              >
                Add your first client →
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(client => (
                <ClientCard
                  key={client.id}
                  client={client}
                  invoices={invoiceMap[client.id] || []}
                  onClick={() => setSelectedClient(client)}
                />
              ))}
            </div>
            <p className="text-xs text-secondary font-mono mt-4">
              Showing {filtered.length} of {clients.length} client{clients.length !== 1 ? 's' : ''}
            </p>
          </>
        )}
      </AppLayout>

      {/* Add/Edit Modal */}
      {showModal && (
        <ClientFormModal
          client={editingClient}
          onClose={() => { setShowModal(false); setEditingClient(null); }}
          onSaved={handleClientSaved}
        />
      )}

      {/* Detail Drawer */}
      {selectedClient && (
        <ClientDetailDrawer
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onEdit={() => handleEdit(selectedClient)}
          onDeleted={handleClientDeleted}
        />
      )}
    </>
  );
}
