import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

export default function NotificationsPage() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL'); // ALL, UNREAD, READ

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/api/notifications?limit=50');
            setNotifications(res.data.notifications || []);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchNotifications();
        }
    }, [user]);

    const markAsRead = async (id) => {
        try {
            await api.post(`/api/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        } catch (err) {
            console.error('Error marking read:', err);
        }
    };

    const markAllRead = async () => {
        try {
            await api.post('/api/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (err) {
            console.error('Error marking all read:', err);
        }
    };

    const deleteNotification = async (id, e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await api.delete(`/api/notifications/${id}`);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (err) {
            console.error('Error deleting notification:', err);
        }
    };

    const filteredNotifications = notifications.filter(n => {
        if (filter === 'UNREAD') return !n.isRead;
        if (filter === 'READ') return n.isRead;
        return true;
    });

    if (loading) return <LoadingSpinner />;

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 animate-fadeIn">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-display font-black text-white">Notifications</h1>
                    <p className="text-slate-400 mt-2">Stay updated with your latest alerts and activity.</p>
                </div>
                <div className="flex items-center gap-4">
                    <select 
                        value={filter} 
                        onChange={(e) => setFilter(e.target.value)}
                        className="bg-slate-800 border border-slate-700 text-white text-xs font-bold uppercase tracking-widest rounded-xl px-3 py-2 outline-none focus:border-indigo-500 transition-colors"
                    >
                        <option value="ALL">All</option>
                        <option value="UNREAD">Unread</option>
                        <option value="READ">Read</option>
                    </select>
                    {notifications.some(n => !n.isRead) && (
                        <button 
                            onClick={markAllRead}
                            className="text-xs font-black uppercase tracking-widest text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 px-4 py-2 rounded-xl transition-all"
                        >
                            Mark all as read
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                {filteredNotifications.length === 0 ? (
                    <div className="p-20 text-center">
                        <span className="text-6xl block mb-6 opacity-20">📭</span>
                        <h3 className="text-xl font-bold text-white mb-2">No notifications found</h3>
                        <p className="text-slate-500">You're all caught up! New activity will appear here.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {filteredNotifications.map(n => (
                            <Link
                                key={n.id}
                                to={n.link || '#'}
                                onClick={() => { if (!n.isRead) markAsRead(n.id); }}
                                className={`group flex gap-5 p-6 transition-all duration-300 hover:bg-white/[0.03] ${!n.isRead ? 'bg-indigo-500/5' : ''}`}
                            >
                                <div className="mt-1 flex-shrink-0">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl border transition-all ${
                                        !n.isRead ? 'bg-indigo-500/20 border-indigo-500/30 shadow-lg shadow-indigo-500/20' : 'bg-slate-800 border-white/5 group-hover:bg-slate-700'
                                    }`}>
                                        {n.type === 'EVENT_OFFER' ? '🎁' : 
                                         n.type === 'OFFER_ACCEPTED' ? '✅' :
                                         n.type === 'NEW_REGISTRATION' ? '✍️' : 
                                         n.type === 'BROADCAST' ? '📢' : '🔔'}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4 mb-2">
                                        <h4 className={`text-base font-bold ${!n.isRead ? 'text-white' : 'text-slate-300'} group-hover:text-indigo-400 transition-colors`}>
                                            {n.title}
                                        </h4>
                                        <span className="text-xs text-slate-500 font-bold uppercase tracking-widest flex-shrink-0 whitespace-nowrap mt-1">
                                            {new Date(n.createdAt).toLocaleDateString(undefined, {
                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                    <p className={`text-sm leading-relaxed ${!n.isRead ? 'text-slate-300' : 'text-slate-500'}`}>
                                        {n.message}
                                    </p>
                                </div>
                                {!n.isRead && (
                                    <div className="flex items-center justify-center flex-shrink-0">
                                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.6)]" />
                                    </div>
                                )}
                                <div className="flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity pl-2">
                                    <button 
                                        onClick={(e) => deleteNotification(n.id, e)}
                                        className="text-slate-500 hover:text-rose-400 p-2 rounded-lg hover:bg-rose-500/10 transition-colors"
                                        title="Delete notification"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
