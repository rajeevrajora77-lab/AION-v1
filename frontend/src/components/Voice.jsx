import React, { useState, useRef } from 'react';
import styles from '../styles/voice.module.css';
import api from '../services/api';

const Voice = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [reply, setReply] = useState('');
  const recognitionRef = useRef(null);
  const sessionIdRef = useRef(null);

  // Initialize session ID on mount
  React.useEffect(() => {
    sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const speakReply = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('Speech Synthesis API not supported');
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
        const transcript = event.results[current][0].transcript;
        setTranscript(transcript);
      };
      recognitionRef.current.onend = async () => {
        setIsListening(false);
        // Process transcript with backend when listening ends
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
    <div className={styles.voiceContainer}>
      <button
        className={`${styles.voiceButton} ${isListening ? styles.active : ''} ${isProcessing ? styles.processing : ''}`}
        onClick={isListening ? stopListening : startListening}
        disabled={isProcessing}
      >
        {isListening ? '🎤 Stop' : isProcessing ? '⏳ Processing...' : '🎤 Listen'}
      </button>
      {transcript && (
        <div className={styles.transcriptSection}>
          <p className={styles.label}>You said:</p>
          <p className={styles.transcript}>{transcript}</p>
        </div>
      )}
      {reply && (
        <div className={styles.replySection}>
          <p className={styles.label}>AI Response:</p>
          <p className={styles.reply}>{reply}</p>
        </div>
      )}
    </div>
  );
};

export default Voice;
