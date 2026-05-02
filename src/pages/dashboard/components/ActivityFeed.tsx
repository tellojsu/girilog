import { Invoice } from '@/types/girilog';
import StatusBadge from '@/components/base/StatusBadge';

interface ActivityFeedProps {
  invoices: Invoice[];
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function ActivityFeed({ invoices }: ActivityFeedProps) {
  const sorted = [...invoices].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 6);

  return (
    <div className="bg-[#0A0C10] border border-[#1E2330] rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[#1E2330]">
        <h2 className="text-sm font-semibold text-white">Activity</h2>
      </div>
      <div className="divide-y divide-[#1E2330]">
        {sorted.map((inv) => (
          <div key={inv.id} className="px-6 py-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1E2330] flex items-center justify-center shrink-0">
              <i className="ri-file-text-line text-sm text-[#6B7280]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white">
                <span className="font-mono text-primary">{inv.invoice_number}</span>
                <span className="text-[#6B7280]"> · {inv.client_name}</span>
              </div>
              <div className="mt-0.5">
                <StatusBadge status={inv.status} size="sm" />
              </div>
            </div>
            <span className="text-xs text-secondary font-mono shrink-0">{timeAgo(inv.updated_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
