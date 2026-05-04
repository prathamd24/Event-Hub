import { useState, useEffect } from "react";
import api from "../../services/api";
import { toast } from "../../components/Toast";
import LoadingSpinner from "../../components/LoadingSpinner";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const timeAgo = (dateStr) => {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)    return "just now";
  if (mins < 60)   return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins/60)}h ago`;
  return `${Math.floor(mins/1440)}d ago`;
};

export default function StudentCoordinatorDashboard() {
    const { user, scClub } = useAuth();
    const [events, setEvents] = useState([]);
    const [volunteers, setVolunteers] = useState([]);
    const [coordinators, setCoordinators] = useState([]);
    const [broadcasts, setBroadcasts] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("events");
    const [eventTab, setEventTab] = useState("upcoming"); // Section 3A
    
    // Broadcast Form State
    const [broadcastMsg, setBroadcastMsg] = useState("");
    const [sending, setSending] = useState(false);
    
    // Volunteer Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [searching, setSearching] = useState(false);
    const [foundStudent, setFoundStudent] = useState(null);
    const [searchError, setSearchError] = useState("");

    useEffect(() => {
        fetchAll();
        const interval = setInterval(fetchAll, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [evRes, volRes, coRes, bcastRes] = await Promise.all([
                api.get('/api/sc/dashboard'),
                api.get('/api/sc/volunteers'),
                api.get('/api/sc/coordinators'),
                api.get('/api/sc/broadcasts')
            ]);
            setEvents(evRes.data.events || []);
            setVolunteers(volRes.data.roles || []);
            setCoordinators(coRes.data.roles || []);
            setBroadcasts(bcastRes.data.broadcasts || []);
        } catch (err) {
            toast("Failed to load dashboard data", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSearchStudent = async () => {
        if (!searchQuery.trim()) return;
        setSearching(true);
        setSearchError("");
        setFoundStudent(null);
        try {
            const res = await api.get(`/api/sc/search-student?q=${searchQuery}`);
            if (res.data.student && res.data.student.id === user.id) {
                setSearchError("You cannot assign yourself as a volunteer.");
                setFoundStudent(null);
                return;
            }
            setFoundStudent(res.data.student);
        } catch (err) {
            setSearchError(err.response?.data?.message || "Student not found");
        } finally {
            setSearching(false);
        }
    };

    const handleAssignVolunteer = async () => {
        if (!foundStudent) return;
        setSearching(true);
        try {
            await api.post('/api/sc/assign-volunteer', { studentId: foundStudent.id });
            toast("Volunteer assigned successfully!", "success");
            setFoundStudent(null);
            setSearchQuery("");
            // Refresh volunteers
            const res = await api.get('/api/sc/volunteers');
            setVolunteers(res.data.roles || []);
        } catch (err) {
            toast(err.response?.data?.message || "Failed to assign volunteer", "error");
        } finally {
            setSearching(false);
        }
    };

    const handleSendBroadcast = async () => {
        if (!broadcastMsg.trim()) return;
        setSending(true);
        try {
            await api.post('/api/sc/broadcast', { message: broadcastMsg });
            toast("Broadcast sent to all volunteers!", "success");
            setBroadcastMsg("");
            // Refresh history
            const res = await api.get('/api/sc/broadcasts');
            setBroadcasts(res.data.broadcasts || []);
        } catch (err) {
            toast("Failed to send broadcast", "error");
        } finally {
            setSending(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Synchronizing Club Data...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header section */}
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative bg-slate-900 border border-white/5 p-8 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
                    <div>
                        <h1 className="text-3xl font-display font-black text-white tracking-tighter italic uppercase">
                             Coordinator Panel
                        </h1>
                        <p className="text-indigo-400 mt-2 font-bold text-sm tracking-widest uppercase flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            {scClub?.name || "Student Coordinator"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 p-1.5 bg-slate-800/40 backdrop-blur-md rounded-[2rem] border border-white/5 w-full md:w-fit overflow-x-auto no-scrollbar">
                {[
                    { id: "events", label: "Assigned Events", icon: "📅" },
                    { id: "volunteers", label: "Volunteers", icon: "🙋" },
                    { id: "coordinators", label: "Team", icon: "👥" },
                    { id: "broadcasts", label: "Broadcasts", icon: "📢" },
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                            activeTab === tab.id 
                            ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 active:scale-95" 
                            : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                        }`}
                    >
                        <span>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Secret Content */}
            <div className="animate-fadeIn">
                {activeTab === "events" && (
                    <div>
                      {/* Section 3A — Past/Upcoming filter */}
                      <div className="flex gap-1 p-1 bg-slate-800/50 rounded-xl border border-slate-700/50 mb-4 w-fit">
                        <button onClick={() => setEventTab("upcoming")}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${eventTab==="upcoming" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}>
                          📅 Upcoming
                        </button>
                        <button onClick={() => setEventTab("past")}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${eventTab==="past" ? "bg-slate-600 text-white" : "text-slate-400 hover:text-white"}`}>
                          📜 Past
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {events
                          .filter(e => eventTab === "upcoming"
                            ? ["UPCOMING","ONGOING"].includes(e.status)
                            : e.status === "COMPLETED")
                          .map(event => (
                            <div key={event.id} className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-6 hover:border-indigo-500/30 hover:bg-slate-800/50 transition-all flex flex-col h-full group">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-xl shadow-inner">{event.icon || "📅"}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-bold truncate uppercase italic tracking-tight">{event.title}</p>
                                        <p className="text-indigo-400 text-[10px] font-black tracking-widest uppercase">{new Date(event.eventDate).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="space-y-3 mt-auto">
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-black/20">
                                        <span className="text-slate-500 text-[10px] uppercase font-bold">Venue</span>
                                        <span className="text-slate-300 text-[10px] font-bold truncate ml-4">{event.venue}</span>
                                    </div>
                                    <Link
                                        to={`/sc/events/${event.id}/manage`}
                                        className="w-full py-3 bg-white/5 hover:bg-white text-white hover:text-slate-950 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all text-center flex items-center justify-center gap-2 group-hover:scale-[1.02]"
                                    >
                                        View Details →
                                    </Link>
                                </div>
                            </div>
                          ))}
                        {events.filter(e => eventTab === "upcoming"
                          ? ["UPCOMING","ONGOING"].includes(e.status)
                          : e.status === "COMPLETED").length === 0 && (
                            <div className="col-span-full py-20 text-center bg-slate-900/40 rounded-[2.5rem] border border-dashed border-white/5 shadow-inner">
                                <div className="text-5xl mb-6 opacity-20">📅</div>
                                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
                                  {eventTab === "upcoming" ? "No upcoming events" : "No past events"}
                                </p>
                            </div>
                        )}
                      </div>
                    </div>
                )}

                {activeTab === "volunteers" && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Add Volunteer Section */}
                        <div className="lg:col-span-3 space-y-6">
                            <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-10 md:p-14 rounded-[3.5rem] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.6)] relative overflow-hidden group/search">
                                <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] -mr-20 -mt-20" />
                                
                                <div className="text-center space-y-3 mb-12">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-[1.5rem] bg-emerald-500/10 border border-emerald-500/20 text-xl mb-2 shadow-inner">👤</div>
                                    <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none">
                                        Volunteer Search
                                    </h3>
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">
                                        Recruitment Portal for {scClub?.name || "Club"}
                                    </p>
                                </div>

                                <div className="max-w-2xl mx-auto space-y-8">
                                    <div className="relative group/input">
                                        <div className="absolute -inset-1.5 bg-gradient-to-r from-emerald-500/30 to-teal-500/30 rounded-[2rem] blur opacity-0 group-focus-within/input:opacity-100 transition duration-700"></div>
                                        <div className="relative flex items-center bg-slate-800/50 border-2 border-slate-700/50 rounded-[1.8rem] p-2 transition-all group-focus-within/input:border-emerald-500/40 shadow-2xl">
                                            <div className="pl-6 text-slate-500">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                            </div>
                                            <input 
                                                type="text" 
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleSearchStudent()}
                                                placeholder="Enter Student Email or ID..."
                                                className="flex-1 bg-transparent border-none px-5 py-4 text-lg text-white font-bold italic outline-none placeholder:text-slate-600 placeholder:font-bold placeholder:italic"
                                            />
                                            <button 
                                                onClick={handleSearchStudent}
                                                disabled={searching || !searchQuery.trim()}
                                                className="h-14 px-8 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[1.4rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all disabled:opacity-50 shadow-xl active:scale-[0.97] flex items-center justify-center gap-3 overflow-hidden"
                                            >
                                                {searching ? (
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <span>SEARCH</span>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {searchError && (
                                        <div className="p-6 rounded-[2rem] bg-red-500/5 border border-red-500/20 flex gap-5 animate-in fade-in slide-in-from-top-4">
                                            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-xl shrink-0">⚠️</div>
                                            <div>
                                                <p className="text-red-400 text-[10px] font-black uppercase tracking-widest mb-1">Search Restriction</p>
                                                <p className="text-red-500/80 text-[11px] font-bold leading-relaxed">{searchError}</p>
                                            </div>
                                        </div>
                                    )}

                                    {foundStudent && (
                                        <div className="p-10 rounded-[2.8rem] bg-white/[0.02] border border-white/10 space-y-8 animate-in fade-in slide-in-from-bottom-6 shadow-3xl relative overflow-hidden group/result">
                                            <div className="absolute top-0 right-0 p-4">
                                                <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Match Found</span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-8">
                                                <div className="w-24 h-24 rounded-[2rem] bg-emerald-500/10 flex items-center justify-center text-4xl font-black text-emerald-400 border border-emerald-500/20 shadow-inner group-hover/result:scale-105 transition-transform duration-500">
                                                    {foundStudent.name[0]}
                                                </div>
                                                <div className="space-y-2">
                                                    <h4 className="text-2xl font-black text-white italic uppercase tracking-tighter">{foundStudent.name}</h4>
                                                    <div className="space-y-1">
                                                        <p className="text-slate-500 text-[11px] font-black uppercase tracking-widest opacity-80">{foundStudent.email}</p>
                                                        <p className="text-emerald-500/70 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                                            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                                            {foundStudent.college}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <button 
                                                onClick={handleAssignVolunteer}
                                                className="w-full py-6 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-[0.3em] rounded-[1.5rem] transition-all shadow-2xl shadow-emerald-900/40 active:scale-[0.98] border border-white/10"
                                            >
                                                CONFER VOLUNTEER ROLE
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* List Volunteers */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="bg-slate-900 border border-white/5 p-8 rounded-[2.5rem] shadow-xl">
                                <h3 className="text-white font-bold mb-6 italic uppercase tracking-tighter flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                    Active Volunteers ({volunteers.length})
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {volunteers.map(v => (
                                        <div key={v.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xs font-black text-slate-400">
                                                    {v.name?.[0] || "V"}
                                                </div>
                                                <div>
                                                    <p className="text-white text-xs font-bold uppercase italic tracking-tight">{v.name}</p>
                                                    <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">{v.email}</p>
                                                </div>
                                            </div>
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                        </div>
                                    ))}
                                    {volunteers.length === 0 && (
                                        <div className="col-span-full py-20 text-center border border-dashed border-white/5 rounded-[2rem]">
                                            <p className="text-slate-600 font-bold uppercase tracking-widest text-[10px]">No volunteers assigned yet</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "coordinators" && (
                     <div className="bg-slate-900 border border-white/5 p-8 rounded-[3rem] shadow-xl">
                        <h3 className="text-white font-bold mb-8 italic uppercase tracking-tighter flex items-center gap-3">
                             <span className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-sm">🛡️</span>
                             Leadership Team
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {coordinators.map(c => (
                                <div key={c.id} className="p-6 rounded-[2rem] bg-indigo-500/[0.03] border border-indigo-500/10 hover:border-indigo-500/30 transition-all group relative overflow-hidden">
                                     <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
                                     <div className="flex items-center gap-4 mb-4">
                                        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-xl font-black text-indigo-400 border border-indigo-500/20 shadow-inner">
                                            {c.name?.[0] || "SC"}
                                        </div>
                                        <div>
                                            <p className="text-white font-bold uppercase tracking-tight italic">{c.name}</p>
                                            <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mt-0.5">Coordinator</p>
                                        </div>
                                     </div>
                                     <div className="pt-4 border-t border-indigo-500/5">
                                         <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                                             <span className="w-1 h-1 rounded-full bg-slate-700" />
                                             {c.email}
                                         </p>
                                     </div>
                                </div>
                            ))}
                        </div>
                     </div>
                )}

                {activeTab === "broadcasts" && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Send New */}
                        <div className="lg:col-span-5 space-y-6">
                            <div className="bg-gradient-to-br from-indigo-600/10 to-purple-600/10 border border-indigo-500/20 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
                                <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-[80px]" />
                                <h3 className="text-white font-bold mb-6 italic uppercase tracking-tighter flex items-center gap-3">
                                    <span className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-lg">📢</span>
                                    New Official Message
                                </h3>
                                <div className="space-y-4 relative z-10">
                                    <textarea 
                                        value={broadcastMsg}
                                        onChange={e => setBroadcastMsg(e.target.value)}
                                        placeholder="Type your official announcement here..."
                                        rows={6}
                                        className="w-full bg-slate-900/60 border border-white/10 rounded-[2rem] px-6 py-5 text-white text-xs font-medium outline-none focus:border-indigo-500/50 transition-all resize-none shadow-inner placeholder:text-slate-600"
                                    />
                                    <button 
                                        onClick={handleSendBroadcast}
                                        disabled={sending || !broadcastMsg.trim()}
                                        className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-[0.25em] rounded-2xl transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {sending ? "TRANSMITTING..." : "DELIVER TO VOLUNTEERS"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* History */}
                        <div className="lg:col-span-7 space-y-4">
                            <div className="bg-slate-900 border border-white/5 p-8 rounded-[3rem] shadow-xl">
                                <h3 className="text-white font-bold mb-8 italic uppercase tracking-tighter flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                    Communication History
                                </h3>
                                <div className="space-y-4">
                                    {broadcasts.map(msg => (
                                        <div key={msg.id} className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-[10px] text-indigo-400 font-bold border border-indigo-500/10">📣</div>
                                                    <div>
                                                        <p className="text-white font-bold text-[10px] uppercase tracking-widest">{msg.senderName}</p>
                                                        <p className="text-slate-600 text-[8px] font-black uppercase tracking-[0.2em]">{timeAgo(msg.createdAt)}</p>
                                                    </div>
                                                </div>
                                                <div className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[8px] font-black uppercase tracking-widest border border-indigo-500/10">Broadcast</div>
                                            </div>
                                            <p className="text-slate-400 text-xs leading-relaxed font-medium italic">"{msg.message}"</p>
                                        </div>
                                    ))}
                                    {broadcasts.length === 0 && (
                                        <div className="py-20 text-center border border-dashed border-white/5 rounded-[2.5rem]">
                                            <p className="text-slate-600 font-bold uppercase tracking-widest text-[10px]">No broadcasts sent yet</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

