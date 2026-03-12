import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function SellerDashboard() {
  const { user } = useAuth();
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [readiness, setReadiness] = useState({
    score: 0,
    profileComplete: false,
    propertyComplete: false,
    documentsComplete: false,
    declarationComplete: false,
    completedCount: 0
  });

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      
      try {
        // Fetch User Profile
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', user.id)
          .single();

        // Fetch Property
        const { data: propData, error: propError } = await supabase
          .from('properties')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (propError && propError.code !== 'PGRST116') {
          console.error(propError);
        }

        if (propData) {
          setProperty(propData);
        }

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
        let completedCount = 0;
        
        const profileComplete = !!(profile?.full_name && profile?.phone);
        if (profileComplete) { score += 25; completedCount++; }

        const propertyComplete = !!(propData?.address && propData?.property_type);
        if (propertyComplete) { score += 25; completedCount++; }

        const hasID = docs?.some(d => d.category === 'ID');
        const hasOwnership = docs?.some(d => d.category === 'Proof of Ownership');
        const documentsComplete = !!(hasID && hasOwnership);
        if (documentsComplete) { score += 25; completedCount++; }

        const declarationComplete = !!(declaration?.confirms_accuracy && declaration?.confirms_ai_review);
        if (declarationComplete) { score += 25; completedCount++; }

        setReadiness({
          score,
          profileComplete,
          propertyComplete,
          documentsComplete,
          declarationComplete,
          completedCount
        });

      } catch (error) {
        console.error('Error loading dashboard data:', error);
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
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Property Overview</h1>
          <p className="text-slate-500 mt-1">Manage your active listing and completion progress.</p>
        </div>
        <Link to="/seller/property" className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
          <span className="material-symbols-outlined text-xl">edit_square</span>
          Add or edit property details
        </Link>
      </div>
      {/* Readiness Score Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-soft border border-slate-100">
        <div className="flex flex-col lg:flex-row gap-10 items-center">
          <div className="relative flex items-center justify-center size-44">
            <svg className="size-full -rotate-90 filter drop-shadow-sm" viewBox="0 0 36 36">
              <circle className="stroke-slate-50" cx="18" cy="18" fill="none" r="16" strokeWidth="2.5"></circle>
              <circle className="stroke-accent transition-all duration-1000" cx="18" cy="18" fill="none" r="16" strokeDasharray={`${readiness.score}, 100`} strokeLinecap="round" strokeWidth="2.5"></circle>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-slate-900">{readiness.score}<span className="text-xl font-bold text-slate-400">%</span></span>
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-1">Ready</span>
            </div>
          </div>
          <div className="flex-1 space-y-4 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
              <span className="material-symbols-outlined text-sm">auto_graph</span>
              {readiness.score === 100 ? 'Ready to list' : 'Almost there'}
            </div>
            <h3 className="text-2xl font-black text-slate-900 leading-tight tracking-tight">Your Property Readiness Score</h3>
            <p className="text-slate-500 text-sm leading-relaxed max-w-xl">Complete the remaining tasks to ensure your property is market-ready. Optimized listings receive significantly more interest from qualified buyers.</p>
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start pt-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 border border-slate-100 px-3.5 py-2 rounded-xl bg-white shadow-sm">
                <span className="material-symbols-outlined text-accent text-lg">verified</span>
                Market Valuation
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 border border-slate-100 px-3.5 py-2 rounded-xl bg-white shadow-sm">
                <span className="material-symbols-outlined text-accent text-lg">verified</span>
                HD Photography
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 border border-slate-100 px-3.5 py-2 rounded-xl bg-slate-50/50">
                <span className="material-symbols-outlined text-lg">hourglass_empty</span>
                Legal Review
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Checklist Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Readiness Checklist</h2>
          <span className="text-sm font-medium text-slate-500">{readiness.completedCount} of 4 Tasks Completed</span>
        </div>
        <div className="grid gap-3">
          {/* Task 1 */}
          <Link to="/seller/profile" className={`flex items-center justify-between p-5 bg-white dark:bg-slate-900 rounded-xl border ${readiness.profileComplete ? 'border-slate-100 shadow-sm hover:border-accent/20' : 'border-2 border-primary/20 shadow-soft ring-1 ring-primary/5'} transition-colors group`}>
            <div className="flex items-center gap-4">
              <div className={`size-12 rounded-xl ${readiness.profileComplete ? 'bg-slate-50 text-slate-400 group-hover:bg-accent/10 group-hover:text-accent' : 'bg-primary/5 text-primary'} flex items-center justify-center transition-colors`}>
                <span className="material-symbols-outlined">account_circle</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Seller Profile</h4>
                <p className="text-xs text-slate-400">Identity verification and contact info</p>
              </div>
            </div>
            {readiness.profileComplete ? (
              <div className="flex items-center gap-2 text-accent bg-accent/5 px-4 py-2 rounded-lg">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span className="text-[10px] font-black uppercase tracking-widest">Complete</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-4 py-2 rounded-lg">
                <span className="material-symbols-outlined text-sm">priority_high</span>
                <span className="text-[10px] font-black uppercase tracking-widest">Pending</span>
              </div>
            )}
          </Link>
          {/* Task 2 */}
          <Link to="/seller/property" className={`flex items-center justify-between p-5 bg-white dark:bg-slate-900 rounded-xl border ${readiness.propertyComplete ? 'border-slate-100 shadow-sm hover:border-accent/20' : 'border-2 border-primary/20 shadow-soft ring-1 ring-primary/5'} transition-colors group`}>
            <div className="flex items-center gap-4">
              <div className={`size-12 rounded-xl ${readiness.propertyComplete ? 'bg-slate-50 text-slate-400 group-hover:bg-accent/10 group-hover:text-accent' : 'bg-primary/5 text-primary'} flex items-center justify-center transition-colors`}>
                <span className="material-symbols-outlined">villa</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Property Details</h4>
                <p className="text-xs text-slate-400">Room specs, dimensions, and features</p>
              </div>
            </div>
            {readiness.propertyComplete ? (
              <div className="flex items-center gap-2 text-accent bg-accent/5 px-4 py-2 rounded-lg">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span className="text-[10px] font-black uppercase tracking-widest">Complete</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-4 py-2 rounded-lg">
                <span className="material-symbols-outlined text-sm">priority_high</span>
                <span className="text-[10px] font-black uppercase tracking-widest">Pending</span>
              </div>
            )}
          </Link>
          {/* Task 3 */}
          <Link to="/seller/documents" className={`flex items-center justify-between p-5 bg-white dark:bg-slate-900 rounded-xl border ${readiness.documentsComplete ? 'border-slate-100 shadow-sm hover:border-accent/20' : 'border-2 border-primary/20 shadow-soft ring-1 ring-primary/5'} transition-colors group`}>
            <div className="flex items-center gap-4">
              <div className={`size-12 rounded-xl ${readiness.documentsComplete ? 'bg-slate-50 text-slate-400 group-hover:bg-accent/10 group-hover:text-accent' : 'bg-primary/5 text-primary'} flex items-center justify-center transition-colors`}>
                <span className="material-symbols-outlined">folder_shared</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Documents</h4>
                <p className="text-xs text-slate-400">Title deeds, tax records, and certificates</p>
              </div>
            </div>
            {readiness.documentsComplete ? (
              <div className="flex items-center gap-2 text-accent bg-accent/5 px-4 py-2 rounded-lg">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span className="text-[10px] font-black uppercase tracking-widest">Complete</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-4 py-2 rounded-lg">
                <span className="material-symbols-outlined text-sm">priority_high</span>
                <span className="text-[10px] font-black uppercase tracking-widest">Pending</span>
              </div>
            )}
          </Link>
          {/* Task 4 */}
          <Link to="/seller/declaration" className={`flex items-center justify-between p-5 bg-white dark:bg-slate-900 rounded-xl border ${readiness.declarationComplete ? 'border-slate-100 shadow-sm hover:border-accent/20' : 'border-2 border-primary/20 shadow-soft ring-1 ring-primary/5'} transition-colors group`}>
            <div className="flex items-center gap-4">
              <div className={`size-12 rounded-xl ${readiness.declarationComplete ? 'bg-slate-50 text-slate-400 group-hover:bg-accent/10 group-hover:text-accent' : 'bg-primary/5 text-primary'} flex items-center justify-center transition-colors`}>
                <span className="material-symbols-outlined">draw</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Seller Declaration</h4>
                <p className="text-xs text-slate-400">Legal compliance and owner sign-off</p>
              </div>
            </div>
            {readiness.declarationComplete ? (
              <div className="flex items-center gap-2 text-accent bg-accent/5 px-4 py-2 rounded-lg">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span className="text-[10px] font-black uppercase tracking-widest">Complete</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-4 py-2 rounded-lg">
                <span className="material-symbols-outlined text-sm">priority_high</span>
                <span className="text-[10px] font-black uppercase tracking-widest">Pending</span>
              </div>
            )}
          </Link>
          {/* Task 5 */}
          <Link to="/seller/readiness" className="flex items-center justify-between p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 shadow-sm hover:border-accent/20 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-accent/10 group-hover:text-accent flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined">fact_check</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Readiness Dashboard</h4>
                <p className="text-xs text-slate-400">View your property's readiness score and tasks</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-600 bg-slate-50 px-4 py-2 rounded-lg">
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
              <span className="text-[10px] font-black uppercase tracking-widest">View</span>
            </div>
          </Link>
        </div>
      </div>
      {/* Property Preview Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-100 shadow-soft group hover:shadow-xl hover:shadow-slate-200/50 transition-all">
        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-[320px] relative overflow-hidden">
            <div className="aspect-[4/3] md:h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAl23a4FdE8hR94lgSNQxu5Rd3yvHpgmpEdmXYrGlezWqYPOqc6UORabBHr4xyQkwFZAQpHFCGXZk2aLf9i5Objmf0jLb8HRNLcIMWQzstoVGRmJVEHs6atCJyowP3d5w0d5JkNfAHX-3QOKGxOrjUmI5WUVZa6ByQzDcWtZhTvw-RJtCK-9M4gMoZXy-A5bL04lU7x1D5q5mCtSCnWBjf1Ef3PTAdDPVQ5nQno6xk6ZjmkIVh45OhIZLZdPfWqHKDBXoKnFeFesUQ")' }}></div>
            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md text-primary text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider shadow-sm">Primary Residence</div>
          </div>
          <div className="flex-1 p-8 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    {property?.address || 'Add your property details'}
                  </h3>
                  <p className="text-slate-400 text-sm font-medium flex items-center gap-1.5 mt-1.5">
                    <span className="material-symbols-outlined text-slate-300">location_on</span>
                    {property?.postcode || 'No postcode provided'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-primary">TBD</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Est. Market Price</p>
                </div>
              </div>
              <div className="flex items-center gap-8 border-y border-slate-50 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-slate-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-slate-500">king_bed</span>
                  </div>
                  <span className="text-sm font-bold text-slate-600">{property?.bedrooms || 0} Beds</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-slate-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-slate-500">bathtub</span>
                  </div>
                  <span className="text-sm font-bold text-slate-600">{property?.bathrooms || 0} Baths</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-slate-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-slate-500">home</span>
                  </div>
                  <span className="text-sm font-bold text-slate-600">{property?.property_type || 'Unknown'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-6">
              <span className="text-xs font-medium text-slate-400 italic">
                {property?.updated_at ? `Updated ${new Date(property.updated_at).toLocaleDateString()}` : 'Not updated yet'}
              </span>
              <Link to="/seller/certificate" className="flex items-center gap-2 text-primary text-sm font-black hover:gap-3 transition-all">
                View Public Preview
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
