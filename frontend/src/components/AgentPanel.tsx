import React from 'react';

export default function AgentPanel({ steps }: { steps: any[] }) {
  if (!steps || steps.length === 0) return null;
  return (
    <div className="bg-gray-50 border border-gray-200 p-4 rounded mb-4">
      <h3 className="font-bold mb-2">Agent Thought Process</h3>
      <div className="space-y-2 text-sm text-gray-700">
        {steps.map((s, i) => (
          <div key={i} className="pl-4 border-l-2 border-blue-400">
            <p><strong>Thought {s.stepNumber}:</strong> {s.thought}</p>
            {s.toolCall && <p className="text-purple-600 font-mono mt-1">🔧 {s.toolCall.name}({JSON.stringify(s.toolCall.arguments)})</p>}
            {s.toolResult && <p className="text-green-600 mt-1">✓ Result obtained</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
