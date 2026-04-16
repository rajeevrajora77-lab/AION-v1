import React, { useState, useEffect } from 'react';
import { keysAPI } from '../services/pythonApi';

const KEY_FIELDS = [
  { id: 'openai_api_key',      label: 'OpenAI API Key',      hint: 'For GPT-4o, DALL-E 3, Whisper TTS', placeholder: 'sk-...' },
  { id: 'anthropic_api_key',   label: 'Anthropic API Key',   hint: 'For Claude models + Deep Think',     placeholder: 'sk-ant-...' },
  { id: 'serper_api_key',      label: 'Serper API Key',      hint: 'For Web Search + Research Mode',    placeholder: 'Get from serper.dev' },
  { id: 'stability_api_key',   label: 'Stability AI Key',    hint: 'For image generation fallback',     placeholder: 'sk-...' },
  { id: 'elevenlabs_api_key',  label: 'ElevenLabs API Key',  hint: 'For premium voice synthesis',       placeholder: 'Your ElevenLabs key' },
];

export default function APIKeyManager({ onClose }) {
  const [keys, setKeys] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState({});

  useEffect(() => {
    keysAPI.get().then(data => {
      const masked = {};
      Object.entries(data.keys || {}).forEach(([k, v]) => { masked[k] = v; });
      setKeys(masked);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const toSave = {};
    Object.entries(keys).forEach(([k, v]) => { if (v && !v.startsWith('••')) toSave[k] = v; });
    await keysAPI.save(toSave);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px',
        padding: '32px', width: '560px', maxHeight: '90vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h2 style={{ color: '#f1f5f9', margin: 0, fontSize: '20px' }}>API Key Settings</h2>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: '13px' }}>
              Your keys are encrypted and stored securely. System keys used as fallback.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '20px' }}>×</button>
        </div>
        
        {KEY_FIELDS.map(field => (
          <div key={field.id} style={{ marginBottom: '20px' }}>
            <label style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 500 }}>{field.label}</label>
            <p style={{ color: '#64748b', fontSize: '12px', margin: '2px 0 6px' }}>{field.hint}</p>
            <div style={{ position: 'relative' }}>
              <input
                type={showKey[field.id] ? 'text' : 'password'}
                placeholder={field.placeholder}
                value={keys[field.id] || ''}
                onChange={e => setKeys(prev => ({ ...prev, [field.id]: e.target.value }))}
                style={{
                  width: '100%', background: '#1e293b', border: '1px solid #334155',
                  borderRadius: '8px', padding: '10px 44px 10px 12px', color: '#f1f5f9',
                  fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                  fontFamily: 'monospace'
                }}
              />
              <button
                onClick={() => setShowKey(p => ({ ...p, [field.id]: !p[field.id] }))}
                style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '12px'
                }}
              >
                {showKey[field.id] ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
        ))}
        
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button onClick={handleSave} disabled={saving} style={{
            flex: 1, background: '#6366f1', color: '#fff', border: 'none',
            borderRadius: '8px', padding: '12px', cursor: 'pointer', fontWeight: 600
          }}>
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save API Keys'}
          </button>
          <button onClick={onClose} style={{
            flex: 1, background: '#1e293b', color: '#94a3b8', border: 'none',
            borderRadius: '8px', padding: '12px', cursor: 'pointer'
          }}>
            Cancel
          </button>
        </div>
        
        <div style={{
          marginTop: '20px', padding: '12px', background: '#1e293b',
          borderRadius: '8px', fontSize: '12px', color: '#64748b'
        }}>
          🔒 Keys are AES-256 encrypted before storage. Never shared with third parties.
        </div>
      </div>
    </div>
  );
}
