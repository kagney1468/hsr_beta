import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function SellerLayout() {
  const { user } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--text)] flex">
      {/* ── SIDEBAR ── */}
      <aside className="w-[280px] border-r border-[var(--border)] flex flex-col fixed inset-y-0 bg-white">
        {/* Brand Block */}
        <div className="p-6">
          <Link to="/seller/dashboard" className="block group">
            <div className="relative p-4 rounded-2xl border border-[var(--border)] bg-white overflow-hidden transition-colors hover:bg-[var(--teal-050)]">
              <div className="flex items-center gap-3 mb-2">
                <div className="size-10 rounded-xl bg-[var(--teal-600)] flex items-center justify-center text-white shadow-soft">
                  <span className="material-symbols-outlined font-black">real_estate_agent</span>
                </div>
                <div className="font-heading font-black text-[var(--teal-900)] leading-tight">
                  <div className="text-lg">Home Sales</div>
                  <div className="text-sm">Ready</div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Seller View</span>
                <span className="px-2 py-0.5 rounded-full bg-[var(--teal-050)] text-[var(--teal-900)] text-[9px] font-semibold uppercase tracking-wider border border-[var(--border)]">Active Pack</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-6 overflow-y-auto pb-8">
          {/* Pack steps */}
          <div>
            <div className="text-[10px] font-bold tracking-[0.15em] text-[var(--muted)] uppercase px-3 mb-3">Your Pack</div>
            <div className="space-y-1">
              {[
                { to: '/seller/dashboard',   icon: 'dashboard',     label: 'Overview' },
                { to: '/seller/property',    icon: 'home_work',     label: 'Property Details' },
                { to: '/seller/documents',   icon: 'folder_open',   label: 'Documents' },
                { to: '/seller/declaration', icon: 'verified',      label: 'Declaration' },
              ].map((item) => (
                <Link
                  key={item.to + item.label}
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    isActive(item.to)
                      ? 'bg-[var(--teal-050)] text-[var(--teal-900)] font-semibold border-l-[3px] border-[var(--teal-500)]'
                      : 'text-[var(--muted)] hover:bg-[var(--teal-050)] hover:text-[var(--teal-900)]'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[20px] ${isActive(item.to) ? 'text-[var(--teal-900)]' : ''}`}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Account */}
          <div>
            <div className="text-[10px] font-bold tracking-[0.15em] text-[var(--muted)] uppercase px-3 mb-3">Account</div>
            <div className="space-y-1">
              {[
                { to: '/seller/profile', icon: 'settings', label: 'Settings' },
                { to: '/seller/help',    icon: 'help',     label: 'Help' },
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    isActive(item.to)
                      ? 'bg-[var(--teal-050)] text-[var(--teal-900)] font-semibold border-l-[3px] border-[var(--teal-500)]'
                      : 'text-[var(--muted)] hover:bg-[var(--teal-050)] hover:text-[var(--teal-900)]'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[20px] ${isActive(item.to) ? 'text-[var(--teal-900)]' : ''}`}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>

{/* User Profile Footer */}
<div className="p-4 border-t border-[var(--border)] bg-white">
<div className="flex items-center gap-3 p-2 rounded-xl bg-[var(--page)] border border-[var(--border)]">
  <div className="size-9 rounded-lg bg-white border border-[var(--border)] flex items-center justify-center text-[var(--muted)]">
    <span className="material-symbols-outlined text-xl">person</span>
  </div>
  <div className="flex-1 min-w-0">
    <p className="text-xs font-semibold text-[var(--teal-900)] truncate">{user?.user_metadata?.full_name || 'My Account'}</p>
    <p className="text-[10px] text-[var(--muted)] font-medium">Seller Account</p>
  </div>
  <button onClick={() => supabase.auth.signOut()} className="text-[var(--muted)] hover:text-[var(--teal-900)]">
    <span className="material-symbols-outlined text-lg">logout</span>
  </button>
</div>
</div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 ml-[280px]">
        <div className="min-h-screen">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
