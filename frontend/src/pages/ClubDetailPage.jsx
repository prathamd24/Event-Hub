import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import EventCard from '../components/EventCard';
import { BACKEND_URL } from '../config';

const BASE = BACKEND_URL;

export default function ClubDetailPage() {
    const { id } = useParams();
    const [club, setClub] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchClub = async () => {
            try {
                const res = await api.get(`/api/public/clubs/${id}`);
                setClub(res.data);
            } catch (error) {
                console.error("Failed to load club", error);
            } finally {
                setLoading(false);
            }
        };
        fetchClub();
    }, [id]);

    if (loading) return <LoadingSpinner />;
    if (!club) return (
        <div className="text-white text-center py-20 flex flex-col items-center">
            <div className="text-6xl mb-4">🎪</div>
            <h2 className="text-2xl font-display font-bold">Club not found</h2>
            <Link to="/" className="mt-4 text-indigo-400 hover:text-indigo-300">Back to home</Link>
        </div>
    );

    const resolveUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        return `${BASE}${url}`;
    };

    return (
        <div className="min-h-screen bg-[#0f172a] animate-fadeIn pb-24 relative overflow-x-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-[400px] right-[-100px] w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[150px] pointer-events-none" />
            <div className="absolute top-[800px] left-[-100px] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[150px] pointer-events-none" />

            {/* Immersive Banner Header */}
            <div className="relative h-[35vh] min-h-[300px] w-full">
                {(() => {
                    const bannerSrc = club.coverUrl
                        ? resolveUrl(club.coverUrl)
                        : club.clubPhotos?.[0] ? resolveUrl(club.clubPhotos[0]) : null;
                    return bannerSrc ? (
                        <img src={bannerSrc} alt="cover" className="w-full h-full object-cover" onError={e => e.target.style.display = 'none'} />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 relative overflow-hidden">
                            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '30px 30px' }}></div>
                        </div>
                    );
                })()}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/60 to-transparent"></div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 -mt-32 md:-mt-36">

                {/* Profile Header */}
                <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-end mb-10">
                    {/* Floating Logo */}
                    <div className="w-28 h-28 md:w-40 md:h-40 rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-600 p-1.5 shadow-[0_0_40px_rgba(168,85,247,0.3)] shrink-0 group relative overflow-hidden">
                        <div className="absolute inset-0 bg-white/20 animate-pulse group-hover:opacity-0 transition-opacity" />
                        <div className="w-full h-full bg-[#0f172a] rounded-[1.2rem] overflow-hidden flex items-center justify-center relative z-10">
                            {club.logoUrl ? (
                                <img src={resolveUrl(club.logoUrl)} alt="logo" className="w-full h-full object-cover bg-white" />
                            ) : (
                                <span className="text-5xl md:text-7xl font-display font-black text-transparent bg-clip-text bg-gradient-to-br from-purple-400 to-indigo-400">
                                    {club.name?.charAt(0)}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Title Area */}
                    <div className="flex-1 text-center md:text-left mb-2 md:mb-4">
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-3">
                            <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-bold px-4 py-1.5 rounded-full backdrop-blur-md">
                                {club.category}
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-black text-white tracking-tight drop-shadow-xl mb-3">
                            {club.name}
                        </h1>
                        <Link to={`/colleges/${club.collegeId}`} className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-md text-slate-300 hover:text-white hover:bg-white/10 transition-all font-medium">
                            <span className="text-lg">🏫</span> {club.collegeName}
                        </Link>
                    </div>
                </div>

                {/* Main Layout: Content + Sidebar */}
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* Left: Main Content */}
                    <div className="flex-1 min-w-0">

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 lg:grid-cols-2 gap-4 mb-10">
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative z-10">
                                    <p className="text-3xl font-display font-black text-white group-hover:text-indigo-400 transition-colors">{club.eventCount}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Events</p>
                                </div>
                            </div>
                        </div>

                        {/* About Section */}
                        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-xl mb-10">
                            <h3 className="text-xl font-display font-bold text-white mb-4 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-sm border border-purple-500/30">📝</span>
                                About
                            </h3>
                            <p className="text-slate-300 font-body leading-relaxed text-lg whitespace-pre-wrap">
                                {club.description || 'No description available.'}
                            </p>
                        </div>

                        {/* Events Section */}
                        <div className="mb-12">
                            <h3 className="text-xl font-display font-bold text-white mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-sm border border-indigo-500/30">📅</span>
                                Upcoming & Past Events
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {club.events?.length > 0 ? (
                                    club.events.map(event => <EventCard key={event.id} event={event} />)
                                ) : (
                                    <div className="col-span-full py-16 text-center bg-white/5 backdrop-blur-xl rounded-2xl border border-dashed border-white/10">
                                        <div className="text-4xl mb-4 opacity-30">🗓️</div>
                                        <p className="text-slate-400 font-medium tracking-wide">No events yet for this club.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Aesthetic Photo Gallery */}
                        {(() => {
                            const allPhotos = [
                                ...(club.clubPhotos || []),
                                ...(club.gallery || [])
                            ];
                            if (allPhotos.length === 0) return null;

                            return (
                                <div className="mb-12 animate-fadeIn">
                                    <h3 className="text-xl font-display font-bold text-white mb-6 flex items-center gap-3">
                                        <span className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center text-sm border border-pink-500/30">📸</span>
                                        Club Gallery
                                    </h3>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 auto-rows-[200px]">
                                        {allPhotos.map((url, index) => {
                                            // Make the first item large if there are enough photos, creating a dynamic masonry feel
                                            const isFeatured = index === 0 && allPhotos.length >= 3;
                                            
                                            return (
                                                <div 
                                                    key={index} 
                                                    className={`rounded-2xl overflow-hidden group relative border border-white/10 shadow-lg ${isFeatured ? 'col-span-2 row-span-2' : ''}`}
                                                >
                                                    <img 
                                                        src={resolveUrl(url)} 
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                                        alt="gallery" 
                                                        loading="lazy"
                                                    />
                                                    
                                                    {/* Vignette Overlay & Badges */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                                    
                                                    {isFeatured && club.clubPhotos?.length > 0 && (
                                                        <div className="absolute top-4 left-4 z-10 shadow-xl shadow-black/20">
                                                            <span className="text-[10px] bg-[#0f172a]/80 text-white backdrop-blur-md px-3 py-1.5 rounded-full font-bold uppercase tracking-widest border border-white/10">Featured Cover</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Right: Sticky Sidebar */}
                    <div className="lg:w-80 shrink-0">
                        <div className="sticky top-24 space-y-6">
                            {/* Coordinator Card */}
                            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-xl">
                                <h3 className="text-lg font-display font-bold text-white mb-6 flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-sm border border-purple-500/30">👤</span>
                                    Club Coordinator
                                </h3>
                                <div className="space-y-5">
                                    <div>
                                        <p className="text-slate-500 text-xs mb-1 uppercase tracking-widest font-black">Name</p>
                                        <p className="text-white font-bold text-lg">{club.coordinatorName}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-xs mb-1 uppercase tracking-widest font-black">Email</p>
                                        <p className="text-indigo-400 font-bold break-all">{club.coordinatorEmail}</p>
                                    </div>
                                    {club.instagram && (
                                        <div>
                                            <p className="text-slate-500 text-xs mb-1 uppercase tracking-widest font-black">Instagram</p>
                                            <a
                                                href={`https://instagram.com/${club.instagram.replace('@','')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-pink-400 font-bold hover:text-pink-300 transition-colors flex items-center gap-1"
                                            >
                                                📸 @{club.instagram.replace('@','')}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

