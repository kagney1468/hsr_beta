import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function Certificate() {
  const { user } = useAuth();
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          setProperty(data);
        }
      } catch (error) {
        console.error('Error loading property:', error);
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

  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  // Generate a mock certificate ID based on user ID
  const certId = user ? `HSR-${user.id.substring(0, 4).toUpperCase()}-${user.id.substring(4, 6).toUpperCase()}` : 'HSR-PENDING';

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Home Sales Ready Certificate</h1>
        <p className="text-slate-500 mt-1">Your official certificate proving your property is market-ready.</p>
      </div>

      <Card className="p-12 border-2 border-primary/20 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/50 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute top-0 right-0 -mt-16 -mr-16 text-primary/5">
          <span className="material-symbols-outlined" style={{ fontSize: '240px' }}>verified</span>
        </div>

        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
          <div className="size-24 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-5xl">workspace_premium</span>
          </div>
          
          <div>
            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Certificate of Readiness</h2>
            <p className="text-lg text-slate-500 mt-2 font-medium">This property has met all requirements for market listing.</p>
          </div>

          <div className="w-full max-w-md p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm my-8">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Property Address</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {property?.address || 'Address Not Provided'}
            </p>
            <p className="text-slate-500">
              {property?.city ? `${property.city}, ` : ''}
              {property?.postcode || ''}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 w-full max-w-md text-left border-t border-slate-200 dark:border-slate-700 pt-8">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Issued Date</p>
              <p className="font-bold text-slate-900 dark:text-white">{today}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Certificate ID</p>
              <p className="font-mono font-bold text-slate-900 dark:text-white">{certId}</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-center gap-4 mt-8">
        <Button variant="outline" className="gap-2" onClick={() => window.print()}>
          <span className="material-symbols-outlined">download</span>
          Download PDF
        </Button>
        <Button variant="primary" className="gap-2" onClick={() => alert('Sharing functionality would go here.')}>
          <span className="material-symbols-outlined">share</span>
          Share Certificate
        </Button>
      </div>
    </div>
  );
}
