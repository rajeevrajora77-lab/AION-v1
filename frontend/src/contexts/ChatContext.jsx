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

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // -----------------------------------------------------------------------
  // loadSessions — fetch user's chat list from DB
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
  // loadHistory — restore a specific session
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
  // deleteSession — remove a chat session
  // -----------------------------------------------------------------------
  const deleteSession = useCallback(async (targetSessionId) => {
    if (!targetSessionId) return;
    try {
      await api.delete(`/chat/${targetSessionId}`);
      // If we deleted the active session, clear the view
      if (String(sessionId) === String(targetSessionId)) {
        setMessages([]);
        setSessionId(null);
        setError(null);
        localStorage.removeItem(CHAT_SESSION_KEY);
      }
      // Refresh sidebar
      await loadSessions();
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  }, [sessionId, loadSessions]);

  // -----------------------------------------------------------------------
  // On mount: restore last session
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
  // handleSendMessage — POST /api/chat (SSE streaming)
  //
  // SESSION RULES:
  //   - If sessionId == null → backend creates new chat
  //   - If sessionId exists → backend continues existing chat
  //   - NEVER create empty chats
  //   - Title is set server-side from first user message
  // -----------------------------------------------------------------------
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isStreaming) return;

    setError(null);
    const userMessage = input.trim();
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // Optimistic UI — show user message immediately
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsStreaming(true);

    try {
      abortControllerRef.current = new AbortController();

      // Read token from auth store
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
              // Session created/continued — store the sessionId
              if (parsed.sessionId) {
                setSessionId(parsed.sessionId);
                localStorage.setItem(CHAT_SESSION_KEY, String(parsed.sessionId));
                // Refresh sidebar to show the new/updated chat
                loadSessions();
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
            console.warn('Failed to parse SSE chunk:', data);
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

  // New Chat — clears state, sets sessionId to null
  // Does NOT create anything in DB — that happens on first message
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
    deleteSession,
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
