import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function SellerLayout() {
  const { user } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-[var(--night)] text-[var(--text)] flex">
      {/* ── SIDEBAR ── */}
      <aside className="w-[280px] border-r border-[var(--border)] flex flex-col fixed inset-y-0 bg-[#0a0d14]">
        {/* Brand Block */}
        <div className="p-6">
          <Link to="/seller/dashboard" className="block group">
            <div className="relative p-4 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 overflow-hidden transition-all hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="size-10 rounded-xl bg-[var(--accent)] flex items-center justify-center text-black shadow-lg shadow-[var(--accent)]/20">
                  <span className="material-symbols-outlined font-black">real_estate_agent</span>
                </div>
                <div className="font-heading font-black text-white leading-tight">
                  <div className="text-lg">Home Sales</div>
                  <div className="text-sm">Ready</div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Seller View</span>
                <span className="px-2 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] text-[9px] font-black uppercase tracking-wider">Active Pack</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-6 overflow-y-auto pb-8">
          {/* Main Pack Nav */}
          <div>
            <div className="text-[10px] font-bold tracking-[0.15em] text-[var(--muted)] uppercase px-3 mb-3">Property Pack</div>
            <div className="space-y-1">
              {[
                { to: '/seller/dashboard', icon: 'dashboard', label: 'My Property Pack' },
                { to: '/seller/documents', icon: 'folder_shared', label: 'Documents' },
                { to: '/seller/onboarding', icon: 'info', label: 'Material Information' },
                { to: '/seller/dashboard', icon: 'share', label: 'Share Pack' },
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    isActive(item.to)
                      ? 'bg-[var(--accent)]/10 text-[var(--accent)] font-bold shadow-sm'
                      : 'text-[var(--muted)] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[20px] ${isActive(item.to) ? 'text-[var(--accent)]' : ''}`}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Account Nav */}
          <div>
            <div className="text-[10px] font-bold tracking-[0.15em] text-[var(--muted)] uppercase px-3 mb-3">Account</div>
            <div className="space-y-1">
              {[
      { path: '/seller/dashboard', icon: 'visibility', label: "Who's Viewed" },
      { path: '/seller/dashboard', icon: 'chat_bubble', label: 'Messages' },
      { path: '/seller/profile', icon: 'settings', label: 'Settings' },
    ].map((item) => (
      <Link
        key={item.label}
        to={item.path}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
          isActive(item.path)
            ? 'bg-[var(--accent)]/10 text-[var(--accent)] font-bold shadow-sm'
            : 'text-[var(--muted)] hover:bg-white/5 hover:text-white'
        }`}
      >
        <span className={`material-symbols-outlined text-[20px] ${isActive(item.path) ? 'text-[var(--accent)]' : ''}`}>
          {item.icon}
        </span>
        {item.label}
      </Link>
    ))}
  </div>
</div>
</nav>

{/* User Profile Footer */}
<div className="p-4 border-t border-[var(--border)] bg-[#0a0d14]">
<div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5">
  <div className="size-9 rounded-lg bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)]">
    <span className="material-symbols-outlined text-xl">person</span>
  </div>
  <div className="flex-1 min-w-0">
    <p className="text-xs font-bold text-white truncate">{user?.user_metadata?.full_name || 'My Account'}</p>
    <p className="text-[10px] text-[var(--muted)] font-medium">Seller Account</p>
  </div>
  <button onClick={() => supabase.auth.signOut()} className="text-[var(--muted)] hover:text-white">
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
