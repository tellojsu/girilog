import { ReactNode } from 'react';
import Sidebar from './Sidebar';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function AppLayout({ children, title, subtitle, actions }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0D0F14] text-white flex">
      <Sidebar />
      <main className="flex-1 ml-60 min-h-screen flex flex-col">
        {(title || actions) && (
          <header className="px-8 py-6 border-b border-[#1E2330] flex items-center justify-between">
            <div>
              {title && (
                <h1 className="text-xl font-semibold text-white tracking-tight">{title}</h1>
              )}
              {subtitle && (
                <p className="text-sm text-[#6B7280] mt-0.5 font-mono">{subtitle}</p>
              )}
            </div>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
          </header>
        )}
        <div className="flex-1 px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
