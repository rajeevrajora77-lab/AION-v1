import React from 'react';

export default function Sidebar({ sessions, onSelect, currentSessionId, user, onLogout }: any) {
  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-full border-r border-gray-800 shrink-0">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold tracking-tight text-blue-400">AION v1</h1>
        <p className="text-xs text-gray-400 mt-1">AI Operating Intelligence</p>
      </div>

      <div className="p-4">
        <button 
          onClick={() => onSelect(null)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded shadow-sm text-sm font-medium transition-colors"
        >
          + New Session
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {sessions?.map((session: any) => (
          <button
            key={session._id}
            onClick={() => onSelect(session)}
            className={`w-full text-left text-sm py-2 px-3 rounded truncate transition-colors ${
              currentSessionId === session._id 
                ? 'bg-gray-800 text-white' 
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            {session.title || 'Conversation'}
          </button>
        ))}
      </div>

      <div className="p-4 border-t border-gray-800 flex items-center justify-between">
        <div className="truncate pr-2">
          <p className="text-sm font-medium truncate">{user?.name || 'Guest'}</p>
          <p className="text-xs text-gray-400 truncate">{user?.email || ''}</p>
        </div>
        <button onClick={onLogout} className="text-xs bg-gray-800 hover:bg-red-900 hover:text-white px-2 py-1 rounded transition-colors" title="Logout">
          EXIT
        </button>
      </div>
    </div>
  );
}
