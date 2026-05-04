import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { BACKEND_URL } from '../config';
import RegisterEventModal from '../components/modals/RegisterEventModal';
import TeamRegisterModal from '../components/modals/TeamRegisterModal';
import TeamStatusModal from '../components/modals/TeamStatusModal';
import Footer from '../components/Footer';

const BASE = BACKEND_URL;

export default function EventDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false);
    const [registrationData, setRegistrationData] = useState(null);
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [showTeamStatusModal, setShowTeamStatusModal] = useState(false);
    const [activePhoto, setActivePhoto] = useState(0);

    const fetchEventAndStatus = async () => {
        try {
            const res = await api.get(`/api/public/events/${id}`);
            setEvent(res.data);

            if (user?.role === 'STUDENT') {
                try {
                    const [regsRes, teamsRes] = await Promise.all([
                        api.get('/api/student/my-events'),
                        api.get('/api/team/my-teams')
                    ]);
                    
                    const myReg = (regsRes.data.registrations || []).find(r => r.event.id === parseInt(id));
                    const myTeam = (teamsRes.data.teams || []).find(t => t.eventId === parseInt(id));

                    if (myTeam && (res.data.registrationType === 'TEAM' || res.data.registrationType === 'MULTIPLE')) {
                        // Prioritize team status for team events
                        setIsRegistered(true);
                        setRegistrationData({ ...myTeam, isTeam: true });
                    } else if (myReg) {
                        setIsRegistered(true);
                        setRegistrationData(myReg);
                    } else if (myTeam) {
                        setIsRegistered(true);
                        setRegistrationData({ ...myTeam, isTeam: true });
                    }
                } catch (e) { }
            }
        } catch (error) {
            toast('Failed to load event details', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEventAndStatus();
        
        // Check for auto-open query param
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('openStatus') === 'true') {
            setShowTeamStatusModal(true);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [id, user]);

    const handleRegister = (type = 'INDIVIDUAL') => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (user.role !== 'STUDENT') {
            toast('Only students can register for events.', 'info');
            return;
        }

        if (type === 'TEAM') {
            setShowTeamModal(true);
        } else {
            setShowRegisterModal(true);
        }
    };

    const onRegistrationSuccess = (data) => {
        setIsRegistered(true);
        setRegistrationData(data.registration);
        setEvent({ ...event, currentRegistrations: (event.currentRegistrations || 0) + 1 });
    };

    if (loading) return <LoadingSpinner />;
    if (!event) return <div className="text-white text-center py-20 flex flex-col items-center">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-2xl font-display font-bold">Event not found</h2>
        <Link to="/events" className="mt-4 text-indigo-400 hover:text-indigo-300">Browse other events</Link>
    </div>;

    const isUnlimited = event.maxParticipants === null || event.maxParticipants === undefined;
    const remainingCount = isUnlimited ? Infinity : (event.maxParticipants - (event.currentRegistrations || 0));
    
    // Derived registration settings
    const regType = event?.registrationType || "INDIVIDUAL";
    const showIndiv = (regType === "INDIVIDUAL" || regType === "BOTH");
    const showTeam = (regType === "TEAM" || regType === "BOTH");
    const isTeamEvent = showTeam; 
    const isIndividualAllowed = showIndiv;
    
    // Registration Status Logic: Open if status is valid and (deadline >= today OR no deadline fallback to eventDate)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Fallback deadline to event date if not provided
    const deadlineStr = event.registrationDeadline || event.eventDate;
    const deadline = deadlineStr ? new Date(deadlineStr) : null;
    if (deadline) deadline.setHours(23, 59, 59, 999);
    
    const statusUpper = (event.status || 'UPCOMING').toUpperCase();
    const isStatusOpen = ['UPCOMING', 'SCHEDULED', 'APPROVED'].includes(statusUpper); // ONGOING excluded from registration
    
    const isRegistrationClosed = !isStatusOpen || (deadline && deadline < today);
    
    const isTeamsUnlimited = showTeam && (event.maxTeams === null || event.maxTeams === undefined || event.maxTeams === '');
    
    const isFull = isTeamEvent 
        ? (!isTeamsUnlimited && (event.currentTeams || 0) >= event.maxTeams)
        : (!isUnlimited && remainingCount <= 0);

    const isRegistrationOpen = !isRegistrationClosed && !isFull;

    const alreadyRegistered = isRegistered;
    const dateObj = new Date(event.eventDate);
    const fillPct = !isUnlimited ? Math.min(100, ((event.currentRegistrations || 0) / event.maxParticipants) * 100) : 0;

    const calculateDuration = () => {
        if (!event.eventDate || !event.startTime || !event.endTime) return null;
        try {
            const start = new Date(`${event.eventDate}T${event.startTime}`);
            const end = new Date(`${event.endDate || event.eventDate}T${event.endTime}`);
            const diffMs = end - start;
            if (diffMs <= 0) return null;
            const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            
            let str = "";
            if (diffHrs > 0) str += `${diffHrs} hr${diffHrs > 1 ? 's' : ''}`;
            if (diffMins > 0) str += ` ${diffMins} min${diffMins > 1 ? 's' : ''}`;
            return str.trim();
        } catch (e) { return null; }
    };
    const durationStr = calculateDuration();

    return (
        <div className="min-h-screen bg-[#0f172a] animate-fadeIn pb-24 relative">
            {/* Ambient Background Glows */}
            <div className="absolute top-96 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[150px] pointer-events-none" />
            <div className="absolute top-[800px] left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[150px] pointer-events-none" />

            {/* Immersive Header */}
            <div className="relative h-[60vh] min-h-[500px] w-full mt-0 overflow-hidden">
                {event.coverUrl ? (
                    <img 
                        src={`${BASE}${event.coverUrl}`} 
                        alt="Event Cover" 
                        className="w-full h-full object-cover" 
                        onError={e => e.target.style.display = 'none'}
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-slate-900" />
                )}
                
                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/80 to-transparent" />
                
                {/* Back Button */}
                <div className="absolute top-24 left-4 md:left-12 z-20">
                    <Link to="/events" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 transition-all font-medium text-sm">
                        <span>←</span> Back
                    </Link>
                </div>

                {/* Header Content */}
                <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 z-20 max-w-7xl mx-auto">
                    <div className="flex flex-wrap gap-3 mb-6">
                        <span className="px-4 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold tracking-widest uppercase backdrop-blur-md">
                            {event.category || 'General'}
                        </span>
                        <span className={`px-4 py-1.5 rounded-full border text-xs font-bold tracking-widest uppercase backdrop-blur-md ${
                            event.status === 'UPCOMING' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 
                            event.status === 'ONGOING' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 
                            'bg-slate-500/20 text-slate-400 border-slate-500/30'
                        }`}>
                            {event.status}
                        </span>
                        <span className="px-4 py-1.5 rounded-full bg-white/10 text-white border border-white/20 text-xs font-bold tracking-widest uppercase backdrop-blur-md flex items-center gap-2">
                             <span>{event.eventScope === 'INTER' ? '🌐' : '🏫'}</span>
                             {event.eventScope === 'INTER' ? 'Inter-College' : 'Intra-College'}
                        </span>
                        <span className="px-4 py-1.5 rounded-full bg-white/10 text-white border border-white/20 text-xs font-bold tracking-widest uppercase backdrop-blur-md flex items-center gap-2">
                             <span>{isTeamEvent ? '👥' : '👤'}</span>
                             {regType === 'BOTH' ? 'Indiv. & Team' : regType === 'TEAM' ? `Team (${event.teamMinSize}-${event.teamMaxSize})` : 'Individual Only'}
                        </span>
                    </div>
                    
                {/* Themes chips */}
                    {event.themes?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6">
                            {event.themes.map(tag => (
                                <span key={tag} className="px-3 py-1 rounded-full bg-white/10 text-white/70 border border-white/20 text-xs font-medium backdrop-blur-md">#{tag}</span>
                            ))}
                        </div>
                    )}
                    
                    <h1 className="text-5xl md:text-7xl font-display font-black text-white leading-tight mb-4 drop-shadow-2xl">
                        {event.title}
                    </h1>
                    
                    <div className="flex items-center gap-4 text-slate-300 font-medium">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5 shadow-lg shadow-indigo-500/20">
                            <div className="w-full h-full bg-[#0f172a] rounded-full flex items-center justify-center overflow-hidden">
                                {event.clubLogoUrl ? (
                                    <img src={`${BASE}${event.clubLogoUrl}`} className="w-full h-full object-cover" alt="host" />
                                ) : (
                                    <span className="text-xs font-bold">{event.organizedBy === 'CLUB' ? 'C' : 'U'}</span>
                                )}
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Organized by</p>
                            <div className="flex items-center gap-2 text-white font-bold">
                                {event.organizedBy === 'CLUB' ? (
                                    <>
                                        <Link to={`/clubs/${event.clubId}`} className="text-indigo-400 hover:text-indigo-300 hover:underline decoration-2 underline-offset-4 transition-all uppercase tracking-wide">{event.clubName}</Link>
                                        <span className="text-slate-600 text-xs">·</span>
                                        <Link to={`/colleges/${event.collegeId}`} className="text-slate-300 hover:text-white hover:underline decoration-2 underline-offset-4 transition-all uppercase tracking-wide">{event.collegeName}</Link>
                                    </>
                                ) : (
                                    <Link to={`/colleges/${event.collegeId}`} className="text-white hover:text-indigo-300 hover:underline decoration-2 underline-offset-4 transition-all uppercase tracking-wide">{event.collegeName}</Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto px-4 md:px-12 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12 relative z-10">
                
                {/* Left Column - Details */}
                <div className="lg:col-span-2 space-y-12">
                    {/* About Section */}
                    <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[50px] group-hover:bg-indigo-500/20 transition-colors" />
                        <h2 className="text-2xl font-display font-bold text-white mb-6 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-sm border border-indigo-500/30">📝</span>
                            About the Event
                        </h2>
                        <div className="text-slate-300 font-body leading-relaxed space-y-4 text-lg">
                            {event.description.split('\n').map((paragraph, idx) => (
                                <p key={idx}>{paragraph}</p>
                            ))}
                        </div>
                    </section>

                    {/* Photo Gallery */}
                    {event.eventPhotos?.length > 0 && (
                        <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[50px] group-hover:bg-cyan-500/20 transition-colors" />
                            <h2 className="text-2xl font-display font-bold text-white mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-sm border border-cyan-500/30">📸</span>
                                Event Gallery
                                <span className="ml-auto text-xs text-slate-500 font-normal">{event.eventPhotos.length} photos</span>
                            </h2>
                            {/* Main large photo */}
                            <div className="rounded-2xl overflow-hidden mb-3 border border-white/10 shadow-xl" style={{maxHeight: '420px'}}>
                                <img
                                    src={`${BASE}${event.eventPhotos[activePhoto]}`}
                                    alt={`Event photo ${activePhoto + 1}`}
                                    className="w-full h-full object-cover transition-all duration-500"
                                    style={{maxHeight: '420px', objectFit: 'cover'}}
                                    onError={e => e.target.style.display='none'}
                                />
                            </div>
                            {/* Thumbnails */}
                            {event.eventPhotos.length > 1 && (
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {event.eventPhotos.map((url, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setActivePhoto(i)}
                                            className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                                                activePhoto === i ? 'border-indigo-400 scale-105 shadow-[0_0_12px_rgba(99,102,241,0.5)]' : 'border-white/10 hover:border-white/30'
                                            }`}
                                        >
                                            <img src={`${BASE}${url}`} alt={`Thumb ${i+1}`} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {/* Prizes Section */}
                    {event.prizes?.length > 0 && (
                        <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-[50px] group-hover:bg-amber-500/20 transition-colors" />
                            <h2 className="text-2xl font-display font-bold text-white mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-sm border border-amber-500/30">🏆</span>
                                Prizes & Rewards
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {event.prizes.map((prize, i) => (
                                    <div key={i} className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-2xl p-5 text-center relative overflow-hidden">
                                        <div className="text-3xl mb-2">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏅'}</div>
                                        <p className="text-amber-300 font-bold text-sm uppercase tracking-wider">{prize.position}</p>
                                        {prize.amount && <p className="text-white font-black text-2xl mt-1">{prize.amount}</p>}
                                        {prize.description && <p className="text-slate-400 text-xs mt-1.5 font-medium">{prize.description}</p>}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Topics/Themes Section */}
                    {event.topics?.length > 0 && (
                        <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-[50px] group-hover:bg-teal-500/20 transition-colors" />
                            <h2 className="text-2xl font-display font-bold text-white mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center text-sm border border-teal-500/30">📚</span>
                                Topics Covered
                            </h2>
                            <div className="flex flex-wrap gap-3">
                                {event.topics.map((topic, i) => (
                                    <span key={i} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-teal-300 font-medium tracking-wide">
                                        {topic}
                                    </span>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Highlights Section */}
                    {event.highlights?.length > 0 && (
                        <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-[50px] group-hover:bg-yellow-500/20 transition-colors" />
                            <h2 className="text-2xl font-display font-bold text-white mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center text-sm border border-yellow-500/30">🌟</span>
                                Key Highlights
                            </h2>
                            <ul className="space-y-4">
                                {event.highlights.map((highlight, i) => (
                                    <li key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-[#0f172a]/40 border border-white/5 shadow-inner">
                                        <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0 border border-yellow-500/30 text-yellow-500 font-bold">
                                            {i + 1}
                                        </div>
                                        <p className="text-slate-300 font-body leading-relaxed mt-1">
                                            {highlight}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {/* Guests & Judges Section */}
                    {(event.chiefGuests?.length > 0 || event.judges?.length > 0) && (
                        <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-[50px] group-hover:bg-rose-500/20 transition-colors" />
                            <h2 className="text-2xl font-display font-bold text-white mb-8 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center text-sm border border-rose-500/30">🎤</span>
                                Guests & Panel
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {event.chiefGuests?.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-white/10 pb-4">
                                            Chief Guests
                                        </h3>
                                        <div className="space-y-4">
                                            {event.chiefGuests.map((guest, i) => (
                                                <div key={i} className="flex gap-4 items-center bg-[#0f172a]/60 p-4 rounded-2xl border border-white/5">
                                                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-xl shrink-0">
                                                        👔
                                                    </div>
                                                    <div>
                                                        <h4 className="text-white font-bold">{guest.name}</h4>
                                                        {guest.role && <p className="text-indigo-300 text-xs uppercase tracking-wider font-bold mt-1">{guest.role}</p>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {event.judges?.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-white/10 pb-4">
                                            Distinguished Judges
                                        </h3>
                                        <div className="space-y-4">
                                            {event.judges.map((judge, i) => (
                                                <div key={i} className="flex gap-4 items-center bg-[#0f172a]/60 p-4 rounded-2xl border border-white/5">
                                                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-xl shrink-0">
                                                        ⚖️
                                                    </div>
                                                    <div>
                                                        <h4 className="text-white font-bold">{judge.name}</h4>
                                                        {judge.expertise && <p className="text-rose-300 text-xs uppercase tracking-wider font-bold mt-1">{judge.expertise}</p>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Schedule & Agenda (Timeline) */}
                    <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[50px] group-hover:bg-purple-500/20 transition-colors" />
                        <h2 className="text-2xl font-display font-bold text-white mb-8 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-sm border border-purple-500/30">📅</span>
                            Schedule & Agenda
                        </h2>
                        
                        <div className="relative border-l-2 border-indigo-500/30 ml-4 py-2 space-y-10">
                            {/* Dummy Timeline Item 1 */}
                            <div className="relative pl-8">
                                <div className="absolute w-4 h-4 bg-indigo-500 rounded-full -left-[9px] top-1.5 shadow-[0_0_15px_rgba(99,102,241,0.6)]" />
                                <h3 className="text-xl font-bold text-white mb-1">Registration Opens</h3>
                                <p className="text-indigo-400 font-bold text-sm mb-2">{event.startTime}</p>
                                <p className="text-slate-400 font-body">Participants arrive and register at the reception desk.</p>
                            </div>
                            
                            {/* Dummy Timeline Item 2 */}
                            <div className="relative pl-8">
                                <div className="absolute w-4 h-4 bg-slate-700 border-2 border-indigo-500 rounded-full -left-[9px] top-1.5" />
                                <h3 className="text-xl font-bold text-white mb-1">Main Event Details</h3>
                                <p className="text-indigo-400 font-bold text-sm mb-2">Throughout the day</p>
                                <p className="text-slate-400 font-body">Detailed agenda to be announced during orientation.</p>
                            </div>

                            {/* Dummy Timeline Item 3 */}
                            <div className="relative pl-8">
                                <div className="absolute w-4 h-4 bg-slate-700 border-2 border-indigo-500 rounded-full -left-[9px] top-1.5" />
                                <h3 className="text-xl font-bold text-white mb-1">Event Concludes</h3>
                                <p className="text-white font-bold">{event.startTime} - {event.endTime}</p>
                                <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mt-1">
                                    Timing {durationStr && <span className="text-indigo-400 ml-1">({durationStr})</span>}
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Rules & Guidelines */}
                    {event.rules && (
                        <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-[50px] group-hover:bg-pink-500/20 transition-colors" />
                            <h2 className="text-2xl font-display font-bold text-white mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center text-sm border border-pink-500/30">⚖️</span>
                                Rules & Guidelines
                            </h2>
                            <div className="bg-[#0f172a]/50 border border-white/5 rounded-2xl p-6">
                                <div className="text-slate-300 font-body leading-relaxed space-y-4">
                                    {event.rules?.split('\n').map((rule, idx) => (
                                        <div key={idx} className="flex gap-4">
                                            <span className="text-indigo-500 font-black mt-1">✓</span>
                                            <p>{rule}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}
                </div>

                {/* Right Column - Registration Sidebar */}
                <div className="lg:col-span-1">
                    <div className="sticky top-28 space-y-6">
                        
                        {/* Interactive Registration Card */}
                        <div className="bg-gradient-to-br from-[#1e293b]/90 to-[#0f172a]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
                            {/* Inner Glow */}
                            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
                            
                            <h3 className="text-xl font-body font-medium text-slate-400 mb-2">Ticket Price</h3>
                            <div className="text-5xl font-display font-black text-white mb-8 tracking-tight uppercase">
                                {event.registrationFee > 0 ? `₹${event.registrationFee}` : 'Free'}
                            </div>
                            {isTeamEvent ? (
                                <div className="mb-8 font-sans">
                                    <div className="flex justify-between items-end mb-3">
                                        <span className="text-slate-400 text-sm font-bold uppercase tracking-wider">Teams Joined</span>
                                        <span className="text-white font-black text-xl">
                                            {event.currentTeams || 0} 
                                            {!isTeamsUnlimited && <span className="text-slate-500 text-sm"> / {event.maxTeams}</span>}
                                        </span>
                                    </div>
                                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                                        {!isTeamsUnlimited ? (
                                            <div 
                                                className={`h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-indigo-600 to-purple-500`}
                                                style={{ width: `${Math.min(100, ((event.currentTeams || 0) / event.maxTeams) * 100)}%` }}
                                            />
                                        ) : (
                                            <div className="h-full bg-indigo-500/20 w-full animate-shimmer" />
                                        )}
                                    </div>
                                    <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                                        <span>👥</span> {event.teamMinSize}-{event.teamMaxSize} Person Team
                                    </div>
                                </div>
                            ) : isIndividualAllowed && !isUnlimited ? (
                                <div className="mb-8">
                                    <div className="flex justify-between items-end mb-3">
                                        <span className="text-slate-400 text-sm font-bold uppercase tracking-wider">Seats Filled</span>
                                        <span className="text-white font-black text-xl">{event.currentRegistrations || 0} <span className="text-slate-500 text-sm">/ {event.maxParticipants}</span></span>
                                    </div>
                                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden ${fillPct >= 90 ? 'bg-gradient-to-r from-red-600 to-red-400' : fillPct >= 60 ? 'bg-gradient-to-r from-amber-600 to-amber-400' : 'bg-gradient-to-r from-indigo-600 to-purple-500'}`}
                                            style={{ width: `${fillPct}%` }}
                                        >
                                            <div className="absolute inset-0 bg-white/20 w-full h-full animate-[moveToRight_2s_ease-in-out_infinite]" style={{ transform: 'skewX(-20deg) translateX(-150%)' }} />
                                        </div>
                                    </div>
                                    {remainingCount <= 10 && remainingCount > 0 && (
                                        <p className="mt-2 text-amber-400 text-sm font-bold text-right animate-pulse">Only {remainingCount} seats left!</p>
                                    )}
                                </div>
                            ) : (
                                <div className="mb-8">
                                    <div className="flex justify-between items-end mb-3">
                                        <span className="text-slate-400 text-sm font-bold uppercase tracking-wider">Registration Status</span>
                                        <span className="text-white font-black text-xl flex items-center gap-2">
                                            <span className="text-indigo-400">∞</span> 
                                            <span className="text-xs uppercase tracking-tighter text-slate-500">Unlimited Capacity</span>
                                        </span>
                                    </div>
                                    {/* Hosted By section */}
                                    <div className="flex items-center gap-2 flex-wrap mb-4">
                                        <span className="text-slate-500 text-xs font-black uppercase tracking-widest">Hosted by</span>
                                        {event.clubId && event.clubName ? (
                                            <>
                                                <Link 
                                                    to={`/clubs/${event.clubId}`}
                                                    className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors group/host"
                                                >
                                                    {event.clubLogoUrl && (
                                                        <img 
                                                            src={`${BASE}${event.clubLogoUrl}`} 
                                                            alt={event.clubName}
                                                            className="w-6 h-6 rounded-full object-cover border border-white/10 group-hover/host:border-indigo-500/50"
                                                        />
                                                    )}
                                                    <span className="text-sm font-bold hover:underline">{event.clubName}</span>
                                                </Link>
                                                <span className="text-slate-600">·</span>
                                                <Link 
                                                    to={`/colleges/${event.collegeId}`}
                                                    className="text-slate-300 hover:text-white text-sm font-medium hover:underline transition-colors"
                                                >
                                                    {event.collegeName}
                                                </Link>
                                            </>
                                        ) : (
                                            <Link 
                                                to={`/colleges/${event.collegeId}`}
                                                className="text-slate-300 hover:text-white text-sm font-bold hover:underline transition-colors"
                                            >
                                                {event.collegeName}
                                            </Link>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 mb-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                                        {event.currentRegistrations || 0} registered
                                    </div>
                                    <div className="h-2 bg-indigo-500/10 rounded-full relative overflow-hidden ring-1 ring-white/5">
                                         <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent animate-shimmer" />
                                    </div>
                                </div>
                            )}

                                {isRegistered ? (
                                    <div className="space-y-4">
                                        {registrationData?.isTeam ? (
                                            /* Consolidated Team Action Button */
                                            <button 
                                                onClick={() => setShowTeamStatusModal(true)}
                                                className={`w-full py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] border transition-all flex flex-col items-center justify-center gap-2 shadow-2xl active:scale-95 group relative overflow-hidden ${
                                                    registrationData?.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                                                    registrationData?.status === 'COMPLETED' ? 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/20' :
                                                    'bg-gradient-to-br from-indigo-600 to-purple-600 text-white border-indigo-400 shadow-indigo-500/25'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xl">
                                                        {registrationData?.status === 'REJECTED' ? '✕' : 
                                                         registrationData?.status === 'COMPLETED' ? '🎉' : 
                                                         (registrationData?.status === 'PENDING') ? '⏳' : '💸'}
                                                    </span>
                                                    <span className="text-xs">
                                                        {registrationData?.status === 'REJECTED' ? 'Registration Rejected' : 
                                                         registrationData?.status === 'COMPLETED' ? 'Registration Done' : 
                                                         registrationData?.status === 'PENDING' ? 'Invites Sent — Tap to Manage' :
                                                         'Awaiting Team Payment'}
                                                    </span>
                                                </div>
                                                
                                                {(registrationData?.teamName || registrationData?.team_name) && (
                                                    <div className="text-[9px] opacity-80 bg-black/20 px-3 py-1 rounded-full border border-white/10">
                                                        TEAM: {registrationData.teamName || registrationData.team_name}
                                                    </div>
                                                )}

                                                {registrationData?.status !== 'COMPLETED' && registrationData?.status !== 'REJECTED' && (
                                                    <div className="absolute bottom-2 right-4 text-[10px] opacity-50 group-hover:translate-x-1 transition-transform">
                                                        Manage →
                                                    </div>
                                                )}
                                            </button>
                                        ) : (
                                            /* Individual Registration Status */
                                            <div 
                                                className={`w-full py-4 rounded-xl font-bold border flex flex-col justify-center items-center gap-1 cursor-default uppercase tracking-wider backdrop-blur-md transition-all ${
                                                    registrationData?.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                                                    (registrationData?.status === 'PENDING') ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                                                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {registrationData?.status === 'REJECTED' ? '✕ Registration Rejected' : 
                                                     (['VERIFIED', 'PAID', 'COMPLETED', 'CONFIRMED', 'FREE_REGISTERED'].includes(registrationData?.status)) ? (event.registrationFee === 0 ? '✓ Confirmed' : '✓ Registration Confirmed') :
                                                     '⌛ Awaiting Verification'}
                                                </div>
                                            </div>
                                        )}

                                        {registrationData?.status === 'REJECTED' && registrationData?.rejection_reason && (
                                            <p className="text-red-400 text-[10px] text-center font-bold px-2 italic">Reason: {registrationData.rejection_reason}</p>
                                        )}
                                    </div>
                                ) : (user && user.role !== 'STUDENT') ? (
                                    <div className="py-4 px-6 bg-slate-800/50 border border-slate-700/50 rounded-2xl text-center">
                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest italic">Viewing as Organizer</p>
                                        <p className="text-slate-500 text-[10px] mt-1">Registration is reserved for students only.</p>
                                    </div>
                                ) : isRegistrationClosed ? (
                                    <button disabled className="w-full py-4 rounded-xl bg-white/5 text-slate-400 font-bold border border-white/10 cursor-not-allowed uppercase tracking-wider">
                                        Registration Closed
                                    </button>
                                ) : (
                                    <div className="space-y-3">
                                        {showIndiv && !alreadyRegistered && !registrationData?.myTeamForEvent && (
                                            <button
                                                onClick={() => handleRegister('INDIVIDUAL')}
                                                disabled={registering || (!isUnlimited && remainingCount <= 0)}
                                                className={`w-full py-4 rounded-xl font-bold uppercase tracking-wider transition-all shadow-lg flex justify-center items-center gap-2 ${
                                                    !isUnlimited && remainingCount <= 0
                                                        ? 'bg-red-500/20 text-red-500 border border-red-500/30 cursor-not-allowed'
                                                        : 'bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 text-white shadow-indigo-500/25 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:-translate-y-0.5'
                                                }`}
                                            >
                                                {(!isUnlimited && remainingCount <= 0) ? 'Individual Sold Out' : '👤 Register as Individual'}
                                            </button>
                                        )}
                                        
                                        {showTeam && !alreadyRegistered && !registrationData?.myTeamForEvent && (
                                            <button
                                                onClick={() => handleRegister('TEAM')}
                                                disabled={registering || (!isTeamsUnlimited && (event.currentTeams || 0) >= event.maxTeams)}
                                                className={`w-full py-4 rounded-xl font-bold uppercase tracking-wider transition-all shadow-lg flex justify-center items-center gap-2 ${
                                                    !isTeamsUnlimited && (event.currentTeams || 0) >= event.maxTeams
                                                        ? 'bg-red-500/20 text-red-500 border border-red-500/30 cursor-not-allowed'
                                                        : 'bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white shadow-purple-500/25 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:-translate-y-0.5'
                                                }`}
                                            >
                                                {(!isTeamsUnlimited && (event.currentTeams || 0) >= event.maxTeams) ? 'Teams Full' : '👥 Register as Team'}
                                            </button>
                                        )}
                                    </div>
                                )}

                            <p className="text-center text-[10px] text-slate-500 mt-6 font-bold uppercase tracking-tighter italic">
                                {event.registrationDeadline 
                                    ? `Registration closes on ${new Date(event.registrationDeadline).toLocaleDateString()}`
                                    : "Registration stays open until the event starts"}
                            </p>
                        </div>

                        {/* Quick Info Sidebar */}
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Quick Info</h3>
                            
                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xl shrink-0">
                                        📅
                                    </div>
                                    <div>
                                        <p className="text-white font-bold">
                                            {new Date(event.eventDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        </p>
                                        {event.endDate && event.endDate !== event.eventDate && (
                                            <p className="text-indigo-400 text-xs font-semibold mt-0.5">
                                                → {new Date(event.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (Multi-day)
                                            </p>
                                        )}
                                        <p className="text-slate-400 text-sm mt-0.5">{event.startTime} - {event.endTime}</p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-xl shrink-0">
                                        📍
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-bold">Venue</p>
                                        <p className="text-slate-400 text-sm mt-0.5 truncate">{event.venue}</p>
                                        {event.venueMapLink && (
                                            <a 
                                                href={event.venueMapLink} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 mt-2 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-wider"
                                            >
                                                <span>📍</span> View on Maps
                                            </a>
                                        )}
                                    </div>
                                </div>

                                 <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-xl shrink-0">
                                        🎯
                                    </div>
                                    <div>
                                        <p className="text-white font-bold">Eligibility</p>
                                        <p className="text-slate-400 text-sm mt-0.5">{event.eligibilityCriteria}</p>
                                        {event.eligibility && (
                                            <p className="text-slate-500 text-xs mt-1 leading-relaxed">{event.eligibility}</p>
                                        )}
                                    </div>
                                </div>

                                {event.registrationFee > 0 && (
                                    <div className="pt-6 border-t border-white/5 space-y-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-sm">
                                                💳
                                            </div>
                                            <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest">Payment Info</h4>
                                        </div>
                                        <div className="bg-black/20 rounded-2xl p-4 border border-white/5 space-y-3">
                                            <div>
                                                <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-0.5 italic">UPI ID</p>
                                                <p className="text-white text-xs font-mono font-bold truncate">{event.upiId || 'Not Specified'}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-0.5 italic">A/C Name</p>
                                                <p className="text-white text-xs font-bold truncate">{event.upiName || 'Not Specified'}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {showRegisterModal && (
                <RegisterEventModal
                    isOpen={showRegisterModal}
                    onClose={() => setShowRegisterModal(false)}
                    event={event}
                    onSuccess={onRegistrationSuccess}
                />
            )}

            {showTeamModal && (
                <TeamRegisterModal
                    isOpen={showTeamModal}
                    onClose={() => setShowTeamModal(false)}
                    event={event}
                    onSuccess={onRegistrationSuccess}
                />
            )}

            {showTeamStatusModal && (
                <TeamStatusModal
                    isOpen={showTeamStatusModal}
                    onClose={() => setShowTeamStatusModal(false)}
                    teamId={registrationData?.teamId || registrationData?.id}
                    onUpdate={fetchEventAndStatus}
                />
            )}
            {/* Premium Footer */}
            <Footer />
        </div>
    );
}
