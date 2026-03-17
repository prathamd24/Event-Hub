import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function Layout() {
    const { scClub } = useAuth();
    const [stats, setStats] = useState(null);

    useEffect(() => {
        fetchStats();
        // Refresh stats every 30s for notifications
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchStats = async () => {
        try {
            const res = await api.get('/api/student/dashboard');
            setStats(res.data.stats);
        } catch (error) {
            console.error("Failed to fetch dashboard stats", error);
        }
    };

    const links = [
        { to: '/student/my-events', label: 'My Registrations', icon: '📅' },
        { to: '/student/my-teams', label: 'My Teams', icon: '👥' },
        { to: '/student/invites', label: 'Invites', icon: '🎯', badge: stats?.unreadNotificationCount > 0 ? stats.unreadNotificationCount : null },
        { to: '/student/profile', label: 'Profile', icon: '👤' },
        ...(scClub ? [{ to: '/sc/dashboard', label: 'Coordinator Panel', icon: '⚙️' }] : []),
    ];

    return (
        <div className="flex flex-col md:flex-row -mx-4 md:-mx-8">
            <Sidebar links={links} />
            <div className="flex-1 p-4 pb-24 md:p-8">
                <Outlet context={{ fetchStats }} />
            </div>
        </div>
    );
}

