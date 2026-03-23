import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface Document {
  id: string;
  property_id: string;
  document_type: string;
  file_name: string;
  storage_path: string;
  uploaded_at: string;
}

export default function DocumentUpload() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('Land Registry');
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [noProperty, setNoProperty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs = [
    'Land Registry',
    'EPC certificate',
    'Gas safety',
    'Electrical / EICR',
    'Planning Docs',
    'Warranties',
    'FENSA',
    'Other'
  ];

  useEffect(() => {
    async function init() {
      if (!user) return;
      setLoading(true);
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
  }, [propertyId, activeTab]);

  const loadDocuments = async () => {
    if (!propertyId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('property_id', propertyId)
        .eq('document_type', activeTab)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments((data || []).map(d => ({
        ...d,
        file_name: d.name || 'Untitled',
        storage_path: d.file_url || '',
        uploaded_at: d.created_at
      })) as any);
    } catch (err: any) {
      console.error('Error loading documents:', err);
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user || !propertyId) return;

    setUploading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`File ${file.name} exceeds 10MB limit`);
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${propertyId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('property-documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase
          .from('documents')
          .insert({
            property_id: propertyId,
            document_type: activeTab,
            file_name: file.name,
            storage_path: filePath,
            uploaded_at: new Date().toISOString()
          });

        if (dbError) throw dbError;
      }
      
      setSuccessMessage('Documents uploaded successfully!');
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
    if (!user || !window.confirm(`Are you sure you want to delete ${doc.file_name}?`)) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('property-documents')
        .remove([doc.storage_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

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
        .createSignedUrl(doc.storage_path, 60);

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
        <Card className="p-12 border-white/5 bg-zinc-900 shadow-2xl">
          <span className="material-symbols-outlined text-4xl text-amber-500 mb-4">warning</span>
          <h2 className="text-2xl font-black font-heading mb-2">Property Profile Required</h2>
          <p className="text-zinc-400 mb-6">Please complete the property details before uploading documents.</p>
          <Button variant="primary" onClick={() => navigate('/seller/property')}>Go to Property Details</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black font-heading text-white tracking-tight">Step 2: Property Documents</h1>
        <p className="text-zinc-400">Upload all required certificates and legal documents for your verified pack.</p>
      </div>

      {successMessage && <div className="p-4 bg-green-900/20 border border-green-800 text-green-400 rounded-xl font-bold">{successMessage}</div>}
      {error && <div className="p-4 bg-red-900/20 border border-red-800 text-red-400 rounded-xl font-bold">{error}</div>}

      <div className="flex flex-wrap gap-2 p-1 bg-zinc-950 border border-white/5 rounded-2xl">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === tab 
                ? 'bg-[#00e5a0] text-black shadow-lg shadow-[#00e5a0]/20' 
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <Card className="p-0 border-white/5 bg-zinc-900 overflow-hidden shadow-2xl">
        <div 
          className="p-16 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors border-b border-white/5"
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            multiple 
            accept=".pdf,.jpg,.jpeg,.png"
          />
          <div className="size-16 bg-[#00e5a0]/10 text-[#00e5a0] flex items-center justify-center rounded-2xl border border-[#00e5a0]/20">
            <span className="material-symbols-outlined text-3xl">
              {uploading ? 'cloud_sync' : 'upload_file'}
            </span>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold text-white mb-1">{uploading ? 'Processing Upload...' : `Upload ${activeTab}`}</h3>
            <p className="text-zinc-500 text-sm">Drag and drop or click to browse (Max 10MB per file)</p>
          </div>
        </div>

        <div className="p-6 bg-black/20">
          <h4 className="text-[10px] uppercase tracking-widest font-black text-zinc-600 mb-4 px-2">Uploaded in this Category</h4>
          
          {loading ? (
            <div className="p-8 text-center animate-pulse text-zinc-500 italic">Syncing with cloud...</div>
          ) : documents.length === 0 ? (
            <div className="p-12 text-center text-zinc-600 border border-dashed border-white/5 rounded-2xl italic text-sm">
              No files uploaded for {activeTab} yet.
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map(doc => (
                <div key={doc.id} className="group flex items-center justify-between p-4 bg-zinc-900 border border-white/5 rounded-2xl hover:border-[#00e5a0]/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="size-10 bg-white/5 rounded-xl flex items-center justify-center text-zinc-500 group-hover:bg-[#00e5a0]/10 group-hover:text-[#00e5a0] transition-colors">
                      <span className="material-symbols-outlined">description</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{doc.file_name}</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{formatDate(doc.uploaded_at)}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleView(doc)} className="size-9 flex items-center justify-center rounded-lg text-zinc-500 hover:bg-[#00e5a0]/10 hover:text-[#00e5a0] transition-all">
                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                    </button>
                    <button onClick={() => handleDelete(doc)} className="size-9 flex items-center justify-center rounded-lg text-zinc-500 hover:bg-red-500/10 hover:text-red-500 transition-all">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <div className="flex justify-between items-center pt-8 border-t border-white/5">
        <Button variant="ghost" onClick={() => navigate('/seller/property')}>Back to Property</Button>
        <Button variant="primary" onClick={() => navigate('/seller/declaration')}>Continue to Final Step</Button>
      </div>
    </div>
  );
}
