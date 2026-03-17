import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/Toast';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import api from '../services/api';

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { setUser } = useAuth();
    const navigate = useNavigate();

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const idToken = await result.user.getIdToken();
            const res = await api.post('/api/auth/google-login', { idToken });
            const dbUser = res.data.user;
            setUser(dbUser);

            if (res.data.isNewUser) {
                toast(`Welcome ${dbUser.name}! Please complete your profile.`, 'success');
            } else {
                toast(`Welcome back, ${dbUser.name}!`, 'success');
            }
            navigate('/');
        } catch (err) {
            console.error('Google Sign-In error:', err);
            handleAuthError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAuthError = async (err) => {
        if (err.response?.data?.blocked) {
            navigate('/college-blocked', { state: { reason: err.response.data.reason, message: err.response.data.message } });
            return;
        }

        let message = 'Sign-in failed';

        if (err.response?.status === 404) {
            message = err.response.data.error || 'Account not found. Please register first.';
            toast(message, 'error');
            if (auth.currentUser) await auth.signOut();
            return;
        }

        if (err.code === 'auth/popup-closed-by-user') message = 'Sign-in was cancelled';
        else if (err.response?.data?.message || err.response?.data?.error)
            message = err.response.data.message || err.response.data.error;
        else if (err.message) message = err.message;

        setError(message);
        toast(message, 'error');

        if (auth.currentUser && err.response) {
            await auth.signOut();
            setUser(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-fadeIn relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-6xl bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row relative z-10">
                
                {/* Left Side - Hero */}
                <div className="w-full md:w-1/2 relative min-h-[300px] md:min-h-full hidden md:block">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-slate-900 overflow-hidden">
                        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-indigo-500/20 rounded-full blur-[80px]" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent opacity-80" />
                    <div className="absolute inset-0 p-12 flex flex-col justify-end">
                        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 mb-8 flex items-center justify-center text-3xl shadow-xl">🎓</div>
                        <h1 className="text-4xl lg:text-5xl font-display font-black text-white leading-tight mb-4 drop-shadow-xl">
                            Join the Premium Network of <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">College Events</span>
                        </h1>
                        <p className="text-slate-300 font-medium text-lg max-w-md">
                            Discover, register, and manage your college experiences in one unified platform.
                        </p>
                    </div>
                </div>

                {/* Right Side - Sign In */}
                <div className="w-full md:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-center bg-[#0f172a]/40 relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
                    
                    <div className="w-full max-w-md mx-auto relative z-10">
                        
                        {/* Tabs */}
                        <div className="flex bg-[#1e293b]/50 p-1.5 rounded-2xl border border-white/5 mb-10 w-full backdrop-blur-md">
                            <button className="flex-1 py-3 text-sm font-bold rounded-xl bg-white/10 text-white shadow-lg shadow-black/20 border border-white/10 transition-all">
                                Login
                            </button>
                            <Link to="/register" className="flex-1 py-3 text-sm font-bold rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-center">
                                Register
                            </Link>
                        </div>

                        <div className="mb-10">
                            <h2 className="text-3xl font-display font-bold text-white mb-2 tracking-tight">Welcome back</h2>
                            <p className="text-slate-400 font-medium">Sign in with your Google account to continue.</p>
                        </div>

                        {error && (
                            <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 flex items-center gap-3">
                                <span className="text-lg">⚠️</span> {error}
                            </div>
                        )}

                        {/* Google Sign-In Button */}
                        <button
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                            type="button"
                            className="w-full flex justify-center items-center gap-3 py-4 px-6 rounded-xl bg-white text-slate-800 font-bold text-sm transition-all hover:bg-slate-100 disabled:opacity-50 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-5 h-5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                                    Signing in...
                                </span>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                    </svg>
                                    Continue with Google
                                </>
                            )}
                        </button>

                        <p className="text-center text-slate-500 text-xs mt-8">
                            College Admin or Club Coordinator?{' '}
                            <Link to="/login/admin" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                                Sign in with email →
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
            
            {/* Back to Home */}
            <Link to="/" className="absolute top-6 left-6 md:top-8 md:left-8 w-12 h-12 rounded-full bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all z-20">
                ←
            </Link>
        </div>
    );
}
