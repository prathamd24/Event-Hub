import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import { toast } from '../../components/Toast';
import EventCard from '../../components/EventCard';
import CreateEventModal from '../../components/modals/CreateEventModal';
import EditEventModal from '../../components/modals/EditEventModal';
import EventRegistrationsModal from '../../components/modals/EventRegistrationsModal';
import LoadingSpinner from '../../components/LoadingSpinner';

const FILTERS = ['ALL', 'UPCOMING', 'ONGOING', 'COMPLETED'];

export default function ClubEvents() {
    const { clubId } = useParams();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [regModalEvent, setRegModalEvent] = useState(null);
    const [eventFilter, setEventFilter] = useState('ALL');

    useEffect(() => { fetchEvents(); }, []);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/club/events');
            const data = res.data;
            setEvents(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch club events:", error);
            setEvents([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (eventId) => {
        if (!window.confirm('Delete this event?')) return;
        try {
            await api.delete(`/api/club/events/${eventId}`);
            toast('Event deleted', 'success');
            fetchEvents();
        } catch (error) {
            toast('Failed to delete event', 'error');
        }
    };

    const handleEdit = (event) => {
        if (event.status === 'COMPLETED' || event.status === 'CANCELLED') {
            toast('Cannot edit completed events', 'error');
            return;
        }
        setEditingEvent(event);
        setIsEditModalOpen(true);
    };

    const handleViewRegistrations = (event) => {
        setRegModalEvent(event);
    };

    const handleSuccess = () => {
        fetchEvents();
    };

    const filteredEvents = events.filter(e => {
        if (eventFilter === 'ALL') return true;
        return e.status === eventFilter;
    });

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6 animate-fadeIn pb-12 relative">
            <div className="fixed top-32 right-32 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
                <div>
                    <h1 className="text-3xl font-display font-black text-white italic uppercase tracking-tighter">Club Events</h1>
                    <p className="text-slate-400 text-sm mt-1 font-medium">Manage and monitor all your club's activities.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
                >
                    ➕ Create Club Event
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex bg-slate-800/50 p-1.5 rounded-2xl border border-slate-700/50 w-fit relative z-10">
                {FILTERS.map(f => (
                    <button
                        key={f}
                        onClick={() => setEventFilter(f)}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            eventFilter === f
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                                : 'text-slate-500 hover:text-white hover:bg-slate-700/50'
                        }`}
                    >
                        {f} {f !== 'ALL' ? '' : `(${events.length})`}
                    </button>
                ))}
            </div>

            {/* Event Cards Grid */}
            <div className="relative z-10">
                {filteredEvents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredEvents.map(event => (
                            <div key={event.id} className="relative group">
                                <EventCard event={event} showAll={true} />
                                {/* Action overlay */}
                                <div className="absolute top-4 right-4 z-20 flex gap-2">
                                    {event.status !== 'COMPLETED' && event.status !== 'CANCELLED' ? (
                                        <>
                                            <button
                                                onClick={() => handleEdit(event)}
                                                className="bg-black/60 backdrop-blur-md text-white border border-white/20 text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-500"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => handleDelete(event.id)}
                                                className="bg-black/60 backdrop-blur-md text-white border border-white/20 text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500"
                                            >
                                                🗑️
                                            </button>
                                        </>
                                    ) : (
                                        <div className="bg-black/40 backdrop-blur-md text-white/50 border border-white/10 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-xl">
                                            🔒 Locked
                                        </div>
                                    )}
                                    <button
                                        onClick={() => handleViewRegistrations(event)}
                                        className="bg-black/60 backdrop-blur-md text-white border border-white/20 text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-purple-500"
                                    >
                                        👥
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center bg-white/5 backdrop-blur-xl rounded-3xl border border-dashed border-white/10">
                        <div className="text-6xl mb-4 opacity-50">📅</div>
                        <h3 className="text-xl font-display font-bold text-white mb-2">No Events Found</h3>
                        <p className="text-slate-400">
                            {eventFilter === 'ALL'
                                ? 'Click "Create Club Event" to start organizing.'
                                : `No ${eventFilter.toLowerCase()} events found.`}
                        </p>
                    </div>
                )}
            </div>

            <CreateEventModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleSuccess}
                clubId={clubId}
            />
            <EditEventModal
                isOpen={isEditModalOpen}
                onClose={() => { setIsEditModalOpen(false); setEditingEvent(null); }}
                onSuccess={handleSuccess}
                initialData={editingEvent}
                apiPrefix="club"
                clubId={clubId}
            />
            {regModalEvent && (
                <EventRegistrationsModal
                    isOpen={!!regModalEvent}
                    onClose={() => setRegModalEvent(null)}
                    event={regModalEvent}
                    role="club"
                    clubId={clubId}
                />
            )}
        </div>
    );
}
