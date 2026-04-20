import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Footer from '../components/Footer';

export default function BuyerLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  async function handleLogout() {
    await signOut();
    navigate('/login', { replace: true });
  }

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { to: '/buyer/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { to: '/buyer/profile',   icon: 'person',    label: 'My Profile' },
    { to: '/seller/help',     icon: 'help',      label: 'Help' },
  ];

  const SidebarContents = () => (
    <>
      {/* Brand Block */}
      <div className="p-6">
        <Link to="/buyer/dashboard" className="block group" onClick={() => setDrawerOpen(false)}>
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
              <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Buyer View</span>
              <span className="px-2 py-0.5 rounded-full bg-[var(--teal-050)] text-[var(--teal-900)] text-[9px] font-semibold uppercase tracking-wider border border-[var(--border)]">My Packs</span>
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-6 overflow-y-auto pb-8">
        <div>
          <div className="text-[10px] font-bold tracking-[0.15em] text-[var(--muted)] uppercase px-3 mb-3">Navigation</div>
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.to + item.label}
                to={item.to}
                onClick={() => setDrawerOpen(false)}
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
      <div className="p-4 border-t border-[var(--border)] bg-white space-y-2">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-[var(--page)] border border-[var(--border)]">
          <div className="size-9 rounded-lg bg-white border border-[var(--border)] flex items-center justify-center text-[var(--muted)]">
            <span className="material-symbols-outlined text-xl">person</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[var(--teal-900)] truncate">
              {user?.user_metadata?.full_name || user?.email || 'My Account'}
            </p>
            <p className="text-[10px] text-[var(--muted)] font-medium">Buyer Account</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-[var(--teal-900)] border border-[var(--border)] bg-white hover:bg-[var(--teal-050)] transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          Log out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--text)]">

      {/* ── MOBILE HEADER ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-white border-b border-[var(--border)] flex items-center justify-between px-4">
        <Link to="/buyer/dashboard" className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-[var(--teal-600)] flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-[18px] font-black">real_estate_agent</span>
          </div>
          <span className="font-heading font-black text-[var(--teal-900)] text-base">HomeSalesReady</span>
        </Link>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="size-10 flex items-center justify-center rounded-lg border border-[var(--border)] text-[var(--teal-900)]"
          aria-label="Open menu"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
      </header>

      {/* ── MOBILE DRAWER OVERLAY ── */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/40"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── MOBILE DRAWER ── */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-[280px] bg-white flex flex-col transform transition-transform duration-300 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex justify-end p-3 border-b border-[var(--border)]">
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="size-9 flex items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)]"
            aria-label="Close menu"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <SidebarContents />
      </aside>

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden md:flex w-[280px] border-r border-[var(--border)] flex-col fixed inset-y-0 bg-white">
        <SidebarContents />
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="md:ml-[280px] pt-14 md:pt-0">
        <div className="min-h-screen flex flex-col">
          <div className="flex-1">
            <Outlet />
          </div>
          <Footer />
        </div>
      </main>

    </div>
  );
}
