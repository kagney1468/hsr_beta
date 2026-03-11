import { Link } from 'react-router-dom';

export default function FinalDeclaration() {
  return (
    <div className="flex flex-col max-w-[640px] w-full mx-auto">
      <div className="mb-8">
        <h1 className="text-slate-900 dark:text-slate-100 text-3xl font-bold leading-tight mb-2 text-center">Final Declaration</h1>
        <p className="text-slate-500 dark:text-slate-400 text-base text-center">Please review and electronically sign the following statements to finalize your property listing.</p>
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xl mb-12">
        <div className="p-6 md:p-8">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
              <span className="material-symbols-outlined text-primary text-3xl">gavel</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Legal Agreement</h2>
            <p className="text-slate-500 text-sm max-w-sm mx-auto mt-2">Your electronic signature below confirms you have read and agreed to the following terms.</p>
          </div>
          <div className="space-y-4">
            <label className="flex items-start gap-4 p-5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 cursor-pointer hover:border-primary/30 hover:bg-white dark:hover:bg-slate-800 transition-all group">
              <div className="pt-0.5">
                <input className="h-6 w-6 rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-primary checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0 focus:outline-none transition-all cursor-pointer" onChange={(e) => e.target.style.backgroundImage = e.target.checked ? 'var(--checkbox-tick-svg)' : 'none'} style={{ appearance: 'none', WebkitAppearance: 'none', backgroundSize: '100% 100%' }} type="checkbox"/>
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-base font-medium">
                I confirm that all information provided regarding the property is accurate and complete to the best of my knowledge.
              </p>
            </label>
            <label className="flex items-start gap-4 p-5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 cursor-pointer hover:border-primary/30 hover:bg-white dark:hover:bg-slate-800 transition-all group">
              <div className="pt-0.5">
                <input className="h-6 w-6 rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-primary checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0 focus:outline-none transition-all cursor-pointer" onChange={(e) => e.target.style.backgroundImage = e.target.checked ? 'var(--checkbox-tick-svg)' : 'none'} style={{ appearance: 'none', WebkitAppearance: 'none', backgroundSize: '100% 100%' }} type="checkbox"/>
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-base font-medium">
                I acknowledge and accept the AI-generated suggestions for my property listing and have reviewed them for correctness and quality.
              </p>
            </label>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <Link to="/seller/dashboard" className="w-full flex items-center justify-center rounded-xl h-14 bg-primary text-white text-base font-bold leading-normal tracking-wide shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all uppercase text-sm" style={{ backgroundColor: '#1E6F5C' }}>Confirm &amp; Sign Listing</Link>
        <Link to="/seller/documents" className="w-full flex items-center justify-center rounded-xl h-12 bg-transparent text-slate-500 dark:text-slate-400 text-sm font-semibold hover:text-primary transition-colors">
          Go back and edit details
        </Link>
      </div>
      <div className="mt-12 pt-8 border-t border-primary/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400 uppercase tracking-widest font-bold">
        <span>Step 5 of 5</span>
        <div className="flex gap-2">
          <div className="w-8 h-1 bg-primary rounded-full"></div>
          <div className="w-8 h-1 bg-primary rounded-full"></div>
          <div className="w-8 h-1 bg-primary rounded-full"></div>
          <div className="w-8 h-1 bg-primary rounded-full"></div>
          <div className="w-8 h-1 bg-primary rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
