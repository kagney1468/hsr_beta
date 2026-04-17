import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { supabase } from '../lib/supabase';
import { SIGNED_DOCUMENT_URL_TTL_SECONDS } from '../lib/storageSignedUrl';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function AgentPropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<any>(null);
  const [seller, setSeller] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [viewers, setViewers] = useState<any[]>([]);
  const [declaration, setDeclaration] = useState<any>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [readiness, setReadiness] = useState({
    score: 0,
    propertyComplete: false,
    documentsComplete: false,
    declarationComplete: false,
    sellerProfileComplete: false,
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

        // Fetch Seller — seller_user_id is public.users.id, so query by id not auth_user_id
        const { data: sellerData } = await supabase
          .from('users')
          .select('id, full_name, email, phone')
          .eq('id', propData.seller_user_id)
          .maybeSingle();

        setSeller(sellerData || null);

        // Fetch Documents, Viewers, Declaration, Share in parallel
        const [
          { data: docsData },
          { data: viewersData },
          { data: declData },
          { data: shareData },
        ] = await Promise.all([
          supabase.from('documents').select('*').eq('property_id', id),
          supabase.from('pack_viewers').select('*').eq('property_id', id).order('viewed_at', { ascending: false }),
          supabase.from('seller_declarations').select('*').eq('property_id', id).maybeSingle(),
          supabase.from('shares').select('token').eq('property_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        ]);

        setDocuments(docsData || []);
        setViewers(viewersData || []);
        setDeclaration(declData || null);
        if (shareData?.token) setShareToken(shareData.token);

        // Readiness calculation
        const propertyComplete = !!(propData?.address_line1 && propData?.property_type);
        const documentsComplete = !!(
          (docsData || []).some((d: any) => d.document_type === 'title_deeds') &&
          (docsData || []).some((d: any) => d.document_type === 'epc')
        );
        const declarationComplete = !!(declData?.confirms_accuracy && declData?.confirms_ai_review);
        const sellerProfileComplete = !!(sellerData?.full_name && sellerData?.phone);

        // Use the stored pack_completion_percentage if available (set by seller journey)
        // so dashboard and property detail always show the same number
        let score = propData?.pack_completion_percentage || 0;
        if (score === 0) {
          if (sellerProfileComplete) score += 25;
          if (propertyComplete) score += 25;
          if (documentsComplete) score += 25;
          if (declarationComplete) score += 25;
        }

        setReadiness({ score, propertyComplete, documentsComplete, declarationComplete, sellerProfileComplete });
      } catch (err) {
        console.error('Error loading property details:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  const handleViewDocument = async (doc: any) => {
    if (!doc?.file_url) { alert('Document URL not found.'); return; }
    try {
      const { data, error } = await supabase.storage
        .from('property-documents')
        .createSignedUrl(doc.file_url, SIGNED_DOCUMENT_URL_TTL_SECONDS);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      else alert('Could not open document.');
    } catch {
      alert('Could not open document.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin size-10 border-4 border-[var(--teal-600)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-[var(--muted)] font-heading font-black text-2xl">
        Property not found.
      </div>
    );
  }

  const addressDisplay = [property.address_line1, property.address_line2, property.address_town, property.address_postcode]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--text)] pb-20">
      {/* Header */}
      <div className="px-6 md:px-12 pt-10 pb-8 border-b border-[var(--border)] flex flex-col md:flex-row items-center justify-between gap-6 bg-white">
        <div className="flex items-center gap-5">
          <Link
            to="/agent/dashboard"
            className="size-12 rounded-2xl bg-[var(--teal-050)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--teal-900)] hover:border-[var(--teal-500)]/30 transition-all"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--teal-900)]">{property.address_line1}</h1>
            <p className="text-[var(--muted)] text-sm flex items-center gap-2">
              {property.address_postcode} • {property.property_type}
              {seller?.full_name && (
                <>
                  <span className="size-1 bg-[var(--border)] rounded-full" />
                  Managed for {seller.full_name}
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="h-12 px-6 rounded-xl font-bold"
            onClick={() => alert('Edit details — ask your seller to update their property profile, or contact HomeSalesReady support.')}
          >
            Edit Details
          </Button>
          <Button
            variant="primary"
            className="h-12 px-6 rounded-xl font-black font-heading"
            onClick={() => {
              if (shareToken) {
                window.open(`${window.location.origin}/pack/${shareToken}`, '_blank', 'noopener,noreferrer');
              } else {
                alert('No shareable pack available yet. The seller must activate sharing from their dashboard first.');
              }
            }}
          >
            View Pack
          </Button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-6 md:p-12">
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--teal-050)] border border-[var(--border)] text-[var(--teal-900)]">
          <span className="material-symbols-outlined text-[var(--teal-600)] shrink-0">verified</span>
          <p className="text-sm font-semibold">All information on this pack has been declared and verified by the seller.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Pack Progress', value: `${readiness.score}%`, color: readiness.score === 100 ? 'text-[var(--teal-600)]' : 'text-amber-500' },
                { label: 'Documents', value: documents.length, color: 'text-[var(--teal-900)]' },
                { label: 'Total Views', value: viewers.length, color: 'text-blue-500' },
                { label: 'Priority Leads', value: viewers.filter(v => v.is_selling).length, color: 'text-[var(--teal-600)]' },
              ].map(stat => (
                <Card key={stat.label} className="p-5 space-y-1">
                  <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">{stat.label}</p>
                  <p className={`text-2xl font-black font-heading ${stat.color}`}>{stat.value}</p>
                </Card>
              ))}
            </div>

            {/* Viewer Registrations */}
            <Card className="overflow-hidden">
              <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--teal-050)]/30">
                <h3 className="text-lg font-black font-heading tracking-tight text-[var(--teal-900)]">Viewer Registrations</h3>
                <span className="text-[10px] font-black text-[var(--teal-900)] uppercase tracking-widest bg-white border border-[var(--border)] px-3 py-1 rounded-full">
                  {viewers.length} Registered
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--teal-050)]">
                      <th className="px-6 py-4 text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">Viewer</th>
                      <th className="px-6 py-4 text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">Phone</th>
                      <th className="px-6 py-4 text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">Date</th>
                      <th className="px-6 py-4 text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">Selling Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {viewers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-[var(--muted)] italic text-sm">
                          No registrations for this property yet.
                        </td>
                      </tr>
                    ) : viewers.map(viewer => (
                      <tr
                        key={viewer.id}
                        className={`transition-colors ${viewer.is_selling ? 'bg-[var(--teal-050)]/50 hover:bg-[var(--teal-050)]' : 'hover:bg-gray-50'}`}
                      >
                        <td className="px-6 py-4">
                          <div className="font-bold text-[var(--teal-900)]">{viewer.viewer_name}</div>
                          <div className="text-[10px] text-[var(--muted)] font-mono">{viewer.viewer_email}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--muted)]">{viewer.viewer_phone || '—'}</td>
                        <td className="px-6 py-4 text-sm text-[var(--muted)]">
                          {new Date(viewer.viewed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </td>
                        <td className="px-6 py-4">
                          {viewer.is_selling ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--teal-050)] text-[var(--teal-600)] text-[10px] font-black uppercase tracking-widest border border-[var(--border)]">
                                <span className="size-1 rounded-full bg-[var(--teal-500)] animate-pulse" />
                                Priority Lead
                              </span>
                              {viewer.selling_location && (
                                <div className="text-[10px] text-[var(--muted)]">Selling in {viewer.selling_location}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-[var(--muted)] uppercase">Buyer only</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Readiness Checklist */}
            <Card className="p-8 space-y-6">
              <h3 className="text-xl font-black font-heading tracking-tight text-[var(--teal-900)]">Readiness Checklist</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Seller Profile', done: readiness.sellerProfileComplete },
                  { label: 'Property Details', done: readiness.propertyComplete },
                  { label: 'Required Documents', done: readiness.documentsComplete },
                  { label: 'Final Declaration', done: readiness.declarationComplete },
                ].map(item => (
                  <div
                    key={item.label}
                    className="p-4 rounded-2xl bg-[var(--teal-050)] border border-[var(--border)] flex items-center justify-between"
                  >
                    <span className="font-bold text-sm tracking-tight text-[var(--teal-900)]">{item.label}</span>
                    <span className={`material-symbols-outlined ${item.done ? 'text-[var(--teal-600)]' : 'text-[var(--border)]'}`}>
                      {item.done ? 'check_circle' : 'pending'}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Documents */}
            <Card className="p-8 space-y-6">
              <h3 className="text-xl font-black font-heading tracking-tight text-[var(--teal-900)]">Compliance Documents</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {documents.map(doc => (
                  <div
                    key={doc.id}
                    className="p-5 rounded-2xl bg-white border border-[var(--border)] hover:border-[var(--teal-500)]/30 transition-all flex items-center justify-between shadow-soft"
                  >
                    <div className="flex items-center gap-4">
                      <div className="size-10 rounded-xl bg-[var(--teal-050)] border border-[var(--border)] flex items-center justify-center text-[var(--teal-600)]">
                        <span className="material-symbols-outlined">description</span>
                      </div>
                      <div>
                        <p className="font-bold text-sm tracking-tight text-[var(--teal-900)]">{doc.document_type}</p>
                        <p className="text-[10px] text-[var(--muted)] font-mono uppercase truncate max-w-[140px]">{doc.name || 'Document'}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleViewDocument(doc)}
                      className="size-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--teal-600)] hover:bg-[var(--teal-050)] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                    </button>
                  </div>
                ))}
                {documents.length === 0 && (
                  <p className="col-span-full py-10 text-center text-[var(--muted)] italic text-sm">No documents uploaded by seller.</p>
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Share Card */}
            <Card className="p-8 bg-[var(--teal-050)] space-y-6">
              <div className="inline-flex items-center gap-2 text-[var(--teal-900)] text-[10px] font-black uppercase tracking-[0.2em]">
                <span className="material-symbols-outlined text-sm">qr_code_2</span>
                Property QR Gate
              </div>
              <h3 className="text-xl font-black font-heading tracking-tight">Share Property Pack</h3>

              {shareToken ? (
                <>
                  <div className="bg-white p-4 rounded-3xl flex justify-center shadow-2xl">
                    <QRCode value={`${window.location.origin}/pack/${shareToken}`} size={150} />
                  </div>
                  <div className="space-y-2">
                    <Button
                      variant="primary"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/pack/${shareToken}`);
                        alert('Public link copied!');
                      }}
                      className="w-full h-12 rounded-2xl font-black font-heading text-sm"
                    >
                      Copy Public Link
                    </Button>
                    <Link to={`/pack/${shareToken}`} target="_blank" className="block w-full text-center py-2 text-[10px] font-black text-[var(--muted)] uppercase tracking-widest hover:text-[var(--teal-600)] transition-colors">
                      Preview as Viewer
                    </Link>
                  </div>
                </>
              ) : (
                <div className="py-6 text-center space-y-3">
                  <p className="text-[var(--muted)] text-sm">No share link generated yet.</p>
                  <p className="text-xs text-[var(--muted)]">The seller must activate sharing from their dashboard.</p>
                </div>
              )}
            </Card>

            {/* Seller Contact */}
            <Card className="p-8 space-y-6">
              <h3 className="text-lg font-black font-heading tracking-tight text-[var(--teal-900)]">Seller Contact</h3>
              <div className="space-y-4">
                {[
                  { label: 'Name', value: seller?.full_name },
                  { label: 'Email', value: seller?.email },
                  { label: 'Phone', value: seller?.phone },
                ].map(field => (
                  <div key={field.label} className="space-y-1">
                    <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">{field.label}</p>
                    <p className="font-bold text-[var(--teal-900)] text-sm">{field.value || '—'}</p>
                  </div>
                ))}
              </div>
              {seller?.email && (
                <a
                  href={`mailto:${seller.email}`}
                  className="w-full h-12 rounded-xl border border-[var(--border)] flex items-center justify-center gap-2 text-[var(--muted)] hover:bg-[var(--teal-050)] font-bold text-sm transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">mail</span>
                  Email Seller
                </a>
              )}
            </Card>

            {/* Address card */}
            <Card className="p-6 space-y-3">
              <h3 className="text-sm font-black font-heading text-[var(--teal-900)] uppercase tracking-widest">Property Details</h3>
              <div className="space-y-2 text-sm">
                <p className="text-[var(--text)]">{addressDisplay}</p>
                {property.property_type && <p className="text-[var(--muted)]">{property.property_type} • {property.tenure}</p>}
                {property.bedrooms && <p className="text-[var(--muted)]">{property.bedrooms} bed · {property.bathrooms} bath</p>}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
