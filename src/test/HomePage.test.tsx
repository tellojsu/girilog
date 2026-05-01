import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from '../pages/home/page';
import { MemoryRouter } from 'react-router-dom';

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    },
  },
}));

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByText('Invoicing that')).toBeDefined();
    expect(screen.getByText("doesn't suck.")).toBeDefined();
    expect(screen.getByText('Start invoicing free')).toBeDefined();
  });

  it('shows features section', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByText('Everything you need, nothing you don\'t')).toBeDefined();
    expect(screen.getByText('Smart Invoicing')).toBeDefined();
    expect(screen.getByText('Secure & Private')).toBeDefined();
  });
});
