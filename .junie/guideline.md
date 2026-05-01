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

## 🌍 Contributions & Environment
- **Env Vars**: `VITE_PUBLIC_SUPABASE_URL` and `VITE_PUBLIC_SUPABASE_ANON_KEY` are mandatory.
- **Commits**: Follow conventional commits (e.g., `feat:`, `fix:`, `refactor:`).
- **Validation**: Run `npm run type-check` to catch hidden TS errors before submitting.
