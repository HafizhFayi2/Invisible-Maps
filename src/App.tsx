import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DesktopApp from './desktop/App';
import { AuthProvider, useAuth } from './lib/AuthContext';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import LandingScreen from './screens/LandingScreen';
import { Outlet } from 'react-router-dom';

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="h-screen w-full bg-slate-50 flex items-center justify-center text-emerald-600">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium tracking-widest uppercase">Loading App</span>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  return <Outlet />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingScreen />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/register" element={<RegisterScreen />} />

          {/* Protected Routes - Render DesktopApp (the current UI) directly */}
          <Route element={<ProtectedRoutes />}>
            <Route path="/*" element={<DesktopApp />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
