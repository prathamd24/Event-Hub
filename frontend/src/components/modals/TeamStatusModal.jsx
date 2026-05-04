import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from '../Toast';

export default function TeamStatusModal({ isOpen, onClose, teamId, onUpdate }) {
    const [team, setTeam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [paymentRef, setPaymentRef] = useState('');

    useEffect(() => {
        if (isOpen && teamId) {
            fetchTeamStatus();
        }
    }, [isOpen, teamId]);

    const fetchTeamStatus = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/api/team/${teamId}/status`);
            setTeam(res.data.team);
        } catch (err) {
            toast('Failed to load team status', 'error');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setPreviewUrl(reader.result);
            reader.readAsDataURL(file);
        }
    };
    const handlePayment = async () => {
        if (!selectedFile || !paymentRef.trim()) {
            toast('Please upload a screenshot and enter Ref No.', 'error');
            return;
        }
        setSubmitting(true);
        const formData = new FormData();
        formData.append('screenshot', selectedFile);
        formData.append('paymentRef', paymentRef);

        try {
            await api.post(`/api/team/${teamId}/confirm-payment`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast('Payment screenshot submitted!', 'success');
            setSelectedFile(null);
            setPreviewUrl(null);
            await fetchTeamStatus();
            if (onUpdate) onUpdate();
        } catch (err) {
            toast(err.response?.data?.message || 'Upload failed', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-md p-0 sm:p-4 overflow-hidden font-sans">
            <div className="bg-[#0f172a] border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full sm:max-w-xl shadow-[0_0_80px_-20px_rgba(99,102,241,0.3)] overflow-y-auto animate-slideUp sm:animate-fadeIn relative my-0 sm:my-8 max-h-[90vh] pb-8 sm:pb-0">
                <div className="absolute -top-32 -right-32 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />
                
                {/* Header */}
                <div className="px-8 pt-8 pb-4 flex justify-between items-center relative z-10">
                    <div>
                        <h2 className="text-xl font-black text-white tracking-widest leading-none uppercase italic">Team Status</h2>
                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.3em] mt-2">Live recruitment & payment tracking</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center gap-4">
                        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest animate-pulse">Syncing Status...</p>
                    </div>
                ) : (
                    <div className="p-8 space-y-8 relative z-10">
                        {/* Event Summary */}
                        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 flex flex-col md:flex-row items-center gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center text-3xl shadow-lg">🎯</div>
                            <div className="flex-1 text-center md:text-left">
                                <h3 className="text-white font-black text-2xl tracking-tight uppercase italic truncate max-w-[300px]">{team.team_name}</h3>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1 italic">{team.eventTitle}</p>
                            </div>
                            <div className="px-4 py-2 rounded-xl bg-white/[0.02] border border-white/5 text-center min-w-[100px]">
                                <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] mb-1">Fee per member</p>
                                <p className="text-white font-black text-lg">₹{team.registrationFee}</p>
                            </div>
                        </div>

                        {/* Status Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Leader */}
                            <div className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl flex items-center justify-between group hover:bg-white/[0.05] transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center text-[10px] font-black text-indigo-400 uppercase">L</div>
                                    <div>
                                        <p className="text-white text-xs font-black uppercase italic tracking-tight truncate max-w-[120px]">{team.leaderName}</p>
                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Team Leader</p>
                                    </div>
                                </div>
                                <div className="text-right space-y-1">
                                    <span className="block text-[9px] font-black text-emerald-400 uppercase tracking-widest">Joined</span>
                                    <span className={`block text-[8px] font-black uppercase tracking-[0.2em] ${team.leaderPaymentStatus === 'PAID' ? 'text-indigo-400' : team.leaderPaymentStatus === 'PENDING' ? 'text-amber-500 animate-pulse' : 'text-amber-500'}`}>
                                        {team.leaderPaymentStatus === 'PAID' ? '✓ CONFIRMED' : team.leaderPaymentStatus === 'PENDING' ? '⌛ AWAITING' : '⏳ UNPAID'}
                                    </span>
                                </div>
                            </div>

                            {/* Members */}
                            {team.members?.map((m, idx) => (
                                <div key={idx} className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl flex items-center justify-between group hover:bg-white/[0.05] transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black uppercase border transition-all ${m.status === 'ACCEPTED' ? 'bg-purple-500/20 text-purple-400 border-purple-500/20' : 'bg-white/5 text-slate-600 border-white/5'}`}>M</div>
                                        <div>
                                            <p className="text-white text-xs font-black uppercase italic tracking-tight truncate max-w-[120px]">{m.invitedName || m.invitedEmail.split('@')[0]}</p>
                                            <p className="text-[9px] text-slate-700 font-bold uppercase tracking-widest">{m.status === 'ACCEPTED' ? 'MEMBER' : 'INVITED'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <span className={`block text-[9px] font-black uppercase tracking-widest ${m.status === 'ACCEPTED' ? 'text-emerald-500/80' : 'text-slate-600'}`}>
                                            {m.status === 'ACCEPTED' ? 'Joined' : 'Pending'}
                                        </span>
                                        {m.status === 'ACCEPTED' && (
                                            <span className={`block text-[8px] font-black uppercase tracking-[0.2em] ${m.paymentStatus === 'PAID' ? 'text-indigo-400' : m.paymentStatus === 'PENDING' ? 'text-amber-500 animate-pulse' : 'text-slate-500'}`}>
                                            {m.paymentStatus === 'PAID' ? '✓ CONFIRMED' : m.paymentStatus === 'PENDING' ? '⌛ AWAITING' : '⏳ UNPAID'}
                                        </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Payment & Action Section */}
                        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/10 rounded-[2.5rem] p-8 space-y-6">
                            <div className="text-center">
                                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-4">Registration Lifecycle</h4>
                                <div className="flex items-center justify-center gap-4 mb-6">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${team.status === 'PENDING' ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Recruit</span>
                                    </div>
                                    <div className="w-12 h-px bg-white/10" />
                                    <div className="flex flex-col items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${team.status === 'AWAITING_PAYMENT' || team.status === 'PARTIALLY_PAID' ? 'bg-indigo-500 animate-ping' : team.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-white/10'}`} />
                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Payment</span>
                                    </div>
                                    <div className="w-12 h-px bg-white/10" />
                                    <div className="flex flex-col items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${team.status === 'COMPLETED' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-white/10'}`} />
                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Registered</span>
                                    </div>
                                </div>
                            </div>

                            {team.needsToPay && (team.status === 'PENDING' || team.status === 'AWAITING_PAYMENT' || team.status === 'PARTIALLY_PAID') ? (
                                <div className="space-y-6 pt-4 border-t border-white/5 animate-fadeIn">
                                    <div className="flex items-center justify-between">
                                        <h5 className="text-indigo-400 font-extrabold text-[11px] uppercase tracking-[0.3em] italic">Your Payment Share</h5>
                                        <div className="h-px flex-1 bg-white/5 mx-4" />
                                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest italic">Action Required</span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div className="bg-black/40 rounded-2xl p-4 border border-white/5 group relative overflow-hidden">
                                                <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/5 transition-colors pointer-events-none" />
                                                <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest mb-1 italic">Scan to Pay</p>
                                                {team.paymentQr ? (
                                                    <img src={`${api.defaults.baseURL}${team.paymentQr}`} className="w-full aspect-square object-contain rounded-xl bg-white" alt="QR" />
                                                ) : (
                                                    <div className="w-full aspect-square bg-white/5 rounded-xl flex items-center justify-center text-[10px] font-black text-slate-700 italic text-center p-4 uppercase tracking-tighter leading-tight">No QR Provided<br/>Use UPI ID</div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-6 flex flex-col justify-between">
                                            <div className="space-y-4">
                                                <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                                                    <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest mb-1 italic">UPI ID / VPA</p>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <code className="text-indigo-400 font-mono text-[10px] truncate">{team.upiId || 'not_found@upi'}</code>
                                                        <button 
                                                            onClick={() => { navigator.clipboard.writeText(team.upiId); toast('Copied!', 'success'); }}
                                                            className="text-white/30 hover:text-white transition-colors"
                                                        >📋</button>
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1 block px-1 italic">Payment Screenshot</label>
                                                    {!previewUrl ? (
                                                        <label className="w-full flex flex-col items-center justify-center gap-2 bg-indigo-500/5 border-2 border-dashed border-indigo-500/20 rounded-xl px-4 py-8 cursor-pointer hover:bg-indigo-500/10 hover:border-indigo-500/40 transition-all group">
                                                            <input 
                                                                type="file" 
                                                                accept="image/*"
                                                                onChange={handleFileSelect}
                                                                className="hidden"
                                                            />
                                                            <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-lg shadow-lg group-hover:scale-110 transition-transform">📸</div>
                                                            <div className="text-center">
                                                                <p className="text-white text-[10px] font-black uppercase tracking-wide">Select Screenshot</p>
                                                                <p className="text-slate-500 text-[8px] font-bold mt-1">PNG, JPG, JPEG (Max 5MB)</p>
                                                            </div>
                                                        </label>
                                                    ) : (
                                                        <div className="relative rounded-xl overflow-hidden group">
                                                            <img 
                                                                src={previewUrl} 
                                                                className="w-full max-h-48 object-cover rounded-xl border border-indigo-500/30" 
                                                                alt="Preview" 
                                                            />
                                                            <button 
                                                                onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                                                                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-black shadow-lg hover:bg-red-600 active:scale-95 transition-all"
                                                            >✕</button>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1 block px-1 italic">Transaction Ref No.</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Enter Txn / Ref No."
                                                        value={paymentRef}
                                                        onChange={(e) => setPaymentRef(e.target.value)}
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-indigo-500/50 transition-all font-bold placeholder:text-slate-800 placeholder:font-normal"
                                                    />
                                                </div>
                                            </div>
                                            <button 
                                                onClick={handlePayment}
                                                disabled={submitting || !selectedFile || !paymentRef.trim()}
                                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                            >
                                                {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Confirm Payment 💸'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : team.status === 'COMPLETED' ? (
                                <div className="text-center py-6 animate-fadeIn space-y-6">
                                    <div>
                                        <div className="text-5xl mb-4 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]">🎉</div>
                                        <h5 className="text-emerald-400 font-black text-2xl uppercase tracking-[0.2em] italic underline decoration-emerald-500/30 underline-offset-8">Registration Confirmed</h5>
                                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-4">Your team is confirmed and ready!</p>
                                    </div>

                                    <div className="bg-black/40 rounded-3xl p-6 border border-emerald-500/20 space-y-4">
                                        <p className="text-emerald-400 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            Verification Screenshots
                                        </p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {team.leaderPaymentRef && (
                                                <div className="space-y-1.5">
                                                    <p className="text-slate-600 text-[7px] font-black uppercase tracking-tighter">Leader Proof {team.leaderTransactionId && <span className="text-indigo-400">({team.leaderTransactionId})</span>}</p>
                                                    <img src={`${api.defaults.baseURL}${team.leaderPaymentScreenshot}`} className="w-full h-24 object-cover rounded-xl border border-white/5 hover:scale-105 transition-transform cursor-pointer" alt="Leader Proof" onClick={() => window.open(`${api.defaults.baseURL}${team.leaderPaymentScreenshot}`)} />
                                                </div>
                                            )}
                                            {team.memberPaymentRefs?.map((m, idx) => (
                                                <div key={idx} className="space-y-1.5">
                                                    <p className="text-slate-600 text-[7px] font-black uppercase tracking-tighter truncate">{m.name}'s Proof {m.tid && <span className="text-indigo-400">({m.tid})</span>}</p>
                                                    <img src={`${api.defaults.baseURL}${m.ref}`} className="w-full h-24 object-cover rounded-xl border border-white/5 hover:scale-105 transition-transform cursor-pointer" alt="Member Proof" onClick={() => window.open(`${api.defaults.baseURL}${m.ref}`)} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <button 
                                        onClick={onClose}
                                        className="px-8 py-3 rounded-full bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all"
                                    >
                                        Close Portal
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center py-10 space-y-4 animate-pulse">
                                    <div className="text-3xl">⏳</div>
                                    <div>
                                        <p className="text-indigo-400 font-black text-xs uppercase tracking-[0.3em] italic">
                                            {team.status === 'PENDING' ? 'Waiting for Team Formation' : 'Awaiting Other Payments'}
                                        </p>
                                        <p className="text-slate-600 text-[9px] font-bold uppercase tracking-widest mt-2">
                                            {team.status === 'PENDING' ? 'Everyone must join before payment opens' : 'Waiting for teammates to complete their shares'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
