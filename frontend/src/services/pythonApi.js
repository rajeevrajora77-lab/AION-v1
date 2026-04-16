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
    
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const lines = decoder.decode(value).split('\\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const raw = line.replace('data: ', '').trim();
          if (raw === '[DONE]') { onDone?.(); break; }
          if (raw.startsWith('[STEP]')) {
            onChunk?.(null, raw.replace('[STEP]', '').replace('[/STEP]', ''), 'step');
            continue;
          }
          if (raw === '[RESPONSE_START]') continue;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.content) onChunk?.(parsed.content, null, 'text');
          } catch {
            if (raw && !raw.startsWith('[ERROR')) onChunk?.(raw, null, 'text');
          }
        }
      }
    }
  }
};

export const voiceAPI = {
  transcribe: async (audioBlob) => {
    const form = new FormData();
    form.append('audio', audioBlob, 'audio.webm');
    const res = await fetch(`${BASE}/api/v1/voice/transcribe`, {
      method: 'POST', headers: authHeaders(), body: form
    });
    return res.json();
  },
  
  speak: async (text, voice = 'alloy') => {
    const res = await fetch(`${BASE}/api/v1/voice/speak`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice })
    });
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
    return res.json();
  }
};

export const keysAPI = {
  get: async () => {
    const res = await fetch(`${BASE}/api/v1/keys/`, { headers: authHeaders() });
    return res.json();
  },
  save: async (keys) => {
    const res = await fetch(`${BASE}/api/v1/keys/`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(keys)
    });
    return res.json();
  },
  delete: async (keyName) => {
    const res = await fetch(`${BASE}/api/v1/keys/${keyName}`, {
      method: 'DELETE', headers: authHeaders()
    });
    return res.json();
  }
};
