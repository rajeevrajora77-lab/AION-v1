import React, { useState, useEffect } from 'react';

interface KeyConfig {
  provider: string;
  configured: boolean;
}

export default function APIKeyManager() {
  const [keys, setKeys] = useState<KeyConfig[]>([]);

  useEffect(() => {
    fetch('/api/keys', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(res => res.json())
      .then(data => setKeys(data))
      .catch(console.error);
  }, []);

  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      {keys.map((k) => (
        <div key={k.provider} className="border p-4 rounded shadow-sm relative">
          <h3 className="font-bold capitalize">{k.provider}</h3>
          <span className={`absolute top-4 right-4 text-xs font-bold px-2 py-1 rounded ${k.configured ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {k.configured ? '✅ Configured' : '❌ Not Set'}
          </span>
          <div className="mt-4">
            <input type="password" placeholder="Enter new API key" className="border p-2 rounded w-full text-sm" />
            <button className="mt-2 bg-blue-600 text-white px-4 py-2 rounded text-sm w-full hover:bg-blue-700">Save Setting</button>
          </div>
        </div>
      ))}
    </div>
  );
}
