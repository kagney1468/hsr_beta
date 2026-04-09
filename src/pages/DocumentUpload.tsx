import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { SIGNED_DOCUMENT_URL_TTL_SECONDS } from '../lib/storageSignedUrl';
import { getPublicUserIdByAuthUserId } from '../lib/publicUser';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Tooltip } from '../components/ui/Tooltip';
import { updatePackCompletion, isLeaseholdTenure } from '../lib/completion';

interface Document {
  id: string;
  property_id: string;
  document_type: string;
  name: string;
  file_url: string;
  status: string;
  uploaded_at: string;
}

const ACCEPTED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ACCEPTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const categories = [
  {
    id: 'title_deeds',
    label: 'Title Deeds',
    tooltip: 'Proves you legally own the property and have the right to sell it. Solicitors need this on day one — having it ready prevents weeks of delay.',
    required: true,
  },
  {
    id: 'epc',
    label: 'EPC Certificate',
    tooltip: 'Legally required to market your property. Shows energy efficiency rating from A–G. Buyers and mortgage lenders both check this.',
    required: true,
  },
  {
    id: 'building_regs',
    label: 'Building Regulations Certificates',
    tooltip: 'Confirms any extensions, conversions or structural works were approved by the local authority. Missing certificates can delay or kill a sale.',
    required: false,
  },
  {
    id: 'warranties',
    label: 'Warranties and Guarantees',
    tooltip: 'Provides buyer peace of mind for recent works such as a new boiler, roof, or windows. Transferable guarantees can be a selling point.',
    required: false,
  },
  {
    id: 'leasehold',
    label: 'Leasehold Documents',
    tooltip: 'Crucial for flats and leasehold houses. Contains the lease, service charge accounts, ground rent details, and management pack.',
    required: true,
    condition: (p: any) => isLeaseholdTenure(p?.tenure),
  },
  {
    id: 'planning',
    label: 'Planning Permissions',
    tooltip: 'Shows that extensions or changes to the property were legally approved by the council. Buyers\'s solicitors will request these.',
    required: false,
  },
  {
    id: 'gas_safety',
    label: 'Gas Safety Certificate',
    tooltip: 'Shows the boiler and all gas appliances are safe and have been maintained. Reassures buyers about ongoing safety and costs.',
    required: false,
  },
  {
    id: 'electrical',
    label: 'Electrical Installation Certificate',
    tooltip: 'Confirms the wiring and electrical systems are safe and up to standard. Required for any electrical work done since 2005.',
    required: false,
  },
];

