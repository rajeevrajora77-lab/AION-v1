import React, { useState, useEffect } from 'react';
import { keysAPI } from '../services/pythonApi';

const KEY_FIELDS = [
  {
    id: 'groq_api_key',
    label: 'Groq API Key',
    hint: 'Primary LLM — Llama 3.3 70B (system default, add yours to reduce latency)',
    placeholder: 'gsk_...',
    badge: 'PRIMARY'
  },
  {
    id: 'openai_api_key',
    label: 'OpenAI API Key',
    hint: 'For GPT-4o, DALL-E 3, Whisper TTS',
    placeholder: 'sk-...'
  },
  {
    id: 'anthropic_api_key',
    label: 'Anthropic API Key',
    hint: 'For Claude models + Deep Think mode',
    placeholder: 'sk-ant-...'
  },
  {
    id: 'gemini_api_key',
    label: 'Google Gemini API Key',
    hint: 'For Gemini 1.5 Pro / Flash models',
    placeholder: 'AIza...'
  },
  {
    id: 'serper_api_key',
    label: 'Serper API Key',
    hint: 'For Web Search + Research Mode',
    placeholder: 'Get from serper.dev'
  },
  {
    id: 'stability_api_key',
    label: 'Stability AI Key',
    hint: 'For image generation (SDXL)',
    placeholder: 'sk-...'
  },
  {
    id: 'elevenlabs_api_key',
    label: 'ElevenLabs API Key',
    hint: 'For premium voice synthesis',
    placeholder: 'Your ElevenLabs key'
  },
];

export default function APIKeyManager({ onClose }) {
  const [keys, setKeys] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [showKey, setShowKey] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    keysAPI.get()
      .then(data => {
        const masked = {};
        Object.entries(data.keys || {}).forEach(([k, v]) => { masked[k] = v; });
        setKeys(masked);
      })
      .catch(err => setError('Failed to load keys: ' + err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const toSave = {};
      Object.entries(keys).forEach(([k, v]) => {
        if (v && !v.startsWith('\u2022\u2022')) toSave[k] = v.trim();
      });
      await keysAPI.save(toSave);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (keyId) => {
    try {
      await keysAPI.delete(keyId);
      setKeys(prev => { const n = { ...prev }; delete n[keyId]; return n; });
    } catch (err) {
      setError('Delete failed: ' + err.message);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px',
        padding: '32px', width: '580px', maxHeight: '90vh', overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h2 style={{ color: '#f1f5f9', margin: 0, fontSize: '20px', fontWeight: 700 }}>API Key Settings</h2>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: '13px' }}>
              Your BYOK keys are encrypted (AES-256). System fallback active for Groq.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '24px', lineHeight: 1 }}>\u00d7</button>
        </div>

        {loading && <p style={{ color: '#64748b', textAlign: 'center' }}>Loading...</p>}

        {error && (
          <div style={{ background: '#450a0a', border: '1px solid #991b1b', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#fca5a5', fontSize: '13px' }}>
            {error}
          </div>
        )}

        {/* Key Fields */}
        {KEY_FIELDS.map(field => (
          <div key={field.id} style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <label style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 500 }}>{field.label}</label>
              {field.badge && (
                <span style={{ background: '#312e81', color: '#a5b4fc', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                  {field.badge}
                </span>
              )}
              {keys[field.id] && (
                <span style={{ background: '#14532d', color: '#86efac', fontSize: '10px', padding: '2px 6px', borderRadius: '4px' }}>SAVED</span>
              )}
            </div>
            <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 6px' }}>{field.hint}</p>
            <div style={{ position: 'relative', display: 'flex', gap: '8px' }}>
              <input
                type={showKey[field.id] ? 'text' : 'password'}
                placeholder={field.placeholder}
                value={keys[field.id] || ''}
                onChange={e => setKeys(prev => ({ ...prev, [field.id]: e.target.value }))}
                style={{
                  flex: 1, background: '#1e293b', border: '1px solid #334155',
                  borderRadius: '8px', padding: '10px 44px 10px 12px', color: '#f1f5f9',
                  fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace'
                }}
              />
              <button
                onClick={() => setShowKey(p => ({ ...p, [field.id]: !p[field.id] }))}
                style={{
                  position: 'absolute', right: keys[field.id] ? '48px' : '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '12px'
                }}
              >
                {showKey[field.id] ? 'Hide' : 'Show'}
              </button>
              {keys[field.id] && (
                <button
                  onClick={() => handleDelete(field.id)}
                  style={{
                    flexShrink: 0, background: '#450a0a', border: '1px solid #7f1d1d', color: '#fca5a5',
                    borderRadius: '8px', padding: '0 12px', cursor: 'pointer', fontSize: '12px'
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1, background: saving ? '#4338ca' : '#6366f1', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '12px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '14px'
            }}
          >
            {saving ? 'Saving...' : saved ? '\u2713 Saved!' : 'Save API Keys'}
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1, background: '#1e293b', color: '#94a3b8', border: 'none',
              borderRadius: '8px', padding: '12px', cursor: 'pointer', fontSize: '14px'
            }}
          >
            Close
          </button>
        </div>

        {/* Footer note */}
        <div style={{
          marginTop: '20px', padding: '12px 16px', background: '#1e293b',
          borderRadius: '8px', fontSize: '12px', color: '#475569', lineHeight: 1.5
        }}>
          \uD83D\uDD12 Keys are AES-256 encrypted before storage. AION uses your keys first; system keys act as silent fallback. No revenue leakage.
        </div>
      </div>
    </div>
  );
}
