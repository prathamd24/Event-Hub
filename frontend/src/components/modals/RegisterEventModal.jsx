import { useState, useRef } from 'react';
import api from '../../services/api';
import { toast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { BACKEND_URL } from '../../config';

export default function RegisterEventModal({ isOpen, onClose, event, onSuccess }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [screenshot, setScreenshot] = useState(null);
    const [preview, setPreview] = useState(null);
    const [transactionId, setTransactionId] = useState('');
    const fileInputRef = useRef(null);
    const BASE = BACKEND_URL;

    if (!isOpen || !event) return null;

    const isPaid = event.registrationFee > 0;
    const regType = (event.registrationType || 'INDIVIDUAL').toUpperCase();
    const isTeamOnly = regType === 'TEAM';
    const isBoth = regType === 'BOTH';

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setScreenshot(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleRegistration = async () => {
        if (isPaid && !screenshot) {
            toast('Please upload your payment screenshot', 'error');
            return;
        }
        if (isPaid && !transactionId.trim()) {
            toast('Please enter the Transaction ID / Reference No.', 'error');
            return;
        }

        setLoading(true);
        try {
            if (isPaid) {
                const formData = new FormData();
                formData.append('screenshot', screenshot);
                formData.append('paymentRef', transactionId.trim());
                
                const res = await api.post(`/api/student/events/${event.id}/submit-payment`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                toast('Registration & Payment Successful! ⚡', 'success');
                if (onSuccess) onSuccess(res.data);
                onClose();
            } else {
                const res = await api.post(`/api/student/events/${event.id}/register`, {});
                toast('Registration Successful! ⚡', 'success');
                if (onSuccess) onSuccess(res.data);
                onClose();
            }
        } catch (err) {
            toast(err.response?.data?.message || 'Registration failed. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-hidden font-sans">
            <div className="bg-[#0f172a] border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full sm:max-w-lg shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] overflow-y-auto animate-slideUp sm:animate-fadeIn relative my-0 sm:my-auto max-h-[90vh] pb-8 sm:pb-0">
                {/* Visual accents */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
                
                {/* Header */}
                <div className="px-8 pt-8 pb-4 flex justify-between items-center bg-white/[0.01]">
                    <div>
                        <h2 className="text-xl font-black text-white tracking-tight leading-none uppercase italic">JOIN <span className="text-indigo-400">EVENT</span></h2>
                        <div className="h-1 w-8 bg-indigo-500 rounded-full mt-2" />
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-8 space-y-6 animate-fadeIn">
                    {/* Event Summary */}
                    <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4">
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase shadow-lg ${isPaid ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'}`}>
                                {isPaid ? `₹${event.registrationFee}` : 'FREE'}
                            </span>
                        </div>
                        <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Confirming for</p>
                        <h3 className="text-white font-black text-2xl tracking-tight leading-tight mb-6">{event.title}</h3>
                        
                        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/5">
                            <div>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1.5 font-display flex items-center gap-1.5">
                                    <span className="text-[14px]">👤</span> Student
                                </p>
                                <p className="text-white text-sm font-bold truncate">{user?.name || 'Explorer'}</p>
                            </div>
                            <div>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1.5 font-display flex items-center gap-1.5">
                                    <span className="text-[14px]">🏛️</span> College
                                </p>
                                <p className="text-white text-sm font-bold truncate">{user?.collegeName || user?.collegeNameManual || 'Not specified'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Paid Flow: QR + Upload */}
                    {isPaid && (
                        <div className="space-y-6 bg-white/[0.02] border border-white/5 p-6 rounded-[2rem]">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest italic">Payment Details</h4>
                                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase tracking-tighter border border-amber-500/20">Action Required</span>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-6 items-center">
                                {/* QR Code */}
                                <div className="w-32 h-32 bg-white p-2 rounded-2xl flex-shrink-0 shadow-2xl relative group">
                                    {event.paymentQr ? (
                                        <img 
                                            src={`${api.defaults.baseURL}${event.paymentQr}`} 
                                            className="w-full h-full object-contain" 
                                            alt="QR" 
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-xl text-[10px] text-slate-400 text-center font-bold px-2">QR NOT SPECIFIED</div>
                                    )}
                                </div>
                                <div className="space-y-4 flex-1 w-full text-center sm:text-left">
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">A/C Name</p>
                                            <p className="text-white text-sm font-bold truncate">{event.upiName || 'Not Specified'}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">UPI ID</p>
                                            <p className="text-white text-[11px] font-mono font-bold bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 truncate">{event.upiId || 'Not Specified'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 justify-center sm:justify-start">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-sm border border-emerald-500/20">₹</div>
                                        <p className="text-emerald-400 text-xs font-black uppercase tracking-widest italic">Pay ₹{event.registrationFee}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Upload Area */}
                            <div className="space-y-4">
                                <div>
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2 font-display italic">1. Upload payment screenshot</p>
                                    <div 
                                        onClick={() => fileInputRef.current.click()}
                                        className={`relative h-24 border-2 border-dashed rounded-2xl transition-all cursor-pointer flex items-center justify-center overflow-hidden ${preview ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 hover:border-indigo-500/50 hover:bg-white/5'}`}
                                    >
                                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                                        {preview ? (
                                            <div className="flex items-center gap-4 w-full h-full px-4">
                                                <img src={preview} className="w-16 h-16 rounded-lg object-cover border border-white/10" alt="Preview" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white text-[10px] font-bold truncate italic">Screenshot attached ⚡</p>
                                                    <p className="text-slate-500 text-[8px] font-medium leading-tight">Click to change photo</p>
                                                </div>
                                                <div className="text-emerald-400 text-xl">✓</div>
                                            </div>
                                        ) : (
                                            <div className="text-center">
                                                <p className="text-indigo-400 text-[10px] font-black mb-1 uppercase tracking-widest">Select Image</p>
                                                <p className="text-slate-500 text-[8px] font-medium">JPG, PNG or WEBP (Max 5MB)</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2 font-display italic">2. Transaction ID / Reference No.</p>
                                    <input 
                                        type="text" 
                                        placeholder="Enter the 12-digit Ref No."
                                        value={transactionId}
                                        onChange={(e) => setTransactionId(e.target.value)}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-indigo-500/50 transition-all font-bold placeholder:text-slate-700 placeholder:font-normal"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Normal Action Area */}
                    {!isTeamOnly ? (
                        <div className="space-y-4 pt-2">
                            <button 
                                onClick={handleRegistration}
                                disabled={loading}
                                className="w-full py-5 rounded-3xl bg-white text-slate-950 font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-100 transition-all shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                                        <span>RESERVING...</span>
                                    </div>
                                ) : (
                                    <span>{isPaid ? 'COMPLETE REGISTRATION' : 'CONFIRM INDIVIDUAL RSVP'}</span>
                                )}
                            </button>
                            
                            {isBoth && (
                                <p className="text-center text-[10px] text-slate-400 font-bold">
                                    Want to participate with friends? <button onClick={onClose} className="text-indigo-400 hover:underline">Register as a Team instead</button>
                                </p>
                            )}

                            <div className="flex flex-col items-center gap-2">
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.1em] flex items-center gap-1.5 opacity-60 italic">
                                    <span>⚡</span> INSTANT CONFIRMATION ENABLED
                                </p>
                                <p className="text-slate-600 text-[9px] font-medium max-w-[280px] text-center italic">
                                    Your registration will be <span className="text-indigo-400 font-black">AUTO-CONFIRMED</span> immediately upon confirmation.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-3xl p-6 text-center space-y-4">
                            <p className="text-indigo-400 text-sm font-black uppercase tracking-widest italic">Team Event Only</p>
                            <p className="text-slate-400 text-xs">Individual registrations are not allowed. Please use the "Register as Team" section on the event page.</p>
                            <button 
                                onClick={onClose}
                                className="w-full py-4 rounded-2xl bg-white text-slate-950 font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                            >
                                GOT IT
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
