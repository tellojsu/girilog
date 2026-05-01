import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AuthGuard from '../components/feature/AuthGuard';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock supabase
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: any[]) => mockGetSession(...args),
      onAuthStateChange: (...args: any[]) => mockOnAuthStateChange(...args),
    },
  },
}));

// Mock db-setup
const mockCheckDatabaseHealth = vi.fn();
vi.mock('@/lib/db-setup', () => ({
  checkDatabaseHealth: (...args: any[]) => mockCheckDatabaseHealth(...args),
}));

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  });

  it('redirects to login if no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login?redirect=%2Fdashboard', { replace: true });
    });
  });

  it('redirects to db-setup if tables are missing', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: {} } }, error: null });
    mockCheckDatabaseHealth.mockResolvedValue({ ok: false, error: 'Tables are missing' });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockCheckDatabaseHealth).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/db-setup', { replace: true });
    });
  });

  it('renders children if authenticated and database is healthy', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: {} } }, error: null });
    mockCheckDatabaseHealth.mockResolvedValue({ ok: true });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeDefined();
    });
  });

  it('shows loading state while checking', () => {
    mockGetSession.mockReturnValue(new Promise(() => {})); // Never resolves

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      </MemoryRouter>
    );

    expect(screen.getByText('Loading...')).toBeDefined();
  });
});
