import React from 'react';

type Mode = 'chat' | 'agent' | 'research' | 'code' | 'voice';

export const MODES: Record<Mode, { label: string; icon: string; description: string; agentMode: boolean }> = {
  chat:     { label: 'Chat',     icon: '💬', description: 'Direct conversation',            agentMode: false },
  agent:    { label: 'Agent',    icon: '🤖', description: 'Uses tools and searches',        agentMode: true  },
  research: { label: 'Research', icon: '🔍', description: 'Web-augmented deep answers',     agentMode: true  },
  code:     { label: 'Code',     icon: '⚡', description: 'Code execution and analysis',    agentMode: true  },
  voice:    { label: 'Voice',    icon: '🎙️', description: 'Speak and listen',               agentMode: false }
};

export default function ModeSelector({ currentMode, onModeChange }: { currentMode: Mode, onModeChange: (m: Mode) => void }) {
  return (
    <div className="flex bg-gray-100 p-1 mb-4 rounded-lg items-center overflow-x-auto w-full">
      {(Object.keys(MODES) as Mode[]).map(mode => (
        <button
          key={mode}
          onClick={() => onModeChange(mode)}
          className={`flex-1 py-1 px-3 min-w-[80px] rounded-md text-sm font-medium transition-colors ${
            currentMode === mode 
            ? 'bg-white text-gray-900 shadow-sm' 
            : 'text-gray-500 hover:text-gray-700'
          }`}
          title={MODES[mode].description}
        >
          {MODES[mode].icon} <span className="hidden md:inline">{MODES[mode].label}</span>
        </button>
      ))}
    </div>
  );
}
