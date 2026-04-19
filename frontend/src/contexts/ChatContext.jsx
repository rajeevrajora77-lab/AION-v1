import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

const CHAT_SESSION_KEY = 'aion-chat-session-id';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // -----------------------------------------------------------------------
  // loadSessions — fetch user’s session list (authenticated only)
  // -----------------------------------------------------------------------
  const loadSessions = useCallback(async () => {
    try {
      const { data } = await api.get('/chat/sessions');
      setSessions(Array.isArray(data) ? data : []);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Failed to load sessions:', err);
      return [];
    }
  }, []);

  // -----------------------------------------------------------------------
  // loadHistory — restore a specific session (authenticated only)
  // -----------------------------------------------------------------------
  const loadHistory = useCallback(async (targetSessionId) => {
    if (!targetSessionId) return false;
    try {
      const { data } = await api.get('/chat/history', {
        params: { sessionId: targetSessionId },
      });
      setMessages(Array.isArray(data?.messages) ? data.messages : []);
      setSessionId(data?.sessionId || targetSessionId);
      localStorage.setItem(CHAT_SESSION_KEY, String(data?.sessionId || targetSessionId));
      return true;
    } catch (err) {
      console.error('Failed to load history:', err);
      return false;
    }
  }, []);

  // -----------------------------------------------------------------------
  // On mount: restore last session from localStorage for logged-in user.
  // The api interceptor already attaches the JWT — if it’s missing the
  // user will be redirected to /login by the ProtectedRoute wrapper before
  // this context is even rendered, so no guest guard is needed here.
  // -----------------------------------------------------------------------
  useEffect(() => {
    const init = async () => {
      const cachedSessionId = localStorage.getItem(CHAT_SESSION_KEY);
      if (cachedSessionId) {
        const loaded = await loadHistory(cachedSessionId);
        if (loaded) {
          await loadSessions();
          return;
        }
        // Cached session no longer valid (deleted / expired) — clear it
        localStorage.removeItem(CHAT_SESSION_KEY);
      }

      // No cached session — load list and restore most recent
      const userSessions = await loadSessions();
      if (userSessions.length > 0) {
        await loadHistory(userSessions[0].sessionId);
      }
    };
    init();
  }, [loadHistory, loadSessions]);

  // -----------------------------------------------------------------------
  // handleSendMessage — POST to /api/chat (auth required)
  // JWT is attached automatically by the api interceptor in services/api.js
  // -----------------------------------------------------------------------
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isStreaming) return;

    setError(null);
    const userMessage = input.trim();
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsStreaming(true);

    try {
      abortControllerRef.current = new AbortController();

      // FIX: Read token directly from auth store — the axios interceptor sets
      // headers per-request on config.headers, NOT on api.defaults.headers.common.
      // Reading from defaults always returned '' → 401 on every chat request.
      const token = useAuthStore.getState().token;
      const authHeader = token ? `Bearer ${token}` : '';

      const body = { message: userMessage };
      if (sessionId) body.sessionId = sessionId;

      const response = await fetch(`${api.defaults.baseURL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify(body),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }

      if (!response.body) throw new Error('No response body — streaming not supported');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let isFirst = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (!data) continue;

          try {
            const parsed = JSON.parse(data);

            if (parsed.done) {
              if (parsed.sessionId) {
                setSessionId(parsed.sessionId);
                localStorage.setItem(CHAT_SESSION_KEY, String(parsed.sessionId));
                loadSessions(); // refresh sidebar
              }
              break;
            }

            if (parsed.content) {
              setMessages((prev) => {
                const updated = [...prev];
                if (isFirst) {
                  updated.push({ role: 'assistant', content: parsed.content });
                  isFirst = false;
                } else {
                  const last = updated[updated.length - 1];
                  if (last?.role === 'assistant') {
                    last.content += parsed.content;
                  } else {
                    updated.push({ role: 'assistant', content: parsed.content });
                  }
                }
                return updated;
              });
            }

            if (parsed.error) {
              setError(parsed.error);
              break;
            }
          } catch (parseErr) {
            console.warn('Failed to parse SSE chunk:', data, parseErr);
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to send message. Please try again.');
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const handleStopStream = () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  };

  const handleNewChat = () => {
    setMessages([]);
    setSessionId(null);
    setError(null);
    localStorage.removeItem(CHAT_SESSION_KEY);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const value = {
    messages,
    setMessages,
    input,
    setInput,
    isStreaming,
    error,
    sessionId,
    sessions,
    messagesEndRef,
    textareaRef,
    loadSessions,
    loadHistory,
    handleSendMessage,
    handleStopStream,
    handleNewChat,
    handleKeyDown,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
