import { Outlet } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';

export default function StudentCoordinatorLayout() {
    const navLinks = [
        { to: '/sc/dashboard', label: 'Dashboard', icon: '📊', end: true },
        { to: '/sc/events', label: 'My Events', icon: '📅' },
    ];

    return (
        <div className="flex flex-col md:flex-row -mx-4 md:-mx-8">
            <Sidebar links={navLinks} />
            <div className="flex-1 p-4 pb-24 md:p-8">
                <div className="max-w-6xl mx-auto">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}

