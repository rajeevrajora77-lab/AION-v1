import { useAuthStore } from '../store/authStore';

const menuItems = [
  { id: 'chat', label: 'Chat', icon: '💬' },
  { id: 'search', label: 'Search', icon: '🔍' },
  { id: 'voice', label: 'Voice', icon: '🎤' },
];

function Sidebar({ activeView, setActiveView, isOpen, onClose }) {
  const { logout } = useAuthStore();

  return (
    <aside
      className={[
        // Base styles
        'fixed top-0 left-0 z-50 flex flex-col h-full',
        'w-64 bg-gray-900 border-r border-gray-800',
        // Mobile: slide in/out
        'transform transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        // Desktop: always visible, relative position
        'md:relative md:translate-x-0 md:z-auto md:flex-shrink-0',
      ].join(' ')}
    >
      {/* Mobile close button */}
      <button
        className="md:hidden absolute top-3 right-3 p-2 text-gray-400 hover:text-white touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
        onClick={onClose}
        aria-label="Close sidebar"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Header */}
      <div className="p-6 border-b border-gray-800 pr-12 md:pr-6">
        <h1 className="text-xl font-bold text-white">AION v1</h1>
        <p className="text-xs text-gray-500 mt-1">AI Operating Intelligence</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto overscroll-contain">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={[
              'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
              'min-h-[44px] touch-manipulation text-left',
              activeView === item.id
                ? 'bg-blue-600/20 text-blue-400 font-medium'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white active:bg-gray-700',
            ].join(' ')}
          >
            <span className="text-xl" aria-hidden="true">{item.icon}</span>
            <span className="text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800 pb-safe-bottom">
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-900/20 active:bg-red-900/30 transition-colors min-h-[44px] touch-manipulation"
        >
          <span className="text-xl" aria-hidden="true">🚪</span>
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
