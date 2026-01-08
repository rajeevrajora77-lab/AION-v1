import { useState, useEffect, useRef } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const abortControllerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const lastAssistantIndexRef = useRef(-1);

  // Initialize session ID on mount
  useEffect(() => {
    const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    setSessionId(id);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isStreaming || !sessionId) return;

    setError(null);
    const userMessage = input.trim();
    setInput('');
    
    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsStreaming(true);
    lastAssistantIndexRef.current = messages.length; // Index where assistant message will be

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          message: userMessage,
          sessionId: sessionId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend error: ${response.status} - ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let isFirstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6);
              const data = JSON.parse(jsonStr);

              if (data.done) {
                console.log('Stream completed', data);
                break;
              }

              if (data.content) {
                assistantMessage += data.content;
                
                // Add or update assistant message
                setMessages(prev => {
                  const updated = [...prev];
                  if (isFirstChunk) {
                    updated.push({ role: 'assistant', content: data.content });
                    isFirstChunk = false;
                  } else {
                    if (updated[lastAssistantIndexRef.current]) {
                      updated[lastAssistantIndexRef.current].content += data.content;
                    }
                  }
                  return updated;
                });
              }
            } catch (parseErr) {
              console.error('Failed to parse SSE data:', parseErr);
            }
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Stream cancelled by user');
        // Add cancellation note to UI
        setMessages(prev => {
          const updated = [...prev];
          if (updated[lastAssistantIndexRef.current]) {
            updated[lastAssistantIndexRef.current].content += '\n[Stream cancelled]';
          }
          return updated;
        });
      } else {
        console.error('Streaming error:', err);
        setError(err.message);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>AION Chat</h2>
        <p style={styles.sessionId}>Session: {sessionId?.slice(0, 12)}...</p>
      </div>

      {/* Messages Area */}
      <div style={styles.messagesContainer}>
        {messages.length === 0 ? (
          <p style={styles.placeholder}>Start a conversation...</p>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} style={{
              ...styles.message,
              ...( msg.role === 'user' ? styles.userMessage : styles.assistantMessage)
            }}>
              <strong>{msg.role === 'user' ? 'You' : 'Assistant'}:</strong>
              <p>{msg.content}</p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div style={styles.error}>
          Error: {error}
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSendMessage} style={styles.inputForm}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !isStreaming) {
              e.preventDefault();
              handleSendMessage(e);
            }
          }}
          placeholder="Type your message... (Shift+Enter for new line)"
          disabled={isStreaming}
          style={styles.textarea}
        />
        <div style={styles.buttonGroup}>
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            style={{
              ...styles.button,
              ...( isStreaming || !input.trim() ? styles.buttonDisabled : styles.buttonSend)
            }}
          >
            Send
          </button>
          {isStreaming && (
            <button
              type="button"
              onClick={handleStopStream}
              style={{...styles.button, ...styles.buttonStop}}
            >
              Stop
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#f5f5f5',
    fontFamily: 'Arial, sans-serif',
  },
  header: {
    padding: '20px',
    backgroundColor: '#007bff',
    color: 'white',
    textAlign: 'center',
    borderBottom: '1px solid #0056b3',
  },
  sessionId: {
    fontSize: '12px',
    opacity: 0.8,
    margin: '5px 0 0 0',
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  placeholder: {
    textAlign: 'center',
    color: '#999',
    marginTop: '40px',
  },
  message: {
    padding: '10px 15px',
    borderRadius: '5px',
    maxWidth: '80%',
    wordWrap: 'break-word',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007bff',
    color: 'white',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#e9ecef',
    color: 'black',
  },
  error: {
    padding: '10px 20px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    borderTop: '1px solid #f5c6cb',
    fontSize: '14px',
  },
  inputForm: {
    padding: '20px',
    backgroundColor: 'white',
    borderTop: '1px solid #ddd',
  },
  textarea: {
    width: '100%',
    minHeight: '80px',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginTop: '10px',
  },
  button: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  buttonSend: {
    backgroundColor: '#28a745',
    color: 'white',
  },
  buttonStop: {
    backgroundColor: '#dc3545',
    color: 'white',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    color: '#666',
    cursor: 'not-allowed',
  },
};

export default Chat;
