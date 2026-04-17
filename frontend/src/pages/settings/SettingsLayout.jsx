import { Suspense } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';

const tabClass = ({ isActive }) =>
  [
    'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
    isActive ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800/50',
  ].join(' ');

export default function SettingsLayout() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="border-b border-gray-800 px-4 md:px-8 py-6">
        <Link to="/dashboard" className="text-sm text-gray-400 hover:text-white">
          ← Back to chat
        </Link>
        <h1 className="text-2xl font-bold text-white mt-4">Settings</h1>
        <nav className="flex flex-wrap gap-2 mt-6" aria-label="Settings sections">
          <NavLink to="/settings/general" className={tabClass}>
            General
          </NavLink>
          <NavLink to="/settings/personalization" className={tabClass}>
            Personalization
          </NavLink>
          <NavLink to="/settings/api-keys" className={tabClass}>
            API Keys
          </NavLink>
        </nav>
      </div>
      <main className="max-w-3xl mx-auto px-4 md:px-8 py-8">
        <Suspense
          fallback={
            <div className="text-gray-500 text-sm py-8" aria-busy="true">
              Loading…
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
