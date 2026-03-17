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

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        localStorage.clear();
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
