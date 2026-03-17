import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from '../../components/Toast';
import EventCard from '../../components/EventCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import RegisterEventModal from '../../components/modals/RegisterEventModal';
import TeamRegisterModal from '../../components/modals/TeamRegisterModal';

export default function StudentEvents() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [myRegistrations, setMyRegistrations] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showTeamModal, setShowTeamModal] = useState(false);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const [eventsRes, regsRes] = await Promise.all([
                api.get('/api/student/events'),
                api.get('/api/student/my-events')
            ]);
            const allEvents = eventsRes.data || [];
            const activeEvents = allEvents.filter(e => ["UPCOMING", "ONGOING"].includes(e.status));
            setEvents(activeEvents);
            setMyRegistrations(regsRes.data.registrations || []);
        } catch (error) {
            toast('Failed to load events', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterClick = (event) => {
        const regType = (event.registrationType || 'INDIVIDUAL').toUpperCase();
        if (regType === 'TEAM') {
            setSelectedEvent(event);
            setShowTeamModal(true);
        } else {
            setSelectedEvent(event);
            setShowTeamModal(false);
        }
    };

    const handleCancel = async (eventId) => {
        if (!window.confirm("Are you sure you want to cancel this registration?")) return;

        try {
            await api.delete(`/api/student/registrations/${eventId}`);
            toast('Registration cancelled successfully', 'success');
            fetchEvents();
        } catch (error) {
            toast('Failed to cancel registration', 'error');
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6 animate-fadeIn">
            <div>
                <h1 className="text-2xl font-bold text-white mb-2">College Events</h1>
                <p className="text-slate-400 text-sm">Discover and register for events happening in your college.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.length > 0 ? (
                    events.map(event => {
                        const registration = myRegistrations.find(r => r.event.id === event.id);
                        return (
                            <div key={event.id} className="relative group flex flex-col h-full">
                                <EventCard
                                    event={event}
                                    onRegister={handleRegisterClick}
                                    isRegistered={registration}
                                />

                                {registration && registration.status !== 'COMPLETED' && (
                                    <div className="absolute top-4 right-4 z-20">
                                        <button
                                            onClick={() => handleCancel(event.id)}
                                            className="bg-red-500/90 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 border border-white/20"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-full py-16 text-center text-slate-500 bg-[#1e293b] rounded-xl border border-slate-700">
                        <div className="text-4xl mb-4">🎫</div>
                        <h3 className="text-lg font-medium text-slate-300 mb-1">No Upcoming Events</h3>
                        <p>Your college currently has no upcoming events.</p>
                    </div>
                )}
            </div>
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
