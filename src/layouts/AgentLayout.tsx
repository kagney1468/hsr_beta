import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function AgentLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [agency, setAgency] = useState<any>(null);

  useEffect(() => {
    async function loadAgency() {
      if (!user) return;
      const { data } = await supabase
        .from('agencies')
        .select('*')
        .eq('agent_user_id', user.id)
        .maybeSingle();
      if (data) setAgency(data);
    }
    loadAgency();
  }, [user]);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const navItems = [
    { label: 'All Properties', icon: 'home_work', path: '/agent/dashboard' },
    { label: 'Action Required', icon: 'warning', path: '/agent/action-required' },
    { label: 'Packs Complete', icon: 'check_circle', path: '/agent/packs-complete' },
    { label: 'Clients', icon: 'group', path: '/agent/clients' },
    { label: 'Reports', icon: 'bar_chart', path: '/agent/reports' },
    { label: 'Branding', icon: 'palette', path: '/agent/branding' },
    { label: 'Settings', icon: 'settings', path: '/agent/settings' },
  ];

  return (
    <div className="bg-[var(--page)] font-display text-[var(--text)] min-h-screen flex flex-col md:flex-row overflow-hidden">
      {/* ── SIDEBAR ── */}
      <aside className="w-full md:w-[260px] md:min-w-[260px] md:min-h-screen bg-white border-b md:border-b-0 md:border-r border-[var(--border)] flex flex-col p-4 overflow-y-auto md:sticky md:top-0 md:h-screen z-30">
        {/* Agency Brand Block */}
        <div className="bg-white border border-[var(--border)] rounded-2xl p-4 mb-6 text-center flex-shrink-0 flex flex-col items-center shadow-soft">
          {agency?.logo_url ? (
            <img src={agency.logo_url} alt={agency.agency_name} className="h-10 w-auto mb-2 mb-2 object-contain" />
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
        <div className="mt-8 pt-4 border-t border-[var(--border)] flex items-center gap-3 px-2">
           <div className="size-8 rounded-full bg-[var(--teal-050)] border border-[var(--border)] flex items-center justify-center text-[10px] font-semibold text-[var(--teal-900)]">
             {user?.email?.[0].toUpperCase()}
           </div>
           <div className="flex-1 truncate">
             <div className="text-[11px] font-semibold text-[var(--teal-900)] truncate">{user?.email}</div>
             <div className="text-[9px] text-[var(--muted)] uppercase font-semibold">Agent Account</div>
           </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
