import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from '../../components/Toast';
import EventCard from '../../components/EventCard';
import CreateEventModal from '../../components/modals/CreateEventModal';
import EditEventModal from '../../components/modals/EditEventModal';
import EventRegistrationsModal from '../../components/modals/EventRegistrationsModal';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function CollegeAdminEvents() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [regModalEvent, setRegModalEvent] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [eventFilter, setEventFilter] = useState('UPCOMING'); // Default to UPCOMING

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/college-admin/events');
            const data = res.data;

            // Handle all possible response shapes safely:
            if (Array.isArray(data)) {
                setEvents(data);
            } else if (data && Array.isArray(data.events)) {
                setEvents(data.events);
            } else {
                setEvents([]);
            }
        } catch (error) {
            console.error("Failed to fetch events:", error);
            setEvents([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (eventId) => {
        if (!window.confirm('Delete this event?')) return;
        try {
            await api.delete(`/api/college-admin/events/${eventId}`);
            toast('Event deleted', 'success');
            fetchEvents();
        } catch (error) {
            toast('Failed to delete event', 'error');
        }
    };

    const handleEdit = (event) => {
        setEditingEvent(event);
        setIsEditModalOpen(true);
    };

    const handleSuccess = () => {
        fetchEvents();
    };

    const filteredEvents = (Array.isArray(events) ? events : [])
        .filter(e => {
            if (eventFilter === "ALL")       return true
            if (eventFilter === "COLLEGE")   return !e.clubId
            if (eventFilter === "CLUB")      return !!e.clubId
            if (eventFilter === "UPCOMING")  return e.status === "UPCOMING"
            if (eventFilter === "COMPLETED") return e.status === "COMPLETED"
            if (eventFilter === "CANCELLED") return e.status === "CANCELLED"
            return e.status === eventFilter
        });

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6 animate-fadeIn pb-12 relative">
            <div className="fixed top-32 right-32 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
                <div>
                    <h1 className="text-3xl font-display font-black text-white">College Events</h1>
                    <p className="text-slate-400 text-sm mt-1 font-medium">Manage events directly organized by the college (Board events).</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] flex items-center gap-2"
                >
                    ➕ Create College Event
                </button>
            </div>

            <div className="flex bg-slate-800/50 p-1.5 rounded-2xl border border-slate-700/50 w-fit relative z-10">
                <select 
                    value={eventFilter}
                    onChange={e => setEventFilter(e.target.value)}
                    className="bg-slate-800 text-slate-300 rounded-xl px-4 py-2 border border-slate-700 text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                >
                    <option value="UPCOMING">Upcoming</option>
                    <option value="ALL">All Events</option>
                    <option value="COLLEGE">College Events</option>
                    <option value="CLUB">Club Events</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                </select>
            </div>            <div className="space-y-12 relative z-10">
                <div className="space-y-6">
                    <h2 className="text-xl font-display font-black text-white/50 italic flex items-center gap-3">
                        <span className="w-12 h-[1px] bg-white/10" />
                        📡 {eventFilter === 'ALL' ? 'ALL HUB EVENTS' : `${eventFilter} EVENTS`}
                        <span className="bg-indigo-500/10 text-indigo-400 text-[10px] px-2 py-0.5 rounded-md font-black">
                            {filteredEvents.length}
                        </span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredEvents.map(event => (
                            <div key={event.id} className="relative group">
                                <div className={`absolute top-4 left-4 z-20 text-white text-[9px] font-black px-2 py-1 rounded-md shadow-xl uppercase tracking-wider ${event.clubId ? 'bg-purple-600' : 'bg-indigo-600'}`}>
                                    {event.clubId ? `🏛️ ${event.clubName}` : '🎓 College Event'}
                                </div>
                                <EventCard event={event} showAll={true} />
                                <div className="absolute top-4 right-4 z-20 flex gap-2">
                                    {event.status !== 'COMPLETED' ? (
                                        <>
                                            <button onClick={() => handleEdit(event)} className="bg-black/60 backdrop-blur-md text-white border border-white/20 text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-500">✏️</button>
                                            <button onClick={() => handleDelete(event.id)} className="bg-black/60 backdrop-blur-md text-white border border-white/20 text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500">🗑️</button>
                                        </>
                                    ) : (
                                        <div className="bg-black/40 backdrop-blur-md text-white/50 border border-white/10 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-xl">
                                            Locked
                                        </div>
                                    )}
                                    <button onClick={() => setRegModalEvent(event)} className="bg-black/60 backdrop-blur-md text-white border border-white/20 text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-purple-500">👥</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {filteredEvents.length === 0 && (
                     <div className="py-20 text-center bg-white/5 backdrop-blur-xl rounded-3xl border border-dashed border-white/10">
                        <div className="text-6xl mb-4 opacity-50">📅</div>
                        <h3 className="text-xl font-display font-bold text-white mb-2">No Events Found</h3>
                        <p className="text-slate-400 font-medium">No events match your current filter selection.</p>
                     </div>
                )}
            </div>

            <CreateEventModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleSuccess}
            />

            <EditEventModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setEditingEvent(null);
                }}
                onSuccess={handleSuccess}
                initialData={editingEvent}
            />

            {regModalEvent && (
                <EventRegistrationsModal
                    isOpen={!!regModalEvent}
                    onClose={() => setRegModalEvent(null)}
                    event={regModalEvent}
                    role="college"
                />
            )}
        </div>
    );
}
