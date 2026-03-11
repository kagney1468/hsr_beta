import { Link } from 'react-router-dom';

export default function PropertyProfile() {
  return (
    <div className="max-w-5xl w-full mx-auto p-10 pt-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Property Details</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Update your property information to reach "Home Sales Ready" status.</p>
      </div>
      <form className="space-y-8">
        {/* Section 1: Location */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-8 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Location &amp; Identification</h3>
            <p className="text-xs text-slate-500">The exact physical location details of the property.</p>
          </div>
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Street Address</label>
              <input className="w-full px-3 py-2 text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all" placeholder="e.g. 42 Willow Lane" type="text"/>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Postcode</label>
              <input className="w-full px-3 py-2 text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all" placeholder="e.g. SW1A 1AA" type="text"/>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Property Type</label>
              <select className="w-full px-3 py-2 text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all">
                <option>Detached House</option>
                <option>Semi-Detached House</option>
                <option>Terraced House</option>
                <option>Flat / Apartment</option>
                <option>Bungalow</option>
              </select>
            </div>
          </div>
        </div>
        {/* Section 2: Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-8 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Layout &amp; Features</h3>
            <p className="text-xs text-slate-500">Internal configuration and ownership status.</p>
          </div>
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Bedrooms</label>
              <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                <button className="flex-1 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400" type="button"><span className="material-symbols-outlined text-sm">remove</span></button>
                <input className="w-12 text-center border-x border-slate-200 dark:border-slate-700 py-2 text-sm bg-transparent outline-none font-medium" type="number" defaultValue="3"/>
                <button className="flex-1 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400" type="button"><span className="material-symbols-outlined text-sm">add</span></button>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Bathrooms</label>
              <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                <button className="flex-1 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400" type="button"><span className="material-symbols-outlined text-sm">remove</span></button>
                <input className="w-12 text-center border-x border-slate-200 dark:border-slate-700 py-2 text-sm bg-transparent outline-none font-medium" type="number" defaultValue="2"/>
                <button className="flex-1 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400" type="button"><span className="material-symbols-outlined text-sm">add</span></button>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Tenure</label>
              <select className="w-full px-3 py-2 text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all">
                <option>Freehold</option>
                <option>Leasehold</option>
                <option>Commonhold</option>
                <option>Share of Freehold</option>
              </select>
            </div>
          </div>
        </div>
        {/* Section 3: Infrastructure */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-8 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Utilities &amp; Infrastructure</h3>
            <p className="text-xs text-slate-500">Essential services and systems connectivity.</p>
          </div>
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Heating System</label>
              <select className="w-full px-3 py-2 text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all">
                <option>Gas Central Heating</option>
                <option>Electric Heating</option>
                <option>Oil Heating</option>
                <option>Heat Pump (Air/Ground)</option>
                <option>Biomass</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Drainage</label>
              <select className="w-full px-3 py-2 text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all">
                <option>Mains Sewerage</option>
                <option>Septic Tank</option>
                <option>Cesspit</option>
                <option>Private Treatment Plant</option>
              </select>
            </div>
          </div>
        </div>
        {/* Section 4: Maintenance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-8">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Recent Works</h3>
            <p className="text-xs text-slate-500">Renovations and certificates from the last 5 years.</p>
          </div>
          <div className="lg:col-span-2 space-y-4">
            <textarea className="w-full px-3 py-2 text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all resize-none" placeholder="e.g. New boiler installed 2022, Kitchen renovation 2021..." rows={4}></textarea>
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-6 text-center group hover:border-primary/50 transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors mb-2">cloud_upload</span>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Click to upload or drag and drop certificates</p>
              <p className="text-[10px] text-slate-400 mt-1">PDF, JPG or PNG. Max 10MB per file.</p>
            </div>
          </div>
        </div>
        {/* Action Bar */}
        <div className="flex items-center justify-between pt-8 border-t border-slate-200 dark:border-slate-800 mt-4">
          <button className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 flex items-center gap-1 transition-colors uppercase" type="button">
            <span className="material-symbols-outlined text-sm">delete</span>
            Discard Changes
          </button>
          <div className="flex items-center gap-4">
            <button className="px-5 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors uppercase" type="button">
              Save as Draft
            </button>
            <Link to="/seller/documents" className="px-6 py-2 bg-primary text-white text-xs font-bold rounded shadow-md shadow-primary/10 hover:bg-primary/90 transition-all transform active:scale-95 uppercase tracking-wide inline-block text-center">
              Complete Property Profile
            </Link>
          </div>
        </div>
      </form>
      {/* Footer/Support */}
      <div className="mt-12 text-center pb-12">
        <p className="text-slate-400 text-sm">Need help with these details? <a className="text-primary font-bold underline" href="#">Contact our support team</a></p>
      </div>
    </div>
  );
}
