import React from 'react';
import MessageBubble from './MessageBubble';
import { useChat } from '../contexts/ChatContext';

function Chat() {
  const {
    messages,
    input,
    setInput,
    isStreaming,
    error,
    sessionId,
    messagesEndRef,
    textareaRef,
    handleSendMessage,
    handleStopStream,
    handleKeyDown,
  } = useChat();

  return (
    <div className="bg-[#0f0f0f] text-white flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Minimal header */}
      <header className="flex h-12 md:h-14 border-b border-[#262626] items-center px-4 md:px-6 justify-between flex-shrink-0">
        <span className="text-sm text-gray-400 font-medium">AION</span>
        <span className="text-xs text-gray-500 truncate max-w-[50%]">
          {sessionId ? `Session ${String(sessionId).slice(0, 8)}…` : 'New chat'}
        </span>
      </header>

      {/* Messages area */}
      <section className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-4 md:px-6 md:py-6 scroll-smooth min-h-0">
        <div className="max-w-3xl mx-auto w-full space-y-6 pt-4 pb-8">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center mb-6 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm">How can I help you today?</p>
            </div>
          ) : (
            messages.map((msg, idx) => <MessageBubble key={idx} message={msg} />)
          )}
          <div ref={messagesEndRef} />
        </div>
      </section>

      {/* Error bar */}
      {error && (
        <div className="flex-shrink-0 px-4 py-3 bg-red-900/20 border-t border-red-900/50 text-red-400 text-xs md:text-sm">
          Error: {error}
        </div>
      )}

      {/* Input area — send button only, no voice */}
      <footer className="flex-shrink-0 border-t border-[#262626] bg-[#0f0f0f] px-3 py-3 md:px-6 md:py-4">
        <form
          onSubmit={handleSendMessage}
          className="max-w-3xl mx-auto flex items-end gap-2"
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
            placeholder="Message AION… (Shift+Enter for newline)"
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
        <p className="text-xs text-center text-gray-600 mt-2">
          AION can make mistakes. Check important info.
        </p>
      </footer>
    </div>
  );
}

export default Chat;
