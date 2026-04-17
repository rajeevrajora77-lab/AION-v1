import React, { useState, useRef } from 'react';
import { Mic, Square } from 'lucide-react';
import { voiceAPI } from '../services/pythonApi';

export default function VoiceRecorder({ onTranscript, disabled }) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        setProcessing(true);
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        try {
          const { transcript } = await voiceAPI.transcribe(blob);
          onTranscript(transcript);
        } catch (e) {
          console.error('Transcription failed:', e);
        } finally {
          setProcessing(false);
        }
      };
      
      recorder.start();
      mediaRef.current = recorder;
      setRecording(true);
    } catch(err) {
      console.error('Media devices error:', err);
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  return (
    <button
      onClick={recording ? stopRecording : startRecording}
      disabled={disabled || processing}
      title={recording ? 'Stop recording' : 'Voice input'}
      style={{
        background: recording ? '#ef4444' : 'transparent',
        border: 'none', cursor: 'pointer', padding: '8px',
        borderRadius: '8px', color: recording ? '#fff' : '#64748b',
        animation: recording ? 'pulse 1s infinite' : 'none'
      }}
    >
      {processing ? '...' : recording ? <Square size={18} /> : <Mic size={18} />}
    </button>
  );
}
