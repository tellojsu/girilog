import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import InvoiceDetail from '../pages/invoices/detail/page';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mockFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/lib/supabase', () => {
  const qb = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve)),
  };
  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
      },
      from: vi.fn(() => qb),
    },
  };
});

const createMockBuilder = (data: any = null) => {
  const qb = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
  } as any;
  qb.then = (resolve: any) => Promise.resolve({ data, error: null }).then(resolve);
  qb.maybeSingle.mockReturnValue(qb);
  return qb;
};

// Mock InvoicePreview
vi.mock('../pages/invoices/creator/components/InvoicePreview', () => ({
  default: () => <div data-testid="invoice-preview">InvoicePreview</div>,
}));

describe('InvoiceDetail Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null });
  });

  it('renders loading state initially', () => {
    mockFrom.mockReturnValue(new Promise(() => {})); // Never resolves

    render(
      <MemoryRouter initialEntries={['/invoices/inv-123']}>
        <Routes>
          <Route path="/invoices/:id" element={<InvoiceDetail />} />
        </Routes>
      </MemoryRouter>
    );

    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeDefined();
  });

  it('renders invoice details', async () => {
    const mockInvoice = {
      id: 'inv-123',
      invoice_number: 'INV-123',
      client_name: 'Test Client',
      created_at: new Date().toISOString(),
      status: 'pending',
    };

    const { supabase } = await import('@/lib/supabase');
    (supabase.from as any).mockReturnValue(createMockBuilder(null)); // default
    (supabase.from as any).mockImplementation((table: string) => {
      let data: any = [];
      if (table === 'girilog_invoices') data = mockInvoice;
      if (table === 'girilog_line_items') data = [];
      if (table === 'girilog_settings') data = null;
      return createMockBuilder(data);
    });

    render(
      <MemoryRouter initialEntries={['/invoices/inv-123']}>
        <Routes>
          <Route path="/invoices/:id" element={<InvoiceDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('INV-123')).toBeDefined();
    });

    expect(screen.getByText(/Test Client/)).toBeDefined();
    expect(screen.getAllByTestId('invoice-preview').length).toBeGreaterThan(0);
  });

  it('handles not found state', async () => {
    const { supabase } = await import('@/lib/supabase');
    (supabase.from as any).mockImplementation(() => createMockBuilder(null));

    render(
      <MemoryRouter initialEntries={['/invoices/inv-999']}>
        <Routes>
          <Route path="/invoices/:id" element={<InvoiceDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Invoice not found')).toBeDefined();
    });
  });
});
