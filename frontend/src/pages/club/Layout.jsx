import { useParams, Outlet } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';

export default function Layout() {
    const { clubId } = useParams();
    const { user } = useAuth();
    const isGodMode = user?.role === 'COLLEGE_ADMIN';
    
    const links = [
        { to: `/club/dashboard${clubId ? `/${clubId}` : ''}`, label: 'Dashboard', icon: '📊' },
        { to: `/club/events${clubId ? `/${clubId}` : ''}`, label: 'Events', icon: '📅' },
        { to: `/club/registrations${clubId ? `/${clubId}` : ''}`, label: 'Registrations', icon: '🎟️' },
    ];

    return (
        <div className="flex flex-col md:flex-row -mx-4 md:-mx-8 min-h-screen">
            <div className="flex flex-col">
                {isGodMode && (
                    <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-lg z-50">
                        <span className="animate-pulse">⚡</span>
                        COLLEGE ADMIN GOD MODE ACTIVE
                        <span className="animate-pulse">⚡</span>
                    </div>
                )}
                <Sidebar links={links} />
            </div>
            <div className="flex-1 p-4 pb-24 md:p-8 relative">
                {isGodMode && (
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none select-none overflow-hidden">
                        <h1 className="text-[12rem] font-black text-white leading-none rotate-12 translate-x-32 -translate-y-20">GOD</h1>
                    </div>
                )}
                <Outlet />
            </div>
        </div>
    );
}
