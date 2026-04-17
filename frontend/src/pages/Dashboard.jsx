import { useState, lazy, Suspense } from 'react';
import { ChatProvider } from '../contexts/ChatContext';
import AppSidebar from '../components/AppSidebar';

const Chat = lazy(() => import('../components/Chat'));

function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ChatProvider>
      <div className="flex w-full overflow-hidden bg-[#0f0f0f]" style={{ height: '100dvh' }}>
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <AppSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <header className="md:hidden flex items-center h-12 px-3 border-b border-[#262626] bg-[#0f0f0f] flex-shrink-0">
            <button
              type="button"
              className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-[#262626] touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="ml-2 font-semibold text-white text-sm">AION</span>
          </header>

          <Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center text-gray-500 text-sm bg-[#0f0f0f]">
                Loading…
              </div>
            }
          >
            <Chat />
          </Suspense>
        </div>
      </div>
    </ChatProvider>
  );
}

export default Dashboard;
