import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { templates } from '../lib/emailTemplates';

const STORAGE_PREFIX = 'hsr-pack-registered-';

function EpcGraphic({ rating }: { rating: string | null | undefined }) {
  const bands = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const r = (rating || '?').toUpperCase().trim().charAt(0);
  const idx = bands.indexOf(r);

  return (
    <div className="rounded-2xl border border-[var(--border)] overflow-hidden bg-white shadow-soft max-w-md">
      <div className="px-4 py-3 bg-[var(--teal-900)] text-white font-heading font-bold text-sm">Energy Performance Certificate</div>
      <div className="p-6 space-y-4">
        <div className="flex gap-1 h-36 items-end justify-center">
          {bands.map((b, i) => {
            const colors = ['#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444', '#b91c1c'];
            const h = 40 + i * 12;
            const active = idx === i;
            return (
              <div key={b} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t-md transition-all ${active ? 'ring-2 ring-[var(--teal-600)] ring-offset-2' : ''}`}
                  style={{ height: h, backgroundColor: colors[i], opacity: active ? 1 : 0.35 }}
                />
                <span className={`text-[10px] font-bold ${active ? 'text-[var(--teal-900)]' : 'text-[var(--muted)]'}`}>{b}</span>
              </div>
            );
          })}
        </div>
        <p className="text-center font-heading font-black text-3xl text-[var(--teal-900)]">
          Current rating: <span className="text-[var(--teal-600)]">{rating || '—'}</span>
        </p>
        <p className="text-xs text-[var(--muted)] text-center">
          Ratings are based on the property&apos;s energy efficiency. An EPC is required when selling.
        </p>
      </div>
    </div>
  );
}

export default function PublicPack() {
  const { token } = useParams<{ token: string }>();
  const [property, setProperty] = useState<any>(null);
  const [materialInfo, setMaterialInfo] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [agency, setAgency] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);

  const [viewerForm, setViewerForm] = useState({
    name: '',
    email: '',
    phone: '',
    is_selling: false,
    selling_location: '',
  });

  const loadPackDetails = useCallback(
    async (propertyId: string, sellerUserId: string | null) => {
      setDetailLoading(true);
      try {
        const { data: matInfo } = await supabase
          .from('material_information')
          .select('*')
          .eq('property_id', propertyId)
          .maybeSingle();

        const { data: docs } = await supabase.from('documents').select('*').eq('property_id', propertyId);

        let agencyData: any = null;
        if (sellerUserId) {
          const { data: sp } = await supabase.from('users').select('agency_id').eq('auth_user_id', sellerUserId).maybeSingle();
          if (sp?.agency_id) {
            const { data: ag } = await supabase.from('agencies').select('*').eq('id', sp.agency_id).maybeSingle();
            agencyData = ag;
          }
        }

        setMaterialInfo(matInfo);
        setDocuments(docs || []);
        setAgency(agencyData);
      } finally {
        setDetailLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    async function loadGate() {
      if (!token) return;

      try {
        const { data: share, error: shareError } = await supabase
          .from('shares')
          .select('*')
          .eq('token', token)
          .eq('active', true)
          .maybeSingle();

        if (shareError || !share) throw new Error('Property pack not found or link has been disabled.');

        const { error: viewErr } = await supabase.rpc('increment_share_view', { p_token: token });
        if (viewErr) {
          console.warn('increment_share_view (apply migration if missing):', viewErr.message);
        }

        const { data: prop, error: propError } = await supabase
          .from('properties')
          .select(
            'id, address, postcode, tenure, property_type, bedrooms, bathrooms, council_tax_band, heating, drainage, parking, building_changes, asking_price, epc_rating, updated_at, created_at, seller_user_id'
          )
          .eq('id', share.property_id)
          .maybeSingle();

        if (propError || !prop) throw new Error('Property pack could not be loaded.');

        setProperty(prop);

        const regKey = `${STORAGE_PREFIX}${token}`;
        if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(regKey)) {
          setIsRegistered(true);
          await loadPackDetails(prop.id, prop.seller_user_id);
        }
      } catch (err: unknown) {
        console.error('Error loading pack:', err);
        setProperty({ error: err instanceof Error ? err.message : 'Unknown error' });
      } finally {
        setLoading(false);
      }
    }

    loadGate();
  }, [token, loadPackDetails]);

  const openDocument = async (doc: any) => {
    if (!token) return;
    try {
      const res = await fetch('/api/sign-pack-document', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, documentId: doc.id }),
      });
      const json = await res.json();
      if (json.url) {
        window.open(json.url, '_blank', 'noopener,noreferrer');
        return;
      }
    } catch {
      /* fall through */
    }
    try {
      const { data, error } = await supabase.storage
        .from('property-documents')
        .createSignedUrl(doc.file_url, 60 * 60 * 24);
      if (!error && data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      else alert('Unable to download this document. Please try again later.');
    } catch {
      alert('Unable to download this document.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property?.id || property.error) return;
    setRegistering(true);

    try {
      const { error } = await supabase.from('pack_viewers').insert({
        property_id: property.id,
        viewer_name: viewerForm.name,
        viewer_email: viewerForm.email,
        viewer_phone: viewerForm.phone,
        viewed_at: new Date().toISOString(),
        is_selling: viewerForm.is_selling,
        selling_location: viewerForm.is_selling ? viewerForm.selling_location : null,
      } as any);

      if (error) throw error;

      const { data: sellerRow } = await supabase
        .from('users')
        .select('email, agency_id, full_name')
        .eq('auth_user_id', property.seller_user_id)
        .maybeSingle();

      let agencyName: string | undefined;
      const to: string[] = [];
      if (sellerRow?.email) to.push(sellerRow.email);
      if (sellerRow?.agency_id) {
        const { data: agencyRow } = await supabase
          .from('agencies')
          .select('agent_user_id, agency_name')
          .eq('id', sellerRow.agency_id)
          .maybeSingle();
        agencyName = agencyRow?.agency_name || undefined;
        if (agencyRow?.agent_user_id) {
          const { data: agentUser } = await supabase
            .from('users')
            .select('email')
            .eq('auth_user_id', agencyRow.agent_user_id)
            .maybeSingle();
          if (agentUser?.email) to.push(agentUser.email);
        }
      }
      const recipients = [...new Set(to.filter(Boolean))];

      const sellerName = sellerRow?.full_name || 'Seller';
      const propertyAddress = property.address || 'Property';

      const emailPayload = templates.viewerRegistration(
        sellerName,
        {
          full_name: viewerForm.name,
          email: viewerForm.email,
          phone: viewerForm.phone,
          is_selling: viewerForm.is_selling,
          selling_location: viewerForm.selling_location,
        },
        propertyAddress,
        agencyName
      );

      await fetch('/api/send-viewer-notification', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          to: recipients,
          subject: emailPayload.subject,
          html: emailPayload.html,
        }),
      });

      if (token) sessionStorage.setItem(`${STORAGE_PREFIX}${token}`, '1');
      setIsRegistered(true);
      await loadPackDetails(property.id, property.seller_user_id);
      window.scrollTo(0, 0);
    } catch (err) {
      console.error('Registration failed:', err);
      alert('Failed to register. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  const handlePrint = () => window.print();

  const epcRating = materialInfo?.epc_rating || property?.epc_rating;
  const lastUpdated = materialInfo?.updated_at || property?.updated_at || property?.created_at;

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--page)] flex items-center justify-center">
        <div className="animate-spin size-10 border-4 border-[var(--teal-600)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (property?.error || !property) {
    return (
      <div className="min-h-screen bg-[var(--page)] flex items-center justify-center p-6 text-[var(--muted)]">
        <Card className="p-12 text-center space-y-6 max-w-lg">
          <span className="material-symbols-outlined text-6xl text-[#fecaca]">lock</span>
          <h2 className="text-2xl font-black font-heading text-[var(--teal-900)]">Access denied</h2>
          <p className="max-w-xs mx-auto">
            {property?.error || 'This property pack link is invalid or has been disabled by the seller.'}
          </p>
        </Card>
      </div>
    );
  }

  const brandName = agency?.agency_name || 'HomeSalesReady';
  const brandLogo = agency?.logo_url;

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--text)] font-display pack-print-root">
      <header
        className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-xl border-b shadow-[0_2px_8px_rgba(13,74,74,0.04)] print:static print:break-inside-avoid"
        style={{
          borderColor: agency?.brand_colour ? `${agency.brand_colour}40` : 'var(--border)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {brandLogo ? (
              <img src={brandLogo} alt={brandName} className="h-9 w-auto max-w-[200px] object-contain" />
            ) : (
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-10 rounded-xl bg-[var(--teal-600)] flex items-center justify-center text-white shadow-soft shrink-0">
                  <span className="material-symbols-outlined font-black">real_estate_agent</span>
                </div>
                <span className="font-heading font-black text-lg sm:text-xl tracking-tight text-[var(--teal-900)] truncate">
                  {brandName}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isRegistered && (
              <>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--teal-050)] border border-[var(--border)]">
                  <span className="material-symbols-outlined text-[var(--teal-600)] text-sm">verified</span>
                  <span className="text-[10px] font-semibold text-[var(--teal-900)] uppercase tracking-widest">
                    Verified pack
                  </span>
                </div>
                <Button
                  onClick={handlePrint}
                  variant="outline"
                  className="h-10 px-4 rounded-xl text-xs font-semibold uppercase tracking-widest flex items-center gap-2 print:hidden"
                >
                  Print / PDF
                  <span className="material-symbols-outlined text-sm">print</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="pt-28 pb-24 px-6 max-w-4xl mx-auto print:pt-8">
        {!isRegistered ? (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="text-center space-y-4">
              <h1 className="text-3xl md:text-5xl font-black font-heading leading-tight tracking-tight text-[var(--teal-900)]">
                Access the property pack for <br />
                <span className="text-[var(--teal-600)]">{property.address}</span>
              </h1>
              <p className="text-[var(--muted)] text-lg max-w-xl mx-auto leading-relaxed">
                Please register your details to view material information and download verified documents.
              </p>
            </div>

            <Card className="p-10 md:p-12 rounded-[28px] relative overflow-hidden border-[var(--border)] shadow-soft">
              <div className="absolute top-0 right-0 size-64 bg-[var(--teal-050)] blur-[100px] pointer-events-none" />
              <form onSubmit={handleRegister} className="space-y-8 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-[0.2em]">Full name</label>
                    <input
                      required
                      type="text"
                      value={viewerForm.name}
                      onChange={(e) => setViewerForm({ ...viewerForm, name: e.target.value })}
                      className="w-full h-14 bg-white border border-[var(--border)] rounded-2xl px-5 text-sm text-[var(--text)] focus:border-[var(--teal-500)] outline-none transition-colors"
                      placeholder="Your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-[0.2em]">Email address</label>
                    <input
                      required
                      type="email"
                      value={viewerForm.email}
                      onChange={(e) => setViewerForm({ ...viewerForm, email: e.target.value })}
                      className="w-full h-14 bg-white border border-[var(--border)] rounded-2xl px-5 text-sm text-[var(--text)] focus:border-[var(--teal-500)] outline-none transition-colors"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-[0.2em]">Phone number</label>
                  <input
                    required
                    type="tel"
                    value={viewerForm.phone}
                    onChange={(e) => setViewerForm({ ...viewerForm, phone: e.target.value })}
                    className="w-full h-14 bg-white border border-[var(--border)] rounded-2xl px-5 text-sm text-[var(--text)] focus:border-[var(--teal-500)] outline-none transition-colors"
                    placeholder="e.g. 07123 456 789"
                  />
                </div>

                <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                  <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-[0.2em]">
                    Are you selling?
                  </p>
                  <div className="flex gap-4">
                    {[true, false].map((val) => (
                      <button
                        key={val ? 'yes' : 'no'}
                        type="button"
                        onClick={() => setViewerForm({ ...viewerForm, is_selling: val })}
                        className={`flex-1 h-14 rounded-2xl border text-sm font-bold font-heading transition-all ${
                          viewerForm.is_selling === val
                            ? 'bg-[var(--teal-600)] text-white border-[var(--teal-600)]'
                            : 'bg-white text-[var(--muted)] border-[var(--border)] hover:border-[var(--teal-500)]'
                        }`}
                      >
                        {val ? 'Yes' : 'No'}
                      </button>
                    ))}
                  </div>
                </div>

                {viewerForm.is_selling && (
                  <div className="space-y-2 animate-in fade-in duration-300">
                    <label className="text-[10px] font-semibold text-[var(--teal-600)] uppercase tracking-[0.2em]">
                      Where is your property?
                    </label>
                    <input
                      required={viewerForm.is_selling}
                      type="text"
                      value={viewerForm.selling_location}
                      onChange={(e) => setViewerForm({ ...viewerForm, selling_location: e.target.value })}
                      className="w-full h-14 bg-white border border-[var(--border)] rounded-2xl px-5 text-sm focus:border-[var(--teal-500)] outline-none"
                      placeholder="Town or area"
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={registering}
                  className="w-full h-16 rounded-2xl bg-[var(--teal-600)] text-white font-black font-heading text-lg shadow-soft hover:bg-[var(--teal-900)] transition-colors"
                >
                  {registering ? 'Opening pack…' : 'Register & view pack'}
                </Button>
              </form>
            </Card>
          </div>
        ) : detailLoading ? (
          <div className="flex justify-center py-24">
            <div className="animate-spin size-10 border-4 border-[var(--teal-600)] border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-16 animate-in fade-in duration-500 print:space-y-10">
            <div className="flex flex-wrap items-center gap-3 print:mb-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--teal-050)] border border-[var(--border)] text-[var(--teal-900)]">
                <span className="material-symbols-outlined text-[var(--teal-600)] text-lg">verified</span>
                <span className="text-xs font-bold font-heading uppercase tracking-widest">Verified information pack</span>
              </div>
              {lastUpdated && (
                <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-widest">
                  Last updated {new Date(lastUpdated).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              )}
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-black font-heading tracking-tight leading-none text-[var(--teal-900)]">
                {property.address}
              </h1>
              <p className="text-xl text-[var(--muted)]">{property.postcode}</p>
            </div>

            <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 print:grid-cols-5">
              {[
                { label: 'Type', value: property.property_type, icon: 'home' },
                { label: 'Tenure', value: property.tenure, icon: 'vpn_key' },
                { label: 'Bedrooms', value: property.bedrooms, icon: 'bed' },
                { label: 'Bathrooms', value: property.bathrooms, icon: 'bathtub' },
                { label: 'Council tax', value: property.council_tax_band ? `Band ${property.council_tax_band}` : '—', icon: 'receipt_long' },
              ].map((item) => (
                <Card key={item.label} className="p-5 border-[var(--border)] shadow-soft bg-white">
                  <span className="material-symbols-outlined text-[var(--teal-600)] text-2xl mb-2">{item.icon}</span>
                  <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">{item.label}</p>
                  <p className="font-heading font-bold text-[var(--teal-900)] text-lg leading-tight">{item.value ?? '—'}</p>
                </Card>
              ))}
            </section>

            <section className="space-y-6 print:break-inside-avoid">
              <h2 className="text-2xl font-black font-heading text-[var(--teal-900)] border-b border-[var(--border)] pb-3">
                Energy performance
              </h2>
              <EpcGraphic rating={epcRating} />
            </section>

            <section className="space-y-6 print:break-inside-avoid">
              <h2 className="text-2xl font-black font-heading text-[var(--teal-900)] border-b border-[var(--border)] pb-3">
                Material information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="p-6 space-y-4 border-[var(--border)] shadow-soft bg-white">
                  <h3 className="text-xs font-black text-[var(--teal-600)] uppercase tracking-[0.15em]">Services & utilities</h3>
                  <dl className="space-y-3 text-sm">
                    <div>
                      <dt className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wide">Heating</dt>
                      <dd className="text-[var(--text)] font-medium">{property.heating || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wide">Drainage</dt>
                      <dd className="text-[var(--text)] font-medium">{property.drainage || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wide">Water</dt>
                      <dd className="text-[var(--text)] font-medium">{materialInfo?.water_supply || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wide">Electricity</dt>
                      <dd className="text-[var(--text)] font-medium">{materialInfo?.electricity_supply || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wide">Broadband</dt>
                      <dd className="text-[var(--text)] font-medium">{materialInfo?.broadband_speed || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wide">Mobile signal</dt>
                      <dd className="text-[var(--text)] font-medium">{materialInfo?.mobile_signal || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wide">Parking</dt>
                      <dd className="text-[var(--text)] font-medium">{materialInfo?.parking || property.parking || '—'}</dd>
                    </div>
                  </dl>
                </Card>

                <Card className="p-6 space-y-4 border-[var(--border)] shadow-soft bg-white">
                  <h3 className="text-xs font-black text-[var(--teal-600)] uppercase tracking-[0.15em]">Risks & legal</h3>
                  <dl className="space-y-3 text-sm">
                    <div>
                      <dt className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wide">Flood risk</dt>
                      <dd className="text-[var(--text)] font-medium">{materialInfo?.flood_risk || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wide">Coastal erosion</dt>
                      <dd className="text-[var(--text)] font-medium">{materialInfo?.coastal_erosion || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wide">Coalfield area</dt>
                      <dd className="text-[var(--text)] font-medium">{materialInfo?.coalfield_area || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wide">Restrictions</dt>
                      <dd className="text-[var(--text)] font-medium">{materialInfo?.restrictions || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wide">Rights & easements</dt>
                      <dd className="text-[var(--text)] font-medium">{materialInfo?.rights_easements || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wide">Planning</dt>
                      <dd className="text-[var(--text)] font-medium">{materialInfo?.planning_permissions || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wide">Disputes</dt>
                      <dd className="text-[var(--text)] font-medium">{materialInfo?.disputes || '—'}</dd>
                    </div>
                  </dl>
                </Card>

                <Card className="p-6 space-y-4 border-[var(--border)] shadow-soft bg-white md:col-span-2">
                  <h3 className="text-xs font-black text-[var(--teal-600)] uppercase tracking-[0.15em]">Property changes</h3>
                  <p className="text-sm leading-relaxed text-[var(--text)]">{property.building_changes || 'None stated.'}</p>
                </Card>
              </div>
            </section>

            <section className="space-y-6 print:break-inside-avoid">
              <h2 className="text-2xl font-black font-heading text-[var(--teal-900)] border-b border-[var(--border)] pb-3">
                Documents
              </h2>
              {documents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documents.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => openDocument(doc)}
                      className="p-5 bg-white border border-[var(--border)] rounded-2xl flex items-center justify-between gap-4 text-left shadow-soft hover:bg-[var(--teal-050)] hover:border-[var(--teal-500)] transition-colors"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="size-12 rounded-xl bg-[var(--teal-050)] border border-[var(--border)] flex items-center justify-center text-[var(--teal-600)] shrink-0">
                          <span className="material-symbols-outlined">description</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[var(--teal-900)] truncate">{doc.name || doc.document_type}</p>
                          <p className="text-[10px] text-[var(--muted)] uppercase tracking-widest">
                            {doc.document_type || doc.category || 'Document'}
                          </p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-[var(--muted)] shrink-0">download</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[var(--muted)] text-sm">No documents uploaded yet.</p>
              )}
            </section>

            <Card className="p-8 border-[var(--border)] bg-[var(--teal-050)] rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 print:hidden">
              <div>
                <p className="text-[10px] font-bold text-[var(--teal-600)] uppercase tracking-[0.2em] mb-1">Estate agent</p>
                <h3 className="text-xl font-black font-heading text-[var(--teal-900)]">{brandName}</h3>
                <p className="text-sm text-[var(--muted)] mt-1">Contact the agent to arrange a viewing or make an offer.</p>
              </div>
            </Card>

            <footer className="pt-12 text-center text-[11px] text-[var(--muted)] font-semibold uppercase tracking-widest print:pt-6">
              {brandName} • Prepared for {property.address}
            </footer>
          </div>
        )}
      </main>
    </div>
  );
}
