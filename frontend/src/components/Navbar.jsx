import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import Logo from './Logo';

import { BACKEND_URL } from '../config';

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="sticky w-full top-0 z-50 h-16 bg-[#0f172a]/85 backdrop-blur-xl border-b border-white/10 px-4 transition-all duration-300 flex items-center">
            <div className="max-w-7xl mx-auto flex items-center justify-between w-full">

                {/* Logo Section */}
                <Link to="/" className="flex items-center group shrink-0">
                    <Logo className="text-2xl sm:text-3xl" />
                </Link>

                {/* Navigation Links - Desktop Only */}
                <div className="hidden md:flex items-center gap-6 bg-white/5 px-5 py-2 rounded-full border border-white/10">
                    <Link to="/" className="text-sm font-medium text-slate-300 hover:text-white transition-colors relative group">
                        Home
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-400 group-hover:w-full transition-all duration-300" />
                    </Link>
                    <Link to="/colleges" className="text-sm font-medium text-slate-300 hover:text-white transition-colors relative group">
                        Colleges
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-400 group-hover:w-full transition-all duration-300" />
                    </Link>
                    <Link to="/events" className="text-sm font-medium text-slate-300 hover:text-white transition-colors relative group">
                        Events
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-400 group-hover:w-full transition-all duration-300" />
                    </Link>
                </div>

                {/* Auth Section */}
                <div className="flex items-center gap-4 shrink-0">
                    {user && <NotificationBell />}
                    {!user ? (
                        <>
                            <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors hidden sm:block">Log in</Link>
                            <Link to="/register" className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-[0_0_12px_rgba(99,102,241,0.3)] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                                Sign up
                            </Link>
                        </>
                    ) : (
                        <div className="relative group">
                            <button className="flex items-center gap-2.5 hover:bg-white/5 rounded-full pr-3 py-1.5 pl-1.5 transition-colors border border-transparent hover:border-white/10">
                                <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md shrink-0">
                                    {user.profilePic ? (
                                        <img src={user.profilePic.startsWith('http') ? user.profilePic : `${BACKEND_URL}${user.profilePic}`} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        user.name ? user.name.charAt(0).toUpperCase() : 'U'
                                    )}
                                </div>
                                <div className="flex items-center gap-2 max-w-[180px]">
                                    {user.clubRoles?.map((cr, idx) => (
                                        <span key={idx} title={cr.clubName} className={`px-1.5 py-0.5 rounded-md border text-[8px] font-black uppercase tracking-tighter shrink-0 italic ${
                                            cr.role === 'VOLUNTEER' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                                        }`}>
                                            {cr.role === 'VOLUNTEER' ? 'VOL' : 'SC'} | {cr.clubName}
                                        </span>
                                    ))}
                                    {user.role === 'CLUB_COORDINATOR' && (
                                        <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-[8px] font-black text-indigo-400 uppercase tracking-tighter shrink-0 italic">HEAD</span>
                                    )}
                                    <span className="text-sm font-medium text-slate-200 hidden sm:block truncate">{user.name}</span>
                                </div>
                            </button>

                            {/* Dropdown Menu */}
                            <div className="absolute right-0 top-full mt-2 w-56 bg-[#0f172a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 origin-top-right scale-95 group-hover:scale-100 z-50 overflow-hidden">
                                <div className="px-4 py-3.5 border-b border-white/10 bg-white/5">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <div className="flex gap-1.5 items-center">
                                            {user.role === 'CLUB_COORDINATOR' && (
                                                <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-[8px] font-black text-indigo-400 uppercase italic">👑 HEAD</span>
                                            )}
                                            {user.clubRoles?.map((cr, idx) => (
                                                <span key={idx} className={`px-2 py-0.5 rounded-md border text-[8px] font-black uppercase italic ${
                                                    cr.role === 'VOLUNTEER' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                                                }`}>
                                                    {cr.role === 'VOLUNTEER' ? '🤝 VOL' : '⭐ SC'} | {cr.clubName}
                                                </span>
                                            ))}
                                        </div>
                                        <p className="text-sm font-bold text-white truncate">{user.name}</p>
                                    </div>
                                    <p className="text-xs text-indigo-400 font-semibold truncate mt-0.5">{user.role}</p>
                                </div>

                                <div className="py-1.5">
                                    {user.role === 'PLATFORM_ADMIN' && <Link to="/platform-admin/dashboard" className="block px-4 py-2.5 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors">📊 Dashboard</Link>}
                                    {user.role === 'COLLEGE_ADMIN' && <Link to="/college-panel/dashboard" className="block px-4 py-2.5 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors">📊 Dashboard</Link>}
                                    {user.role === 'CLUB_COORDINATOR' && <Link to="/club/dashboard" className="block px-4 py-2.5 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors">📊 Dashboard</Link>}
                                    {user.role === 'STUDENT_COORDINATOR' && <Link to="/sc/dashboard" className="block px-4 py-2.5 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors">📊 Coordinator Panel</Link>}
                                    {(user.role === 'STUDENT' || user.role === 'STUDENT_COORDINATOR') && (
                                        <Link to="/student/profile" className="block px-4 py-2.5 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors">My Profile</Link>
                                    )}
                                    <Link to="/settings" className="block px-4 py-2.5 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors">
                                        ⚙️ Settings
                                    </Link>
                                </div>
                                <div className="border-t border-white/10 p-1.5">
                                    <button
                                        onClick={() => { if (window.confirm('Are you sure you want to logout?')) handleLogout(); }}
                                        className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                                    >
                                        Log out
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}

