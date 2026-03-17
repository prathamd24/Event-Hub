import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../services/api";
import { toast } from "../../components/Toast";
import LoadingSpinner from "../../components/LoadingSpinner";

export default function ManageEvent() {
    const { id } = useParams();
    const [event, setEvent] = useState(null);
    const [registrations, setRegistrations] = useState([]);
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);

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
                <div className="flex gap-4">
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
                                    <tr key={team.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
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
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                                team.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            }`}>
                                                {team.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <p className="text-slate-400 text-xs font-bold font-mono">
                                                {team.createdAt ? new Date(team.createdAt).toLocaleDateString() : 'N/A'}
                                            </p>
                                        </td>
                                    </tr>
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
        </div>
    );
}

