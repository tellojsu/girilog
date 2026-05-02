import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Invoice, InvoiceStatus } from '@/types/girilog';
import StatusBadge from '@/components/base/StatusBadge';

interface InvoiceTableProps {
  invoices: Invoice[];
  loading: boolean;
  sortField: string;
  sortDir: 'asc' | 'desc';
  onSort: (field: string) => void;
  onDelete?: (id: number) => void;
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

const columns = [
  { key: 'invoice_number', label: 'Invoice #' },
  { key: 'client_name', label: 'Client' },
  { key: 'issue_date', label: 'Issued' },
  { key: 'due_date', label: 'Due' },
  { key: 'total', label: 'Amount' },
  { key: 'status', label: 'Status' },
];

export default function InvoiceTable({ invoices, loading, sortField, sortDir, onSort, onDelete }: InvoiceTableProps) {
  const navigate = useNavigate();
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <i className="ri-arrow-up-down-line text-secondary text-xs ml-1" />;
    return sortDir === 'asc'
      ? <i className="ri-arrow-up-line text-primary text-xs ml-1" />
      : <i className="ri-arrow-down-line text-primary text-xs ml-1" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-xl bg-[#1E2330] flex items-center justify-center mb-4">
          <i className="ri-file-list-3-line text-2xl text-secondary" />
        </div>
        <p className="text-[#6B7280] text-sm font-mono">No invoices found</p>
        <p className="text-secondary text-xs mt-1">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#1E2330]">
            {columns.map(col => (
              <th
                key={col.key}
                onClick={() => onSort(col.key)}
                className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider font-mono cursor-pointer hover:text-white transition-colors whitespace-nowrap select-none"
              >
                {col.label}
                <SortIcon field={col.key} />
              </th>
            ))}
            <th className="px-4 py-3 text-right text-xs font-medium text-[#6B7280] uppercase tracking-wider font-mono">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1E2330]">
          {invoices.map((inv) => (
            <tr
              key={inv.id}
              onClick={() => navigate(`/invoices/${inv.id}`)}
              className="hover:bg-[#1E2330]/40 transition-colors cursor-pointer group"
            >
              <td className="px-4 py-4">
                <span className="text-sm font-mono text-primary font-medium">{inv.invoice_number}</span>
              </td>
              <td className="px-4 py-4">
                <div className="text-sm text-white font-medium">{inv.client_name || '—'}</div>
                {inv.client_email && (
                  <div className="text-xs text-secondary font-mono mt-0.5">{inv.client_email}</div>
                )}
              </td>
              <td className="px-4 py-4">
                <span className="text-sm text-[#8B9AB0] font-mono">{formatDate(inv.issue_date)}</span>
              </td>
              <td className="px-4 py-4">
                <span className={`text-sm font-mono ${inv.status === 'overdue' ? 'text-[#EF4444]' : 'text-[#8B9AB0]'}`}>
                  {formatDate(inv.due_date)}
                </span>
              </td>
              <td className="px-4 py-4">
                <span className="text-sm font-mono font-semibold text-white">{formatCurrency(inv.total)}</span>
              </td>
              <td className="px-4 py-4">
                <StatusBadge status={inv.status as InvoiceStatus} />
              </td>
              <td className="px-4 py-4 text-right">
                <div className="flex items-center justify-end gap-1">
                  {deleteConfirmId === inv.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-danger font-mono font-medium uppercase">Sure?</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete?.(inv.id);
                          setDeleteConfirmId(null);
                        }}
                        className="p-1.5 bg-danger hover:bg-[#ea580c] text-white rounded-md transition-colors cursor-pointer"
                        title="Confirm Delete"
                      >
                        <i className="ri-check-line text-xs" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(null);
                        }}
                        className="p-1.5 bg-[#1E2330] border border-[#2A3040] text-secondary hover:text-white rounded-md transition-colors cursor-pointer"
                        title="Cancel"
                      >
                        <i className="ri-close-line text-xs" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/invoices/${inv.id}`); }}
                        className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-all cursor-pointer"
                        title="View Invoice"
                      >
                        <i className="ri-eye-line text-base" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/invoices/${inv.id}/edit`); }}
                        className="p-1.5 text-caution hover:bg-caution/10 rounded-md transition-all cursor-pointer"
                        title="Edit Invoice"
                      >
                        <i className="ri-edit-line text-base" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(inv.id); }}
                        className="p-1.5 text-danger hover:bg-danger/10 rounded-md transition-all cursor-pointer"
                        title="Delete Invoice"
                      >
                        <i className="ri-delete-bin-line text-base" />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
