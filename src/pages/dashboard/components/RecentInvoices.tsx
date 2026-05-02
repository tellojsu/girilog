import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Invoice, STATUS_CONFIG, InvoiceStatusEnum } from '@/types/girilog';
import StatusBadge from '@/components/base/StatusBadge';

interface RecentInvoicesProps {
  invoices: Invoice[];
  loading: boolean;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  // Append T00:00:00 to force local timezone parsing for YYYY-MM-DD strings
  const date = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface ClientGroup {
  clientName: string;
  invoices: Invoice[];
  total: number;
  paid: number;
  pending: number;
  overdue: number;
  draft: number;
}

function groupByClient(invoices: Invoice[]): ClientGroup[] {
  const map = new Map<string, Invoice[]>();
  invoices.forEach(inv => {
    const key = inv.client_name || 'Unknown Client';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(inv);
  });

  return Array.from(map.entries())
    .map(([clientName, invs]) => ({
      clientName,
      invoices: invs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 3),
      total: invs.reduce((s, i) => s + Number(i.total), 0),
      paid: invs.filter(i => i.status === InvoiceStatusEnum.Paid).reduce((s, i) => s + Number(i.total), 0),
      pending: invs.filter(i => i.status === InvoiceStatusEnum.Sent).reduce((s, i) => s + Number(i.total), 0),
      overdue: invs.filter(i => i.status === InvoiceStatusEnum.Overdue).reduce((s, i) => s + Number(i.total), 0),
      draft: invs.filter(i => i.status === InvoiceStatusEnum.Draft).reduce((s, i) => s + Number(i.total), 0),
    }))
    .sort((a, b) => b.total - a.total);
}

function ClientInitial({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
  const colors = ['#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#3B82F6', '#EF4444'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
      style={{ backgroundColor: color + '22', color }}
    >
      {initials || '?'}
    </div>
  );
}

function StatusDots({ group }: { group: ClientGroup }) {
  const items = [
    { status: InvoiceStatusEnum.Paid, value: group.paid },
    { status: InvoiceStatusEnum.Sent, value: group.pending },
    { status: InvoiceStatusEnum.Overdue, value: group.overdue },
    { status: InvoiceStatusEnum.Draft, value: group.draft },
  ].filter(i => i.value > 0);

  return (
    <div className="flex items-center gap-2">
      {items.map(({ status, value }) => (
        <div key={status} className="flex items-center gap-1">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: STATUS_CONFIG[status].color }}
          />
          <span className="text-xs font-mono" style={{ color: STATUS_CONFIG[status].color }}>
            {formatCurrency(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function ClientAccordion({ group }: { group: ClientGroup }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const hasOverdue = group.overdue > 0;
  const allPaid = group.invoices.every(i => i.status === InvoiceStatusEnum.Paid);

  return (
    <div className="border-b border-[#1E2330] last:border-b-0">
      {/* Summary row */}
      <div
        className="px-6 py-4 flex items-center gap-3 hover:bg-[#1E2330]/30 transition-colors cursor-pointer select-none"
        onClick={() => setOpen(v => !v)}
      >
        <ClientInitial name={group.clientName} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium text-white truncate">{group.clientName}</span>
            {hasOverdue && (
              <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-[#EF4444]/10 text-[#EF4444]">overdue</span>
            )}
            {allPaid && (
              <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-[#10B981]/10 text-[#10B981]">all paid</span>
            )}
          </div>
          <StatusDots group={group} />
        </div>

        <div className="text-right shrink-0 mr-3">
          <div className="text-sm font-mono font-semibold text-white">{formatCurrency(group.total)}</div>
          <div className="text-xs text-[#4B5563] font-mono mt-0.5">
            {group.invoices.length} invoice{group.invoices.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="w-4 h-4 flex items-center justify-center text-[#4B5563] shrink-0">
          {open
            ? <i className="ri-arrow-up-s-line text-sm" />
            : <i className="ri-arrow-down-s-line text-sm" />
          }
        </div>
      </div>

      {/* Expanded invoice rows */}
      {open && (
        <div className="bg-[#060810] border-t border-[#1E2330]">
          {group.invoices.map((inv, idx) => (
            <div
              key={inv.id}
              onClick={() => navigate(`/invoices/${inv.id}`)}
              className={`px-6 py-3 flex items-center gap-3 hover:bg-[#1E2330]/40 transition-colors cursor-pointer ${
                idx < group.invoices.length - 1 ? 'border-b border-[#1E2330]/60' : ''
              }`}
            >
              {/* indent line */}
              <div className="w-8 flex justify-center shrink-0">
                <div className="w-px h-full bg-[#1E2330] relative">
                  <div className="absolute top-1/2 left-0 w-3 h-px bg-[#1E2330]" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#10B981]">{inv.invoice_number}</span>
                  <StatusBadge status={inv.status} size="sm" />
                </div>
                {inv.notes && (
                  <div className="text-xs text-[#4B5563] truncate mt-0.5">{inv.notes}</div>
                )}
              </div>

              <div className="text-right shrink-0">
                <div className="text-sm font-mono font-semibold text-white">{formatCurrency(Number(inv.total))}</div>
                <div className="text-xs text-[#4B5563] mt-0.5">
                  {inv.due_date ? `due ${formatDate(inv.due_date)}` : formatDate(inv.issue_date)}
                </div>
              </div>

              <div className="w-4 h-4 flex items-center justify-center text-[#4B5563] shrink-0">
                <i className="ri-arrow-right-s-line text-sm" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RecentInvoices({ invoices, loading }: RecentInvoicesProps) {
  const navigate = useNavigate();
  const groups = groupByClient(invoices);

  return (
    <div className="bg-[#0A0C10] border border-[#1E2330] rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[#1E2330] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">By Client</h2>
          {!loading && invoices.length > 0 && (
            <p className="text-xs text-[#4B5563] font-mono mt-0.5">{groups.length} client{groups.length !== 1 ? 's' : ''} · {invoices.length} invoices</p>
          )}
        </div>
        <button
          onClick={() => navigate('/invoices')}
          className="text-xs text-[#10B981] hover:text-[#34D399] font-mono transition-colors cursor-pointer whitespace-nowrap"
        >
          View all →
        </button>
      </div>

      {loading ? (
        <div className="divide-y divide-[#1E2330]">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="px-6 py-4 flex items-center gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-[#1E2330] shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-32 bg-[#1E2330] rounded" />
                <div className="h-2.5 w-48 bg-[#1E2330] rounded" />
              </div>
              <div className="text-right space-y-1.5">
                <div className="h-3 w-16 bg-[#1E2330] rounded" />
                <div className="h-2.5 w-10 bg-[#1E2330] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="px-6 py-12 text-center text-[#4B5563] text-sm font-mono">
          No invoices yet. Create your first one!
        </div>
      ) : (
        <div>
          {groups.map(group => (
            <ClientAccordion key={group.clientName} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}
