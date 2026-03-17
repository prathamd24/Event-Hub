import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from '../../components/Toast';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function PlatformAdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/api/platform-admin/users');
            setUsers(res.data.filter(u => u.role !== 'PLATFORM_ADMIN'));
        } catch (error) {
            toast('Failed to load users', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (userId, currentStatus) => {
        try {
            await api.put(`/api/platform-admin/users/${userId}/toggle-active`);
            setUsers(users.map(u => u.id === userId ? { ...u, isActive: !currentStatus } : u));
            toast(`User ${currentStatus ? 'deactivated' : 'activated'} successfully.`, 'success');
        } catch (error) {
            toast('Failed to update user status.', 'error');
        }
    };

    if (loading) return <LoadingSpinner />;

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.role.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fadeIn pb-12 relative">
            <div className="fixed top-32 -left-32 w-96 h-96 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="fixed bottom-32 -right-32 w-96 h-96 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
                <div>
                    <h1 className="text-3xl font-display font-black text-white mb-2">User Management</h1>
                    <p className="text-slate-400 text-sm font-medium">View and manage all users across the platform.</p>
                </div>
                <div className="relative w-full sm:w-80 group">
                    <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    <input
                        type="text"
                        placeholder="Search by name, email, role..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-sm text-white rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all shadow-inner font-medium placeholder:text-slate-500"
                    />
                </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl relative z-10">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300 block md:table">
                        <thead className="hidden md:table-header-group text-xs text-slate-400 uppercase bg-black/20 border-b border-white/10">
                            <tr>
                                <th scope="col" className="px-6 py-5 font-bold tracking-wider">Name</th>
                                <th scope="col" className="px-6 py-5 font-bold tracking-wider">Email</th>
                                <th scope="col" className="px-6 py-5 font-bold tracking-wider">Role</th>
                                <th scope="col" className="px-6 py-5 font-bold tracking-wider">College</th>
                                <th scope="col" className="px-6 py-5 font-bold tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-5 text-right font-bold tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 block md:table-row-group">
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map((u) => (
                                    <tr key={u.id} className="hover:bg-white/5 transition-colors group flex flex-col md:table-row border-b border-white/5 md:border-0 mb-4 md:mb-0">
                                        <td className="px-4 py-3 md:px-6 md:py-5 font-bold text-white flex items-center gap-3 block md:table-cell relative border-b border-white/5 md:border-0">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-sm text-white shadow-lg shrink-0">
                                                {u.name.charAt(0)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="md:hidden text-[10px] text-slate-500 uppercase font-black tracking-widest italic mb-1">Name</span>
                                                {u.name}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 md:px-6 md:py-5 text-slate-400 font-medium block md:table-cell relative border-b border-white/5 md:border-0">
                                            <div className="md:hidden text-[10px] text-slate-500 uppercase font-black tracking-widest italic mb-1">Email</div>
                                            {u.email}
                                        </td>
                                        <td className="px-4 py-3 md:px-6 md:py-5 block md:table-cell relative border-b border-white/5 md:border-0">
                                            <div className="md:hidden text-[10px] text-slate-500 uppercase font-black tracking-widest italic mb-1">Role</div>
                                            <span className={`text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-wider border ${u.role === 'PLATFORM_ADMIN' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                u.role === 'COLLEGE_ADMIN' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                    u.role === 'CLUB_COORDINATOR' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                                        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                }`}>
                                                {u.role.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 md:px-6 md:py-5 max-w-full md:max-w-[150px] truncate text-slate-400 font-medium block md:table-cell relative border-b border-white/5 md:border-0" title={u.collegeName}>
                                            <div className="md:hidden text-[10px] text-slate-500 uppercase font-black tracking-widest italic mb-1">College</div>
                                            {u.collegeName || '-'}
                                        </td>
                                        <td className="px-4 py-3 md:px-6 md:py-5 block md:table-cell relative border-b border-white/5 md:border-0">
                                            <div className="md:hidden text-[10px] text-slate-500 uppercase font-black tracking-widest italic mb-1">Status</div>
                                            {u.isActive ? (
                                                <span className="flex items-center gap-2 text-emerald-400 text-xs font-bold bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 w-fit">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></span> Active
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-2 text-red-400 text-xs font-bold bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20 w-fit">
                                                    <span className="w-2 h-2 rounded-full bg-red-500"></span> Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 md:px-6 md:py-5 text-left md:text-right block md:table-cell relative">
                                            <div className="md:hidden text-[10px] text-slate-500 uppercase font-black tracking-widest italic mb-2">Actions</div>
                                            {u.role !== 'PLATFORM_ADMIN' && (
                                                <div className="md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleToggleActive(u.id, u.isActive)}
                                                        className={`text-xs font-bold px-4 py-2 rounded-lg border transition-all shadow-sm ${u.isActive
                                                            ? 'border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white'
                                                            : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-white'
                                                            }`}
                                                    >
                                                        {u.isActive ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500 bg-white/5 block md:table-cell">
                                        <div className="text-4xl mb-3 opacity-50">👥</div>
                                        <p className="font-medium">No users found.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
