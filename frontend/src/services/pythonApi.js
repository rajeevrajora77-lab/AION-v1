// Python FastAPI Backend API Service
// Base URL: uses VITE_PYTHON_API_URL env var (set in .env.production)
// Fallback to localhost:8000 for local development
const BASE = import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8000';

const authHeaders = () => {
  const token = JSON.parse(localStorage.getItem('auth-storage'))?.state?.token;
  return {
    'Authorization': `Bearer ${token}`,
  };
};

export const chatAPI = {
  stream: async (messages, mode, fileIds = [], onChunk, onDone) => {
    const res = await fetch(`${BASE}/api/v1/chat/stream`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, mode, file_ids: fileIds })
    });

    if (!res.ok) {
      const text = await res.text().catch(() => 'Unknown error');
      throw new Error(`Chat API error ${res.status}: ${text}`);
    }

    if (!res.body) {
      throw new Error('No response body - streaming not supported');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // Keep the last (potentially incomplete) line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;

        const raw = trimmed.slice(6).trim();
        if (raw === '[DONE]') { onDone?.(); return; }
        if (raw.startsWith('[STEP]')) {
          onChunk?.(null, raw.replace('[STEP]', '').replace('[/STEP]', ''), 'step');
          continue;
        }
        if (raw === '[RESPONSE_START]') continue;
        if (!raw || raw.startsWith('[ERROR')) continue;

        try {
          const parsed = JSON.parse(raw);
          if (parsed.content) onChunk?.(parsed.content, null, 'text');
          if (parsed.done) { onDone?.(); return; }
        } catch {
          if (raw) onChunk?.(raw, null, 'text');
        }
      }
    }

    // Process any remaining data in the buffer
    if (buffer.trim().startsWith('data: ')) {
      const raw = buffer.trim().slice(6).trim();
      if (raw && raw !== '[DONE]') {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.content) onChunk?.(parsed.content, null, 'text');
        } catch {
          if (raw) onChunk?.(raw, null, 'text');
        }
      }
    }

    onDone?.();
  }
};

export const voiceAPI = {
  transcribe: async (audioBlob) => {
    const form = new FormData();
    form.append('audio', audioBlob, 'audio.webm');
    const res = await fetch(`${BASE}/api/v1/voice/transcribe`, {
      method: 'POST', headers: authHeaders(), body: form
    });
    if (!res.ok) throw new Error(`Transcription failed: ${res.status}`);
    return res.json();
  },

  speak: async (text, voice = 'alloy') => {
    const res = await fetch(`${BASE}/api/v1/voice/speak`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice })
    });
    if (!res.ok) throw new Error(`TTS failed: ${res.status}`);
    return res.blob();
  }
};

export const uploadAPI = {
  upload: async (file, conversationId = '') => {
    const form = new FormData();
    form.append('file', file);
    form.append('conversation_id', conversationId);
    const res = await fetch(`${BASE}/api/v1/upload/`, {
      method: 'POST', headers: authHeaders(), body: form
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return res.json();
  }
};

export const imageAPI = {
  generate: async (prompt, size = '1024x1024') => {
    const res = await fetch(`${BASE}/api/v1/image/generate`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, size })
    });
    if (!res.ok) throw new Error(`Image generation failed: ${res.status}`);
    return res.json();
  }
};

export const keysAPI = {
  get: async () => {
    const res = await fetch(`${BASE}/api/v1/keys/`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`Keys fetch failed: ${res.status}`);
    return res.json();
  },
  save: async (keys) => {
    const res = await fetch(`${BASE}/api/v1/keys/`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(keys)
    });
    if (!res.ok) throw new Error(`Keys save failed: ${res.status}`);
    return res.json();
  },
  delete: async (keyName) => {
    const res = await fetch(`${BASE}/api/v1/keys/${keyName}`, {
      method: 'DELETE', headers: authHeaders()
    });
    if (!res.ok) throw new Error(`Key delete failed: ${res.status}`);
    return res.json();
  }
};
