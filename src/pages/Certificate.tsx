import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import QRCode from 'react-qr-code';

export default function Certificate() {
  const { user } = useAuth();
  const [property, setProperty] = useState<any>(null);
  const [sellerName, setSellerName] = useState<string>('');
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      
      try {
        setErrorMsg(null);
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, full_name')
          .eq('auth_user_id', user.id)
          .single();

        if (userError && userError.code !== 'PGRST116') throw userError;
        if (!userData) { setErrorMsg("User profile not found."); setLoading(false); return; }

        setSellerName(userData.full_name || 'Verified Seller');
        
        const { data: propData, error: propError } = await supabase
          .from('properties')
          .select('*')
          .eq('seller_user_id', user.id)
          .single();

        if (propError && propError.code !== 'PGRST116') throw propError;
        if (!propData) { setErrorMsg("Property profile not found."); setLoading(false); return; }

        setProperty(propData);
        setShareToken(propData.shareable_link_token);
      } catch (error) {
        console.error('Error loading certificate data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin size-8 border-2 border-[#00e5a0] border-t-transparent rounded-full" /></div>;

  const certId = user ? `HSR-${user.id.substring(0, 4).toUpperCase()}` : 'HSR-X';
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-10">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black font-heading text-white tracking-tight">Market Ready Certificate</h1>
        <p className="text-zinc-400">Proof of verified property information and legal preparation.</p>
      </div>

      <Card className="p-10 md:p-20 border-white/10 bg-zinc-900 shadow-2xl relative overflow-hidden text-center space-y-10 border-double border-4">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-2 bg-[#00e5a0]" />
        <div className="absolute bottom-0 left-0 w-full h-2 bg-[#00e5a0]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] bg-[#00e5a0]/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="space-y-4 relative z-10">
          <div className="size-20 bg-[#00e5a0]/10 text-[#00e5a0] flex items-center justify-center rounded-3xl mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl">verified</span>
          </div>
          <h2 className="text-5xl font-black font-heading text-white uppercase tracking-tighter">Certificate of Readiness</h2>
          <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-xs">Official Verification • HomeSalesReady UK</p>
        </div>

        <div className="space-y-2 relative z-10">
          <p className="text-zinc-400 italic">This is to certify that the property located at</p>
          <h3 className="text-3xl font-black font-heading text-white">{property?.address || 'Property Address'}</h3>
          <p className="text-xl text-zinc-300">{property?.postcode}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-10 border-t border-white/10 relative z-10">
          <div className="space-y-1">
             <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Issued to</p>
             <p className="text-white font-bold">{sellerName}</p>
          </div>
          <div className="space-y-1">
             <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Date Issued</p>
             <p className="text-white font-bold">{today}</p>
          </div>
          <div className="space-y-1">
             <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Certificate ID</p>
             <p className="text-white font-bold font-mono">{certId}</p>
          </div>
        </div>

        {shareToken && (
          <div className="pt-10 flex flex-col items-center gap-6 relative z-10">
             <div className="p-4 bg-white rounded-2xl shadow-xl">
                <QRCode value={`${window.location.origin}/share/${shareToken}`} size={120} />
             </div>
             <p className="text-xs text-zinc-500 max-w-xs mx-auto">Scan to verify the live material information and documents for this property.</p>
          </div>
        )}
      </Card>

      <div className="flex flex-col md:flex-row justify-center gap-4">
         <Button variant="ghost" className="h-14 px-8 rounded-2xl border-white/10 text-white" onClick={() => window.print()}>
            <span className="material-symbols-outlined mr-2">download</span>
            Download PDF
         </Button>
         <Button variant="primary" className="h-14 px-12 rounded-2xl text-black font-black font-heading" onClick={() => {
            if(shareToken) window.open(`/share/${shareToken}`, '_blank');
         }}>
            <span className="material-symbols-outlined mr-2">share</span>
            Share Pack Link
         </Button>
      </div>
    </div>
  );
}
