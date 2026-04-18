import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const init = async () => {
      const token = useAuthStore.getState().token;
      const cachedSessionId = localStorage.getItem(CHAT_SESSION_KEY);
      if (cachedSessionId) {
        const loaded = await loadHistory(cachedSessionId);
        if (loaded) {
          if (token) await loadSessions();
          return;
        }
        localStorage.removeItem(CHAT_SESSION_KEY);
      }
      if (token) {
        const userSessions = await loadSessions();
        if (userSessions.length > 0) {
          await loadHistory(userSessions[0].sessionId);
        }
      }
    };
    init();
  }, [loadHistory, loadSessions]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isStreaming) return;

    setError(null);
    const userMessage = input.trim();
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsStreaming(true);

    // Use token if available (logged-in user), otherwise send as guest
    const token = useAuthStore.getState().token;

    try {
      abortControllerRef.current = new AbortController();

      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${api.defaults.baseURL}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: userMessage,
          sessionId: sessionId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      if (!response.body) {
        throw new Error('No response body - streaming not supported');
      }

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
                if (token) loadSessions();
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
                  if (last.role === 'assistant') {
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
            console.warn('Failed to parse SSE data:', data, parseErr);
          }
        }
      }

      setIsStreaming(false);
    } catch (err) {
      console.error('Chat error:', err);
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to send message. Please try again.');
      }
      setIsStreaming(false);
    }
  };

  const handleStopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
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
