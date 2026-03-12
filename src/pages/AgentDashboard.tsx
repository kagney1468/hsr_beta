import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AgentDashboard() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch all properties
        const { data: propsData, error: propsError } = await supabase
          .from('properties')
          .select('*, users(first_name, last_name)');

        if (propsError) throw propsError;

        // Fetch all documents to calculate counts
        const { data: docsData, error: docsError } = await supabase
          .from('documents')
          .select('property_id, category');

        if (docsError) throw docsError;

        // Fetch declarations
        const { data: declData, error: declError } = await supabase
          .from('seller_declarations')
          .select('user_id, confirms_accuracy, confirms_ai_review');

        if (declError) throw declError;

        // Fetch users to calculate profile completeness
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, full_name, phone');

        if (usersError) throw usersError;

        const enrichedProperties = propsData?.map(prop => {
          const propDocs = docsData?.filter(d => d.property_id === prop.id) || [];
          const userDecl = declData?.find(d => d.user_id === prop.user_id);
          const userProfile = usersData?.find(u => u.id === prop.user_id);

          let score = 0;
          
          const profileComplete = !!(userProfile?.full_name && userProfile?.phone);
          if (profileComplete) score += 25;

          const propertyComplete = !!(prop.address && prop.property_type);
          if (propertyComplete) score += 25;

          const hasID = propDocs.some(d => d.category === 'ID');
          const hasOwnership = propDocs.some(d => d.category === 'Proof of Ownership');
          const documentsComplete = !!(hasID && hasOwnership);
          if (documentsComplete) score += 25;

          const declarationComplete = !!(userDecl?.confirms_accuracy && userDecl?.confirms_ai_review);
          if (declarationComplete) score += 25;

          return {
            ...prop,
            sellerName: prop.users ? `${prop.users.first_name || ''} ${prop.users.last_name || ''}`.trim() : 'Unknown',
            score,
            documentsCount: propDocs.length,
            status: score === 100 ? 'Ready' : 'In Progress'
          };
        }) || [];

        setProperties(enrichedProperties);
      } catch (error) {
        console.error('Error loading agent dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Agent Dashboard</h1>
          <p className="text-slate-500 mt-1">Overview of all properties and their readiness status.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Property Address</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Seller Name</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Readiness</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Documents</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {properties.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">No properties found.</td>
                </tr>
              ) : (
                properties.map(prop => (
                  <tr key={prop.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-slate-900 dark:text-slate-100">{prop.address || 'No Address'}</p>
                      <p className="text-xs text-slate-500">{prop.postcode}</p>
                    </td>
                    <td className="p-4 font-medium text-slate-700 dark:text-slate-300">{prop.sellerName}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                        prop.status === 'Ready' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {prop.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden w-24">
                          <div className={`h-full rounded-full ${prop.score === 100 ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${prop.score}%` }}></div>
                        </div>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{prop.score}%</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400 font-medium">{prop.documentsCount}</td>
                    <td className="p-4 text-right">
                      <Link to={`/agent/property/${prop.id}`} className="inline-flex items-center justify-center px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-sm font-bold transition-colors">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
