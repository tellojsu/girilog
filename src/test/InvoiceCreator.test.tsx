import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import InvoiceCreator from '../pages/invoices/creator/page';
import { InvoiceStatusEnum } from '@/types/girilog';

const mockClients = [{ id: 'client-1', name: 'Test Client' }];
const mockInvoice = {
  id: 'inv-123',
  invoice_number: 'INV-123',
  client_id: 'client-1',
  client_name: 'Test Client',
  issue_date: '2023-01-01',
  due_date: '2023-02-01',
  status: InvoiceStatusEnum.Sent,
};

vi.mock('@/lib/supabase', () => {
  const qb = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    then: vi.fn(function(this: any, resolve: any) {
      // Logic to return different data based on what was likely requested
      // This is a bit brittle but works for these tests
      return Promise.resolve({ data: this._mockData || [], error: null }).then(resolve);
    }),
  } as any;
  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
      },
      from: vi.fn((table) => {
        const tqb = { ...qb };
        if (table === 'girilog_clients') tqb._mockData = mockClients;
        if (table === 'girilog_invoices') tqb._mockData = mockInvoice;
        if (table === 'girilog_line_items') tqb._mockData = [];
        return tqb;
      }),
    },
  };
});

// Mock child components
vi.mock('../pages/invoices/creator/components/LineItemsEditor', () => ({
  default: () => <div data-testid="line-items-editor">LineItemsEditor</div>,
}));
vi.mock('../pages/invoices/creator/components/InvoicePreview', () => ({
  default: () => <div data-testid="invoice-preview">InvoicePreview</div>,
}));

describe('InvoiceCreator Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly in creation mode', async () => {
    // Override from to return empty for creation mode
    const { supabase } = await import('@/lib/supabase');
    (supabase.from as any).mockImplementation((table: string) => {
       const qb = {
         select: vi.fn().mockReturnThis(),
         eq: vi.fn().mockReturnThis(),
         order: vi.fn().mockReturnThis(),
         limit: vi.fn().mockReturnThis(),
         maybeSingle: vi.fn().mockReturnThis(),
         then: vi.fn((resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve)),
       };
       return qb;
    });

    render(
      <MemoryRouter initialEntries={['/invoices/new']}>
        <Routes>
          <Route path="/invoices/new" element={<InvoiceCreator />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('New Invoice').length).toBeGreaterThan(0);
    });

    expect(screen.getByTestId('line-items-editor')).toBeDefined();
    expect(screen.getByPlaceholderText(/Search for a client.../i)).toBeDefined();
  });

  it('renders correctly in edit mode', async () => {
    const { supabase } = await import('@/lib/supabase');
    (supabase.from as any).mockImplementation((table: string) => {
       let data: any = [];
       if (table === 'girilog_invoices') data = mockInvoice;
       if (table === 'girilog_clients') data = mockClients;
       
       const qb = {
         select: vi.fn().mockReturnThis(),
         eq: vi.fn().mockReturnThis(),
         order: vi.fn().mockReturnThis(),
         limit: vi.fn().mockReturnThis(),
         maybeSingle: vi.fn().mockReturnThis(),
         then: vi.fn((resolve: any) => Promise.resolve({ data, error: null }).then(resolve)),
       };
       return qb;
    });

    render(
      <MemoryRouter initialEntries={['/invoices/inv-123/edit']}>
        <Routes>
          <Route path="/invoices/:id/edit" element={<InvoiceCreator />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Editing INV-123/i)).toBeDefined();
    });

    expect(screen.getAllByText('INV-123').length).toBeGreaterThan(0);
    expect(screen.getByText('Test Client')).toBeDefined();
  });
});
