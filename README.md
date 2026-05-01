# GiriLog Development Guidelines

Welcome to **GiriLog**, an open-source invoice management tool. To maintain code quality and consistency across contributions, please follow these guidelines.

## 🛠 Tech Stack
- **Framework**: [React 19](https://react.dev/) (with Vite)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Backend/Auth**: [Supabase](https://supabase.com/)
- **Routing**: [React Router v7](https://reactrouter.com/)
- **Internationalization**: [i18next](https://www.i18next.com/)

## 📂 Project Structure
- `src/components/base`: Reusable, atomic UI components (e.g., `StatusBadge`).
- `src/components/feature`: Layout and high-level feature components (e.g., `AppLayout`).
- `src/pages`: Page-level components organized by route.
- `src/lib`: Shared utilities and service clients (e.g., `supabase.ts`).
- `src/router`: Route definitions.

## 💻 Coding Standards
### 1. TypeScript
- Use functional components with arrow functions.
- Define interfaces for props and data models.
- Prefer `type` for simple aliases and `interface` for object shapes.

### 2. Styling (Tailwind CSS)
- Follow the project's "Dark Terminal" aesthetic:
    - Primary colors: Emerald (`emerald-500`, `emerald-600`).
    - Backgrounds: `zinc-900`, `zinc-950`.
    - Borders/Accents: `zinc-800`.
- Use responsive utility classes where necessary.

### 3. State Management
- Use React hooks (`useState`, `useMemo`, `useCallback`) for local state.
- Leverage Supabase for persistent data.

### 4. Internationalization
- Use `useTranslation` hook from `react-i18next`.
- Add new strings to the appropriate localization files (if applicable).

## 🌍 Open Source Contributions
### Environment Variables
- Never commit `.env` or `.env.local` files.
- If you add new environment variables, update `.env.example`.
- Ensure `src/lib/supabase.ts` (or relevant config) validates required variables at runtime.

### Commits & PRs
- Use descriptive commit messages (e.g., `feat: add client history table`).
- Keep PRs focused on a single feature or bug fix.
- Ensure `npm run lint` and `npm run type-check` pass before submitting.

## 🚀 Getting Started
1. Copy `.env.example` to `.env.local`.
2. Fill in your Supabase credentials.
3. Run `npm install` and `npm run dev`.
