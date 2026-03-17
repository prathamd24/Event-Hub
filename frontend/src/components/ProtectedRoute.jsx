import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles, requireSC = false }) => {
    const { user, scClub, loading } = useAuth();

    if (loading) return <div className="p-8 text-center text-slate-400">Loading...</div>;

    if (!user) return <Navigate to="/login" replace />;

    // Special check for Student Coordinators
    if (requireSC && (!scClub || user.role !== 'STUDENT')) {
        return <Navigate to="/student/dashboard" replace />;
    }

    // Force college selection for Students
    const isMissingCollege = user.role === 'STUDENT' && !user.collegeId && user.collegeName === 'Not specified';
    
    // Redirect to profile if missing college, but allow them to stay on the profile page itself
    if (isMissingCollege && window.location.pathname !== '/student/profile') {
        return <Navigate to="/student/profile" replace />;
    }

    return children;
};

export default ProtectedRoute;
