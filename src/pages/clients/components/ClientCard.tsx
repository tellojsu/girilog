import { Client, Invoice, InvoiceStatusEnum } from '@/types/girilog';
import ClientAvatar from '@/components/common/ClientAvatar';

interface ClientCardProps {
  client: Client;
  invoices: Invoice[];
  onClick: () => void;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}


export default function ClientCard({ client, invoices, onClick }: ClientCardProps) {
  const totalBilled = invoices.reduce((s, i) => s + Number(i.total), 0);
  const totalPaid = invoices.filter(i => i.status === InvoiceStatusEnum.Paid).reduce((s, i) => s + Number(i.total), 0);
  const openCount = invoices.filter(i => i.status === InvoiceStatusEnum.Sent || i.status === InvoiceStatusEnum.Overdue).length;
  const hasOverdue = invoices.some(i => i.status === InvoiceStatusEnum.Overdue);

  return (
    <div
      onClick={onClick}
      className="bg-[#0A0C10] border border-[#1E2330] rounded-xl p-5 hover:border-[#2A3040] hover:bg-[#0D0F14] transition-all cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <ClientAvatar client={client} />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white truncate group-hover:text-[#10B981] transition-colors">
              {client.name}
            </h3>
            {client.company && client.company !== client.name && (
              <p className="text-xs text-[#6B7280] truncate mt-0.5">{client.company}</p>
            )}
          </div>
        </div>
        {hasOverdue && (
          <span className="shrink-0 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20">
            Overdue
          </span>
        )}
      </div>

      {/* Contact info */}
      <div className="space-y-1.5 mb-4">
        {client.email && (
          <div className="flex items-center gap-2 text-xs text-[#6B7280]">
            <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
              <i className="ri-mail-line text-[#4B5563]" />
            </div>
            <span className="font-mono truncate">{client.email}</span>
          </div>
        )}
        {client.phone && (
          <div className="flex items-center gap-2 text-xs text-[#6B7280]">
            <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
              <i className="ri-phone-line text-[#4B5563]" />
            </div>
            <span className="font-mono">{client.phone}</span>
          </div>
        )}
        {client.address && (
          <div className="flex items-start gap-2 text-xs text-[#6B7280]">
            <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0 mt-0.5">
              <i className="ri-map-pin-line text-[#4B5563]" />
            </div>
            <span className="truncate">{client.address}</span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-[#1E2330] pt-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <div className="text-sm font-mono font-bold text-white">{invoices.length}</div>
            <div className="text-[10px] text-[#4B5563] mt-0.5">Invoices</div>
          </div>
          <div className="text-center border-x border-[#1E2330]">
            <div className="text-sm font-mono font-bold text-[#10B981]">{formatCurrency(totalPaid)}</div>
            <div className="text-[10px] text-[#4B5563] mt-0.5">Paid</div>
          </div>
          <div className="text-center">
            <div className={`text-sm font-mono font-bold ${openCount > 0 ? 'text-[#F59E0B]' : 'text-[#6B7280]'}`}>
              {openCount}
            </div>
            <div className="text-[10px] text-[#4B5563] mt-0.5">Open</div>
          </div>
        </div>

        {/* Billed bar */}
        {totalBilled > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[#4B5563] font-mono">Paid</span>
              <span className="text-[10px] text-[#6B7280] font-mono">
                {formatCurrency(totalPaid)} / {formatCurrency(totalBilled)}
              </span>
            </div>
            <div className="h-1 bg-[#1E2330] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#10B981] rounded-full transition-all"
                style={{ width: `${Math.min(100, (totalPaid / totalBilled) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
