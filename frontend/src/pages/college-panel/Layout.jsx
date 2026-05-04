import { Outlet, NavLink } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';

export default function Layout() {
    const links = [
        { to: '/college-panel/dashboard', label: 'Dashboard', icon: '📊' },
        { to: '/college-panel/clubs', label: 'Clubs', icon: '🤝' },
        { to: '/college-panel/events', label: 'Events', icon: '📅' },
        { to: '/college-panel/registrations', label: 'Registrations', icon: '🎟️' },
        { to: '/college-panel/profile', label: 'Profile', icon: '🏫' },
    ];

    const mobileNavItems = [
      { path:"/college-panel/dashboard", icon:"📊", label:"Dashboard" },
      { path:"/college-panel/events",    icon:"📅", label:"Events"    },
      { path:"/college-panel/clubs",     icon:"🏛️",  label:"Clubs"    },
      { path:"/college-panel/profile",   icon:"⚙️",  label:"Profile"  },
    ];

    return (
        <div className="flex bg-slate-950">
            {/* Desktop sidebar */}
            <aside className="hidden md:flex md:flex-col md:w-64 bg-slate-900 border-r border-slate-800 h-[calc(100vh-64px)] fixed top-16 left-0 z-30">
                <Sidebar links={links} isDesktop={true} />
            </aside>

            {/* Main content */}
            <main className="md:ml-64 w-full min-h-screen pb-24 md:pb-0 px-4 md:px-6 py-4 overflow-x-hidden">
                <Outlet />
            </main>

            {/* Mobile bottom tab bar */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
                {mobileNavItems.map(item => (
                    <NavLink key={item.path} to={item.path}
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
