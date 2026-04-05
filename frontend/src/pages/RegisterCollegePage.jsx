import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { toast } from '../components/Toast';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

export default function RegisterCollegePage() {
    const [formData, setFormData] = useState({
        collegeName: '', location: '', description: '', website: '',
        adminName: '', adminEmail: '', password: '', confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const err = sessionStorage.getItem('pending_register_college_error');
        if (err) { toast(err, 'error'); sessionStorage.removeItem('pending_register_college_error'); }
    }, []);

    const handleChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

    const processBackendRegisterCollege = async (submitData) => {
        // Call our backend to register the pending college and the admin
        await api.post('/api/auth/register-college', submitData);
        setSuccess(true);
        toast('College registration submitted successfully!', 'success');
    };

    const handleGoogleRegister = async () => {
        if (!formData.collegeName || !formData.location) {
            toast('Please fill out the College Information section first', 'error');
            return;
        }

        setLoading(true);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const idToken = await result.user.getIdToken();

            await api.post('/api/auth/register-college', {
                ...formData,
                adminName: result.user.displayName || result.user.email?.split('@')[0] || 'Admin',
                adminEmail: result.user.email,
                password: 'FIREBASE_AUTH',
                confirmPassword: 'FIREBASE_AUTH'
            }, {
                headers: { Authorization: `Bearer ${idToken}` }
            });
            setSuccess(true);
            toast('College registration submitted for review! ✅', 'success');
            // Sign out since college needs approval first
            await auth.signOut();
        } catch (err) {
            if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
                setLoading(false); return;
            }
            console.error('College registration error:', err);
            toast(err.response?.data?.error || err.message || 'Registration failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast('Passwords do not match', 'error');
            return;
        }

        setLoading(true);
        try {
            // 1. Create account in Firebase
            await createUserWithEmailAndPassword(auth, formData.adminEmail, formData.password);
            await processBackendRegisterCollege(formData);
        } catch (err) {
            console.error('Registration error:', err);
            handleAuthError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAuthError = async (err) => {
        // Delete the Firebase user if our DB fails so they aren't stuck
        if (auth.currentUser && err.response) {
            try {
                await auth.currentUser.delete();
            } catch (deleteErr) {
                console.error('Failed to clean up Firebase user', deleteErr);
            }
        }

        let message = 'Registration failed';
        if (err.code === 'auth/email-already-in-use') {
            message = 'Email is already in use';
        } else if (err.code === 'auth/weak-password') {
            message = 'Password is too weak';
        } else if (err.code === 'auth/popup-closed-by-user') {
            message = 'Google sign-in was cancelled';
        } else if (err.response?.data?.error || err.response?.data?.message) {
            message = err.response.data.error || err.response.data.message;
        } else if (err.message) {
            message = err.message;
        }
        toast(message, 'error');
    };

    if (success) {
        return (
            <div className="max-w-xl mx-auto mt-12 p-8 bg-slate-800 border border-brand-500/30 rounded-xl shadow-2xl mb-12 text-center">
                <div className="w-16 h-16 bg-brand-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">Registration Submitted!</h2>
                <div className="space-y-3 text-slate-300 mb-8">
                    <p>Your college registration has been successfully submitted to Event Hub.</p>
                    <p className="font-medium text-amber-400">Our platform administrators will review and approve your college shortly.</p>
                    <p>You will be able to log in to your College Admin dashboard once approved.</p>
                </div>
                <button
                    onClick={() => navigate('/login')}
                    className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-3 rounded-lg font-medium shadow-lg shadow-brand-500/20 transition-all"
                >
                    Back to Login
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto mt-8 mb-16 p-8 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Register Your College</h2>
                <p className="text-slate-400">Apply to join the platform and manage your campus events</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* SECTION 1: College Information */}
                <div>
                    <h3 className="text-lg font-semibold text-brand-400 border-b border-brand-500/20 pb-2 mb-4">
                        1. College Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-300 mb-1">College Name *</label>
                            <input required name="collegeName" value={formData.collegeName} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-brand-500" placeholder="e.g. Stanford University" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Location / City *</label>
                            <input required name="location" value={formData.location} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-brand-500" placeholder="e.g. Stanford, CA" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-300 mb-1">Website URL</label>
                            <input type="url" name="website" value={formData.website} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-brand-500" placeholder="https://..." />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                            <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-brand-500" placeholder="Brief overview of the college..."></textarea>
                        </div>
                    </div>
                </div>

                {/* SECTION 2: Admin Account */}
                <div>
                    <h3 className="text-lg font-semibold text-brand-400 border-b border-brand-500/20 pb-2 mb-4">
                        2. Administrator Account
                    </h3>
                    <p className="text-xs text-slate-400 mb-4">You can fill this out, OR click "Register Admin with Google" below.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-300 mb-1">Your Full Name</label>
                            <input name="adminName" value={formData.adminName} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-brand-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Email Address (Official)</label>
                            <input type="email" name="adminEmail" value={formData.adminEmail} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-brand-500" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
                            <input type="password" minLength="6" name="password" value={formData.password} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-brand-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Confirm Password</label>
                            <input type="password" minLength="6" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-brand-500" />
                        </div>
                    </div>
                </div>

                <div className="space-y-4 mt-8">
                    <button type="submit" disabled={loading} className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg shadow-lg shadow-brand-500/20 text-lg transition-all">
                        {loading ? 'Submitting Registration...' : 'Submit with Email/Password'}
                    </button>
                    
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-700"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-slate-800 text-slate-400 font-medium text-xs uppercase tracking-wider">Or</span>
                        </div>
                    </div>

                    <button 
                        type="button"
                        onClick={handleGoogleRegister}
                        disabled={loading} 
                        className="w-full bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-900 font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg transition-all"
                    >
                        <span className="text-xl">G</span> Register Admin with Google
                    </button>
                </div>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-700 text-center text-slate-400 text-sm">
                Already registered? <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium ml-1">Login here</Link>
            </div>
            <div className="mt-2 text-center text-slate-400 text-sm">
                Are you a student? <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium ml-1">Register here</Link>
            </div>
        </div>
    );
}
