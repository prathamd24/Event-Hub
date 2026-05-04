import { useParams, Outlet, NavLink } from 'react-router-dom';
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

    const mobileNavItems = [
      { path:`/club/dashboard${clubId ? `/${clubId}` : ''}`,     icon:"📊", label:"Dashboard" },
      { path:`/club/events${clubId ? `/${clubId}` : ''}`,        icon:"📅", label:"Events"    },
      { path:`/club/registrations${clubId ? `/${clubId}` : ''}`, icon:"📋", label:"Members"   },
    ];

    return (
        <div className="flex bg-slate-950 min-h-screen">
            {/* Desktop sidebar */}
            <aside className="hidden md:flex md:flex-col md:w-64 bg-slate-900 border-r border-slate-800 h-[calc(100vh-64px)] fixed top-16 left-0 z-30">
                {isGodMode && (
                    <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-lg z-50">
                        <span className="animate-pulse">⚡</span>
                        GOD MODE
                        <span className="animate-pulse">⚡</span>
                    </div>
                )}
                <Sidebar links={links} isDesktop={true} />
            </aside>

            {/* Main content */}
            <main className="md:ml-64 w-full min-h-screen pb-24 md:pb-0 px-4 md:px-6 py-4 overflow-x-hidden relative">
                {isGodMode && (
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none select-none overflow-hidden">
                        <h1 className="text-[12rem] font-black text-white leading-none rotate-12 translate-x-32 -translate-y-20">GOD</h1>
                    </div>
                )}
                <Outlet />
            </main>

            {/* Mobile bottom tab bar */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
                {mobileNavItems.map(item => (
                    <NavLink key={item.path} to={item.path} end={item.path === `/club/dashboard${clubId ? `/${clubId}` : ''}`}
                        className={({ isActive }) =>
                            `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[56px] ${
                            isActive
                                ? "text-indigo-400 bg-indigo-500/10"
                                : "text-slate-500 hover:text-slate-300"
                        }`}>
                        <span className="text-xl">{item.icon}</span>
                        <span className="text-xs font-medium leading-none">{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </div>
    );
}
