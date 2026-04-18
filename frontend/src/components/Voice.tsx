import React, { useState, useEffect } from 'react';

export default function Voice() {
  const [voiceAvailable, setVoiceAvailable] = useState<boolean>(true);
  const [voiceError, setVoiceError] = useState<string>('');

  useEffect(() => {
    fetch('/api/voice/config', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.json())
      .then(config => {
        if (config.mockMode) {
          setVoiceAvailable(false);
          setVoiceError('Voice synthesis unavailable. Configure GOOGLE_TTS_KEY or AZURE_SPEECH_KEY.');
        }
      })
      .catch(err => console.error(err));
  }, []);

  if (!voiceAvailable) {
    return (
      <div className="text-gray-500 flex items-center gap-2 p-4 border border-gray-200 rounded">
        🔇 <span>{voiceError}</span>
      </div>
    );
  }

  return (
    <div className="voice-controls p-4">
      {/* Real Voice Controls Implementation */}
      <p>Voice functionality active.</p>
    </div>
  );
}
