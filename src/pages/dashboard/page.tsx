import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/feature/AppLayout';
import AnnualGoalTracker from '@/components/feature/AnnualGoalTracker';
import RevenueLineChart from './components/RevenueLineChart';
import RecentInvoices from './components/RecentInvoices';
import LogTimeModal from './components/LogTimeModal';
import { invoiceService, settingsService } from '@/services';
import { Invoice, InvoiceStatusEnum } from '@/types/girilog';

export default function Dashboard() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [annualGoal, setAnnualGoal] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [showLogTimeModal, setShowLogTimeModal] = useState(false);
  const currentYear = new Date().getFullYear();

  const fetchData = async () => {
    try {
      const [invoiceData, settingsData] = await Promise.all([
        invoiceService.getYearlyInvoices(currentYear),
        settingsService.getSettings(),
      ]);
      setInvoices(invoiceData);
      if (settingsData) {
        setAnnualGoal(Number(settingsData.annual_revenue_goal) || 0);
        setCurrency(settingsData.currency || 'USD');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

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
          onClick={() => setShowLogTimeModal(true)}
          className="flex items-center gap-2 bg-primary hover:bg-[#059669] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
        >
          <div className="w-4 h-4 flex items-center justify-center">
            <i className="ri-add-line text-sm" />
          </div>
          Log new time
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

          <AnnualGoalTracker />

          <div className="w-full">
            <RecentInvoices invoices={recentInvoices} loading={false} />
          </div>

          <LogTimeModal
            isOpen={showLogTimeModal}
            onClose={() => setShowLogTimeModal(false)}
            onSaved={fetchData}
          />
        </>
      )}
    </AppLayout>
  );
}
