import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from '../Toast';
import { BACKEND_URL } from '../../config';
import LoadingSpinner from '../LoadingSpinner';
import { exportToExcel } from '../../utils/exportToExcel';

export default function EventRegistrationsModal({ event, isOpen, onClose, role = 'college', clubId }) {
    const [activeTab, setActiveTab] = useState('individual');
    const [loading, setLoading] = useState(true);
    const [registrations, setRegistrations] = useState([]);
    const [teams, setTeams] = useState([]);
    const [selectedImage, setSelectedImage] = useState(null);
    const BASE = BACKEND_URL;

    useEffect(() => {
        if (isOpen && event) {
            fetchData();
            // Automatically switch to team tab if it's a team event
            if (event.registrationType === 'TEAM') {
                setActiveTab('teams');
            } else {
                setActiveTab('individual');
            }
        }
    }, [isOpen, event]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const prefix = role === 'college' ? '/api/college-admin' : '/api/club';
            const q = (role === 'club' && clubId) ? `?club_id=${clubId}` : '';
            const [regRes, teamRes] = await Promise.all([
                api.get(`${prefix}/events/${event.id}/registrations${q}`),
                api.get(`${prefix}/events/${event.id}/teams${q}`)
            ]);
            setRegistrations(regRes.data.registrations || []);
            setTeams(teamRes.data.teams || []);
        } catch (error) {
            toast('Failed to load registrations', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (regId) => {
        try {
            const prefix = role === 'college' ? '/api/college-admin' : '/api/club';
            const q = (role === 'club' && clubId) ? `?club_id=${clubId}` : '';
            await api.put(`${prefix}/registrations/${regId}/verify${q}`);
            fetchData();
            toast.success('Registration verified');
        } catch (error) {
            toast.error('Failed to verify');
        }
    };

    const handleReject = async (regId) => {
        const reason = window.prompt("Enter rejection reason:");
        if (!reason) return;
        try {
            const prefix = role === 'college' ? '/api/college-admin' : '/api/club';
            const q = (role === 'club' && clubId) ? `?club_id=${clubId}` : '';
            await api.put(`${prefix}/registrations/${regId}/reject${q}`, { reason });
            fetchData();
            toast.success('Registration rejected');
        } catch (error) {
            toast.error('Failed to reject');
        }
    };

    const handleReset = async () => {
        if (!window.confirm("Are you sure? This will PERMANENTLY DELETE all registrations for this event.")) return;
        try {
            const prefix = role === 'college' ? '/api/college-admin' : '/api/club';
            const q = (role === 'club' && clubId) ? `?club_id=${clubId}` : '';
            await api.delete(`${prefix}/events/${event.id}/reset-all${q}`);
            fetchData();
            toast.success('All registrations reset');
        } catch (error) {
            toast.error('Failed to reset');
        }
    };

    const handleResetSingle = async (regId, isTeam = false) => {
        if (!window.confirm(`Are you sure you want to delete this ${isTeam ? 'team' : 'registration'}?`)) return;
        try {
            const prefix = role === 'college' ? '/api/college-admin' : '/api/club';
            const q = (role === 'club' && clubId) ? `?club_id=${clubId}` : '';
            await api.delete(`${prefix}/registrations/${regId}${q}`);
            fetchData();
            toast.success('Deleted successfully');
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    const handleVerifyTeamLeader = async (teamId) => {
        try {
            const prefix = role === 'college' ? '/api/college-admin' : '/api/club';
            const q = (role === 'club' && clubId) ? `?club_id=${clubId}` : '';
            await api.put(`${prefix}/team-leader/${teamId}/verify${q}`);
            fetchData();
            toast.success('Leader payment verified');
        } catch (error) {
            toast.error('Failed to verify');
        }
    };

    const handleRejectTeamLeader = async (teamId) => {
        if (!window.confirm("Reject leader payment? Student will need to re-upload proof.")) return;
        try {
            const prefix = role === 'college' ? '/api/college-admin' : '/api/club';
            const q = (role === 'club' && clubId) ? `?club_id=${clubId}` : '';
            await api.put(`${prefix}/team-leader/${teamId}/reject${q}`);
            fetchData();
            toast.success('Leader payment rejected');
        } catch (error) {
            toast.error('Failed to reject');
        }
    };

    const handleVerifyTeamMember = async (memberId) => {
        try {
            const prefix = role === 'college' ? '/api/college-admin' : '/api/club';
            const q = (role === 'club' && clubId) ? `?club_id=${clubId}` : '';
            await api.put(`${prefix}/team-member/${memberId}/verify${q}`);
            fetchData();
            toast.success('Member payment verified');
        } catch (error) {
            toast.error('Failed to verify');
        }
    };

    const handleRejectTeamMember = async (memberId) => {
        if (!window.confirm("Reject member payment? Student will need to re-upload proof.")) return;
        try {
            const prefix = role === 'college' ? '/api/college-admin' : '/api/club';
            const q = (role === 'club' && clubId) ? `?club_id=${clubId}` : '';
            await api.put(`${prefix}/team-member/${memberId}/reject${q}`);
            fetchData();
            toast.success('Member payment rejected');
        } catch (error) {
            toast.error('Failed to reject');
        }
    };

    const handleExport = () => {
        if (activeTab === 'individual') {
            const dataToExport = registrations.filter(r => !r.teamName).map(r => ({
                Name: r.studentName || r.name,
                Email: r.studentEmail || r.email,
                Event: r.eventTitle || r.event,
                Status: r.status || r.paymentStatus,
                RegisteredAt: new Date(r.registeredAt).toLocaleString()
            }));
            exportToExcel(dataToExport, `${event.title || 'Event'}_Individuals`);
        } else {
            const exportData = [];
            teams.forEach(team => {
                exportData.push({
                    TeamName: team.teamName,
                    Role: 'Leader',
                    Name: team.leaderName || team.leader,
                    Email: team.leaderEmail,
                    Status: team.status
                });
                team.members?.forEach(member => {
                    exportData.push({
                        TeamName: team.teamName,
                        Role: 'Member',
                        Name: member.name || member.invitedName,
                        Email: member.email || member.invitedEmail,
                        Status: team.status
                    });
                });
            });
            exportToExcel(exportData, `${event.title || 'Event'}_Teams`);
        }
    };

    if (!isOpen) return null;

    function renderMemberRow({
        id, name, email, isLeader, status,
        paymentRef, paymentShot, onViewShot, 
        onVerify, onReject, key
    }) {
        const isVerified = status === "PAID" || status === "VERIFIED" || status === "FREE";
        const isAwaiting = paymentRef || paymentShot;

        return (
            <div key={key} className="flex items-start gap-3 px-4 py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.01] transition-colors rounded-xl">
                {/* Icon */}
                <div className="relative">
                    <span className="text-xl flex-shrink-0 mt-0.5 block">
                        {isLeader ? "👑" : "👤"}
                    </span>
                    {isVerified && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-[#0f172a]">
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                        </div>
                    )}
                </div>

                {/* Name + Email + TXN */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white text-sm font-semibold">
                            {name || "Unknown"}
                        </p>
                        {isLeader && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-black uppercase tracking-widest">
                                Leader
                            </span>
                        )}
                        {isVerified ? (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black uppercase tracking-widest flex items-center gap-1">
                                <span>✓</span> Status: {event?.registrationFee === 0 ? 'Confirmed' : 'Registration Confirmed'}
                            </span>
                        ) : isAwaiting && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-black uppercase tracking-widest flex items-center gap-1">
                                <span>⌛</span> Awaiting Verification
                            </span>
                        )}
                    </div>

                    {email && (
                        <p className="text-slate-400 text-[10px] mt-0.5 font-medium">{email}</p>
                    )}

                    {/* Transaction Info */}
                    <div className="flex items-center gap-4 mt-2">
                        {paymentRef ? (
                            <div className="flex items-center gap-2 p-1.5 px-2.5 rounded-lg bg-slate-800/50 border border-white/5">
                                <span className="text-[9px] text-slate-500 font-bold uppercase">TXN:</span>
                                <code className="text-indigo-300 font-mono text-[10px] font-bold">
                                    {paymentRef}
                                </code>
                            </div>
                        ) : status !== "FREE" && (
                            <p className="text-slate-600 text-[10px] italic">No transaction ID</p>
                        )}

                        {paymentShot && (
                            <button
                                onClick={() => onViewShot(paymentShot)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 text-[10px] font-bold transition-all border border-indigo-500/20 uppercase tracking-tight"
                            >
                                📸 Proof
                            </button>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-center">
                    {!isVerified && isAwaiting && event?.registrationFee !== 0 && (
                        <div className="flex flex-col gap-2">
                            <button 
                                onClick={() => onVerify(id)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all border border-emerald-500/20 shadow-lg shadow-emerald-500/5 text-[10px] font-black uppercase tracking-wider"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                                Confirm
                            </button>
                            <button 
                                onClick={() => onReject(id)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-all border border-rose-500/20 shadow-lg shadow-rose-500/5 text-[10px] font-black uppercase tracking-wider"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                                Reject
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-[#020617]/90 backdrop-blur-sm" onClick={onClose}></div>
            
            <div className="relative w-full sm:max-w-4xl bg-[#0f172a] rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden animate-slideUp sm:animate-fadeIn max-h-[90vh] sm:max-h-none flex flex-col pb-8 sm:pb-0">
                {/* Header */}
                <div className="p-8 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-display font-black text-white italic tracking-tight uppercase">
                                Registration <span className="text-indigo-400 text-sm">/ {event?.title}</span>
                            </h2>
                            <p className="text-slate-400 text-xs font-medium mt-1 uppercase tracking-widest opacity-60">Review participation & verification status</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>

                    <div className="flex gap-2">
                        {event.registrationType !== 'TEAM' && (
                            <button 
                                onClick={() => setActiveTab('individual')}
                                className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'individual' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/50' : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'}`}
                            >
                                Individual ({registrations.filter(r => !r.teamName).length})
                            </button>
                        )}
                        {event.registrationType !== 'INDIVIDUAL' && (
                            <button 
                                onClick={() => setActiveTab('teams')}
                                className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'teams' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/50' : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'}`}
                            >
                                Teams ({teams.length})
                            </button>
                        )}
                        <button
                            onClick={handleExport}
                            className="px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 ml-auto flex items-center gap-2"
                        >
                            📊 Export Excel
                        </button>
                    </div>

                </div>

                <div className="p-8 max-h-[60vh] overflow-y-auto no-scrollbar">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center space-y-4">
                            <LoadingSpinner />
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Sychronizing Data...</p>
                        </div>
                    ) : activeTab === 'individual' ? (
                        <div className="space-y-4">
                            {registrations.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {registrations.filter(r => !r.teamName).map(reg => (
                                        <div key={reg.id} className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between hover:border-indigo-500/30 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div>
                                                    <h4 className="text-white font-bold text-sm">{reg.studentName}</h4>
                                                    <p className="text-slate-500 text-[10px]">{reg.studentEmail}</p>
                                                    {reg.teamName && (
                                                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                                            Team: {reg.teamName}
                                                        </span>
                                                    )}
                                                    <p className="text-[8px] text-slate-600 mt-1 uppercase font-black">{new Date(reg.registeredAt).toLocaleString()}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="text-[10px] text-slate-400 font-medium mb-1">{reg.paymentRef || 'No Transaction ID'}</p>
                                                     { (reg.status === 'VERIFIED' || reg.status === 'PAID' || reg.status === 'FREE') ? (
                                                        <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tight border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 flex items-center gap-1">
                                                            <span>✓</span> {event?.registrationFee === 0 ? 'Confirmed' : 'Registration Confirmed'}
                                                        </span>
                                                     ) : reg.status === 'REJECTED' ? (
                                                        <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tight border bg-red-500/10 text-red-400 border-red-500/20 flex items-center gap-1">
                                                            <span>✕</span> Rejected
                                                        </span>
                                                     ) : (
                                                        <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tight border bg-amber-500/10 text-amber-400 border-amber-500/20 flex items-center gap-1">
                                                            <span>⌛</span> Awaiting Verification
                                                        </span>
                                                     )}
                                                </div>

                                                {reg.paymentScreenshotUrl && (
                                                    <button 
                                                        onClick={() => setSelectedImage(`${BASE}${reg.paymentScreenshotUrl}`)}
                                                        className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-all border border-indigo-500/20"
                                                        title="View Payment Proof"
                                                    >
                                                        🖼️
                                                    </button>
                                                )}
                                                 
                                                <div className="flex flex-col gap-2 ml-2">
                                                    {reg.status !== 'VERIFIED' && event?.registrationFee !== 0 && (
                                                        <button 
                                                            onClick={() => handleVerify(reg.id)}
                                                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                                                            Confirm
                                                        </button>
                                                    )}
                                                    {reg.status !== 'REJECTED' && (
                                                        <button 
                                                            onClick={() => handleReject(reg.id)}
                                                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-all border border-rose-500/20 text-[10px] font-black uppercase tracking-wider"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                                                            Reject
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 text-slate-500 uppercase text-xs font-black tracking-widest opacity-40">No individual registrations yet</div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {teams.length > 0 ? (
                                teams.map(team => (
                                    <div key={team.id} className="bg-white/[0.02] rounded-3xl border border-white/5 overflow-hidden">
                                        <div className="p-4 bg-white/5 flex items-center justify-between border-b border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-xl">🛡️</div>
                                                <div>
                                                    <h3 className="text-white font-bold">{team.teamName}</h3>
                                                    <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest">ID: #{team.id} • {team.membersCount} Members • Leader: {team.leader?.name || "Unknown"}</p>
                                                </div>
                                            </div>
                                            <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                                                team.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            }`}>
                                                {team.status}
                                            </span>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            {/* Leader */}
                                            {team.leaderId && renderMemberRow({
                                                id: team.id,
                                                name: team.leaderName,
                                                email: team.leaderEmail,
                                                isLeader: true,
                                                status: team.leaderPaymentStatus,
                                                paymentRef: team.leaderPaymentRef,
                                                paymentShot: team.leaderPaymentScreenshot,
                                                onViewShot: (shot) => setSelectedImage(`${BASE}${shot}`),
                                                onVerify: handleVerifyTeamLeader,
                                                onReject: handleRejectTeamLeader
                                            })}
                                            
                                            {/* Members */}
                                            {team.members && team.members.map(member => renderMemberRow({
                                                key: member.id,
                                                id: member.id,
                                                name: member.invitedName,
                                                email: member.invitedEmail,
                                                isLeader: false,
                                                status: member.paymentStatus,
                                                paymentRef: member.paymentRef,
                                                paymentShot: member.paymentScreenshot,
                                                onViewShot: (shot) => setSelectedImage(`${BASE}${shot}`),
                                                onVerify: handleVerifyTeamMember,
                                                onReject: handleRejectTeamMember
                                            }))}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-20 text-slate-500 uppercase text-xs font-black tracking-widest opacity-40">No teams registered yet</div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Lightbox */}
            {selectedImage && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 p-8 animate-in fade-in duration-300" onClick={() => setSelectedImage(null)}>
                    <img src={selectedImage} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" />
                    <button className="absolute top-8 right-8 p-4 text-white hover:bg-white/10 rounded-full transition-colors">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-white text-[10px] font-black uppercase tracking-widest">
                        Payment Confirmation Screenshot
                    </div>
                </div>
            )}
        </div>
    );
}
