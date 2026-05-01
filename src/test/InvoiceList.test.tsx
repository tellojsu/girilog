import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import InvoiceList from '../pages/invoices/list/page';

// 1. Setup consistent mock before any imports
const mockInvoices = [
  { id: '1', invoice_number: 'INV-001', status: 'paid', total: 100, client_name: 'Client A' },
  { id: '2', invoice_number: 'INV-002', status: 'pending', total: 200, client_name: 'Client B' },
  { id: '3', invoice_number: 'INV-003', status: 'draft', total: 50, client_name: 'Client A' },
];

vi.mock('@/lib/supabase', () => {
  const qb = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: any) => Promise.resolve({ data: mockInvoices, error: null }).then(resolve)),
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

vi.mock('../pages/invoices/components/InvoiceTable', () => ({
  default: ({ invoices, loading }: any) => (
    <div data-testid="invoice-table">
      {loading ? 'Table Loading' : `Table Count: ${invoices.length}`}
      {invoices?.map((inv: any) => (
        <div key={inv.id}>{inv.invoice_number}</div>
      ))}
    </div>
  ),
}));

describe('InvoiceList Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading and then data', async () => {
    // For this test, we want to control the resolution
    const { supabase } = await import('@/lib/supabase');
    let resolveInvoices: any;
    const promise = new Promise((resolve) => { resolveInvoices = resolve; });
    (supabase.from('any') as any).then.mockImplementation((resolve: any) => promise.then(resolve));

    render(
      <MemoryRouter>
        <InvoiceList />
      </MemoryRouter>
    );

    expect(screen.getByText('Table Loading')).toBeDefined();

    resolveInvoices({ data: mockInvoices, error: null });

    await waitFor(() => {
      expect(screen.getByText('Table Count: 3')).toBeDefined();
    });
    
    expect(screen.getByText('INV-001')).toBeDefined();
    expect(screen.getByText('INV-002')).toBeDefined();
    expect(screen.getByText('INV-003')).toBeDefined();
  });

  it('handles search filtering', async () => {
    const { supabase } = await import('@/lib/supabase');
    (supabase.from('any') as any).then.mockImplementation((resolve: any) => 
      Promise.resolve({ data: mockInvoices, error: null }).then(resolve)
    );

    render(
      <MemoryRouter>
        <InvoiceList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Table Count: 3')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText('Search invoices, clients...');
    fireEvent.change(searchInput, { target: { value: 'INV-001' } });
    
    expect(screen.getByText('Table Count: 1')).toBeDefined();
    expect(screen.getByText('INV-001')).toBeDefined();
    expect(screen.queryByText('INV-002')).toBeNull();
  });
});
