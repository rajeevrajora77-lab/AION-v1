import React from 'react';
import { useAgentStream } from '../lib/sse';
import { useSessionStore } from '../stores/sessionStore';
import { Send, Terminal, Database, Shield, FileSearch } from 'lucide-react';

export default function AionChat() {
  const [input, setInput] = React.useState('');
  const { taskId, setTask, sessionId, setSession } = useSessionStore();
  const { stream, status } = useAgentStream(taskId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Send payload to backend Fastify endpoint (which will add it to BullMQ)
    try {
      const res = await fetch('http://localhost:4000/api/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Auth handled gracefully
        },
        body: JSON.stringify({ message: input, sessionId: sessionId || 'new' })
      });
      const data = await res.json();
      
      setTask(data.data.taskId);
      if (!sessionId) setSession(data.data.sessionId);
      
      setInput('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-200 font-sans">
      {/* Sidebar Layout */}
      <aside className="w-64 border-r border-neutral-800 bg-neutral-900 p-4 flex flex-col gap-4">
        <h1 className="text-xl font-bold tracking-wider text-neutral-100 uppercase bg-clip-text text-transparent bg-gradient-to-r from-neutral-200 to-neutral-400">
          AION <span className="text-sm font-medium opacity-50">v2</span>
        </h1>
        
        <nav className="flex flex-col gap-2 flex-grow mt-8">
          <button className="flex items-center gap-2 p-2 rounded hover:bg-neutral-800 text-left transition-colors">
            <Terminal size={18} /> Sessions
          </button>
          <button className="flex items-center gap-2 p-2 rounded hover:bg-neutral-800 text-left transition-colors">
            <Database size={18} /> Memory & Knowledge
          </button>
          <button className="flex items-center gap-2 p-2 rounded hover:bg-neutral-800 text-left transition-colors relative">
            <Shield size={18} /> BYOK Vault
            <span className="absolute top-2 right-2 flex w-2 h-2 rounded-full bg-green-500"></span>
          </button>
        </nav>
      </aside>

      {/* Main Chat Interface */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Stream Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center">
          <div className="w-full max-w-3xl flex flex-col gap-6 pb-32">
            
            {stream.length === 0 && status === 'idle' && (
              <div className="text-center mt-32 space-y-4">
                <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center mx-auto mb-6 relative shadow-lg">
                  <div className="absolute inset-0 border-2 border-transparent rounded-full border-t-neutral-400 rotate-45 opacity-50"></div>
                  <Terminal className="w-8 h-8 text-neutral-400" />
                </div>
                <h2 className="text-2xl font-light text-neutral-400 tracking-wide">Orchestrator Online</h2>
                <p className="text-neutral-500 max-w-sm mx-auto tracking-tight">
                  Interact with the centralized state machine. Memory is isolated and tools are containerized.
                </p>
              </div>
            )}

            {stream.map((step, idx) => (
              <div key={idx} className={`p-4 rounded-xl border ${step.event === 'status' ? 'bg-neutral-900 border-neutral-800 text-neutral-400' : 'bg-[#212120] border-neutral-700/50 shadow-md'}`}>
                {step.event === 'status' && (
                  <span className="text-xs uppercase tracking-widest font-mono opacity-60">Status: {step.data.status}</span>
                )}
                
                {step.event === 'done' && (
                  <div className="prose prose-invert max-w-none text-[#dbd0c5]">
                    {step.data.answer}
                  </div>
                )}

                {step.event === 'error' && (
                  <div className="text-red-400 font-mono text-sm">
                    ⚠️ Fatal Execution Error: {step.data}
                  </div>
                )}
              </div>
            ))}
            
          </div>
        </div>

        {/* Input Form */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-neutral-950 via-neutral-950 to-transparent p-4 pb-8 md:p-8 flex justify-center">
          <form className="relative w-full max-w-3xl" onSubmit={handleSubmit}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Initialize task sequence..."
              disabled={status === 'running'}
              className="w-full bg-[#2a2a29] border border-neutral-700/50 rounded-2xl py-4 pl-6 pr-14 outline-none focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-all text-[#dbd0c5] placeholder-neutral-500 shadow-xl disabled:opacity-50"
            />
            <button 
              type="submit" 
              disabled={status === 'running' || !input.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-transparent text-neutral-400 hover:text-neutral-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Send size={20} />
            </button>
          </form>
        </div>

      </main>
    </div>
  );
}
