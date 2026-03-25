import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { SIGNED_DOCUMENT_URL_TTL_SECONDS } from '../lib/storageSignedUrl';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Tooltip } from '../components/ui/Tooltip';
import { updatePackCompletion } from '../lib/completion';

interface Document {
  id: string;
  property_id: string;
  document_type: string;
  name: string;
  file_url: string;
  created_at: string;
}

export default function DocumentUpload() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('');
  const [property, setProperty] = useState<any>(null);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [noProperty, setNoProperty] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    { id: 'Title Deeds', tooltip: 'Proves you legally own the property and have the right to sell it.', required: true },
    { id: 'EPC Certificate', tooltip: 'Legally required to market the property. Shows energy efficiency.', required: true },
    { id: 'Building Regulations Certificates', tooltip: 'Proves any alterations meet safety standards.', required: false },
    { id: 'Warranties and Guarantees', tooltip: 'Provides buyer peace of mind for recent works like a new boiler or roof.', required: false },
    { id: 'Leasehold Documents', tooltip: 'Crucial for flats. Contains the lease, service charges, and ground rent details.', required: true, condition: (p: any) => p?.tenure === 'Leasehold' },
    { id: 'Planning Permissions', tooltip: 'Shows that extensions or changes to the property were legally approved.', required: false },
    { id: 'Gas Safety Certificate', tooltip: 'Shows boiler and gas appliances are safe and maintained.', required: false },
    { id: 'Electrical Installation Certificate', tooltip: 'Shows the wiring and electrical systems are safe.', required: false }
  ];



  useEffect(() => {
    async function init() {
      if (!user) return;
      setLoading(true);
      try {
        const { data: propData, error: propError } = await supabase
          .from('properties')
          .select('*')
          .eq('seller_user_id', user.id)
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments((data || []) as any);
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

    setUploading(true);
    setError(null);
    setSuccessMessage(null);
    setUploadProgress(prev => ({ ...prev, [type]: 0 }));

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`File ${file.name} exceeds 10MB limit`);
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${propertyId}/${fileName}`;

        setUploadProgress(prev => ({ ...prev, [type]: 50 }));

        const { error: uploadError } = await supabase.storage
          .from('property-documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;
        
        setUploadProgress(prev => ({ ...prev, [type]: 80 }));

        const { error: dbError } = await supabase
          .from('documents')
          .insert({
            property_id: propertyId,
            document_type: type,
            name: file.name,
            file_url: filePath,
            created_at: new Date().toISOString()
          });

        if (dbError) throw dbError;
      }
      
      await updatePackCompletion(propertyId);
      
      setUploadProgress(prev => ({ ...prev, [type]: 100 }));
      setSuccessMessage('Documents uploaded successfully!');
      setTimeout(() => setUploadProgress(prev => { const newP = {...prev}; delete newP[type]; return newP; }), 2000);
      loadDocuments();
    } catch (err: any) {
      console.error('Error uploading document:', err);
      setError(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!user || !window.confirm(`Are you sure you want to delete ${doc.name}?`)) return;

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

      setDocuments(documents.filter(d => d.id !== doc.id));
    } catch (err: any) {
      console.error('Error deleting document:', err);
      setError(err.message || 'Failed to delete document');
    }
  };

  const handleView = async (doc: Document) => {
    try {
      setError(null);
      const { data, error } = await supabase.storage
        .from('property-documents')
        .createSignedUrl(doc.file_url, SIGNED_DOCUMENT_URL_TTL_SECONDS);

      if (error) throw error;
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      } else {
        throw new Error('Could not generate secure link');
      }
    } catch (err: any) {
      console.error('Error viewing document:', err);
      setError(err.message || 'Failed to open document');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
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

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black font-heading text-[var(--teal-900)] tracking-tight">Property documents</h1>
        <p className="text-[var(--muted)]">Upload all required certificates and legal documents for your verified pack.</p>
      </div>

      {successMessage && <div className="p-4 bg-[#d1fae5] border border-[#a7f3d0] text-[#065f46] rounded-xl font-semibold">{successMessage}</div>}
      {error && <div className="p-4 bg-[#fee2e2] border border-[#fecaca] text-[#b91c1c] rounded-xl font-semibold">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.filter(c => !c.condition || c.condition(property)).map(category => {
          const catDocs = documents.filter(d => d.document_type === category.id);
          const hasDoc = catDocs.length > 0;
          const isUploading = uploadProgress[category.id] !== undefined;
          const progress = uploadProgress[category.id] || 0;

          return (
            <Card key={category.id} className="p-6 flex flex-col justify-between h-full group transition-colors hover:bg-[var(--teal-050)]">
              <div className="space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-[var(--teal-900)]">{category.id}</h3>
                    <Tooltip content={category.tooltip}>
                      <span className="material-symbols-outlined text-[var(--muted)] text-sm cursor-help hover:text-[var(--teal-600)] transition-colors">help</span>
                    </Tooltip>
                  </div>
                  {hasDoc ? (
                    <span className="bg-[#d1fae5] text-[#059669] border border-[#a7f3d0] text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded-full flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">check_circle</span>
                      Uploaded
                    </span>
                  ) : category.required ? (
                    <span className="bg-[#fee2e2] text-[#dc2626] border border-[#fecaca] text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded-full flex items-center gap-1">
                      Action Required
                    </span>
                  ) : (
                    <span className="bg-[var(--teal-050)] text-[var(--teal-900)] border border-[var(--border)] text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded-full flex items-center gap-1">
                      Optional
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {catDocs.map(doc => (
                    <div key={doc.id} className="p-3 bg-white border border-[var(--border)] rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3 truncate">
                        <span className="material-symbols-outlined text-[var(--teal-600)]">description</span>
                        <div className="truncate">
                          <p className="text-sm font-semibold text-[var(--teal-900)] truncate">{doc.name}</p>
                          <p className="text-[10px] text-[var(--muted)] uppercase tracking-widest">{formatDate(doc.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 ml-4 shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); handleView(doc); }} className="size-8 flex items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--teal-050)] hover:text-[var(--teal-600)] transition-colors">
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(doc); }} className="size-8 flex items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[#fee2e2] hover:text-[#dc2626] transition-colors">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-[var(--border)] relative">
                {isUploading ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-[var(--muted)] font-semibold uppercase tracking-widest">
                      <span>Uploading...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-[var(--teal-050)] border border-[var(--border)] rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--teal-600)] transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                ) : (
                  <div>
                    <input 
                      type="file" 
                      id={`file-${category.id}`}
                      className="hidden" 
                      multiple 
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(e, category.id)}
                    />
                    <label 
                      htmlFor={`file-${category.id}`}
                      className="w-full flex items-center justify-center h-12 rounded-xl border border-dashed border-[var(--border)] text-[var(--muted)] text-sm font-semibold hover:border-[var(--teal-500)] hover:text-[var(--teal-600)] hover:bg-[var(--teal-050)] transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined mr-2">upload_file</span>
                      {hasDoc ? 'Upload Another File' : 'Browse Files'}
                    </label>
                  </div>
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
