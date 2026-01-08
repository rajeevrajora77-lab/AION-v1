import { useState } from 'react';
import Chat from './components/Chat';
import Search from './components/Search';

function App() {
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <div style={styles.app}>
      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('chat')}
          style={{
            ...styles.tabButton,
            ...(activeTab === 'chat' ? styles.tabButtonActive : {}),
          }}
        >
          Chat
        </button>
        <button
          onClick={() => setActiveTab('search')}
          style={{
            ...styles.tabButton,
            ...(activeTab === 'search' ? styles.tabButtonActive : {}),
          }}
        >
          Search
        </button>
      </div>

      <div style={styles.content}>
        {activeTab === 'chat' && <Chat />}
        {activeTab === 'search' && <Search />}
      </div>
    </div>
  );
}

const styles = {
  app: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#f5f5f5',
  },
  tabs: {
    display: 'flex',
    backgroundColor: '#333',
    borderBottom: '2px solid #007bff',
  },
  tabButton: {
    flex: 1,
    padding: '15px',
    backgroundColor: '#333',
    color: '#ccc',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    transition: 'all 0.3s ease',
  },
  tabButtonActive: {
    backgroundColor: '#007bff',
    color: 'white',
    borderBottom: '3px solid #0056b3',
  },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
};

export default App;
