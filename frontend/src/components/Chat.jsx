import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { Settings } from 'lucide-react';
import ModeSelector from './ModeSelector';
import VoiceRecorder from './VoiceRecorder';
import FileUpload from './FileUpload';
import APIKeyManager from './APIKeyManager';
import MessageBubble from './MessageBubble';
import api from '../services/api';

function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const [showAPIKeys, setShowAPIKeys] = useState(false);
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

    const token = useAuthStore.getState().token;
    if (!token) {
      setError('You are not logged in. Please sign in to use the chat.');
      setIsStreaming(false);
      return;
    }

    try {
      abortControllerRef.current = new AbortController();
      
      const response = await fetch(api.defaults.baseURL + '/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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
              }
              break;
            }

            if (parsed.content) {
              setMessages(prev => {
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
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  return (
    <div className="bg-[#0f0f0f] text-white h-screen flex overflow-hidden">
      {showAPIKeys && <APIKeyManager onClose={() => setShowAPIKeys(false)} />}
      
      <aside className={`hidden md:flex ${sidebarCollapsed ? 'w-16' : 'w-72'} bg-[#171717] border-r border-[#262626] flex-col transition-all duration-300 flex-shrink-0`}>
        <div className="p-4 flex items-center justify-between">
          {!sidebarCollapsed && <div className="text-xl font-bold tracking-wide">AION</div>}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="text-gray-400 hover:text-white text-sm">
            ☰
          </button>
        </div>

        {!sidebarCollapsed && (
          <>
            <button onClick={handleNewChat} className="mx-4 mb-4 py-2 rounded-xl bg-[#262626] hover:bg-[#303030] text-sm">
              + New Chat
            </button>

            <div className="flex-1 overflow-y-auto px-2 space-y-2">
              <div className="p-2 rounded-lg bg-[#1f1f1f] text-sm truncate">Current Session</div>
            </div>

            <button 
              onClick={() => setShowAPIKeys(true)}
              className="m-4 p-2 flex items-center justify-center gap-2 rounded-lg border border-[#262626] hover:bg-[#1f1f1f] text-sm text-gray-400"
            >
              <Settings size={16} /> API Keys / DB Settings
            </button>

            <div className="p-4 border-t border-[#262626] text-xs text-gray-400">
              AION v1
            </div>
          </>
        )}
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Desktop-only top bar */}
        <header className="hidden md:flex h-14 border-b border-[#262626] items-center px-6 justify-between flex-shrink-0">
          <div className="font-medium text-sm flex items-center gap-3">
            <span className="text-gray-500">AION Chat</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">
              {sessionId ? `${String(sessionId).slice(0, 8)}...` : 'New Session'}
            </span>
            <button 
              onClick={() => setShowAPIKeys(true)}
              className="md:hidden text-gray-400 hover:text-white border px-3 py-1.5 rounded-lg border-gray-700"
            >
              Settings
            </button>
            <button
              onClick={handleNewChat}
              className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors touch-manipulation min-h-[44px]"
            >
              + New Chat
            </button>
          </div>
        </header>

        {/* Mobile-only sub-header */}
        <div className="md:hidden flex items-center justify-between px-4 py-2 border-b border-[#262626] flex-shrink-0">
          <span className="text-xs text-gray-500">
            {sessionId ? `Session: ${String(sessionId).slice(0, 8)}...` : 'New Session'}
          </span>
          <button 
            onClick={() => setShowAPIKeys(true)}
            className="text-xs text-gray-400 hover:text-white border border-gray-700 px-3 py-1.5 rounded-lg touch-manipulation min-h-[44px]"
          >
            Key Settings
          </button>
          <button
            onClick={handleNewChat}
            className="text-xs text-gray-400 hover:text-white border border-gray-700 px-3 py-1.5 rounded-lg touch-manipulation min-h-[44px]"
          >
            + New
          </button>
        </div>

        <section className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-4 md:px-6 md:py-6 space-y-4 scroll-smooth">
          {messages.length === 0 ? (
            <p className="text-center text-gray-500 mt-24 text-sm">Start a conversation with AION...</p>
          ) : (
            messages.map((msg, idx) => (
              <MessageBubble key={idx} message={msg} />
            ))
          )}
          <div ref={messagesEndRef} />
        </section>

        {error && (
          <div className="flex-shrink-0 px-4 py-3 bg-red-900/20 border-t border-red-900/50 text-red-400 text-xs md:text-sm">
            Error: {error}
          </div>
        )}

        <footer className="flex-shrink-0 border-t border-[#262626] bg-[#0f0f0f] px-3 py-3 md:px-6 md:py-4 pb-safe-bottom">
          <form
            onSubmit={handleSendMessage}
            className="max-w-4xl mx-auto flex items-end gap-2 mt-2"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
              }}
              placeholder="Message AION... (Shift+Enter for newline)"
              disabled={isStreaming}
              rows={1}
              className="flex-1 min-h-[44px] max-h-32 resize-none bg-[#171717] text-white rounded-xl px-4 py-3 text-base border border-[#262626] focus:border-blue-500 focus:outline-none placeholder-gray-500 leading-relaxed overscroll-contain"
            />

            <VoiceRecorder 
              onTranscript={(text) => {
                setInput(prev => prev + (prev ? ' ' : '') + text);
              }}
              disabled={isStreaming}
            />

            {isStreaming ? (
              <button
                type="button"
                onClick={handleStopStream}
                className="flex-shrink-0 min-w-[44px] min-h-[44px] px-4 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm font-medium touch-manipulation transition-colors"
              >
                Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="flex-shrink-0 w-11 h-11 rounded-xl bg-white hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center touch-manipulation transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            )}
          </form>
          <p className="text-xs text-center text-gray-600 mt-2">AION can make mistakes. Check important info.</p>
        </footer>
      </main>
    </div>
  );
}

export default Chat;
