import { Outlet, Link, useLocation } from 'react-router-dom';

export default function SellerLayout() {
  const location = useLocation();
  
  const navItems = [
    { path: '/seller/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/seller/profile', label: 'Profile', icon: 'account_circle' },
    { path: '/seller/property', label: 'Property', icon: 'home_work' },
    { path: '/seller/documents', label: 'Documents', icon: 'folder_shared' },
    { path: '/seller/declaration', label: 'Declaration', icon: 'draw' },
    { path: '/seller/readiness', label: 'Readiness', icon: 'fact_check' },
    { path: '/seller/certificate', label: 'Certificate', icon: 'verified' },
    { path: '/seller/help', label: 'Help', icon: 'help' },
  ];

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3 lg:px-10">
        <Link to="/seller/dashboard" className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary">
            <span className="material-symbols-outlined">real_estate_agent</span>
          </div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">Home Sales Ready</h2>
        </Link>
        
        <nav className="hidden md:flex items-center gap-1 mx-4 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive 
                    ? 'bg-primary text-white shadow-md shadow-primary/20' 
                    : 'text-slate-500 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <button className="flex items-center justify-center rounded-xl size-10 bg-primary/5 text-slate-600 dark:text-slate-400 hover:bg-primary/10 transition-colors">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold leading-none">John Doe</p>
              <p className="text-xs text-slate-500 mt-1">Seller</p>
            </div>
            <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-primary/20 flex items-center justify-center overflow-hidden">
              <span className="material-symbols-outlined text-slate-400">person</span>
            </div>
          </div>
        </div>
      </header>
      
      {/* Mobile Navigation (Bottom) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-around p-2 pb-safe">
        {navItems.slice(0, 5).map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
                isActive ? 'text-primary' : 'text-slate-400'
              }`}
            >
              <span className="material-symbols-outlined text-2xl">{item.icon}</span>
              <span className="text-[10px] font-medium mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 pb-24 md:pb-8">
        <Outlet />
      </main>
    </div>
  );
}
