import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Chat from '../components/Chat';
import Search from '../components/Search';
import Voice from '../components/Voice';

function Dashboard() {
  const [activeView, setActiveView] = useState('chat');

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {activeView === 'chat' && <Chat />}
        {activeView === 'search' && <Search />}
        {activeView === 'voice' && <Voice />}
      </div>
    </div>
  );
}

export default Dashboard;
