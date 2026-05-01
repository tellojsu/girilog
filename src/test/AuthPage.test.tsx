import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthPage from '../pages/auth/page';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock supabase
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockGetSession = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args),
      signUp: (...args: any[]) => mockSignUp(...args),
      resetPasswordForEmail: (...args: any[]) => mockResetPasswordForEmail(...args),
      getSession: (...args: any[]) => mockGetSession(...args),
    },
  },
}));

describe('AuthPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  it('renders login mode by default', async () => {
    render(
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Welcome back')).toBeDefined();
    expect(screen.getByPlaceholderText('you@example.com')).toBeDefined();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDefined();
  });

  it('switches to signup mode', async () => {
    render(
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Sign up'));
    expect(screen.getAllByText('Create account')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /create account/i })).toBeDefined();
  });

  it('handles login submission', async () => {
    mockSignInWithPassword.mockResolvedValue({ data: {}, error: null });

    render(
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('handles signup submission', async () => {
    mockSignUp.mockResolvedValue({ data: {}, error: null });

    render(
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Sign up'));
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
      });
      expect(screen.getByText('Account created! Check your email to confirm.')).toBeDefined();
    });
  });

  it('handles forgot password submission', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

    render(
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Forgot password?'));
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'reset@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith('reset@example.com', expect.any(Object));
      expect(screen.getByText('Check your email for a reset link.')).toBeDefined();
    });
  });
});
