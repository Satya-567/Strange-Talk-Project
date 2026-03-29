import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store';
import { io } from 'socket.io-client';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import ChatRoom from './pages/ChatRoom';
import VideoRoom from './pages/VideoRoom';

function App() {
  const { user, setSocket } = useAppStore();

  useEffect(() => {
    if (user) {
      const newSocket = io('http://localhost:4000');
      setSocket(newSocket);
      return () => { newSocket.close(); };
    } else {
      setSocket(null);
    }
  }, [user, setSocket]);

  return (
    <BrowserRouter>
      <div className="app-container">
        <Routes>
          <Route path="/login" element={!user ? <AuthPage /> : <Navigate to="/" />} />
          <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/chat/:roomId" element={user ? <ChatRoom /> : <Navigate to="/login" />} />
          <Route path="/video/:roomId" element={user ? <VideoRoom /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
