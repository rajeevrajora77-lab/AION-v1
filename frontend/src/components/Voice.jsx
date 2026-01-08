import React, { useState, useRef } from 'react';
import styles from '../styles/voice.module.css';

const Voice = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

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
      recognitionRef.current.onend = () => setIsListening(false);
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
        className={`${styles.voiceButton} ${isListening ? styles.active : ''}`}
        onClick={isListening ? stopListening : startListening}
      >
        {isListening ? '🎤 Stop' : '🎤 Listen'}
      </button>
      {transcript && <p className={styles.transcript}>{transcript}</p>}
    </div>
  );
};

export default Voice;
