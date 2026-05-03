import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientService, invoiceService } from '@/services';
import { Client, Invoice, InvoiceStatusEnum } from '@/types/girilog';
import ClientAvatar from '@/components/common/ClientAvatar';
import StatusBadge from '@/components/base/StatusBadge';

interface ClientDetailDrawerProps {
  client: Client;
  onClose: () => void;
  onEdit: () => void;
  onDeleted: (id: number) => void;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  // Append T00:00:00 to force local timezone parsing for YYYY-MM-DD strings
  const date = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}


export default function ClientDetailDrawer({ client, onClose, onEdit, onDeleted }: ClientDetailDrawerProps) {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      try {
        const data = await invoiceService.getInvoicesByClient(client.id);
        setInvoices(data);
      } catch (err) {
        console.error('Error fetching invoices:', err);
      }
      setLoading(false);
    };
    fetchInvoices();
  }, [client.id]);

  const totalBilled = invoices.reduce((s, i) => s + Number(i.total), 0);
  const totalPaid = invoices.filter(i => i.status === InvoiceStatusEnum.Paid).reduce((s, i) => s + Number(i.total), 0);
  const totalSent = invoices.filter(i => i.status === InvoiceStatusEnum.Sent || i.status === InvoiceStatusEnum.Overdue).reduce((s, i) => s + Number(i.total), 0);

  const handleDelete = async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    setDeleting(true);
    try {
      await clientService.delete(client.id);
      onDeleted(client.id);
      onClose();
    } catch (err) {
      console.error('Error deleting client:', err);
    }
    setDeleting(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-screen w-full max-w-md z-50 bg-[#0A0C10] border-l border-[#1E2330] flex flex-col shadow-2xl animate-[slideInRight_0.2s_ease-out]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E2330] shrink-0">
          <span className="text-xs text-[#6B7280] font-mono uppercase tracking-wider">Client Profile</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-[#1E2330] transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-edit-line text-sm" />
              Edit
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-[#6B7280] hover:text-white hover:bg-[#1E2330] transition-colors cursor-pointer"
            >
              <i className="ri-close-line text-base" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">

          {/* Client identity */}
          <div className="px-6 py-5 border-b border-[#1E2330]">
            <div className="flex items-center gap-4 mb-4">
              <ClientAvatar client={client} size="lg" />
              <div>
                <h2 className="text-lg font-semibold text-white">{client.name}</h2>
                {client.company && client.company !== client.name && (
                  <p className="text-sm text-[#6B7280]">{client.company}</p>
                )}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {client.short_code && (
                    <span className="text-[10px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      {client.short_code}
                    </span>
                  )}
                  {client.default_hourly_rate != null && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 flex items-center gap-1">
                      <i className="ri-time-line" style={{ fontSize: '10px' }} />
                      {formatCurrency(client.default_hourly_rate)}/hr
                    </span>
                  )}
                  <p className="text-xs text-secondary font-mono">
                    Client since {formatDate(client.created_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact details */}
            <div className="space-y-2">
              {client.email && (
                <a
                  href={`mailto:${client.email}`}
                  className="flex items-center gap-3 text-sm text-[#8B9AB0] hover:text-primary transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#1E2330] flex items-center justify-center shrink-0">
                    <i className="ri-mail-line text-xs text-[#6B7280] group-hover:text-primary" />
                  </div>
                  <span className="font-mono text-xs">{client.email}</span>
                </a>
              )}
              {client.phone && (
                <a
                  href={`tel:${client.phone}`}
                  className="flex items-center gap-3 text-sm text-[#8B9AB0] hover:text-primary transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#1E2330] flex items-center justify-center shrink-0">
                    <i className="ri-phone-line text-xs text-[#6B7280] group-hover:text-primary" />
                  </div>
                  <span className="font-mono text-xs">{client.phone}</span>
                </a>
              )}
              {client.address && (
                <div className="flex items-start gap-3 text-sm text-[#8B9AB0]">
                  <div className="w-7 h-7 rounded-lg bg-[#1E2330] flex items-center justify-center shrink-0 mt-0.5">
                    <i className="ri-map-pin-line text-xs text-[#6B7280]" />
                  </div>
                  <span className="text-xs whitespace-pre-line">{client.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Financial summary */}
          <div className="px-6 py-4 border-b border-[#1E2330]">
            <p className="text-xs text-[#6B7280] font-mono uppercase tracking-wider mb-3">Financial Summary</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#0D0F14] border border-[#1E2330] rounded-xl p-3 text-center">
                <div className="text-base font-mono font-bold text-white">{invoices.length}</div>
                <div className="text-[10px] text-secondary mt-0.5">Total</div>
              </div>
              <div className="bg-[#0D0F14] border border-primary/20 rounded-xl p-3 text-center">
                <div className="text-base font-mono font-bold text-primary">{formatCurrency(totalPaid)}</div>
                <div className="text-[10px] text-secondary mt-0.5">Paid</div>
              </div>
              <div className="bg-[#0D0F14] border border-[#1E2330] rounded-xl p-3 text-center">
                <div className={`text-base font-mono font-bold ${totalSent > 0 ? 'text-[#F59E0B]' : 'text-[#6B7280]'}`}>
                  {formatCurrency(totalSent)}
                </div>
                <div className="text-[10px] text-secondary mt-0.5">Outstanding</div>
              </div>
            </div>

            {totalBilled > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-secondary font-mono">Collection rate</span>
                  <span className="text-[10px] text-[#6B7280] font-mono">
                    {Math.round((totalPaid / totalBilled) * 100)}%
                  </span>
                </div>
                <div className="h-1.5 bg-[#1E2330] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min(100, (totalPaid / totalBilled) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Invoice history */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-[#6B7280] font-mono uppercase tracking-wider">Invoice History</p>
              <button
                onClick={() => navigate(`/invoices/new?client=${client.id}`)}
                className="flex items-center gap-1 text-xs text-primary hover:text-[#059669] transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-add-line text-sm" />
                New Invoice
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-10 h-10 rounded-xl bg-[#1E2330] flex items-center justify-center mb-3">
                  <i className="ri-file-list-3-line text-xl text-secondary" />
                </div>
                <p className="text-sm text-[#6B7280]">No invoices yet</p>
                <p className="text-xs text-secondary mt-1">Create the first invoice for this client</p>
              </div>
            ) : (
              <div className="space-y-2">
                {invoices.map(inv => (
                  <div
                    key={inv.id}
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                    className="flex items-center justify-between p-3 bg-[#0D0F14] border border-[#1E2330] rounded-xl hover:border-[#2A3040] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <div className="text-xs font-mono text-primary font-medium">{inv.invoice_number}</div>
                        <div className="text-[10px] text-secondary font-mono mt-0.5">{formatDate(inv.issue_date)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <StatusBadge status={inv.status as InvoiceStatus} />
                      <span className="text-sm font-mono font-semibold text-white">{formatCurrency(inv.total)}</span>
                      <div className="w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <i className="ri-arrow-right-line text-xs text-[#6B7280]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-[#1E2330] shrink-0">
          <button
            onClick={handleDelete}
            onBlur={() => setTimeout(() => setDeleteConfirm(false), 200)}
            disabled={deleting}
            className={`w-full flex items-center justify-center gap-2 py-2 text-sm rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
              deleteConfirm
                ? 'bg-[#EF4444] border-[#EF4444] text-white'
                : 'border-[#EF4444]/20 text-[#EF4444] hover:bg-[#EF4444]/10'
            }`}
          >
            {deleting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <i className="ri-delete-bin-line text-sm" />
            )}
            {deleteConfirm ? 'Confirm Delete Client' : 'Delete Client'}
          </button>
        </div>
      </div>
    </>
  );
}
