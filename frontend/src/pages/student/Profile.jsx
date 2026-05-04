import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import { BACKEND_URL } from '../../config';

export default function StudentProfile() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const [formData, setFormData] = useState({
        name: ''
    });

    const [colleges, setColleges] = useState([]);
    const [collegeSearch, setCollegeSearch] = useState('');
    const [selectedCollegeId, setSelectedCollegeId] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    // Check if user lacks college info
    const isMissingCollege = !user?.collegeId && user?.collegeName === 'Not specified';

    const [profile, setProfile] = useState({});
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);

    useEffect(() => {
        api.get('/api/public/colleges').then(res => setColleges(res.data)).catch(console.error);
        const fetchProfile = async () => {
            try {
                const res = await api.get('/api/student/profile');
                const data = res.data;
                setProfile(data);
                setFormData({
                    name: data.name || ''
                });
                setCollegeSearch(data.college?.name || data.collegeNameManual || '');
                setSelectedCollegeId(data.collegeId || '');
                setPreview(data.profilePic ? (data.profilePic.startsWith('http') ? data.profilePic : `${BACKEND_URL}${data.profilePic}`) : null);
            } catch (error) {
                toast('Failed to load profile details', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFile(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => data.append(key, formData[key]));
            if (file) data.append('profilePic', file);
            
            if (selectedCollegeId) {
                data.append('collegeId', selectedCollegeId);
            } else if (collegeSearch) {
                data.append('collegeNameManual', collegeSearch);
            } else if (isMissingCollege) {
                toast("Please select a college", "error");
                setSubmitting(false);
                return;
            }

            const res = await api.put('/api/student/profile', data);

            // Re-fetch me to update AuthContext and profile state
            const meRes = await api.get('/api/auth/me');
            localStorage.setItem('user', JSON.stringify(meRes.data));

            const updatedProfile = res.data.user;
            setProfile(updatedProfile);
            setPreview(updatedProfile.profilePic ? (updatedProfile.profilePic.startsWith('http') ? updatedProfile.profilePic : `${BACKEND_URL}${updatedProfile.profilePic}`) : null);
            setIsEditing(false);
            window.location.reload(); // Quickly sync context
            toast('Profile updated successfully', 'success');
        } catch (error) {
            toast('Failed to update profile', 'error');
            setSubmitting(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-fadeIn">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">My Profile</h1>
                    <p className="text-slate-400 text-sm">View and manage your personal information.</p>
                </div>
                {!isEditing && !isMissingCollege && (
                    <button onClick={() => setIsEditing(true)} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition-colors border border-slate-600">
                        Edit Profile
                    </button>
                )}
            </div>

            {isMissingCollege && (
                <div className="bg-amber-500/10 border border-amber-500/50 rounded-xl p-4 flex items-center gap-4 animate-bounce-subtle">
                    <span className="text-2xl">⚠️</span>
                    <div>
                        <p className="text-amber-400 font-bold">Incomplete Profile</p>
                        <p className="text-amber-400/80 text-sm font-medium">Please select your college to access the full platform. This is mandatory for registration.</p>
                    </div>
                </div>
            )}

            <div className="bg-[#1e293b] rounded-xl border border-slate-700 shadow-lg p-6 md:p-8">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="flex flex-col items-center space-y-4">
                        <div className="w-32 h-32 rounded-full bg-slate-800 border-4 border-slate-700 overflow-hidden shadow-xl relative group">
                            {preview ? (
                                <img src={preview} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                    <span className="text-4xl text-indigo-500 font-bold">{profile.name ? profile.name.charAt(0) : 'S'}</span>
                                </div>
                            )}
                            {isEditing && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer transition-opacity">
                                    <label className="text-white text-xs font-bold cursor-pointer underline hover:text-indigo-300">
                                        Upload
                                        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 w-full">
                        {!isEditing ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-sm font-medium text-slate-400 mb-1">Full Name</p>
                                        <div className="flex items-center gap-2.5 flex-wrap">
                                            {profile.role === 'STUDENT' && (
                                                <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] italic shadow-lg shadow-blue-500/5">
                                                    🎓 Student
                                                </span>
                                            )}
                                            {profile.role === 'CLUB_COORDINATOR' && (
                                                <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] italic shadow-lg shadow-indigo-500/5">
                                                    👑 Club Head
                                                </span>
                                            )}
                                            {profile.clubRoles?.map((cr, idx) => (
                                                <span key={idx} className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-[0.2em] italic shadow-lg ${
                                                    cr.role === 'VOLUNTEER' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-emerald-500/5' : 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-amber-500/5'
                                                }`}>
                                                    {cr.role === 'VOLUNTEER' ? '🤝 Volunteer' : '⭐ Coordinator'} | {cr.clubName}
                                                </span>
                                            ))}
                                            <p className="text-white font-black text-xl tracking-tight italic uppercase ml-1">
                                                {profile.name || '-'}
                                            </p>
                                        </div>
                                    </div>

                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-700/50">
                                    <div>
                                        <p className="text-sm font-medium text-slate-400 mb-1">Email Address</p>
                                        <p className="text-white font-medium">{profile.email || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-400 mb-1">College</p>
                                        <p className="text-indigo-400 font-medium">{user?.collegeName || '-'}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-700/50">
                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Events Registered</p>
                                        <p className="text-white font-black text-2xl">{profile.eventCount || 0}</p>
                                    </div>
                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Teams Joined</p>
                                        <p className="text-white font-black text-2xl">{profile.teamCount || 0}</p>
                                    </div>
                                </div>

                                {/* Volunteer Badge Section */}
                                {(profile.volunteerPoints > 0 || (profile.volunteerBadges && profile.volunteerBadges.length > 0)) && (
                                    <div className="pt-4 border-t border-slate-700/50">
                                        <p className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                                            <span className="text-yellow-400">🤝</span> Volunteer Activity
                                        </p>
                                        <div className="flex flex-wrap items-center gap-3">
                                            {profile.volunteerPoints > 0 && (
                                                <span className="px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 font-bold text-sm">
                                                    ⭐ {profile.volunteerPoints} pts
                                                </span>
                                            )}
                                            {(profile.volunteerBadges || []).map((badge, i) => (
                                                <span key={i} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-medium text-sm">
                                                    🏅 {badge}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
                                        <input type="text" name="name" required value={formData.name} onChange={handleChange} className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500" />
                                    </div>

                                </div>

                                <div className="grid grid-cols-1 gap-6 pt-4 border-t border-slate-700/50">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Email Address <span className="text-xs text-slate-500 ml-2">(Read-only)</span></label>
                                        <input type="email" value={profile.email || ''} readOnly className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-500 cursor-not-allowed" />
                                    </div>
                                    
                                    {/* College Input - Dropdown */}
                                    <div className="relative">
                                        <label className="block text-sm font-medium text-indigo-400 mb-1">College <span className="text-xs text-indigo-500 ml-2">(Required)</span></label>
                                        <input
                                            type="text" required placeholder="Search or type college..." value={collegeSearch}
                                            onChange={(e) => {
                                                setCollegeSearch(e.target.value);
                                                setSelectedCollegeId('');
                                                setShowDropdown(true);
                                            }}
                                            onFocus={() => setShowDropdown(true)}
                                            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                                            className="w-full bg-[#0f172a] border border-indigo-500/50 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                        />
                                        {showDropdown && collegeSearch && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#1e293b] border border-slate-700 rounded-xl z-50 max-h-48 overflow-y-auto shadow-2xl">
                                                {colleges.filter(c => c.name.toLowerCase().includes(collegeSearch.toLowerCase())).map(college => (
                                                    <div
                                                        key={college.id}
                                                        className="px-4 py-3 hover:bg-slate-700 cursor-pointer text-sm text-white border-b border-slate-700/50"
                                                        onClick={() => {
                                                            setSelectedCollegeId(college.id);
                                                            setCollegeSearch(college.name);
                                                            setShowDropdown(false);
                                                        }}
                                                    >
                                                        {college.name}
                                                    </div>
                                                ))}
                                                {!colleges.find(c => c.name.toLowerCase() === collegeSearch.toLowerCase()) && (
                                                    <div
                                                        className="px-4 py-3 hover:bg-slate-700 cursor-pointer text-amber-400 text-sm italic"
                                                        onClick={() => {
                                                            setSelectedCollegeId('');
                                                            setShowDropdown(false);
                                                        }}
                                                    >
                                                        Use "{collegeSearch}" (not yet registered)
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-6 flex justify-end gap-3">
                                    {!isMissingCollege && (
                                        <button type="button" onClick={() => setIsEditing(false)} className="px-5 py-2.5 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition-colors">
                                            Cancel
                                        </button>
                                    )}
                                    <button type="submit" disabled={submitting} className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-2">
                                        {submitting ? 'Saving...' : isMissingCollege ? 'Complete Registration' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
