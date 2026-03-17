import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import EventCard from '../components/EventCard';
import LoadingSpinner from '../components/LoadingSpinner';
import RegisterEventModal from '../components/modals/RegisterEventModal';
import TeamRegisterModal from '../components/modals/TeamRegisterModal';

const CATEGORIES = ['', 'Technical', 'Sports', 'Cultural', 'Literary', 'Management', 'Alumni'];

export default function EventsPage() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [myRegistrations, setMyRegistrations] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showTeamModal, setShowTeamModal] = useState(false);
    const { user, loading: authLoading } = useAuth();

    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true);
            try {
                // Always start with public events
                const { data } = await api.get("/api/public/events");
                console.log("Events page raw response:", data);
                const allEvents = Array.isArray(data)
                    ? data
                    : (data.events || []);

                // If logged in as student, also get their college intra events
                // Get student's registrations if logged in
                if (user && user.role === "STUDENT") {
                    try {
                        const endpoint = user ? "/api/student/events" : "/api/public/events";
                        const { data: regData } = await api.get(endpoint);
                        setMyRegistrations(regData.registrations || []);

                        if (user.collegeId) {
                            try {
                                const { data: studentData } = await api.get("/api/student/events");
                                const studentEvents = Array.isArray(studentData)
                                    ? studentData
                                    : (studentData.events || []);
                                
                                // Merge and deduplicate by event id
                                const merged = [
                                    ...studentEvents,
                                    ...allEvents.filter(e => 
                                        !studentEvents.some(se => se.id === e.id)
                                    )
                                ];
                                // Filter only UPCOMING and ONGOING + Not Expired
                                const now = new Date();
                                const upcoming = merged.filter(e => {
                                    if (!["UPCOMING", "ONGOING"].includes(e.status)) return false;
                                    const endStr = e.endDate || e.eventDate;
                                    const endDateTime = new Date(`${endStr}T${e.endTime || '23:59:59'}`);
                                    return endDateTime > now;
                                });
                                setEvents(upcoming);
                            } catch {
                                const upcoming = allEvents.filter(e => ["UPCOMING", "ONGOING"].includes(e.status));
                                setEvents(upcoming);
                            }
                        } else {
                            const now = new Date();
                            const upcoming = allEvents.filter(e => {
                                if (!["UPCOMING", "ONGOING"].includes(e.status)) return false;
                                const endStr = e.endDate || e.eventDate;
                                const endDateTime = new Date(`${endStr}T${e.endTime || '23:59:59'}`);
                                return endDateTime > now;
                            });
                            setEvents(upcoming);
                        }
                    } catch {
                    const now = new Date();
                    const upcoming = allEvents.filter(e => {
                        if (!["UPCOMING", "ONGOING"].includes(e.status)) return false;
                        const endStr = e.endDate || e.eventDate;
                        const endDateTime = new Date(`${endStr}T${e.endTime || '23:59:59'}`);
                        return endDateTime > now;
                    });
                    setEvents(upcoming);
                    }
                } else {
                    const now = new Date();
                    const upcoming = allEvents.filter(e => {
                        if (!["UPCOMING", "ONGOING"].includes(e.status)) return false;
                        const endStr = e.endDate || e.eventDate;
                        const endDateTime = new Date(`${endStr}T${e.endTime || '23:59:59'}`);
                        return endDateTime > now;
                    });
                    setEvents(upcoming);
                }
            } catch (e) {
                console.error("Events page fetch error:", e);
                setEvents([]);
            } finally {
                setLoading(false);
            }
        };

        if (!authLoading) {
            fetchEvents();
        }
    }, [user, authLoading]);

    const filtered = events.filter(e => {
        const matchSearch = e.title.toLowerCase().includes(search.toLowerCase()) ||
            (e.venue || '').toLowerCase().includes(search.toLowerCase()) ||
            (e.collegeName || '').toLowerCase().includes(search.toLowerCase());
        const matchCategory = !category || e.category === category;
        return matchSearch && matchCategory;
    });

    return (
        <div className="space-y-12 pb-12 pt-12 relative min-h-screen">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-full max-w-2xl h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />

            <div className="text-center py-12 relative">
                <div className="inline-block relative mb-4">
                    <span className="absolute inset-0 bg-purple-500 blur-2xl opacity-20" />
                    <span className="relative text-xs font-bold tracking-widest text-purple-300 uppercase px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 backdrop-blur-md">
                        Explore
                    </span>
                </div>
                <h1 className="text-5xl md:text-6xl font-display font-bold text-white mb-6 tracking-tight">
                    Browse <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">Events</span>
                </h1>
                <p className="text-slate-400 font-body text-xl max-w-xl mx-auto">Discover upcoming events across all colleges. Join clubs, compete, and learn.</p>
            </div>

            {/* Glassmorphic Filter Bar */}
            <div className="max-w-4xl mx-auto bg-[#0f172a]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl relative z-20">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1 group">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl blur opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                        <div className="relative flex items-center bg-white/5 border border-white/10 rounded-xl hover:border-indigo-500/50 focus-within:border-indigo-500/70 transition-all duration-300">
                            <span className="pl-4 pr-3 text-slate-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            </span>
                            <input
                                type="text"
                                placeholder="Search events by title, venue..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full bg-transparent text-white placeholder-slate-500 outline-none py-3.5 pr-4 font-body"
                            />
                        </div>
                    </div>
                    
                    <div className="relative group sm:w-64">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="w-full relative bg-[#1e293b] text-white border border-white/10 rounded-xl px-4 py-3.5 appearance-none focus:outline-none focus:border-purple-500/70 hover:border-purple-500/50 transition-all duration-300 font-bold tracking-wide"
                        >
                            {CATEGORIES.map(c => (
                                <option key={c} value={c}>{c || 'All Categories'}</option>
                            ))}
                        </select>
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">▼</span>
                    </div>
                </div>
            </div>

            {loading ? (
                <LoadingSpinner />
            ) : filtered.length > 0 ? (
                <div className="relative">
                    <p className="text-indigo-300/80 font-bold uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                        {filtered.length} event{filtered.length !== 1 ? 's' : ''} found
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filtered.map(event => {
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
                        })}
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md max-w-2xl mx-auto shadow-2xl">
                    <div className="text-6xl mb-6 opacity-80">🔭</div>
                    <h3 className="text-2xl font-display font-bold text-white mb-3">No events found</h3>
                    <p className="text-slate-400 font-body text-lg">{search || category ? 'No events match your current filters.' : 'No upcoming events yet.'}</p>
                    

                </div>
            )}
            
            {/* Premium Footer */}
            <footer className="border-t border-white/10 pt-16 pb-8 mt-32 relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
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
                        setMyRegistrations(prev => [...prev, { event: selectedEvent, status: 'PENDING', isTeam: true }]);
                    }}
                />
            )}
        </div>
    );
}
