import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { Settings } from 'lucide-react';
import ModeSelector from './ModeSelector';
import VoiceRecorder from './VoiceRecorder';
import FileUpload from './FileUpload';
import APIKeyManager from './APIKeyManager';
import MessageBubble from './MessageBubble';
import { chatAPI } from '../services/pythonApi';

function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // New States for Advanced Features
  const [mode, setMode] = useState('chat');
  const [fileIds, setFileIds] = useState([]);
  const [showAPIKeys, setShowAPIKeys] = useState(false);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isStreaming) return;

    setError(null);
    const userMessage = input.trim();
    setInput('');
    
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
      let isFirstChunk = true;
      
      await chatAPI.stream(
        newMessages,
        mode,
        fileIds,
        (textChunk, stepChunk, type) => {
          setMessages(prev => {
            const updated = [...prev];
            if (isFirstChunk) {
              updated.push({ role: 'assistant', content: type === 'step' ? `> ${stepChunk}\\n\\n` : textChunk });
              isFirstChunk = false;
            } else {
              const last = updated[updated.length - 1];
              if (type === 'step') {
                last.content += `\\n> ${stepChunk}\\n\\n`;
              } else {
                last.content += textChunk;
              }
            }
            return updated;
          });
        },
        () => setIsStreaming(false) // onDone
      );
    } catch (err) {
      console.error('Streaming error:', err);
      setError(err.message || 'Stream failed. Is Python backend running?');
    } finally {
      setIsStreaming(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setSessionId(null);
    setError(null);
    setFileIds([]);
  };

  return (
    <div className="bg-[#0f0f0f] text-white h-screen flex overflow-hidden">
      {showAPIKeys && <APIKeyManager onClose={() => setShowAPIKeys(false)} />}
      
      <aside className={`${sidebarCollapsed ? 'w-16' : 'w-72'} bg-[#171717] border-r border-[#262626] flex flex-col transition-all duration-300`}>
        <div className="p-4 flex items-center justify-between">
          {!sidebarCollapsed && <div className="text-xl font-bold tracking-wide">AION</div>}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="text-gray-400 hover:text-white text-sm">
            &#9776;
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

      <main className="flex-1 flex flex-col pt-1">
        <ModeSelector activeMode={mode} onChange={setMode} />
        
        <header className="h-10 border-b border-[#262626] flex items-center px-6 justify-between text-xs text-gray-500">
          <div>AION Mode: <span className="font-semibold text-gray-300 capitalize">{mode}</span></div>
          <div>{sessionId ? `${String(sessionId).slice(0, 8)}...` : 'New Session'}</div>
        </header>

        <section className="flex-1 overflow-y-auto px-6 py-6 space-y-2">
          {messages.length === 0 ? (
            <p className="text-center text-gray-500 mt-40">Start a conversation in {mode} mode...</p>
          ) : (
            messages.map((msg, idx) => (
              <MessageBubble key={idx} message={msg} />
            ))
          )}
          <div ref={messagesEndRef} />
        </section>

        {error && (
          <div className="px-6 py-3 bg-red-900/20 border-t border-red-900/50 text-red-400 text-sm">
            Error: {error}
          </div>
        )}

        <footer className="border-t border-[#262626] p-4">
          <FileUpload 
            conversationId={sessionId || 'new'} 
            onFileUploaded={(file, removedId) => {
              if (removedId) {
                setFileIds(prev => prev.filter(id => id !== removedId));
              } else if (file) {
                setFileIds(prev => [...prev, file.id]);
              }
            }} 
          />
          <form
            onSubmit={handleSendMessage}
            className="max-w-4xl mx-auto flex items-center gap-3 bg-[#171717] border border-[#262626] rounded-2xl px-4 mt-2 py-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Message AION in ${mode} mode...`}
              disabled={isStreaming}
              className="flex-1 bg-transparent outline-none text-sm placeholder-gray-500"
            />
            
            <VoiceRecorder 
              onTranscript={(text) => {
                setInput(prev => prev + (prev ? ' ' : '') + text);
              }}
              disabled={isStreaming}
            />

            {isStreaming ? (
              <button type="button" disabled className="bg-gray-600 text-white px-4 py-1.5 rounded-xl text-sm font-medium">
                Wait
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
