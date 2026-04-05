import { useState, useEffect } from "react";
import api from '../../services/api';
import { toast } from '../../components/Toast';
import { BACKEND_URL } from '../../config';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function CollegeProfile() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [initialLoad, setInitialLoad] = useState(true);

    // Events state
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [pastEvents, setPastEvents] = useState([]);
    const [showAllPast, setShowAllPast] = useState(false);
    const PAST_EVENTS_PREVIEW = 3;

    const [formData, setFormData] = useState({
        location: '',
        description: '',
        website: '',
        affiliations: [],
        contactEmail: '',
        phone: '',
        twitter: '',
        linkedin: '',
        facebook: '',
        instagram: '',
        establishedYear: '',
        type: '',
        naacGrade: ''
    });

    const [files, setFiles] = useState({ logo: null, banner: null });
    const [preview, setPreview] = useState({ logo: null, banner: null });

    useEffect(() => {
        const fetchCollegeInfo = async () => {
            if (!user?.collegeId || !initialLoad) return;
            try {
                const [profileRes, eventsRes] = await Promise.all([
                    api.get(`/api/college-admin/profile`),
                    api.get(`/api/college-admin/profile/events`).catch(() => ({ data: { upcoming: [], past: [] } }))
                ]);
                const college = profileRes.data;
                const parsedAffiliations = typeof college.affiliations === 'string'
                    ? JSON.parse(college.affiliations)
                    : (college.affiliations || []);

                setFormData({
                    location: college.location || '',
                    description: college.description || '',
                    website: college.website || '',
                    affiliations: parsedAffiliations,
                    contactEmail: college.contactEmail || '',
                    phone: college.phone || '',
                    twitter: college.twitter || '',
                    linkedin: college.linkedin || '',
                    facebook: college.facebook || '',
                    instagram: college.instagram || '',
                    establishedYear: college.establishedYear || '',
                    type: college.type || '',
                    naacGrade: college.naacGrade || ''
                });
                setPreview({
                    logo: college.logoUrl ? (college.logoUrl.startsWith('http') ? college.logoUrl : `${BACKEND_URL}${college.logoUrl}`) : null,
                    banner: college.bannerUrl ? (college.bannerUrl.startsWith('http') ? college.bannerUrl : `${BACKEND_URL}${college.bannerUrl}`) : null
                });

                setUpcomingEvents(eventsRes.data.upcoming || []);
                setPastEvents(eventsRes.data.past || []);
                setInitialLoad(false);
            } catch (error) {
                toast('Failed to load profile details', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchCollegeInfo();
    }, [user, initialLoad]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e, type) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFiles({ ...files, [type]: file });
            setPreview({ ...preview, [type]: URL.createObjectURL(file) });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                if (key === 'affiliations') {
                    data.append('affiliations', JSON.stringify(formData[key]));
                } else {
                    data.append(key, formData[key]);
                }
            });
            if (files.logo) data.append('logo', files.logo);
            if (files.banner) data.append('banner', files.banner);

            const res = await api.put('/api/college-admin/profile', data);
            toast('Profile updated successfully', 'success');

            const college = res.data.college;
            const parsedAffiliations = typeof college.affiliations === 'string'
                ? JSON.parse(college.affiliations)
                : (college.affiliations || []);
            setFormData(prev => ({ ...prev, ...college, affiliations: parsedAffiliations }));

            if (college.logoUrl) {
                setPreview(p => ({ ...p, logo: college.logoUrl.startsWith('http') ? college.logoUrl : `${BACKEND_URL}${college.logoUrl}` }));
            }
            if (college.bannerUrl) {
                setPreview(p => ({ ...p, banner: college.bannerUrl.startsWith('http') ? college.bannerUrl : `${BACKEND_URL}${college.bannerUrl}` }));
            }
        } catch (error) {
            toast(error.response?.data?.error || 'Failed to update profile', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status) => {
        if (status === 'UPCOMING') return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
        if (status === 'ONGOING') return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
        return 'bg-slate-700/50 text-slate-400 border border-slate-600/30';
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    if (loading) return <LoadingSpinner />;

    const visiblePastEvents = showAllPast ? pastEvents : pastEvents.slice(0, PAST_EVENTS_PREVIEW);

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-12 relative">
            <div className="fixed top-32 right-32 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10">
                <h1 className="text-3xl font-display font-black text-white mb-2">College Profile</h1>
                <p className="text-slate-400 text-sm font-medium">Update your institution's public information and branding.</p>
            </div>

            {/* ─── UPCOMING EVENTS SECTION ─── */}
            <div className="relative z-10 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-sm border border-emerald-500/30">⏰</span>
                        <div>
                            <h2 className="text-white font-bold text-base">Upcoming Events</h2>
                            <p className="text-slate-500 text-xs mt-0.5">{upcomingEvents.length} upcoming across all clubs</p>
                        </div>
                    </div>
                    <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/20">
                        {upcomingEvents.length} Events
                    </span>
                </div>

                {upcomingEvents.length === 0 ? (
                    <div className="py-12 text-center">
                        <div className="text-4xl mb-3 opacity-30">📅</div>
                        <p className="text-slate-500 text-sm font-medium">No upcoming events scheduled</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {upcomingEvents.map(event => (
                            <div key={event.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-all group">
                                <div className="w-12 h-12 rounded-xl overflow-hidden bg-indigo-900/40 flex-shrink-0 border border-indigo-500/20">
                                    {event.coverUrl
                                        ? <img src={`${BACKEND_URL}${event.coverUrl}`} className="w-full h-full object-cover" alt="" />
                                        : <div className="w-full h-full flex items-center justify-center text-lg">📅</div>
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-semibold text-sm truncate group-hover:text-indigo-300 transition-colors">
                                        {event.title}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                                        <span className="text-slate-500 text-xs">{formatDate(event.eventDate)}</span>
                                        {event.clubName && (
                                            <span className="text-violet-400 text-xs font-medium">🏛️ {event.clubName}</span>
                                        )}
                                        {!event.clubId && (
                                            <span className="text-indigo-400 text-xs font-medium">🎓 College</span>
                                        )}
                                    </div>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide flex-shrink-0 ${getStatusBadge(event.status)}`}>
                                    {event.status}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── PAST EVENTS SECTION ─── */}
            <div className="relative z-10 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-xl bg-slate-500/20 flex items-center justify-center text-sm border border-slate-500/30 grayscale">⏮️</span>
                        <div>
                            <h2 className="text-slate-300 font-bold text-base">Past Events</h2>
                            <p className="text-slate-500 text-xs mt-0.5">{pastEvents.length} completed events</p>
                        </div>
                    </div>
                    <span className="bg-slate-700/50 text-slate-400 px-3 py-1 rounded-full text-xs font-bold border border-slate-600/30">
                        {pastEvents.length} Events
                    </span>
                </div>

                {pastEvents.length === 0 ? (
                    <div className="py-12 text-center">
                        <div className="text-4xl mb-3 opacity-20">⏮️</div>
                        <p className="text-slate-500 text-sm font-medium">No past events yet</p>
                    </div>
                ) : (
                    <>
                        <div className="divide-y divide-white/5">
                            {visiblePastEvents.map(event => (
                                <div key={event.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-all group opacity-70 hover:opacity-100">
                                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-800/50 flex-shrink-0 border border-slate-700/30 grayscale group-hover:grayscale-0 transition-all">
                                        {event.coverUrl
                                            ? <img src={`${BACKEND_URL}${event.coverUrl}`} className="w-full h-full object-cover" alt="" />
                                            : <div className="w-full h-full flex items-center justify-center text-lg">⏳</div>
                                        }
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-slate-300 font-semibold text-sm truncate group-hover:text-white transition-colors">
                                            {event.title}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                                            <span className="text-slate-500 text-xs">{formatDate(event.eventDate)}</span>
                                            {event.clubName && (
                                                <span className="text-slate-500 text-xs font-medium">🏛️ {event.clubName}</span>
                                            )}
                                            {!event.clubId && (
                                                <span className="text-slate-500 text-xs font-medium">🎓 College</span>
                                            )}
                                        </div>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide flex-shrink-0 bg-slate-700/50 text-slate-500 border border-slate-600/30">
                                        COMPLETED
                                    </span>
                                </div>
                            ))}
                        </div>

                        {pastEvents.length > PAST_EVENTS_PREVIEW && (
                            <div className="px-6 py-4 border-t border-white/5 flex justify-center">
                                <button
                                    onClick={() => setShowAllPast(!showAllPast)}
                                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-700/60 text-slate-300 hover:text-white font-semibold text-sm border border-slate-700/50 hover:border-slate-600 transition-all group"
                                >
                                    {showAllPast ? (
                                        <>
                                            <span>Show Less</span>
                                            <span className="text-slate-500 group-hover:text-slate-300 transition-colors">↑</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Show All Past Events</span>
                                            <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-lg text-xs font-bold">
                                                +{pastEvents.length - PAST_EVENTS_PREVIEW}
                                            </span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ─── EDIT PROFILE FORM ─── */}
            <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden relative z-10">
                {/* Banner Section */}
                <div className="relative h-56 bg-slate-900 border-b border-white/10 group cursor-pointer overflow-hidden">
                    {preview.banner ? (
                        <img src={preview.banner} alt="Banner Preview" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-gradient-to-br from-indigo-900/30 to-purple-900/30">
                            <span className="text-5xl mb-3 opacity-50">🖼️</span>
                            <span className="text-sm font-bold tracking-wide">UPLOAD BANNER IMAGE</span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm">
                        <label className="bg-white/10 text-white px-5 py-2.5 rounded-xl font-bold cursor-pointer hover:bg-white/20 transition-all border border-white/20 backdrop-blur-md">
                            Change Banner
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'banner')} />
                        </label>
                    </div>
                </div>

                {/* Logo Section */}
                <div className="px-6 sm:px-10 relative pb-10">
                    <div className="absolute -top-16 left-6 sm:left-10 w-32 h-32 rounded-2xl bg-slate-900 border-4 border-slate-900 overflow-hidden shadow-2xl z-10 group cursor-pointer">
                        {preview.logo ? (
                            <img src={preview.logo} alt="Logo Preview" className="w-full h-full object-contain bg-white" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 bg-gradient-to-br from-white to-slate-200">
                                <span className="text-4xl font-black text-indigo-500">C</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm">
                            <label className="text-white text-xs font-bold cursor-pointer text-center w-full h-full flex items-center justify-center">
                                Change<br />Logo
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'logo')} />
                            </label>
                        </div>
                    </div>

                    <div className="pt-20 space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">College Name</label>
                            <input type="text" value={user?.collegeName || 'Unknown College'} disabled className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-slate-500 cursor-not-allowed font-medium" />
                            <p className="text-xs text-slate-500 mt-2 font-medium">Contact platform admin to change college name.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">University / Board Affiliations</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {formData.affiliations.map((affil, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-indigo-500/20 text-indigo-300 px-3 py-1.5 rounded-lg border border-indigo-500/30 font-medium text-sm">
                                        {affil}
                                        <button type="button" onClick={() => {
                                            const newAffils = [...formData.affiliations];
                                            newAffils.splice(idx, 1);
                                            setFormData({...formData, affiliations: newAffils});
                                        }} className="hover:text-white transition-colors">×</button>
                                    </div>
                                ))}
                            </div>
                            <input
                                type="text"
                                placeholder="Type affiliation and press Enter (e.g. Mumbai University, AICTE)..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all font-medium"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const val = e.target.value.trim();
                                        if (val && !formData.affiliations.includes(val)) {
                                            setFormData({...formData, affiliations: [...formData.affiliations, val]});
                                        }
                                        e.target.value = '';
                                    }
                                }}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">Location</label>
                            <input type="text" name="location" value={formData.location} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all font-medium" placeholder="City, State, Country" />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">Website URL</label>
                            <input type="url" name="website" value={formData.website} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all font-medium" placeholder="https://..." />
                        </div>

                        <div className="pt-4 border-t border-white/10">
                            <h3 className="text-lg font-bold text-white mb-4">Institution Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Established Year</label>
                                    <input type="number" name="establishedYear" value={formData.establishedYear} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 transition-all font-medium" placeholder="1995" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Institution Type</label>
                                    <select name="type" value={formData.type} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 transition-all font-medium appearance-none">
                                        <option value="" className="text-black">Select Type</option>
                                        <option value="Engineering" className="text-black">Engineering</option>
                                        <option value="Arts & Science" className="text-black">Arts & Science</option>
                                        <option value="Medical" className="text-black">Medical</option>
                                        <option value="Commerce" className="text-black">Commerce</option>
                                        <option value="University" className="text-black">University</option>
                                        <option value="Polytechnic" className="text-black">Polytechnic</option>
                                        <option value="Other" className="text-black">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">NAAC Grade / UGC</label>
                                    <input type="text" name="naacGrade" value={formData.naacGrade} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 transition-all font-medium" placeholder="e.g. A++" />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/10">
                            <h3 className="text-lg font-bold text-white mb-4">Contact & Social Links</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Public Contact Email</label>
                                    <input type="email" name="contactEmail" value={formData.contactEmail} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 transition-all font-medium" placeholder="contact@college.edu" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Phone Number</label>
                                    <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 transition-all font-medium" placeholder="+91..." />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Instagram (Optional)</label>
                                    <input type="text" name="instagram" value={formData.instagram} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 transition-all font-medium" placeholder="https://instagram.com/..." />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Twitter Profile (Optional)</label>
                                    <input type="text" name="twitter" value={formData.twitter} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 transition-all font-medium" placeholder="https://twitter.com/..." />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">LinkedIn Page (Optional)</label>
                                    <input type="text" name="linkedin" value={formData.linkedin} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 transition-all font-medium" placeholder="https://linkedin.com/..." />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Facebook Page (Optional)</label>
                                    <input type="text" name="facebook" value={formData.facebook} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 transition-all font-medium" placeholder="https://facebook.com/..." />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">About the College</label>
                            <textarea name="description" rows="5" value={formData.description} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all resize-y font-medium" placeholder="Detailed description of the institution..."></textarea>
                        </div>

                        <div className="pt-6 border-t border-white/10 flex justify-end">
                            <button type="submit" disabled={submitting} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] disabled:opacity-50 flex items-center gap-2">
                                {submitting ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
