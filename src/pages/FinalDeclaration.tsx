import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function FinalDeclaration() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [confirmsAccuracy, setConfirmsAccuracy] = useState(false);
  const [confirmsLegalRight, setConfirmsLegalRight] = useState(false);
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
          .maybeSingle();
          
        if (userError || !userData) {
          setNoProperty(true);
          setLoading(false);
          return;
        }

        const { data: propData, error: propError } = await supabase
          .from('properties')
          .select('id')
          .eq('seller_user_id', user.id)
          .maybeSingle();

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
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setConfirmsAccuracy(data.confirms_accuracy || false);
          setConfirmsLegalRight(data.confirms_ai_review || false);
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
    
    if (!confirmsAccuracy || !confirmsLegalRight) {
      setMessage({ type: 'error', text: 'Please agree to all statements to proceed.' });
      return;
    }
    
    setSaving(true);
    setMessage(null);
    
    try {
      const { data: existingDecl } = await supabase
        .from('seller_declarations')
        .select('id')
        .eq('property_id', propertyId)
        .single();

      const payload = {
        property_id: propertyId,
        seller_user_id: user.id,
        confirms_accuracy: confirmsAccuracy,
        confirms_ai_review: confirmsLegalRight, // Reusing field for legal right confirm
        signed_at: new Date().toISOString(),
      };
      
      if (existingDecl) {
        const { error } = await supabase
          .from('seller_declarations')
          .update(payload)
          .eq('id', existingDecl.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('seller_declarations')
          .insert(payload);
        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Declaration signed successfully!' });
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
      <div className="p-10 text-center">
        <Card className="p-12 border-white/5 bg-zinc-900 shadow-2xl">
          <span className="material-symbols-outlined text-4xl text-amber-500 mb-4">warning</span>
          <h2 className="text-2xl font-black font-heading mb-2">Property Profile Required</h2>
          <p className="text-zinc-400 mb-6">Please complete your property profile before signing the declaration.</p>
          <Button variant="primary" onClick={() => navigate('/seller/onboarding')}>Go to Property Onboarding</Button>
        </Card>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin size-8 border-2 border-[#00e5a0] border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-2xl mx-auto p-6 md:p-10 space-y-10">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black font-heading text-white tracking-tight">Final Step: Declaration</h1>
        <p className="text-zinc-400">Review and verify the accuracy of your property information pack.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl border font-bold animate-in fade-in slide-in-from-top-2 duration-300 ${
          message.type === 'success' 
            ? 'bg-green-900/20 border-green-800 text-green-400' 
            : 'bg-red-900/20 border-red-800 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      <Card className="p-8 border-white/5 bg-zinc-900 space-y-8 shadow-2xl">
        <div className="space-y-6">
          <label className="flex items-start gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/5 cursor-pointer hover:border-[#00e5a0]/30 transition-all group">
            <div className="pt-1">
              <input 
                type="checkbox"
                checked={confirmsAccuracy}
                onChange={(e) => setConfirmsAccuracy(e.target.checked)}
                className="size-6 rounded-lg border-2 border-white/10 bg-black/50 checked:bg-[#00e5a0] checked:border-[#00e5a0] transition-all cursor-pointer appearance-none relative checked:after:content-['✓'] checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center checked:after:text-black checked:after:font-black"
              />
            </div>
            <div className="space-y-1">
              <p className="text-white font-bold text-sm">Accuracy Confirmation</p>
              <p className="text-zinc-500 text-xs leading-relaxed italic">"I confirm that all information provided regarding the property is accurate and complete to the best of my knowledge."</p>
            </div>
          </label>

          <label className="flex items-start gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/5 cursor-pointer hover:border-[#00e5a0]/30 transition-all group">
            <div className="pt-1">
              <input 
                type="checkbox"
                checked={confirmsLegalRight}
                onChange={(e) => setConfirmsLegalRight(e.target.checked)}
                className="size-6 rounded-lg border-2 border-white/10 bg-black/50 checked:bg-[#00e5a0] checked:border-[#00e5a0] transition-all cursor-pointer appearance-none relative checked:after:content-['✓'] checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center checked:after:text-black checked:after:font-black"
              />
            </div>
            <div className="space-y-1">
              <p className="text-white font-bold text-sm">Legal Right to Sell</p>
              <p className="text-zinc-500 text-xs leading-relaxed italic">"I confirm that I have the legal right to sell this property and have disclosed any relevant restrictions or encumbrances."</p>
            </div>
          </label>
        </div>

        <div className="pt-8 border-t border-white/5">
          <Button 
            variant="primary" 
            onClick={handleSign} 
            disabled={saving || !confirmsAccuracy || !confirmsLegalRight}
            className="w-full h-14 rounded-2xl text-black font-black font-heading text-lg shadow-xl shadow-[#00e5a0]/20 active:scale-95 transition-all"
          >
            {saving ? 'Signing Pack...' : 'Digitally Sign & Complete'}
          </Button>
          <div className="mt-6 flex flex-col items-center gap-2">
             <div className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">verified</span>
                Verified by HomeSalesReady
             </div>
             <Link to="/seller/documents" className="text-xs text-zinc-500 hover:text-white transition-colors">Go back and review documents</Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
