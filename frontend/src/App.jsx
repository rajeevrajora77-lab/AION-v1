import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Help = lazy(() => import('./pages/Help.jsx'));
const SettingsLayout = lazy(() => import('./pages/settings/SettingsLayout.jsx'));
const SettingsGeneral = lazy(() => import('./pages/settings/SettingsGeneral.jsx'));
const SettingsPersonalization = lazy(() => import('./pages/settings/SettingsPersonalization.jsx'));
const SettingsAPIKeys = lazy(() => import('./pages/settings/SettingsAPIKeys.jsx'));

function AuthBootstrap({ children }) {
  const token = useAuthStore((s) => s.token);
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser);
  useEffect(() => {
    if (token) fetchCurrentUser();
  }, [token, fetchCurrentUser]);
  return children;
}

const pageFallback = (
  <div className="flex items-center justify-center min-h-screen bg-gray-950 text-gray-400 text-sm">
    Loading…
  </div>
);

function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <AuthBootstrap>
      <Suspense fallback={pageFallback}>
        <Routes>
          {/* Auth routes */}
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
          />
          <Route
            path="/signup"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Signup />}
          />

          {/* Dashboard = chat — authentication required */}
          <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />} />
          <Route path="/profile" element={isAuthenticated ? <Profile /> : <Navigate to="/login" replace />} />
          <Route path="/help" element={isAuthenticated ? <Help /> : <Navigate to="/login" replace />} />

          {/* Settings */}
          <Route path="/settings" element={isAuthenticated ? <SettingsLayout /> : <Navigate to="/login" replace />}>
            <Route index element={<SettingsGeneral />} />
            <Route path="general" element={<SettingsGeneral />} />
            <Route path="personalization" element={<SettingsPersonalization />} />
            <Route path="api-keys" element={<SettingsAPIKeys />} />
          </Route>

          {/* Default → dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </AuthBootstrap>
  );
}

export default App;
