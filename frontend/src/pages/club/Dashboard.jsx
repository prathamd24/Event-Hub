import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import { toast } from '../../components/Toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
  AreaChart, Area
} from "recharts";
import EventRegistrationsModal from '../../components/modals/EventRegistrationsModal';
import EditEventModal from '../../components/modals/EditEventModal';
import CreateEventModal from '../../components/modals/CreateEventModal';
import AddMemberModal from '../../components/modals/AddMemberModal';
import { BACKEND_URL } from '../../config';
import { useAuth } from '../../context/AuthContext';

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

export default function ClubDashboard() {
  const { clubId } = useParams();
  const { user } = useAuth();
  const isGodMode = user?.role === 'COLLEGE_ADMIN';
  
  const [stats, setStats] = useState({});
  const [club, setClub] = useState(null);
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [eventFilter, setEventFilter] = useState("UPCOMING"); // UPCOMING, ONGOING, COMPLETED
  const [broadcasts, setBroadcasts] = useState([]);
  const [completedEvents, setCompletedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [uploading, setUploading] = useState(false);
  
  const [showRegsModal, setShowRegsModal] = useState(false);
  const [showEditEvent, setShowEditEvent] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [logs, setLogs] = useState([]);
  const [activeMemberTab, setActiveMemberTab] = useState("coordinators");

  // Volunteers / Broadcast state
  const [volunteerEmail, setVolunteerEmail] = useState("");
  const [assigningVol, setAssigningVol] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastAudience, setBroadcastAudience] = useState("ALL");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [showBroadcastAudience, setShowBroadcastAudience] = useState(false);

  // Settings State - pre-filled
  const [settings, setSettings] = useState({
    name: "", description: "", instagram: "", website: "", logoUrl: "", coverUrl: ""
  });

  const fetchData = async () => {
    try {
      const q = clubId ? `?club_id=${clubId}` : '';
      const [statsRes, clubRes, eventsRes, membersRes, volRes, logsRes, bcastRes, historyRes] = await Promise.all([
        api.get(`/api/club/stats${q}`),
        api.get(`/api/club/info${q}`),
        api.get(`/api/club/events${q}`),
        api.get(`/api/club/members${q}`),
        api.get(`/api/club/roles${q}`).catch(() => ({ data: { roles: [] } })),
        api.get(`/api/club/logs${q}`).catch(() => ({ data: { logs: [] } })),
        api.get(`/api/club/broadcasts${q}`).catch(() => ({ data: { broadcasts: [] } })),
        api.get(`/api/club/events?status=COMPLETED${clubId ? `&club_id=${clubId}` : ''}`).catch(() => ({ data: [] }))
      ]);
      setStats(statsRes.data || {});
      setClub(clubRes.data || null);
      setEvents(Array.isArray(eventsRes.data) ? eventsRes.data : []);
      setMembers(Array.isArray(membersRes.data) ? membersRes.data : []);
      setVolunteers(Array.isArray(volRes.data?.roles) ? volRes.data.roles : []);
      setLogs(Array.isArray(logsRes.data?.logs) ? logsRes.data.logs : []);
      setBroadcasts(Array.isArray(bcastRes.data?.broadcasts) ? bcastRes.data.broadcasts : []);
      setCompletedEvents(Array.isArray(historyRes.data) ? historyRes.data : []);
      
      if (clubRes.data) {
        setSettings({
          name: clubRes.data.name || "",
          description: clubRes.data.description || "",
          instagram: clubRes.data.instagram || "",
          website: clubRes.data.website || ""
        });
      }
    } catch (e) {
      console.error("Dashboard load error:", e);
      toast("Failed to load dashboard", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignVolunteer = async () => {
    if (!volunteerEmail.trim()) return;
    setAssigningVol(true);
    try {
      await api.post('/api/club/roles/assign', { email: volunteerEmail.trim(), role: 'VOLUNTEER' });
      toast('Volunteer assigned!', 'success');
      setVolunteerEmail('');
      fetchData();
    } catch (e) {
      toast(e?.response?.data?.error || 'Failed to assign volunteer', 'error');
    } finally {
      setAssigningVol(false);
    }
  };

  const handleRevokeVolunteer = async (userId) => {
    if (!window.confirm('Remove this user from roles?')) return;
    try {
      // Find the role_id from the volunteer object
      const role = volunteers.find(v => (v.userId || v.user_id) === userId);
      if (!role) return;
      await api.delete(`/api/club/roles/${role.id}`);
      toast('Role removed', 'success');
      fetchData();
    } catch (e) {
      toast('Failed to remove role', 'error');
    }
  };

  const handleSendBroadcast = async (selectedAudience) => {
    if (!broadcastMsg.trim()) return;
    const aud = selectedAudience || broadcastAudience;

    setSendingBroadcast(true);
    try {
      await api.post('/api/club/broadcast', { 
        message: broadcastMsg.trim(),
        audience: aud 
      });
      toast(`Broadcast sent to ${aud.toLowerCase()}!`, 'success');
      setBroadcastMsg('');
      setBroadcastAudience("ALL");
      setShowBroadcastAudience(false);
      fetchData();
    } catch (e) {
      toast('Failed to send broadcast', 'error');
    } finally {
      setSendingBroadcast(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    try {
      await api.put('/api/club/info', settings);
      toast("Club settings updated", "success");
      fetchData();
    } catch (e) {
      toast("Failed to update settings", "error");
    }
  };

  const handleAddMember = async () => {
    const email = window.prompt("Enter student email to invite:");
    if (!email) return;
    try {
      await api.post('/api/club/members/add', { email });
      toast("Invitation sent!", "success");
      fetchData();
    } catch (e) {
      toast("Failed to add member", "error");
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm("Remove this member?")) return;
    try {
      await api.delete(`/api/club/members/${memberId}`);
      toast("Member removed", "success");
      fetchData();
    } catch (e) {
      toast("Failed to remove member", "error");
    }
  };

  const handleAcceptOffer = async (eventId) => {
    try {
      await api.put(`/api/club/events/${eventId}/accept-offer`);
      toast("Offer accepted!", "success");
      fetchData();
    } catch (e) {
      toast("Action failed", "error");
    }
  };

  const handleEditEvent = (event) => {
    setSelectedEvent(event);
    setShowEditEvent(true);
  };

  const handleOpenRegistrations = (event) => {
    setSelectedEvent(event);
    setShowRegsModal(true);
  };

  if (loading) return <LoadingSpinner />;

  const statCards = [
    { label: "Registrations", value: stats.registrationsCount || 0, icon: "📝", color: "from-blue-500/20 to-blue-600/10", border: "border-blue-500/30", text: "text-blue-400" },
    { label: "Total Events", value: stats.eventsCount || 0, icon: "📅", color: "from-indigo-500/20 to-indigo-600/10", border: "border-indigo-500/30", text: "text-indigo-400" },
    { label: "Upcoming", value: stats.upcomingCount || 0, icon: "⏳", color: "from-emerald-500/20 to-emerald-600/10", border: "border-emerald-500/30", text: "text-emerald-400" },
    { label: "Ongoing", value: stats.ongoingCount || 0, icon: "🚀", color: "from-amber-500/20 to-amber-600/10", border: "border-amber-500/30", text: "text-amber-400" },
    { label: "Completed", value: stats.completedCount || 0, icon: "✅", color: "from-rose-500/20 to-rose-600/10", border: "border-rose-500/30", text: "text-rose-400" },
  ];

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "events", label: "Events", icon: "📅" },
    { id: "history", label: "History", icon: "⏳" },
    { id: "members", label: "Student Coordinators", icon: "👥" },
    { id: "volunteers", label: "Roles", icon: "🛡️" },
    { id: "logs", label: "Logs", icon: "📋" },
    { id: "settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 p-6 lg:p-10 font-sans relative">
      {isGodMode && (
        <div className="mb-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between group shadow-lg shadow-amber-500/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">👑</div>
            <div>
              <h2 className="text-amber-500 font-black text-xs uppercase tracking-[0.2em] italic">College Admin Authority</h2>
              <p className="text-slate-400 text-[10px] font-medium mt-0.5">You have full administrative control over {club?.name || 'this club'}.</p>
            </div>
          </div>
          <div className="hidden md:block">
            <span className="text-[10px] font-black text-amber-500/40 uppercase tracking-widest italic animate-pulse">System Overdrive Active</span>
          </div>
        </div>
      )}
      
      {/* SECTION 1 — CLUB IDENTITY HEADER */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 mb-6">
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              {club?.logoUrl ? (
                <img src={`${BACKEND_URL}${club.logoUrl}`} className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-700" alt="logo" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center text-3xl">🎪</div>
              )}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center text-[10px] border-2 border-slate-900">✓</div>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-white text-2xl font-bold">{club?.name}</h1>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-medium border border-slate-700 uppercase tracking-wider">{club?.category}</span>
              </div>
              <p className="text-slate-400 text-sm mt-1">{club?.collegeName || "Our College"}</p>
              <div className="flex gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                  <span>✨ Official Club</span>
                </div>
                {club?.instagram && (
                  <a href={`https://instagram.com/${club.instagram}`} target="_blank" className="text-pink-400 text-xs hover:underline flex items-center gap-1">
                    <span>📸</span> {club.instagram}
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowCreateEvent(true);
              }}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all"
            >
              <span>+</span> New Event
            </button>
            <button onClick={() => setActiveTab("settings")} className="flex-1 md:flex-none px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium border border-slate-700 transition-all">
              Edit Club
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2 — STATS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {statCards.map((s, i) => (
          <div key={i} className={`rounded-2xl p-4 bg-gradient-to-br ${s.color} border ${s.border} backdrop-blur-sm`}>
            <div className="flex items-center justify-between opacity-80">
              <span className="text-lg">{s.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{s.label}</span>
            </div>
            <p className={`text-2xl font-bold mt-2 ${s.text}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* SECTION 3 — TAB NAVIGATION */}
      <div className="flex gap-1 p-1 bg-slate-800/50 rounded-2xl border border-slate-700/50 mb-6 w-full lg:w-fit overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === tab.id ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
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
            {/* Chart Area */}
            <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-white font-bold">Registration Trends</h3>
                  <p className="text-slate-500 text-xs">Event popularity overview</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={stats.chartData || [{name:'Event 1',count:12}, {name:'Event 2',count:25}, {name:'Event 3',count:18}]}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false}/>
                  <XAxis dataKey="name" tick={{fill:"#64748b", fontSize:11}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill:"#64748b", fontSize:11}} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:"12px" }} />
                  <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Dashboard Alerts / Suggestions */}
            <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setActiveTab("volunteers")} className="p-4 rounded-2xl bg-slate-800 border border-slate-700 hover:border-emerald-500 transition-all text-left">
                  <p className="text-xl mb-1">🛡️</p>
                  <p className="text-white text-xs font-bold">Manage Roles</p>
                </button>
                <button onClick={() => setShowAddMember(true)} className="p-4 rounded-2xl bg-slate-800 border border-slate-700 hover:border-emerald-500 transition-all text-left">
                  <p className="text-xl mb-1">👥</p>
                  <p className="text-white text-xs font-bold">Add Member</p>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Recent Broadcasts */}
            <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6">
              <h3 className="text-white font-bold mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" /> Official Broadcasts
                </span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{broadcasts.length} Sent</span>
              </h3>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {broadcasts.length === 0 ? (
                  <p className="text-slate-600 text-sm text-center py-6">No broadcasts sent yet</p>
                ) : (
                  broadcasts.map((b, i) => (
                    <div key={i} className="group relative bg-slate-800/20 border border-slate-700/30 rounded-2xl p-4 hover:border-indigo-500/30 transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                          b.senderRole === 'CLUB_COORDINATOR' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 
                          b.senderRole === 'STUDENT_COORDINATOR' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}>
                          {b.senderRole?.replace(/_/g, ' ')}
                        </span>
                        <span className="text-slate-600 text-[10px] font-bold">{timeAgo(b.createdAt)}</span>
                      </div>
                      <p className="text-slate-300 text-xs leading-relaxed italic">"{b.message}"</p>
                      <div className="mt-3 flex items-center gap-2">
                        <div className="w-5 h-5 rounded-lg bg-slate-800 flex items-center justify-center text-[10px]">👤</div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-tighter">By {b.senderName}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Upcoming Events List */}
            <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6">
              <h3 className="text-white font-bold mb-4">Up Next</h3>
              <div className="space-y-4">
                {events
                  .filter(e => ["UPCOMING", "ONGOING"].includes(e.status))
                  .slice(0, 3)
                  .map(event => (
                  <div key={event.id} className="group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-lg">{event.icon || "📅"}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate group-hover:text-indigo-400 transition-colors uppercase italic">{event.title}</p>
                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mt-0.5">{new Date(event.eventDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "events" && (
        <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-white font-bold italic uppercase tracking-tighter">Your Events</h2>
            
            <div className="flex items-center gap-3 w-full md:w-auto self-end">
              <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest italic">Filter:</span>
              <select 
                value={eventFilter} 
                onChange={(e) => setEventFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-xs font-bold focus:border-indigo-500 outline-none cursor-pointer hover:bg-slate-750 transition-all appearance-none pr-10 relative"
                style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236366f1\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em'}}
              >
                <option value="ALL">All Active</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="ONGOING">Ongoing</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left block md:table">
              <thead className="hidden md:table-header-group">
                <tr className="bg-slate-800/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">
                  <th className="px-6 py-4">Event Details</th>
                  <th className="px-6 py-4">Participants</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 block md:table-row-group">
                {events
                  .filter(ev => {
                    if (eventFilter === "ALL") return ["UPCOMING", "ONGOING", "COMPLETED"].includes(ev.status);
                    return ev.status === eventFilter;
                  })
                  .map((ev, i) => (
                  <tr key={ev.id} className="hover:bg-slate-800/30 transition-colors flex flex-col md:table-row border-b border-slate-800 md:border-0 mb-4 md:mb-0">
                    <td className="px-4 py-4 md:px-6 md:py-5 block md:table-cell relative border-b border-slate-800/50 md:border-0">
                      <div className="md:hidden text-[10px] text-slate-500 uppercase font-black tracking-widest italic mb-2">Event Details</div>
                      <p className="text-white font-bold text-sm uppercase italic">{ev.title}</p>
                      <p className="text-slate-500 text-xs mt-1">{new Date(ev.eventDate).toLocaleDateString()}</p>
                    </td>
                    <td className="px-4 py-4 md:px-6 md:py-5 block md:table-cell relative border-b border-slate-800/50 md:border-0 cursor-help" title={`Max: ${ev.maxParticipants || 'N/A'}`}>
                      <div className="md:hidden text-[10px] text-slate-500 uppercase font-black tracking-widest italic mb-2">Participants</div>
                      <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden mb-1">
                        <div className="h-full bg-indigo-500" style={{width: `${Math.min(100, (ev.currentRegistrations/(ev.maxParticipants || 100))*100)}%`}} />
                      </div>
                      <span className="text-xs font-bold text-slate-400">{ev.currentRegistrations || 0} Joined</span>
                    </td>
                    <td className="px-4 py-4 md:px-6 md:py-5 block md:table-cell relative border-b border-slate-800/50 md:border-0">
                      <div className="md:hidden text-[10px] text-slate-500 uppercase font-black tracking-widest italic mb-2">Status</div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        ev.status === 'UPCOMING' ? 'text-emerald-400 border-emerald-500/20' : 'text-slate-500 border-slate-700'
                      }`}>
                        {ev.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 md:px-6 md:py-5 block md:table-cell text-left md:text-right relative">
                      <div className="md:hidden text-[10px] text-slate-500 uppercase font-black tracking-widest italic mb-2">Actions</div>
                      <div className="flex md:justify-end gap-3 mt-1 md:mt-0">
                        <button 
                          onClick={() => handleOpenRegistrations(ev)}
                          className="text-indigo-400 text-xs font-bold hover:underline bg-indigo-500/10 md:bg-transparent px-3 py-1.5 md:p-0 rounded-lg md:rounded-none"
                        >
                          View List
                        </button>
                        <button 
                          onClick={() => handleEditEvent(ev)}
                          className="text-slate-400 hover:text-white transition-colors bg-white/5 md:bg-transparent px-3 py-1 md:p-0 rounded-lg md:rounded-none"
                        >
                          ✏️ Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-white font-bold italic uppercase tracking-tighter">Event History</h2>
            <span className="text-slate-500 text-xs font-bold">{completedEvents.length} Events</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-800/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">
                  <th className="px-6 py-4">Event Details</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {completedEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-800/30 transition-colors opacity-70 grayscale-[0.3] hover:opacity-100 hover:grayscale-0">
                    <td className="px-6 py-5">
                      <p className="text-white font-bold text-sm uppercase italic">{ev.title}</p>
                      <p className="text-slate-500 text-xs mt-1">{new Date(ev.eventDate).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button 
                        onClick={() => handleOpenRegistrations(ev)}
                        className="text-indigo-400 text-xs font-bold hover:underline bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/10"
                      >
                        Final Registrants
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {completedEvents.length === 0 && (
              <div className="py-24 text-center">
                 <p className="text-slate-600 text-xs font-black uppercase tracking-widest italic">No completed history</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "members" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-white font-bold italic uppercase tracking-tighter underline decoration-indigo-500 decoration-2 underline-offset-8">Manage Members</h2>
            <button onClick={() => setShowAddMember(true)} className="bg-white text-slate-950 px-6 py-2.5 rounded-xl text-xs font-bold hover:scale-105 active:scale-95 transition-all">+ Add Student Coordinator</button>
          </div>

          <div className="flex gap-4 p-1 bg-slate-800/50 rounded-2xl border border-slate-700/50 w-fit">
            {[
              { id: "coordinators", label: "Leadership Team", icon: "💎" },
              { id: "volunteers", label: "Active Volunteers", icon: "🤝" }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveMemberTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeMemberTab === tab.id ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
              }`}>
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             {volunteers
               .filter(m => {
                 if (activeMemberTab === 'coordinators') return m.role === 'STUDENT_COORDINATOR';
                 if (activeMemberTab === 'volunteers') return m.role === 'VOLUNTEER';
                 return true;
               })
               .map((m, i) => (
                 <div key={i} className="bg-slate-900 border border-slate-800 p-5 rounded-3xl hover:border-slate-700 transition-all">
                   <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-xl mb-4">👤</div>
                   <h3 className="text-white font-bold text-sm uppercase italic">{m.name}</h3>
                   <p className="text-slate-500 text-xs mt-1">{m.email}</p>
                   {m.role && (
                     <div className="flex flex-wrap gap-2 mt-2">
                       <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold border border-indigo-500/20 uppercase">
                         {m.role.replace(/_/g, ' ')}
                       </span>
                     </div>
                   )}
                   <div className="mt-4 pt-4 border-t border-slate-800 flex justify-end items-center">
                     <button onClick={() => handleRevokeVolunteer(m.userId || m.user_id)} className="text-red-500 hover:text-red-400 text-xs font-bold flex items-center gap-1.5 px-3 py-1 rounded-lg hover:bg-red-500/10 transition-all">
                       <span>✕</span> Remove Role
                     </button>
                   </div>
                 </div>
               ))
             }
             {volunteers.filter(m => {
                 if (activeMemberTab === 'coordinators') return m.role === 'STUDENT_COORDINATOR';
                 if (activeMemberTab === 'volunteers') return m.role === 'VOLUNTEER';
                 return true;
             }).length === 0 && (
               <div className="col-span-full py-20 text-center text-slate-600 italic">
                 No {activeMemberTab} found in this club.
               </div>
             )}
          </div>
        </div>
      )}

       {activeTab === "volunteers" && (
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 border border-slate-800 p-6 rounded-3xl gap-4">
            <div>
              <h2 className="text-white font-bold text-xl uppercase tracking-tighter flex items-center gap-3">
                Club Roles & Management
                <span className="text-[10px] bg-indigo-600/10 text-indigo-400 px-3 py-1 rounded-full border border-indigo-600/20 font-black tracking-[0.2em] italic">Official</span>
              </h2>
              <p className="text-slate-500 text-sm mt-1 font-medium">Manage members of the Leadership Team and Active Volunteers</p>
            </div>
            <button 
              onClick={(e) => {
                  e.preventDefault();
                  setShowAddMember(true);
              }} 
              className="w-full md:w-auto bg-white text-slate-950 px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10"
            >
              + Assign New Role
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
               <h3 className="text-white font-bold mb-4 flex items-center justify-between text-sm uppercase italic tracking-wider">
                  Leadership Team
                 <span className="text-[10px] text-slate-500 font-bold bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700/50">{volunteers.filter(v=>v.role==='STUDENT_COORDINATOR').length}/3</span>
               </h3>
               <div className="space-y-4">
                 {volunteers.filter(v=>v.role==='STUDENT_COORDINATOR').map(v => (
                   <div key={v.id} className="flex items-center justify-between bg-slate-800/40 p-4 rounded-2xl border border-slate-700/20 hover:border-emerald-500/20 transition-all group">
                     <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-lg shadow-inner group-hover:scale-110 transition-transform">👤</div>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-bold truncate">{v.name || "Unknown Name"}</p>
                          <p className="text-slate-500 text-[10px] font-medium truncate">{v.email || "No Email"}</p>
                        </div>
                     </div>
                     <button onClick={() => handleRevokeVolunteer(v.userId || v.user_id)} className="text-slate-600 hover:text-red-500 p-2 transition-colors">✕</button>
                   </div>
                 ))}
                 {volunteers.filter(v=>v.role==='STUDENT_COORDINATOR').length === 0 && (
                   <div className="py-10 text-center border-2 border-dashed border-slate-800/50 rounded-2xl">
                     <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest italic">No leaders assigned</p>
                   </div>
                 )}
               </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
               <h3 className="text-white font-bold mb-4 text-sm uppercase italic tracking-wider">Active Volunteers</h3>
               <div className="space-y-4">
                 {volunteers.filter(v=>v.role==='VOLUNTEER').map(v => (
                   <div key={v.id} className="flex items-center justify-between bg-slate-800/40 p-4 rounded-2xl border border-slate-700/20 hover:border-amber-500/20 transition-all group">
                     <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-lg shadow-inner group-hover:scale-110 transition-transform">🙋</div>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-bold truncate">{v.name || "Unknown Name"}</p>
                          <p className="text-slate-500 text-[10px] font-medium truncate">{v.email || "No Email"}</p>
                        </div>
                     </div>
                     <button onClick={() => handleRevokeVolunteer(v.userId || v.user_id)} className="text-slate-600 hover:text-red-500 p-2 transition-colors">✕</button>
                   </div>
                 ))}
                 {volunteers.filter(v=>v.role==='VOLUNTEER').length === 0 && (
                   <div className="py-10 text-center border-2 border-dashed border-slate-800/50 rounded-2xl">
                     <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest italic">No volunteers active</p>
                   </div>
                 )}
               </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/10 transition-all duration-700" />
               <h3 className="text-white font-bold mb-4 flex items-center justify-between">
                 Broadcast Message
                 <span className="text-[10px] text-emerald-500 font-black tracking-widest uppercase italic">Official</span>
               </h3>
               
               {!showBroadcastAudience ? (
                 <div className="animate-fadeIn">
                   <textarea 
                      value={broadcastMsg}
                      onChange={e => {
                        setBroadcastMsg(e.target.value);
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs mb-3 outline-none focus:border-emerald-500/50 transition-all"
                      placeholder="Type your official announcement here..."
                      rows={5}
                   />
                   <button 
                    onClick={() => {
                        if(!broadcastMsg.trim()) {
                            toast("Please type a message first", "error");
                            return;
                        }
                        setShowBroadcastAudience(true);
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 active:scale-95 flex items-center justify-center gap-2"
                   >
                     📢 Next: Choose Audience
                   </button>
                 </div>
               ) : (
                 <div className="space-y-3 animate-fadeIn">
                   <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2 text-center italic">Where should we send this?</p>
                   
                    <div className="grid grid-cols-1 gap-2">
                      <button 
                        onClick={() => handleSendBroadcast("ALL")}
                        disabled={sendingBroadcast}
                        className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/30 hover:border-indigo-500 transition-all text-left group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-white text-xs font-black uppercase italic tracking-wider">👥 All Members</span>
                          <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                        <p className="text-slate-500 text-[10px] mt-1 font-medium">Broadcast to all leadership team & volunteers</p>
                      </button>

                      <button 
                        onClick={() => handleSendBroadcast("COORDINATORS")}
                        disabled={sendingBroadcast}
                        className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 hover:border-indigo-500 hover:bg-indigo-500/20 transition-all text-left group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-white text-xs font-black uppercase italic tracking-wider">💎 Only Coordinators</span>
                          <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                        <p className="text-slate-500 text-[10px] mt-1 font-medium">Send message only to the Leadership Team</p>
                      </button>

                      <button 
                        onClick={() => handleSendBroadcast("VOLUNTEERS")}
                        disabled={sendingBroadcast}
                        className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 hover:border-amber-500 hover:bg-amber-500/20 transition-all text-left group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-white text-xs font-black uppercase italic tracking-wider">🤝 Only Volunteers</span>
                          <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                        <p className="text-slate-500 text-[10px] mt-1 font-medium">Send message only to Active Volunteers</p>
                      </button>
                    </div>

                   <button 
                     onClick={() => setShowBroadcastAudience(false)}
                     className="w-full text-slate-500 text-[10px] font-bold uppercase tracking-widest hover:text-white pt-2 transition-colors"
                   >
                     ← Back to compose
                   </button>
                 </div>
               )}

               {sendingBroadcast && (
                 <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-3xl">
                   <div className="flex flex-col items-center gap-3">
                     <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                     <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Broadcasting...</p>
                   </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "logs" && (
        <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-white font-bold italic uppercase tracking-tighter">Activity Log Feed</h2>
            <button onClick={fetchData} className="text-slate-400 hover:text-white text-xs">Refresh ↻</button>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {logs.map((log, i) => (
                <div key={log.id || i} className="flex gap-4 p-4 rounded-2xl bg-slate-800/40 border border-slate-700/30">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-lg shadow-inner">
                    {log.action === 'EVENT_CREATED' ? '✨' : 
                     log.action === 'MEMBER_ADDED' ? '👥' : 
                     log.action === 'BROADCAST_SENT' ? '📢' : 
                     log.action === 'ROLE_ASSIGNED' ? '🛡️' : '📝'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-white font-bold text-sm">{log.action.replace(/_/g, ' ')}</p>
                      <p className="text-slate-600 text-[10px] uppercase font-black tracking-widest">{timeAgo(log.createdAt)}</p>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed">{log.details}</p>
                    <p className="text-slate-600 text-[10px] mt-2 flex items-center gap-1.5 font-bold uppercase italic">
                      <span className="w-1 h-1 rounded-full bg-slate-700" /> Action by {log.actor}
                    </p>
                  </div>
                </div>
              ))}
              {logs.length === 0 && <p className="text-slate-600 text-center py-20 italic">No activity logs recorded yet.</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="max-w-2xl bg-slate-900 rounded-3xl border border-slate-800 p-8">
            <h2 className="text-white font-bold text-xl mb-6 flex items-center gap-3">
              <span className="text-2xl">⚙️</span> Club Identity
            </h2>
            <form onSubmit={handleUpdateSettings} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Club Name</label>
                  <input type="text" value={settings.name} onChange={e => setSettings({...settings, name: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-indigo-500 outline-none" placeholder="Club Name" />
                </div>
                <div className="space-y-2">
                  <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Instagram Username</label>
                  <input type="text" value={settings.instagram} onChange={e => setSettings({...settings, instagram: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-indigo-500 outline-none" placeholder="@username" />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Description</label>
                <textarea rows={6} value={settings.description} onChange={e => setSettings({...settings, description: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-indigo-500 outline-none resize-none leading-relaxed" placeholder="Tell everyone what your club is about..." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Website URL</label>
                  <input type="url" value={settings.website} onChange={e => setSettings({...settings, website: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-indigo-500 outline-none" placeholder="https://..." />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
                <div className="space-y-3">
                  <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Update Logo</label>
                  <div className="flex items-center gap-4">
                    {club?.logoUrl && (
                      <img src={`${BACKEND_URL}${club.logoUrl}`} className="w-12 h-12 rounded-xl object-cover border border-slate-700" alt="Current Logo" />
                    )}
                    <input 
                      type="file" 
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const formData = new FormData();
                        formData.append('logo', file);
                        try {
                          await api.post('/api/club/branding', formData);
                          toast("Logo updated!", "success");
                          fetchData();
                        } catch (err) {
                          toast("Logo upload failed", "error");
                        }
                      }}
                      className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 file:cursor-pointer"
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Update Cover Photo</label>
                  <div className="flex items-center gap-4">
                      <img src={`${BACKEND_URL}${club.coverUrl}`} className="w-12 h-12 rounded-xl object-cover border border-slate-700" alt="Current Cover" />
                    <input 
                      type="file" 
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const formData = new FormData();
                        formData.append('cover', file);
                        try {
                          await api.post('/api/club/branding', formData);
                          toast("Cover photo updated!", "success");
                          fetchData();
                        } catch (err) {
                          toast("Cover upload failed", "error");
                        }
                      }}
                      className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 file:cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-bold transition-all shadow-xl shadow-indigo-500/20 active:scale-[0.98]">
                  Update Club Profile
                </button>
              </div>
            </form>
        </div>
      )}

      {showRegsModal && selectedEvent && (
        <EventRegistrationsModal
          isOpen={showRegsModal}
          onClose={() => { setShowRegsModal(false); setSelectedEvent(null); }}
          event={selectedEvent}
          role="club"
          clubId={clubId}
        />
      )}

      {showEditEvent && selectedEvent && (
        <EditEventModal
          isOpen={true}
          event={selectedEvent}
          initialData={selectedEvent}
          onClose={() => { setShowEditEvent(false); setSelectedEvent(null); }}
          onSuccess={() => { setShowEditEvent(false); fetchData(); }}
          apiPrefix="club"
          clubId={clubId}
        />
      )}

      {showCreateEvent && (
        <CreateEventModal
          isOpen={true}
          onClose={() => setShowCreateEvent(false)}
          onSuccess={() => { setShowCreateEvent(false); fetchData(); }}
          clubId={clubId}
        />
      )}

      {showAddMember && (
        <AddMemberModal
          onClose={() => setShowAddMember(false)}
          onSuccess={() => { setShowAddMember(false); fetchData(); }}
        />
      )}
    </div>
  );
}
