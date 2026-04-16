import React from 'react';
import { MessageSquare, Search, Brain, BookOpen, Image } from 'lucide-react';

const MODES = [
  { id: 'chat',       label: 'Chat',       icon: MessageSquare, color: '#6366f1' },
  { id: 'search',     label: 'Web Search', icon: Search,        color: '#06b6d4' },
  { id: 'deep_think', label: 'Deep Think', icon: Brain,         color: '#8b5cf6' },
  { id: 'research',   label: 'Research',   icon: BookOpen,      color: '#10b981' },
  { id: 'image',      label: 'Image Gen',  icon: Image,         color: '#f59e0b' },
];

export default function ModeSelector({ activeMode, onChange }) {
  return (
    <div style={{
      display: 'flex', gap: '8px', padding: '8px 16px',
      borderBottom: '1px solid #1e293b', flexWrap: 'wrap'
    }}>
      {MODES.map(mode => {
        const Icon = mode.icon;
        const isActive = activeMode === mode.id;
        return (
          <button key={mode.id} onClick={() => onChange(mode.id)} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 14px', borderRadius: '20px', border: 'none',
            cursor: 'pointer', fontSize: '13px', fontWeight: 500,
            background: isActive ? mode.color : '#1e293b',
            color: isActive ? '#fff' : '#94a3b8',
            transition: 'all 0.2s'
          }}>
            <Icon size={14} />
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
