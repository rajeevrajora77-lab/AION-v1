import React, { useState, useRef } from 'react';
import { Paperclip, X, FileText } from 'lucide-react';
import { uploadAPI } from '../services/pythonApi';

export default function FileUpload({ onFileUploaded, conversationId }) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    setUploading(true);
    try {
      const result = await uploadAPI.upload(file, conversationId);
      if (result.status === 'success') {
        const newFile = {
          id: result.file_id,
          name: result.filename,
          type: result.file_type,
        };
        setUploadedFiles(prev => [...prev, newFile]);
        onFileUploaded(newFile);
      }
    } catch (e) {
      console.error('Upload failed:', e);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    onFileUploaded(null, fileId); // signal removal
  };

  return (
    <div>
      {uploadedFiles.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '8px 16px' }}>
          {uploadedFiles.map(f => (
            <div key={f.id} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: '#1e293b', borderRadius: '8px', padding: '4px 10px',
              fontSize: '12px', color: '#94a3b8'
            }}>
              <FileText size={12} />
              <span>{f.name}</span>
              <button onClick={() => removeFile(f.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <input
        ref={inputRef} type="file" style={{ display: 'none' }}
        accept=".pdf,.txt,.csv,.docx,.json,.png,.jpg,.webp"
        onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
      />
      
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title="Upload file"
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          padding: '8px', borderRadius: '8px', color: uploading ? '#6366f1' : '#64748b'
        }}
      >
        <Paperclip size={18} />
      </button>
    </div>
  );
}
