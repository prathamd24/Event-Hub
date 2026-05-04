import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { toast } from '../components/Toast';
import ClubCard from '../components/ClubCard';
import EventCard from '../components/EventCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { BACKEND_URL } from '../config';
import Footer from '../components/Footer';

const BASE = BACKEND_URL;

export default function CollegeDetailPage() {
    const { id } = useParams();
    const [college, setCollege] = useState(null);
    const [clubs, setClubs] = useState([]);
    const [events, setEvents] = useState([]);
    const [pastEvents, setPastEvents] = useState([]);
    const [showAllPast, setShowAllPast] = useState(false);
    const [studentCount, setStudentCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('about'); // 'about', 'clubs', 'events'

    useEffect(() => {
        const fetchCollegeItems = async () => {
            try {
                const res = await api.get(`/api/public/colleges/${id}`);
                setCollege(res.data);
                setClubs(res.data.clubs || []);
                setEvents(res.data.events || []);
                setPastEvents(res.data.past_events || []);
                setStudentCount(res.data.studentCount || 0);
            } catch (error) {
                toast('Failed to load college details', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchCollegeItems();
    }, [id]);

    if (loading) return <LoadingSpinner />;
    if (!college) return <div className="text-white text-center py-20 flex flex-col items-center">
        <div className="text-6xl mb-4">🏛️</div>
        <h2 className="text-2xl font-display font-bold">College not found</h2>
        <Link to="/colleges" className="mt-4 text-indigo-400 hover:text-indigo-300">Browse other colleges</Link>
    </div>;

    const resolveUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        return `${BASE}${url}`;
    };

    return (
        <div className="min-h-screen bg-[#0f172a] animate-fadeIn pb-24 relative overflow-x-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-[400px] right-[-100px] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[150px] pointer-events-none" />
            <div className="absolute top-[800px] left-[-100px] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[150px] pointer-events-none" />

            {/* Immersive Banner Header */}
            <div className="relative h-[40vh] min-h-[350px] w-full mt-0">
                {college.bannerUrl ? (
                    <img src={resolveUrl(college.bannerUrl)} alt="Banner" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 relative overflow-hidden">
                        {/* Add a subtle pattern to empty banner */}
                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '30px 30px' }}></div>
                    </div>
                )}
                {/* Dark Gradient Overlay seamlessly blending into background */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/60 to-transparent"></div>
            </div>

            {/* Main Content Container */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 -mt-24 md:-mt-32">
                
                {/* Profile Header Core - Centered Layout */}
                <div className="flex flex-col items-center mb-16">
                    {/* Floating Logo - Centered */}
                    <div className="relative mb-8">
                        {/* Signature Glow */}
                        <div className="absolute inset-0 bg-yellow-400/20 blur-3xl rounded-full scale-110 opacity-60" />
                        <div className="w-40 h-40 md:w-56 md:h-56 rounded-[2.5rem] border-[6px] border-[#0f172a] overflow-hidden bg-white flex items-center justify-center shadow-[0_0_60px_rgba(0,0,0,0.4)] relative z-10 transition-transform duration-500 hover:scale-105">
                            {college.logoUrl ? (
                                <img src={resolveUrl(college.logoUrl)} alt="Logo" className="w-full h-full object-contain p-4" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                    <span className="text-7xl md:text-9xl font-display font-black text-white">
                                        {college.name.charAt(0)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Title and Badges */}
                    <div className="text-center max-w-4xl px-4">
                        <div className="flex flex-col items-center gap-4 mb-6">
                            <h1 className="text-4xl md:text-6xl font-display font-black text-[#fef3c7] tracking-tight drop-shadow-2xl">
                                {college.name}
                            </h1>
                            {college.affiliations && college.affiliations.length > 0 && (
                                <div className="flex flex-wrap justify-center gap-2 mt-2">
                                    {college.affiliations.map((affil, idx) => (
                                        <p key={idx} className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest backdrop-blur-md">
                                            🏛️ AFFILIATED TO {affil}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-4 text-[#a5b4fc] font-bold">
                            <div className="flex items-center gap-2 bg-indigo-500/5 border border-indigo-500/10 px-5 py-2 rounded-2xl backdrop-blur-md">
                                <span className="text-lg">📍</span> {college.location || 'Location TBA'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Stats Grid - Consistent 3-Block Layout */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                    <div className="bg-[#1e293b]/50 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-8 text-center transition-all hover:bg-white/10 hover:border-white/20 group">
                        <p className="text-5xl font-display font-black text-white mb-2">{college.clubCount || clubs.length}+</p>
                        <div className="flex items-center justify-center gap-3">
                            <span className="text-2xl">👥</span>
                            <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Active Clubs</p>
                        </div>
                    </div>
                    
                    <div className="bg-[#1e293b]/50 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-8 text-center transition-all hover:bg-indigo-500/10 hover:border-indigo-500/20 group">
                        <p className="text-5xl font-display font-black text-white mb-2">{college.eventCount || events.length}+</p>
                        <div className="flex items-center justify-center gap-3">
                            <span className="text-2xl">📅</span>
                            <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Events Hosted</p>
                        </div>
                    </div>

                    <div className="bg-[#1e293b]/50 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-8 text-center transition-all hover:bg-pink-500/10 hover:border-pink-500/20 group">
                        <p className="text-5xl font-display font-black text-white mb-2">{studentCount}+</p>
                        <div className="flex items-center justify-center gap-3">
                            <span className="text-2xl">👨‍🎓</span>
                            <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Students</p>
                        </div>
                    </div>
                </div>

                {/* Dynamic Scrolling Content Structure */}
                <div className="relative z-10 space-y-16">
                    
                    {/* 1. About Section */}
                    <section id="about" className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 md:p-12 rounded-3xl shadow-xl animate-fadeIn space-y-10">
                        <div>
                            <h3 className="text-2xl font-display font-bold text-white mb-6 flex items-center gap-3">
                                <span className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-lg border border-indigo-500/30">🏙️</span>
                                About This College
                            </h3>
                            <div className="text-slate-300 font-body leading-relaxed text-lg space-y-4">
                                {(college.description || 'Welcome to our institution.').split('\n').map((paragraph, idx) => (
                                    <p key={idx}>{paragraph}</p>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-10 border-t border-white/10">
                            <div className="bg-[#0f172a]/50 p-6 rounded-2xl border border-white/5">
                                <p className="text-slate-500 text-xs mb-2 uppercase tracking-widest font-black">Location</p>
                                <p className="text-white font-bold text-lg">📍 {college.location || 'N/A'}</p>
                            </div>
                            
                            {(college.affiliations && college.affiliations.length > 0) || college.affiliation ? (
                                <div className="bg-[#0f172a]/50 p-6 rounded-2xl border border-white/5">
                                    <p className="text-slate-500 text-xs mb-2 uppercase tracking-widest font-black">Affiliation</p>
                                    <div className="flex flex-wrap gap-2">
                                        {college.affiliations && college.affiliations.length > 0 ? (
                                            college.affiliations.map((affil, idx) => (
                                                <span key={idx} className="text-indigo-300 font-bold text-sm bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20">🏛️ {affil}</span>
                                            ))
                                        ) : (
                                            <span className="text-indigo-300 font-bold text-sm bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20">🏛️ {college.affiliation}</span>
                                        )}
                                    </div>
                                </div>
                            ) : null}

                            {college.type && (
                                <div className="bg-[#0f172a]/50 p-6 rounded-2xl border border-white/5">
                                    <p className="text-slate-500 text-xs mb-2 uppercase tracking-widest font-black">College Type</p>
                                    <p className="text-amber-400 font-bold text-lg flex items-center gap-2">
                                        <span className="text-xl">🎓</span> {college.type}
                                    </p>
                                </div>
                            )}

                            {college.establishedYear && (
                                <div className="bg-[#0f172a]/50 p-6 rounded-2xl border border-white/5">
                                    <p className="text-slate-500 text-xs mb-2 uppercase tracking-widest font-black">Established</p>
                                    <p className="text-orange-400 font-bold text-lg flex items-center gap-2">
                                        <span className="text-xl">⏳</span> {college.establishedYear}
                                    </p>
                                </div>
                            )}

                            {college.naacGrade && (
                                <div className="bg-[#0f172a]/50 p-6 rounded-2xl border border-white/5">
                                    <p className="text-slate-500 text-xs mb-2 uppercase tracking-widest font-black">NAAC Grade</p>
                                    <p className="text-emerald-400 font-bold text-lg flex items-center gap-2">
                                        <span className="text-xl">🏆</span> Grade {college.naacGrade}
                                    </p>
                                </div>
                            )}

                            <div className="bg-[#0f172a]/50 p-6 rounded-2xl border border-white/5">
                                <p className="text-slate-500 text-xs mb-2 uppercase tracking-widest font-black">Platform Status</p>
                                <p className="text-emerald-400 font-bold text-lg flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse"></span> Active
                                </p>
                            </div>
                            
                            <div className="bg-[#0f172a]/50 p-6 rounded-2xl border border-white/5">
                                <p className="text-slate-500 text-xs mb-2 uppercase tracking-widest font-black">Website</p>
                                {college.website ? (
                                    <a href={college.website} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 font-bold text-lg truncate flex items-center gap-2 group">
                                        Visit Link <span className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">↗</span>
                                    </a>
                                ) : (
                                    <p className="text-slate-400 font-bold text-lg">N/A</p>
                                )}
                            </div>
                        </div>

                        {/* Contact & Social Section */}
                        {(college.contactEmail || college.phone || college.facebook || college.instagram || college.twitter || college.linkedin) && (
                            <div className="pt-8 border-t border-white/10">
                                <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">Contact & Connect</h4>
                                <div className="flex flex-wrap gap-4">
                                    {college.contactEmail && (
                                        <a href={`mailto:${college.contactEmail}`} className="flex items-center gap-2 bg-[#0f172a]/50 border border-white/5 px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:border-white/20 transition-all">
                                            <span>✉️</span> <span className="text-sm font-bold truncate max-w-[200px]">{college.contactEmail}</span>
                                        </a>
                                    )}
                                    {college.phone && (
                                        <a href={`tel:${college.phone}`} className="flex items-center gap-2 bg-[#0f172a]/50 border border-white/5 px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:border-white/20 transition-all">
                                            <span>📞</span> <span className="text-sm font-bold">{college.phone}</span>
                                        </a>
                                    )}
                                    {college.instagram && (
                                        <a href={college.instagram} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-pink-500/10 border border-pink-500/20 px-4 py-2 rounded-xl text-pink-400 hover:bg-pink-500/20 transition-all">
                                            📸 <span className="text-sm font-bold">Instagram</span>
                                        </a>
                                    )}
                                    {college.twitter && (
                                        <a href={college.twitter} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-sky-500/10 border border-sky-500/20 px-4 py-2 rounded-xl text-sky-400 hover:bg-sky-500/20 transition-all">
                                            🐦 <span className="text-sm font-bold">Twitter</span>
                                        </a>
                                    )}
                                    {college.linkedin && (
                                        <a href={college.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-xl text-blue-400 hover:bg-blue-500/20 transition-all">
                                            💼 <span className="text-sm font-bold">LinkedIn</span>
                                        </a>
                                    )}
                                    {college.facebook && (
                                        <a href={college.facebook} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-xl text-indigo-400 hover:bg-indigo-500/20 transition-all">
                                            📘 <span className="text-sm font-bold">Facebook</span>
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Gallery Section */}
                    {college.collegePhotos && college.collegePhotos.length > 0 && (
                        <section id="gallery" className="animate-fadeIn">
                            <div className="flex items-center justify-between mb-8 px-2">
                                <h3 className="text-2xl font-display font-bold text-white flex items-center gap-3">
                                    <span className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-lg border border-amber-500/30">🖼️</span>
                                    Campus Showcase
                                </h3>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {college.collegePhotos.map((photo, idx) => (
                                    <div key={idx} className="group relative aspect-square rounded-3xl overflow-hidden border border-white/10 bg-white/5 shadow-2xl">
                                        <img 
                                            src={resolveUrl(photo.url)} 
                                            alt={photo.caption || "Campus"} 
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                        />
                                        {photo.caption && (
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                                                <p className="text-white text-xs font-bold uppercase tracking-wider italic">{photo.caption}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* 2. Events Section */}
                    <section id="events" className="animate-fadeIn">
                        <div className="flex items-center justify-between mb-8 px-2">
                            <h3 className="text-2xl font-display font-bold text-white flex items-center gap-3">
                                <span className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-lg border border-purple-500/30">📅</span>
                                Upcoming Events
                                <span className="bg-purple-500/20 text-purple-400 text-xs font-black px-3 py-1 rounded-lg ml-2">{events.length}</span>
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {events.length > 0 ? (
                                events.map(event => <EventCard key={event.id} event={event} />)
                            ) : (
                                <div className="col-span-full py-16 text-center bg-white/5 backdrop-blur-xl rounded-3xl border border-dashed border-white/20">
                                    <div className="text-6xl mb-6 opacity-50">📅</div>
                                    <h3 className="text-2xl font-display font-bold text-white mb-2">No upcoming events</h3>
                                    <p className="text-slate-400 text-lg">Currently no scheduled public events at this college.</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Past Events Section */}
                    {pastEvents.length > 0 && (
                        <section id="past-events" className="animate-fadeIn mt-16 pt-12 border-t border-white/5">
                            <div className="flex items-center justify-between mb-8 px-2">
                                <h3 className="text-2xl font-display font-bold text-slate-400 flex items-center gap-3">
                                    <span className="w-10 h-10 rounded-xl bg-slate-500/20 flex items-center justify-center text-lg border border-slate-500/30 grayscale">⏮️</span>
                                    Past Events
                                    <span className="bg-slate-500/20 text-slate-400 text-xs font-black px-3 py-1 rounded-lg ml-2">{pastEvents.length}</span>
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {(showAllPast ? pastEvents : pastEvents.slice(0, 3)).map(event => (
                                    <div key={event.id} className="opacity-80 hover:opacity-100 transition-opacity grayscale hover:grayscale-0">
                                        <EventCard event={event} showAll={true} />
                                    </div>
                                ))}
                            </div>
                            
                            {pastEvents.length > 3 && (
                                <div className="mt-10 flex justify-center">
                                    <button 
                                        onClick={() => setShowAllPast(!showAllPast)}
                                        className="px-8 py-3 rounded-full bg-slate-800/50 hover:bg-slate-700/80 text-slate-300 font-bold text-sm border border-slate-600/50 transition-all hover:-translate-y-1"
                                    >
                                        {showAllPast ? 'Show Less' : `View All Past Events (${pastEvents.length})`}
                                    </button>
                                </div>
                            )}
                        </section>
                    )}

                    {/* 3. Clubs Section */}
                    <section id="clubs" className="animate-fadeIn pb-12">
                        <div className="flex items-center justify-between mb-8 px-2">
                            <h3 className="text-2xl font-display font-bold text-white flex items-center gap-3">
                                <span className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-lg border border-indigo-500/30">👥</span>
                                Explore Clubs
                                <span className="bg-indigo-500/20 text-indigo-400 text-xs font-black px-3 py-1 rounded-lg ml-2">{clubs.length}</span>
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {clubs.length > 0 ? (
                                clubs.map(club => <ClubCard key={club.id} club={club} />)
                            ) : (
                                <div className="col-span-full py-16 text-center bg-white/5 backdrop-blur-xl rounded-3xl border border-dashed border-white/20">
                                    <div className="text-6xl mb-6 opacity-50">🎪</div>
                                    <h3 className="text-2xl font-display font-bold text-white mb-2">No clubs yet</h3>
                                    <p className="text-slate-400 text-lg">This college hasn't added any public clubs to the platform.</p>
                                </div>
                            )}
                        </div>
                    </section>

                </div>

            </div>
            {/* Premium Footer */}
            <Footer />
        </div>
    );
}
