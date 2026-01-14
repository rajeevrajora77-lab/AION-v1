import { useState, useEffect, useRef } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const abortControllerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const lastAssistantIndexRef = useRef(-1);

  // Initialize session ID on mount
  useEffect(() => {
    const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    setSessionId(id);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isStreaming || !sessionId) return;

    setError(null);
    const userMessage = input.trim();
    setInput('');
    
    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsStreaming(true);
    lastAssistantIndexRef.current = messages.length;

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          message: userMessage,
          sessionId: sessionId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend error: ${response.status} - ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let isFirstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;

          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6);
              const data = JSON.parse(jsonStr);

              if (data.done) {
                console.log('Stream completed', data);
                break;
              }

              if (data.content) {
                assistantMessage += data.content;
                
                // Add or update assistant message
                setMessages(prev => {
                  const updated = [...prev];
                  if (isFirstChunk) {
                    updated.push({ role: 'assistant', content: data.content });
                    isFirstChunk = false;
                  } else {
                    if (updated[lastAssistantIndexRef.current]) {
                      updated[lastAssistantIndexRef.current].content += data.content;
                    }
                  }
                  return updated;
                });
              }
            } catch (parseErr) {
              console.error('Failed to parse SSE data:', parseErr);
            }
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Stream cancelled by user');
        setMessages(prev => {
          const updated = [...prev];
          if (updated[lastAssistantIndexRef.current]) {
            updated[lastAssistantIndexRef.current].content += '\n[Stream cancelled]';
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
    const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    setSessionId(id);
    setError(null);
  };

  return (
    <div className="bg-[#0f0f0f] text-white h-screen flex overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`${sidebarCollapsed ? 'w-16' : 'w-72'} bg-[#171717] border-r border-[#262626] flex flex-col transition-all duration-300`}
      >
        <div className="p-4 flex items-center justify-between">
          {!sidebarCollapsed && <div className="text-xl font-bold tracking-wide">AION</div>}
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-gray-400 hover:text-white text-sm"
          >
            ☰
          </button>
        </div>

        {!sidebarCollapsed && (
          <>
            <button 
              onClick={handleNewChat}
              className="mx-4 mb-4 py-2 rounded-xl bg-[#262626] hover:bg-[#303030] text-sm"
            >
              + New Chat
            </button>

            <div className="flex-1 overflow-y-auto px-2 space-y-2">
              <div className="p-2 rounded-lg bg-[#1f1f1f] text-sm truncate">
                Current Session
              </div>
              <div className="p-2 rounded-lg hover:bg-[#1f1f1f] text-sm truncate">
                Previous Chat 1
              </div>
              <div className="p-2 rounded-lg hover:bg-[#1f1f1f] text-sm truncate">
                Previous Chat 2
              </div>
            </div>

            <div className="p-4 border-t border-[#262626] text-xs text-gray-400">
              Free Plan • AION v1
            </div>
          </>
        )}
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 border-b border-[#262626] flex items-center px-6 justify-between">
          <div className="font-medium">AION Assistant</div>
          <div className="text-xs text-gray-500">
            {sessionId?.slice(0, 15)}...
          </div>
        </header>

        {/* Messages */}
        <section className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {messages.length === 0 ? (
            <p className="text-center text-gray-500 mt-40">Start a conversation...</p>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`${
                  msg.role === 'user' 
                    ? 'bg-[#262626] px-4 py-2 rounded-2xl max-w-xl text-sm' 
                    : 'bg-[#1a1a1a] border border-[#262626] px-4 py-3 rounded-2xl max-w-xl text-sm leading-relaxed'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </section>

        {/* Error Display */}
        {error && (
          <div className="px-6 py-3 bg-red-900/20 border-t border-red-900/50 text-red-400 text-sm">
            Error: {error}
          </div>
        )}

        {/* Input box */}
        <footer className="border-t border-[#262626] p-4">
          <form 
            onSubmit={handleSendMessage}
            className="max-w-4xl mx-auto flex items-center gap-3 bg-[#171717] border border-[#262626] rounded-2xl px-4 py-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message AION..."
              disabled={isStreaming}
              className="flex-1 bg-transparent outline-none text-sm placeholder-gray-500"
            />
            {isStreaming ? (
              <button
                type="button"
                onClick={handleStopStream}
                className="bg-red-600 text-white px-4 py-1.5 rounded-xl text-sm font-medium hover:bg-red-700"
              >
                Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="bg-white text-black px-4 py-1.5 rounded-xl text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            )}
          </form>
          <p className="text-xs text-center text-gray-500 mt-2">AION can make mistakes. Check important info.</p>
        </footer>
      </main>
    </div>
  );
}

export default Chat;
