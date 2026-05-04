import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../../services/api';
import { toast } from '../../components/Toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import { AnalyticsTab, AskAITab, GodModeTab, EditModal, DeleteConfirm } from './NewTabs';

const statusColors = {
    APPROVED:  'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    PENDING:   'bg-amber-500/20 text-amber-400 border-amber-500/30',
    REJECTED:  'bg-red-500/20 text-red-400 border-red-500/30',
    SUSPENDED: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    UPCOMING:  'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    ONGOING:   'bg-blue-500/20 text-blue-400 border-blue-500/30',
    COMPLETED: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const TABS = [
    { id: 'overview',  label: 'Overview',  icon: '🏠' },
    { id: 'colleges',  label: 'Colleges',  icon: '🏫' },
    { id: 'clubs',     label: 'Clubs',     icon: '🎪' },
    { id: 'events',    label: 'Events',    icon: '📅' },
    { id: 'users',     label: 'Users',     icon: '👥' },
    { id: 'feedback',  label: 'Feedback',  icon: '⭐' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'ask-ai',    label: 'Ask AI',    icon: '🤖' },
    { id: 'god-mode',  label: 'God Mode',  icon: '⚡' },
];

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6'];

const StatusBadge = ({ status }) => (
    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${statusColors[status] || 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>
        {status}
    </span>
);

const GlassInput = ({ placeholder, value, onChange, className = '' }) => (
    <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all placeholder:text-slate-500 ${className}`}
    />
);

const GlassSelect = ({ value, onChange, children }) => (
    <select
        value={value}
        onChange={onChange}
        className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer"
    >
        {children}
    </select>
);

const GlassTable = ({ count, label, headers, children }) => (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10 text-xs text-slate-400">{count} {label}{count !== 1 ? 's' : ''}</div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-white/5 text-slate-400 text-xs uppercase">
                    <tr>
                        {headers.map(h => (
                            <th key={h.label} className={`${h.align === 'center' ? 'text-center' : h.align === 'right' ? 'text-right' : 'text-left'} px-5 py-3`}>{h.label}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">{children}</tbody>
            </table>
        </div>
    </div>
);

export default function PlatformAdminDashboard() {
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState(null);
    const [colleges, setColleges] = useState([]);
    const [clubs, setClubs] = useState([]);
    const [events, setEvents] = useState([]);
    const [users, setUsers] = useState([]);
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasMounted, setHasMounted] = useState(false);
    const [tabLoading, setTabLoading] = useState({});

    // Analytics
    const [liveFeed, setLiveFeed] = useState([]);
    const [telStats, setTelStats] = useState(null);

    // Ask AI
    const [aiQuestion, setAiQuestion] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiHistory, setAiHistory] = useState([]);

    // God Mode sub-tab
    const [godTab, setGodTab] = useState('colleges');
    const [editModal, setEditModal] = useState(null);   // { type, item }
    const [editForm, setEditForm] = useState({});
    const [broadcastForm, setBroadcastForm] = useState({ title: '', message: '' });
    const [dbHealth, setDbHealth] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null); // { type, id, name }
    const [selectedCollege, setSelectedCollege] = useState(null); // College details modal

    useEffect(() => {
        const timer = setTimeout(() => setHasMounted(true), 500);
        return () => clearTimeout(timer);
    }, []);

    const [collegeSearch, setCollegeSearch] = useState('');
    const [collegeStatus, setCollegeStatus] = useState('All');
    const [clubSearch, setClubSearch] = useState('');
    const [clubCollegeFilter, setClubCollegeFilter] = useState('All');
    const [eventSearch, setEventSearch] = useState('');
    const [eventStatus, setEventStatus] = useState('All');
    const [eventCollegeFilter, setEventCollegeFilter] = useState('All');
    const [userSearch, setUserSearch] = useState('');
    const [userRole, setUserRole] = useState('All');

    useEffect(() => {
        const refreshAll = () => {
            fetchStats();
            if (activeTab === 'clubs') api.get('/api/platform-admin/all-clubs').then(r => setClubs(r.data)).catch(() => {});
            if (activeTab === 'events') api.get('/api/platform-admin/all-events').then(r => setEvents(r.data)).catch(() => {});
            if (activeTab === 'users') api.get('/api/platform-admin/users').then(r => setUsers(r.data)).catch(() => {});
            if (activeTab === 'feedback') api.get('/api/feedback/all').then(r => setFeedbacks(r.data)).catch(() => {});
            if (activeTab === 'analytics') {
                api.get('/api/telemetry/live-feed').then(r => setLiveFeed(r.data)).catch(() => {});
                api.get('/api/telemetry/stats').then(r => setTelStats(r.data)).catch(() => {});
            }
            if (activeTab === 'god-mode') {
                api.get('/api/platform-admin/all-clubs').then(r => setClubs(r.data)).catch(() => {});
                api.get('/api/platform-admin/all-events').then(r => setEvents(r.data)).catch(() => {});
                api.get('/api/platform-admin/users').then(r => setUsers(r.data)).catch(() => {});
            }
        };

        refreshAll();
        const interval = setInterval(refreshAll, 10000);
        return () => clearInterval(interval);
    }, [activeTab]);

    const fetchStats = async () => {
        try {
            const [statsRes, collegesRes] = await Promise.all([
                api.get('/api/platform-admin/stats'),
                api.get('/api/platform-admin/colleges'),
            ]);
            setStats(statsRes.data);
            setColleges(collegesRes.data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const fetchTab = async (tab) => {
        if (tab === 'clubs' && clubs.length === 0) {
            setTabLoading(p => ({ ...p, clubs: true }));
            try { const r = await api.get('/api/platform-admin/all-clubs'); setClubs(r.data); } catch (e) { } finally { setTabLoading(p => ({ ...p, clubs: false })); }
        }
        if (tab === 'events' && events.length === 0) {
            setTabLoading(p => ({ ...p, events: true }));
            try { const r = await api.get('/api/platform-admin/all-events'); setEvents(r.data); } catch (e) { } finally { setTabLoading(p => ({ ...p, events: false })); }
        }
        if (tab === 'users' && users.length === 0) {
            setTabLoading(p => ({ ...p, users: true }));
            try { const r = await api.get('/api/platform-admin/users'); setUsers(r.data); } catch (e) { } finally { setTabLoading(p => ({ ...p, users: false })); }
        }
        if (tab === 'feedback' && feedbacks.length === 0) {
            setTabLoading(p => ({ ...p, feedback: true }));
            try { const r = await api.get('/api/feedback/all'); setFeedbacks(r.data); } catch (e) { } finally { setTabLoading(p => ({ ...p, feedback: false })); }
        }
        if (tab === 'analytics') {
            setTabLoading(p => ({ ...p, analytics: true }));
            try {
                const [f, s] = await Promise.all([
                    api.get('/api/telemetry/live-feed'),
                    api.get('/api/telemetry/stats'),
                ]);
                setLiveFeed(f.data); setTelStats(s.data);
            } catch (e) { } finally { setTabLoading(p => ({ ...p, analytics: false })); }
        }
        if (tab === 'god-mode') {
            setTabLoading(p => ({ ...p, godmode: true }));
            try {
                const [cl, ev, us] = await Promise.all([
                    api.get('/api/platform-admin/all-clubs'),
                    api.get('/api/platform-admin/all-events'),
                    api.get('/api/platform-admin/users'),
                ]);
                setClubs(cl.data); setEvents(ev.data); setUsers(us.data);
            } catch (e) { } finally { setTabLoading(p => ({ ...p, godmode: false })); }
        }
    };

    const switchTab = (tab) => { setActiveTab(tab); fetchTab(tab); };

    const handleApprove = async (id) => {
        try { await api.put(`/api/platform-admin/colleges/${id}/approve`); toast('College approved', 'success'); fetchStats(); } catch { toast('Failed', 'error'); }
    };
    const handleSuspend = async (id) => {
        try { await api.put(`/api/platform-admin/colleges/${id}/suspend`); toast('College suspended', 'success'); fetchStats(); } catch { toast('Failed', 'error'); }
    };
    const handleToggleUser = async (id) => {
        try {
            const r = await api.put(`/api/platform-admin/users/${id}/toggle-active`);
            setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: r.data.is_active } : u));
            toast('User updated', 'success');
        } catch { toast('Failed', 'error'); }
    };

    // ── GOD MODE HANDLERS ───────────────────────────────────────────────────
    const openEdit = (type, item) => {
        setEditModal({ type, item });
        setEditForm({ ...item });
    };
    const closeEdit = () => { setEditModal(null); setEditForm({}); };

    const handleSaveEdit = async () => {
        const { type, item } = editModal;
        const urlMap = {
            college: `/api/platform-admin/colleges/${item.id}`,
            club:    `/api/platform-admin/clubs/${item.id}`,
            event:   `/api/platform-admin/events/${item.id}`,
        };
        try {
            await api.put(urlMap[type], editForm);
            toast(`${type} updated ✓`, 'success');
            closeEdit();
            // refresh entity list
            if (type === 'college') { const r = await api.get('/api/platform-admin/colleges'); setColleges(r.data); fetchStats(); }
            if (type === 'club')    { const r = await api.get('/api/platform-admin/all-clubs'); setClubs(r.data); }
            if (type === 'event')   { const r = await api.get('/api/platform-admin/all-events'); setEvents(r.data); }
        } catch { toast('Save failed', 'error'); }
    };

    const handleDeleteConfirmed = async () => {
        const { type, id } = confirmDelete;
        const urlMap = {
            college: `/api/platform-admin/colleges/${id}`,
            club:    `/api/platform-admin/clubs/${id}`,
            event:   `/api/platform-admin/events/${id}`,
        };
        try {
            await api.delete(urlMap[type]);
            toast(`Deleted ✓`, 'success');
            setConfirmDelete(null);
            if (type === 'college') { fetchStats(); }
            if (type === 'club')    { const r = await api.get('/api/platform-admin/all-clubs'); setClubs(r.data); }
            if (type === 'event')   { const r = await api.get('/api/platform-admin/all-events'); setEvents(r.data); }
        } catch { toast('Delete failed', 'error'); }
    };

    const handleChangeRole = async (userId, newRole) => {
        try {
            await api.put(`/api/platform-admin/users/${userId}/role`, { role: newRole });
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
            toast('Role changed ✓', 'success');
        } catch { toast('Failed', 'error'); }
    };

    const handleBroadcast = async () => {
        if (!broadcastForm.title || !broadcastForm.message) { toast('Fill title + message', 'error'); return; }
        try {
            const r = await api.post('/api/platform-admin/broadcast-all', broadcastForm);
            toast(`Broadcast sent to ${r.data.count} users ✓`, 'success');
            setBroadcastForm({ title: '', message: '' });
        } catch { toast('Broadcast failed', 'error'); }
    };

    const loadDbHealth = async () => {
        try { const r = await api.get('/api/platform-admin/db-health'); setDbHealth(r.data); }
        catch { toast('DB health check failed', 'error'); }
    };

    // ── ASK AI ──────────────────────────────────────────────────────────────
    const handleAskAI = async (q) => {
        const question = q || aiQuestion.trim();
        if (!question) return;
        setAiLoading(true);
        setAiHistory(prev => [...prev, { role: 'user', text: question }]);
        setAiQuestion('');
        try {
            const r = await api.post('/api/telemetry/ask', { question });
            setAiHistory(prev => [...prev, { role: 'ai', data: r.data }]);
        } catch (e) {
            const msg = e.response?.data?.error || 'AI request failed';
            setAiHistory(prev => [...prev, { role: 'error', text: msg }]);
        } finally { setAiLoading(false); }
    };

    if (loading) return <LoadingSpinner />;

    const uniqueColleges = [...new Set(clubs.map(c => c.collegeName).filter(Boolean))];
    const uniqueCollegesForEvents = [...new Set(events.map(e => e.collegeName).filter(Boolean))];

    const filteredColleges = colleges.filter(c => {
        const matchSearch = !collegeSearch || c.name?.toLowerCase().includes(collegeSearch.toLowerCase()) || c.location?.toLowerCase().includes(collegeSearch.toLowerCase());
        return matchSearch && (collegeStatus === 'All' || c.status === collegeStatus);
    });
    const filteredClubs = clubs.filter(c => {
        const matchSearch = !clubSearch || c.name?.toLowerCase().includes(clubSearch.toLowerCase());
        return matchSearch && (clubCollegeFilter === 'All' || c.collegeName === clubCollegeFilter);
    });
    const filteredEvents = events.filter(e => {
        const matchSearch = !eventSearch || e.title?.toLowerCase().includes(eventSearch.toLowerCase());
        return matchSearch && (eventStatus === 'All' || e.status === eventStatus) && (eventCollegeFilter === 'All' || e.collegeName === eventCollegeFilter);
    });
    const filteredUsers = users.filter(u => {
        const matchSearch = !userSearch || u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase());
        return matchSearch && (userRole === 'All' || u.role === userRole);
    });

    const kpiTop = [
        { label: 'Total Users',    value: stats?.totalUsers || 0,    icon: '👥', color: 'from-blue-500/20',    border: 'border-blue-500/20',    text: 'text-blue-400' },
        { label: 'Colleges',       value: stats?.totalColleges || 0, icon: '🏫', color: 'from-amber-500/20',  border: 'border-amber-500/20',  text: 'text-amber-400' },
        { label: 'Clubs',          value: stats?.totalClubs || 0,    icon: '🎪', color: 'from-emerald-500/20',border: 'border-emerald-500/20',text: 'text-emerald-400' },
        { label: 'Events',         value: stats?.totalEvents || 0,   icon: '📅', color: 'from-purple-500/20', border: 'border-purple-500/20', text: 'text-purple-400' },
        { label: 'Registrations',  value: stats?.totalRegistrations || 0, icon: '🎟️', color: 'from-indigo-500/20', border: 'border-indigo-500/20', text: 'text-indigo-400' },
        { label: 'Pending Colleges',value: stats?.pendingColleges || 0, icon: '⏳', color: 'from-amber-500/20', border: 'border-amber-500/20', text: 'text-amber-400' },
        { label: 'Active Users',   value: stats?.activeUsers || 0,   icon: '✅', color: 'from-emerald-500/20',border: 'border-emerald-500/20',text: 'text-emerald-400' },
        { label: 'Upcoming Events',value: (stats?.eventsDistribution || []).find(e => e.name === 'Upcoming')?.value || 0, icon: '🔔', color: 'from-blue-500/20', border: 'border-blue-500/20', text: 'text-blue-400' },
    ];

    const chartTooltipStyle = { backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#f1f5f9' };

    return (
        <div className="space-y-6 animate-fadeIn pb-12 relative">
            {/* Ambient glows */}
            <div className="fixed top-32 right-0 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none" />
            <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[150px] pointer-events-none" />

            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-slate-400 text-sm mb-1">Platform Administration</p>
                    <h1 className="text-4xl font-display font-black text-white">Control Panel</h1>
                    <p className="text-slate-400 mt-1">Monitor and manage the entire Event Hub platform.</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                    ⚡
                </div>
            </div>

            {/* Glassmorphic Tab Nav */}
            <div className="flex gap-1 bg-white/5 backdrop-blur-xl p-1 rounded-2xl border border-white/10 overflow-x-auto no-scrollbar">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => switchTab(t.id)}
                        className={`flex-1 min-w-max px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center justify-center gap-2 ${
                            activeTab === t.id
                            ? 'bg-indigo-500/20 text-white border border-indigo-500/40 shadow-[0_0_16px_rgba(99,102,241,0.2)]'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <span>{t.icon}</span> {t.label}
                    </button>
                ))}
            </div>

            {/* ═══ OVERVIEW TAB ═══ */}
            {activeTab === 'overview' && (
                <div className="space-y-6 animate-fadeIn">
                    {/* KPI Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {kpiTop.map(({ label, value, icon, color, border, text }) => (
                            <div key={label} className={`bg-gradient-to-br ${color} to-transparent backdrop-blur-xl border ${border} rounded-2xl p-5 relative overflow-hidden group hover:-translate-y-0.5 transition-all`}>
                                <div className="absolute top-3 right-3 text-xl opacity-30 group-hover:opacity-60 transition-opacity">{icon}</div>
                                <div className="relative z-10">
                                    <p className={`text-3xl font-display font-black ${text}`}>{value}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{label}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                            <div className="h-64 min-h-[250px] mt-4 relative overflow-hidden">
                                {hasMounted && stats?.rolesDistribution?.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={250}>
                                        <PieChart>
                                            <Pie 
                                                data={stats.rolesDistribution} 
                                                dataKey="value" 
                                                nameKey="name" 
                                                cx="50%" 
                                                cy="50%" 
                                                outerRadius={80} 
                                                label={({ name, value }) => `${name}: ${value}`}
                                            >
                                                {stats.rolesDistribution.map((_, i) => (
                                                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={chartTooltipStyle} />
                                            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-500 text-xs italic">
                                        {!hasMounted ? "Initializing..." : "No user data available"}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                            <h2 className="text-white font-display font-bold text-lg mb-2 flex items-center gap-2">
                                <span className="w-2 h-6 bg-purple-500 rounded-full" /> Event Status
                            </h2>
                            <div className="h-64 min-h-[250px] mt-4 relative overflow-hidden">
                                {hasMounted && stats?.eventsDistribution?.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart data={stats.eventsDistribution}>
                                            <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                                            <YAxis stroke="#64748b" fontSize={11} />
                                            <Tooltip contentStyle={chartTooltipStyle} />
                                            <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-500 text-xs italic">
                                        {!hasMounted ? "Initializing..." : "No event data available"}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ COLLEGES TAB ═══ */}
            {activeTab === 'colleges' && (
                <div className="space-y-4 animate-fadeIn">
                    <div className="flex flex-wrap gap-3">
                        <GlassInput placeholder="Search colleges…" value={collegeSearch} onChange={e => setCollegeSearch(e.target.value)} className="flex-1" />
                        <GlassSelect value={collegeStatus} onChange={e => setCollegeStatus(e.target.value)}>
                            {['All', 'APPROVED', 'PENDING', 'SUSPENDED', 'REJECTED'].map(s => <option key={s} value={s}>{s}</option>)}
                        </GlassSelect>
                    </div>
                    <GlassTable count={filteredColleges.length} label="college" headers={[
                        { label: 'College' }, { label: 'Location' }, { label: 'Admin' }, { label: 'Status', align: 'center' }, { label: 'Actions', align: 'right' }
                    ]}>
                        {filteredColleges.length > 0 ? filteredColleges.map(c => (
                            <tr key={c.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-5 py-4 text-white font-semibold">{c.name}</td>
                                <td className="px-5 py-4 text-slate-400 text-sm">{c.location}</td>
                                <td className="px-5 py-4 text-slate-400 text-sm">{c.adminName || '—'}</td>
                                <td className="px-4 py-4 text-center"><StatusBadge status={c.status} /></td>
                                <td className="px-5 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setSelectedCollege(c)} className="text-xs px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500 hover:text-white transition-all font-semibold">View</button>
                                        {c.status !== 'APPROVED' && (
                                            <button onClick={() => handleApprove(c.id)} className="text-xs px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500 hover:text-white transition-all font-semibold">Approve</button>
                                        )}
                                        {c.status !== 'SUSPENDED' && (
                                            <button onClick={() => handleSuspend(c.id)} className="text-xs px-3 py-1.5 bg-orange-500/10 text-orange-400 border border-orange-500/30 rounded-lg hover:bg-orange-500 hover:text-white transition-all font-semibold">Suspend</button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="5" className="text-center py-12 text-slate-500">No colleges match filter.</td></tr>
                        )}
                    </GlassTable>
                </div>
            )}

            {/* ═══ CLUBS TAB ═══ */}
            {activeTab === 'clubs' && (
                <div className="space-y-4 animate-fadeIn">
                    <div className="flex flex-wrap gap-3">
                        <GlassInput placeholder="Search clubs…" value={clubSearch} onChange={e => setClubSearch(e.target.value)} className="flex-1" />
                        <GlassSelect value={clubCollegeFilter} onChange={e => setClubCollegeFilter(e.target.value)}>
                            <option value="All">All Colleges</option>
                            {uniqueColleges.map(c => <option key={c} value={c}>{c}</option>)}
                        </GlassSelect>
                    </div>
                    {tabLoading.clubs ? <LoadingSpinner /> : (
                        <GlassTable count={filteredClubs.length} label="club" headers={[
                            { label: 'Club' }, { label: 'College' }, { label: 'Category' }, { label: 'Coordinator' }, { label: 'Status', align: 'center' }
                        ]}>
                            {filteredClubs.length > 0 ? filteredClubs.map(c => (
                                <tr key={c.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-5 py-4 text-white font-semibold">{c.name}</td>
                                    <td className="px-5 py-4 text-slate-400 text-sm">{c.collegeName || '—'}</td>
                                    <td className="px-5 py-4 text-slate-400 text-sm">{c.category}</td>
                                    <td className="px-5 py-4 text-slate-400 text-sm">{c.coordinatorName || '—'}</td>
                                    <td className="px-4 py-4 text-center"><StatusBadge status={c.status} /></td>
                                </tr>
                            )) : (
                                <tr><td colSpan="5" className="text-center py-12 text-slate-500">No clubs match filter.</td></tr>
                            )}
                        </GlassTable>
                    )}
                </div>
            )}

            {/* ═══ EVENTS TAB ═══ */}
            {activeTab === 'events' && (
                <div className="space-y-4 animate-fadeIn">
                    <div className="flex flex-wrap gap-3">
                        <GlassInput placeholder="Search events…" value={eventSearch} onChange={e => setEventSearch(e.target.value)} className="flex-1" />
                        <GlassSelect value={eventStatus} onChange={e => setEventStatus(e.target.value)}>
                            {['All', 'UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
                        </GlassSelect>
                        <GlassSelect value={eventCollegeFilter} onChange={e => setEventCollegeFilter(e.target.value)}>
                            <option value="All">All Colleges</option>
                            {uniqueCollegesForEvents.map(c => <option key={c} value={c}>{c}</option>)}
                        </GlassSelect>
                    </div>
                    {tabLoading.events ? <LoadingSpinner /> : (
                        <GlassTable count={filteredEvents.length} label="event" headers={[
                            { label: 'Event' }, { label: 'College' }, { label: 'Club' }, { label: 'Date' }, { label: 'Regs', align: 'center' }, { label: 'Status', align: 'center' }
                        ]}>
                            {filteredEvents.length > 0 ? filteredEvents.map(e => (
                                <tr key={e.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-5 py-4">
                                        <p className="text-white font-semibold">{e.title}</p>
                                        <p className="text-slate-500 text-xs mt-0.5">📍 {e.venue}</p>
                                    </td>
                                    <td className="px-5 py-4 text-slate-400 text-xs">{e.collegeName || '—'}</td>
                                    <td className="px-5 py-4 text-sm text-slate-400">{e.clubName || <span className="text-blue-400">College</span>}</td>
                                    <td className="px-5 py-4 text-slate-400 text-xs">{e.eventDate ? new Date(e.eventDate).toLocaleDateString('en-IN') : '—'}</td>
                                    <td className="px-4 py-4 text-center text-amber-400 font-bold">{e.currentRegistrations || 0}</td>
                                    <td className="px-4 py-4 text-center"><StatusBadge status={e.status} /></td>
                                </tr>
                            )) : (
                                <tr><td colSpan="6" className="text-center py-12 text-slate-500">No events match filter.</td></tr>
                            )}
                        </GlassTable>
                    )}
                </div>
            )}

            {/* ═══ USERS TAB ═══ */}
            {activeTab === 'users' && (
                <div className="space-y-4 animate-fadeIn">
                    <div className="flex flex-wrap gap-3">
                        <GlassInput placeholder="Search by name or email…" value={userSearch} onChange={e => setUserSearch(e.target.value)} className="flex-1" />
                        <GlassSelect value={userRole} onChange={e => setUserRole(e.target.value)}>
                            {['All', 'STUDENT', 'COLLEGE_ADMIN', 'CLUB_COORDINATOR', 'PLATFORM_ADMIN'].map(r => (
                                <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                            ))}
                        </GlassSelect>
                    </div>
                    {tabLoading.users ? <LoadingSpinner /> : (
                        <GlassTable count={filteredUsers.length} label="user" headers={[
                            { label: 'User' }, { label: 'Role' }, { label: 'College' }, { label: 'Status', align: 'center' }, { label: 'Actions', align: 'right' }
                        ]}>
                            {filteredUsers.length > 0 ? filteredUsers.map(u => (
                                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-5 py-4">
                                        <p className="text-white font-semibold">{u.name}</p>
                                        <p className="text-slate-500 text-xs mt-0.5">{u.email}</p>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${
                                            u.role === 'STUDENT' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                            u.role === 'COLLEGE_ADMIN' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                            u.role === 'CLUB_COORDINATOR' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                                            'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                        }`}>
                                            {u.role?.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-slate-400 text-xs">{u.collegeName || '—'}</td>
                                    <td className="px-4 py-4 text-center">
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${u.isActive ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                                            {u.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        {u.role !== 'PLATFORM_ADMIN' && (
                                            <button
                                                onClick={() => handleToggleUser(u.id)}
                                                className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-semibold ${
                                                    u.isActive
                                                    ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500 hover:text-white'
                                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500 hover:text-white'
                                                }`}
                                            >
                                                {u.isActive ? 'Deactivate' : 'Activate'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="5" className="text-center py-12 text-slate-500">No users match filter.</td></tr>
                            )}
                        </GlassTable>
                    )}
                </div>
            )}

            {/* ═══ FEEDBACK TAB ═══ */}
            {activeTab === 'feedback' && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-black text-white mb-1">User Feedback</h2>
                            <p className="text-slate-400 text-sm">Average Platform Rating: 
                                <span className="ml-2 text-amber-400 font-bold">
                                    {feedbacks.length > 0 
                                        ? (feedbacks.reduce((acc, f) => acc + f.rating, 0) / feedbacks.length).toFixed(1) 
                                        : '0.0'} ⭐
                                </span>
                            </p>
                        </div>
                        <div className="text-slate-500 text-xs italic">Total Responses: {feedbacks.length}</div>
                    </div>

                    {tabLoading.feedback ? <LoadingSpinner /> : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {feedbacks.length > 0 ? feedbacks.map(f => (
                                <div key={f.id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 hover:bg-white/10 transition-all group">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/20">
                                                {f.userName?.[0] || '?'}
                                            </div>
                                            <div>
                                                <p className="text-white font-bold text-sm">{f.userName}</p>
                                                <p className="text-slate-500 text-[10px] uppercase tracking-widest">{new Date(f.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <span key={star} className={`text-sm ${f.rating >= star ? 'text-amber-400' : 'text-slate-700'}`}>★</span>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-slate-300 text-sm leading-relaxed italic">"{f.comment || 'No comment provided.'}"</p>
                                </div>
                            )) : (
                                <div className="col-span-full text-center py-20 text-slate-500 bg-white/5 rounded-3xl border border-white/10 border-dashed italic">
                                    No feedback has been submitted yet.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ═══ ANALYTICS TAB ═══ */}
            {activeTab === 'analytics' && (
                <AnalyticsTab
                    telStats={telStats}
                    liveFeed={liveFeed}
                    hasMounted={hasMounted}
                    tabLoading={tabLoading}
                />
            )}

            {/* ═══ ASK AI TAB ═══ */}
            {activeTab === 'ask-ai' && (
                <AskAITab
                    aiQuestion={aiQuestion}
                    setAiQuestion={setAiQuestion}
                    aiLoading={aiLoading}
                    aiHistory={aiHistory}
                    handleAskAI={handleAskAI}
                />
            )}

            {/* ═══ GOD MODE TAB ═══ */}
            {activeTab === 'god-mode' && (
                <GodModeTab
                    colleges={colleges} clubs={clubs} events={events} users={users}
                    godTab={godTab} setGodTab={setGodTab}
                    openEdit={openEdit} setConfirmDelete={setConfirmDelete}
                    handleToggleUser={handleToggleUser} handleChangeRole={handleChangeRole}
                    broadcastForm={broadcastForm} setBroadcastForm={setBroadcastForm} handleBroadcast={handleBroadcast}
                    dbHealth={dbHealth} loadDbHealth={loadDbHealth}
                />
            )}

            {/* Shared overlays */}
            <EditModal
                editModal={editModal} editForm={editForm} setEditForm={setEditForm}
                closeEdit={closeEdit} handleSaveEdit={handleSaveEdit}
            />
            <DeleteConfirm
                confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete}
                handleDeleteConfirmed={handleDeleteConfirmed}
            />

            {/* College Details Modal */}
            {selectedCollege && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900/90 backdrop-blur z-10">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    {selectedCollege.name}
                                    <StatusBadge status={selectedCollege.status} />
                                </h3>
                                <p className="text-slate-400 text-sm mt-1">{selectedCollege.location}</p>
                            </div>
                            <button onClick={() => setSelectedCollege(null)} className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-lg transition-colors">
                                ✕
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Verification Data Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                    <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">College Type</span>
                                    <span className="text-white">{selectedCollege.type || '—'}</span>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                    <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Established Year</span>
                                    <span className="text-white">{selectedCollege.establishedYear || '—'}</span>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                    <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Affiliation</span>
                                    <span className="text-white">{selectedCollege.affiliation || '—'}</span>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                    <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">NAAC Grade</span>
                                    <span className="text-white">{selectedCollege.naacGrade || '—'}</span>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                    <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Contact Email</span>
                                    <span className="text-white">{selectedCollege.contactEmail || '—'}</span>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                    <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Website</span>
                                    {selectedCollege.website ? (
                                        <a href={selectedCollege.website} target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300 underline underline-offset-2">{selectedCollege.website}</a>
                                    ) : <span className="text-slate-500">—</span>}
                                </div>
                            </div>
                            
                            {/* Description */}
                            <div>
                                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</span>
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 text-slate-300 text-sm whitespace-pre-wrap">
                                    {selectedCollege.description || 'No description provided.'}
                                </div>
                            </div>

                            {/* Admin Data */}
                            <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl">
                                <span className="block text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Primary Administrator</span>
                                <div className="flex justify-between items-center">
                                    <span className="text-white font-medium">{selectedCollege.adminName || '—'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3 rounded-b-2xl">
                            {selectedCollege.status !== 'APPROVED' && (
                                <button onClick={() => { handleApprove(selectedCollege.id); setSelectedCollege(null); }} className="px-6 py-2.5 bg-emerald-500 text-white hover:bg-emerald-400 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all">
                                    Approve College
                                </button>
                            )}
                            {selectedCollege.status !== 'SUSPENDED' && selectedCollege.status !== 'REJECTED' && (
                                <button onClick={() => { handleSuspend(selectedCollege.id); setSelectedCollege(null); }} className="px-6 py-2.5 bg-slate-800 text-red-400 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500 rounded-xl font-bold transition-all">
                                    Reject / Suspend
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
