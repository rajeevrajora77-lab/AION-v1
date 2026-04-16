import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const abortControllerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    setError(null);
    const userMessage = input.trim();
    setInput('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsStreaming(true);

    abortControllerRef.current = new AbortController();
    const mobileTimeout = setTimeout(() => abortControllerRef.current?.abort(), 30000);

    const token = useAuthStore.getState().token;

    if (!token) {
      setError('You are not logged in. Please sign in to use the chat.');
      setIsStreaming(false);
      clearTimeout(mobileTimeout);
      return;
    }

    let sseBuffer = '';

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMessage,
          sessionId: sessionId,
        }),
        signal: abortControllerRef.current.signal,
      });

      clearTimeout(mobileTimeout);

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401) {
          useAuthStore.getState().logout();
          window.location.href = '/login';
          return;
        }
        throw new Error(`Backend error: ${response.status} - ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessageAdded = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;
          if (line.startsWith('data: ')) {
            const raw = line.slice(6).trim();
            if (raw === '[DONE]') break;

            try {
              const data = JSON.parse(raw);

              if (data.done) {
                if (data.sessionId) setSessionId(String(data.sessionId));
                break;
              }

              if (data.error) throw new Error(data.error);

              if (data.content) {
                setMessages(prev => {
                  const updated = [...prev];
                  if (!assistantMessageAdded) {
                    updated.push({ role: 'assistant', content: data.content });
                    assistantMessageAdded = true;
                  } else {
                    updated[updated.length - 1] = {
                      ...updated[updated.length - 1],
                      content: updated[updated.length - 1].content + data.content,
                    };
                  }
                  return updated;
                });
              }
            } catch (parseErr) {
              if (parseErr.message && !parseErr.message.includes('[DONE]')) {
                console.warn('SSE parse error on line:', raw, parseErr);
              }
            }
          }
        }
      }
    } catch (err) {
      clearTimeout(mobileTimeout);
      if (err.name === 'AbortError') {
        console.log('Stream cancelled or timed out');
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            updated[updated.length - 1] = { ...last, content: last.content + '\n[Stream cancelled]' };
          }
          return updated;
        });
      } else {
        console.error('Streaming error:', err);
        setError(err.message);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
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
    <div className="flex flex-col h-full overflow-hidden bg-[#0f0f0f] text-white">
      {/* Desktop-only top bar */}
      <header className="hidden md:flex h-14 border-b border-[#262626] items-center px-6 justify-between flex-shrink-0">
        <div className="font-medium text-sm">AION Assistant</div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500">
            {sessionId ? `${String(sessionId).slice(0, 8)}...` : 'New Session'}
          </span>
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
          onClick={handleNewChat}
          className="text-xs text-gray-400 hover:text-white border border-gray-700 px-3 py-1.5 rounded-lg touch-manipulation min-h-[44px]"
        >
          + New
        </button>
      </div>

      {/* Messages scroll area */}
      <section className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-4 md:px-6 md:py-6 space-y-4 scroll-smooth">
        {messages.length === 0 ? (
          <p className="text-center text-gray-500 mt-24 text-sm">Start a conversation...</p>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} px-1`}
            >
              <div
                className={[
                  'max-w-[85%] md:max-w-[70%] break-words overflow-wrap-anywhere',
                  'rounded-2xl px-4 py-2.5 text-sm md:text-base leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-[#262626] text-white rounded-tr-sm'
                    : 'bg-[#1a1a1a] border border-[#262626] text-gray-100 rounded-tl-sm',
                ].join(' ')}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </section>

      {/* Error display */}
      {error && (
        <div className="flex-shrink-0 px-4 py-3 bg-red-900/20 border-t border-red-900/50 text-red-400 text-xs md:text-sm">
          Error: {error}
        </div>
      )}

      {/* Input bar */}
      <footer className="flex-shrink-0 border-t border-[#262626] bg-[#0f0f0f] px-3 py-3 md:px-6 md:py-4 pb-safe-bottom">
        <form
          onSubmit={handleSendMessage}
          className="max-w-4xl mx-auto flex items-end gap-2"
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
    </div>
  );
}

export default Chat;
