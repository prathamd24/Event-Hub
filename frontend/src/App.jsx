import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import axios from 'axios';

// Global error logger for production debugging
axios.interceptors.response.use(
  response => response,
  error => {
    console.error('[Axios Error]', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    return Promise.reject(error);
  }
);

// Public
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RegisterCollegePage from './pages/RegisterCollegePage';
import CollegeDetailPage from './pages/CollegeDetailPage';
import ClubDetailPage from './pages/ClubDetailPage';
import EventDetailPage from './pages/EventDetailPage';
import SearchResultsPage from './pages/SearchResultsPage';
import CollegesPage from './pages/CollegesPage';
import EventsPage from './pages/EventsPage';
import CollegeBlockedPage from './pages/CollegeBlockedPage';
import SettingsPage from './pages/SettingsPage';
import AdminLoginPage from './pages/AdminLoginPage';
import NotificationsPage from './pages/NotificationsPage';
import FeedbackPage from './pages/FeedbackPage';
import PrivacyPolicy from './pages/public/PrivacyPolicy';
import TermsOfService from './pages/public/TermsOfService';

// Layouts
import PlatformAdminLayout from './pages/platform-admin/Layout';
import CollegeAdminLayout from './pages/college-panel/Layout';
import ClubLayout from './pages/club/Layout';
import StudentCoordinatorLayout from './pages/sc/Layout';
import StudentLayout from './pages/student/Layout';

// Platform Admin
import PlatformAdminDashboard from './pages/platform-admin/Dashboard';
import PlatformAdminColleges from './pages/platform-admin/Colleges';
import PlatformAdminUsers from './pages/platform-admin/Users';

// College Admin
import CollegeAdminDashboard from './pages/college-panel/Dashboard';
import CollegeAdminClubs from './pages/college-panel/Clubs';
import CollegeAdminClubDetail from './pages/college-panel/ClubDetail';
import CollegeAdminEvents from './pages/college-panel/Events';
import CollegeProfile from './pages/college-panel/Profile';
import CollegeAdminRegistrations from './pages/college-panel/Registrations';

// Club Coordinator
import ClubDashboard from './pages/club/Dashboard';
import ClubEvents from './pages/club/Events';
import ClubMembers from './pages/club/Members';
import ClubRegistrations from './pages/club/Registrations';

// Student Coordinator
import StudentCoordinatorDashboard from './pages/sc/Dashboard';
import StudentCoordinatorEvents from './pages/sc/Events';
import ManageEvent from './pages/sc/ManageEvent';

// Student
import StudentDashboard from './pages/student/Dashboard';
import StudentEvents from './pages/student/Events';
import StudentProfile from './pages/student/Profile';
import StudentMyEvents from './pages/student/MyEvents';
import MyTeams from './pages/student/MyTeams';
import Invites from './pages/student/Invites';

import ToastContainer from './components/Toast';
import PushNotificationPrompt from './components/PushNotificationPrompt';
import CookieBanner from './components/CookieBanner';
import { useTelemetry } from './hooks/useTelemetry';

function TelemetryWatcher() {
  useTelemetry();
  return null;
}

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="min-h-screen flex flex-col bg-[#0f172a]">
        <TelemetryWatcher />
        <Navbar />



        <Routes>
          {/* ── FULL-BLEED PAGES (no container wrapper, just navbar offset) ── */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/login/admin" element={<AdminLoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/colleges/:id" element={<CollegeDetailPage />} />
          <Route path="/clubs/:id" element={<ClubDetailPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />

          {/* ── CONTAINED PAGES (max-w-7xl padded container) ── */}
          <Route path="/*" element={
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 pb-8">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/register-college" element={<RegisterCollegePage />} />
                <Route path="/colleges" element={<CollegesPage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/search" element={<SearchResultsPage />} />
                <Route path="/college-blocked" element={<CollegeBlockedPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
                <Route path="/feedback" element={<ProtectedRoute><FeedbackPage /></ProtectedRoute>} />

                {/* PLATFORM ADMIN */}
                <Route path="/platform-admin" element={<ProtectedRoute allowedRoles={['PLATFORM_ADMIN']}><PlatformAdminLayout /></ProtectedRoute>}>
                  <Route path="dashboard" element={<PlatformAdminDashboard />} />
                  <Route path="colleges" element={<PlatformAdminColleges />} />
                  <Route path="users" element={<PlatformAdminUsers />} />
                  <Route index element={<Navigate to="dashboard" replace />} />
                </Route>

                {/* COLLEGE ADMIN */}
                <Route path="/college-panel" element={<ProtectedRoute allowedRoles={['COLLEGE_ADMIN']}><CollegeAdminLayout /></ProtectedRoute>}>
                  <Route path="dashboard" element={<CollegeAdminDashboard />} />
                  <Route path="clubs" element={<CollegeAdminClubs />} />
                  <Route path="clubs/:id" element={<CollegeAdminClubDetail />} />
                  <Route path="events" element={<CollegeAdminEvents />} />
                  <Route path="registrations" element={<CollegeAdminRegistrations />} />
                  <Route path="profile" element={<CollegeProfile />} />
                  <Route index element={<Navigate to="dashboard" replace />} />
                </Route>

                {/* CLUB COORDINATOR & COLLEGE ADMIN GOD MODE */}
                <Route path="/club" element={<ProtectedRoute allowedRoles={['CLUB_COORDINATOR', 'COLLEGE_ADMIN']}><ClubLayout /></ProtectedRoute>}>
                  <Route path="dashboard/:clubId?" element={<ClubDashboard />} />
                  <Route path="events/:clubId?" element={<ClubEvents />} />
                  <Route path="registrations/:clubId?" element={<ClubRegistrations />} />
                  <Route index element={<Navigate to="dashboard" replace />} />
                </Route>

                {/* STUDENT COORDINATOR */}
                <Route path="/sc" element={<ProtectedRoute allowedRoles={['STUDENT']} requireSC={true}><StudentCoordinatorLayout /></ProtectedRoute>}>
                  <Route path="dashboard" element={<StudentCoordinatorDashboard />} />
                  <Route path="events" element={<StudentCoordinatorEvents />} />
                  <Route path="events/:id/manage" element={<ManageEvent />} />
                  <Route index element={<Navigate to="dashboard" replace />} />
                </Route>

                {/* STUDENT */}
                <Route path="/student" element={<ProtectedRoute allowedRoles={['STUDENT', 'STUDENT_COORDINATOR']}><StudentLayout /></ProtectedRoute>}>
                  <Route path="dashboard" element={<StudentDashboard />} />
                  <Route path="events" element={<StudentEvents />} />
                  <Route path="my-events" element={<StudentMyEvents />} />
                  <Route path="my-teams" element={<MyTeams />} />
                  <Route path="invites" element={<Invites />} />
                  <Route path="profile" element={<StudentProfile />} />
                  <Route index element={<Navigate to="dashboard" replace />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          } />
        </Routes>

        <PushNotificationPrompt />
        <ToastContainer />
        <CookieBanner />
      </div>
    </Router>
  );
}

export default App;


