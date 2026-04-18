import React, { useState } from 'react';

export default function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const data = new FormData();
    data.append('file', file);
    try {
      await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: data
      });
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border border-dashed border-gray-300 p-4 rounded-md text-center">
      <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
      <button 
        onClick={handleUpload}
        disabled={!file || uploading} 
        className="mt-2 text-white bg-blue-600 px-4 py-1 rounded"
      >
        {uploading ? 'Uploading...' : 'Upload Context'}
      </button>
    </div>
  );
}
