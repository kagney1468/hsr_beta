import { Outlet, Link, useLocation } from 'react-router-dom';

export default function AgentLayout() {
  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="bg-[var(--night)] font-display text-[var(--text)] min-h-screen flex flex-col md:flex-row">
      {/* ── SIDEBAR ── */}
      <aside className="w-full md:w-[240px] md:min-w-[240px] md:min-h-screen bg-[var(--deep)] border-b md:border-b-0 md:border-r border-[var(--border)] flex flex-col p-4 overflow-y-auto md:sticky md:top-0 md:h-screen z-30">
        {/* Agency Brand Block */}
        <div className="bg-[var(--accent)]/5 border border-[var(--accent)]/15 rounded-xl p-3.5 mb-5 text-center flex-shrink-0">
          <div className="font-heading font-black text-[0.95rem] text-white mb-0.5">Home Sales Ready</div>
          <div className="text-[0.72rem] text-[var(--accent)]">Estate Agent Portal</div>
          <div className="inline-flex items-center gap-1 text-[0.68rem] bg-[var(--accent2)]/10 text-[#6fa3ff] border border-[var(--accent2)]/20 px-2 py-0.5 rounded mt-2 font-heading font-bold tracking-wide">
            ⬡ AGENT VIEW
          </div>
        </div>

        {/* Pipeline Nav */}
        <div className="text-[0.68rem] font-bold tracking-[0.1em] text-[var(--muted)] uppercase px-3 mb-2">Pipeline</div>
        <Link
          to="/agent/dashboard"
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm mb-0.5 transition-all ${
            isActive('/agent/dashboard')
              ? 'bg-[var(--accent)]/10 text-[var(--accent)] font-medium'
              : 'text-[var(--muted)] hover:bg-white/4 hover:text-[var(--text)]'
          }`}
        >
          <span className="material-symbols-outlined text-[1rem] w-5 text-center">home_work</span>
          All Properties
        </Link>
        <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm mb-0.5 text-[var(--muted)] hover:bg-white/4 hover:text-[var(--text)] transition-all cursor-pointer`}>
          <span className="material-symbols-outlined text-[1rem] w-5 text-center">warning</span>
          Action Required
        </div>
        <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm mb-0.5 text-[var(--muted)] hover:bg-white/4 hover:text-[var(--text)] transition-all cursor-pointer`}>
          <span className="material-symbols-outlined text-[1rem] w-5 text-center">check_circle</span>
          Packs Complete
        </div>

        {/* Manage Nav */}
        <div className="text-[0.68rem] font-bold tracking-[0.1em] text-[var(--muted)] uppercase px-3 mb-2 mt-5">Manage</div>
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm mb-0.5 text-[var(--muted)] hover:bg-white/4 hover:text-[var(--text)] transition-all cursor-pointer">
          <span className="material-symbols-outlined text-[1rem] w-5 text-center">group</span>
          Clients
        </div>
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm mb-0.5 text-[var(--muted)] hover:bg-white/4 hover:text-[var(--text)] transition-all cursor-pointer">
          <span className="material-symbols-outlined text-[1rem] w-5 text-center">bar_chart</span>
          Reports
        </div>
        <Link
          to="/agent/branding"
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm mb-0.5 transition-all ${
            isActive('/agent/branding')
              ? 'bg-[var(--accent)]/10 text-[var(--accent)] font-medium'
              : 'text-[var(--muted)] hover:bg-white/4 hover:text-[var(--text)]'
          }`}
        >
          <span className="material-symbols-outlined text-[1rem] w-5 text-center">palette</span>
          Branding
        </Link>
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm mb-0.5 text-[var(--muted)] hover:bg-white/4 hover:text-[var(--text)] transition-all cursor-pointer">
          <span className="material-symbols-outlined text-[1rem] w-5 text-center">settings</span>
          Settings
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
