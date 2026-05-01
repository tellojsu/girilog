# GiriLog Development Guidelines for Junie

Welcome to **GiriLog**, an open-source invoice management tool. These guidelines are optimized for Junie (AI) to ensure consistency, speed, and reliability.

## 🛠 Tech Stack & Essential Rules
- **Framework**: React 19 (Vite)
- **⚡ AUTO-IMPORTS**: DO NOT manually import React hooks (`useState`, `useEffect`, `useMemo`, etc.), React Router hooks (`useNavigate`, `useLocation`, etc.), or `useTranslation`. They are globally available via `unplugin-auto-import`.
- **Styling**: Tailwind CSS. Always use the "Dark Terminal" aesthetic:
  - Backgrounds: `bg-[#0D0F14]` (deep), `bg-[#0A0C10]` (panels).
  - Borders: `border-[#1E2330]`, `border-[#2A3040]`.
  - Accents: Emerald (`#10B981`) for success/primary, Amber (`#F59E0B`) for warnings.
- **Icons**: Use **Remix Icon** (e.g., `<i className="ri-save-line" />`) instead of Lucide React where possible to match existing UI.
- **Backend**: Supabase. Client is at `@/lib/supabase`.
- **Types**: Always check `@/types/girilog` before defining new interfaces.

## 📂 Project Structure
- `src/components/base`: Atomic UI (Badges, Buttons).
- `src/components/feature`: Complex UI (AuthGuard, Layouts).
- `src/pages/[feature]`: Page components. Complex pages often have a `components/` sub-folder.
- `src/hooks`: Custom shared logic (e.g., `usePDFDownload`).

## 💻 AI Implementation Guidelines
- **Data Fetching**: Use `supabase` client directly in `useEffect` or event handlers.
- **Error Handling**: Use `try/catch` for Supabase operations. Show user-friendly messages via local state (e.g., `setSaveMsg`).
- **Form State**: For complex forms, use a single `form` state object instead of multiple `useState` calls.
- **Dirty Checking**: Implement "unsaved changes" warnings for editor pages using `isDirty` state and `beforeunload` listeners.
- **Performance**: Use `useCallback` for functions passed to complex components.

## 🧪 Testing Guidelines
- **Mandatory**: Tests MUST be written or updated for every fix and feature. Do not submit code without verifying it with tests.
- **Framework**: Vitest + React Testing Library.
- **Mocking Patterns**:
  - **Supabase**: Use the "Thenable Builder" pattern to mock chained calls.
    ```typescript
    const qb = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: [], error: null })),
    };
    vi.mock('@/lib/supabase', () => ({
      supabase: { from: vi.fn(() => qb), auth: { getUser: vi.fn() } }
    }));
    ```
  - **React Router**: Use `MemoryRouter` for page-level tests. Mock `useNavigate` if redirection logic needs verification.
- **Scope**: Focus on page-level data flow and user interactions. Mock complex child components (like Charts) to keep tests fast and focused.

## 🌍 Contributions & Environment
- **Env Vars**: `VITE_PUBLIC_SUPABASE_URL` and `VITE_PUBLIC_SUPABASE_ANON_KEY` are mandatory.
- **Commits**: Follow conventional commits (e.g., `feat:`, `fix:`, `refactor:`).
- **Validation**: Run `npm run type-check` AND `npm run test` before submitting.
