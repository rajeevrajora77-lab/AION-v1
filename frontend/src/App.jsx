import { useState, useEffect } from 'react';
import { api } from './services/api';

function App() {
  const [backendStatus, setBackendStatus] = useState('checking...');
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await api.get('/health');
        setBackendStatus('✓ Backend is reachable');
        console.log('Backend health check:', response.data);
      } catch (err) {
        setBackendStatus('✗ Backend is unreachable');
        setError(err.message);
        console.error('Backend error:', err);
      }
    };

    checkBackend();
  }, []);

  return (
    <div style={styles.container}>
      <h1>AION v1</h1>
      <p>AI Operating Intelligence Network</p>
      <div style={styles.status}>
        <p>Backend Status: {backendStatus}</p>
        {error && <p style={styles.error}>Error: {error}</p>}
      </div>
      <p style={styles.placeholder}>Bootstrap phase - App is ready</p>
    </div>
  );
}

const styles = {
  container: {
    textAlign: 'center',
    padding: '40px',
    fontFamily: 'Arial, sans-serif',
  },
  status: {
    marginTop: '20px',
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '5px',
  },
  error: {
    color: 'red',
  },
  placeholder: {
    color: '#999',
    marginTop: '20px',
  },
};

export default App;
