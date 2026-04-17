import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';

// Lazy-load non-critical views for mobile performance
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-gray-950 text-gray-400 text-sm">
          Loading...
        </div>
      }
    >
      <Routes>
        <Route
          path="/login"
          element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />}
        />
        <Route
          path="/signup"
          element={!isAuthenticated ? <Signup /> : <Navigate to="/dashboard" />}
        />
        <Route
          path="/dashboard"
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} />}
        />
      </Routes>
    </Suspense>
  );
}

export default App;
