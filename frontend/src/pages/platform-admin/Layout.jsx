import { Outlet } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';

export default function Layout() {
    const links = [
        { to: '/platform-admin/dashboard', label: 'Dashboard', icon: '📊' },
        { to: '/platform-admin/colleges', label: 'Colleges', icon: '🏫' },
        { to: '/platform-admin/users', label: 'Users', icon: '👥' },
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