export default function DocumentUpload() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [property, setProperty] = useState<any>(null);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [noProperty, setNoProperty] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    async function init() {
      if (!user) return;
      setLoading(true);
      try {
        const publicUserId = await getPublicUserIdByAuthUserId(user.id);
        const { data: propData, error: propError } = await supabase
          .from('properties')
          .select('*')
          .eq('seller_user_id', publicUserId)
          .single();

        if (propError || !propData) {
          setNoProperty(true);
          setLoading(false);
          return;
        }

        setProperty(propData);
        setPropertyId(propData.id);
      } catch (err) {
        console.error('Error initializing:', err);
        setError('Failed to load property details.');
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [user]);

  useEffect(() => {
    if (propertyId) {
      loadDocuments();
    }
  }, [propertyId]);

  const loadDocuments = async () => {
    if (!propertyId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('property_id', propertyId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments((data || []) as Document[]);
    } catch (err: any) {
      console.error('Error loading documents:', err);
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user || !propertyId) return;

    setError(null);
    setSuccessMessage(null);

    // Validate all files before uploading any
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();

      if (!ACCEPTED_MIME_TYPES.includes(file.type) && !ACCEPTED_EXTENSIONS.includes(ext)) {
        setError(`"${file.name}" is not a supported file type. Please upload PDF, JPG, or PNG only.`);
        if (fileInputRefs.current[type]) fileInputRefs.current[type]!.value = '';
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError(`"${file.name}" exceeds the 10MB size limit. Please compress or use a smaller file.`);
        if (fileInputRefs.current[type]) fileInputRefs.current[type]!.value = '';
        return;
      }
    }

    setUploadProgress(prev => ({ ...prev, [type]: 0 }));

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        const safeName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
        const filePath = `${propertyId}/${safeName}`;

        setUploadProgress(prev => ({ ...prev, [type]: 40 }));

        const { error: uploadError } = await supabase.storage
          .from('property-documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        setUploadProgress(prev => ({ ...prev, [type]: 75 }));

        const { error: dbError } = await supabase
          .from('documents')
          .insert({
            property_id: propertyId,
            document_type: type,
            name: file.name,
            file_url: filePath,
            status: 'uploaded',
            uploaded_at: new Date().toISOString(),
          });

        if (dbError) throw dbError;
      }

      setUploadProgress(prev => ({ ...prev, [type]: 100 }));
      setSuccessMessage('Document uploaded successfully.');
      await updatePackCompletion(propertyId);

      setTimeout(() => {
        setUploadProgress(prev => {
          const next = { ...prev };
          delete next[type];
          return next;
        });
        setSuccessMessage(null);
      }, 2500);

      await loadDocuments();
    } catch (err: any) {
      console.error('Error uploading document:', err);
      setError(err.message || 'Upload failed. Please try again.');
      setUploadProgress(prev => {
        const next = { ...prev };
        delete next[type];
        return next;
      });
    } finally {
      if (fileInputRefs.current[type]) fileInputRefs.current[type]!.value = '';
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!user || !window.confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;

    setError(null);
    try {
      const { error: storageError } = await supabase.storage
        .from('property-documents')
        .remove([doc.file_url]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

      await updatePackCompletion(propertyId!);
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
    } catch (err: any) {
      console.error('Error deleting document:', err);
      setError(err.message || 'Failed to delete document. Please try again.');
    }
  };

  const handleView = async (doc: Document) => {
    setError(null);
    try {
      const { data, error } = await supabase.storage
        .from('property-documents')
        .createSignedUrl(doc.file_url, SIGNED_DOCUMENT_URL_TTL_SECONDS);

      if (error) throw error;

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      } else {
        throw new Error('Could not generate a secure link for this document.');
      }
    } catch (err: any) {
      console.error('Error viewing document:', err);
      setError(err.message || 'Failed to open document. Please try again.');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  if (noProperty) {
    return (
      <div className="p-10 text-center">
        <Card className="p-12">
          <span className="material-symbols-outlined text-4xl text-amber-500 mb-4">warning</span>
          <h2 className="text-2xl font-black font-heading mb-2">Property Profile Required</h2>
          <p className="text-[var(--muted)] mb-6">Please complete the property details before uploading documents.</p>
          <Button variant="primary" onClick={() => navigate('/seller/property')}>Go to Property Details</Button>
        </Card>
      </div>
    );
  }

  const visibleCategories = categories.filter(c => !c.condition || c.condition(property));

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black font-heading text-[var(--teal-900)] tracking-tight">Property documents</h1>
        <p className="text-[var(--muted)]">Upload all required certificates and legal documents for your verified pack.</p>
      </div>

      {successMessage && (
        <div className="p-4 bg-[#d1fae5] border border-[#a7f3d0] text-[#065f46] rounded-xl font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-base">check_circle</span>
          {successMessage}
        </div>
      )}
      {error && (
        <div className="p-4 bg-[#fee2e2] border border-[#fecaca] text-[#b91c1c] rounded-xl font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-base">error</span>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {visibleCategories.map(category => {
          const catDocs = documents.filter(d => d.document_type === category.id);
          const hasDoc = catDocs.length > 0;
          const isUploading = uploadProgress[category.id] !== undefined;
          const progress = uploadProgress[category.id] || 0;

          return (
            <Card key={category.id} className="p-6 flex flex-col justify-between h-full group transition-colors hover:bg-[var(--teal-050)]">
              <div className="space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-[var(--teal-900)]">{category.label}</h3>
                    <Tooltip content={category.tooltip}>
                      <span className="material-symbols-outlined text-[var(--muted)] text-sm cursor-help hover:text-[var(--teal-600)] transition-colors">help</span>
                    </Tooltip>
                  </div>
                  {hasDoc ? (
                    <span className="bg-[#d1fae5] text-[#059669] border border-[#a7f3d0] text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded-full flex items-center gap-1 shrink-0">
                      <span className="material-symbols-outlined text-xs">check_circle</span>
                      Uploaded
                    </span>
                  ) : category.required ? (
                    <span className="bg-[#fee2e2] text-[#dc2626] border border-[#fecaca] text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded-full flex items-center gap-1 shrink-0">
                      Action Required
                    </span>
                  ) : null}
                </div>

                <div className="space-y-3">
                  {catDocs.map(doc => (
                    <div key={doc.id} className="p-3 bg-white border border-[var(--border)] rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3 truncate">
                        <span className="material-symbols-outlined text-[var(--teal-600)] shrink-0">description</span>
                        <div className="truncate">
                          <p className="text-sm font-semibold text-[var(--teal-900)] truncate">{doc.name}</p>
                          <p className="text-[10px] text-[var(--muted)] uppercase tracking-widest">{formatDate(doc.uploaded_at)}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 ml-4 shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); handleView(doc); }}
                          title="View document"
                          className="size-8 flex items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--teal-050)] hover:text-[var(--teal-600)] transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(doc); }}
                          title="Delete document"
                          className="size-8 flex items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[#fee2e2] hover:text-[#dc2626] transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-[var(--border)]">
                {isUploading ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-[var(--muted)] font-semibold uppercase tracking-widest">
                      <span>Uploading…</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-[var(--teal-050)] border border-[var(--border)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--teal-600)] transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <input
                      ref={el => { fileInputRefs.current[category.id] = el; }}
                      type="file"
                      id={`file-${category.id}`}
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={e => handleFileUpload(e, category.id)}
                    />
                    <label
                      htmlFor={`file-${category.id}`}
                      className="w-full flex items-center justify-center h-12 rounded-xl border border-dashed border-[var(--border)] text-[var(--muted)] text-sm font-semibold hover:border-[var(--teal-500)] hover:text-[var(--teal-600)] hover:bg-[var(--teal-050)] transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined mr-2">upload_file</span>
                      {hasDoc ? 'Upload Another' : 'Browse Files'}
                    </label>
                    <p className="text-[10px] text-[var(--muted)] text-center mt-2 uppercase tracking-widest">PDF, JPG or PNG · Max 10MB</p>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-between items-center pt-8 border-t border-[var(--border)]">
        <Button variant="ghost" onClick={() => navigate('/seller/property')}>Back to Property</Button>
        <Button variant="primary" onClick={() => navigate('/seller/declaration')}>Continue to Final Step</Button>
      </div>
    </div>
  );
}
