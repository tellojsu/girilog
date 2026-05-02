import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '../pages/dashboard/page';
import { MemoryRouter } from 'react-router-dom';
import { InvoiceStatusEnum } from '@/types/girilog';

// Mock supabase
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: () => mockGetUser(),
    },
    from: (table: string) => mockFrom(table),
  },
}));

// Mock components to avoid deep testing
vi.mock('../components/feature/AnnualGoalTracker', () => ({
  default: () => <div data-testid="goal-tracker">AnnualGoalTracker</div>,
}));
vi.mock('../pages/dashboard/components/RevenueLineChart', () => ({
  default: () => <div data-testid="revenue-chart">RevenueLineChart</div>,
}));
vi.mock('../pages/dashboard/components/RecentInvoices', () => ({
  default: () => <div data-testid="recent-invoices">RecentInvoices</div>,
}));

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null });
  });

  it('renders loading state initially', () => {
    // Return a promise that doesn't resolve immediately
    mockFrom.mockImplementation(() => {
      const qb: any = {};
      qb.select = vi.fn().mockReturnValue(qb);
      qb.eq = vi.fn().mockReturnValue(qb);
      qb.gte = vi.fn().mockReturnValue(qb);
      qb.lte = vi.fn().mockReturnValue(qb);
      qb.order = vi.fn().mockReturnValue(new Promise(() => {}));
      qb.maybeSingle = vi.fn().mockReturnValue(new Promise(() => {}));
      return qb;
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    // Should show pulse skeletons
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders dashboard with data', async () => {
    const currentYear = new Date().getFullYear();
    const mockInvoices = [
      { id: '1', status: InvoiceStatusEnum.Paid, total: 100, issue_date: `${currentYear}-01-01`, created_at: new Date().toISOString() },
      { id: '2', status: InvoiceStatusEnum.Sent, total: 50, issue_date: `${currentYear}-01-01`, created_at: new Date().toISOString() },
    ];
    const mockSettings = { annual_revenue_goal: 5000, currency: 'USD' };

    mockFrom.mockImplementation((table) => {
      const qb: any = {};
      qb.select = vi.fn().mockReturnValue(qb);
      qb.eq = vi.fn().mockReturnValue(qb);
      qb.gte = vi.fn().mockReturnValue(qb);
      qb.lte = vi.fn().mockReturnValue(qb);
      qb.order = vi.fn().mockReturnValue(qb);
      qb.maybeSingle = vi.fn();

      // Make it a thenable
      qb.then = (resolve: any) => {
        if (table === 'girilog_invoices') {
          return Promise.resolve({ data: mockInvoices, error: null }).then(resolve);
        }
        if (table === 'girilog_settings') {
          return Promise.resolve({ data: mockSettings, error: null }).then(resolve);
        }
        return Promise.resolve({ data: null, error: null }).then(resolve);
      };

      if (table === 'girilog_invoices') {
        qb.order.mockReturnValue(qb);
      } else if (table === 'girilog_settings') {
        qb.maybeSingle.mockImplementation(() => Promise.resolve({ data: mockSettings, error: null }));
      }

      return qb;
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('goal-tracker')).toBeDefined();
      expect(screen.getByTestId('revenue-chart')).toBeDefined();
      expect(screen.getByTestId('recent-invoices')).toBeDefined();
    });

    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    expect(screen.getByText('2 invoices this year')).toBeDefined();
  });
});
