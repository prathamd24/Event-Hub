import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/Toast';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import api from '../services/api';

/**
 * Admin Login Page — for College Admins and Club Coordinators ONLY.
 * Students should use /login (Google-only).
 * Supports both manual email/password AND Google sign-in.
 */
export default function AdminLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { setUser } = useAuth();
    const navigate = useNavigate();

    const processBackendLogin = async () => {
        const res = await api.post('/api/auth/login');
        const dbUser = res.data.user;
        setUser(dbUser);

        // Only allow staff roles on this page
        if (dbUser.role === 'STUDENT') {
            toast('Students, please use the main login page.', 'info');
            navigate('/login');
            return;
        }

        toast(`Welcome back, ${dbUser.name}!`, 'success');
        navigate('/');
    };

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
            await processBackendLogin();
        } catch (err) {
            // If the user exists in our DB but not in Firebase (legacy coordinator), auto-create
            if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
                try {
                    await createUserWithEmailAndPassword(auth, email, password);
                    await processBackendLogin();
                    return;
                } catch (createErr) {
                    console.error("Auto-create fallback failed:", createErr);
                    handleAuthError(err); // Show original error
                }
            } else {
                handleAuthError(err);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Recover persistent errors from sessionStorage
        const storedError = sessionStorage.getItem('pending_login_error');
        if (storedError) {
            console.log('[Auth Debug] Recovered admin error from session:', storedError);
            setError(storedError);
            sessionStorage.removeItem('pending_login_error');
        }
    }, []);

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const idToken = await result.user.getIdToken();
            const res = await api.post('/api/auth/google-login', { idToken });
            const dbUser = res.data.user;
            setUser(dbUser);

            if (dbUser.role === 'STUDENT') {
                toast('Students, please use the main login page.', 'info');
                navigate('/login');
                return;
            }

            toast(`Welcome back, ${dbUser.name}!`, 'success');
            navigate('/');
        } catch (err) {
            console.error('Google Sign-In popup error:', err);
            // Ignore popup closed errors
            if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
                setLoading(false);
                return;
            }
            handleAuthError(err);
            setLoading(false);
        }
    };

    const handleAuthError = async (err) => {
        if (err.response?.status === 404) {
            const message = err.response.data.error || 'Please register yourself first.';
            
            // Persist the error
            sessionStorage.setItem('pending_login_error', message);
            
            setError(message);
            toast(message, 'error');
            
            if (auth.currentUser) {
                // Delay signOut to let the message show
                setTimeout(async () => {
                    await auth.signOut();
                }, 2000);
            }
            return;
        }
        if (err.response?.data?.blocked) {
            navigate('/college-blocked', { state: { reason: err.response.data.reason, message: err.response.data.message } });
            return;
        }
        let message = 'Login failed';
        if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential')
            message = 'Invalid email or password';
        else if (err.code === 'auth/popup-closed-by-user') message = 'Google sign-in was cancelled';
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
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-md relative z-10">
                
                {/* Card */}
                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl p-8 sm:p-10">
                    
                    {/* Logo/Icon */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-3xl mb-4 shadow-xl">
                            🔐
                        </div>
                        <h1 className="text-2xl font-display font-black text-white tracking-tight">Staff Login</h1>
                        <p className="text-slate-400 text-sm mt-1 text-center">College Admin &amp; Club Coordinator access</p>
                    </div>

                    {error && (
                        <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-4 text-sm text-red-400 flex flex-col gap-3 shadow-lg">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">⚠️</span>
                                <span className="font-semibold">{error}</span>
                            </div>
                            {error.includes('register') && (
                                <button 
                                    onClick={() => navigate('/register')}
                                    className="mt-1 w-full bg-red-500/20 hover:bg-red-500/30 text-red-100 font-bold py-2 rounded-lg border border-red-500/30 transition-all text-xs uppercase tracking-wider shadow-sm"
                                >
                                    Go to Registration Page →
                                </button>
                            )}
                        </div>
                    )}

                    {/* Email/Password Form */}
                    <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Email Address</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-amber-400 transition-colors">✉️</div>
                                <input
                                    type="email" required
                                    value={email} onChange={e => setEmail(e.target.value)}
                                    className="w-full bg-[#1e293b]/50 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:bg-[#1e293b] transition-all text-sm"
                                    placeholder="admin@college.edu"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Password</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-amber-400 transition-colors">🔒</div>
                                <input
                                    type="password" required
                                    value={password} onChange={e => setPassword(e.target.value)}
                                    className="w-full bg-[#1e293b]/50 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:bg-[#1e293b] transition-all text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit" disabled={loading}
                            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] hover:-translate-y-0.5 mt-2"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Signing in...
                                </span>
                            ) : 'Sign In'}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="px-4 bg-[#0f172a]/60 text-slate-500 uppercase tracking-wider">or</span>
                        </div>
                    </div>

                    {/* Google Option */}
                    <button
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        type="button"
                        className="w-full flex justify-center items-center gap-3 py-3.5 px-6 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-sm transition-all disabled:opacity-50"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Continue with Google
                    </button>

                    <p className="text-center text-slate-500 text-xs mt-6">
                        Student?{' '}
                        <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                            Go to Student Login →
                        </Link>
                    </p>
                </div>
            </div>

            <Link to="/" className="absolute top-6 left-6 w-12 h-12 rounded-full bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all z-20">
                ←
            </Link>
        </div>
    );
}
