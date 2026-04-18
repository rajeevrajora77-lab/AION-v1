import React, { useState, useEffect } from 'react';
import { keysAPI } from '../services/pythonApi';

const KEY_FIELDS = [
  {
    id: 'groq_api_key',
    label: 'Groq API Key',
    hint: 'Primary LLM — Llama 3.3 70B (system default, add yours to reduce latency)',
    placeholder: 'gsk_...',
    badge: 'PRIMARY',
  },
  {
    id: 'openai_api_key',
    label: 'OpenAI API Key',
    hint: 'For GPT-4o, DALL-E 3, Whisper TTS',
    placeholder: 'sk-...',
  },
  {
    id: 'anthropic_api_key',
    label: 'Anthropic API Key',
    hint: 'For Claude models + Deep Think mode',
    placeholder: 'sk-ant-...',
  },
  {
    id: 'gemini_api_key',
    label: 'Google Gemini API Key',
    hint: 'For Gemini 1.5 Pro / Flash models',
    placeholder: 'AIza...',
  },
  {
    id: 'serper_api_key',
    label: 'Serper API Key',
    hint: 'For Web Search + Research Mode',
    placeholder: 'Get from serper.dev',
  },
  {
    id: 'stability_api_key',
    label: 'Stability AI Key',
    hint: 'For image generation (SDXL)',
    placeholder: 'sk-...',
  },
  {
    id: 'elevenlabs_api_key',
    label: 'ElevenLabs API Key',
    hint: 'For premium voice synthesis',
    placeholder: 'Your ElevenLabs key',
  },
];

function copyToClipboard(text) {
  if (!text) return;
  navigator.clipboard?.writeText(text).catch(() => {});
}

/**
 * @param {{ onClose?: () => void, variant?: 'modal' | 'page' }} props
 */
export default function APIKeyManager({ onClose, variant = 'modal' }) {
  const isPage = variant === 'page';
  const [keys, setKeys] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [showKey, setShowKey] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    keysAPI
      .get()
      .then((data) => {
        const masked = {};
        Object.entries(data.keys || {}).forEach(([k, v]) => {
          masked[k] = v;
        });
        setKeys(masked);
      })
      .catch((err) => setError('Failed to load keys: ' + err.message))
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
      setKeys((prev) => {
        const n = { ...prev };
        delete n[keyId];
        return n;
      });
    } catch (err) {
      setError('Delete failed: ' + err.message);
    }
  };

  const inner = (
    <div
      className={
        isPage
          ? 'w-full'
          : 'bg-[#0f172a] border border-slate-800 rounded-2xl p-8 w-[580px] max-w-full max-h-[90vh] overflow-y-auto'
      }
    >
      <div className="flex justify-between items-start mb-6 gap-4">
        <div>
          <h2 className="text-slate-100 m-0 text-xl font-bold">API Key Settings</h2>
          <p className="text-slate-500 mt-1 text-sm">
            Your BYOK keys are encrypted (AES-256). System fallback active for Groq.
          </p>
        </div>
        {!isPage && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="bg-transparent border-none text-slate-500 hover:text-slate-300 cursor-pointer text-2xl leading-none p-0"
            aria-label="Close"
          >
            ×
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500 text-sm" aria-busy="true">
          Loading keys…
        </div>
      ) : (
        <>
          {error && (
            <div className="bg-red-950 border border-red-800 rounded-lg px-3 py-2 mb-4 text-red-300 text-sm">
              {error}
            </div>
          )}

          {KEY_FIELDS.map((field) => (
            <div key={field.id} className="mb-5">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <label className="text-slate-200 text-sm font-medium">{field.label}</label>
                {field.badge && (
                  <span className="bg-indigo-950 text-indigo-300 text-[10px] px-1.5 py-0.5 rounded font-semibold">
                    {field.badge}
                  </span>
                )}
                {keys[field.id] && (
                  <span className="bg-green-950 text-green-300 text-[10px] px-1.5 py-0.5 rounded">
                    SAVED
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-xs mb-1.5">{field.hint}</p>
              <div className="relative flex gap-2 flex-wrap sm:flex-nowrap">
                <input
                  type={showKey[field.id] ? 'text' : 'password'}
                  placeholder={field.placeholder}
                  value={keys[field.id] || ''}
                  onChange={(e) => setKeys((prev) => ({ ...prev, [field.id]: e.target.value }))}
                  className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-3 pr-24 text-slate-100 text-sm outline-none font-mono box-border"
                />
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowKey((p) => ({ ...p, [field.id]: !p[field.id] }))}
                    className="px-2 py-1 text-xs text-slate-500 hover:text-slate-300 border border-slate-700 rounded-lg"
                  >
                    {showKey[field.id] ? 'Hide' : 'Show'}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(keys[field.id])}
                    className="px-2 py-1 text-xs text-slate-500 hover:text-slate-300 border border-slate-700 rounded-lg"
                  >
                    Copy
                  </button>
                  {keys[field.id] && (
                    <button
                      type="button"
                      onClick={() => handleDelete(field.id)}
                      className="px-2 py-1 text-xs text-red-400 border border-red-900 rounded-lg hover:bg-red-950/50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white border-none rounded-lg py-3 cursor-pointer font-semibold text-sm"
            >
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save / Update'}
            </button>
            {!isPage && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-slate-800 text-slate-400 border-none rounded-lg py-3 cursor-pointer text-sm"
              >
                Close
              </button>
            )}
          </div>

          <div className="mt-5 p-3 bg-slate-800/50 rounded-lg text-xs text-slate-500 leading-relaxed">
            Keys are AES-256 encrypted before storage. AION uses your keys first; system keys act as silent
            fallback.
          </div>
        </>
      )}
    </div>
  );

  if (isPage) {
    return inner;
  }

  return (
    <div
      className="fixed inset-0 bg-black/75 flex items-center justify-center z-[1000] p-4"
      role="dialog"
      aria-modal="true"
    >
      {inner}
    </div>
  );
}
