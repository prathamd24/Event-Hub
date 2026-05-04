import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles, requireSC = false }) => {
    const { user, scClub, loading } = useAuth();

    if (loading) return <div className="p-8 text-center text-slate-400">Loading...</div>;

    if (!user) return <Navigate to="/login" replace />;

    // Enforce role-based access
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        if (user.role === 'PLATFORM_ADMIN') return <Navigate to="/platform-admin/dashboard" replace />;
        if (user.role === 'COLLEGE_ADMIN') return <Navigate to="/college-panel/dashboard" replace />;
        if (user.role === 'CLUB_COORDINATOR') return <Navigate to="/club/dashboard" replace />;
        return <Navigate to="/student/dashboard" replace />;
    }

    // Special check for Student Coordinators
    if (requireSC && (!scClub || user.role !== 'STUDENT')) {
        return <Navigate to="/student/dashboard" replace />;
    }

    // Force college selection for Students
    const isMissingCollege = user.role === 'STUDENT' && (!user.collegeId || user.collegeId === -1) && (
        !user.collegeName || 
        user.collegeName === 'Not specified' || 
        user.collegeName.trim() === ''
    );
    
    // Redirect to profile if missing college, but allow them to stay on the profile page itself
    if (isMissingCollege && window.location.pathname !== '/student/profile') {
        return <Navigate to="/student/profile" replace />;
    }

    return children;
};

export default ProtectedRoute;
