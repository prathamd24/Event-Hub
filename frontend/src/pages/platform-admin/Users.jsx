import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from '../../components/Toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const roleColors = {
    PLATFORM_ADMIN:   'bg-purple-500/10 text-purple-400 border-purple-500/20',
    COLLEGE_ADMIN:    'bg-blue-500/10   text-blue-400   border-blue-500/20',
    CLUB_COORDINATOR: 'bg-amber-500/10  text-amber-400  border-amber-500/20',
    STUDENT:          'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

const roleLabel = {
    PLATFORM_ADMIN:   'Platform Admin',
    COLLEGE_ADMIN:    'College Admin',
    CLUB_COORDINATOR: 'Club Coord.',
    STUDENT:          'Student',
};

export default function PlatformAdminUsers() {
    const [users, setUsers]     = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch]   = useState('');
    const [roleFilter, setRoleFilter] = useState('All');

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/api/platform-admin/users');
            setUsers(res.data.filter(u => u.role !== 'PLATFORM_ADMIN'));
        } catch {
            toast('Failed to load users', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (userId, currentStatus) => {
        try {
            await api.put(`/api/platform-admin/users/${userId}/toggle-active`);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: !currentStatus } : u));
            toast(`User ${currentStatus ? 'deactivated' : 'activated'} ✓`, 'success');
        } catch {
            toast('Failed to update user.', 'error');
        }
    };

    if (loading) return <LoadingSpinner />;

    const roles = ['All', 'STUDENT', 'COLLEGE_ADMIN', 'CLUB_COORDINATOR'];

    const filtered = users.filter(u => {
        const matchSearch = !search ||
            u.name?.toLowerCase().includes(search.toLowerCase()) ||
            u.email?.toLowerCase().includes(search.toLowerCase()) ||
            (u.collegeName || '').toLowerCase().includes(search.toLowerCase());
        const matchRole = roleFilter === 'All' || u.role === roleFilter;
        return matchSearch && matchRole;
    });

    return (
        <div className="space-y-6 animate-fadeIn pb-12">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-white">User Management</h1>
                <p className="text-slate-400 text-sm mt-1">View and manage all users across the platform.</p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search by name, email or college…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-sm text-white rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-500"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {roles.map(r => (
                        <button key={r} onClick={() => setRoleFilter(r)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                                roleFilter === r
                                    ? 'bg-indigo-500/20 text-white border-indigo-500/40'
                                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:bg-white/10'
                            }`}>{r === 'All' ? 'All Roles' : roleLabel[r] || r}</button>
                    ))}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {['STUDENT','COLLEGE_ADMIN','CLUB_COORDINATOR'].map(r => (
                    <div key={r} className={`rounded-2xl border px-4 py-3 ${roleColors[r]} border`}>
                        <p className="text-xl font-black">{users.filter(u => u.role === r).length}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mt-0.5">{roleLabel[r]}</p>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[640px]">
                        <thead className="text-xs text-slate-400 uppercase bg-black/20 border-b border-white/10">
                            <tr>
                                <th className="px-5 py-4 text-left font-bold tracking-wider">User</th>
                                <th className="px-5 py-4 text-left font-bold tracking-wider">Email</th>
                                <th className="px-5 py-4 text-left font-bold tracking-wider">Role</th>
                                <th className="px-5 py-4 text-left font-bold tracking-wider">College</th>
                                <th className="px-5 py-4 text-center font-bold tracking-wider">Status</th>
                                <th className="px-5 py-4 text-right font-bold tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filtered.length > 0 ? filtered.map(u => (
                                <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                                    {/* Name + avatar */}
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-sm text-white font-bold shadow">
                                                {u.name?.charAt(0) || '?'}
                                            </div>
                                            <span className="text-white font-semibold truncate max-w-[130px]" title={u.name}>{u.name}</span>
                                        </div>
                                    </td>
                                    {/* Email */}
                                    <td className="px-5 py-4 text-slate-400 text-xs truncate max-w-[160px]" title={u.email}>
                                        {u.email}
                                    </td>
                                    {/* Role badge */}
                                    <td className="px-5 py-4">
                                        <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border ${roleColors[u.role] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                                            {roleLabel[u.role] || u.role}
                                        </span>
                                    </td>
                                    {/* College */}
                                    <td className="px-5 py-4 text-slate-400 text-xs truncate max-w-[140px]" title={u.collegeName}>
                                        {u.collegeName || '—'}
                                    </td>
                                    {/* Active status */}
                                    <td className="px-5 py-4 text-center">
                                        <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-bold border ${
                                            u.isActive
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                                            {u.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    {/* Actions */}
                                    <td className="px-5 py-4 text-right">
                                        <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleToggleActive(u.id, u.isActive)}
                                                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                                                    u.isActive
                                                        ? 'border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white'
                                                        : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-white'
                                                }`}
                                            >
                                                {u.isActive ? 'Deactivate' : 'Activate'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" className="text-center py-16 text-slate-500">
                                        <div className="text-4xl mb-3 opacity-40">👥</div>
                                        <p className="font-medium">{search ? 'No users match your search.' : 'No users found.'}</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 0 && (
                    <div className="px-5 py-3 border-t border-white/5 text-xs text-slate-500">
                        Showing {filtered.length} of {users.length} users
                    </div>
                )}
            </div>
        </div>
    );
}
