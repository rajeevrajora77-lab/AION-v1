import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Help = lazy(() => import('./pages/Help.jsx'));
const Search = lazy(() => import('./components/Search.jsx'));
const Voice = lazy(() => import('./components/Voice.jsx'));
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

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
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
          <Route
            path="/login"
            element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" replace />}
          />
          <Route
            path="/signup"
            element={!isAuthenticated ? <Signup /> : <Navigate to="/dashboard" replace />}
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/help"
            element={
              <ProtectedRoute>
                <Help />
              </ProtectedRoute>
            }
          />

          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <Search />
              </ProtectedRoute>
            }
          />

          <Route
            path="/voice"
            element={
              <ProtectedRoute>
                <Voice />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/settings/general" replace />} />
            <Route path="general" element={<SettingsGeneral />} />
            <Route path="personalization" element={<SettingsPersonalization />} />
            <Route path="api-keys" element={<SettingsAPIKeys />} />
          </Route>

          <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthBootstrap>
  );
}

export default App;
