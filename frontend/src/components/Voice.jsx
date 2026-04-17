import { useState, useRef } from 'react';
import api from '../services/api';

const Voice = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [reply, setReply] = useState('');
  const recognitionRef = useRef(null);
  const sessionIdRef = useRef(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  const speakReply = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const processTranscriptWithBackend = async (text) => {
    if (!text.trim()) return;
    setIsProcessing(true);
    try {
      const response = await api.post('/voice/process', {
        transcript: text,
        sessionId: sessionIdRef.current,
      });
      const aiReply = response.data?.reply || 'I did not understand that. Please try again.';
      setReply(aiReply);
      speakReply(aiReply);
    } catch (error) {
      console.error('Error processing voice:', error);
      const errorMessage = 'Sorry, I encountered an error. Please try again.';
      setReply(errorMessage);
      speakReply(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const startListening = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onresult = (event) => {
        const current = event.resultIndex;
        const result = event.results[current][0].transcript;
        setTranscript(result);
      };
      recognitionRef.current.onend = async () => {
        setIsListening(false);
        if (transcript.trim()) {
          await processTranscriptWithBackend(transcript);
        }
      };
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 py-8 bg-gray-950 text-white overflow-y-auto overscroll-contain">
      {/* Status label */}
      <p className="text-gray-400 text-sm md:text-base">
        {isProcessing ? 'Processing...' : isListening ? 'Listening...' : 'Tap to speak'}
      </p>

      {/* Mic button — 80px minimum, thumb-friendly */}
      <button
        className={[
          'w-20 h-20 md:w-24 md:h-24 rounded-full',
          'flex items-center justify-center',
          'text-3xl md:text-4xl',
          'touch-manipulation select-none',
          'transition-all duration-200 active:scale-95',
          isProcessing
            ? 'bg-gray-700 cursor-not-allowed opacity-60'
            : isListening
            ? 'bg-red-500 shadow-lg shadow-red-500/40 animate-pulse'
            : 'bg-blue-600 shadow-lg shadow-blue-600/40 hover:bg-blue-500',
        ].join(' ')}
        onPointerDown={!isProcessing ? startListening : undefined}
        onPointerUp={!isProcessing && isListening ? stopListening : undefined}
        onClick={isListening ? stopListening : startListening}
        disabled={isProcessing}
        aria-label={isListening ? 'Stop recording' : 'Start recording'}
      >
        🎤
      </button>

      {/* Transcript display */}
      <div className="w-full max-w-md bg-gray-800 rounded-xl p-4 min-h-[80px] text-gray-300 text-sm md:text-base text-center border border-gray-700 break-words">
        {transcript || 'Your speech will appear here...'}
      </div>

      {/* Response display */}
      {reply && (
        <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-xl p-4 text-gray-200 text-sm md:text-base break-words">
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">AI Response</p>
          {reply}
        </div>
      )}
    </div>
  );
};

export default Voice;
