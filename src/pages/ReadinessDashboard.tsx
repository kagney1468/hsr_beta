import { Link } from 'react-router-dom';

export default function ReadinessDashboard() {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-8">
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-primary">
          <span className="material-symbols-outlined">dashboard</span>
          <span className="text-sm font-semibold uppercase tracking-wider">Dashboard</span>
        </div>
        <h1 className="text-4xl font-black tracking-tight">Readiness Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400">Track your progress and ensure your property is market-ready.</p>
      </div>
      {/* Overall Status Card */}
      <div className="rounded-xl border border-primary/10 bg-white dark:bg-slate-900/50 p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Overall Preparation Status</h2>
            <p className="text-sm text-slate-500">Property: 742 Evergreen Terrace</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-black text-primary">75%</span>
            <p className="text-xs font-bold uppercase text-slate-400">Ready</p>
          </div>
        </div>
        <div className="h-4 w-full rounded-full bg-primary/10 overflow-hidden">
          <div className="h-full rounded-full bg-primary" style={{ width: '75%' }}></div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <span className="material-symbols-outlined text-primary text-lg">info</span>
          <p>Almost there! Complete the remaining 3 items to go live on the market.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Completed Checklist */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Completed Sections
          </h3>
          <div className="flex flex-col border-t border-slate-100">
            {/* Item 1 */}
            <div className="flex items-center justify-between py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                <span className="text-sm font-medium text-slate-700">Property Description</span>
              </div>
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Verified</span>
            </div>
            {/* Item 2 */}
            <div className="flex items-center justify-between py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                <span className="text-sm font-medium text-slate-700">High-Res Photography</span>
              </div>
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Uploaded</span>
            </div>
            {/* Item 3 */}
            <div className="flex items-center justify-between py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                <span className="text-sm font-medium text-slate-700">EPC Rating Certificate</span>
              </div>
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Active</span>
            </div>
            {/* Item 4 */}
            <div className="flex items-center justify-between py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                <span className="text-sm font-medium text-slate-700">Proof of Ownership</span>
              </div>
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Validated</span>
            </div>
          </div>
        </div>
        {/* Missing Items */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-custom">
            Action Required
          </h3>
          <div className="flex flex-col border-t border-slate-100">
            {/* Amber Item 1 */}
            <div className="flex items-center justify-between py-4 border-b border-slate-100">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-4 bg-amber-custom rounded-full"></div>
                  <span className="text-sm font-semibold text-slate-900">Electrical Safety Certificate</span>
                </div>
                <p className="pl-4 text-xs text-slate-500">Upload a valid EICR report from the last 5 years.</p>
              </div>
              <Link to="/seller/documents" className="rounded border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors inline-block text-center">
                Fix Now
              </Link>
            </div>
            {/* Amber Item 2 */}
            <div className="flex items-center justify-between py-4 border-b border-slate-100">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-4 bg-amber-custom rounded-full"></div>
                  <span className="text-sm font-semibold text-slate-900">Gas Safety Record</span>
                </div>
                <p className="pl-4 text-xs text-slate-500">Required for properties with gas appliances.</p>
              </div>
              <Link to="/seller/documents" className="rounded border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors inline-block text-center">
                Fix Now
              </Link>
            </div>
            {/* Amber Item 3 */}
            <div className="flex items-center justify-between py-4 border-b border-slate-100">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-4 bg-amber-custom rounded-full"></div>
                  <span className="text-sm font-semibold text-slate-900">Floor Plans</span>
                </div>
                <p className="pl-4 text-xs text-slate-500">Professional dimensioned drawings are required.</p>
              </div>
              <Link to="/seller/property" className="rounded border border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity inline-block text-center">
                Book Pro
              </Link>
            </div>
          </div>
        </div>
      </div>
      {/* Property Insights Section (Extra Component for context) */}
      <div className="mt-4">
        <h3 className="mb-6 text-sm font-semibold uppercase tracking-wider text-slate-500">Preparation Recommendations</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="group flex flex-col gap-3 rounded-lg border border-slate-100 bg-white p-5 transition-all hover:border-primary/20 hover:shadow-sm">
            <span className="material-symbols-outlined text-primary text-xl">lightbulb</span>
            <h4 className="text-sm font-semibold text-slate-900">Curb Appeal</h4>
            <p className="text-xs leading-relaxed text-slate-500">Consider repainting the front door to increase first-impression value by up to 2%.</p>
          </div>
          <div className="group flex flex-col gap-3 rounded-lg border border-slate-100 bg-white p-5 transition-all hover:border-primary/20 hover:shadow-sm">
            <span className="material-symbols-outlined text-primary text-xl">cleaning_services</span>
            <h4 className="text-sm font-semibold text-slate-900">Deep Clean</h4>
            <p className="text-xs leading-relaxed text-slate-500">Professional staging and cleaning recommended prior to your high-resolution photography shoot.</p>
          </div>
          <div className="group flex flex-col gap-3 rounded-lg border border-slate-100 bg-white p-5 transition-all hover:border-primary/20 hover:shadow-sm">
            <span className="material-symbols-outlined text-primary text-xl">sell</span>
            <h4 className="text-sm font-semibold text-slate-900">Market Timing</h4>
            <p className="text-xs leading-relaxed text-slate-500">Properties in your area currently sell 12% faster when listed on Tuesdays or Wednesdays.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
