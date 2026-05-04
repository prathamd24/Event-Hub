import { useState, useEffect } from "react";
import api from "../../services/api";
import { toast } from "../../components/Toast";
import LoadingSpinner from "../../components/LoadingSpinner";
import { Link } from "react-router-dom";
import { BACKEND_URL } from "../../config";

const BASE = BACKEND_URL;

export default function StudentCoordinatorEvents() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                // Fetch assigned events for the student coordinator
                const res = await api.get('/api/sc/events');
                const allEvents = res.data || [];
                const activeEvents = allEvents.filter(e => ["UPCOMING", "ONGOING"].includes(e.status));
                setEvents(activeEvents);
            } catch (err) {
                toast('Failed to load your assigned events.', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-8 animate-fadeIn text-white">
            <h1 className="text-3xl font-display font-black tracking-tight mb-6">My Assigned Events</h1>
            {events.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center text-slate-400">
                    <p className="text-xl font-bold">No Events Assigned</p>
                    <p className="mt-2 text-sm">You currently have no events assigned to coordinate.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-7xl mx-auto">
                    {events.map((event) => (
                        <div key={event.id} className="group relative bg-[#1e293b]/50 backdrop-blur-xl border border-white/10 rounded-[2rem] p-5 md:p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/20 hover:border-indigo-500/30 overflow-hidden flex flex-col h-full">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[50px] group-hover:bg-indigo-500/20 transition-colors" />

                            <div className="relative z-10 flex gap-4 md:gap-6 w-full">
                                {/* Date / Thumbnail Block */}
                                <div className="shrink-0 w-20 md:w-28 flex flex-col">
                                    {event.coverUrl ? (
                                        <div className="w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-lg mb-3">
                                            <img
                                                src={`${BASE}${event.coverUrl}`}
                                                alt={event.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-full aspect-[4/5] rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex flex-col items-center justify-center p-2 mb-3 shadow-inner border border-white/5">
                                            <span className="text-2xl mb-1">📅</span>
                                            <span className="text-[10px] font-black uppercase text-indigo-300 tracking-wider text-center leading-tight">
                                                {new Date(event.eventDate).toLocaleDateString('en-US', { month: 'short' })}<br/>
                                                <span className="text-lg md:text-xl text-white">{new Date(event.eventDate).getDate()}</span>
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Content Block */}
                                <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-black uppercase tracking-widest leading-none">
                                                {event.category || 'General'}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-black uppercase tracking-widest leading-none ${
                                                event.status === 'UPCOMING' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                                event.status === 'ONGOING' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                                'bg-slate-500/20 text-slate-400 border-slate-500/30'
                                            }`}>
                                                {event.status}
                                            </span>
                                        </div>

                                        <h3 className="text-lg md:text-xl font-display font-black text-white leading-tight mb-1 group-hover:text-indigo-300 transition-colors line-clamp-2">
                                            {event.title}
                                        </h3>

                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] md:text-xs font-medium text-slate-400 uppercase tracking-wide mt-2">
                                            <span className="flex items-center gap-1.5"><span className="text-[10px]">⏰</span> {event.startTime} - {event.endTime}</span>
                                            <span className="flex items-center gap-1.5 truncate max-w-[150px]"><span className="text-[10px]">📍</span> {event.venue}</span>
                                        </div>
                                    </div>

                                    {/* Footer / Actions */}
                                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                            {event.currentRegistrations || 0} Registered
                                        </div>
                                        <Link
                                            to={`/sc/events/${event.id}/manage`}
                                            className="px-4 mt-2 md:mt-0 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider backdrop-blur-md transition-colors border border-white/10"
                                        >
                                            Manage Event →
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

