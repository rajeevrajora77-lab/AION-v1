// AION Python FastAPI Backend — API Service
// Base URL: VITE_PYTHON_API_URL env var (set in .env.production)
const BASE = import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8000';

const authHeaders = () => {
  const token = JSON.parse(localStorage.getItem('auth-storage'))?.state?.token;
  return { 'Authorization': `Bearer ${token}` };
};

// ---------------------------------------------------------------------------
// SSE Stream Parser — robust line-by-line decoder
// ---------------------------------------------------------------------------
async function parseSSEStream(res, onChunk, onDone) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  const processLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed) return; // blank line — SSE event separator, skip
    if (!trimmed.startsWith('data:')) return; // not a data line

    const raw = trimmed.slice(5).trim(); // strip 'data:' prefix

    if (raw === '[DONE]') {
      onDone?.();
      return;
    }
    if (!raw || raw.startsWith('[ERROR')) return;
    if (raw.startsWith('[STEP]')) {
      onChunk?.(null, raw.replace('[STEP]', '').replace('[/STEP]', '').trim(), 'step');
      return;
    }
    if (raw === '[RESPONSE_START]') return;

    // Try JSON parse — extract .content
    try {
      const obj = JSON.parse(raw);
      if (typeof obj.content === 'string') {
        onChunk?.(obj.content, null, 'text');
      } else if (obj.done) {
        onDone?.();
      }
    } catch {
      // Not JSON — pass raw as plain text chunk (safety fallback)
      // Only do this if it looks like actual text, not a JSON fragment
      if (raw && !raw.startsWith('{') && !raw.startsWith('[')) {
        onChunk?.(raw, null, 'text');
      }
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Split on both \n and \r\n
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? ''; // keep last incomplete line in buffer

      for (const line of lines) {
        processLine(line);
      }
    }

    // Process any remaining buffer content
    if (buffer.trim()) processLine(buffer.trim());
  } finally {
    onDone?.();
    reader.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// Chat API
// ---------------------------------------------------------------------------
export const chatAPI = {
  stream: async (messages, mode, fileIds = [], onChunk, onDone) => {
    const res = await fetch(`${BASE}/api/v1/chat/stream`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, mode, file_ids: fileIds }),
    });

    if (!res.ok) {
      let errText = 'Unknown error';
      try { errText = await res.text(); } catch {}
      throw new Error(`Chat API error ${res.status}: ${errText}`);
    }
    if (!res.body) throw new Error('No response body — streaming not supported in this environment');

    await parseSSEStream(res, onChunk, onDone);
  },
};

// ---------------------------------------------------------------------------
// Voice API
// ---------------------------------------------------------------------------
export const voiceAPI = {
  transcribe: async (audioBlob) => {
    const form = new FormData();
    form.append('audio', audioBlob, 'audio.webm');
    const res = await fetch(`${BASE}/api/v1/voice/transcribe`, {
      method: 'POST', headers: authHeaders(), body: form,
    });
    if (!res.ok) throw new Error(`Transcription failed: ${res.status}`);
    return res.json();
  },

  speak: async (text, voice = 'alloy') => {
    const res = await fetch(`${BASE}/api/v1/voice/speak`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice }),
    });
    if (!res.ok) throw new Error(`TTS failed: ${res.status}`);
    return res.blob();
  },
};

// ---------------------------------------------------------------------------
// Upload API
// ---------------------------------------------------------------------------
export const uploadAPI = {
  upload: async (file, conversationId = '') => {
    const form = new FormData();
    form.append('file', file);
    form.append('conversation_id', conversationId);
    const res = await fetch(`${BASE}/api/v1/upload/`, {
      method: 'POST', headers: authHeaders(), body: form,
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return res.json();
  },
};

// ---------------------------------------------------------------------------
// Image API
// ---------------------------------------------------------------------------
export const imageAPI = {
  generate: async (prompt, size = '1024x1024') => {
    const res = await fetch(`${BASE}/api/v1/image/generate`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, size }),
    });
    if (!res.ok) throw new Error(`Image generation failed: ${res.status}`);
    return res.json();
  },
};

// ---------------------------------------------------------------------------
// API Keys API
// ---------------------------------------------------------------------------
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
      body: JSON.stringify(keys),
    });
    if (!res.ok) throw new Error(`Keys save failed: ${res.status}`);
    return res.json();
  },

  delete: async (keyName) => {
    const res = await fetch(`${BASE}/api/v1/keys/${keyName}`, {
      method: 'DELETE', headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`Key delete failed: ${res.status}`);
    return res.json();
  },

  // Search (Serper)
  search: async (query) => {
    const res = await fetch(`${BASE}/api/v1/search/`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
    return res.json();
  },
};
