import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import EventCard from '../components/EventCard';
import CollegeCard from '../components/CollegeCard';
import LoadingSpinner from '../components/LoadingSpinner';
import RegisterEventModal from '../components/modals/RegisterEventModal';
import TeamRegisterModal from '../components/modals/TeamRegisterModal';

export default function HomePage() {
    const [stats, setStats] = useState({ colleges: 0, events: 0, users: 0, clubs: 0 });
    const [latestEvents, setLatestEvents] = useState([]);
    const [topColleges, setTopColleges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [myRegistrations, setMyRegistrations] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showTeamModal, setShowTeamModal] = useState(false);
    const { user, loading: authLoading } = useAuth();

    const fetchHomeData = async () => {
        try {
            const [statsRes, eventsRes, collegesRes] = await Promise.all([
                api.get('/api/public/stats'),
                api.get('/api/public/events?limit=6'),
                api.get('/api/public/colleges?limit=3')
            ]);
            
            setStats({
                colleges: statsRes.data.totalColleges || 0,
                events: statsRes.data.totalEvents || 0,
                users: statsRes.data.totalStudents || 0,
                clubs: statsRes.data.totalClubs || 0
            });

            let allEvents = Array.isArray(eventsRes.data) ? eventsRes.data : (eventsRes.data.events || []);

            // If student, get their college events too
            if (user && user.role === 'STUDENT') {
                try {
                    const { data: studentEventsRes } = await api.get('/api/student/events');
                    const studentEvents = Array.isArray(studentEventsRes) ? studentEventsRes : (studentEventsRes.events || []);
                    
                    // Merge and deduplicate
                    const merged = [
                        ...studentEvents,
                        ...allEvents.filter(e => !studentEvents.some(se => se.id === e.id))
                    ];
                    allEvents = merged.slice(0, 6); // Keep top 6
                } catch (e) {
                    console.error("Student events fetch error", e);
                }
            }
            
            // Filter only UPCOMING and ONGOING + Not Expired
            const now = new Date();
            const upcoming = allEvents.filter(e => {
                if (!["UPCOMING", "ONGOING"].includes(e.status)) return false;
                const endStr = e.endDate || e.eventDate;
                const endDateTime = new Date(`${endStr}T${e.endTime || '23:59:59'}`);
                return endDateTime > now;
            });
            setLatestEvents(upcoming);
            setTopColleges(Array.isArray(collegesRes.data) ? collegesRes.data : (collegesRes.data.colleges || []));

            // Fetch registrations if logged in
            if (user && user.role === 'STUDENT') {
                try {
                    const { data: regData } = await api.get("/api/student/registrations");
                    setMyRegistrations(Array.isArray(regData) ? regData : (regData.registrations || []));
                } catch (e) { }
            }
        } catch (err) {
            console.error("Failed to load home data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading) {
            fetchHomeData();
            // Refresh every 60 seconds
            const interval = setInterval(fetchHomeData, 60000);
            return () => clearInterval(interval);
        }
    }, [authLoading]);

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-24 pb-12 pt-16 relative">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none -z-10" />
            
            {/* Hero Section */}
            <section className="text-center py-20 px-4 relative">
                <div className="inline-block relative mb-6">
                    <span className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20" />
                    <span className="relative text-xs font-bold tracking-widest text-indigo-300 uppercase px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 backdrop-blur-md">
                        The #1 Platform for Campus Life
                    </span>
                </div>
                
                <h1 className="text-5xl md:text-7xl font-display font-bold text-white tracking-tight mb-8 leading-tight">
                    The Ultimate <br className="hidden md:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">College Event Hub</span>
                </h1>
                
                <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-12 leading-relaxed font-body">
                    Discover, register, and manage campus events seamlessly. Join clubs, participate in competitions, and elevate your college experience.
                </p>

                <div className="relative max-w-2xl mx-auto mb-12 text-left group">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity duration-300" />
                    <div className="relative flex items-center bg-[#0f172a]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl transition-all duration-300 focus-within:border-indigo-500/50">
                        <span className="pl-4 pr-2 text-slate-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </span>
                        <input
                            type="text"
                            placeholder="Search colleges and events..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-transparent text-white placeholder-slate-500 outline-none px-2 py-3 text-lg font-body"
                        />
                        <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-indigo-500/25 hidden sm:block">
                            Search
                        </button>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
                    <Link to="/events" className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-lg hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transition-all duration-300 hover:-translate-y-1">
                        Explore Events
                    </Link>
                    <Link to="/colleges" className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white/5 text-white font-bold text-lg hover:bg-white/10 border border-white/10 transition-all duration-300 backdrop-blur-md">
                        Browse Colleges
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-24 max-w-4xl mx-auto">
                    {[
                        { label: 'Total Events', value: stats.events, icon: '🎉', color: 'from-indigo-500 to-blue-500' },
                        { label: 'Colleges', value: stats.colleges, icon: '🏛️', color: 'from-purple-500 to-pink-500' },
                        { label: 'Active Clubs', value: stats.clubs, icon: '👥', color: 'from-emerald-500 to-teal-500' },
                    ].map((stat, idx) => (
                        <div key={idx} className="relative group p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 transition-all duration-300 overflow-hidden">
                            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} rounded-full blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity`} />
                            <div className="text-4xl mb-4 relative z-10">{stat.icon}</div>
                            <p className="text-5xl font-display font-bold text-white mb-2 relative z-10">
                                {stat.value}<span className="text-indigo-400 ml-1">+</span>
                            </p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest relative z-10">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Featured Events */}
            <section className="relative">
                <div className="flex flex-col md:flex-row items-end justify-between mb-10 gap-4">
                    <div>
                        <h2 className="text-4xl font-display font-bold text-white mb-3 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-sm shadow-[0_0_15px_rgba(99,102,241,0.3)]">✨</span>
                            Featured Events
                        </h2>
                        <p className="text-slate-400 font-body text-lg">What's happening around campuses</p>
                    </div>
                    <Link to="/events" className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-bold group px-4 py-2 rounded-lg hover:bg-indigo-500/10 transition-colors">
                        View All Events
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </Link>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {latestEvents.filter(e => e.title.toLowerCase().includes(search.toLowerCase())).length > 0 ? (
                        latestEvents.filter(e => e.title.toLowerCase().includes(search.toLowerCase())).map(event => {
                            const registration = myRegistrations.find(r => r.event?.id === event.id);
                            return (
                                <EventCard 
                                    key={event.id} 
                                    event={event} 
                                    isRegistered={registration}
                                    onRegister={(e) => {
                                        const regType = (e.registrationType || 'INDIVIDUAL').toUpperCase();
                                        if (regType === 'TEAM') {
                                            setSelectedEvent(e);
                                            setShowTeamModal(true);
                                        } else {
                                            setSelectedEvent(e);
                                            setShowTeamModal(false);
                                        }
                                    }}
                                />
                            );
                        })
                    ) : (
                        <div className="col-span-full py-16 text-center text-slate-400 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md">
                            No upcoming events found.
                        </div>
                    )}
                </div>
            </section>

            {/* Top Colleges */}
            <section className="relative">
                <div className="flex items-end justify-between mb-10">
                    <div>
                        <h2 className="text-4xl font-display font-bold text-white mb-3 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-sm shadow-[0_0_15px_rgba(168,85,247,0.3)]">🏆</span>
                            Top Colleges
                        </h2>
                        <p className="text-slate-400 font-body text-lg">Most active institutions on the platform</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {topColleges.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).length > 0 ? (
                        topColleges.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).map(college => (
                            <CollegeCard key={college.id} college={college} />
                        ))
                    ) : (
                        <div className="col-span-full py-16 text-center text-slate-400 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md">
                            No colleges registered yet.
                        </div>
                    )}
                </div>
            </section>

            {/* Premium Footer */}
            <footer className="border-t border-white/10 pt-16 pb-8 mt-32 relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
                <div className="text-center">
                    <div className="flex justify-center items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/30">
                            E
                        </div>
                        <span className="text-2xl font-display font-bold text-white tracking-tight">EventHub</span>
                    </div>
                    <p className="text-slate-500 font-body">&copy; 2026 College Event Hub. Designed with premium aesthetics.</p>
                </div>
            </footer>
            {/* Registration Modals */}
            {selectedEvent && !showTeamModal && (
                <RegisterEventModal
                    isOpen={!!selectedEvent && !showTeamModal}
                    onClose={() => setSelectedEvent(null)}
                    event={selectedEvent}
                    onSuccess={(data) => {
                        setMyRegistrations(prev => [...prev, data.registration]);
                    }}
                />
            )}
            {selectedEvent && showTeamModal && (
                <TeamRegisterModal
                    isOpen={!!selectedEvent && showTeamModal}
                    onClose={() => {
                        setSelectedEvent(null);
                        setShowTeamModal(false);
                    }}
                    event={selectedEvent}
                    onSuccess={(data) => {
                        // Registration data for team is slightly different, but for UI we mark it
                        setMyRegistrations(prev => [...prev, { event: selectedEvent, status: 'PENDING', isTeam: true }]);
                    }}
                />
            )}
        </div>
    );
}
