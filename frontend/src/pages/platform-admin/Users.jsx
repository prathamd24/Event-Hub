import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from '../../components/Toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const roleColors = {
    PLATFORM_ADMIN:   'bg-purple-500/10 text-purple-400 border-purple-500/20',
    COLLEGE_ADMIN:    'bg-blue-500/10   text-blue-400   border-blue-500/20',
    CLUB_COORDINATOR: 'bg-amber-500/10  text-amber-400  border-amber-500/20',
    STUDENT:          'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    UNREGISTERED:     'bg-red-500/10 text-red-400 border-red-500/20',
};

const roleLabel = {
    PLATFORM_ADMIN:   'Platform Admin',
    COLLEGE_ADMIN:    'College Admin',
    CLUB_COORDINATOR: 'Club Coord.',
    STUDENT:          'Student',
    UNREGISTERED:     'Not Registered',
};

const AVATAR_COLORS = [
    'from-indigo-500 to-purple-500',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-orange-500',
    'from-pink-500 to-rose-500',
];

function getAvatarColor(str) {
    let hash = 0;
    for (let i = 0; i < (str || '').length; i++) hash += str.charCodeAt(i);
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export default function PlatformAdminUsers() {
    const [users, setUsers]         = useState([]);
    const [loading, setLoading]     = useState(true);
    const [search, setSearch]       = useState('');
    const [roleFilter, setRoleFilter] = useState('All');
    const [sourceFilter, setSourceFilter] = useState('All'); // 'All' | 'database' | 'firebase_only'

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/platform-admin/users');
            // Backend already excludes PLATFORM_ADMIN
            setUsers(res.data);
        } catch {
            toast('Failed to load users', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (userId, currentStatus) => {
        if (!userId) { toast('Cannot toggle Firebase-only user', 'error'); return; }
        try {
            await api.put(`/api/platform-admin/users/${userId}/toggle-active`);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: !currentStatus } : u));
            toast(`User ${currentStatus ? 'deactivated' : 'activated'} ✓`, 'success');
        } catch {
            toast('Failed to update user.', 'error');
        }
    };

    const handleDeleteFirebaseUser = async (firebaseUid, email) => {
        if (!window.confirm(`Delete Firebase-only user "${email}" permanently? This cannot be undone.`)) return;
        try {
            await api.delete(`/api/platform-admin/users/firebase/${firebaseUid}`);
            setUsers(prev => prev.filter(u => u.firebaseUid !== firebaseUid));
            toast('User removed from Firebase ✓', 'success');
        } catch {
            toast('Failed to delete user.', 'error');
        }
    };

    if (loading) return <LoadingSpinner />;

    const roles = ['All', 'STUDENT', 'COLLEGE_ADMIN', 'CLUB_COORDINATOR', 'UNREGISTERED'];

    const dbCount       = users.filter(u => u.source === 'database').length;
    const fbOnlyCount   = users.filter(u => u.source === 'firebase_only').length;
    const missingCollegeCount = users.filter(u => u.missingCollege).length;

    const filtered = users.filter(u => {
        const matchSearch = !search ||
            (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
            (u.collegeName || '').toLowerCase().includes(search.toLowerCase());
        const matchRole   = roleFilter === 'All' || u.role === roleFilter;
        const matchSource = sourceFilter === 'All' ||
            (sourceFilter === 'firebase_only' && u.source === 'firebase_only') ||
            (sourceFilter === 'database' && u.source === 'database');
        return matchSearch && matchRole && matchSource;
    });

    return (
        <div className="space-y-6 animate-fadeIn pb-12">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white">User Management</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        All users synced from Firebase + Database — real-time accurate count.
                    </p>
                </div>
                <button
                    onClick={fetchUsers}
                    className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 transition-all"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                </button>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-2xl font-black text-white">{users.length}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">Total Users</p>
                </div>
                <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3">
                    <p className="text-2xl font-black text-indigo-400">{dbCount}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/70 mt-0.5">Registered</p>
                </div>
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                    <p className="text-2xl font-black text-red-400">{fbOnlyCount}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-red-400/70 mt-0.5">Firebase Only</p>
                </div>
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                    <p className="text-2xl font-black text-amber-400">{missingCollegeCount}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/70 mt-0.5">Missing College</p>
                </div>
            </div>

            {/* Firebase-only warning banner */}
            {fbOnlyCount > 0 && (
                <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3">
                    <span className="text-amber-400 text-lg mt-0.5">⚠️</span>
                    <div>
                        <p className="text-amber-300 font-bold text-sm">
                            {fbOnlyCount} user{fbOnlyCount > 1 ? 's' : ''} logged in via Firebase but never completed registration
                        </p>
                        <p className="text-amber-400/70 text-xs mt-0.5">
                            These users appear in Firebase Auth but have no profile in the database. They cannot access the platform until they register.
                        </p>
                    </div>
                </div>
            )}

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
                    <button onClick={() => setSourceFilter(s => s === 'firebase_only' ? 'All' : 'firebase_only')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                            sourceFilter === 'firebase_only'
                                ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:bg-white/10'
                        }`}>🔥 Firebase Only</button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[700px]">
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
                            {filtered.length > 0 ? filtered.map((u, idx) => {
                                const isFirebaseOnly = u.source === 'firebase_only';
                                const avatarGrad = getAvatarColor(u.email);
                                const initial = (u.name || u.email || '?').charAt(0).toUpperCase();

                                return (
                                    <tr key={u.id || u.firebaseUid || idx}
                                        className={`hover:bg-white/5 transition-colors group ${isFirebaseOnly ? 'bg-red-500/5' : ''}`}>

                                        {/* Name + avatar */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                {u.profilePic ? (
                                                    <img src={u.profilePic} alt={u.name}
                                                        className="w-9 h-9 rounded-full object-cover ring-2 ring-white/10" />
                                                ) : (
                                                    <div className={`w-9 h-9 shrink-0 rounded-full bg-gradient-to-br ${avatarGrad} flex items-center justify-center text-sm text-white font-bold shadow`}>
                                                        {initial}
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <span className="text-white font-semibold truncate max-w-[130px] block" title={u.name}>
                                                        {u.name}
                                                    </span>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        {isFirebaseOnly && (
                                                            <span className="text-[9px] font-black uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full">
                                                                🔥 Firebase Only
                                                            </span>
                                                        )}
                                                        {u.missingCollege && !isFirebaseOnly && (
                                                            <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
                                                                ⚠ No College
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
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
                                        <td className="px-5 py-4 text-xs max-w-[140px]">
                                            {u.collegeName ? (
                                                <span className="text-slate-300 truncate block" title={u.collegeName}>
                                                    {u.collegeName}
                                                </span>
                                            ) : u.collegeNameManual ? (
                                                <span className="text-slate-400 italic truncate block" title={u.collegeNameManual}>
                                                    {u.collegeNameManual} <span className="text-[9px] text-slate-500">(manual)</span>
                                                </span>
                                            ) : (
                                                <span className="text-red-400/70 font-medium">Not set</span>
                                            )}
                                        </td>

                                        {/* Active status */}
                                        <td className="px-5 py-4 text-center">
                                            {isFirebaseOnly ? (
                                                <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-bold border bg-slate-500/10 text-slate-400 border-slate-500/20">
                                                    Pending
                                                </span>
                                            ) : (
                                                <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-bold border ${
                                                    u.isActive
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                                                    {u.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {isFirebaseOnly ? (
                                                    <button
                                                        onClick={() => handleDeleteFirebaseUser(u.firebaseUid, u.email)}
                                                        className="text-xs font-bold px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                                                    >
                                                        Remove
                                                    </button>
                                                ) : (
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
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
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
                    <div className="px-5 py-3 border-t border-white/5 text-xs text-slate-500 flex items-center justify-between">
                        <span>Showing {filtered.length} of {users.length} users</span>
                        <span className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-indigo-400" /> {dbCount} in Database
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-red-400" /> {fbOnlyCount} Firebase Only
                            </span>
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
