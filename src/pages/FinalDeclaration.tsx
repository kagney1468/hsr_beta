import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function FinalDeclaration() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [confirmsAccuracy, setConfirmsAccuracy] = useState(false);
  const [confirmsAiReview, setConfirmsAiReview] = useState(false);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [noProperty, setNoProperty] = useState(false);

  useEffect(() => {
    async function loadDeclaration() {
      if (!user) return;
      
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();
          
        if (userError || !userData) {
          setNoProperty(true);
          setLoading(false);
          return;
        }

        const { data: propData, error: propError } = await supabase
          .from('properties')
          .select('id')
          .eq('user_id', userData.id)
          .single();

        if (propError || !propData) {
          setNoProperty(true);
          setLoading(false);
          return;
        }

        setPropertyId(propData.id);

        const { data, error } = await supabase
          .from('seller_declarations')
          .select('*')
          .eq('property_id', propData.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          setConfirmsAccuracy(data.confirms_accuracy || false);
          setConfirmsAiReview(data.confirms_ai_review || false);
        }
      } catch (error) {
        console.error('Error loading declaration:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDeclaration();
  }, [user]);

  const handleSign = async () => {
    if (!user || !propertyId) return;
    
    if (!confirmsAccuracy || !confirmsAiReview) {
      setMessage({ type: 'error', text: 'Please agree to all statements to proceed.' });
      return;
    }
    
    setSaving(true);
    setMessage(null);
    
    try {
      // Check if declaration exists
      const { data: existingDecl } = await supabase
        .from('seller_declarations')
        .select('id')
        .eq('property_id', propertyId)
        .single();

      let error;
      
      if (existingDecl) {
        const { error: updateError } = await supabase
          .from('seller_declarations')
          .update({
            confirms_accuracy: confirmsAccuracy,
            confirms_ai_review: confirmsAiReview,
            signed_at: new Date().toISOString(),
          })
          .eq('id', existingDecl.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('seller_declarations')
          .insert({
            property_id: propertyId,
            confirms_accuracy: confirmsAccuracy,
            confirms_ai_review: confirmsAiReview,
            signed_at: new Date().toISOString(),
          });
        error = insertError;
      }

      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Declaration saved successfully!' });
      setTimeout(() => {
        navigate('/seller/dashboard');
      }, 1500);
    } catch (error: any) {
      console.error('Error saving declaration:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save declaration.' });
    } finally {
      setSaving(false);
    }
  };

  if (noProperty) {
    return (
      <div className="flex flex-col max-w-[640px] w-full mx-auto p-10">
        <div className="p-6 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg shadow-sm">
          <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined">warning</span>
            Property Profile Required
          </h2>
          <p className="mb-4">Please complete the property details before submitting the declaration.</p>
          <Link to="/seller/property" className="inline-block px-4 py-2 bg-primary text-white rounded font-bold text-sm hover:bg-primary/90 transition-colors">
            Go to Property Details
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex flex-col max-w-[640px] w-full mx-auto animate-pulse">Loading declaration...</div>;
  }

  return (
    <div className="flex flex-col max-w-[640px] w-full mx-auto">
      <div className="mb-8">
        <h1 className="text-slate-900 dark:text-slate-100 text-3xl font-bold leading-tight mb-2 text-center">Final Declaration</h1>
        <p className="text-slate-500 dark:text-slate-400 text-base text-center">Please review and electronically sign the following statements to finalize your property listing.</p>
      </div>
      
      {message && (
        <div className={`p-4 mb-6 rounded-lg border ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {message.text}
        </div>
      )}

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
                <input 
                  className="h-6 w-6 rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-primary checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0 focus:outline-none transition-all cursor-pointer" 
                  checked={confirmsAccuracy}
                  onChange={(e) => setConfirmsAccuracy(e.target.checked)}
                  style={{ appearance: 'none', WebkitAppearance: 'none', backgroundSize: '100% 100%', backgroundImage: confirmsAccuracy ? 'var(--checkbox-tick-svg)' : 'none' }} 
                  type="checkbox"
                />
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-base font-medium">
                I confirm that all information provided regarding the property is accurate and complete to the best of my knowledge.
              </p>
            </label>
            <label className="flex items-start gap-4 p-5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 cursor-pointer hover:border-primary/30 hover:bg-white dark:hover:bg-slate-800 transition-all group">
              <div className="pt-0.5">
                <input 
                  className="h-6 w-6 rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-primary checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0 focus:outline-none transition-all cursor-pointer" 
                  checked={confirmsAiReview}
                  onChange={(e) => setConfirmsAiReview(e.target.checked)}
                  style={{ appearance: 'none', WebkitAppearance: 'none', backgroundSize: '100% 100%', backgroundImage: confirmsAiReview ? 'var(--checkbox-tick-svg)' : 'none' }} 
                  type="checkbox"
                />
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-base font-medium">
                I acknowledge and accept the AI-generated suggestions for my property listing and have reviewed them for correctness and quality.
              </p>
            </label>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <button 
          onClick={handleSign}
          disabled={saving || !confirmsAccuracy || !confirmsAiReview}
          className="w-full flex items-center justify-center rounded-xl h-14 bg-primary text-white text-base font-bold leading-normal tracking-wide shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all uppercase text-sm disabled:opacity-50 disabled:cursor-not-allowed" 
          style={{ backgroundColor: '#1E6F5C' }}
        >
          {saving ? 'Signing...' : 'Confirm & Sign Listing'}
        </button>
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
