import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import EventCard from '../../components/EventCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

export default function StudentDashboard() {
    const { user } = useAuth();
    const [registrations, setRegistrations] = useState([]);
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [inviteLoading, setInviteLoading] = useState(false);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [dashRes, invitesRes] = await Promise.all([
                    api.get('/api/student/dashboard'),
                    api.get('/api/team/invites')
                ]);
                setRegistrations(dashRes.data?.registrations || []);
                setInvites(invitesRes.data?.invites || []);
            } catch (error) {
                console.error("Failed to load dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleInviteAction = async (inviteId, action) => {
        setInviteLoading(inviteId);
        try {
            await api.put(`/api/team/invites/${inviteId}/respond`, { action });
            toast(`Invite ${action.toLowerCase()}ed!`, 'success');
            // Refresh invites
            const res = await api.get('/api/team/invites');
            setInvites(res.data?.invites || []);
            // If accepted, maybe refresh registrations too as it might be completed now
            if (action === 'ACCEPT') {
                const dashRes = await api.get('/api/student/dashboard');
                setRegistrations(dashRes.data?.registrations || []);
            }
        } catch (error) {
            toast(error.response?.data?.message || 'Action failed', 'error');
        } finally {
            setInviteLoading(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-12 animate-fadeIn relative pb-20">
            {/* Ambient Base Glow */}
            <div className="absolute top-0 left-0 w-full max-w-lg h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />

            {/* Header Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#1e293b]/80 to-[#0f172a]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl z-10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] -z-10" />
                
                <div className="flex flex-col md:flex-row items-center md:items-start md:justify-between gap-6 relative z-20">
                    <div className="flex items-center gap-6 text-center md:text-left">
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-1 shadow-lg shadow-indigo-500/30 shrink-0">
                            <div className="w-full h-full bg-[#0f172a] rounded-xl flex items-center justify-center border border-white/10">
                                <span className="text-4xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">
                                    {user?.name?.charAt(0)?.toUpperCase() || 'S'}
                                </span>
                            </div>
                        </div>
                        <div>
                            <h1 className="text-4xl font-display font-bold text-white mb-2 tracking-tight">
                                Welcome back, <span className="text-indigo-400">{user?.name?.split(' ')[0] || 'Student'}</span>!
                            </h1>
                            <p className="text-slate-400 text-lg font-body flex items-center justify-center md:justify-start gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                                Ready for your next campus adventure
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex gap-4 shrink-0">
                        <Link to="/events" className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/25 transition-all hover:-translate-y-1">
                            <span>✨</span> Explore Events
                        </Link>
                        <Link to="/student/profile" className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-6 py-3 rounded-xl font-bold backdrop-blur-md transition-all">
                            <span>⚙️</span> Settings
                        </Link>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
                <div className="bg-[#1e293b]/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="text-3xl mb-3">🎫</div>
                    <p className="text-4xl font-display font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors">{registrations?.length || 0}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registered</p>
                </div>
                <div className="bg-[#1e293b]/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="text-3xl mb-3">⭐</div>
                    <p className="text-4xl font-display font-bold text-white mb-1 group-hover:text-purple-400 transition-colors">0</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saved</p>
                </div>
                <div className="bg-[#1e293b]/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="text-3xl mb-3">🏆</div>
                    <p className="text-4xl font-display font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">0</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Certificates</p>
                </div>
                <div className="bg-[#1e293b]/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="text-3xl mb-3">👥</div>
                    <p className="text-4xl font-display font-bold text-white mb-1 group-hover:text-pink-400 transition-colors">{invites?.length || 0}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Team Invites</p>
                </div>
            </div>

            {/* Team Invites Section */}
            {invites.length > 0 && (
                <div className="relative z-10 animate-slideUp">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-3xl font-display font-bold text-white flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center text-sm border border-pink-500/30 text-pink-400">🎯</span>
                            Pending Invites
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {invites.map(invite => (
                            <div key={invite.memberId} className="bg-gradient-to-br from-white/10 to-white/[0.02] backdrop-blur-3xl border border-white/20 rounded-[2rem] p-6 flex flex-col sm:flex-row justify-between items-center gap-6 shadow-xl relative overflow-hidden group">
                                <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-pink-500/10 rounded-full blur-[40px] group-hover:bg-pink-500/20 transition-all opacity-50" />
                                <div className="flex items-center gap-5 w-full sm:w-auto">
                                    <div className="w-16 h-16 rounded-[1.25rem] bg-pink-500/20 flex items-center justify-center text-2xl border border-pink-500/20 shadow-inner group-hover:scale-110 transition-transform">
                                        👥
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-white font-black text-lg tracking-tight truncate leading-tight mb-1">{invite.teamName}</h4>
                                        <p className="text-pink-400/80 text-[10px] font-black uppercase tracking-widest mb-1 italic">For {invite.eventTitle}</p>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                            <span>Leader:</span>
                                            <span className="text-slate-300 italic">{invite.leaderName}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 w-full sm:w-auto border-t sm:border-t-0 border-white/5 pt-4 sm:pt-0">
                                    <button 
                                        onClick={() => handleInviteAction(invite.memberId, 'DECLINE')}
                                        disabled={inviteLoading === invite.memberId}
                                        className="h-10 px-6 rounded-xl text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
                                    >
                                        Decline
                                    </button>
                                    <button 
                                        onClick={() => handleInviteAction(invite.memberId, 'ACCEPT')}
                                        disabled={inviteLoading === invite.memberId}
                                        className="h-12 px-8 rounded-[1.25rem] bg-white text-slate-900 text-[10px] font-black uppercase tracking-[0.15em] hover:bg-pink-500 hover:text-white transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                    >
                                        {inviteLoading === invite.memberId ? 'Processing' : 'Join Team'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* My Tickets / Registered Events */}
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-3xl font-display font-bold text-white flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-sm border border-indigo-500/30">🎟️</span>
                        Your Tickets
                    </h2>
                    <Link to="/student/my-teams" className="text-indigo-400 hover:text-indigo-300 text-xs font-black uppercase tracking-[0.2em] italic flex items-center gap-2 transition-all hover:gap-3">
                        Manage Teams <span>→</span>
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {registrations && registrations.length > 0 ? (
                        registrations.map(reg => (
                            <div key={reg.event.id} className="relative group">
                                <div className="absolute -top-3 -right-3 z-30">
                                    <span className="bg-gradient-to-r from-emerald-400 to-teal-500 text-teal-950 text-xs font-black uppercase tracking-wider px-4 py-2 rounded-xl shadow-lg shadow-emerald-500/25 border border-emerald-300">
                                        ✓ Registration Confirmed
                                    </span>
                                </div>
                                <EventCard event={reg.event} />
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-20 text-center bg-[#1e293b]/40 backdrop-blur-xl rounded-2xl border border-dashed border-white/20">
                            <div className="text-6xl mb-6 opacity-80">🎫</div>
                            <h3 className="text-2xl font-display font-bold text-white mb-3">No Registrations Yet</h3>
                            <p className="text-slate-400 font-body text-lg mb-8 max-w-sm mx-auto">You haven't secured a ticket for any event yet.</p>
                            <Link to="/events" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-8 py-3.5 rounded-xl font-bold border border-white/10 transition-colors">
                                Browse Events <span className="text-lg">→</span>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
