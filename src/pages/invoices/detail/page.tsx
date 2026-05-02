import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '@/components/feature/AppLayout';
import InvoicePreview from '../creator/components/InvoicePreview';
import StatusBadge from '@/components/base/StatusBadge';
import { supabase } from '@/lib/supabase';
import { Invoice, LineItem, Settings, InvoiceStatusEnum } from '@/types/girilog';
import { usePDFDownload } from '@/hooks/usePDFDownload';

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const { downloadPDF, downloading } = usePDFDownload();

  const handleDownloadPDF = () => {
    if (!invoice) return;
    downloadPDF('invoice-preview-capture', `${invoice.invoice_number}.pdf`);
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: inv }, { data: items }, { data: s }] = await Promise.all([
        supabase.from('girilog_invoices').select('*').eq('id', id!).eq('user_id', user.id).maybeSingle(),
        supabase.from('girilog_line_items').select('*').eq('invoice_id', id!).eq('user_id', user.id),
        supabase.from('girilog_settings').select('*').eq('user_id', user.id).maybeSingle(),
      ]);
      if (inv) setInvoice(inv as Invoice);
      if (items) {
        setLineItems(items as LineItem[]);
      } else {
        setLineItems([]);
      }
      if (s) setSettings(s as Settings);
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const updateStatus = async (status: InvoiceStatusEnum) => {
    if (!invoice) return;
    setUpdatingStatus(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('girilog_invoices')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', invoice.id)
        .eq('user_id', user.id);
      setInvoice(i => i ? { ...i, status } : i);
    }
    setShowStatusMenu(false);
    setUpdatingStatus(false);
  };

  const handleDelete = async () => {
    if (!invoice) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('girilog_invoices')
        .delete()
        .eq('id', invoice.id)
        .eq('user_id', user.id);
      navigate('/invoices');
    }
  };

  if (loading) {
    return (
      <AppLayout title="Invoice">
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!invoice) {
    return (
      <AppLayout title="Invoice Not Found">
        <div className="text-center py-20">
          <p className="text-[#6B7280] font-mono">Invoice not found</p>
          <button onClick={() => navigate('/invoices')} className="mt-4 text-primary text-sm font-mono cursor-pointer">
            ← Back to invoices
          </button>
        </div>
      </AppLayout>
    );
  }

  const statusOptions: InvoiceStatusEnum[] = [
    InvoiceStatusEnum.Draft,
    InvoiceStatusEnum.Sent,
    InvoiceStatusEnum.Paid,
    InvoiceStatusEnum.Overdue,
  ];

  return (
    <AppLayout
      title={invoice.invoice_number}
      subtitle={`${invoice.client_name || 'Unknown client'} · Created ${new Date(invoice.created_at.includes('T') ? invoice.created_at : `${invoice.created_at}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
      actions={
        <div className="flex items-center gap-2">
          {/* Status Changer */}
          <div className="relative">
            <button
              onClick={() => setShowStatusMenu(m => !m)}
              disabled={updatingStatus}
              className="flex items-center gap-2 px-3 py-2 bg-[#1E2330] border border-[#2A3040] rounded-lg text-sm hover:border-[#3A4050] transition-colors cursor-pointer whitespace-nowrap"
            >
              <StatusBadge status={invoice.status as InvoiceStatus} size="sm" />
              <div className="w-4 h-4 flex items-center justify-center">
                <i className="ri-arrow-down-s-line text-[#6B7280] text-sm" />
              </div>
            </button>
            {showStatusMenu && (
              <div className="absolute top-full right-0 mt-1 bg-[#1E2330] border border-[#2A3040] rounded-lg overflow-hidden z-20 shadow-xl min-w-[140px]">
                {statusOptions.map(s => (
                  <button
                    key={s}
                    onClick={() => updateStatus(s)}
                    className="w-full px-3 py-2.5 text-left hover:bg-[#2A3040] transition-colors cursor-pointer"
                  >
                    <StatusBadge status={s} size="sm" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Download PDF */}
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 border border-[#2A3040] hover:border-primary/50 text-[#8B9AB0] hover:text-primary text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            {downloading ? (
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            ) : (
              <div className="w-4 h-4 flex items-center justify-center">
                <i className="ri-download-line text-sm" />
              </div>
            )}
            {downloading ? 'Generating...' : 'Download PDF'}
          </button>

          <button
            onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
            className="flex items-center gap-2 px-4 py-2 border border-[#2A3040] hover:border-[#3A4050] text-[#8B9AB0] hover:text-white text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-edit-line text-sm" />
            </div>
            Edit
          </button>

          {!deleteConfirm ? (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 border border-[#2A3040] hover:border-[#EF4444]/50 text-[#6B7280] hover:text-[#EF4444] text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <div className="w-4 h-4 flex items-center justify-center">
                <i className="ri-delete-bin-line text-sm" />
              </div>
              Delete
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#EF4444] font-mono">Confirm?</span>
              <button onClick={handleDelete} className="px-3 py-2 bg-[#EF4444] text-white text-xs rounded-lg cursor-pointer whitespace-nowrap">Yes</button>
              <button onClick={() => setDeleteConfirm(false)} className="px-3 py-2 border border-[#2A3040] text-[#6B7280] text-xs rounded-lg cursor-pointer whitespace-nowrap">No</button>
            </div>
          )}
        </div>
      }
    >
      <div className="max-w-2xl mx-auto">
        {/* Hidden full-width clone used for PDF capture */}
        <div
          id="invoice-preview-capture"
          style={{ position: 'absolute', left: '-9999px', top: 0, width: '794px', background: '#fff' }}
          aria-hidden="true"
        >
          <InvoicePreview
            invoiceNumber={invoice.invoice_number}
            clientName={invoice.client_name || ''}
            clientEmail={invoice.client_email || ''}
            clientAddress={invoice.client_address || ''}
            issueDate={invoice.issue_date}
            dueDate={invoice.due_date || ''}
            lineItems={lineItems}
            taxRate={Number(invoice.tax_rate)}
            discountAmount={Number(invoice.discount_amount)}
            notes={invoice.notes || ''}
            businessName={settings?.business_name || 'GiriLog Studio'}
            businessEmail={settings?.business_email || ''}
            businessAddress={settings?.business_address || ''}
            logoUrl={settings?.logo_url || ''}
            totalOverride={Number(invoice.total)}
          />
        </div>

        {/* Visible preview */}
        <InvoicePreview
          invoiceNumber={invoice.invoice_number}
          clientName={invoice.client_name || ''}
          clientEmail={invoice.client_email || ''}
          clientAddress={invoice.client_address || ''}
          issueDate={invoice.issue_date}
          dueDate={invoice.due_date || ''}
          lineItems={lineItems}
          taxRate={Number(invoice.tax_rate)}
          discountAmount={Number(invoice.discount_amount)}
          notes={invoice.notes || ''}
          businessName={settings?.business_name || 'GiriLog Studio'}
          businessEmail={settings?.business_email || ''}
          businessAddress={settings?.business_address || ''}
          logoUrl={settings?.logo_url || ''}
          totalOverride={Number(invoice.total)}
        />
      </div>
    </AppLayout>
  );
}
