import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { toast } from '../../components/Toast';
import { BACKEND_URL } from '../../config';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function MyEvents() {
    const navigate = useNavigate();
    const [registrations, setRegistrations] = useState([]);
    const [myTeams, setMyTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [regTab, setRegTab] = useState("upcoming"); // Section 4A
    const BASE = BACKEND_URL;

    useEffect(() => {
        const fetchMyTeams = async () => {
            try {
                const res = await api.get("/api/team/my-teams")
                setMyTeams(res.data.teams || [])
            } catch(e) {
                setMyTeams([])
            }
        }
        fetchMyTeams()
        fetchRegistrations();
    }, []);

    const fetchRegistrations = async () => {
        try {
            const res = await api.get('/api/student/my-events');
            setRegistrations(res.data.registrations || []);
        } catch (error) {
            toast('Failed to load your registrations', 'error');
        } finally {
            setLoading(false);
        }
    };

    const isTeamPending = (event) => {
        if (!myTeams || myTeams.length === 0) return false
        const team = myTeams.find(t => t.eventId === event?.id)
        return team && team.status === "PENDING"
    }

    const isTeamAwaitingPayment = (event) => {
        if (!myTeams || myTeams.length === 0) return false
        const team = myTeams.find(t => t.eventId === event?.id)
        return team && team.status === "AWAITING_PAYMENT"
    }

    const getMyTeamForEvent = (event) => {
        if (!myTeams || myTeams.length === 0) return null
        return myTeams.find(t => t.eventId === event?.id) || null
    }

    // Section 4A: filter by tab
    const displayRegs = registrations.filter(r =>
        regTab === "upcoming"
            ? ["UPCOMING", "ONGOING"].includes(r.event?.status || r.status || "")
            : (r.event?.status || r.status || "") === "COMPLETED"
    );
    const upcomingCount = registrations.filter(r => ["UPCOMING","ONGOING"].includes(r.event?.status || r.status || "")).length;
    const pastCount = registrations.filter(r => (r.event?.status || r.status || "") === "COMPLETED").length;

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-8 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-xl">
                <div>
                    <h1 className="text-3xl font-display font-black text-white italic tracking-tight">MY <span className="text-indigo-400">EVENTS</span></h1>
                    <p className="text-slate-400 text-sm font-medium">Track your registrations and participation status</p>
                </div>

                {/* Section 4A — Filter Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none" style={{scrollbarWidth:"none"}}>
                    {[
                        { id: 'upcoming', label: `Upcoming (${upcomingCount})`, icon: '📅' },
                        { id: 'past', label: `Past Events (${pastCount})`, icon: '📜' },
                    ].map(opt => (
                        <button key={opt.id}
                            onClick={() => setRegTab(opt.id)}
                            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition-all min-h-[40px] whitespace-nowrap ${
                            regTab === opt.id
                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                                : "bg-slate-800 text-slate-400 border border-slate-700"
                            }`}>
                            <span>{opt.icon}</span>
                            <span>{opt.label}</span>
                        </button>
                    ))}
                </div></div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {displayRegs.length > 0 ? (
                    displayRegs.map(item => {
                        const event = item.event;
                        const team = getMyTeamForEvent(event);
                        const isTeam = !!team;
                        const status = item.status;
                        const id = isTeam ? `team-${item.id}` : item.id;
                        const teamName = item.team_name || item.teamName || team?.teamName;

                        const _isPending = isTeamPending(event);
                        const _isAwaiting = isTeamAwaitingPayment(event);

                        const calculateDuration = () => {
                            if (!event?.eventDate || !event?.startTime || !event?.endTime) return null;
                            try {
                                const start = new Date(`${event.eventDate}T${event.startTime}`);
                                const end = new Date(`${event.endDate || event.eventDate}T${event.endTime}`);
                                const diffMs = end - start;
                                if (diffMs <= 0) return null;
                                const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                                const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                                
                                let str = "";
                                if (diffHrs > 0) str += `${diffHrs}h`;
                                if (diffMins > 0) str += `${diffMins}m`;
                                return str.trim();
                            } catch (e) { return null; }
                        };
                        const durationStr = calculateDuration();

                        const hasScreenshot = !!(item.paymentScreenshotUrl || item.paymentScreenshot || item.leaderPaymentScreenshot);
                        const isPendingAny = (_isPending || _isAwaiting || status === 'PENDING');
                        const statusColor = (isPendingAny) 
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                            : status === 'REJECTED' 
                                ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                        
                        const getStatusLabel = () => {
                            if (_isPending) return 'Team: Pending';
                            if (_isAwaiting) return hasScreenshot ? 'Registration Done' : 'Team: Payment';
                            if (status === 'PENDING') return hasScreenshot ? 'Registration Done' : 'Payment Pending';
                            if (status === 'REJECTED') return 'Rejected';
                            return event?.registrationFee === 0 ? 'Confirmed' : 'Registration Confirmed';
                        };

                        return (
                            <div key={id} className={`group relative bg-[#1e293b]/40 backdrop-blur-xl border rounded-[2rem] overflow-hidden hover:border-indigo-500/50 transition-all duration-500 flex flex-col sm:flex-row shadow-xl ${(_isPending || _isAwaiting) ? 'border-amber-500/20' : 'border-white/10'}`}>
                                {/* Event Image Stub */}
                                <div className="w-full sm:w-48 h-48 bg-[#0f172a] overflow-hidden shrink-0">
                                    {event?.coverUrl ? (
                                        <img src={`${BASE}${event.coverUrl}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60 group-hover:opacity-100" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white/5 text-4xl font-black">{event?.title?.charAt(0) || '?'}</div>
                                    )}
                                </div>

                                <div className="p-6 flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-white font-bold text-lg line-clamp-1">{event?.title || 'Unknown Event'}</h3>
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase border ${statusColor} ${isPendingAny && !hasScreenshot ? 'animate-pulse' : ''}`}>
                                                {getStatusLabel()}
                                            </span>
                                        </div>

                                        <div className="space-y-1 mt-4">
                                            <div className="flex items-center gap-2 text-slate-400 text-xs text-medium">
                                                <span>📅</span> {event?.eventDate ? new Date(event.eventDate).toLocaleDateString() : 'N/A'} {durationStr && <span className="text-indigo-400 ml-1 opacity-80 text-[10px] uppercase font-black">({durationStr})</span>}
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-400 text-xs text-medium">
                                                <span>📍</span> {event?.venue || 'Venue TBD'}
                                            </div>
                                            {teamName && (
                                                <div className="flex items-center gap-2 text-indigo-400 text-[10px] font-black uppercase tracking-widest mt-2 bg-indigo-500/10 w-fit px-2 py-0.5 rounded-md border border-indigo-500/20">
                                                    <span>👥</span> Team: {teamName}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-6 flex items-center justify-between pt-4 border-t border-white/5">
                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-medium">
                                            {(_isPending || _isAwaiting) ? `Team ID: #${team?.id || '?'}` : `Reg ID: #${item.id}`}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {status === 'REJECTED' && item.rejection_reason && (
                                                <p className="text-red-400 text-[10px] font-bold italic">REASON: {item.rejection_reason}</p>
                                            )}
                                            {(_isPending || _isAwaiting) ? (
                                                <button 
                                                    onClick={() => navigate('/student/my-teams')}
                                                    className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-indigo-500/20"
                                                >
                                                    Manage Team
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => navigate(`/events/${event?.id}`)}
                                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-white/5"
                                                >
                                                    View Details
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-full py-20 text-center bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-md">
                        <div className="text-6xl mb-6 grayscale opacity-50">🎫</div>
                        <h3 className="text-xl font-display font-bold text-white mb-2">No registrations found</h3>
                        <p className="text-slate-400 max-w-sm mx-auto">
                            You haven't registered for any events yet. Explore events and join the action!
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
