import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../services/api';
import { toast } from '../../components/Toast';
import { exportToExcel } from '../../utils/exportToExcel';
import { BACKEND_URL } from '../../config';

export default function CollegeRegistrations() {
    const [allRegistrations, setAllRegistrations] = useState({ individuals: [], teams: [] });
    const [clubs, setClubs] = useState([]);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [regSubTab, setRegSubTab] = useState('individual');
    const [regClubFilter, setRegClubFilter] = useState('ALL');
    const [regEventFilter, setRegEventFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [selectedScreenshot, setSelectedScreenshot] = useState(null);
    const [expandedTeamId, setExpandedTeamId] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [regRes, clubsRes] = await Promise.all([
                api.get('/api/college-admin/registrations'),
                api.get('/api/college-admin/clubs'),
            ]);
            const regData = regRes.data || {};
            setAllRegistrations({
                individuals: Array.isArray(regData.individuals) ? regData.individuals : [],
                teams: Array.isArray(regData.teams) ? regData.teams : [],
            });
            const clubList = Array.isArray(clubsRes.data?.clubs) ? clubsRes.data.clubs : Array.isArray(clubsRes.data) ? clubsRes.data : [];
            setClubs(clubList);

            // Derive event list from registrations
            const eventMap = {};
            [...(regData.individuals || []), ...(regData.teams || [])].forEach(r => {
                if (r.eventId && r.eventTitle) eventMap[r.eventId] = { id: r.eventId, title: r.eventTitle, clubId: r.clubId };
            });
            setEvents(Object.values(eventMap));
        } catch (e) {
            toast('Failed to load registrations', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleVerifyIndividual = async (regId) => {
        try {
            await api.put(`/api/club/registrations/${regId}/verify`);
            toast('Registration verified', 'success');
            fetchData();
        } catch (error) { toast('Failed to verify', 'error'); }
    };

    const handleRejectIndividual = async (regId) => {
        const reason = window.prompt("Enter rejection reason:");
        if (!reason) return;
        try {
            await api.put(`/api/club/registrations/${regId}/reject`, { reason });
            toast('Registration rejected', 'success');
            fetchData();
        } catch (error) { toast('Failed to reject', 'error'); }
    };

    const handleVerifyTeamLeader = async (teamId) => {
        try {
            await api.put(`/api/club/team-leader/${teamId}/verify`);
            toast('Leader payment verified', 'success');
            fetchData();
        } catch (error) { toast('Failed to verify', 'error'); }
    };

    const handleRejectTeamLeader = async (teamId) => {
        if (!window.confirm("Reject leader payment?")) return;
        try {
            await api.put(`/api/club/team-leader/${teamId}/reject`);
            toast('Leader payment rejected', 'success');
            fetchData();
        } catch (error) { toast('Failed to reject', 'error'); }
    };

    const handleVerifyTeamMember = async (memberId) => {
        try {
            await api.put(`/api/club/team-member/${memberId}/verify`);
            toast('Member payment verified', 'success');
            fetchData();
        } catch (error) { toast('Failed to verify', 'error'); }
    };

    const handleRejectTeamMember = async (memberId) => {
        if (!window.confirm("Reject member payment?")) return;
        try {
            await api.put(`/api/club/team-member/${memberId}/reject`);
            toast('Member payment rejected', 'success');
            fetchData();
        } catch (error) { toast('Failed to reject', 'error'); }
    };

    const handleExport = () => {
        if (regSubTab === 'individual') {
            const dataToExport = filteredIndividuals.map(r => ({
                Name: r.studentName || r.name,
                Email: r.studentEmail || r.email,
                Event: r.eventTitle || r.event,
                Club: r.clubName || '—',
                Status: r.status || r.paymentStatus
            }));
            exportToExcel(dataToExport, `College_Registrations_Individuals`);
        } else {
            const exportData = [];
            filteredTeams.forEach(team => {
                exportData.push({
                    TeamID: team.id,
                    TeamName: team.teamName,
                    Event: team.eventTitle || team.event,
                    Club: team.clubName || '—',
                    Role: 'Leader',
                    Name: team.leaderName || team.leader,
                    Email: team.leaderEmail,
                    TeamStatus: team.status,
                    MemberStatus: team.leaderPaymentStatus
                });
                team.members?.forEach(member => {
                    exportData.push({
                        TeamID: team.id,
                        TeamName: team.teamName,
                        Event: team.eventTitle || team.event,
                        Club: team.clubName || '—',
                        Role: 'Member',
                        Name: member.name || member.invitedName,
                        Email: member.email || member.invitedEmail,
                        TeamStatus: team.status,
                        MemberStatus: member.paymentStatus
                    });
                });
            });
            exportToExcel(exportData, `College_Registrations_Teams`);
        }
    };

    const filteredIndividuals = useMemo(() => {
        return allRegistrations.individuals.filter(r => {
            if (r.teamName) return false;
            if (regClubFilter !== 'ALL' && String(r.clubId) !== regClubFilter) return false;
            if (regEventFilter !== 'ALL' && String(r.eventId) !== regEventFilter) return false;
            if (statusFilter !== 'ALL') {
                const s = (r.status || r.paymentStatus || 'PENDING').toUpperCase();
                if (!s.includes(statusFilter)) return false;
            }
            return true;
        });
    }, [allRegistrations.individuals, regClubFilter, regEventFilter, statusFilter]);

    const filteredTeams = useMemo(() => {
        return allRegistrations.teams.filter(t => {
            if (regClubFilter !== 'ALL' && String(t.clubId) !== regClubFilter) return false;
            if (regEventFilter !== 'ALL' && String(t.eventId) !== regEventFilter) return false;
            if (statusFilter !== 'ALL') {
                const s = (t.status || 'PENDING').toUpperCase();
                if (!s.includes(statusFilter)) return false;
            }
            return true;
        });
    }, [allRegistrations.teams, regClubFilter, regEventFilter, statusFilter]);

    const statusBadge = (s = 'PENDING') => {
        const st = s.toUpperCase();
        const cls = ['VERIFIED', 'PAID', 'FREE', 'COMPLETED'].includes(st)
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : st === 'PENDING' || st === 'AWAITING_PAYMENT' || st === 'PARTIALLY_PAID'
            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            : 'bg-rose-500/10 text-rose-400 border-rose-500/20';
        return <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${cls}`}>{st}</span>;
    };

    const renderMemberRow = ({ id, name, email, isLeader, status, paymentRef, paymentShot, onViewShot, onVerify, onReject }) => {
        const isVerified = status === "PAID" || status === "VERIFIED" || status === "FREE";
        const isAwaiting = paymentRef || paymentShot;

        return (
            <div key={id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-t border-slate-700/30 bg-slate-800/20">
                <div className="flex items-start gap-3">
                    <div className="text-xl">{isLeader ? "👑" : "👤"}</div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-white text-sm font-semibold">{name || 'Unknown'}</span>
                            {isLeader && <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 uppercase tracking-widest font-black">Leader</span>}
                            {statusBadge(status)}
                        </div>
                        <p className="text-slate-500 text-[10px] uppercase font-mono">{email}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 ml-10 sm:ml-0">
                    {paymentRef && <code className="text-emerald-400 font-mono text-[10px] bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">TXN: {paymentRef}</code>}
                    {paymentShot && (
                        <button onClick={() => onViewShot(paymentShot)} className="text-indigo-400 text-[10px] hover:text-indigo-300 underline font-semibold">
                            View Proof
                        </button>
                    )}
                    
                    {!isVerified && isAwaiting && (
                        <div className="flex gap-1 ml-2">
                            <button onClick={() => onVerify(id)} className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/30 transition-all" title="Confirm">
                                ✓
                            </button>
                            <button onClick={() => onReject(id)} className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center hover:bg-rose-500/30 transition-all" title="Reject">
                                ✕
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fadeIn pb-12 relative">
            <div className="fixed top-32 right-32 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between relative z-10">
                <div>
                    <h1 className="text-3xl font-display font-black text-white italic uppercase tracking-tighter">All Registrations</h1>
                    <p className="text-slate-400 text-sm mt-1">View and filter all event registrations across your college.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleExport} disabled={loading}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2">
                        📊 Export Excel
                    </button>
                    <button onClick={fetchData} disabled={loading}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2">
                        {loading ? '⏳...' : '🔄 Refresh'}
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center relative z-10">
                <select value={regClubFilter} onChange={e => { setRegClubFilter(e.target.value); setRegEventFilter('ALL'); }}
                    className="bg-slate-800 text-slate-300 rounded-xl px-3 py-2 border border-slate-700 text-xs focus:outline-none focus:border-indigo-500">
                    <option value="ALL">All Clubs</option>
                    {clubs.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </select>
                <select value={regEventFilter} onChange={e => setRegEventFilter(e.target.value)}
                    className="bg-slate-800 text-slate-300 rounded-xl px-3 py-2 border border-slate-700 text-xs focus:outline-none focus:border-indigo-500">
                    <option value="ALL">All Events</option>
                    {events.filter(ev => regClubFilter === 'ALL' || String(ev.clubId) === regClubFilter)
                        .map(ev => <option key={ev.id} value={String(ev.id)}>{ev.title}</option>)}
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className="bg-slate-800 text-slate-300 rounded-xl px-3 py-2 border border-slate-700 text-xs focus:outline-none focus:border-indigo-500">
                    <option value="ALL">All Statuses</option>
                    <option value="VERIFIED">Verified</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="PENDING">Pending</option>
                    <option value="PAID">Paid</option>
                    <option value="FREE">Free</option>
                    <option value="REJECTED">Rejected</option>
                </select>
                <div className="text-slate-500 text-xs ml-auto">
                    {regSubTab === 'individual' ? filteredIndividuals.length : filteredTeams.length} results
                </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-1 p-1 bg-slate-800/50 rounded-2xl border border-slate-700/50 w-fit relative z-10">
                {[{ id: 'individual', label: 'Individual', icon: '👤' }, { id: 'team', label: 'Teams', icon: '👥' }].map(t => (
                    <button key={t.id} onClick={() => setRegSubTab(t.id)}
                        className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${regSubTab === t.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                        <span>{t.icon}</span><span>{t.label}</span>
                    </button>
                ))}
            </div>

            {/* Table */}
            {loading ? (
                <div className="py-20 text-center text-slate-500 text-sm animate-pulse">Loading registrations...</div>
            ) : regSubTab === 'individual' ? (
                <div className="bg-slate-800/30 rounded-[2rem] border border-slate-700/50 overflow-hidden relative z-10">
                    <div className="grid grid-cols-6 gap-4 px-6 py-3 bg-slate-800/80 border-b border-slate-700 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <span className="col-span-2">Student</span><span>Event</span><span>Club</span><span>Status</span><span>Action</span>
                    </div>
                    <div className="divide-y divide-slate-700/30">
                        {filteredIndividuals.length === 0 ? (
                            <div className="py-16 text-center text-slate-500 text-sm">No individual registrations found</div>
                        ) : filteredIndividuals.map((r, i) => (
                            <div key={r.id || i} className="grid grid-cols-6 gap-4 px-6 py-4 hover:bg-slate-700/20 transition-colors items-center">
                                <div className="col-span-2">
                                    <p className="text-white text-sm font-semibold">{r.name || r.studentName}</p>
                                    <p className="text-slate-500 text-[10px] font-mono">{r.email || r.studentEmail}</p>
                                </div>
                                <p className="text-slate-300 text-xs truncate">{r.eventTitle || r.event}</p>
                                <p className="text-slate-400 text-xs truncate">{r.clubName || '—'}</p>
                                <div className="flex flex-col items-start gap-1">
                                    {statusBadge(r.status || r.paymentStatus)}
                                    {r.paymentScreenshotUrl && (
                                        <button onClick={() => setSelectedScreenshot(`${BACKEND_URL}${r.paymentScreenshotUrl}`)}
                                            className="text-indigo-400 text-[10px] underline hover:text-indigo-300">View Proof</button>
                                    )}
                                </div>
                                <div>
                                    {(r.status || r.paymentStatus) === 'PENDING' && (r.paymentRef || r.paymentScreenshotUrl) ? (
                                        <div className="flex gap-1">
                                            <button onClick={() => handleVerifyIndividual(r.id)} className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/30 transition-all" title="Verify">
                                                ✓
                                            </button>
                                            <button onClick={() => handleRejectIndividual(r.id)} className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center hover:bg-rose-500/30 transition-all" title="Reject">
                                                ✕
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="text-slate-600 text-[10px]">—</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-slate-800/30 rounded-[2rem] border border-slate-700/50 overflow-hidden relative z-10">
                    <div className="grid grid-cols-6 gap-4 px-6 py-3 bg-slate-800/80 border-b border-slate-700 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <span className="col-span-2">Team</span><span>Event</span><span>Club</span><span>Status</span><span>Members</span>
                    </div>
                    <div className="divide-y divide-slate-700/30">
                        {filteredTeams.length === 0 ? (
                            <div className="py-16 text-center text-slate-500 text-sm">No team registrations found</div>
                        ) : filteredTeams.map((t, i) => (
                            <div key={t.id || i} className="flex flex-col">
                                <div 
                                    onClick={() => setExpandedTeamId(expandedTeamId === t.id ? null : t.id)}
                                    className="grid grid-cols-6 gap-4 px-6 py-4 hover:bg-slate-700/20 transition-colors items-center cursor-pointer"
                                >
                                    <div className="col-span-2 flex items-center gap-3">
                                        <span className="text-slate-500 text-xs">{expandedTeamId === t.id ? '▼' : '▶'}</span>
                                        <div>
                                            <p className="text-white text-sm font-semibold">{t.teamName}</p>
                                            <p className="text-slate-500 text-[10px]">Leader: {t.leaderName || t.leader}</p>
                                        </div>
                                    </div>
                                    <p className="text-slate-300 text-xs truncate">{t.eventTitle || t.event}</p>
                                    <p className="text-slate-400 text-xs truncate">{t.clubName || '—'}</p>
                                    <div>{statusBadge(t.status)}</div>
                                    {/* Real member count directly from backend model */}
                                    <p className="text-slate-400 text-xs">{t.memberCount ?? ((t.members?.length ?? 0) + 1)} members</p>
                                </div>
                                
                                {/* Expanded Detail Pane */}
                                {expandedTeamId === t.id && (
                                    <div className="bg-slate-900/50 border-t border-slate-700/30 p-2">
                                        {renderMemberRow({
                                            id: t.id,
                                            name: t.leaderName,
                                            email: t.leaderEmail,
                                            isLeader: true,
                                            status: t.leaderPaymentStatus,
                                            paymentRef: t.leaderPaymentRef,
                                            paymentShot: t.leaderPaymentScreenshot,
                                            onViewShot: (s) => setSelectedScreenshot(`${BACKEND_URL}${s}`),
                                            onVerify: handleVerifyTeamLeader,
                                            onReject: handleRejectTeamLeader
                                        })}
                                        {t.members?.map(m => renderMemberRow({
                                            id: m.id,
                                            name: m.invitedName || m.name,
                                            email: m.invitedEmail || m.email,
                                            isLeader: false,
                                            status: m.paymentStatus,
                                            paymentRef: m.paymentRef,
                                            paymentShot: m.paymentScreenshot,
                                            onViewShot: (s) => setSelectedScreenshot(`${BACKEND_URL}${s}`),
                                            onVerify: handleVerifyTeamMember,
                                            onReject: handleRejectTeamMember
                                        }))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Proof Modal */}
            {selectedScreenshot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/90 backdrop-blur-sm" onClick={() => setSelectedScreenshot(null)}>
                    <img src={selectedScreenshot} className="max-w-full max-h-full object-contain rounded-2xl" alt="Proof" />
                </div>
            )}
        </div>
    );
}
