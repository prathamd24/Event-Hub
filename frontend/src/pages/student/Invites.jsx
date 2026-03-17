import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import api from '../../services/api';
import { toast } from '../../components/Toast';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function Invites() {
    const { fetchStats } = useOutletContext();
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [responding, setResponding] = useState(null);

    useEffect(() => {
        fetchInvites();
        markAsRead();
    }, []);

    const markAsRead = async () => {
        try {
            await api.put('/api/student/notifications/mark-read');
            if (fetchStats) fetchStats(); // Refresh sidebar badge
        } catch (error) {
            console.error("Failed to mark notifications read", error);
        }
    };

    const fetchInvites = async () => {
        try {
            const res = await api.get('/api/team/invites');
            setInvites(res.data?.invites || []);
        } catch (error) {
            console.error("Failed to fetch invites", error);
        } finally {
            setLoading(false);
        }
    };

    const handleResponse = async (memberId, action) => {
        setResponding(memberId);
        try {
            await api.put(`/api/team/invites/${memberId}/respond`, { action });
            toast(`Invitation ${action.toLowerCase()}ed!`, 'success');
            if (action === 'ACCEPT') {
                const invite = invites.find(i => i.memberId === memberId);
                window.location.href = `/events/${invite.eventId}?openStatus=true`;
            } else {
                fetchInvites();
            }
        } catch (error) {
            toast(error.response?.data?.message || 'Action failed', 'error');
        } finally {
            setResponding(null);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-12 animate-fadeIn relative pb-20">
            <div className="absolute top-0 left-0 w-full max-w-lg h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />

            <div className="relative overflow-hidden bg-gradient-to-br from-[#1e293b]/80 to-[#0f172a]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl z-10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] -z-10" />
                <h1 className="text-4xl font-display font-bold text-white mb-2 tracking-tight">Team <span className="text-indigo-400">Invites</span></h1>
                <p className="text-slate-400 text-lg font-body">Manage your pending invitations to join event teams</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                {invites.length > 0 ? (
                    invites.map(invite => (
                        <div key={invite.memberId} className="bg-[#1e293b]/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
                            <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/5 rounded-full blur-[60px] group-hover:bg-indigo-500/10 transition-all pointer-events-none" />
                            
                            <div className="space-y-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-2xl shadow-lg border border-indigo-500/20">🎯</div>
                                        <div>
                                            <h2 className="text-xl font-black text-white uppercase italic tracking-tight">{invite.teamName}</h2>
                                            <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] italic">Invite from {invite.leaderName}</p>
                                        </div>
                                    </div>
                                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse">Pending</span>
                                </div>

                                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest italic">Event Name</p>
                                        <p className="text-white text-xs font-bold uppercase italic tracking-tight">{invite.eventTitle}</p>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest italic">Date</p>
                                        <p className="text-white text-xs font-bold uppercase italic tracking-tight">{invite.eventDate ? new Date(invite.eventDate).toLocaleDateString() : 'TBD'}</p>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-2">
                                    <button 
                                        onClick={() => handleResponse(invite.memberId, 'ACCEPT')}
                                        disabled={responding === invite.memberId}
                                        className="flex-1 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {responding === invite.memberId ? 'Processing...' : '✓ Join Team'}
                                    </button>
                                    <button 
                                        onClick={() => handleResponse(invite.memberId, 'DECLINE')}
                                        disabled={responding === invite.memberId}
                                        className="py-4 px-6 rounded-2xl bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-white/10 hover:border-red-500/20 font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        × Decline
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-24 text-center bg-[#1e293b]/40 backdrop-blur-xl rounded-[3rem] border border-dashed border-white/20">
                        <div className="text-6xl mb-6 opacity-30">📨</div>
                        <h3 className="text-2xl font-display font-bold text-white mb-3 tracking-tight italic uppercase italic">No Pending Invites</h3>
                        <p className="text-slate-400 font-body text-lg mb-8 max-w-sm mx-auto">When your friends invite you to a team, they'll show up right here.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
