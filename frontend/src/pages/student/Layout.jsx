import { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
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

    const mobileNavItems = [
      { path:"/student/events",   icon:"🏠", label:"Events"   },
      { path:"/student/my-events",icon:"📋", label:"Mine"     },
      { path:"/student/invites",  icon:"📨", label:"Invites"  },
      { path:"/student/my-teams", icon:"👥", label:"Teams"    },
      { path:"/student/profile",  icon:"👤", label:"Profile"  },
    ];

    return (
        <div className="flex bg-slate-950">
            {/* Desktop sidebar */}
            <aside className="hidden md:flex md:flex-col md:w-64 bg-slate-900 border-r border-slate-800 h-[calc(100vh-64px)] fixed top-16 left-0 z-30">
                <Sidebar links={links} isDesktop={true} />
            </aside>

            {/* Main content */}
            <main className="md:ml-64 w-full min-h-screen pb-24 md:pb-0 px-4 md:px-6 py-4 overflow-x-hidden">
                <Outlet context={{ fetchStats }} />
            </main>

            {/* Mobile bottom tab bar */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
                {mobileNavItems.map(item => {
                    // special case for badge
                    const isInvites = item.path === '/student/invites';
                    const hasBadge = isInvites && stats?.unreadNotificationCount > 0;
                    
                    return (
                        <NavLink key={item.path} to={item.path}
                            className={({ isActive }) =>
                                `relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[56px] ${
                                isActive
                                    ? "text-indigo-400 bg-indigo-500/10"
                                    : "text-slate-500 hover:text-slate-300"
                            }`}>
                            <span className="text-xl relative">
                                {item.icon}
                                {hasBadge && (
                                    <span className="absolute -top-1 -right-2 bg-indigo-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                                        {stats.unreadNotificationCount}
                                    </span>
                                )}
                            </span>
                            <span className="text-xs font-medium leading-none">{item.label}</span>
                        </NavLink>
                    );
                })}
            </nav>
        </div>
    );
}

