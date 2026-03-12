import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('EPC certificate');
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [noProperty, setNoProperty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs = [
    'EPC certificate',
    'Gas safety certificate',
    'Electrical certificate / EICR',
    'Planning / building regulation documents',
    'Guarantees and warranties',
    'FENSA / glazing certificates',
    'Seller property notes',
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
      setDocuments(data || []);
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
        
        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`File ${file.name} exceeds 10MB limit`);
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${propertyId}/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('property-documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Save metadata to database
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
      // Reload documents
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
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('property-documents')
        .remove([doc.storage_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

      // Update state
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
        .createSignedUrl(doc.storage_path, 60); // 60 seconds expiry

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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (noProperty) {
    return (
      <div className="flex flex-col max-w-[960px] flex-1 gap-6 p-10">
        <div className="p-6 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg shadow-sm">
          <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined">warning</span>
            Property Profile Required
          </h2>
          <p className="mb-4">Please complete the property details before uploading documents.</p>
          <Link to="/seller/property" className="inline-block px-4 py-2 bg-primary text-white rounded font-bold text-sm hover:bg-primary/90 transition-colors">
            Go to Property Details
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col max-w-[960px] flex-1 gap-6">
      {/* Progress Section */}
      <div className="flex flex-col gap-3 p-6 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-primary/10">
        <div className="flex gap-6 justify-between items-center">
          <p className="text-slate-900 dark:text-slate-100 text-base font-bold leading-normal">Profile Completion</p>
          <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full tracking-wider uppercase">75% Complete</span>
        </div>
        <div className="rounded-full bg-primary/10 h-3 w-full overflow-hidden">
          <div className="h-full rounded-full bg-primary" style={{ width: '75%' }}></div>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal">Only a few documents left to be market-ready.</p>
      </div>

      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
          {error}
        </div>
      )}

      {/* Title & Tabs */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-slate-900 dark:text-slate-100 tracking-tight text-3xl font-bold leading-tight">Property Documents</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-normal">Organize and upload legal paperwork required for the sale process.</p>
        </div>
        <div className="border-b border-primary/10 overflow-x-auto">
          <div className="flex px-2 gap-1 min-w-max p-1 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center justify-center px-4 py-2 rounded-md transition-colors ${
                  activeTab === tab 
                    ? 'bg-white dark:bg-slate-900 text-primary shadow-sm border border-primary/10' 
                    : 'text-slate-500 hover:text-primary'
                }`}
              >
                <span className="text-xs font-bold tracking-wide uppercase">{tab}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div className="flex flex-col bg-white dark:bg-slate-900 rounded-lg border border-primary/10 shadow-sm">
        <div 
          className="flex flex-col items-center gap-4 border-2 border-dashed border-primary/20 bg-slate-50/50 dark:bg-slate-800/30 m-3 px-6 py-10 rounded-lg hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer"
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
          <div className="size-12 bg-primary/10 text-primary flex items-center justify-center rounded-lg">
            <span className="material-symbols-outlined text-2xl">
              {uploading ? 'hourglass_empty' : 'upload_file'}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-slate-900 dark:text-slate-100 text-base font-semibold">
              {uploading ? 'Uploading...' : `Upload ${activeTab} Documents`}
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Select multiple files (PDF, JPG, PNG) • Max 10MB each</p>
          </div>
          <button 
            disabled={uploading}
            className="mt-2 px-6 py-2 bg-primary text-white text-xs font-bold uppercase tracking-wider rounded border border-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {uploading ? 'Please wait...' : 'Browse Files'}
          </button>
        </div>
      </div>

      {/* Uploaded Files List */}
      <div className="flex flex-col gap-4">
        <h3 className="text-slate-900 dark:text-slate-100 text-xs font-bold uppercase tracking-widest px-1 text-slate-500">
          Uploaded {activeTab} Docs
        </h3>
        
        {loading ? (
          <div className="p-8 text-center text-slate-500 animate-pulse">Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center text-slate-500 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
            No documents uploaded in this category yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="size-9 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                    <span className="material-symbols-outlined text-xl">
                      description
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate max-w-[200px] sm:max-w-xs">{doc.file_name}</p>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">
                      UID: {doc.id.substring(0, 8).toUpperCase()} • {formatDate(doc.uploaded_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleView(doc)}
                    className="p-1.5 text-slate-400 hover:text-primary transition-colors" 
                    title="View"
                  >
                    <span className="material-symbols-outlined text-lg">visibility</span>
                  </button>
                  <button 
                    onClick={() => handleDelete(doc)}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors" 
                    title="Delete"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between mt-4 p-4 border-t border-primary/10">
        <button className="px-6 py-2 text-slate-500 font-bold text-sm hover:text-primary transition-colors">
          Save as Draft
        </button>
        <div className="flex gap-4">
          <Link to="/seller/property" className="px-6 py-2 bg-primary/10 text-primary rounded-lg font-bold text-sm hover:bg-primary/20 transition-colors inline-block text-center">
            Back
          </Link>
          <Link to="/seller/declaration" className="px-6 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors inline-block text-center">
            Continue to Declaration
          </Link>
        </div>
      </div>
    </div>
  );
}
