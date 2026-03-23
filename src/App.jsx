import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { initTracker } from './lib/tracker';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Training from './pages/Training';
import Pipeline from './pages/Pipeline';
import SetterDashboard from './pages/SetterDashboard';
import ManagerHub from './pages/ManagerHub';
import AICoach from './pages/AICoach';
import Documents from './pages/Documents';
import Settings from './pages/Settings';
import ClientCard from './pages/ClientCard';
import Layout from './components/Layout';

// Academy Pages
import AcademyDashboard from './pages/academy/AcademyDashboard';
import CoursesList from './pages/academy/CoursesList';
import CourseDetail from './pages/academy/CourseDetail';
import LessonPlayer from './pages/academy/LessonPlayer';
import AcademyAdmin from './pages/admin/AcademyAdmin';

// Protection Wrapper
const PrivateRoute = ({ children }) => {
  const { user, gsaCertStatus, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[var(--color-azure)]">
      <div className="animate-pulse text-[var(--color-gsa-red)]">Loading GSA OS...</div>
    </div>;
  }

  // 1. Not logged in -> Login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Logged in, checking cert... (handled by loading usually, but double check)
  if (gsaCertStatus === null) {
    return <div className="min-h-screen flex items-center justify-center bg-[var(--color-azure)]">Verifying Access...</div>;
  }

  // 3. Not Certified -> Training (Current CRM behavior)
  if (gsaCertStatus === false) {
    // If they are not certified, they must go to Academy dashboard to certify/train
    // Previously it navigated to /training, let's redirect to new /academy/dashboard
    if (!location.pathname.startsWith('/academy')) {
      return <Navigate to="/academy/dashboard" replace />;
    }
  }

  // 4. Authorized
  return children;
};

// Route only for unauthenticated users (Login)
const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};

function App() {
  useEffect(() => {
    initTracker();
  }, []);

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

          {/* Main App Layout */}
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="client/:id" element={<ClientCard />} />
            <Route path="setter" element={<SetterDashboard />} />

            {/* Academy Module Routes */}
            <Route path="academy/dashboard" element={<AcademyDashboard />} />
            <Route path="academy/courses" element={<CoursesList />} />
            <Route path="academy/course/:courseId" element={<CourseDetail />} />
            <Route path="academy/lesson/:lessonId" element={<LessonPlayer />} />

            {/* Admin Routes */}
            <Route path="admin/academy" element={<AcademyAdmin />} />

            <Route path="ai-coach" element={<AICoach />} />
            <Route path="documents" element={<Documents />} />
            <Route path="manager" element={<ManagerHub />} />
            <Route path="settings" element={<Settings />} />

            {/* Legacy Training path backwards compatibility */}
            <Route path="academy" element={<Navigate to="/academy/dashboard" replace />} />
            <Route path="training" element={<Navigate to="/academy/dashboard" replace />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
