import { useState } from 'react';
import { lazy, Suspense } from 'react';
import Sidebar from '../components/Sidebar';

// Lazy-load views for mobile network performance
const Chat = lazy(() => import('../components/Chat'));
const Search = lazy(() => import('../components/Search'));
const Voice = lazy(() => import('../components/Voice'));

function Dashboard() {
  const [activeView, setActiveView] = useState('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex w-full overflow-hidden bg-gray-950" style={{ height: '100dvh' }}>
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — drawer on mobile, static on desktop */}
      <Sidebar
        activeView={activeView}
        setActiveView={(view) => {
          setActiveView(view);
          setSidebarOpen(false); // auto-close on mobile after selection
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar with hamburger */}
        <header className="md:hidden flex items-center h-12 px-4 border-b border-gray-800 bg-gray-950 flex-shrink-0">
          <button
            className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="ml-3 font-semibold text-white text-sm">AION</span>
        </header>

        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
              Loading...
            </div>
          }
        >
          {activeView === 'chat' && <Chat />}
          {activeView === 'search' && <Search />}
          {activeView === 'voice' && <Voice />}
        </Suspense>
      </div>
    </div>
  );
}

export default Dashboard;
