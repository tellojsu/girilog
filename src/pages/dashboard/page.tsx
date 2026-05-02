import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/feature/AppLayout';
import AnnualGoalTracker from './components/AnnualGoalTracker';
import RevenueLineChart from './components/RevenueLineChart';
import RecentInvoices from './components/RecentInvoices';
import { supabase } from '@/lib/supabase';
import { Invoice } from '@/types/girilog';

export default function Dashboard() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [annualGoal, setAnnualGoal] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [invoiceRes, settingsRes] = await Promise.all([
        supabase
          .from('girilog_invoices')
          .select('*')
          .eq('user_id', user.id)
          .gte('issue_date', `${currentYear}-01-01`)
          .lte('issue_date', `${currentYear}-12-31`)
          .order('issue_date', { ascending: false }),
        supabase
          .from('girilog_settings')
          .select('annual_revenue_goal, currency')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);
      if (invoiceRes.data) setInvoices(invoiceRes.data as Invoice[]);
      if (settingsRes.data) {
        setAnnualGoal(Number(settingsRes.data.annual_revenue_goal) || 0);
        setCurrency(settingsRes.data.currency || 'USD');
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const totalPaid = invoices
    .filter(i => {
      const date = new Date(i.issue_date.includes('T') ? i.issue_date : `${i.issue_date}T00:00:00`);
      return i.status === 'paid' && date.getFullYear() === currentYear;
    })
    .reduce((s, i) => s + Number(i.total), 0);
  const totalPending = invoices
    .filter(i => {
      const date = new Date(i.issue_date.includes('T') ? i.issue_date : `${i.issue_date}T00:00:00`);
      return i.status === 'pending' && date.getFullYear() === currentYear;
    })
    .reduce((s, i) => s + Number(i.total), 0);
  const totalOverdue = invoices
    .filter(i => {
      const date = new Date(i.issue_date.includes('T') ? i.issue_date : `${i.issue_date}T00:00:00`);
      return i.status === 'overdue' && date.getFullYear() === currentYear;
    })
    .reduce((s, i) => s + Number(i.total), 0);
  const totalDraft = invoices
    .filter(i => {
      const date = new Date(i.issue_date.includes('T') ? i.issue_date : `${i.issue_date}T00:00:00`);
      return i.status === 'draft' && date.getFullYear() === currentYear;
    })
    .reduce((s, i) => s + Number(i.total), 0);
  const recentInvoices = invoices.filter(i => {
    const date = new Date(i.issue_date.includes('T') ? i.issue_date : `${i.issue_date}T00:00:00`);
    return date.getFullYear() === currentYear;
  });

  return (
    <AppLayout
      title="Dashboard"
      subtitle={`${recentInvoices.length} invoices this year`}
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
      {loading ? (
        <div className="space-y-4">
          <div className="bg-[#0A0C10] border border-[#1E2330] rounded-xl p-6 animate-pulse">
            <div className="h-4 w-32 bg-[#1E2330] rounded mb-4" />
            <div className="h-8 w-48 bg-[#1E2330] rounded mb-6" />
            <div className="h-3 bg-[#1E2330] rounded-full mb-4" />
            <div className="h-16 bg-[#1E2330] rounded-lg" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-[#0A0C10] border border-[#1E2330] rounded-xl h-64 animate-pulse" />
            <div className="bg-[#0A0C10] border border-[#1E2330] rounded-xl h-64 animate-pulse" />
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <RevenueLineChart invoices={invoices} goal={annualGoal} currency={currency} />
          </div>

          <AnnualGoalTracker
            totalPaid={totalPaid}
            totalPending={totalPending}
            totalOverdue={totalOverdue}
            totalDraft={totalDraft}
            goal={annualGoal}
            currency={currency}
            onGoalSaved={setAnnualGoal}
          />

          <div className="w-full">
            <RecentInvoices invoices={recentInvoices} loading={false} />
          </div>
        </>
      )}
    </AppLayout>
  );
}
