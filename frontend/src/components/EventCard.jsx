import { useNavigate } from 'react-router-dom';
import { BACKEND_URL } from '../config';
import { useAuth } from '../context/AuthContext';

const categoryColors = {
    Technical: { bar: 'bg-blue-500', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    Sports: { bar: 'bg-green-500', badge: 'bg-green-500/20 text-green-300 border-green-500/30' },
    Cultural: { bar: 'bg-purple-500', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    Literary: { bar: 'bg-amber-500', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    Management: { bar: 'bg-cyan-500', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    Alumni: { bar: 'bg-rose-500', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
    Other: { bar: 'bg-slate-500', badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
};

const EventCard = ({ event, onRegister, onCancel, isRegistered, showAll = false }) => {
    const isActuallyCompleted = event?.status === 'COMPLETED';
    const isActuallyCancelled = event?.status === 'CANCELLED';

    const getTimeLabel = (e) => {
        if (!e.eventDate) return null;
        const today = new Date();
        today.setHours(0,0,0,0);
        const eventDate = new Date(e.eventDate);
        eventDate.setHours(0,0,0,0);
        const diffMs = eventDate - today;
        const diffDays = Math.ceil(diffMs / (1000*60*60*24));

        if (diffDays < 0)  return { label: "Completed", color: "text-slate-500" };
        if (diffDays === 0) return { label: "Today!", color: "text-green-400 font-bold" };
        if (diffDays === 1) return { label: "Tomorrow", color: "text-amber-400 font-bold" };
        if (diffDays <= 7)  return { label: `${diffDays} days left`, color: "text-indigo-400 font-bold" };
        return { label: new Date(e.eventDate).toLocaleDateString("en-IN", {day:"numeric",month:"short"}), color: "text-slate-400" };
    };

    // If showAll is false, only show UNCOMING/ONGOING (the original behavior)
    if (!showAll && !["UPCOMING", "ONGOING"].includes(event?.status)) {
        return null;
    }

    const navigate = useNavigate();
    const { user } = useAuth();
    const BASE = BACKEND_URL;
    const cat = categoryColors[event.category] || categoryColors.Other;

    const isUnlimited = event.maxParticipants === null || event.maxParticipants === undefined;
    const seatsLeft = isUnlimited ? Infinity : (event.maxParticipants - (event.currentRegistrations || 0));
    const isFull = !isUnlimited && seatsLeft <= 0;
    
    // Registration Status Logic: Open if status is valid and (deadline >= today OR no deadline fallback to eventDate)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Fallback deadline to event date if not provided
    const deadlineStr = event.registrationDeadline || event.eventDate;
    const deadline = deadlineStr ? new Date(deadlineStr) : null;
    if (deadline) deadline.setHours(23, 59, 59, 999);
    
    const statusUpper = (event.status || 'UPCOMING').toUpperCase();
    const isOngoing = statusUpper === 'ONGOING';
    
    // Registration Status Logic: Open if status is UPCOMING and deadline hasn't passed
    const isStatusOpen = ['UPCOMING', 'SCHEDULED', 'APPROVED'].includes(statusUpper);
    
    const isRegistrationClosed = !isStatusOpen || (deadline && deadline < today) || isOngoing;
    const isRegistrationOpen = !isRegistrationClosed && !isFull;

    const fillPct = !isUnlimited && event.maxParticipants > 0
        ? Math.min(100, Math.round(((event.currentRegistrations || 0) / event.maxParticipants) * 100))
        : 0;

    return (
        <div className={`group relative bg-[#1e293b]/40 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden hover:border-indigo-500/50 transition-all duration-500 ${!isActuallyCompleted && !isActuallyCancelled ? 'hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(99,102,241,0.15)]' : 'opacity-60 grayscale-[0.5]'} flex flex-col h-full z-10`}>
            {/* Background Glow Effect on Hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            {/* Banner */}
            <div className="relative h-56 bg-[#0f172a] overflow-hidden flex-shrink-0">
                {(() => {
                    const photoSrc = event.eventPhotos?.[0]
                        ? `${BASE}${event.eventPhotos[0]}`
                        : event.coverUrl ? `${BASE}${event.coverUrl}` : null;
                    return photoSrc ? (
                        <img
                            src={photoSrc}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                            alt="event cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/5 text-8xl font-black select-none font-display">
                            {event.title?.charAt(0)}
                        </div>
                    );
                })()}
                
                {/* Elegant Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/20 to-transparent" />

                {/* Scope Badge (Top Left) */}
                <div className="absolute top-5 left-5">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-lg">
                        <span className="text-sm">{event.eventScope === 'INTER' ? '🌐' : '🏫'}</span>
                        <span className="text-[10px] font-black tracking-widest uppercase text-white/90">
                            {event.eventScope === 'INTER' ? 'Inter-College' : 'Intra-College'}
                        </span>
                    </div>
                </div>
                
                {/* Registration Status Badge (Top Right) */}
                <div className="absolute top-5 right-5">
                    <div className={`px-4 py-1.5 rounded-full border backdrop-blur-md shadow-lg flex items-center gap-2 ${isRegistrationOpen ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-red-500/20 border-red-500/30 text-red-400'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isRegistrationOpen ? 'bg-emerald-400' : 'bg-red-400'}`} />
                        <span className="text-[10px] font-black tracking-widest uppercase">
                            {isRegistrationOpen ? 'Registration Open' : 'Registration Closed'}
                        </span>
                    </div>
                </div>

                {/* Category Floating Badge */}
                <div className="absolute bottom-5 left-5 flex gap-2">
                    <span className={`text-[10px] font-black tracking-widest uppercase px-4 py-2 rounded-xl border backdrop-blur-md shadow-xl ${cat.badge}`}>
                        {event.category}
                    </span>
                    {isActuallyCompleted && (
                        <span className="text-[10px] font-black tracking-widest uppercase px-4 py-2 rounded-xl border bg-slate-500/20 text-slate-300 border-slate-500/30 backdrop-blur-md shadow-xl">
                            Completed
                        </span>
                    )}
                    {isActuallyCancelled && (
                        <span className="text-[10px] font-black tracking-widest uppercase px-4 py-2 rounded-xl border bg-red-500/20 text-red-500 border-red-500/30 backdrop-blur-md shadow-xl">
                            Cancelled
                        </span>
                    )}
                </div>

                {/* Price/Fee Badge */}
                <div className="absolute bottom-5 right-5 translate-y-2 group-hover:translate-y-0 transition-all duration-500">
                    {event.registrationFee > 0 ? (
                        <div className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl backdrop-blur-xl bg-gradient-to-br from-indigo-600/90 to-purple-600/90 border border-white/20 shadow-2xl overflow-hidden group/fee">
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover/fee:translate-x-[100%] transition-transform duration-700" />
                            <span className="text-[8px] font-black text-white/60 uppercase tracking-tighter mb-0.5">Entry Fee</span>
                            <span className="text-sm font-black text-white">₹{event.registrationFee}</span>
                        </div>
                    ) : (
                        <div className="relative group/price">
                            {/* Animated Background Glow */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl blur opacity-40 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
                            
                            <div className="relative flex flex-col items-center justify-center w-16 h-16 rounded-2xl backdrop-blur-xl bg-slate-900/40 border border-emerald-400/50 shadow-2xl">
                                <span className="text-sm mb-0.5 group-hover:scale-110 transition-transform">🎁</span>
                                <span className="text-[10px] font-black bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">FREE</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="p-8 flex-1 flex flex-col relative z-10">
                <div className="mb-4">
                    <h3 className="text-white font-display font-bold text-2xl leading-tight line-clamp-2 mb-2 group-hover:text-indigo-400 transition-colors duration-300">
                        {event.title}
                    </h3>
                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black tracking-[0.1em] uppercase">
                        <span className="w-5 h-5 flex items-center justify-center rounded-lg bg-white/5 border border-white/10">🏛️</span>
                        <span className="truncate">
                            {event.clubName ? (
                                <>{event.clubName} <span className="mx-1 text-slate-600">·</span> {event.collegeName}</>
                            ) : event.collegeName}
                        </span>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                    <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-3 flex items-center gap-3">
                        <span className="text-xl">📅</span>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Date</p>
                            <div className="flex flex-col min-w-0">
                                <p className="text-xs font-bold text-white truncate text-ellipsis">
                                    {event.eventDate ? new Date(event.eventDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'TBD'}
                                </p>
                                {event.eventDate && getTimeLabel(event) && (
                                    <span className={`text-[10px] ${getTimeLabel(event).color}`}>
                                        {getTimeLabel(event).label}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-3 flex items-center gap-3">
                        <span className="text-xl">⏰</span>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Time</p>
                            <p className="text-xs font-bold text-white">{event.startTime || 'TBD'}</p>
                        </div>
                    </div>
                    <div className="col-span-2 bg-white/[0.03] border border-white/[0.05] rounded-2xl p-3 flex items-center gap-3">
                        <span className="text-xl">📍</span>
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Venue</p>
                            <p className="text-xs font-bold text-white truncate">{event.venue || 'To be announced'}</p>
                        </div>
                    </div>
                </div>

                {/* Progress / Capacity */}
                {!isUnlimited ? (
                    <div className="mb-8">
                        <div className="flex justify-between items-end mb-2.5">
                            <p className={`text-[10px] font-black uppercase tracking-widest ${isFull ? 'text-red-400' : 'text-emerald-400'}`}>
                                {isFull ? 'Sold Out' : `${seatsLeft} Spots Left`}
                            </p>
                            <p className="text-[10px] font-bold text-slate-500">
                                {event.currentRegistrations || 0} / {event.maxParticipants}
                            </p>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden p-[1px]">
                            <div 
                                className={`h-full rounded-full transition-all duration-1000 ease-out ${fillPct >= 90 ? 'bg-red-500' : fillPct >= 70 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                                style={{ width: `${fillPct}%` }}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="mb-8">
                        <div className="flex justify-between items-end mb-2.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                                ∞ Unlimited seats
                            </p>
                            <p className="text-[10px] font-bold text-slate-500">
                                {event.currentRegistrations || 0} Registered
                            </p>
                        </div>
                        <div className="h-1.5 bg-indigo-500/10 rounded-full overflow-hidden relative">
                             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent animate-shimmer" />
                        </div>
                    </div>
                )}
                {/* Buttons Area */}
                <div className="mt-auto pt-4 flex flex-col sm:flex-row gap-3 border-t border-white/[0.05]">
                    <button
                        onClick={() => navigate(`/events/${event.id}`)}
                        className="w-full sm:flex-1 bg-white/[0.05] hover:bg-white/[0.1] text-white text-xs font-black py-4 rounded-2xl transition-all border border-white/[0.05] uppercase tracking-widest text-center"
                    >
                        View Info
                    </button>
                    
                    {user?.role === "STUDENT" && !isActuallyCompleted && !isActuallyCancelled && (onRegister || isRegistered) && (
                        isRegistered ? (
                            <div className="w-full sm:flex-1 group/btn relative">
                                {(() => {
                                    const status = isRegistered.status;
                                    const hasScreenshot = !!(isRegistered.paymentScreenshotUrl || isRegistered.paymentScreenshot || isRegistered.leaderPaymentScreenshot);
                                    
                                    let btnLabel = '✓ Registration Confirmed';
                                    let btnColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

                                    if (status === 'REJECTED') {
                                        btnLabel = '✕ Rejected';
                                        btnColor = 'bg-red-500/10 text-red-400 border-red-500/20';
                                    } else if (status === 'PENDING' || status === 'AWAITING_PAYMENT') {
                                        btnLabel = hasScreenshot ? '✓ Registration Done' : '⏳ Payment Pending';
                                        btnColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                                    } else if (event?.registrationFee > 0) {
                                        btnLabel = '✓ Registration Confirmed';
                                    } else {
                                        btnLabel = '✓ Confirmed';
                                    }

                                    return (
                                        <button
                                            className={`w-full text-xs font-black py-4 rounded-2xl transition-all border uppercase tracking-widest ${btnColor} ${((status === 'PENDING' || status === 'AWAITING_PAYMENT') && !hasScreenshot) ? 'animate-pulse' : ''}`}
                                        >
                                            {btnLabel}
                                        </button>
                                    );
                                })()}
                                {isRegistered.status === 'REJECTED' && isRegistered.rejection_reason && (
                                    <div className="absolute bottom-full left-0 w-full mb-2 bg-red-900/90 backdrop-blur-md text-white text-[8px] p-2 rounded-lg opacity-0 group-hover/btn:opacity-100 transition-opacity border border-red-500/30 z-20 pointer-events-none">
                                        Reason: {isRegistered.rejection_reason}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={() => {
                                    if (!isRegistrationOpen) return;
                                    if (event.registrationType === 'TEAM') {
                                        navigate(`/events/${event.id}`);
                                    } else {
                                        onRegister(event);
                                    }
                                }}
                                disabled={!isRegistrationOpen}
                                className={`w-full sm:flex-1 text-xs font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-center ${
                                    isRegistrationOpen 
                                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:-translate-y-0.5' 
                                    : 'bg-white/5 text-slate-600 border border-white/[0.05] cursor-not-allowed'
                                }`}
                            >
                                {isFull ? 'Full' : isRegistrationClosed ? 'Closed' : (event.registrationType === 'TEAM' ? 'Join as Team' : 'Join Event')}
                            </button>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default EventCard;
