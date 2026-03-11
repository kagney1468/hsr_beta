import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function ReadinessDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<any>(null);
  const [readiness, setReadiness] = useState({
    score: 0,
    profileComplete: false,
    propertyComplete: false,
    documentsComplete: false,
    declarationComplete: false,
    missingItems: [] as string[]
  });

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      
      try {
        // Fetch User Profile
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        // Fetch Property
        const { data: propData } = await supabase
          .from('properties')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (propData) setProperty(propData);

        // Fetch Documents
        const { data: docs } = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', user.id);

        // Fetch Declaration
        const { data: declaration } = await supabase
          .from('seller_declarations')
          .select('*')
          .eq('user_id', user.id)
          .single();

        // Calculate Readiness
        let score = 0;
        let missing = [];
        
        const profileComplete = !!(profile?.full_name && profile?.phone);
        if (profileComplete) score += 25;
        else missing.push('Complete Seller Profile');

        const propertyComplete = !!(propData?.address && propData?.property_type);
        if (propertyComplete) score += 25;
        else missing.push('Complete Property Details');

        const hasID = docs?.some(d => d.category === 'ID');
        const hasOwnership = docs?.some(d => d.category === 'Proof of Ownership');
        const documentsComplete = !!(hasID && hasOwnership);
        if (documentsComplete) score += 25;
        else {
          if (!hasID) missing.push('Upload ID Document');
          if (!hasOwnership) missing.push('Upload Proof of Ownership');
        }

        const declarationComplete = !!(declaration?.confirms_accuracy && declaration?.confirms_ai_review);
        if (declarationComplete) score += 25;
        else missing.push('Sign Seller Declaration');

        setReadiness({
          score,
          profileComplete,
          propertyComplete,
          documentsComplete,
          declarationComplete,
          missingItems: missing
        });

      } catch (error) {
        console.error('Error loading readiness data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

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
            <p className="text-sm text-slate-500">Property: {property?.address || 'Not specified'}</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-black text-primary">{readiness.score}%</span>
            <p className="text-xs font-bold uppercase text-slate-400">Ready</p>
          </div>
        </div>
        <div className="h-4 w-full rounded-full bg-primary/10 overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all duration-1000" style={{ width: `${readiness.score}%` }}></div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <span className="material-symbols-outlined text-primary text-lg">info</span>
          <p>
            {readiness.score === 100 
              ? "You're all set! Your property is ready for the market."
              : `Almost there! Complete the remaining ${readiness.missingItems.length} items to go live on the market.`}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Completed Checklist */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Completed Sections
          </h3>
          <div className="flex flex-col border-t border-slate-100">
            {readiness.profileComplete && (
              <div className="flex items-center justify-between py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                  <span className="text-sm font-medium text-slate-700">Seller Profile</span>
                </div>
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Verified</span>
              </div>
            )}
            {readiness.propertyComplete && (
              <div className="flex items-center justify-between py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                  <span className="text-sm font-medium text-slate-700">Property Details</span>
                </div>
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Verified</span>
              </div>
            )}
            {readiness.documentsComplete && (
              <div className="flex items-center justify-between py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                  <span className="text-sm font-medium text-slate-700">Required Documents</span>
                </div>
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Uploaded</span>
              </div>
            )}
            {readiness.declarationComplete && (
              <div className="flex items-center justify-between py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                  <span className="text-sm font-medium text-slate-700">Seller Declaration</span>
                </div>
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Signed</span>
              </div>
            )}
            {readiness.score === 0 && (
              <div className="py-4 text-sm text-slate-500 italic">No sections completed yet.</div>
            )}
          </div>
        </div>
        {/* Missing Items */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-custom">
            Action Required
          </h3>
          <div className="flex flex-col border-t border-slate-100">
            {readiness.missingItems.length > 0 ? (
              readiness.missingItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-4 border-b border-slate-100">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-4 bg-amber-custom rounded-full"></div>
                      <span className="text-sm font-semibold text-slate-900">{item}</span>
                    </div>
                  </div>
                  <Link 
                    to={
                      item.includes('Profile') ? '/seller/profile' :
                      item.includes('Property') ? '/seller/property' :
                      item.includes('Document') || item.includes('ID') || item.includes('Ownership') ? '/seller/documents' :
                      '/seller/declaration'
                    } 
                    className="rounded border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors inline-block text-center"
                  >
                    Fix Now
                  </Link>
                </div>
              ))
            ) : (
              <div className="py-4 text-sm text-slate-500 italic">All required actions completed!</div>
            )}
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
