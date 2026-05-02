import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: 'ri-dashboard-line' },
  { path: '/invoices', label: 'Invoices', icon: 'ri-file-list-3-line' },
  { path: '/clients', label: 'Clients', icon: 'ri-group-line' },
  { path: '/settings', label: 'Settings', icon: 'ri-settings-3-line' },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    if (path === '/invoices') return location.pathname === '/invoices' || (location.pathname.startsWith('/invoices/') && location.pathname !== '/invoices/new');
    return location.pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-[#0A0C10] border-r border-[#1E2330] flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[#1E2330]">
        <img
          src="https://static.readdy.ai/image/9e0ec1f08df5eac0f8e6ee60a23adb36/f0b2bffe117229733d1297ec943beb71.png"
          alt="GiriLog"
          className="w-8 h-8 object-contain"
        />
        <span className="text-white font-bold text-lg tracking-tight font-mono">GiriLog</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-[#8B9AB0] hover:text-white hover:bg-[#1E2330]'
              }`}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <i className={`${item.icon} text-base`} />
              </div>
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-[#1E2330] space-y-1">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#8B9AB0] hover:text-[#EF4444] hover:bg-[#EF4444]/5 transition-all duration-150 cursor-pointer whitespace-nowrap"
        >
          <div className="w-5 h-5 flex items-center justify-center">
            <i className="ri-logout-box-r-line text-base" />
          </div>
          Sign out
        </button>
        <div className="flex items-center gap-2 px-3 py-1">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-xs text-secondary font-mono">v0.9.0 · connected</span>
        </div>
      </div>
    </aside>
  );
}
