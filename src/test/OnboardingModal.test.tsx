import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import OnboardingModal from '../pages/dashboard/components/OnboardingModal';
import { MemoryRouter } from 'react-router-dom';
import { clientService, lineItemService, settingsService, invoiceService } from '@/services';

vi.mock('@/services', () => ({
  clientService: {
    getClients: vi.fn(),
    create: vi.fn(),
  },
  lineItemService: {
    getAll: vi.fn(),
    create: vi.fn(),
    getLineItemsByInvoice: vi.fn(),
  },
  invoiceService: {
    getDraftInvoiceForClient: vi.fn(),
    getNextInvoiceNumber: vi.fn(),
    create: vi.fn(),
    getById: vi.fn(),
    updateTotals: vi.fn(),
    update: vi.fn(),
  },
  settingsService: {
    dismissOnboarding: vi.fn(),
    update: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

describe('OnboardingModal', () => {
  const mockSettings = {
    id: 1,
    user_id: 'user-1',
    business_name: 'Test Business',
    onboarding_dismissed: false,
    annual_revenue_goal: 0,
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when onboarding is already dismissed', async () => {
    const dismissedSettings = { ...mockSettings, onboarding_dismissed: true };
    render(
      <MemoryRouter>
        <OnboardingModal
          settings={dismissedSettings}
          onDismiss={vi.fn()}
          onRefreshSettings={vi.fn()}
        />
      </MemoryRouter>
    );

    // Should not find the welcome text
    expect(screen.queryByText(/Welcome to GiriLog!/i)).toBeNull();
  });

  it('renders progress correctly based on data', async () => {
    (clientService.getClients as any).mockResolvedValue([{ id: 1 }]); // 1 client
    (lineItemService.getAll as any).mockResolvedValue([]); // No time
    const settingsWithGoal = { ...mockSettings, annual_revenue_goal: 10000 };

    render(
      <MemoryRouter>
        <OnboardingModal
          settings={settingsWithGoal}
          onDismiss={vi.fn()}
          onRefreshSettings={vi.fn()}
        />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Welcome to GiriLog!/i)).toBeDefined();
    });

    // Check steps: Client (completed), Time (not), Goal (completed)
    // 2 out of 3
    expect(screen.getByText('2/3 steps')).toBeDefined();
  });

  it('opens simplified client form and creates a client', async () => {
    (clientService.getClients as any).mockResolvedValue([]);
    (lineItemService.getAll as any).mockResolvedValue([]);
    (clientService.create as any).mockResolvedValue({ id: 10, name: 'New Client' });

    render(
      <MemoryRouter>
        <OnboardingModal
          settings={mockSettings}
          onDismiss={vi.fn()}
          onRefreshSettings={vi.fn()}
        />
      </MemoryRouter>
    );

    await waitFor(() => {
      const step = screen.getByText('Create a client');
      fireEvent.click(step);
    });

    // Should see the form now
    expect(screen.getByText('Add your first client')).toBeDefined();

    const nameInput = screen.getByPlaceholderText(/e.g. Acme Corp/i);
    const companyInput = screen.getByPlaceholderText(/e.g. Acme Industries Inc./i);
    const submitBtn = screen.getByText('Create Client');

    fireEvent.change(nameInput, { target: { value: 'New Client' } });
    fireEvent.change(companyInput, { target: { value: 'New Company' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(clientService.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New Client',
        company: 'New Company',
        default_hourly_rate: 50
      }));
    });

    // Should return to task list
    await waitFor(() => {
      expect(screen.getByText(/Welcome to GiriLog!/i)).toBeDefined();
    });
  });

  it('calls dismissOnboarding when clicking close or skip', async () => {
    (clientService.getClients as any).mockResolvedValue([]);
    (lineItemService.getAll as any).mockResolvedValue([]);
    const onDismiss = vi.fn();
    const onRefresh = vi.fn();

    render(
      <MemoryRouter>
        <OnboardingModal
          settings={mockSettings}
          onDismiss={onDismiss}
          onRefreshSettings={onRefresh}
        />
      </MemoryRouter>
    );

    await waitFor(() => {
      const skipBtn = screen.getByText(/Skip for now/i);
      fireEvent.click(skipBtn);
    });

    expect(settingsService.dismissOnboarding).toHaveBeenCalled();
    await waitFor(() => {
      expect(onDismiss).toHaveBeenCalled();
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it('disables subsequent steps until the current step is completed', async () => {
    (clientService.getClients as any).mockResolvedValue([]); // No clients (Step 1 incomplete)
    (lineItemService.getAll as any).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <OnboardingModal
          settings={mockSettings}
          onDismiss={vi.fn()}
          onRefreshSettings={vi.fn()}
        />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Create a client')).toBeDefined();
    });

    // Step 1 should be enabled
    const step1 = screen.getByText('Create a client').closest('.cursor-pointer');
    expect(step1).not.toBeNull();

    // Step 2 should be disabled (contains lock icon and has cursor-not-allowed)
    const step2 = screen.getByText('Add tracked time').closest('.cursor-not-allowed');
    expect(step2).not.toBeNull();
    expect(step2?.querySelector('.ri-lock-line')).not.toBeNull();

    // Step 3 should also be disabled
    const step3 = screen.getByText('Add a yearly goal').closest('.cursor-not-allowed');
    expect(step3).not.toBeNull();
    expect(step3?.querySelector('.ri-lock-line')).not.toBeNull();

    // Clicking Step 2 should not trigger any action
    fireEvent.click(step2!);
    expect(mockNavigate).not.toHaveBeenCalled();
    // Use queryByText with a selector or more specific check since "Add tracked time" is also in the task list
    expect(screen.queryByText('Log your first hours of work.')).toBeNull();
  });

  it('opens simplified log time form and creates a line item', async () => {
    // Step 1 completed, Step 2 incomplete
    const mockClient = { id: 1, name: 'Test Client', default_hourly_rate: 50, short_code: 'TC' };
    (clientService.getClients as any).mockResolvedValue([mockClient]);
    (lineItemService.getAll as any).mockResolvedValue([]);
    (invoiceService.getDraftInvoiceForClient as any).mockResolvedValue(null);
    (invoiceService.getNextInvoiceNumber as any).mockResolvedValue('INV-TC-0001');
    (invoiceService.create as any).mockResolvedValue({ id: 200 });
    (lineItemService.create as any).mockResolvedValue({ id: 100 });
    (lineItemService.getLineItemsByInvoice as any).mockResolvedValue([{ amount: 125 }]);
    (invoiceService.getById as any).mockResolvedValue({ id: 200, tax_rate: 0, discount_rate: 0 });
    (invoiceService.updateTotals as any).mockResolvedValue({});

    render(
      <MemoryRouter>
        <OnboardingModal
          settings={mockSettings}
          onDismiss={vi.fn()}
          onRefreshSettings={vi.fn()}
        />
      </MemoryRouter>
    );

    await waitFor(() => {
      const step = screen.getByText('Add tracked time');
      fireEvent.click(step);
    });

    // Should see the form now
    expect(screen.getByText('Add tracked time')).toBeDefined();
    expect(screen.getByText('Log your first hours of work.')).toBeDefined();

    const descInput = screen.getByPlaceholderText(/e.g. Initial consultation and setup/i);
    const hoursInput = screen.getByDisplayValue('1');
    const submitBtn = screen.getByText('Log Time');

    fireEvent.change(descInput, { target: { value: 'Work description' } });
    fireEvent.change(hoursInput, { target: { value: '2.5' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(lineItemService.create).toHaveBeenCalledWith(expect.objectContaining({
        description: 'Work description',
        quantity: 2.5,
        unit_price: 50,
        amount: 125
      }));
      expect(invoiceService.update).toHaveBeenCalledWith(200, { status: 'pending' });
    });

    // Should return to task list
    await waitFor(() => {
      expect(screen.getByText(/Welcome to GiriLog!/i)).toBeDefined();
    });
  });

  it('opens simplified goal form and updates annual goal', async () => {
    // Step 1 and 2 completed
    (clientService.getClients as any).mockResolvedValue([{ id: 1 }]);
    (lineItemService.getAll as any).mockResolvedValue([{ id: 1 }]);
    (settingsService.update as any).mockResolvedValue({ success: true });

    render(
      <MemoryRouter>
        <OnboardingModal
          settings={mockSettings}
          onDismiss={vi.fn()}
          onRefreshSettings={vi.fn()}
        />
      </MemoryRouter>
    );

    await waitFor(() => {
      const step = screen.getByText('Add a yearly goal');
      fireEvent.click(step);
    });

    // Should see the form now
    expect(screen.getByText('Set your revenue goal')).toBeDefined();

    const goalInput = screen.getByDisplayValue('10000');
    const saveBtn = screen.getByText('Save Goal');

    fireEvent.change(goalInput, { target: { value: '50000' } });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(settingsService.update).toHaveBeenCalledWith(mockSettings.id, {
        annual_revenue_goal: 50000
      });
    });

    // Should see the celebration screen instead of task list
    await waitFor(() => {
      expect(screen.getByText(/Tada!/i)).toBeDefined();
    });
  });

  it('shows celebration screen, countdown, and auto-closes after setting the final goal', async () => {
    // Step 1 and 2 completed
    (clientService.getClients as any).mockResolvedValue([{ id: 1 }]);
    (lineItemService.getAll as any).mockResolvedValue([{ id: 1 }]);
    (settingsService.update as any).mockResolvedValue({ success: true });
    (settingsService.dismissOnboarding as any).mockResolvedValue({ success: true });
    
    const onDismiss = vi.fn();

    render(
      <MemoryRouter>
        <OnboardingModal
          settings={mockSettings}
          onDismiss={onDismiss}
          onRefreshSettings={vi.fn()}
        />
      </MemoryRouter>
    );

    await waitFor(() => {
      const step = screen.getByText('Add a yearly goal');
      fireEvent.click(step);
    });

    const goalInput = screen.getByDisplayValue('10000');
    const saveBtn = screen.getByText('Save Goal');

    fireEvent.change(goalInput, { target: { value: '50000' } });
    fireEvent.click(saveBtn);

    // Should see the celebration screen
    await waitFor(() => {
      expect(screen.getByText(/Tada!/i)).toBeDefined();
    });

    expect(screen.getByText(/Redirecting in 5.../i)).toBeDefined();
  });
});
