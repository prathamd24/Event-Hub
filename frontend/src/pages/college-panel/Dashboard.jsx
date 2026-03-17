import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import { toast } from '../../components/Toast';
import { BACKEND_URL } from '../../config';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import CreateClubModal from "../../components/modals/CreateClubModal";
import CreateEventModal from "../../components/modals/CreateEventModal";
import EditClubModal from "../../components/modals/EditClubModal";
import EditEventModal from "../../components/modals/EditEventModal";
import EventRegistrationsModal from "../../components/modals/EventRegistrationsModal";

// Shared Helpers
const timeAgo = (dateStr) => {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)    return "just now";
  if (mins < 60)   return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins/60)}h ago`;
  return `${Math.floor(mins/1440)}d ago`;
};

const COLORS = [
  "#6366f1","#8b5cf6","#ec4899","#f59e0b",
  "#10b981","#3b82f6","#ef4444","#14b8a6"
];

export default function CollegeAdminDashboard() {
  const [loading,            setLoading]            = useState(true)
  const [uploading,          setUploading]          = useState(false)
  const [activeTab,          setActiveTab]          = useState("overview")
  const [clubs,              setClubs]              = useState([])
  const [events,             setEvents]             = useState([])
  const [completedEvents,    setCompletedEvents]    = useState([])
  const [students,           setStudents]           = useState([])
  const [stats,              setStats]              = useState({})
  const [college,            setCollege]            = useState(null)
  const [clubSearch,         setClubSearch]         = useState("")
  const [eventFilter,        setEventFilter]        = useState("ALL")
  const [studentSearch,      setStudentSearch]      = useState("")
  const [studentFilter,      setStudentFilter]      = useState("ALL")
  const [monthlyData,        setMonthlyData]        = useState([])
  const [eventsByClub,       setEventsByClub]       = useState([])
  const [topEvents,          setTopEvents]          = useState([])
  const [recentActivity,     setRecentActivity]     = useState([])
  const [showCreateClub,     setShowCreateClub]     = useState(false)
  const [showCreateEvent,    setShowCreateEvent]    = useState(false)
  const [showEditClubModal,  setShowEditClubModal]  = useState(false)
  const [showEditEvent,      setShowEditEvent]      = useState(false)
  const [showClubEventsModal,setShowClubEventsModal]= useState(false)
  const [selectedClub,       setSelectedClub]       = useState(null)
  const [selectedEvent,      setSelectedEvent]      = useState(null)
  const [selectedClubEvents, setSelectedClubEvents] = useState([])
  const [showRegsModal,      setShowRegsModal]      = useState(false)

  // Fetch Core Data
  const fetchData = async () => {
    try {
      const { data } = await api.get("/api/college-admin/dashboard");
      setCollege(data.college || null);
      setClubs(Array.isArray(data.clubs)  ? data.clubs  : []);
      setEvents(Array.isArray(data.events)? data.events : []);
    } catch(e) {
      console.error("Dashboard core load error:", e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Detailed Stats
  const fetchStats = async () => {
    try {
      const { data } = await api.get("/api/college-admin/stats");
      setStats(data);
      setMonthlyData(data.monthlyRegistrations || []);
      setEventsByClub(data.eventsByClub || []);
      setTopEvents(data.topEvents || []);
      setRecentActivity(data.recentActivity || []);
    } catch(e) {
      console.error("Stats fetch failed:", e);
    }
  };

  // Fetch Students
  const fetchStudents = async () => {
    try {
      const { data } = await api.get("/api/college-admin/students");
      setStudents(Array.isArray(data.students) ? data.students : []);
    } catch(e) {
      console.error("Students fetch failed:", e);
    }
  };

  // Fetch History
  const fetchHistory = async () => {
    try {
      const { data } = await api.get("/api/college-admin/events?status=COMPLETED");
      setCompletedEvents(Array.isArray(data.events) ? data.events : []);
    } catch(e) {
      console.error("History fetch failed:", e);
    }
  };

  useEffect(() => {
    const refreshAll = () => {
      fetchData();
      fetchStats();
      if (activeTab === "students") fetchStudents();
      if (activeTab === "history")  fetchHistory();
    };

    refreshAll();
    const interval = setInterval(refreshAll, 10000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Handlers (to be integrated or preserved as needed)
  const handleEditClub = (club) => {
    setSelectedClub(club);
    setShowEditClubModal(true);
  };

  const handleViewClubEvents = async (club) => {
    setSelectedClub(club);
    try {
      const { data } = await api.get(`/api/college-admin/clubs/${club.id}/events`);
      setSelectedClubEvents(Array.isArray(data) ? data : (data.events || []));
      setShowClubEventsModal(true);
    } catch(e) {
      console.error("Failed to load club events", e);
      toast("Failed to load club events", "error");
    }
  };

  const handleDeleteClub = async (id) => {
    if (!window.confirm("Delete this club? This cannot be undone.")) return;
    try {
      await api.delete(`/api/college-admin/clubs/${id}`);
      toast("Club deleted", "success");
      fetchData();
      fetchStats();
    } catch (e) {
      toast("Failed to delete club", "error");
    }
  };

  const handleEditEvent = (event) => {
    setSelectedEvent(event);
    setShowEditEvent(true);
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm("Delete this event?")) return;
    try {
      await api.delete(`/api/college-admin/events/${id}`);
      toast("Event deleted", "success");
      fetchData();
      fetchStats();
    } catch (e) {
      toast("Failed to delete event", "error");
    }
  };

  const handleViewRegistrations = (event) => {
    setSelectedEvent(event);
    setShowRegsModal(true);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const formData = new FormData();
    files.forEach((f, i) => formData.append(`photo_${i}`, f));
    try {
      await api.post('/api/college-admin/gallery/upload', formData);
      toast("Photos uploaded", "success");
      fetchData();
    } catch (e) {
      toast("Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (idx) => {
    try {
      await api.delete(`/api/college-admin/gallery/${idx}`);
      toast("Photo deleted", "success");
      fetchData();
    } catch (e) {
      toast("Delete failed", "error");
    }
  };

  if (loading) return <LoadingSpinner />;

  // Stats Card data
  const statCards = [
    {
      label: "Students",
      value: stats.totalStudents ?? 0,
      icon: "👥",
      color: "from-blue-500/20 to-blue-600/10",
      border: "border-blue-500/30",
      text: "text-blue-400"
    },
    {
      label: "Clubs",
      value: stats.totalClubs ?? 0,
      icon: "🏛️",
      color: "from-violet-500/20 to-violet-600/10",
      border: "border-violet-500/30",
      text: "text-violet-400",
    },
    {
      label: "Total Events",
      value: stats.totalEvents ?? 0,
      icon: "📅",
      color: "from-indigo-500/20 to-indigo-600/10",
      border: "border-indigo-500/30",
      text: "text-indigo-400",
    },
    {
      label: "Ongoing",
      value: stats.ongoingEvents ?? 0,
      icon: "🔴",
      color: "from-red-500/20 to-red-600/10",
      border: "border-red-500/30",
      text: "text-red-400",
    },
    {
      label: "Upcoming",
      value: stats.upcomingEvents ?? 0,
      icon: "⏰",
      color: "from-amber-500/20 to-amber-600/10",
      border: "border-amber-500/30",
      text: "text-amber-400",
    },
    {
      label: "Registrations",
      value: stats.totalRegistrations ?? 0,
      icon: "📝",
      color: "from-emerald-500/20 to-emerald-600/10",
      border: "border-emerald-500/30",
      text: "text-emerald-400",
    },
    {
      label: "Completed",
      value: stats.completedEvents ?? 0,
      icon: "✅",
      color: "from-rose-500/20 to-rose-600/10",
      border: "border-rose-500/30",
      text: "text-rose-400",
    }
  ];

  const tabs = [
    { activeTab: "overview", label: "Overview", icon: "📊" },
    { activeTab: "clubs",    label: "Clubs",    icon: "🏛️" },
    { activeTab: "events",   label: "Events",   icon: "📅" },
    { activeTab: "history",  label: "History",  icon: "⏳" },
    { activeTab: "students", label: "Students", icon: "👥" },
    { activeTab: "gallery",  label: "Gallery",  icon: "🖼️" },
  ];

  // Tab Content Helpers
  const renderStudentsTab = () => (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white font-semibold text-xl">
          College Students
          <span className="text-slate-500 font-normal ml-3 text-sm">
            ({students.length} registered)
          </span>
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
            {['ALL', 'ACTIVE', 'INACTIVE'].map(f => (
              <button
                key={f}
                onClick={() => setStudentFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  studentFilter === f 
                    ? 'bg-indigo-600 text-white shadow-lg' 
                    : 'text-slate-500 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              className="bg-slate-800/50 text-white placeholder-slate-500
                rounded-2xl pl-10 pr-4 py-2.5 border border-slate-700
                focus:border-indigo-500 focus:outline-none text-sm w-64
                transition-all backdrop-blur-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-800/30 rounded-[2rem] border
        border-slate-700/50 overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="grid grid-cols-4 gap-4 px-8 py-4
          bg-slate-800/80 border-b border-slate-700/50 text-slate-400
          text-[10px] font-black uppercase tracking-[0.2em] italic">
          <span>Student Profile</span>
          <span>Contact Info</span>
          <span>Joined Date</span>
          <span>Participation</span>
        </div>

        <div className="divide-y divide-slate-700/30">
          {students
            .filter(s => {
              const q = (studentSearch || "").toLowerCase();
              const matchesSearch = (
                s.name?.toLowerCase().includes(q) ||
                s.email?.toLowerCase().includes(q)
              );
              let matchesFilter = true;
              if (studentFilter === "ACTIVE") matchesFilter = (s.totalParticipation > 0);
              if (studentFilter === "INACTIVE") matchesFilter = (s.totalParticipation === 0);
              
              return matchesSearch && matchesFilter;
            })
            .map((s, i) => (
              <div key={s.id}
                className={`grid grid-cols-4 gap-4 px-8 py-5
                  items-center hover:bg-slate-700/20 transition-all group
                  ${i % 2 === 0 ? "" : "bg-slate-800/10"}`}>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600
                    flex items-center justify-center text-sm font-black italic
                    text-white shadow-lg group-hover:scale-110 transition-transform">
                    {s.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <span className="text-white text-sm font-semibold truncate italic uppercase tracking-tight">
                    {s.name}
                  </span>
                </div>

                <span className="text-slate-400 text-sm font-mono truncate">
                  {s.email}
                </span>

                <span className="text-slate-500 text-xs font-medium">
                  {s.createdAt
                    ? new Date(s.createdAt).toLocaleDateString("en-IN", {
                        day:"numeric", month:"short", year:"numeric"
                      })
                    : "—"}
                </span>

                 <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-slate-300 text-[10px] font-bold uppercase tracking-wider">{s.registrations} Individual</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{s.teamEvents} Team Events</span>
                  </div>
                  <p className="text-white text-xs font-black mt-1 pl-3 uppercase italic">Total: {s.totalParticipation}</p>
                </div>
              </div>
            ))}

          {students.length === 0 && (
            <div className="py-24 text-center">
              <div className="text-6xl mb-4 opacity-20">👥</div>
              <p className="text-slate-500 text-sm font-black uppercase tracking-widest italic">
                No students identified in your database
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderClubEventsModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowClubEventsModal(false)} />
      <div className="relative bg-slate-900 border border-slate-700 w-full max-w-2xl max-h-[80vh] rounded-3xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300 shadow-2xl">
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/30">
          <div>
            <h3 className="text-white font-bold text-xl">{selectedClub?.name} Events</h3>
            <p className="text-slate-400 text-xs mt-1">Found {selectedClubEvents.length} events organized by this club</p>
          </div>
          <button onClick={() => setShowClubEventsModal(false)} className="text-slate-400 hover:text-white text-2xl">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {selectedClubEvents.map(e => (
            <div key={e.id} className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-xl flex-shrink-0">📅</div>
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-semibold text-sm truncate">{e.title}</h4>
                <p className="text-slate-500 text-xs mt-0.5">{e.eventDate ? new Date(e.eventDate).toLocaleDateString() : 'No Date'}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                e.status === 'UPCOMING' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-700/50 text-slate-400'
              }`}>{e.status}</span>
            </div>
          ))}
          {selectedClubEvents.length === 0 && <p className="text-center text-slate-500 py-10">No events found for this club.</p>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 p-6 lg:p-10 font-sans">
      
      {/* SECTION 1 — TOP WELCOME BANNER */}
      <div className="relative overflow-hidden rounded-3xl
        bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800
        p-6 mb-6">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full
          bg-white/5 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48
          rounded-full bg-white/5 translate-y-1/2" />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            {college?.logoUrl ? (
              <img src={`${BACKEND_URL}${college.logoUrl}`}
                className="w-16 h-16 rounded-2xl object-cover
                  border-2 border-white/30" alt="logo" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-white/20
                flex items-center justify-center text-2xl">
                🏛️
              </div>
            )}
            <div>
              <p className="text-indigo-200 text-sm font-medium">
                College Admin Dashboard
              </p>
              <h1 className="text-white text-2xl font-bold mt-0.5 flex items-center gap-2">
                {college?.name || "Your College"}
                {college?.affiliation && (
                  <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-lg border border-white/20 font-black tracking-widest uppercase">
                    {college.affiliation}
                  </span>
                )}
              </h1>
              <p className="text-indigo-300 text-sm mt-1">
                {college?.location}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setShowCreateEvent(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                bg-white/20 hover:bg-white/30 text-white text-sm
                font-medium transition-all backdrop-blur-sm
                border border-white/20"
            >
              <span>+</span> New Event
            </button>
            <button onClick={() => setShowCreateClub(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                bg-white text-indigo-700 hover:bg-indigo-50 text-sm
                font-semibold transition-all"
            >
              <span>+</span> New Club
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2 — STATS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {statCards.map((s, i) => (
          <div key={i}
            className={`rounded-2xl p-4 bg-gradient-to-br ${s.color}
              border ${s.border} backdrop-blur-sm`}>
            <div className="flex items-start justify-between">
              <span className="text-2xl">{s.icon}</span>
              {s.trend && (
                <span className="text-emerald-400 text-xs font-medium">
                  ↑
                </span>
              )}
            </div>
            <p className={`text-3xl font-bold mt-3 ${s.text}`}>
              {s.value}
            </p>
            <p className="text-slate-400 text-xs mt-1 font-medium">
              {s.label}
            </p>
            {s.trend && (
              <p className="text-emerald-400 text-xs mt-1">{s.trend}</p>
            )}
          </div>
        ))}
      </div>

      {/* SECTION 3 — TAB NAVIGATION */}
      <div className="flex gap-1 p-1 bg-slate-800/50 rounded-2xl
        border border-slate-700/50 mb-6 w-fit">
        {tabs.map(tab => (
          <button key={tab.activeTab}
            onClick={() => setActiveTab(tab.activeTab)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl
              text-sm font-medium transition-all duration-200 ${
              activeTab === tab.activeTab
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                : "text-slate-400 hover:text-white hover:bg-slate-700/50"
            }`}>
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-800/50 rounded-2xl border
              border-slate-700/50 p-5">
              <h3 className="text-white font-semibold mb-4 flex
                items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                Monthly Registrations
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="month" tick={{fill:"#64748b", fontSize:11}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill:"#64748b", fontSize:11}} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:"12px", color:"#fff", fontSize:"12px" }} />
                  <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorReg)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-5">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-500" />
                Events by Club
              </h3>
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie data={stats.eventsByClub || [{club:'Tech',events:10}, {club:'Cultural',events:5}]} dataKey="events" nameKey="club" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                      {(stats.eventsByClub || [{club:'Tech',events:10}, {club:'Cultural',events:5}]).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:"12px", color:"#fff" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {eventsByClub.slice(0, 6).map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background: COLORS[i%COLORS.length]}} />
                        <span className="text-slate-400 text-xs truncate">{item.club}</span>
                      </div>
                      <span className="text-white text-xs font-semibold">{item.events}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-5">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Recent Activity
              </h3>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {(stats.recentActivity || []).length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-6">No recent activity</p>
                ) : (
                  stats.recentActivity.map((act, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 transition-colors">
                      <span className="text-lg flex-shrink-0">🔔</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-300 text-xs leading-relaxed">{act.message}</p>
                        <p className="text-slate-600 text-xs mt-1">{timeAgo(act.time)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "clubs" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-white font-semibold">
                All Clubs
                <span className="text-slate-500 font-normal ml-2 text-sm">
                  ({(Array.isArray(clubs)?clubs:[]).length})
                </span>
              </h2>
              <input
                type="text"
                placeholder="Search clubs..."
                value={clubSearch}
                onChange={e => setClubSearch(e.target.value)}
                className="bg-slate-800 text-white placeholder-slate-500 rounded-xl px-4 py-2 border border-slate-700 focus:border-indigo-500 focus:outline-none text-sm w-48"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {(Array.isArray(clubs) ? clubs : [])
              .filter(c => c.name.toLowerCase().includes((clubSearch||"").toLowerCase()))
              .map(club => (
                <div key={club.id}
                  className="bg-slate-800/50 rounded-2xl border
                    border-slate-700/50 overflow-hidden hover:border-slate-600
                    transition-all group">
                  <div className="h-24 relative bg-gradient-to-br from-indigo-900/50 to-violet-900/50 overflow-hidden">
                    {club.coverUrl && <img src={`${BACKEND_URL}${club.coverUrl}`} className="w-full h-full object-cover opacity-60" alt="" />}
                    <div className="absolute -bottom-5 left-4">
                      {club.logoUrl ? <img src={`${BACKEND_URL}${club.logoUrl}`} className="w-12 h-12 rounded-xl border-2 border-slate-800 object-cover" alt="" />
                      : <div className="w-12 h-12 rounded-xl bg-slate-700 border-2 border-slate-800 flex items-center justify-center text-xl">🏛️</div>}
                    </div>
                  </div>
                  <div className="pt-7 px-4 pb-4">
                    <h3 className="text-white font-semibold text-sm">{club.name}</h3>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs">{club.category}</span>
                    <div className="flex gap-4 mt-3 pt-3 border-t border-slate-700/50">
                      <div className="text-center">
                        <p className="text-white font-bold text-sm tracking-tighter">{(club.membersCount ?? 0) + (club.studentCount ?? 0)}</p>
                        <p className="text-slate-500 text-xs">Students</p>
                      </div>
                      <div className="text-center">
                        <p className="text-white font-bold text-sm">{club.eventCount ?? 0}</p>
                        <p className="text-slate-500 text-xs">Events</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => handleEditClub(club)} className="flex-1 py-2 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-600/50">✏️ Edit</button>
                      <button onClick={() => handleViewClubEvents(club)} className="flex-1 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-medium border border-indigo-500/10">📅 Events</button>
                      <button onClick={() => handleDeleteClub(club.id)} className="py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs border border-red-500/30">🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {activeTab === "events" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">
              All Events
              <span className="text-slate-500 font-normal ml-2 text-sm">
                ({(Array.isArray(events)?events:[]).length})
              </span>
            </h2>
            <select value={eventFilter}
              onChange={e => setEventFilter(e.target.value)}
              className="bg-slate-800 text-slate-300 rounded-xl px-3 py-2
                border border-slate-700 text-sm focus:outline-none">
              <option value="ALL">All Events</option>
              <option value="COLLEGE">College Events</option>
              <option value="CLUB">Club Events</option>
              <option value="UPCOMING">Upcoming</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div className="space-y-3">
            {(Array.isArray(events) ? events : [])
              .filter(e => {
                if (eventFilter === "COLLEGE") return !e.clubId;
                if (eventFilter === "CLUB")    return !!e.clubId;
                if (eventFilter === "ALL")     return true;
                return e.status === eventFilter;
              })
              .map(event => (
              <div key={event.id} className="flex items-center gap-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 p-4 hover:border-slate-600 transition-all group">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-indigo-900/50 flex-shrink-0">
                  {event.coverUrl ? <img src={`${BACKEND_URL}${event.coverUrl}`} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-xl">📅</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-semibold text-sm truncate">{event.title}</h3>
                    {event.clubId ? (
                      <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 text-[10px] border border-violet-500/20">
                        🏛️ {event.clubName || "Club"}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] border border-indigo-500/20">
                        🎓 College
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 text-xs">{event.eventDate ? new Date(event.eventDate).toLocaleDateString() : 'No Date'}</span>
                    
                    {/* Registration type badge */}
                    {(() => {
                      const rt = event.registrationType || "INDIVIDUAL";
                      if (rt === "TEAM") return (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                          👥 Team Only
                        </span>
                      );
                      if (rt === "BOTH") return (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          👤👥 Combined
                        </span>
                      );
                      return (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          👤 Individual
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleViewRegistrations(event)}
                    className="px-3 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-semibold"
                  >
                    Registrations
                  </button>
                  {event.status !== 'COMPLETED' && event.status !== 'CANCELLED' && (
                    <>
                      <button onClick={() => handleEditEvent(event)} className="p-2 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-slate-400 text-sm">✏️</button>
                      <button onClick={() => handleDeleteEvent(event.id)} className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm">🗑️</button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {(events.length === 0) && (
              <div className="py-20 text-center">
                <span className="text-4xl">📅</span>
                <p className="text-slate-500 text-sm mt-3">No events found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">
              Event History
              <span className="text-slate-500 font-normal ml-2 text-sm">
                ({completedEvents.length} completed)
              </span>
            </h2>
          </div>
          <div className="space-y-3">
            {completedEvents.map(event => (
              <div key={event.id} className="flex items-center gap-4 bg-slate-800/30 rounded-2xl border border-slate-700/30 p-4 transition-all opacity-70 hover:opacity-100 grayscale-[0.5] hover:grayscale-0 group">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0">
                  {event.coverUrl ? <img src={`${BACKEND_URL}${event.coverUrl}`} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-xl">⏳</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-semibold text-sm truncate">{event.title}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 text-[10px] border border-slate-600/50 uppercase font-black tracking-widest">
                      COMPLETED
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 text-xs">{event.eventDate ? new Date(event.eventDate).toLocaleDateString() : 'No Date'}</span>
                    <span className="text-slate-600 text-[10px] uppercase font-bold tracking-widest">
                      {event.clubName || "Main College"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleViewRegistrations(event)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold border border-slate-700 transition-all"
                  >
                    View Stats
                  </button>
                </div>
              </div>
            ))}

            {completedEvents.length === 0 && (
              <div className="py-20 text-center border-2 border-dashed border-slate-800/50 rounded-[3rem]">
                <span className="text-4xl opacity-20">⏳</span>
                <p className="text-slate-600 text-sm mt-3 font-black uppercase tracking-[0.2em] italic">No completed events found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "students" && renderStudentsTab()}

      {activeTab === "gallery" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-white font-semibold">College Gallery</h2>
            <label className={`bg-indigo-600 px-6 py-2.5 rounded-xl text-white text-sm font-bold cursor-pointer hover:bg-indigo-500 ${uploading?'opacity-50':''}`}>
              {uploading ? 'Uploading...' : '+ Add Photos'}
              <input type="file" multiple className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {(college?.collegePhotos || []).map((img, idx) => (
              <div key={idx} className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-700/50">
                <img src={`${BACKEND_URL}${img.url}`} className="w-full h-full object-cover" alt="" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button onClick={() => handleDeletePhoto(idx)} className="p-2 bg-red-600 text-white rounded-lg">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All modals */}
      {showCreateClub && (
        <CreateClubModal
          isOpen={showCreateClub}
          onClose={() => setShowCreateClub(false)}
          onSuccess={() => { setShowCreateClub(false); fetchData(); fetchStats(); }}
        />
      )}
      {showCreateEvent && (
        <CreateEventModal
          isOpen={showCreateEvent}
          onClose={() => setShowCreateEvent(false)}
          onSuccess={() => { setShowCreateEvent(false); fetchData(); fetchStats(); }}
        />
      )}
      {showEditClubModal && selectedClub && (
        <EditClubModal
          isOpen={showEditClubModal}
          club={selectedClub}
          onClose={() => { setShowEditClubModal(false); setSelectedClub(null); }}
          onSuccess={() => { setShowEditClubModal(false); fetchData(); fetchStats(); }}
        />
      )}
      {showEditEvent && selectedEvent && (
        <EditEventModal
          event={selectedEvent}
          onClose={() => { setShowEditEvent(false); setSelectedEvent(null); }}
          onSuccess={() => { setShowEditEvent(false); fetchData(); fetchStats(); }}
        />
      )}
      {showClubEventsModal && renderClubEventsModal()}
      
      {showRegsModal && selectedEvent && (
        <EventRegistrationsModal 
          isOpen={showRegsModal}
          onClose={() => { setShowRegsModal(false); setSelectedEvent(null); }}
          event={selectedEvent}
          role="college"
        />
      )}

    </div>
  );
}
