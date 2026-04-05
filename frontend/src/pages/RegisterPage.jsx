import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { toast } from '../components/Toast';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';

export default function RegisterPage() {
    const [colleges, setColleges] = useState([]);
    const [collegeSearch, setCollegeSearch] = useState('');
    const [selectedCollegeId, setSelectedCollegeId] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { setUser } = useAuth();

    const filteredColleges = colleges.filter(c =>
        c.name.toLowerCase().includes(collegeSearch.toLowerCase())
    );

    useEffect(() => {
        api.get('/api/public/colleges').then(res => setColleges(res.data));
    }, []);

    const handleGoogleRegister = async () => {
        if (!selectedCollegeId && !collegeSearch.trim()) {
            toast('Please select or type your college name first.', 'error');
            return;
        }

        setLoading(true);
        sessionStorage.setItem('registration_in_progress', 'true');
        try {
            // signInWithPopup gives us the result immediately — no redirect needed
            const result = await signInWithPopup(auth, googleProvider);
            const idToken = await result.user.getIdToken();

            const res = await api.post('/api/auth/register', {
                name: result.user.displayName || result.user.email?.split('@')[0] || 'Student',
                email: result.user.email,
                collegeId: selectedCollegeId || null,
                collegeNameManual: !selectedCollegeId ? collegeSearch : null
            }, {
                headers: { Authorization: `Bearer ${idToken}` }
            });

            sessionStorage.removeItem('registration_in_progress');
            toast('Welcome to Event Hub! 🎉', 'success');
            setUser(res.data.user);
            navigate('/');
        } catch (err) {
            sessionStorage.removeItem('registration_in_progress');
            // User closed the popup
            if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
                setLoading(false);
                return;
            }
            console.error('Registration error:', err);
            toast(err.response?.data?.error || err.message || 'Registration failed', 'error');
        } finally {
            sessionStorage.removeItem('registration_in_progress');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex flex-col animate-fadeIn relative overflow-x-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none" />

            <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 w-full mt-16 md:mt-0">
                <div className="w-full max-w-6xl bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row relative z-10 my-8">
                
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

                {/* Right Side - Register */}
                <div className="w-full md:w-1/2 p-8 sm:p-12 lg:p-12 flex flex-col justify-center bg-[#0f172a]/40 relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
                    
                    <div className="w-full max-w-md mx-auto relative z-10">
                        
                        {/* Tabs */}
                        <div className="flex bg-[#1e293b]/50 p-1.5 rounded-2xl border border-white/5 mb-8 w-full backdrop-blur-md">
                            <Link to="/login" className="flex-1 py-3 text-sm font-bold rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-center">
                                Login
                            </Link>
                            <button className="flex-1 py-3 text-sm font-bold rounded-xl bg-white/10 text-white shadow-lg shadow-black/20 border border-white/10 transition-all">
                                Register
                            </button>
                        </div>

                        <div className="mb-8">
                            <h2 className="text-3xl font-display font-bold text-white mb-2 tracking-tight">Create Account</h2>
                            <p className="text-slate-400 font-medium">Sign up with Google to join the hub.</p>
                        </div>

                        {/* College Selector */}
                        <div className="mb-6 space-y-1.5 relative">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">
                                Your College <span className="text-red-400">*</span>
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">🏛️</div>
                                <input
                                    type="text"
                                    placeholder="Search or type your college..."
                                    value={collegeSearch}
                                    onChange={(e) => {
                                        setCollegeSearch(e.target.value);
                                        setSelectedCollegeId('');
                                        setShowDropdown(true);
                                    }}
                                    onFocus={() => setShowDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                                    className="w-full bg-[#1e293b]/50 border border-white/10 rounded-xl pl-10 pr-3 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:bg-[#1e293b] transition-all text-sm"
                                />
                            </div>

                            {showDropdown && collegeSearch && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1e293b] border border-white/10 rounded-xl z-50 max-h-48 overflow-y-auto shadow-2xl backdrop-blur-xl">
                                    {filteredColleges.map(college => (
                                        <div
                                            key={college.id}
                                            className="px-4 py-3 hover:bg-white/5 cursor-pointer flex justify-between items-center border-b border-white/5 last:border-0 transition-colors"
                                            onClick={() => {
                                                setSelectedCollegeId(college.id);
                                                setCollegeSearch(college.name);
                                                setShowDropdown(false);
                                            }}
                                        >
                                            <span className="text-white text-sm font-medium">{college.name}</span>
                                            <span className="text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/10 border border-emerald-400/20 uppercase tracking-wider">Registered</span>
                                        </div>
                                    ))}
                                    {collegeSearch && !filteredColleges.find(c => c.name.toLowerCase() === collegeSearch.toLowerCase()) && (
                                        <div
                                            className="px-4 py-3 hover:bg-white/5 cursor-pointer text-amber-400 text-sm italic transition-colors"
                                            onClick={() => { setSelectedCollegeId(''); setShowDropdown(false); }}
                                        >
                                            Use "{collegeSearch}" (not yet registered)
                                        </div>
                                    )}
                                </div>
                            )}

                            {selectedCollegeId && (
                                <p className="text-emerald-400 text-xs pl-1">✓ College selected</p>
                            )}
                            {collegeSearch && !selectedCollegeId && !showDropdown && (
                                <p className="text-amber-400/90 text-xs pl-1 flex items-start gap-1">
                                    <span>⚠️</span> Unregistered college — we'll add it, but tell them to join!
                                </p>
                            )}
                        </div>

                        {/* Google Register Button */}
                        <button
                            onClick={handleGoogleRegister}
                            disabled={loading}
                            type="button"
                            className="w-full flex justify-center items-center gap-3 py-4 px-6 rounded-xl bg-white text-slate-800 font-bold text-sm transition-all hover:bg-slate-100 disabled:opacity-50 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-5 h-5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                                    Creating account...
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

                        <p className="text-center text-slate-500 text-xs mt-6">
                            By continuing you agree to our{' '}
                            <span className="text-indigo-400">Terms of Service</span>
                            {' '}and{' '}
                            <span className="text-indigo-400">Privacy Policy</span>.
                        </p>

                        <div className="mt-8 pt-6 border-t border-white/5">
                            <Link
                                to="/register-college"
                                className="text-indigo-400 hover:text-indigo-300 font-bold text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5"
                            >
                                🏛️ Register your College
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
            </div>

            {/* Back to Home */}
            <Link to="/" className="absolute top-6 left-6 md:top-8 md:left-8 w-12 h-12 rounded-full bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all z-20">
                ←
            </Link>

            {/* Premium Footer */}
            <Footer />
        </div>
    );
}
