import { LineItem } from '@/types/girilog';

interface InvoicePreviewProps {
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  issueDate: string;
  dueDate: string;
  lineItems: LineItem[];
  taxRate: number;
  discountRate: number;
  notes: string;
  businessName: string;
  businessEmail: string;
  businessAddress: string;
  logoUrl?: string;
  totalOverride?: number;
  showDate?: boolean;
  showProject?: boolean;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(dateStr: string, compact = false) {
  if (!dateStr) return '—';
  // Append T00:00:00 to force local timezone parsing for YYYY-MM-DD strings
  const date = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
  if (compact) {
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
  }
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function InvoicePreview({
  invoiceNumber, clientName, clientEmail, clientAddress,
  issueDate, dueDate, lineItems, taxRate, discountRate, notes,
  businessName, businessEmail, businessAddress, logoUrl, totalOverride,
  showDate, showProject,
}: InvoicePreviewProps) {
  const subtotal = lineItems.reduce((s, i) => s + i.amount, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const discountAmount = subtotal * (discountRate / 100);
  const calculatedTotal = subtotal + taxAmount - discountAmount;
  const displayTotal = totalOverride !== undefined && lineItems.length === 0 ? totalOverride : calculatedTotal;

  // Resolve localized logo URL if it matches problematic external URL
  const resolvedLogoUrl = logoUrl === 'https://www.yeswayjosue.com/images/yeswayjosue-white.png'
    ? '/images/yeswayjosue-white.png'
    : logoUrl;

  return (
    <div className="group/paper relative">
      <div
        className="bg-white text-gray-900 shadow-[0_0_50px_rgba(0,0,0,0.1)] group-hover/paper:shadow-[0_0_60px_rgba(0,0,0,0.15)] transition-shadow duration-500 text-sm relative border border-gray-100 min-h-[595px] overflow-hidden"
        style={{
          fontFamily: 'system-ui, sans-serif',
          aspectRatio: '1 / 1.414', // A4 aspect ratio illusion
        }}
      >
        {/* Paper texture overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('/images/paper-fibers.png')]" />

        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className="bg-[#0D0F14] px-8 py-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {resolvedLogoUrl ? (
                    <img
                      src={resolvedLogoUrl}
                      alt="Logo"
                      className="w-7 h-7 object-contain rounded"
                      crossOrigin={resolvedLogoUrl.startsWith('http') ? 'anonymous' : undefined}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-7 h-7 rounded bg-primary/20 flex items-center justify-center">
                      <i className="ri-building-line text-primary text-xs" />
                    </div>
                  )}
                  <span className="text-white font-bold text-base font-mono">{businessName || 'Your Business'}</span>
                </div>
                <p className="text-[#6B7280] text-xs font-mono">{businessEmail}</p>
                <p className="text-[#6B7280] text-xs font-mono mt-0.5">{businessAddress}</p>
              </div>
              <div className="text-right">
                <div className="text-primary font-mono font-bold text-xl">{invoiceNumber || 'INV-XXXX'}</div>
                <div className="text-[#6B7280] text-xs font-mono mt-1">INVOICE</div>
              </div>
            </div>
          </div>

          {/* Meta */}
          <div className="px-8 py-5 bg-gray-50 border-b border-gray-100">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Bill To</div>
                <div className="font-semibold text-gray-900">{clientName || 'Client Name'}</div>
                {clientEmail && <div className="text-xs text-gray-500 mt-0.5">{clientEmail}</div>}
                {clientAddress && <div className="text-xs text-gray-500 mt-0.5 whitespace-pre-line">{clientAddress}</div>}
              </div>
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Issue Date</div>
                <div className="font-medium text-gray-900">{formatDate(issueDate)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Due Date</div>
                <div className="font-medium text-gray-900">{formatDate(dueDate)}</div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="px-8 py-5">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  {showDate && <th className="text-left text-[10px] text-black uppercase tracking-wider pb-2 pr-4 font-medium">Date</th>}
                  {showProject && <th className="text-left text-[10px] text-black uppercase tracking-wider pb-2 pr-4 font-medium">Project</th>}
                  <th className="text-left text-xs text-black uppercase tracking-wider pb-2 font-medium">Description</th>
                  <th className="text-right text-xs text-black uppercase tracking-wider pb-2 pr-4 font-medium">Qty</th>
                  <th className="text-right text-xs text-black uppercase tracking-wider pb-2 pr-4 font-medium">Rate</th>
                  <th className="text-right text-xs text-black uppercase tracking-wider pb-2 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={4 + (showDate ? 1 : 0) + (showProject ? 1 : 0)} className="py-4 text-center text-gray-400 text-xs italic">No items added yet</td>
                  </tr>
                ) : lineItems.map((item, i) => (
                  <tr key={i}>
                    {showDate && <td className="py-2.5 pr-4 text-[10px] text-gray-500 font-mono">{formatDate(item.date, true)}</td>}
                    {showProject && <td className="py-2.5 pr-4 text-[10px] text-gray-500">{item.project || '—'}</td>}
                    <td className="py-2.5 text-gray-800">{item.description || '—'}</td>
                    <td className="py-2.5 pr-4 text-right text-gray-600 font-mono">{item.quantity}</td>
                    <td className="py-2.5 pr-4 text-right text-gray-600 font-mono">
                      <span className={item.unit_price < 0 ? 'text-danger' : ''}>{formatCurrency(item.unit_price)}</span>
                    </td>
                    <td className={`py-2.5 text-right font-mono font-medium ${item.amount < 0 ? 'text-danger' : 'text-gray-900'}`}>{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Container (Totals, Notes, and Footer) */}
          <div className="mt-auto">
            {/* Totals */}
            <div className="px-8 pb-5">
              <div className="ml-auto w-56 space-y-1.5">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Subtotal</span>
                  <span className={`font-mono ${subtotal < 0 ? 'text-danger' : ''}`}>{formatCurrency(subtotal)}</span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Tax ({taxRate}%)</span>
                    <span className={`font-mono ${taxAmount < 0 ? 'text-danger' : ''}`}>{formatCurrency(taxAmount)}</span>
                  </div>
                )}
                {discountRate > 0 && (
                  <div className="flex justify-between text-xs text-primary">
                    <span>Discount ({discountRate}%)</span>
                    <span className="font-mono">-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className={`font-bold font-mono text-base ${displayTotal < 0 ? 'text-danger' : 'text-[#0D0F14]'}`}>{formatCurrency(displayTotal)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {notes && (
              <div className="px-8 pb-6">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Notes</div>
                  <p className="text-xs text-gray-600">{notes}</p>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-8 py-4 bg-[#0D0F14] text-center">
              <p className="text-secondary text-xs font-mono">Thank you for your business · Generated by GiriLog</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
