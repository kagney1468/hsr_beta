import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface AgencySettings {
  agency_id?: string;
  name: string;
  logo_url: string;
  brand_colour: string;
  custom_domain: string;
}

const DEFAULT_COLOUR = '#00e5a0';

export default function AgentBranding() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<AgencySettings>({
    name: '',
    logo_url: '',
    brand_colour: DEFAULT_COLOUR,
    custom_domain: '',
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  // Load existing settings
  useEffect(() => {
    async function load() {
      if (!user) { setLoading(false); return; }
      try {
        const { data } = await supabase
          .from('agencies')
          .select('*')
          .eq('agent_user_id', user.id)
          .single();
        if (data) {
          setSettings({
            agency_id: data.agency_id,
            name: data.agency_name || '',
            logo_url: data.logo_url || '',
            brand_colour: data.brand_colour || DEFAULT_COLOUR,
            custom_domain: data.custom_domain || '',
          });
          if (data.logo_url) setLogoPreview(data.logo_url);
        }
      } catch {
        // No existing record — that's fine
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  function handleLogoSelect(file: File) {
    if (!file.type.startsWith('image/')) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = e => setLogoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleLogoSelect(file);
  }

  async function handleSave() {
    setSaving(true);
    setSaveStatus('idle');
    try {
      let logo_url = settings.logo_url;

      // Upload logo if a new file was selected
      if (logoFile && user) {
        const ext = logoFile.name.split('.').pop();
        const path = `${user.id}/logo.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('agency-logos')
          .upload(path, logoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('agency-logos')
          .getPublicUrl(path);
        logo_url = urlData.publicUrl;
      }

      const payload = {
        agent_user_id: user?.id,
        agency_name: settings.name,
        logo_url,
        brand_colour: settings.brand_colour,
        custom_domain: settings.custom_domain,
        updated_at: new Date().toISOString(),
      };

      if (settings.agency_id) {
        const { error } = await supabase
          .from('agencies')
          .update(payload)
          .eq('agency_id', settings.agency_id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('agencies')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        if (data) setSettings(s => ({ ...s, agency_id: data.agency_id, logo_url }));
      }

      setSettings(s => ({ ...s, logo_url }));
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 4000);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--accent)]"></div>
      </div>
    );
  }

  const brandColour = settings.brand_colour || DEFAULT_COLOUR;

  return (
    <>
      {/* Header */}
      <div className="px-6 md:px-9 pt-7 pb-6 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white font-heading">Branding</h2>
          <p className="text-sm text-[var(--muted)] mt-0.5">Customise your agency's look and white-label settings.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold font-heading text-sm transition-all shadow-lg ${
            saving
              ? 'bg-[var(--accent)]/50 text-black cursor-not-allowed'
              : saveStatus === 'success'
              ? 'bg-[#4caf7d] text-white shadow-[#4caf7d]/20'
              : saveStatus === 'error'
              ? 'bg-[var(--red)] text-white shadow-[var(--red)]/20'
              : 'bg-[var(--accent)] text-black hover:bg-[var(--accent)]/90 hover:scale-[1.02] active:scale-95 shadow-[var(--accent)]/20'
          }`}
        >
          {saving ? (
            <><span className="animate-spin inline-block w-4 h-4 border-2 border-black/30 border-t-black rounded-full"></span> Saving…</>
          ) : saveStatus === 'success' ? (
            <><span className="material-symbols-outlined text-[18px]">check_circle</span> Saved!</>
          ) : saveStatus === 'error' ? (
            <><span className="material-symbols-outlined text-[18px]">error</span> Failed</>
          ) : (
            <><span className="material-symbols-outlined text-[18px]">save</span> Save Settings</>
          )}
        </button>
      </div>

      {/* Body */}
      <div className="p-6 md:p-9">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 max-w-6xl">

          {/* ── LEFT: Settings Form ── */}
          <div className="space-y-6">

            {/* Agency Name */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="font-heading font-bold text-white text-base mb-0.5">Agency Details</h3>
                <p className="text-xs text-[var(--muted)]">Your agency identity shown across all seller portals.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Agency Name</label>
                <input
                  type="text"
                  value={settings.name}
                  onChange={e => setSettings(s => ({ ...s, name: e.target.value }))}
                  placeholder="e.g. Hargreaves & Co"
                  className="w-full bg-[var(--deep)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--muted)]/50 focus:outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/30 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Custom Domain</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-sm">https://</span>
                  <input
                    type="text"
                    value={settings.custom_domain}
                    onChange={e => setSettings(s => ({ ...s, custom_domain: e.target.value }))}
                    placeholder="portal.youragency.com"
                    className="w-full bg-[var(--deep)] border border-[var(--border)] rounded-xl pl-16 pr-4 py-3 text-sm text-white placeholder:text-[var(--muted)]/50 focus:outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/30 transition-colors"
                  />
                </div>
                <p className="text-[11px] text-[var(--muted)] mt-1.5">Point your domain's CNAME to <span className="text-[var(--accent)] font-mono">portal.homesalesready.com</span></p>
              </div>
            </div>

            {/* Logo Upload */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="font-heading font-bold text-white text-base mb-0.5">Agency Logo</h3>
                <p className="text-xs text-[var(--muted)]">Displayed in the seller portal header and emails. PNG or SVG recommended.</p>
              </div>

              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                  isDragging
                    ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                    : 'border-[var(--border)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/3'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handleLogoSelect(e.target.files[0]); }}
                />
                {logoPreview ? (
                  <div className="flex flex-col items-center gap-3">
                    <img src={logoPreview} alt="Logo preview" className="h-16 w-auto object-contain rounded-lg" />
                    <span className="text-xs text-[var(--accent)] font-medium">Click or drag to replace</span>
                  </div>
                ) : (
                  <>
                    <div className="size-12 rounded-xl bg-[var(--deep)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)]">
                      <span className="material-symbols-outlined text-2xl">upload_file</span>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-white">Drop your logo here</p>
                      <p className="text-xs text-[var(--muted)] mt-0.5">or click to browse — PNG, SVG, JPG up to 5MB</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Brand Colour */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="font-heading font-bold text-white text-base mb-0.5">Brand Colour</h3>
                <p className="text-xs text-[var(--muted)]">Used for buttons, accents, and progress indicators in the seller portal.</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <input
                    type="color"
                    value={brandColour}
                    onChange={e => setSettings(s => ({ ...s, brand_colour: e.target.value }))}
                    className="w-14 h-14 rounded-xl border border-[var(--border)] cursor-pointer bg-transparent p-1"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <input
                    type="text"
                    value={brandColour}
                    onChange={e => {
                      const v = e.target.value;
                      if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setSettings(s => ({ ...s, brand_colour: v }));
                    }}
                    maxLength={7}
                    className="w-full bg-[var(--deep)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/30 transition-colors"
                  />
                  <p className="text-[11px] text-[var(--muted)] pl-1">Enter a hex colour value</p>
                </div>
                {/* Swatch row */}
                <div className="flex gap-2">
                  {['#00e5a0', '#0066ff', '#ff4545', '#ffaa00', '#a855f7', '#ec4899'].map(c => (
                    <button
                      key={c}
                      onClick={() => setSettings(s => ({ ...s, brand_colour: c }))}
                      title={c}
                      className={`size-7 rounded-lg border-2 transition-transform hover:scale-110 ${brandColour === c ? 'border-white' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* ── RIGHT: Live Preview ── */}
          <div className="xl:sticky xl:top-8 space-y-4 self-start">
            <div>
              <h3 className="font-heading font-bold text-white text-base mb-0.5">Live Preview</h3>
              <p className="text-xs text-[var(--muted)]">Updates as you type.</p>
            </div>

            {/* Sidebar Preview */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xl">
              <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
                <div className="size-2.5 rounded-full bg-[var(--red)]/60"></div>
                <div className="size-2.5 rounded-full bg-[var(--amber)]/60"></div>
                <div className="size-2.5 rounded-full bg-[#4caf7d]/60"></div>
                <span className="ml-2 text-[10px] text-[var(--muted)] font-mono">portal.{settings.custom_domain || 'youragency.com'}</span>
              </div>
              <div className="flex">
                {/* Mini sidebar */}
                <div className="w-[160px] bg-[var(--deep)] border-r border-[var(--border)] p-3 flex flex-col gap-1">
                  {/* Brand block */}
                  <div
                    className="rounded-lg p-2.5 mb-2 text-center"
                    style={{ background: `${brandColour}0d`, border: `1px solid ${brandColour}26` }}
                  >
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="h-7 w-auto object-contain mx-auto mb-1" />
                    ) : (
                      <div className="h-7 flex items-center justify-center">
                        <span className="material-symbols-outlined text-base" style={{ color: brandColour }}>real_estate_agent</span>
                      </div>
                    )}
                    <div className="text-[10px] font-black font-heading text-white leading-tight truncate">
                      {settings.name || 'Your Agency'}
                    </div>
                    <div className="text-[8px] mt-0.5" style={{ color: brandColour }}>Estate Agent Portal</div>
                  </div>

                  {/* Nav items */}
                  {['home_work', 'warning', 'check_circle'].map((icon, i) => (
                    <div
                      key={icon}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px]"
                      style={i === 0 ? { background: `${brandColour}1a`, color: brandColour } : { color: 'var(--muted)' }}
                    >
                      <span className="material-symbols-outlined text-[12px]">{icon}</span>
                      {['All Properties', 'Action Required', 'Packs Complete'][i]}
                    </div>
                  ))}
                </div>

                {/* Mini main panel */}
                <div className="flex-1 p-3">
                  {/* Fake KPIs */}
                  <div className="grid grid-cols-2 gap-1.5 mb-3">
                    {[
                      { label: 'Active', value: '8' },
                      { label: 'Complete', value: '3' },
                    ].map(k => (
                      <div key={k.label} className="bg-[var(--deep)] border border-[var(--border)] rounded-lg p-2">
                        <div className="text-[8px] text-[var(--muted)]">{k.label}</div>
                        <div className="font-heading font-black text-lg text-white leading-none mt-0.5">{k.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Fake table rows */}
                  <div className="bg-[var(--deep)] border border-[var(--border)] rounded-lg overflow-hidden">
                    {[
                      { addr: '14 Maple Close', pct: 60 },
                      { addr: '7 Victoria Rd', pct: 100 },
                      { addr: '32 Clifton Down', pct: 20 },
                    ].map(r => (
                      <div key={r.addr} className="flex items-center gap-2 px-2.5 py-2 border-b border-[var(--border)] last:border-b-0">
                        <div className="flex-1 text-[9px] text-white truncate">{r.addr}</div>
                        <div className="flex items-center gap-1 w-14">
                          <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${r.pct}%`, backgroundColor: r.pct === 100 ? brandColour : r.pct >= 50 ? 'var(--amber)' : 'var(--red)' }}></div>
                          </div>
                          <span className="text-[8px] text-[var(--muted)]">{r.pct}%</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* CTA button preview */}
                  <div className="mt-3">
                    <div
                      className="w-full py-1.5 rounded-lg text-[10px] font-bold font-heading text-center cursor-default"
                      style={{ backgroundColor: brandColour, color: '#000' }}
                    >
                      + Add Property
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Colour swatch preview */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-4">
              <div className="size-12 rounded-xl flex-shrink-0 shadow-lg" style={{ backgroundColor: brandColour, boxShadow: `0 8px 24px ${brandColour}40` }}></div>
              <div>
                <div className="text-sm font-bold text-white">{brandColour.toUpperCase()}</div>
                <div className="text-xs text-[var(--muted)] mt-0.5">Active brand colour</div>
              </div>
              <div className="ml-auto text-xs text-[var(--muted)] font-mono px-2 py-1 bg-[var(--deep)] rounded-lg border border-[var(--border)]">
                {settings.name || 'Your Agency'}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
