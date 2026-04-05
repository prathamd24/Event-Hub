import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from '../../components/Toast';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function MyTeams() {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [teamTab, setTeamTab] = useState("active"); // Section 4B
    const [submitting, setSubmitting] = useState(false);
    const [paymentRefs, setPaymentRefs] = useState({});
    const [selectedFiles, setSelectedFiles] = useState({}); // teamId -> File
    const [showQr, setShowQr] = useState(null); // teamId

    useEffect(() => {
        fetchTeams();
    }, []);

    const fetchTeams = async () => {
        try {
            const res = await api.get('/api/team/my-teams');
            setTeams(res.data?.teams || []);
        } catch (error) {
            console.error("Failed to fetch teams", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async (teamId) => {
        const ref = paymentRefs[teamId];
        const file = selectedFiles[teamId];

        if (!ref?.trim() || !file) {
            toast('Please enter Ref No. and upload a screenshot', 'error');
            return;
        }

        setSubmitting(teamId);
        const formData = new FormData();
        formData.append('paymentRef', ref);
        formData.append('screenshot', file);

        try {
            await api.post(`/api/team/${teamId}/confirm-payment`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast('Payment confirmation submitted!', 'success');
            // Clear local state for this team
            setPaymentRefs(prev => { const n = { ...prev }; delete n[teamId]; return n; });
            setSelectedFiles(prev => { const n = { ...prev }; delete n[teamId]; return n; });
            fetchTeams();
        } catch (error) {
            toast(error.response?.data?.message || 'Payment failed', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    // Section 4B: filter teams by event date
    const isEventOver = (team) => {
        if (team.eventStatus === "COMPLETED") return true;
        if (!team.eventDate) return false;
        return new Date(team.eventDate) < new Date();
    };
    const displayTeams = teams.filter(t =>
        teamTab === "active" ? !isEventOver(t) : isEventOver(t)
    );

    return (
        <div className="space-y-12 animate-fadeIn relative pb-20">
            <div className="absolute top-0 left-0 w-full max-w-lg h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />

            <div className="relative overflow-hidden bg-gradient-to-br from-[#1e293b]/80 to-[#0f172a]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl z-10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px] -z-10" />
                <h1 className="text-4xl font-display font-bold text-white mb-2 tracking-tight">My <span className="text-purple-400">Teams</span></h1>
                <p className="text-slate-400 text-lg font-body">Track your team registrations and membership status</p>

                {/* Section 4B — Filter Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1 mt-4 -mx-4 px-4 scrollbar-none" style={{scrollbarWidth:"none"}}>
                    {[
                        { id: 'active', label: 'Active Teams', icon: '👥' },
                        { id: 'past', label: 'Past Teams', icon: '📜' },
                    ].map(opt => (
                        <button key={opt.id}
                            onClick={() => setTeamTab(opt.id)}
                            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition-all min-h-[40px] whitespace-nowrap ${
                            teamTab === opt.id
                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                                : "bg-slate-800 text-slate-400 border border-slate-700"
                            }`}>
                            <span>{opt.icon}</span>
                            <span>{opt.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8 relative z-10">
                {displayTeams.length > 0 ? (
                    displayTeams.map(team => (
                        <div key={team.id} className="bg-[#1e293b]/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
                            <div className="absolute -right-16 -top-16 w-64 h-64 bg-purple-500/5 rounded-full blur-[60px] group-hover:bg-purple-500/10 transition-all pointer-events-none" />
                            
                            <div className="flex flex-col lg:flex-row justify-between gap-8">
                                <div className="flex-1 space-y-6">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-2xl">👥</span>
                                                <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">{team.team_name}</h2>
                                            </div>
                                            <p className="text-purple-400 text-xs font-black uppercase tracking-[0.2em] italic">Member of {team.event?.title}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                                team.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' :
                                                team.status === 'AWAITING_PAYMENT' ? 'bg-amber-500/20 text-amber-400 border-amber-500/20' :
                                                'bg-indigo-500/20 text-indigo-400 border-indigo-500/20'
                                            } ${(team.status === 'AWAITING_PAYMENT' && !team.payment_screenshot) ? 'animate-pulse' : ''}`}>
                                                {team.status === 'COMPLETED' ? '✓ REGISTERED' : 
                                                 (team.status === 'AWAITING_PAYMENT' && team.payment_screenshot) ? 'REGISTRATION DONE' : 
                                                 team.status.replace('_', ' ')}
                                            </span>
                                            {team.payment_status === 'PAID' && (
                                                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest italic flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" /> Payment Verified
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6">
                                        <div className="flex items-center justify-between mb-6">
                                            <h4 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.25em]">Team Members</h4>
                                            <span className="text-[10px] text-slate-500 font-bold italic">Status tracking</span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {/* Leader is always member #1 */}
                                            <div className="flex items-center justify-between bg-white/[0.03] border border-white/5 p-4 rounded-2xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-xs font-black text-purple-400 border border-purple-500/20 uppercase tracking-tighter shadow-lg shadow-purple-500/10">L</div>
                                                    <div>
                                                        <p className="text-white text-xs font-black uppercase tracking-tight italic">{team.leaderName}</p>
                                                        <p className="text-[10px] text-slate-500 font-bold tracking-tighter">Team Leader</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-emerald-400 font-black text-[10px] uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Joined</span>
                                                    {(team.leaderPaymentStatus === 'PAID' || team.leaderPaymentStatus === 'FREE' || team.registrationFee === 0) ? (
                                                        <span className="text-indigo-400 font-black text-[10px] uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">✓ Paid</span>
                                                    ) : (
                                                        <span className="text-amber-500 font-black text-[10px] uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 animate-pulse">⏳ Pending</span>
                                                    )}
                                                </div>
                                            </div>

                                            {team.members?.map(member => (
                                                <div key={member.id} className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black uppercase tracking-widest border transition-all ${
                                                            member.status === 'ACCEPTED' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/20' : 'bg-slate-500/10 text-slate-500 border-white/5'
                                                        }`}>M</div>
                                                        <div>
                                                            <p className="text-white text-xs font-black uppercase tracking-tight italic truncate max-w-[120px]">{member.invitedName || member.invitedEmail}</p>
                                                            <p className={`text-[9px] font-black uppercase tracking-widest ${
                                                                member.status === 'ACCEPTED' ? 'text-emerald-500/80' : 'text-slate-500'
                                                            }`}>{member.status === 'ACCEPTED' ? 'MEMBER' : member.status}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {member.status === 'ACCEPTED' ? (
                                                            <span className="text-emerald-400 font-black text-[10px] uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Joined</span>
                                                        ) : (
                                                            <span className="text-slate-500 font-black text-[10px] uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/5 italic">Invited</span>
                                                        )}
                                                        
                                                        {member.status === 'ACCEPTED' && (
                                                            (member.paymentStatus === 'PAID' || member.paymentStatus === 'FREE' || team.registrationFee === 0) ? (
                                                                <span className="text-indigo-400 font-black text-[10px] uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">✓ Paid</span>
                                                            ) : (
                                                                <span className="text-amber-500 font-black text-[10px] uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 animate-pulse">⏳ Pending</span>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="lg:w-80 space-y-6">
                                    <div className="bg-white/[0.03] border border-white/5 p-6 rounded-[2rem] h-full flex flex-col justify-between">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest italic">Event Context</p>
                                                <div className="h-px flex-1 bg-white/5 mx-3" />
                                            </div>
                                            
                                            <div className="grid grid-cols-1 gap-3">
                                                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 group hover:border-indigo-500/30 transition-all">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-lg shadow-lg group-hover:scale-110 transition-transform">📅</div>
                                                    <div>
                                                        <p className="text-white text-[11px] font-black uppercase tracking-tight italic">{team.eventDate ? new Date(team.eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}</p>
                                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest italic">Event Date</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 group hover:border-purple-500/30 transition-all">
                                                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-lg shadow-lg group-hover:scale-110 transition-transform">📍</div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white text-[11px] font-black uppercase tracking-tight italic truncate">{team.event?.venue || 'Venue TBD'}</p>
                                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest italic">Location</p>
                                                    </div>
                                                </div>

                                                {team.registrationFee > 0 && (
                                                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-500/10 to-transparent rounded-2xl border border-indigo-500/10">
                                                        <div>
                                                            <p className="text-indigo-400 font-extrabold text-[13px] italic tracking-tighter">₹{team.registrationFee}</p>
                                                            <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest">Entry Fee</p>
                                                        </div>
                                                        <span className="text-xs">💳</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="pt-8">
                                            {team.needsToPay ? (
                                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                    <div className="p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-[2rem] space-y-6">
                                                        <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest text-center">Your Payment Share</h5>
                                                        
                                                        <div className="grid grid-cols-1 gap-6">
                                                            <div className="space-y-4">
                                                                <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                                                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">UPI ID</p>
                                                                    <div className="flex items-center gap-2 group">
                                                                        <code className="text-indigo-400 font-mono text-[10px] flex-1 truncate">
                                                                            {team.upiId || 'Not Specified'}
                                                                        </code>
                                                                        <button 
                                                                            onClick={() => {
                                                                                navigator.clipboard.writeText(team.upiId);
                                                                                toast('UPI ID copied!', 'success');
                                                                            }}
                                                                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 transition-all"
                                                                        >
                                                                            📋
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-2xl border border-white/5">
                                                                {team.paymentQr ? (
                                                                    <>
                                                                        <div className="w-24 h-24 bg-white p-1 rounded-xl mb-3 shadow-xl">
                                                                            <img 
                                                                                src={`${api.defaults.baseURL}${team.paymentQr}`} 
                                                                                alt="QR" 
                                                                                className="w-full h-full object-contain"
                                                                            />
                                                                        </div>
                                                                        <button 
                                                                            onClick={() => setShowQr(team.id)}
                                                                            className="text-indigo-400 text-[9px] font-black uppercase tracking-[0.2em] hover:text-indigo-300 transition-colors"
                                                                        >
                                                                            View Full QR
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <div className="text-[10px] text-slate-500 font-extrabold uppercase italic tracking-widest text-center">Payment Info<br/>on Dashboard</div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <label className="text-slate-500 text-[9px] font-black uppercase tracking-widest px-1">Proof Screenshot</label>
                                                                {!selectedFiles[team.id] ? (
                                                                    <label className="w-full h-[52px] flex items-center gap-3 bg-black/40 border border-white/10 rounded-2xl px-4 py-3 cursor-pointer hover:border-indigo-500/30 transition-all group overflow-hidden">
                                                                        <input 
                                                                            type="file" 
                                                                            accept="image/*"
                                                                            className="hidden"
                                                                            onChange={(e) => {
                                                                                const f = e.target.files[0];
                                                                                if (f) {
                                                                                    setSelectedFiles(prev => ({ ...prev, [team.id]: f }));
                                                                                }
                                                                            }}
                                                                        />
                                                                        <span className="text-lg">📸</span>
                                                                        <p className="text-[10px] text-slate-500 font-bold truncate flex-1">
                                                                            Select Screenshot
                                                                        </p>
                                                                    </label>
                                                                ) : (
                                                                    <div className="flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl px-3 py-2 animate-in zoom-in-95 duration-200">
                                                                        <div className="w-9 h-9 rounded-lg overflow-hidden border border-white/10 bg-black/20">
                                                                            <img 
                                                                                src={URL.createObjectURL(selectedFiles[team.id])} 
                                                                                alt="preview" 
                                                                                className="w-full h-full object-cover"
                                                                            />
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-[9px] text-white font-black uppercase truncate">{selectedFiles[team.id].name}</p>
                                                                            <button 
                                                                                onClick={() => setSelectedFiles(prev => { const n = {...prev}; delete n[team.id]; return n; })}
                                                                                className="text-[8px] text-red-400 font-black uppercase tracking-widest hover:text-red-300 transition-colors"
                                                                            >
                                                                                Remove
                                                                            </button>
                                                                        </div>
                                                                        <span className="text-emerald-400">✓</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="space-y-2">
                                                                <label className="text-slate-500 text-[9px] font-black uppercase tracking-widest px-1">Transaction Ref No.</label>
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="UTR / Ref ID" 
                                                                    value={paymentRefs[team.id] || ''}
                                                                    onChange={(e) => setPaymentRefs(prev => ({ ...prev, [team.id]: e.target.value }))}
                                                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white text-xs outline-none focus:border-indigo-500/50 transition-all font-bold placeholder:text-slate-700 placeholder:font-normal h-[52px]"
                                                                />
                                                            </div>
                                                        </div>
                                                        
                                                        <button 
                                                            onClick={() => handlePayment(team.id)}
                                                            disabled={submitting === team.id || !paymentRefs[team.id]?.trim() || !selectedFiles[team.id]}
                                                            className="w-full py-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                                                        >
                                                            {submitting === team.id ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'SUBMIT PAYMENT PROOF 💸'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : team.status === 'COMPLETED' ? (
                                                <div className="w-full py-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-xs uppercase tracking-[0.25em] text-center italic shadow-inner">
                                                    ✓ Registration Success
                                                </div>
                                            ) : (
                                                <div className="w-full py-5 rounded-2xl bg-white/5 border border-white/10 text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] text-center italic">
                                                    {team.status === 'PENDING' ? 'Waiting for Members...' : 
                                                     team.status === 'AWAITING_PAYMENT' ? 'Pending Payments...' :
                                                     team.status === 'PARTIALLY_PAID' ? 'Awaiting Other Payments...' :
                                                     team.status}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-24 text-center bg-[#1e293b]/40 backdrop-blur-xl rounded-[3rem] border border-dashed border-white/20">
                        <div className="text-6xl mb-6 opacity-80">👥</div>
                        <h3 className="text-2xl font-display font-bold text-white mb-3 tracking-tight italic uppercase italic">No Teams Found</h3>
                        <p className="text-slate-400 font-body text-lg mb-8 max-w-sm mx-auto">Create or join a team to see it listed here.</p>
                    </div>
                )}
            </div>

            {/* QR Modal */}
            {showQr && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-[#1e293b] border border-white/20 rounded-[2.5rem] w-full max-w-sm overflow-hidden relative shadow-2xl">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h3 className="text-white font-black uppercase tracking-widest text-xs italic">Payment QR Code</h3>
                            <button onClick={() => setShowQr(null)} className="text-slate-400 hover:text-white transition-colors text-xl font-black">×</button>
                        </div>
                        <div className="p-8 flex flex-col items-center gap-6">
                            <div className="bg-white p-4 rounded-[2rem] shadow-2xl w-full aspect-square">
                                <img 
                                    src={`${api.defaults.baseURL}${teams.find(t => t.id === showQr)?.event?.paymentQr}`} 
                                    className="w-full h-full object-contain" 
                                    alt="Payment QR" 
                                />
                            </div>
                            <div className="text-center space-y-2">
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">A/C Holder Name</p>
                                <p className="text-white text-lg font-black italic tracking-tight">{teams.find(t => t.id === showQr)?.event?.upiName}</p>
                            </div>
                        </div>
                        <div className="p-6 bg-white/5 border-t border-white/5">
                            <button 
                                onClick={() => setShowQr(null)}
                                className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-[10px] uppercase tracking-widest transition-all hover:bg-white/10"
                            >
                                CLOSE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
