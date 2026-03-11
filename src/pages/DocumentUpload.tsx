import { Link } from 'react-router-dom';

export default function DocumentUpload() {
  return (
    <div className="flex flex-col max-w-[960px] flex-1 gap-6">
      {/* Progress Section */}
      <div className="flex flex-col gap-3 p-6 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-primary/10">
        <div className="flex gap-6 justify-between items-center">
          <p className="text-slate-900 dark:text-slate-100 text-base font-bold leading-normal">Profile Completion</p>
          <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full tracking-wider uppercase">75% Complete</span>
        </div>
        <div className="rounded-full bg-primary/10 h-3 w-full overflow-hidden">
          <div className="h-full rounded-full bg-primary" style={{ width: '75%' }}></div>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal">Only a few documents left to be market-ready.</p>
      </div>
      {/* Title & Tabs */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-slate-900 dark:text-slate-100 tracking-tight text-3xl font-bold leading-tight">Property Documents</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-normal">Organize and upload legal paperwork required for the sale process.</p>
        </div>
        <div className="border-b border-primary/10 overflow-x-auto">
          <div className="flex px-2 gap-1 min-w-max p-1 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
            <a className="flex items-center justify-center px-4 py-2 bg-white dark:bg-slate-900 text-primary rounded-md shadow-sm border border-primary/10" href="#">
              <span className="text-xs font-bold tracking-wide uppercase">Compliance</span>
            </a>
            <a className="flex items-center justify-center px-4 py-2 text-slate-500 hover:text-primary rounded-md transition-colors" href="#">
              <span className="text-xs font-bold tracking-wide uppercase">Planning</span>
            </a>
            <a className="flex items-center justify-center px-4 py-2 text-slate-500 hover:text-primary rounded-md transition-colors" href="#">
              <span className="text-xs font-bold tracking-wide uppercase">Guarantees</span>
            </a>
            <a className="flex items-center justify-center px-4 py-2 text-slate-500 hover:text-primary rounded-md transition-colors" href="#">
              <span className="text-xs font-bold tracking-wide uppercase">Condition Report</span>
            </a>
            <a className="flex items-center justify-center px-4 py-2 text-slate-500 hover:text-primary rounded-md transition-colors" href="#">
              <span className="text-xs font-bold tracking-wide uppercase">Optional</span>
            </a>
          </div>
        </div>
      </div>
      {/* Upload Area */}
      <div className="flex flex-col bg-white dark:bg-slate-900 rounded-lg border border-primary/10 shadow-sm">
        <div className="flex flex-col items-center gap-4 border-2 border-dashed border-primary/20 bg-slate-50/50 dark:bg-slate-800/30 m-3 px-6 py-10 rounded-lg hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer">
          <div className="size-12 bg-primary/10 text-primary flex items-center justify-center rounded-lg">
            <span className="material-symbols-outlined text-2xl">upload_file</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-slate-900 dark:text-slate-100 text-base font-semibold">Upload Compliance Documents</p>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Select multiple files (PDF, JPG, PNG) • Max 10MB each</p>
          </div>
          <button className="mt-2 px-6 py-2 bg-primary text-white text-xs font-bold uppercase tracking-wider rounded border border-primary hover:bg-primary/90 transition-colors">
            Browse Files
          </button>
        </div>
      </div>
      {/* Uploaded Files List */}
      <div className="flex flex-col gap-4">
        <h3 className="text-slate-900 dark:text-slate-100 text-xs font-bold uppercase tracking-widest px-1 text-slate-500">Uploaded Compliance Docs</h3>
        <div className="grid grid-cols-1 gap-3">
          {/* File Item 1: Verified */}
          <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="size-9 bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center rounded">
                <span className="material-symbols-outlined text-xl">description</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">EPC_Certificate_Main.pdf</p>
                  <span className="px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-bold uppercase rounded">Verified</span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono">2.4 MB • UID: DOC-8821 • Oct 24, 2023</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-1.5 text-slate-400 hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-lg">visibility</span>
              </button>
              <button className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            </div>
          </div>
          {/* File Item 2: Verified */}
          <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="size-9 bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center rounded">
                <span className="material-symbols-outlined text-xl">image</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Gas_Safety_2023.jpg</p>
                  <span className="px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-bold uppercase rounded">Verified</span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono">1.1 MB • UID: DOC-8822 • Oct 25, 2023</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-1.5 text-slate-400 hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-lg">visibility</span>
              </button>
              <button className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            </div>
          </div>
          {/* File Item 3: Processing */}
          <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 border-l-2 border-l-amber-500">
            <div className="flex items-center gap-3">
              <div className="size-9 bg-amber-50 dark:bg-amber-900/20 text-amber-600 flex items-center justify-center rounded">
                <span className="material-symbols-outlined text-xl">history_edu</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Electrical_Installation_Audit.pdf</p>
                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] font-bold uppercase rounded animate-pulse">Processing</span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono">4.8 MB • UID: DOC-8823 • Pending Validation</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-1.5 text-slate-400 cursor-not-allowed">
                <span className="material-symbols-outlined text-lg">visibility_off</span>
              </button>
              <button className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Action Footer */}
      <div className="flex items-center justify-between mt-4 p-4 border-t border-primary/10">
        <button className="px-6 py-2 text-slate-500 font-bold text-sm hover:text-primary transition-colors">
          Save as Draft
        </button>
        <div className="flex gap-4">
          <Link to="/seller/property" className="px-6 py-2 bg-primary/10 text-primary rounded-lg font-bold text-sm hover:bg-primary/20 transition-colors inline-block text-center">
            Back
          </Link>
          <Link to="/seller/declaration" className="px-6 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors inline-block text-center">
            Continue to Declaration
          </Link>
        </div>
      </div>
    </div>
  );
}
