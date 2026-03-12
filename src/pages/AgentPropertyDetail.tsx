import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';

export default function AgentPropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<any>(null);
  const [seller, setSeller] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [declaration, setDeclaration] = useState<any>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [readiness, setReadiness] = useState({
    score: 0,
    profileComplete: false,
    propertyComplete: false,
    documentsComplete: false,
    declarationComplete: false,
  });

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      
      try {
        // Fetch Property
        const { data: propData, error: propError } = await supabase
          .from('properties')
          .select('*')
          .eq('id', id)
          .single();

        if (propError) throw propError;
        setProperty(propData);

        // Fetch Seller
        const { data: sellerData, error: sellerError } = await supabase
          .from('users')
          .select('*')
          .eq('id', propData.user_id)
          .single();

        if (sellerError) throw sellerError;
        setSeller(sellerData);

        // Fetch Documents
        const { data: docsData, error: docsError } = await supabase
          .from('documents')
          .select('*')
          .eq('property_id', id);

        if (docsError) throw docsError;
        setDocuments(docsData || []);

        // Fetch Declaration
        const { data: declData, error: declError } = await supabase
          .from('seller_declarations')
          .select('*')
          .eq('user_id', propData.user_id)
          .single();

        if (declError && declError.code !== 'PGRST116') throw declError;
        setDeclaration(declData);

        // Fetch Share Token
        const { data: shareData, error: shareError } = await supabase
          .from('shares')
          .select('token')
          .eq('property_id', id)
          .single();

        if (shareError && shareError.code !== 'PGRST116') throw shareError;
        if (shareData) {
          setShareToken(shareData.token);
        }

        // Calculate Readiness
        let score = 0;
        
        const profileComplete = !!(sellerData?.full_name && sellerData?.phone);
        if (profileComplete) score += 25;

        const propertyComplete = !!(propData?.address && propData?.property_type);
        if (propertyComplete) score += 25;

        const hasID = docsData?.some(d => d.category === 'ID');
        const hasOwnership = docsData?.some(d => d.category === 'Proof of Ownership');
        const documentsComplete = !!(hasID && hasOwnership);
        if (documentsComplete) score += 25;

        const declarationComplete = !!(declData?.confirms_accuracy && declData?.confirms_ai_review);
        if (declarationComplete) score += 25;

        setReadiness({
          score,
          profileComplete,
          propertyComplete,
          documentsComplete,
          declarationComplete,
        });

      } catch (error) {
        console.error('Error loading property details:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  const handleViewDocument = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('property-documents')
        .createSignedUrl(doc.storage_path, 60);

      if (error) throw error;
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      } else {
        throw new Error('Could not generate secure link');
      }
    } catch (err: any) {
      console.error('Error viewing document:', err);
      alert(err.message || 'Failed to open document');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="p-8 text-center text-slate-500">Property not found.</div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link to="/agent/dashboard" className="flex items-center justify-center size-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{property.address || 'Property Details'}</h1>
          <p className="text-slate-500 mt-1">{property.city ? `${property.city}, ` : ''}{property.postcode}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Summary & Readiness */}
        <div className="lg:col-span-2 space-y-8">
          {/* Property Summary */}
          <Card className="p-8 border border-slate-100 dark:border-slate-800 shadow-soft">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">Property Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Type</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">{property.property_type || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Bedrooms</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">{property.bedrooms || '0'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Bathrooms</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">{property.bathrooms || '0'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Tenure</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">{property.tenure || 'N/A'}</p>
              </div>
            </div>
          </Card>

          {/* Readiness Breakdown */}
          <Card className="p-8 border border-slate-100 dark:border-slate-800 shadow-soft">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Readiness Breakdown</h2>
              <div className="flex items-center gap-3">
                <div className="w-32 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${readiness.score === 100 ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${readiness.score}%` }}></div>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{readiness.score}%</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined ${readiness.profileComplete ? 'text-green-500' : 'text-slate-400'}`}>
                    {readiness.profileComplete ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">Seller Profile</span>
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{readiness.profileComplete ? 'Complete' : 'Pending'}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined ${readiness.propertyComplete ? 'text-green-500' : 'text-slate-400'}`}>
                    {readiness.propertyComplete ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">Property Details</span>
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{readiness.propertyComplete ? 'Complete' : 'Pending'}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined ${readiness.documentsComplete ? 'text-green-500' : 'text-slate-400'}`}>
                    {readiness.documentsComplete ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">Documents</span>
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{readiness.documentsComplete ? 'Complete' : 'Pending'}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined ${readiness.declarationComplete ? 'text-green-500' : 'text-slate-400'}`}>
                    {readiness.declarationComplete ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">Declaration</span>
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{readiness.declarationComplete ? 'Complete' : 'Pending'}</span>
              </div>
            </div>
          </Card>

          {/* Documents List */}
          <Card className="p-8 border border-slate-100 dark:border-slate-800 shadow-soft">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">Uploaded Documents</h2>
            {documents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                No documents uploaded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="size-10 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
                        <span className="material-symbols-outlined">description</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{doc.file_name}</p>
                        <p className="text-xs text-slate-500">{doc.document_type || doc.category}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleViewDocument(doc)}
                      className="p-2 text-slate-400 hover:text-primary transition-colors" 
                      title="View Document"
                    >
                      <span className="material-symbols-outlined">visibility</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Seller Info & Certificate */}
        <div className="space-y-8">
          {/* Seller Info */}
          <Card className="p-8 border border-slate-100 dark:border-slate-800 shadow-soft">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">Seller Information</h2>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined">person</span>
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-100">
                    {seller ? `${seller.first_name || ''} ${seller.last_name || ''}`.trim() || seller.full_name || 'Unknown' : 'Unknown'}
                  </p>
                  <p className="text-xs text-slate-500">Property Owner</p>
                </div>
              </div>
              
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Email</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{seller?.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Phone</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{seller?.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Contact Preference</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100 capitalize">{seller?.contact_preference || 'Email'}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Certificate Preview & Share */}
          <Card className="p-8 border border-slate-100 dark:border-slate-800 shadow-soft bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/50">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-primary text-2xl">verified</span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Certificate Status</h2>
            </div>
            
            {readiness.score === 100 ? (
              <div className="space-y-6 flex flex-col items-center text-center">
                <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Home Sales Ready
                </div>
                
                {shareToken ? (
                  <div className="w-full flex flex-col items-center pt-4 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Public Share Link</p>
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 mb-4">
                      <QRCode value={`${window.location.origin}/share/${shareToken}`} size={100} />
                    </div>
                    <a 
                      href={`/share/${shareToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-sm font-bold transition-colors block text-center"
                    >
                      Open Public Preview
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Share token not generated yet.</p>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="size-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <span className="material-symbols-outlined text-3xl">lock</span>
                </div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">Certificate Locked</p>
                <p className="text-xs text-slate-500">The property must reach 100% readiness to generate a certificate and share link.</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
