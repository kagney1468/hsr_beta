import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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
        // 1. Get user data
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .eq('auth_user_id', user.id)
          .single();

        if (userError && userError.code !== 'PGRST116') throw userError;
        
        if (!userData) {
          setErrorMsg("Unable to generate share link because the seller or property record could not be found.");
          return;
        }

        console.log('seller found', userData);
        setSellerName(`${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Unknown Seller');
        
        // 2. Get property data
        const { data: propData, error: propError } = await supabase
          .from('properties')
          .select('*')
          .eq('user_id', userData.id)
          .single();

        if (propError && propError.code !== 'PGRST116') throw propError;

        if (!propData) {
          setErrorMsg("Unable to generate share link because the seller or property record could not be found.");
          return;
        }

        console.log('property found', propData);
        setProperty(propData);
        
        // 3. Get or create share token
        const { data: shareData, error: shareError } = await supabase
          .from('shares')
          .select('token')
          .eq('property_id', propData.id)
          .eq('active', true)
          .single();
          
        if (shareData) {
          console.log('share found', shareData);
          console.log('token value', shareData.token);
          setShareToken(shareData.token);
        } else if (shareError && shareError.code === 'PGRST116') {
          // Create a new share token
          const newToken = crypto.randomUUID();
          const { data: newShare, error: insertError } = await supabase
            .from('shares')
            .insert({ property_id: propData.id, token: newToken, active: true })
            .select('token')
            .single();
            
          if (insertError) {
            console.error('Error creating share token:', insertError);
          } else if (newShare) {
            console.log('share created', newShare);
            console.log('token value', newShare.token);
            setShareToken(newShare.token);
          }
        } else if (shareError) {
          console.error('Error fetching share token:', shareError);
        }
      } catch (error) {
        console.error('Error loading certificate data:', error);
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
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-center font-medium">
          {errorMsg}
        </div>
      )}
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
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Seller Name</p>
              <p className="font-bold text-slate-900 dark:text-white">{sellerName || 'Pending'}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
              <p className="font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Home Sales Ready
              </p>
            </div>
          </div>

          {shareToken && (
            <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700 w-full max-w-md flex flex-col items-center">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Scan for Property File</p>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <QRCode value={`${window.location.origin}/share/${shareToken}`} size={120} />
              </div>
              <p className="text-xs text-slate-500 mt-4 text-center">
                Scan this QR code to view the complete Home Sales Ready property file.
              </p>
              <p className="text-xs font-mono text-slate-500 mt-2 text-center break-all">
                {`${window.location.origin}/share/${shareToken}`}
              </p>
            </div>
          )}
        </div>
      </Card>

      <div className="flex justify-center gap-4 mt-8">
        <Button variant="outline" className="gap-2" onClick={() => window.print()}>
          <span className="material-symbols-outlined">download</span>
          Download PDF
        </Button>
        <Button 
          variant="primary" 
          className="gap-2" 
          onClick={() => {
            if (shareToken) {
              window.open(`/share/${shareToken}`, '_blank');
            } else {
              alert('Share link is not ready yet.');
            }
          }}
        >
          <span className="material-symbols-outlined">share</span>
          Share Certificate
        </Button>
      </div>
    </div>
  );
}
