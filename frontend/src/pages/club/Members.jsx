import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import { toast } from '../../components/Toast';
import { BACKEND_URL } from '../../config';
import LoadingSpinner from '../../components/LoadingSpinner';

const GlassSelect = ({ value, onChange, children }) => (
    <div className="relative group">
        <select
            value={value}
            onChange={onChange}
            className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white text-sm outline-none focus:border-emerald-500/50 transition-all appearance-none cursor-pointer shadow-xl min-w-[200px] hover:bg-white/10"
        >
            {children}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-emerald-400 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
        </div>
    </div>
);

export default function ClubRegistrations() {
    const { clubId } = useParams();
    const [individuals, setIndividuals] = useState([]);
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('individuals'); // 'individuals' or 'teams'
    const [search, setSearch] = useState('');
    const [eventFilter, setEventFilter] = useState('All');
    const [selectedScreenshot, setSelectedScreenshot] = useState(null);

    useEffect(() => {
        fetchRegistrations();
    }, []);

    const fetchRegistrations = async () => {
        try {
            const q = clubId ? `?club_id=${clubId}` : '';
            const res = await api.get(`/api/club/all-registrations${q}`);
            setIndividuals(res.data?.individuals || []);
            setTeams(res.data?.teams || []);
        } catch (error) {
            toast('Failed to load registrations', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyIndividual = async (regId) => {
        try {
            const q = clubId ? `?club_id=${clubId}` : '';
            await api.put(`/api/club/registrations/${regId}/verify${q}`);
            fetchRegistrations();
            toast('Registration verified', 'success');
        } catch (error) {
            toast('Failed to verify', 'error');
        }
    };

    const handleRejectIndividual = async (regId) => {
        const reason = window.prompt("Enter rejection reason:");
        if (!reason) return;
        try {
            const q = clubId ? `?club_id=${clubId}` : '';
            await api.put(`/api/club/registrations/${regId}/reject${q}`, { reason });
            fetchRegistrations();
            toast('Registration rejected', 'success');
        } catch (error) {
            toast('Failed to reject', 'error');
        }
    };

    const handleVerifyTeamLeader = async (teamId) => {
        try {
            const q = clubId ? `?club_id=${clubId}` : '';
            await api.put(`/api/club/team-leader/${teamId}/verify${q}`);
            fetchRegistrations();
            toast('Leader payment verified', 'success');
        } catch (error) {
            toast('Failed to verify', 'error');
        }
    };

    const handleRejectTeamLeader = async (teamId) => {
        if (!window.confirm("Reject leader payment?")) return;
        try {
            const q = clubId ? `?club_id=${clubId}` : '';
            await api.put(`/api/club/team-leader/${teamId}/reject${q}`);
            fetchRegistrations();
            toast('Leader payment rejected', 'success');
        } catch (error) {
            toast('Failed to reject', 'error');
        }
    };

    const handleVerifyTeamMember = async (memberId) => {
        try {
            const q = clubId ? `?club_id=${clubId}` : '';
            await api.put(`/api/club/team-member/${memberId}/verify${q}`);
            fetchRegistrations();
            toast('Member payment verified', 'success');
        } catch (error) {
            toast('Failed to verify', 'error');
        }
    };

    const handleRejectTeamMember = async (memberId) => {
        if (!window.confirm("Reject member payment?")) return;
        try {
            const q = clubId ? `?club_id=${clubId}` : '';
            await api.put(`/api/club/team-member/${memberId}/reject${q}`);
            fetchRegistrations();
            toast('Member payment rejected', 'success');
        } catch (error) {
            toast('Failed to reject', 'error');
        }
    };
    const renderMemberRow = ({
        id, name, email, isLeader, status,
        paymentRef, paymentShot, onViewShot,
        onVerify, onReject, key // Add key here
    }) => {
        const isVerified = status === "PAID" || status === "VERIFIED" || status === "FREE";
        const isAwaiting = paymentRef || paymentShot;

        return (
            <div key={key || id} className="flex items-start gap-4 px-6 py-5 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                {/* Icon */}
                <div className="relative text-2xl mt-1 flex-shrink-0">
                    {isLeader ? "👑" : "👤"}
                    {isVerified && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-[#1e293b]">
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                        </div>
                    )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                        <p className="text-white font-bold text-sm tracking-tight italic uppercase leading-none">
                            {name || "Unknown"}
                        </p>
                        {isLeader && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black uppercase tracking-widest italic shadow-sm">
                                Leader
                            </span>
                        )}
                        {!isVerified && isAwaiting && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-black uppercase tracking-widest italic shadow-sm">
                                Awaiting Confirmation
                            </span>
                        )}
                    </div>

                    {email && (
                        <p className="text-slate-500 text-[10px] font-bold tracking-widest leading-none mb-3 uppercase">{email}</p>
                    )}

                    {/* Transaction Box */}
                    <div className="flex items-center gap-4 flex-wrap">
                        {paymentRef ? (
                            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/5 border border-white/5 shadow-inner group/txn">
                                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest italic">TXN ID:</span>
                                <code className="text-emerald-400 font-mono text-[11px] font-bold tracking-tighter group-hover/txn:text-indigo-400 transition-colors">
                                    {paymentRef}
                                </code>
                            </div>
                        ) : (status !== "FREE" && status !== "UNPAID") && (
                            <span className="text-slate-600 text-[9px] font-black uppercase tracking-widest italic opacity-50">
                                No transaction ID provided
                            </span>
                        )}

                        {paymentShot && (
                            <button
                                onClick={() => onViewShot(paymentShot)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 text-[10px] font-black uppercase tracking-widest italic transition-all border border-indigo-500/10 shadow-lg shadow-indigo-500/5 group/btn"
                            >
                                <span className="text-base group-hover/btn:scale-110 transition-transform">🖼️</span>
                                View Proof
                            </button>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-center">
                    {!isVerified && isAwaiting && (
                        <>
                            <button 
                                onClick={() => onVerify(id)}
                                className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/30 transition-all border border-emerald-500/20 shadow-lg shadow-emerald-500/10 group/ok"
                                title="Confirm Payment"
                            >
                                <svg className="w-6 h-6 group-hover/ok:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                            </button>
                            <button 
                                onClick={() => onReject(id)}
                                className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center hover:bg-rose-500/30 transition-all border border-rose-500/20 shadow-lg shadow-rose-500/10 group/no"
                                title="Reject Proof"
                            >
                                <svg className="w-6 h-6 group-hover/no:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    };



    const activeIndividuals = individuals.filter(r => r.event?.status !== 'COMPLETED' && r.event?.status !== 'CANCELLED');
    const activeTeams = teams.filter(t => t.event?.status !== 'COMPLETED' && t.event?.status !== 'CANCELLED');

    const eventTitles = ['All', ...new Set([
        ...activeIndividuals.map(r => r.eventTitle || r.event_title),
        ...activeTeams.map(t => t.event?.title || t.event_title)
    ].filter(Boolean))];

    const filteredIndividuals = activeIndividuals.filter(r => {
        const matchSearch = !search || 
            r.studentName?.toLowerCase().includes(search.toLowerCase()) || 
            r.studentEmail?.toLowerCase().includes(search.toLowerCase());
        const eventTitle = r.eventTitle || r.event_title;
        const matchEvent = eventFilter === 'All' || eventTitle === eventFilter;
        return matchSearch && matchEvent;
    });

    const filteredTeams = activeTeams.filter(t => {
        const matchSearch = !search || 
            t.team_name?.toLowerCase().includes(search.toLowerCase()) || 
            t.leader?.name?.toLowerCase().includes(search.toLowerCase());
        const eventTitle = t.event?.title || t.event_title;
        const matchEvent = eventFilter === 'All' || eventTitle === eventFilter;
        return matchSearch && matchEvent;
    });

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-8 animate-fadeIn pb-20 relative">
            <div className="fixed top-32 left-32 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none -z-10" />

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 relative z-10">
                <div>
                    <h1 className="text-4xl font-display font-black text-white mb-2 tracking-tight uppercase italic">Event <span className="text-emerald-400">Registrations</span></h1>
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest italic flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        {activeTab === 'individuals' ? filteredIndividuals.length : filteredTeams.length} {activeTab} Records Found
                    </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                    <div className="relative group flex-1 sm:w-80">
                        <input
                            type="text"
                            placeholder={activeTab === 'individuals' ? "Search student name or email…" : "Search team or leader…"}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-3.5 text-white text-sm outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all placeholder:text-slate-500 shadow-xl"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                    <GlassSelect value={eventFilter} onChange={e => setEventFilter(e.target.value)}>
                        {eventTitles.map(title => (
                            <option key={title} value={title}>{title}</option>
                        ))}
                    </GlassSelect>
                </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-2 p-1.5 bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 w-fit relative z-10">
                <button
                    onClick={() => setActiveTab('individuals')}
                    className={`px-8 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                        activeTab === 'individuals' 
                        ? 'bg-emerald-500 text-white shadow-[0_8px_20px_rgba(16,185,129,0.3)] scale-105' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    👤 Individuals
                </button>
                <button
                    onClick={() => setActiveTab('teams')}
                    className={`px-8 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                        activeTab === 'teams' 
                        ? 'bg-emerald-500 text-white shadow-[0_8px_20px_rgba(16,185,129,0.3)] scale-105' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    👥 Teams
                </button>
            </div>

            <div className="bg-[#1e293b]/40 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden relative z-10">
                <div className="overflow-x-auto">
                    {activeTab === 'individuals' ? (
                        <table className="w-full text-sm text-left block md:table">
                            <thead className="hidden md:table-header-group bg-white/5 text-slate-500 text-[10px] uppercase tracking-[0.25em] font-black italic">
                                <tr>
                                    <th className="px-8 py-6">Student Details</th>
                                    <th className="px-8 py-6">Event Context</th>
                                    <th className="px-8 py-6 text-center">Status</th>
                                    <th className="px-8 py-6 text-right">Registration Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 block md:table-row-group">
                                {filteredIndividuals.length > 0 ? (
                                    filteredIndividuals.map((r) => (
                                        <tr key={r.id} className="hover:bg-white/[0.03] transition-colors group flex flex-col md:table-row border-b border-white/5 md:border-0 mb-4 md:mb-0">
                                            <td className="px-4 py-3 md:px-8 md:py-6 block md:table-cell relative border-b border-white/5 md:border-0">
                                                <div className="md:hidden text-[10px] text-slate-500 uppercase font-black uppercase tracking-widest italic mb-2">Student Details</div>
                                                <div className="flex items-center gap-5">
                                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-indigo-600/20 border border-white/10 flex items-center justify-center text-emerald-400 font-black text-xl shadow-inner group-hover:scale-110 transition-transform">
                                                        {r.studentName?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-black uppercase tracking-tight italic group-hover:text-emerald-400 transition-colors leading-none mb-1">{r.studentName}</p>
                                                        <p className="text-slate-500 text-[10px] font-bold tracking-widest">{r.studentEmail}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 md:px-8 md:py-6 block md:table-cell relative border-b border-white/5 md:border-0">
                                                <div className="md:hidden text-[10px] text-slate-500 uppercase font-black uppercase tracking-widest italic mb-2">Event Context</div>
                                                <div className="space-y-1">
                                                    <p className="text-emerald-400 text-xs font-black uppercase tracking-widest italic">{r.eventTitle}</p>
                                                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-tight italic">Date: {r.eventDate ? new Date(r.eventDate).toLocaleDateString() : '—'}</p>
                                                    {r.paymentRef && (
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[9px] text-slate-500 font-mono">ID: {r.paymentRef}</span>
                                                            {r.paymentScreenshotUrl && (
                                                                <button 
                                                                    onClick={() => setSelectedScreenshot(r.paymentScreenshotUrl)}
                                                                    className="text-emerald-400 hover:text-emerald-300 transition-colors"
                                                                >
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 md:px-8 md:py-6 block md:table-cell text-left md:text-center relative border-b border-white/5 md:border-0">
                                                <div className="md:hidden text-[10px] text-slate-500 uppercase font-black uppercase tracking-widest italic mb-2">Status</div>
                                                <div className="flex flex-col items-center gap-2">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest italic border shadow-sm ${
                                                        r.status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                        r.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                    }`}>
                                                        {r.status || 'PENDING'}
                                                    </span>
                                                    {r.status === 'PENDING' && (
                                                        <div className="flex gap-1">
                                                            <button 
                                                                onClick={() => handleVerifyIndividual(r.id)}
                                                                className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/30 transition-all border border-emerald-500/20"
                                                                title="Verify"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                                                            </button>
                                                            <button 
                                                                onClick={() => handleRejectIndividual(r.id)}
                                                                className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center hover:bg-rose-500/30 transition-all border border-rose-500/20"
                                                                title="Reject"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 md:px-8 md:py-6 block md:table-cell text-left md:text-right relative">
                                                <div className="md:hidden text-[10px] text-slate-500 uppercase font-black uppercase tracking-widest italic mb-2">Registration Date</div>
                                                <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest italic mt-1">{new Date(r.registeredAt || r.created_at || Date.now()).toLocaleDateString()}</p>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <EmptyState msg="No individual registrations found." />
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto no-scrollbar">
                            {filteredTeams.length > 0 ? (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                    {filteredTeams.map((team) => (
                                        <div key={team.id} className="bg-white/[0.02] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl hover:border-emerald-500/20 transition-all group/card">
                                            {/* Team Header */}
                                            <div className="p-6 bg-white/5 flex items-center justify-between border-b border-white/5 group-hover/card:bg-white/[0.08] transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-3xl bg-emerald-500/10 flex items-center justify-center text-2xl shadow-inner border border-white/5 group-hover/card:scale-110 transition-transform">🛡️</div>
                                                    <div>
                                                        <h3 className="text-white font-black text-lg tracking-tight italic uppercase leading-none mb-1">{team.teamName}</h3>
                                                        <p className="text-emerald-400 text-[9px] font-black uppercase tracking-[0.2em] italic opacity-70">{team.event?.title} • ID: #{team.id}</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <span className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest italic border shadow-lg ${
                                                        team.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10' :
                                                        'bg-amber-500/20 text-amber-400 border-amber-500/20 animate-pulse'
                                                    }`}>
                                                        {team.status === 'COMPLETED' ? 'REGISTERED' : team.status.replace('_', ' ')}
                                                    </span>
                                                    <div className="flex gap-1.5 px-2 py-1 bg-black/20 rounded-lg">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${team.paymentStatus === 'PAID' ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`} title="Leader Paid" />
                                                        {team.members?.map((m, mi) => (
                                                            <div key={mi} className={`w-1.5 h-1.5 rounded-full ${m.paymentStatus === 'PAID' ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`} title={`Member ${mi+1} Paid`} />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Team Body */}
                                            <div className="bg-white/[0.01]">
                                                {/* Leader */}
                                                {renderMemberRow({
                                                    id: team.id,
                                                    name: team.leaderName,
                                                    email: team.leaderEmail,
                                                    isLeader: true,
                                                    status: team.leaderPaymentStatus,
                                                    paymentRef: team.leaderPaymentRef,
                                                    paymentShot: team.leaderPaymentScreenshot,
                                                    onViewShot: (shot) => setSelectedScreenshot(`${BACKEND_URL}${shot}`),
                                                    onVerify: handleVerifyTeamLeader,
                                                    onReject: handleRejectTeamLeader
                                                })}
                                                
                                                {/* Members */}
                                                {team.members && team.members.map(member => renderMemberRow({
                                                    id: member.id,
                                                    name: member.invitedName || member.name,
                                                    email: member.invitedEmail || member.email,
                                                    isLeader: false,
                                                    status: member.paymentStatus,
                                                    paymentRef: member.paymentRef,
                                                    paymentShot: member.paymentScreenshot,
                                                    onViewShot: (shot) => setSelectedScreenshot(`${BACKEND_URL}${shot}`),
                                                    onVerify: handleVerifyTeamMember,
                                                    onReject: handleRejectTeamMember,
                                                    key: member.id // Add key here
                                                }))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 text-slate-500 uppercase text-xs font-black tracking-widest opacity-40">No teams registered yet</div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Image Preview Modal */}
            {selectedScreenshot && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-8 bg-[#070b14]/98 backdrop-blur-3xl animate-in fade-in duration-500">
                    <button 
                        onClick={() => setSelectedScreenshot(null)}
                        className="absolute top-12 right-12 w-16 h-16 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all border border-white/10 z-20 group"
                    >
                        <span className="text-3xl group-hover:scale-125 transition-transform duration-300">✕</span>
                    </button>
                    <div className="relative max-w-5xl max-h-full">
                        <img 
                            src={selectedScreenshot} 
                            className="w-full h-full object-contain rounded-3xl shadow-[0_0_100px_rgba(16,185,129,0.2)] border border-white/10" 
                            alt="Payment Proof"
                        />
                        <div className="absolute -bottom-12 left-0 right-0 text-center">
                            <p className="text-emerald-400 text-xs font-black uppercase tracking-[0.4em] italic">Transation Proof Artifact</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function EmptyState({ msg }) {
    return (
        <tr>
            <td colSpan="4" className="py-24 text-center">
                <div className="text-7xl mb-6 opacity-30 grayscale group-hover:grayscale-0 transition-all">📋</div>
                <h3 className="text-2xl font-display font-black text-white mb-3 tracking-tighter uppercase italic">{msg}</h3>
                <p className="text-slate-400 max-w-xs mx-auto text-sm font-medium">When students register, they will appear in this list. Try changing the event filters above.</p>
            </td>
        </tr>
    );
}
