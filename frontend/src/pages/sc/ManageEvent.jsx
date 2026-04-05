import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../services/api";
import { toast } from "../../components/Toast";
import LoadingSpinner from "../../components/LoadingSpinner";
import { exportToExcel } from "../../utils/exportToExcel";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

export default function ManageEvent() {
    const { id } = useParams();
    const [event, setEvent] = useState(null);
    const [registrations, setRegistrations] = useState([]);
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedTeamId, setExpandedTeamId] = useState(null);
    const [selectedScreenshot, setSelectedScreenshot] = useState(null);

    const statusBadge = (s = 'PENDING') => {
        const st = s.toUpperCase();
        const cls = ['VERIFIED', 'PAID', 'FREE', 'COMPLETED'].includes(st)
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : st === 'PENDING' || st === 'AWAITING_PAYMENT' || st === 'PARTIALLY_PAID'
            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            : 'bg-rose-500/10 text-rose-400 border-rose-500/20';
        return <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${cls}`}>{st}</span>;
    };

    const renderMemberRow = ({ id, name, email, isLeader, status, paymentRef, paymentShot }) => {
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
                        <button onClick={() => setSelectedScreenshot(`${BACKEND_URL}${paymentShot}`)} className="text-indigo-400 text-[10px] hover:text-indigo-300 underline font-semibold">
                            View Proof
                        </button>
                    )}
                </div>
            </div>
        );
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            const [eventRes, regsRes] = await Promise.all([
                api.get(`/api/public/events/${id}`),
                api.get(`/api/sc/events/${id}/registrations`)
            ]);
            setEvent(eventRes.data);
            setRegistrations(regsRes.data.registrations || []);
            setTeams(regsRes.data.teams || []);
        } catch (err) {
            toast("Failed to load event details", "error");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    const isTeamEvent = event?.registration_type === "TEAM";

    const handleExport = () => {
        const dataToExport = [];
        
        if (!isTeamEvent || registrations.length > 0) {
            registrations.forEach(r => {
                dataToExport.push({
                    Type: 'Individual',
                    TeamName: r.teamName || '-',
                    Role: 'Individual',
                    Name: r.studentName,
                    Email: r.studentEmail,
                    Status: r.status,
                    RegisteredAt: r.registeredAt ? new Date(r.registeredAt).toLocaleDateString() : 'N/A'
                });
            });
        }
        
        if (isTeamEvent || teams.length > 0) {
            teams.forEach(team => {
                dataToExport.push({
                    Type: 'Team',
                    TeamName: team.teamName,
                    Role: 'Leader',
                    Name: team.leaderName,
                    Email: team.leaderEmail,
                    Status: team.status,
                    RegisteredAt: team.createdAt ? new Date(team.createdAt).toLocaleDateString() : 'N/A'
                });
                team.members?.forEach(member => {
                    dataToExport.push({
                        Type: 'Team',
                        TeamName: team.teamName,
                        Role: 'Member',
                        Name: member.invitedName || member.name || '-',
                        Email: member.invitedEmail || member.email || '-',
                        Status: member.paymentStatus,
                        RegisteredAt: team.createdAt ? new Date(team.createdAt).toLocaleDateString() : 'N/A'
                    });
                });
            });
        }

        exportToExcel(dataToExport, `${event?.title ? event.title.replace(/[^a-z0-9]/gi, '_') : 'Event'}_Registrations`);
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link to="/sc/events" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all hover:bg-white/10">
                        ←
                    </Link>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-display font-black text-white tracking-tight">
                            Manage Event
                        </h1>
                        <p className="text-indigo-400 font-bold text-sm tracking-wide uppercase mt-1">
                            {event?.title}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    <div className="bg-indigo-600/10 border border-indigo-500/20 px-4 py-2 rounded-2xl">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none mb-1">
                            {isTeamEvent ? "Total Teams" : "Individuals"}
                        </p>
                        <p className="text-white font-black text-xl leading-none">
                            {isTeamEvent ? teams.length : registrations.length}
                        </p>
                    </div>
                    {isTeamEvent && (
                        <div className="bg-emerald-600/10 border border-emerald-500/20 px-4 py-2 rounded-2xl">
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none mb-1">Total Members</p>
                            <p className="text-white font-black text-xl leading-none">
                                {teams.reduce((acc, t) => acc + (t.members?.length || 0), 0)}
                            </p>
                        </div>
                    )}
                    <button onClick={handleExport} className="h-full px-5 py-3 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 text-sm font-bold transition-all flex items-center gap-2">
                        📊 Export Excel
                    </button>
                </div>
            </div>

            {/* INDIVIDUAL REGISTRATIONS (Only if not purely team event or if individual regs exist) */}
            {(!isTeamEvent || registrations.length > 0) && (
                <div className="bg-[#1e293b]/50 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
                    <div className="p-6 md:p-8 border-b border-white/5 bg-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-sm">👤</span>
                                Individual Registrations
                            </h2>
                            <p className="text-slate-400 text-sm mt-1">Students registered individually for this event.</p>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                                    <th className="px-8 py-5">Student Information</th>
                                    <th className="px-8 py-5">Status</th>
                                    <th className="px-8 py-5 text-right">Registered On</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {registrations.map(reg => (
                                    <tr key={reg.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                                                    {reg.studentName?.[0] || 'S'}
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold group-hover:text-indigo-400 transition-colors uppercase">
                                                        {reg.studentName}
                                                        {reg.teamName && <span className="ml-2 text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded italic">Team: {reg.teamName}</span>}
                                                    </p>
                                                    <p className="text-slate-500 text-xs font-medium">{reg.studentEmail}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                                reg.status === 'VERIFIED' || reg.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            }`}>
                                                {reg.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <p className="text-slate-400 text-xs font-bold font-mono">
                                                {reg.registeredAt ? new Date(reg.registeredAt).toLocaleDateString() : 'N/A'}
                                            </p>
                                        </td>
                                    </tr>
                                ))}
                                {registrations.length === 0 && !isTeamEvent && (
                                    <tr>
                                        <td colSpan="3" className="px-8 py-20 text-center text-slate-500">
                                            No individual registrations found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TEAM REGISTRATIONS (Always show if teams exist) */}
            {(isTeamEvent || teams.length > 0) && (
                <div className="bg-[#1e293b]/50 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl mt-8">
                    <div className="p-6 md:p-8 border-b border-white/5 bg-white/5">
                        <h2 className="text-xl font-bold text-white flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-sm">👥</span>
                            Team Registrations
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">Teams signed up for this event.</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                                    <th className="px-8 py-5">Team & Leader</th>
                                    <th className="px-8 py-5">Members</th>
                                    <th className="px-8 py-5">Status</th>
                                    <th className="px-8 py-5 text-right">Registered On</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {teams.map(team => (
                                    <React.Fragment key={team.id}>
                                        <tr 
                                            onClick={() => setExpandedTeamId(expandedTeamId === team.id ? null : team.id)}
                                            className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                                        >
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <span className="text-slate-500 text-xs">{expandedTeamId === team.id ? '▼' : '▶'}</span>
                                                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold flex-shrink-0">
                                                        {team.teamName?.[0] || 'T'}
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-bold group-hover:text-purple-400 transition-colors uppercase italic">{team.teamName}</p>
                                                        <p className="text-slate-500 text-[10px] font-medium tracking-tight">Leader: {team.leaderName} ({team.leaderEmail})</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex -space-x-2">
                                                    {(team.members || []).slice(0, 4).map((m, i) => (
                                                        <div key={i} title={m.invitedName} className="w-7 h-7 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[8px] font-bold text-slate-400">
                                                            {m.invitedName?.[0] || 'M'}
                                                        </div>
                                                    ))}
                                                    {(team.members || []).length > 4 && (
                                                        <div className="w-7 h-7 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-[8px] font-bold text-white">
                                                            +{(team.members || []).length - 4}
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-slate-500 mt-1 font-bold">{team.memberCount || (team.members || []).length + 1} Members</p>
                                            </td>
                                            <td className="px-8 py-6">
                                                {statusBadge(team.status)}
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <p className="text-slate-400 text-xs font-bold font-mono">
                                                    {team.createdAt ? new Date(team.createdAt).toLocaleDateString() : 'N/A'}
                                                </p>
                                            </td>
                                        </tr>
                                        {expandedTeamId === team.id && (
                                            <tr>
                                                <td colSpan="4" className="p-0 border-b border-slate-700/30">
                                                    <div className="bg-slate-900/50 p-2">
                                                        {renderMemberRow({
                                                            id: team.id,
                                                            name: team.leaderName,
                                                            email: team.leaderEmail,
                                                            isLeader: true,
                                                            status: team.leaderPaymentStatus,
                                                            paymentRef: team.leaderPaymentRef,
                                                            paymentShot: team.leaderPaymentScreenshot
                                                        })}
                                                        {team.members?.map(m => renderMemberRow({
                                                            id: m.id,
                                                            name: m.invitedName || m.name,
                                                            email: m.invitedEmail || m.email,
                                                            isLeader: false,
                                                            status: m.paymentStatus,
                                                            paymentRef: m.paymentRef,
                                                            paymentShot: m.paymentScreenshot
                                                        }))}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                                {teams.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-8 py-20 text-center text-slate-500 italic">
                                            No teams registered yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            <div className="bg-indigo-600/5 border border-indigo-500/10 rounded-3xl p-6 flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-xl border border-indigo-500/20">💡</div>
                <div className="flex-1">
                    <p className="text-white font-bold mb-1 tracking-tight">Coordinator Tip</p>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Use this list to verify participation at the venue. You can check student details and ensure they are eligible for the event categories.
                    </p>
                </div>
            </div>

            {selectedScreenshot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/90 backdrop-blur-sm shadow-2xl" onClick={() => setSelectedScreenshot(null)}>
                    <img src={selectedScreenshot} className="max-w-full max-h-full object-contain rounded-2xl border border-white/10" alt="Payment Proof" />
                </div>
            )}
        </div>
    );
}

