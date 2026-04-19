import { useChat } from '../contexts/ChatContext';
import UserAccountMenu from './UserAccountMenu';

/**
 * ChatGPT-style sidebar: brand, new chat, session list with titles + delete, account menu.
 * No search, no voice, no telemetry — just chat history.
 */
export default function AppSidebar({ isOpen, onClose }) {
  const { sessions, sessionId, loadHistory, handleNewChat, deleteSession } = useChat();

  return (
    <aside
      className={[
        'fixed top-0 left-0 z-50 flex flex-col h-full w-[min(100%,18rem)] max-w-[85vw]',
        'bg-[#171717] border-r border-[#262626]',
        'transform transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        'md:relative md:translate-x-0 md:z-auto md:flex-shrink-0 md:max-w-none md:w-72',
      ].join(' ')}
    >
      {/* Mobile close button */}
      <button
        className="md:hidden absolute top-3 right-3 p-2 text-gray-400 hover:text-white touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center z-10"
        onClick={onClose}
        aria-label="Close menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Brand */}
      <div className="p-4 border-b border-[#262626] pr-12 md:pr-4">
        <h1 className="text-lg font-bold text-white tracking-tight">AION</h1>
        <p className="text-xs text-gray-500 mt-0.5">AI Assistant</p>
      </div>

      {/* New Chat button */}
      <div className="p-3">
        <button
          type="button"
          onClick={() => {
            handleNewChat();
            onClose?.();
          }}
          className="w-full py-2.5 rounded-xl bg-[#262626] hover:bg-[#303030] text-sm font-medium text-white border border-[#333] transition-colors touch-manipulation min-h-[44px]"
        >
          + New Chat
        </button>
      </div>

      {/* Chat history — titles from DB, with delete */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-2 pb-2 space-y-1 min-h-0">
        {sessions.length === 0 ? (
          <p className="px-2 py-3 text-xs text-gray-500">No conversations yet</p>
        ) : (
          sessions.map((item) => {
            const isActive = String(sessionId) === String(item.sessionId);
            return (
              <div
                key={item.sessionId}
                className={`group flex items-center rounded-lg border transition-colors ${
                  isActive
                    ? 'bg-[#2b2b2b] border-[#3a3a3a]'
                    : 'bg-transparent border-transparent hover:bg-[#1f1f1f] hover:border-[#303030]'
                }`}
              >
                {/* Session title button */}
                <button
                  type="button"
                  onClick={() => {
                    loadHistory(item.sessionId);
                    onClose?.();
                  }}
                  className="flex-1 p-2.5 text-left text-sm truncate text-gray-300 touch-manipulation"
                  title={item.title || 'New Chat'}
                >
                  {item.title || 'New Chat'}
                </button>

                {/* Delete button — visible on hover / active */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(item.sessionId);
                  }}
                  className="flex-shrink-0 p-2 mr-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity touch-manipulation"
                  aria-label={`Delete "${item.title || 'chat'}"`}
                  title="Delete chat"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Account menu */}
      <div className="p-3 border-t border-[#262626] pb-safe-bottom bg-[#171717]">
        <UserAccountMenu />
      </div>
    </aside>
  );
}
