import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getPublicUserIdByAuthUserId } from '../lib/publicUser';
import Footer from '../components/Footer';

export default function AgentLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [agency, setAgency] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    async function loadAgency() {
      if (!user) return;
      try {
        const publicUserId = await getPublicUserIdByAuthUserId(user.id);
        const { data } = await supabase
          .from('agencies')
          .select('*')
          .eq('agent_user_id', publicUserId)
          .maybeSingle();
        if (data) setAgency(data);
      } catch {
        // silently fail — agency may not yet be set up
      }
    }
    loadAgency();
  }, [user]);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  async function handleLogout() {
    await signOut();
    navigate('/login', { replace: true });
  }

  const navItems = [
    { label: 'Pipeline',      icon: 'home_work',  path: '/agent/dashboard' },
    { label: 'Leads',         icon: 'group',      path: '/agent/dashboard#leads' },
    { label: 'Invite Seller', icon: 'person_add', path: '/agent/dashboard#invite' },
    { label: 'Branding',      icon: 'palette',    path: '/agent/branding' },
  ];

  const SidebarContents = () => (
    <>
      {/* Agency Brand Block */}
      <div className="bg-white border border-[var(--border)] rounded-2xl p-4 mb-6 text-center flex-shrink-0 flex flex-col items-center shadow-soft">
        {agency?.logo_url ? (
          <img src={agency.logo_url} alt={agency.agency_name} className="h-10 w-auto mb-2 object-contain" />
        ) : (
          <div className="size-10 rounded-xl bg-[var(--teal-600)] flex items-center justify-center text-white mb-2">
            <span className="material-symbols-outlined font-black">real_estate_agent</span>
          </div>
        )}
        <div className="font-heading font-black text-[0.95rem] text-[var(--teal-900)] leading-tight">{agency?.agency_name || 'HomeSalesReady'}</div>
        <div className="text-[10px] text-[var(--teal-600)] uppercase font-semibold tracking-widest mt-1">Estate Agent Portal</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.label}
            to={item.path}
            onClick={() => setDrawerOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group ${
              isActive(item.path)
                ? 'bg-[var(--teal-050)] text-[var(--teal-900)] font-semibold border-l-[3px] border-[var(--teal-500)]'
                : 'text-[var(--muted)] hover:bg-[var(--teal-050)] hover:text-[var(--teal-900)]'
            }`}
          >
            <span className={`material-symbols-outlined text-[1.1rem] ${isActive(item.path) ? 'text-[var(--teal-900)]' : 'text-[var(--muted)] group-hover:text-[var(--teal-900)]'}`}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User Footer */}
      <div className="mt-8 pt-4 border-t border-[var(--border)] space-y-2">
        <div className="flex items-center gap-3 px-2">
          <div className="size-8 rounded-full bg-[var(--teal-050)] border border-[var(--border)] flex items-center justify-center text-[10px] font-semibold text-[var(--teal-900)]">
            {user?.email?.[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0 truncate">
            <div className="text-[11px] font-semibold text-[var(--teal-900)] truncate">{user?.email}</div>
            <div className="text-[9px] text-[var(--muted)] uppercase font-semibold">Agent Account</div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-[var(--teal-900)] border border-[var(--border)] bg-[var(--page)] hover:bg-[var(--teal-050)] transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          Log out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[var(--page)] font-display text-[var(--text)]">

      {/* ── MOBILE HEADER ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-white border-b border-[var(--border)] flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {agency?.logo_url ? (
            <img src={agency.logo_url} alt={agency.agency_name} className="h-8 w-auto object-contain" />
          ) : (
            <div className="size-8 rounded-lg bg-[var(--teal-600)] flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[18px] font-black">real_estate_agent</span>
            </div>
          )}
          <span className="font-heading font-black text-[var(--teal-900)] text-base">
            {agency?.agency_name || 'HomeSalesReady'}
          </span>
        </div>
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
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-[260px] bg-white flex flex-col p-4 transform transition-transform duration-300 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close button */}
        <div className="flex justify-end mb-4">
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
      <aside className="hidden md:flex w-[260px] min-w-[260px] bg-white border-r border-[var(--border)] flex-col p-4 fixed inset-y-0 overflow-y-auto z-30">
        <SidebarContents />
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="md:ml-[260px] pt-14 md:pt-0 flex flex-col min-h-screen">
        <div className="flex-1">
          <Outlet />
        </div>
        <Footer />
      </div>

    </div>
  );
}
