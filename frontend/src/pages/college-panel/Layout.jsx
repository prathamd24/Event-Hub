import { Outlet } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';

export default function Layout() {
    const links = [
        { to: '/college-panel/dashboard', label: 'Dashboard', icon: '📊' },
        { to: '/college-panel/clubs', label: 'Clubs', icon: '🤝' },
        { to: '/college-panel/events', label: 'Events', icon: '📅' },
        { to: '/college-panel/registrations', label: 'Registrations', icon: '🎟️' },
        { to: '/college-panel/profile', label: 'Profile', icon: '🏫' },
    ];

    return (
        <div className="flex flex-col md:flex-row -mx-4 md:-mx-8">
            <Sidebar links={links} />
            <div className="flex-1 p-4 pb-24 md:p-8">
                <Outlet />
            </div>
        </div>
    );
}
