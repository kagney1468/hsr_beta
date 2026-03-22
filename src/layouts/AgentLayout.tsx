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
    <div className="bg-[var(--night)] font-display text-[var(--text)] min-h-screen flex flex-col md:flex-row overflow-hidden">
      {/* ── SIDEBAR ── */}
      <aside className="w-full md:w-[240px] md:min-w-[240px] md:min-h-screen bg-[var(--deep)] border-b md:border-b-0 md:border-r border-[var(--border)] flex flex-col p-4 overflow-y-auto md:sticky md:top-0 md:h-screen z-30">
        {/* Agency Brand Block */}
        <div className="bg-[var(--accent)]/5 border border-[var(--accent)]/15 rounded-xl p-4 mb-6 text-center flex-shrink-0 flex flex-col items-center">
          {agency?.logo_url ? (
            <img src={agency.logo_url} alt={agency.agency_name} className="h-10 w-auto mb-2 mb-2 object-contain" />
          ) : (
            <div className="size-10 rounded-xl bg-[var(--accent)] flex items-center justify-center text-black mb-2">
              <span className="material-symbols-outlined font-black">real_estate_agent</span>
            </div>
          )}
          <div className="font-heading font-black text-[0.9rem] text-white leading-tight">{agency?.agency_name || 'Home Sales Ready'}</div>
          <div className="text-[10px] text-[var(--accent)] uppercase font-black tracking-widest mt-1">Estate Agent Portal</div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group ${
                isActive(item.path)
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)] font-bold'
                  : 'text-[var(--muted)] hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className={`material-symbols-outlined text-[1.1rem] ${isActive(item.path) ? 'text-[var(--accent)]' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User Footer */}
        <div className="mt-8 pt-4 border-t border-white/5 flex items-center gap-3 px-2">
           <div className="size-8 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">
             {user?.email?.[0].toUpperCase()}
           </div>
           <div className="flex-1 truncate">
             <div className="text-[11px] font-bold text-white truncate">{user?.email}</div>
             <div className="text-[9px] text-zinc-600 uppercase font-black">Agent Account</div>
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
