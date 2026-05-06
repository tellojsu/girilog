import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ClientFormModal from '../pages/clients/components/ClientFormModal';
import { clientService, invoiceService } from '@/services';

// Mock the services
vi.mock('@/services', () => ({
  clientService: {
    isShortCodeTaken: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  invoiceService: {
    checkShortCodeUsage: vi.fn(),
  },
}));

// Mock child components that might be problematic or unnecessary for this test
vi.mock('@/pages/settings/components/LogoUploader', () => ({
  default: ({ value, onChange }: any) => (
    <div data-testid="logo-uploader">
      <input
        data-testid="logo-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  ),
}));

vi.mock('@/components/common/AddressAutocomplete', () => ({
  default: ({ value, onChange, placeholder }: any) => (
    <textarea
      data-testid="address-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

vi.mock('@/components/common/PhoneInput', () => ({
  default: ({ value, onChange, placeholder }: any) => (
    <input
      data-testid="phone-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

describe('ClientFormModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSaved = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (clientService.isShortCodeTaken as any).mockResolvedValue(null);
    (invoiceService.checkShortCodeUsage as any).mockResolvedValue(false);
  });

  it('renders correctly for new client', () => {
    render(
      <ClientFormModal onClose={mockOnClose} onSaved={mockOnSaved} />
    );
    expect(screen.getByText('New Client')).toBeDefined();
    expect(screen.getByPlaceholderText('John Smith')).toBeDefined();
  });

  it('shows error if name is empty', async () => {
    render(
      <ClientFormModal onClose={mockOnClose} onSaved={mockOnSaved} />
    );

    const submitButton = screen.getByText('Add Client');
    fireEvent.click(submitButton);

    expect(await screen.findByText('Client name is required')).toBeDefined();
    expect(clientService.create).not.toHaveBeenCalled();
  });

  it('successfully creates a client with minimal info', async () => {
    const mockCreatedClient = { id: 1, name: 'Minimal Client' };
    (clientService.create as any).mockResolvedValue(mockCreatedClient);

    render(
      <ClientFormModal onClose={mockOnClose} onSaved={mockOnSaved} />
    );

    fireEvent.change(screen.getByPlaceholderText('John Smith'), {
      target: { value: 'Minimal Client' },
    });

    fireEvent.click(screen.getByText('Add Client'));

    await waitFor(() => {
      expect(clientService.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Minimal Client',
      }));
      expect(mockOnSaved).toHaveBeenCalledWith(mockCreatedClient);
    });
  });

  it('handles "failed to save but it had saved" scenario simulation', async () => {
    // This scenario happens if the service throws an error but the record was actually created in DB.
    // In our UI, this would show "Failed to save client" but the user might see it later.
    // We want to see if there's any obvious place where we can improve this.

    (clientService.create as any).mockRejectedValue(new Error('Network Error'));

    render(
      <ClientFormModal onClose={mockOnClose} onSaved={mockOnSaved} />
    );

    fireEvent.change(screen.getByPlaceholderText('John Smith'), {
      target: { value: 'Buggy Client' },
    });

    fireEvent.click(screen.getByText('Add Client'));

    expect(await screen.findByText('Failed to save client. Please try again.')).toBeDefined();
    expect(mockOnSaved).not.toHaveBeenCalled();

    // Now fix the mock and try again
    (clientService.create as any).mockResolvedValue({ id: 5, name: 'Buggy Client' });
    fireEvent.click(screen.getByText('Add Client'));

    await waitFor(() => {
      expect(screen.queryByText('Failed to save client. Please try again.')).toBeNull();
      expect(mockOnSaved).toHaveBeenCalled();
    });
  });

  it('checks for short code availability', async () => {
    (clientService.isShortCodeTaken as any).mockResolvedValue({ name: 'Existing Client' });

    render(
      <ClientFormModal onClose={mockOnClose} onSaved={mockOnSaved} />
    );

    fireEvent.change(screen.getByPlaceholderText('John Smith'), {
      target: { value: 'New Client' },
    });

    // SuggestCode should have filled it, let's trigger blur or just click submit
    fireEvent.click(screen.getByText('Add Client'));

    expect(await screen.findByText(/is already used by client "Existing Client"/)).toBeDefined();
    expect(clientService.create).not.toHaveBeenCalled();
  });

  it('handles partial information correctly', async () => {
    const mockCreatedClient = { id: 2, name: 'Partial Client', email: 'test@example.com' };
    (clientService.create as any).mockResolvedValue(mockCreatedClient);

    render(
      <ClientFormModal onClose={mockOnClose} onSaved={mockOnSaved} />
    );

    fireEvent.change(screen.getByPlaceholderText('John Smith'), {
      target: { value: 'Partial Client' },
    });

    fireEvent.change(screen.getByPlaceholderText('jane@acme.com'), {
      target: { value: 'test@example.com' },
    });

    fireEvent.click(screen.getByText('Add Client'));

    await waitFor(() => {
      expect(clientService.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Partial Client',
        email: 'test@example.com',
        company: null,
        phone: null,
        address: null,
      }));
    });
  });

  it('handles "default_hourly_rate" as a number or null', async () => {
    (clientService.create as any).mockResolvedValue({ id: 3, name: 'Rate Client' });

    const { rerender } = render(
      <ClientFormModal onClose={mockOnClose} onSaved={mockOnSaved} />
    );

    fireEvent.change(screen.getByPlaceholderText('John Smith'), {
      target: { value: 'Rate Client' },
    });

    // Test empty hourly rate (should be null)
    fireEvent.click(screen.getByText('Add Client'));
    await waitFor(() => {
      expect(clientService.create).toHaveBeenCalledWith(expect.objectContaining({
        default_hourly_rate: null,
      }));
    });

    // Test with rate
    (clientService.create as any).mockClear();
    rerender(<ClientFormModal onClose={mockOnClose} onSaved={mockOnSaved} />);

    fireEvent.change(screen.getByPlaceholderText('John Smith'), {
      target: { value: 'Rate Client 2' },
    });
    fireEvent.change(screen.getByPlaceholderText('0.00'), {
      target: { value: '75.50' },
    });

    fireEvent.click(screen.getByText('Add Client'));
    await waitFor(() => {
      expect(clientService.create).toHaveBeenCalledWith(expect.objectContaining({
        default_hourly_rate: 75.50,
      }));
    });
  });

  it('toggles tax and handles tax rate', async () => {
    (clientService.create as any).mockResolvedValue({ id: 4, name: 'Tax Client' });

    render(
      <ClientFormModal onClose={mockOnClose} onSaved={mockOnSaved} />
    );

    fireEvent.change(screen.getByPlaceholderText('John Smith'), {
      target: { value: 'Tax Client' },
    });

    // Tax is disabled by default
    const taxToggle = screen.getByText('Tax on Invoices').closest('div')?.nextElementSibling;
    expect(taxToggle).toBeDefined();

    // Enable tax
    fireEvent.click(taxToggle!);

    // Should show tax rate input
    const taxRateInput = screen.getByDisplayValue('0');
    fireEvent.change(taxRateInput, { target: { value: '10.5' } });

    fireEvent.click(screen.getByText('Add Client'));

    await waitFor(() => {
      expect(clientService.create).toHaveBeenCalledWith(expect.objectContaining({
        tax_enabled: true,
        default_tax_rate: 10.5,
      }));
    });
  });
});
