import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from '../Toast';
import { useAuth } from '../../context/AuthContext';

export default function TeamRegisterModal({ isOpen, onClose, event, onSuccess }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [teamName, setTeamName] = useState('');
    const [emails, setEmails] = useState(['']); // First one is leader (user), but we need others
    const [createdTeam, setCreatedTeam] = useState(null);
    const [clubStats, setClubStats] = useState(null);

    useEffect(() => {
        if (event.clubId) {
            api.get(`/api/public/clubs/${event.clubId}/stats`)
                .then(r => setClubStats(r.data))
                .catch(() => {});
        }
    }, [event.clubId]);
    
    if (!isOpen || !event) return null;

    const minMembers = event.teamMinSize || 2;
    const maxMembers = event.teamMaxSize || 4;

    const addEmail = () => {
        if (emails.length < maxMembers - 1) { // -1 because leader is already there
            setEmails([...emails, '']);
        }
    };

    const removeEmail = (index) => {
        const updated = emails.filter((_, i) => i !== index);
        setEmails(updated);
    };

    const updateEmail = (index, val) => {
        const updated = [...emails];
        updated[index] = val;
        setEmails(updated);
    };

    const handleCreateTeam = async () => {
        if (!teamName.trim()) {
            toast('Team name is required', 'error');
            return;
        }

        const validEmails = emails.filter(e => e.trim() !== '');
        if (validEmails.length + 1 < minMembers) {
            toast(`Team must have at least ${minMembers} members (including you)`, 'error');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/api/team/create', {
                eventId: event.id,
                teamName: teamName,
                members: validEmails.map(email => ({ email, name: '' })) // Backend expects list of objects
            });
            
            setCreatedTeam(res.data.team);
            toast('Team created! Invites sent to members.', 'success');
            if (onSuccess) onSuccess(res.data);
        } catch (err) {
            toast(err.response?.data?.message || 'Failed to create team', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto font-sans">
            <div className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] w-full max-w-lg shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden animate-fadeIn relative my-auto">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />
                
                <div className="px-8 pt-8 pb-4 flex justify-between items-center bg-white/[0.01]">
                    <div>
                        <h2 className="text-xl font-black text-white tracking-tight leading-none uppercase italic">
                            {createdTeam ? 'TEAM STATUS' : 'FORM TEAM'}
                        </h2>
                        <div className="h-1 w-8 bg-purple-500 rounded-full mt-2" />
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {createdTeam ? (
                    <div className="p-8 space-y-8 animate-fadeIn">
                        <div className="text-center space-y-2">
                            <div className="text-4xl">📨</div>
                            <h3 className="text-xl font-black text-white italic tracking-tight uppercase">Invites Sent!</h3>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Team: {createdTeam.team_name}</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-2">
                                <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Invited Members</label>
                                <span className="text-[9px] font-black text-amber-500 uppercase italic">⏳ Pending Action</span>
                            </div>

                            <div className="space-y-3">
                                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-[10px] font-black text-purple-400">L</div>
                                        <p className="text-white text-xs font-black uppercase italic">You (Leader)</p>
                                    </div>
                                    <span className="text-emerald-400 text-sm">✓</span>
                                </div>

                                {createdTeam.members?.map((m, idx) => (
                                    <div key={idx} className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-black text-slate-500">M</div>
                                            <p className="text-white text-xs font-black uppercase italic truncate max-w-[150px]">{m.invitedEmail}</p>
                                        </div>
                                        <span className="text-amber-500 text-[10px] font-black italic">⏳ Pending</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-center space-y-2">
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Registration Status</p>
                            <p className="text-amber-400 font-black text-xs uppercase tracking-[0.2em] animate-pulse">⏳ Registration Pending</p>
                            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-2 leading-relaxed">
                                Everyone must join before the registration is confirmed.
                            </p>
                        </div>

                        <button 
                            onClick={onClose}
                            className="w-full py-5 rounded-3xl bg-white text-slate-950 font-black text-xs uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all"
                        >
                            GOT IT!
                        </button>
                    </div>
                ) : (
                    <div className="p-8 space-y-6">
                        <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-6 relative overflow-hidden">
                            {event.eventScope === 'INTRA' && clubStats && (
                                <div className="mt-4 p-3 rounded-xl bg-slate-700/30 border border-slate-600/50">
                                    <p className="text-slate-400 text-[8px] font-black uppercase tracking-widest mb-2 opacity-60">Club Stats</p>
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs">🎓</span>
                                            <span className="text-slate-300 text-[10px] font-bold">{clubStats.coordinators} Coordinators</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs">🙋</span>
                                            <span className="text-slate-300 text-[10px] font-bold">{clubStats.volunteers} Volunteers</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {event.eventScope === 'INTRA' && !clubStats && (
                                <div className="absolute top-0 right-0 px-3 py-1 bg-amber-500/10 border-b border-l border-amber-500/20 rounded-bl-xl">
                                    <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Intra-College Only</span>
                                </div>
                            )}
                            <p className="text-purple-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Creating team for</p>
                            <h3 className="text-white font-black text-xl tracking-tight leading-none mb-4">{event.title}</h3>
                            
                            <div className="flex flex-wrap gap-4 p-3 bg-white/5 rounded-2xl border border-white/5">
                                <div className="text-sm font-bold text-slate-400">
                                    Size: <span className="text-white">{minMembers}-{maxMembers}</span>
                                </div>
                                <div className="text-sm font-bold text-slate-400">
                                    Fee: <span className="text-white">{event.registrationFee > 0 ? `₹${event.registrationFee}` : 'FREE'}</span>
                                </div>
                                {event.eventScope === 'INTRA' && (
                                    <div className="text-[10px] font-bold text-amber-500 uppercase tracking-tight flex items-center gap-1">
                                        ⚠️ Only {user?.college_name || 'your college'} students
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1.5 block">Team Name</label>
                                <input 
                                    type="text" 
                                    placeholder="Enter a badass team name"
                                    value={teamName}
                                    onChange={(e) => setTeamName(e.target.value)}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-500/50 transition-all font-bold placeholder:font-normal placeholder:text-slate-600"
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest font-display">Invite Members (Emails)</label>
                                    <span className="text-[9px] font-black text-slate-500 uppercase italic">You are already included</span>
                                </div>
                                
                                {emails.map((email, idx) => (
                                    <div key={idx} className="flex gap-2 animate-fadeIn">
                                        <div className="w-8 h-10 flex items-center justify-center text-slate-500 text-xs font-bold border border-white/5 bg-white/[0.02] rounded-xl">{idx + 2}</div>
                                        <input 
                                            type="email" 
                                            placeholder="friend@college.edu"
                                            value={email}
                                            onChange={(e) => updateEmail(idx, e.target.value)}
                                            className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-purple-500/50 transition-all font-bold placeholder:font-normal"
                                        />
                                        {emails.length > 1 && (
                                            <button onClick={() => removeEmail(idx)} className="text-red-500 hover:text-red-400 transition-colors font-black text-xl px-1">×</button>
                                        )}
                                    </div>
                                ))}

                                {emails.length < maxMembers - 1 && (
                                    <button 
                                        onClick={addEmail}
                                        className="w-full py-3 rounded-xl border border-dashed border-white/10 text-purple-400 text-[10px] font-black uppercase tracking-widest hover:border-purple-500/50 hover:bg-purple-500/5 transition-all flex items-center justify-center gap-2"
                                    >
                                        <span>+</span> Add Member Email
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="pt-4 space-y-4">
                            <button 
                                onClick={handleCreateTeam}
                                disabled={loading || !teamName.trim()}
                                className="w-full py-5 rounded-3xl bg-white text-slate-950 font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-100 transition-all shadow-2xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                                        <span>CREATING TEAM...</span>
                                    </div>
                                ) : 'CREATE TEAM & INVITE'}
                            </button>
                            <p className="text-center text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                                Team will be officially registered after <span className="text-purple-400 italic">all members</span> accept the invite and {event.registrationFee > 0 ? 'payment is made' : 'confirmation is sent'}.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
