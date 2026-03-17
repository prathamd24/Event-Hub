import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../../firebase';
import api from '../../services/api';
import { toast } from '../../components/Toast';
import Toast from '../Toast';

export default function CreateClubModal({ isOpen, onClose, onSuccess }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [authMode, setAuthMode] = useState('manual'); // 'manual' or 'google'

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: 'Technical',
        instagram: '',
        facultyName: '',
        facultyEmail: '',
        coordinatorPassword: '',
        coordinatorFirebaseUid: ''
    });

    useState(() => {
        // Restore step if available
        const savedStep = sessionStorage.getItem('create_club_modal_step');
        if (savedStep) {
            setStep(parseInt(savedStep));
            sessionStorage.removeItem('create_club_modal_step');
        }

        // Restore form data if available
        const savedData = sessionStorage.getItem('pending_club_form');
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                
                // If we also just finished a Google redirect, the user is now in 'auth'
                // We'll update their UID/Email from the current auth state
                const currentUser = auth.currentUser;
                if (currentUser) {
                    parsed.facultyName = currentUser.displayName || parsed.facultyName;
                    parsed.facultyEmail = currentUser.email || parsed.facultyEmail;
                    parsed.coordinatorFirebaseUid = currentUser.uid;
                    parsed.coordinatorPassword = '';
                    setAuthMode('google');
                }

                setFormData(prev => ({ ...prev, ...parsed }));
                sessionStorage.removeItem('pending_club_form');
            } catch (e) {
                console.error("Failed to restore club form data", e);
            }
        }
    }, [isOpen]);

    const [logo, setLogo] = useState(null);
    const [cover, setCover] = useState(null);

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setLogo(e.target.files[0]);
        }
    };

    const handleGoogleCoordinator = async () => {
        try {
            // Save state before redirect
            sessionStorage.setItem('pending_club_form', JSON.stringify(formData));
            sessionStorage.setItem('reopen_create_club_modal', 'true');
            sessionStorage.setItem('create_club_modal_step', step.toString());
            
            await signInWithRedirect(auth, googleProvider);
        } catch (err) {
            console.error(err);
            toast('Google authentication redirect failed', 'error');
        }
    };

    const nextStep = () => setStep(2);
    const prevStep = () => setStep(1);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                data.append(key, formData[key]);
            });
            if (logo) {
                data.append('logo', logo);
            }
            if (cover) {
                data.append('cover', cover);
            }

            const res = await api.post('/api/college-admin/clubs', data);
            toast(res.data.message || 'Club created successfully', 'success');
            setTimeout(() => {
                onSuccess(res.data.club);
                onClose();
            }, 1000);
        } catch (err) {
            toast(err.response?.data?.error || 'Failed to create club', 'error');
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white/10 backdrop-blur-3xl border border-white/20 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-8 animate-fadeIn relative">
                {/* Decorative glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none" />

                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 relative z-10">
                    <h2 className="text-2xl font-display font-black text-white">Create New Club</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-all">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="px-6 pt-4 pb-2 border-b border-white/10 bg-black/20 relative z-10">
                    <div className="flex items-center gap-4 text-sm font-bold tracking-wide">
                        <div className={`flex items-center gap-2 ${step === 1 ? 'text-indigo-400' : 'text-emerald-400'}`}>
                            <span className="w-6 h-6 rounded-full flex items-center justify-center border-2 border-current shadow-lg">1</span>
                            Club Info
                        </div>
                        <div className="flex-1 h-px bg-white/10"></div>
                        <div className={`flex items-center gap-2 ${step === 2 ? 'text-indigo-400' : 'text-slate-500'}`}>
                            <span className="w-6 h-6 rounded-full flex items-center justify-center border-2 border-current shadow-lg">2</span>
                            Coordinator
                        </div>
                    </div>
                </div>

                <form onSubmit={step === 2 ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }} className="p-6 relative z-10">
                    {step === 1 ? (
                        <div className="space-y-5 animate-fadeIn">
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">Club Name *</label>
                                <input type="text" name="name" required value={formData.name} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 focus:bg-white/5 transition-all font-medium" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">Description *</label>
                                <textarea name="description" required rows="3" value={formData.description} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 focus:bg-white/5 transition-all resize-y font-medium"></textarea>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Category</label>
                                    <select name="category" value={formData.category} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 focus:bg-white/5 transition-all font-medium appearance-none">
                                        <option value="Technical" className="bg-slate-900 text-white">Technical</option>
                                        <option value="Sports" className="bg-slate-900 text-white">Sports</option>
                                        <option value="Cultural" className="bg-slate-900 text-white">Cultural</option>
                                        <option value="Literary" className="bg-slate-900 text-white">Literary</option>
                                        <option value="Management" className="bg-slate-900 text-white">Management</option>
                                        <option value="Alumni" className="bg-slate-900 text-white">Alumni</option>
                                        <option value="Other" className="bg-slate-900 text-white">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Club Logo</label>
                                    <input type="file" accept="image/*" onChange={handleFileChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-slate-300 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/20 file:text-indigo-300 hover:file:bg-indigo-500/30 outline-none transition-all cursor-pointer" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Club Cover Photo</label>
                                    <input type="file" accept="image/*" onChange={(e) => setCover(e.target.files[0])} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-slate-300 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-500/20 file:text-purple-300 hover:file:bg-purple-500/30 outline-none transition-all cursor-pointer" />
                                    <p className="text-slate-400 text-xs mt-2 italic font-medium">Recommended: wide image (800x300px)</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-5 animate-fadeIn">
                            {/* Auth Mode Toggle */}
                            <div className="flex bg-[#1e293b]/50 p-1.5 rounded-2xl border border-white/5 mb-6 w-full backdrop-blur-md">
                                <button type="button" onClick={() => setAuthMode('manual')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${authMode === 'manual' ? 'bg-white/10 text-white shadow-lg shadow-black/20 border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                    Manual Creation
                                </button>
                                <button type="button" onClick={() => setAuthMode('google')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${authMode === 'google' ? 'bg-white/10 text-white shadow-lg shadow-black/20 border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                    Google Auth
                                </button>
                            </div>

                            {authMode === 'google' ? (
                                <div className="text-center py-6">
                                    {!formData.coordinatorFirebaseUid ? (
                                        <button type="button" onClick={handleGoogleCoordinator} className="px-6 py-3 rounded-xl bg-white text-slate-900 font-bold flex items-center justify-center gap-3 mx-auto hover:bg-slate-100 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 w-full sm:w-auto">
                                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                            </svg>
                                            Link Coordinator's Google Account
                                        </button>
                                    ) : (
                                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl inline-flex items-center gap-4 text-left w-full sm:w-auto">
                                            <span className="w-12 h-12 rounded-full bg-emerald-500/20 flex flex-shrink-0 items-center justify-center text-emerald-400 text-2xl font-bold">✓</span>
                                            <div className="flex-1 overflow-hidden">
                                                <p className="text-emerald-400 font-bold truncate">{formData.facultyName}</p>
                                                <p className="text-emerald-300/70 text-sm truncate">{formData.facultyEmail}</p>
                                                <p className="text-emerald-400/50 text-[10px] uppercase font-bold tracking-wider mt-1">Google Synced</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-300 mb-2">Faculty Name *</label>
                                        <input type="text" name="facultyName" required value={formData.facultyName} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 focus:bg-white/5 transition-all font-medium" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-300 mb-2">Faculty Email *</label>
                                        <input type="email" name="facultyEmail" required value={formData.facultyEmail} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 focus:bg-white/5 transition-all font-medium" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-slate-300 mb-2">Login Password *</label>
                                        <input type="password" name="coordinatorPassword" required minLength="6" value={formData.coordinatorPassword} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 focus:bg-white/5 transition-all font-medium" />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-white/10">
                        {step === 2 && (
                            <button type="button" onClick={prevStep} disabled={loading} className="px-6 py-2.5 rounded-xl text-white font-bold hover:bg-white/10 border border-white/20 transition-all disabled:opacity-50">
                                Back
                            </button>
                        )}
                        {step === 1 ? (
                            <button type="submit" className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)]">
                                Continue
                            </button>
                        ) : (
                            <button type="submit" disabled={loading} className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] disabled:opacity-50 flex items-center gap-2">
                                {loading ? 'Creating...' : 'Create Club'}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
