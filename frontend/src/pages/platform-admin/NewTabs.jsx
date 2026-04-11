import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../../services/api';
import { toast } from '../../components/Toast';
import LoadingSpinner from '../../components/LoadingSpinner';

/* ─── Reused helpers ─────────────────────────────────────────── */
const StatusBadge = ({ status }) => (
    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${
        status === 'APPROVED'  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
        status === 'PENDING'   ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
        status === 'REJECTED'  ? 'bg-red-500/20 text-red-400 border-red-500/30' :
        status === 'SUSPENDED' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
        status === 'UPCOMING'  ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' :
        status === 'ONGOING'   ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
        'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }`}>{status}</span>
);

const GlassTable = ({ count, label, headers, children }) => (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10 text-xs text-slate-400">{count} {label}{count !== 1 ? 's' : ''}</div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-white/5 text-slate-400 text-xs uppercase">
                    <tr>{headers.map(h => (
                        <th key={h.label} className={`${h.align === 'center' ? 'text-center' : h.align === 'right' ? 'text-right' : 'text-left'} px-5 py-3`}>{h.label}</th>
                    ))}</tr>
                </thead>
                <tbody className="divide-y divide-white/5">{children}</tbody>
            </table>
        </div>
    </div>
);

/* ─── ANALYTICS TAB ──────────────────────────────────────────── */
export function AnalyticsTab({ telStats, liveFeed, hasMounted, tabLoading }) {
    const kpis = [
        { label: 'Events Today',    value: telStats?.totalToday    ?? '—', icon: '⚡', color: 'from-indigo-500/20',  border: 'border-indigo-500/20',  text: 'text-indigo-400' },
        { label: 'Events (7d)',     value: telStats?.total7d       ?? '—', icon: '📈', color: 'from-emerald-500/20', border: 'border-emerald-500/20', text: 'text-emerald-400' },
        { label: 'Unique Users 7d', value: telStats?.uniqueUsers7d ?? '—', icon: '👁️', color: 'from-purple-500/20',  border: 'border-purple-500/20',  text: 'text-purple-400' },
        { label: 'Feed Records',    value: liveFeed.length,                icon: '🔴', color: 'from-red-500/20',     border: 'border-red-500/20',     text: 'text-red-400' },
    ];
    return (
        <div className="space-y-6 animate-fadeIn">
            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {kpis.map(({ label, value, icon, color, border, text }) => (
                    <div key={label} className={`bg-gradient-to-br ${color} to-transparent backdrop-blur-xl border ${border} rounded-2xl p-5 relative overflow-hidden`}>
                        <div className="absolute top-3 right-3 text-xl opacity-40">{icon}</div>
                        <p className={`text-3xl font-black ${text}`}>{value}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{label}</p>
                    </div>
                ))}
            </div>

            {/* Daily chart + top pages */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                    <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                        <span className="w-2 h-6 bg-indigo-500 rounded-full" />Daily Activity (14d)
                    </h2>
                    {hasMounted && telStats?.eventsByDay?.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={telStats.eventsByDay}>
                                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickFormatter={v => v?.slice(5)} />
                                <YAxis stroke="#64748b" fontSize={10} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f1f5f9' }} />
                                <Bar dataKey="events" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-52 flex items-center justify-center text-slate-500 italic text-sm">Browse the platform to generate activity events.</div>
                    )}
                </div>
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                    <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                        <span className="w-2 h-6 bg-purple-500 rounded-full" />Top Pages (7d)
                    </h2>
                    <div className="space-y-2">
                        {(telStats?.topPages || []).length > 0 ? telStats.topPages.map((p, i) => (
                            <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                <span className="text-slate-300 text-xs font-mono truncate max-w-[140px]">{p.page}</span>
                                <span className="text-indigo-400 font-bold text-sm">{p.views}</span>
                            </div>
                        )) : <p className="text-slate-500 text-sm italic">No page views recorded yet.</p>}
                    </div>
                </div>
            </div>

            {/* Events by type + live feed */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                    <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                        <span className="w-2 h-6 bg-amber-500 rounded-full" />Events by Type (7d)
                    </h2>
                    {hasMounted && telStats?.eventsByType?.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie data={telStats.eventsByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                                    {telStats.eventsByType.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f1f5f9' }} />
                                <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 11 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <div className="h-48 flex items-center justify-center text-slate-500 italic text-sm">No event type data yet.</div>}
                </div>
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-white font-bold text-lg flex items-center gap-2">
                            <span className="w-2 h-6 bg-red-500 rounded-full" />Live Feed
                        </h2>
                        <span className="flex items-center gap-1.5 text-xs text-red-400">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />LIVE
                        </span>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {tabLoading?.analytics && <LoadingSpinner />}
                        {!tabLoading?.analytics && liveFeed.length > 0 ? liveFeed.slice(0, 20).map(ev => (
                            <div key={ev.id} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 whitespace-nowrap mt-0.5">{ev.eventType}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-slate-300 text-xs truncate">{ev.userName || 'Guest'}</p>
                                    <p className="text-slate-500 text-[10px]">{ev.timestamp ? new Date(ev.timestamp).toLocaleString('en-IN') : '—'}</p>
                                </div>
                            </div>
                        )) : !tabLoading?.analytics && <p className="text-slate-500 text-sm italic">No events yet — browse the platform.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── ASK AI TAB ─────────────────────────────────────────────── */
export function AskAITab({ aiQuestion, setAiQuestion, aiLoading, aiHistory, handleAskAI }) {
    const examples = [
        'How many students signed up today?',
        'Which event has the most registrations?',
        'Show all pending colleges',
        'Which college has the most clubs?',
        'Top 5 pages by view count',
        'How many events are upcoming vs completed?',
    ];
    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 backdrop-blur-xl border border-indigo-500/20 rounded-3xl p-8">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl shadow-[0_0_24px_rgba(99,102,241,0.4)]">🤖</div>
                    <div>
                        <h2 className="text-2xl font-black text-white">Ask AI</h2>
                        <p className="text-slate-400 text-sm">Query your platform data in plain English. Powered by Gemini.</p>
                    </div>
                </div>
            </div>

            {/* Chat history */}
            {aiHistory.length > 0 && (
                <div className="space-y-4">
                    {aiHistory.map((msg, i) => (
                        <div key={i}>
                            {msg.role === 'user' && (
                                <div className="flex justify-end">
                                    <div className="bg-indigo-500/20 border border-indigo-500/30 rounded-2xl rounded-tr-sm px-5 py-3 max-w-[80%]">
                                        <p className="text-white text-sm font-semibold">{msg.text}</p>
                                    </div>
                                </div>
                            )}
                            {msg.role === 'ai' && (
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 space-y-4">
                                    <div className="text-emerald-400 text-xs font-bold uppercase tracking-wider">
                                        ✓ AI Response — {msg.data.rowCount} row{msg.data.rowCount !== 1 ? 's' : ''}
                                    </div>
                                    {msg.data.sql && (
                                        <div className="bg-black/40 rounded-xl p-4 text-xs font-mono text-indigo-300 overflow-x-auto">
                                            <p className="text-slate-500 mb-1 text-[10px] uppercase tracking-wider">Generated SQL</p>
                                            {msg.data.sql}
                                        </div>
                                    )}
                                    {msg.data.results?.length > 0 && (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs">
                                                <thead className="bg-white/5 text-slate-400 text-[10px] uppercase">
                                                    <tr>{msg.data.columns.map(col => <th key={col} className="px-3 py-2 text-left">{col}</th>)}</tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {msg.data.results.slice(0, 50).map((row, ri) => (
                                                        <tr key={ri} className="hover:bg-white/5">
                                                            {msg.data.columns.map(col => (
                                                                <td key={col} className="px-3 py-2 text-slate-300">{String(row[col] ?? '—')}</td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                            {msg.role === 'error' && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-3">
                                    <p className="text-red-400 text-sm">⚠️ {msg.text}</p>
                                </div>
                            )}
                        </div>
                    ))}
                    {aiLoading && (
                        <div className="flex items-center gap-3 text-slate-400 text-sm">
                            <span className="animate-spin">⏳</span> AI is thinking…
                        </div>
                    )}
                </div>
            )}

            {/* Input + example chips */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
                <div className="flex gap-3">
                    <input
                        value={aiQuestion}
                        onChange={e => setAiQuestion(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAskAI()}
                        placeholder="e.g. Which college had the most registrations this week?"
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500/50 placeholder:text-slate-500 transition-all"
                        disabled={aiLoading}
                    />
                    <button
                        onClick={() => handleAskAI()}
                        disabled={aiLoading || !aiQuestion.trim()}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 whitespace-nowrap shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                    >
                        {aiLoading ? '⏳' : 'Ask'}
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {examples.map(q => (
                        <button key={q} onClick={() => handleAskAI(q)}
                            className="text-xs px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-slate-400 hover:text-white hover:border-indigo-500/40 transition-all">
                            {q}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ─── GOD MODE TAB ───────────────────────────────────────────── */
export function GodModeTab({
    colleges, clubs, events, users,
    godTab, setGodTab,
    openEdit, setConfirmDelete,
    handleToggleUser, handleChangeRole,
    broadcastForm, setBroadcastForm, handleBroadcast,
    dbHealth, loadDbHealth,
}) {
    const [viewRegsEvent, setViewRegsEvent] = useState(null);
    const [regs, setRegs] = useState([]);
    const [regsLoading, setRegsLoading] = useState(false);

    const loadRegistrations = async (e) => {
        setViewRegsEvent(e);
        setRegsLoading(true);
        try {
            const res = await api.get(`/api/platform-admin/events/${e.id}/registrations`);
            setRegs(res.data.registrations || []);
        } catch {
            toast('Failed to load registrations', 'error');
        } finally {
            setRegsLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn relative">
            {/* Header */}
            <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-3xl p-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-white">⚡ God Mode</h2>
                    <p className="text-slate-400 text-sm mt-1">Full read + write + delete access to every entity on the platform.</p>
                </div>
                <div className="text-6xl opacity-20">🔱</div>
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-1 bg-white/5 p-1 rounded-2xl border border-white/10 overflow-x-auto no-scrollbar">
                {['colleges', 'clubs', 'events', 'users', 'system'].map(t => (
                    <button key={t} onClick={() => setGodTab(t)}
                        className={`flex-1 min-w-max px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap capitalize ${
                            godTab === t ? 'bg-red-500/20 text-white border border-red-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}>{t}</button>
                ))}
            </div>

            {/* COLLEGES */}
            {godTab === 'colleges' && (
                <GlassTable count={colleges.length} label="college"
                    headers={[{ label: 'College' }, { label: 'Location' }, { label: 'Status', align: 'center' }, { label: 'Actions', align: 'right' }]}>
                    {colleges.map(c => (
                        <tr key={c.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-5 py-4">
                                <p className="text-white font-semibold">{c.name}</p>
                                <p className="text-slate-500 text-xs">{c.adminName}</p>
                            </td>
                            <td className="px-5 py-4 text-slate-400 text-sm">{c.location}</td>
                            <td className="px-4 py-4 text-center"><StatusBadge status={c.status} /></td>
                            <td className="px-5 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => openEdit('college', c)} className="text-xs px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500 hover:text-white transition-all font-semibold">Edit</button>
                                    <button onClick={() => setConfirmDelete({ type: 'college', id: c.id, name: c.name })} className="text-xs px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500 hover:text-white transition-all font-semibold">Delete</button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </GlassTable>
            )}

            {/* CLUBS */}
            {godTab === 'clubs' && (
                <GlassTable count={clubs.length} label="club"
                    headers={[{ label: 'Club' }, { label: 'College' }, { label: 'Status', align: 'center' }, { label: 'Actions', align: 'right' }]}>
                    {clubs.map(c => (
                        <tr key={c.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-5 py-4">
                                <p className="text-white font-semibold">{c.name}</p>
                                <p className="text-slate-500 text-xs">{c.category}</p>
                            </td>
                            <td className="px-5 py-4 text-slate-400 text-sm">{c.collegeName || '—'}</td>
                            <td className="px-4 py-4 text-center"><StatusBadge status={c.status} /></td>
                            <td className="px-5 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => openEdit('club', c)} className="text-xs px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500 hover:text-white transition-all font-semibold">Edit</button>
                                    <button onClick={() => setConfirmDelete({ type: 'club', id: c.id, name: c.name })} className="text-xs px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500 hover:text-white transition-all font-semibold">Delete</button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </GlassTable>
            )}

            {/* EVENTS */}
            {godTab === 'events' && (
                <GlassTable count={events.length} label="event"
                    headers={[{ label: 'Event' }, { label: 'College' }, { label: 'Status', align: 'center' }, { label: 'Actions', align: 'right' }]}>
                    {events.map(e => (
                        <tr key={e.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-5 py-4">
                                <p className="text-white font-semibold">{e.title}</p>
                                <p className="text-slate-500 text-xs">{e.eventDate ? new Date(e.eventDate).toLocaleDateString('en-IN') : '—'}</p>
                            </td>
                            <td className="px-5 py-4 text-slate-400 text-sm">{e.collegeName || '—'}</td>
                            <td className="px-4 py-4 text-center"><StatusBadge status={e.status} /></td>
                            <td className="px-5 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => loadRegistrations(e)} className="text-xs px-3 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-lg hover:bg-indigo-500 hover:text-white transition-all font-semibold">View Regs</button>
                                    <button onClick={() => openEdit('event', e)} className="text-xs px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500 hover:text-white transition-all font-semibold">Edit</button>
                                    <button onClick={() => setConfirmDelete({ type: 'event', id: e.id, name: e.title })} className="text-xs px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500 hover:text-white transition-all font-semibold">Delete</button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </GlassTable>
            )}

            {/* USERS */}
            {godTab === 'users' && (
                <GlassTable count={users.length} label="user"
                    headers={[{ label: 'User' }, { label: 'Role' }, { label: 'Status', align: 'center' }, { label: 'Actions', align: 'right' }]}>
                    {users.map(u => (
                        <tr key={u.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-5 py-4">
                                <p className="text-white font-semibold">{u.name}</p>
                                <p className="text-slate-500 text-xs">{u.email}</p>
                            </td>
                            <td className="px-5 py-4">
                                {u.role === 'PLATFORM_ADMIN'
                                    ? <span className="text-[10px] font-black px-2.5 py-1 rounded-full border bg-emerald-500/20 text-emerald-400 border-emerald-500/30">PLATFORM ADMIN</span>
                                    : <select value={u.role} onChange={e => handleChangeRole(u.id, e.target.value)}
                                        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-xs outline-none focus:border-indigo-500/50">
                                        {['STUDENT', 'COLLEGE_ADMIN', 'CLUB_COORDINATOR'].map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                                    </select>
                                }
                            </td>
                            <td className="px-4 py-4 text-center">
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${u.isActive ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                                    {u.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td className="px-5 py-4 text-right">
                                {u.role !== 'PLATFORM_ADMIN' && (
                                    <button onClick={() => handleToggleUser(u.id)}
                                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-semibold ${
                                            u.isActive ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500 hover:text-white'
                                                       : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500 hover:text-white'
                                        }`}>{u.isActive ? 'Deactivate' : 'Activate'}</button>
                                )}
                            </td>
                        </tr>
                    ))}
                </GlassTable>
            )}

            {/* SYSTEM */}
            {godTab === 'system' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Broadcast */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
                        <h3 className="text-white font-black text-lg">📢 Broadcast to ALL Users</h3>
                        <p className="text-slate-400 text-xs">Sends an in-app notification to every registered user on the platform.</p>
                        <input value={broadcastForm.title}
                            onChange={e => setBroadcastForm(p => ({ ...p, title: e.target.value }))}
                            placeholder="Notification title…"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-orange-500/50 placeholder:text-slate-500 transition-all" />
                        <textarea value={broadcastForm.message}
                            onChange={e => setBroadcastForm(p => ({ ...p, message: e.target.value }))}
                            placeholder="Message body…" rows={4}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-orange-500/50 placeholder:text-slate-500 transition-all resize-none" />
                        <button onClick={handleBroadcast}
                            className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-black rounded-xl hover:opacity-90 transition-all text-sm shadow-[0_0_20px_rgba(249,115,22,0.3)]">
                            📢 Send Broadcast
                        </button>
                    </div>

                    {/* DB Health */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-white font-black text-lg">🗄️ DB Health</h3>
                            <button onClick={loadDbHealth}
                                className="text-xs px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500 hover:text-white transition-all font-semibold">
                                Refresh
                            </button>
                        </div>
                        {dbHealth ? (
                            <>
                                <p className="text-slate-500 text-[10px]">Checked {new Date(dbHealth.checkedAt).toLocaleString('en-IN')}</p>
                                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                    {Object.entries(dbHealth.tables).map(([table, count]) => (
                                        <div key={table} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                            <span className="text-slate-400 text-xs font-mono">{table}</span>
                                            <span className="text-emerald-400 font-bold text-sm">{typeof count === 'number' ? count.toLocaleString() : count}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-8 text-slate-500 text-sm italic">Click Refresh to load table statistics.</div>
                        )}
                    </div>

                    {/* DANGER ZONE: Nuke Data */}
                    <div className="lg:col-span-2 bg-red-500/5 backdrop-blur-xl border border-red-500/20 rounded-3xl p-8 space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center text-2xl">☢️</div>
                            <div>
                                <h3 className="text-red-400 font-black text-xl">Danger Zone: Pure Reset</h3>
                                <p className="text-slate-400 text-sm">Wipe all users, colleges, clubs, and events. Only Platform Admins survive.</p>
                            </div>
                        </div>
                        
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                            <p className="text-red-400 text-xs font-bold uppercase tracking-widest mb-3">⚠️ IRREVERSIBLE ACTION</p>
                            <p className="text-slate-300 text-sm mb-4">
                                Use this before official launch to clear all test registrations. All Firebase auth connections will remain, but database associations will be purged.
                            </p>
                            <button 
                                onClick={async () => {
                                    const confirmKey = prompt('To confirm, type: NUKE_ALL_DATA');
                                    if (confirmKey === 'NUKE_ALL_DATA') {
                                        try {
                                            const res = await api.post('/api/platform-admin/nuke-test-data', { confirm: 'NUKE_ALL_DATA' });
                                            toast(res.data.message, 'success');
                                            loadDbHealth();
                                        } catch (e) {
                                            toast(e.response?.data?.error || 'Nuke failed', 'error');
                                        }
                                    }
                                }}
                                className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl transition-all shadow-[0_0_30px_rgba(220,38,38,0.3)]"
                            >
                                ☢️ NUKE ALL TEST DATA
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Event Registrations Modal */}
            {viewRegsEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-6 w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh]">
                        <div className="flex items-center justify-between mb-6 shrink-0">
                            <div>
                                <h3 className="text-xl font-black text-white">{viewRegsEvent.title}</h3>
                                <p className="text-slate-400 text-sm">Event Registrations • {regs.length} Total</p>
                            </div>
                            <button onClick={() => setViewRegsEvent(null)} className="text-slate-400 hover:text-white text-xl transition-colors">✕</button>
                        </div>
                        <div className="flex-1 overflow-y-auto min-h-[300px] border border-white/5 rounded-2xl bg-black/20 p-1">
                            {regsLoading ? <LoadingSpinner /> : regs.length > 0 ? (
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-400 uppercase sticky top-0 bg-[#0f172a] shadow-md z-10">
                                        <tr>
                                            <th className="px-4 py-3">Student Name</th>
                                            <th className="px-4 py-3">Email</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">Payment</th>
                                            <th className="px-4 py-3">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {regs.map(r => (
                                            <tr key={r.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3 text-white font-medium">{r.studentName}</td>
                                                <td className="px-4 py-3 text-slate-400 text-xs">{r.studentEmail}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                                        r.status === 'CONFIRMED' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                                        r.status === 'CANCELLED' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                                        'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                                    }`}>{r.status}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                                        r.paymentStatus === 'PAID' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                                        r.paymentStatus === 'VERIFICATION_PENDING' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                                        'bg-slate-500/20 text-slate-400 border-slate-500/30'
                                                    }`}>{r.paymentStatus?.replace('_', ' ') || 'NONE'}</span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-400 text-xs">{r.registeredAt ? new Date(r.registeredAt).toLocaleDateString() : '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-500 italic text-sm py-12">No registrations found for this event.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── EDIT MODAL ─────────────────────────────────────────────── */
export function EditModal({ editModal, editForm, setEditForm, closeEdit, handleSaveEdit }) {
    if (!editModal) return null;
    const fieldMap = {
        college: [['name', 'Name'], ['location', 'Location'], ['website', 'Website'], ['description', 'Description']],
        club:    [['name', 'Name'], ['category', 'Category'], ['description', 'Description']],
        event:   [['title', 'Title'], ['venue', 'Venue'], ['description', 'Description']],
    };
    const statusOptions = {
        college: ['APPROVED', 'PENDING', 'SUSPENDED', 'REJECTED'],
        club:    ['APPROVED', 'PENDING', 'SUSPENDED'],
        event:   ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'],
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-8 w-full max-w-lg shadow-2xl space-y-5">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-white capitalize">Edit {editModal.type}</h3>
                    <button onClick={closeEdit} className="text-slate-400 hover:text-white text-xl transition-colors">✕</button>
                </div>
                {(fieldMap[editModal.type] || []).map(([key, label]) => (
                    <div key={key}>
                        <label className="text-slate-400 text-xs uppercase tracking-wider block mb-1">{label}</label>
                        <input value={editForm[key] || ''}
                            onChange={e => setEditForm(p => ({ ...p, [key]: e.target.value }))}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500/50 transition-all" />
                    </div>
                ))}
                <div>
                    <label className="text-slate-400 text-xs uppercase tracking-wider block mb-1">Status</label>
                    <select value={editForm.status || ''}
                        onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500/50 appearance-none">
                        {(statusOptions[editModal.type] || []).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                {editModal.type === 'event' && (
                    <div>
                        <label className="text-slate-400 text-xs uppercase tracking-wider block mb-1">Event Date</label>
                        <input type="date" value={editForm.eventDate || ''}
                            onChange={e => setEditForm(p => ({ ...p, eventDate: e.target.value }))}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500/50 transition-all" />
                    </div>
                )}
                <div className="flex gap-3 pt-2">
                    <button onClick={closeEdit} className="flex-1 py-3 bg-white/5 text-slate-400 rounded-xl font-bold hover:bg-white/10 transition-all text-sm">Cancel</button>
                    <button onClick={handleSaveEdit} className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-black hover:opacity-90 transition-all text-sm shadow-[0_0_20px_rgba(99,102,241,0.3)]">Save Changes</button>
                </div>
            </div>
        </div>
    );
}

/* ─── DELETE CONFIRM ─────────────────────────────────────────── */
export function DeleteConfirm({ confirmDelete, setConfirmDelete, handleDeleteConfirmed }) {
    if (!confirmDelete) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-[#0f172a] border border-red-500/30 rounded-3xl p-8 w-full max-w-md shadow-2xl text-center space-y-5">
                <div className="text-5xl">⚠️</div>
                <h3 className="text-xl font-black text-white">Confirm Delete</h3>
                <p className="text-slate-400 text-sm">
                    Delete <span className="text-white font-bold">"{confirmDelete.name}"</span>? This cannot be undone.
                </p>
                <div className="flex gap-3">
                    <button onClick={() => setConfirmDelete(null)} className="flex-1 py-3 bg-white/5 text-slate-400 rounded-xl font-bold hover:bg-white/10 transition-all text-sm">Cancel</button>
                    <button onClick={handleDeleteConfirmed} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black hover:bg-red-500 transition-all text-sm">Delete</button>
                </div>
            </div>
        </div>
    );
}
