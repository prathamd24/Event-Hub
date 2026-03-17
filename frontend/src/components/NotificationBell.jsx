import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function NotificationBell() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const fetchNotifications = async () => {
        if (!user) return;
        try {
            const res = await api.get('/api/notifications');
            setNotifications(res.data.notifications || res.data || []);
            setUnreadCount(res.data.unreadCount || 0);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, [user]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id) => {
        try {
            await api.post(`/api/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Error marking read:', err);
        }
    };

    const markAllRead = async () => {
        try {
            await api.post('/api/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Error marking all read:', err);
        }
    };

    if (!user) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-300"
            >
                <span className="text-xl">🔔</span>
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-[#0f172a] animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown container */}
            {isOpen && (
                <div className="absolute right-0 mt-3 w-84 bg-[#1e293b]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/5">
                        <h3 className="font-bold text-white text-sm tracking-tight">Notifications</h3>
                        {unreadCount > 0 && (
                            <button 
                                onClick={markAllRead}
                                className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[70vh] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-12 text-center">
                                <span className="text-4xl block mb-3 opacity-20">📭</span>
                                <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">All caught up!</p>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                {notifications.map(n => (
                                    <Link
                                        key={n.id}
                                        to={n.link || '#'}
                                        onClick={() => {
                                            if (!n.isRead) markAsRead(n.id);
                                            setIsOpen(false);
                                        }}
                                        className={`group block p-5 transition-all duration-200 hover:bg-white/[0.03] border-b border-white/5 last:border-0 ${!n.isRead ? 'bg-indigo-500/5' : ''}`}
                                    >
                                        <div className="flex gap-4">
                                            <div className="mt-1">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg border transition-all ${
                                                    !n.isRead ? 'bg-indigo-500/20 border-indigo-500/30 shadow-lg shadow-indigo-500/10' : 'bg-slate-800/50 border-white/5 group-hover:bg-slate-800'
                                                }`}>
                                                    {n.type === 'EVENT_OFFER' ? '🎁' : 
                                                     n.type === 'OFFER_ACCEPTED' ? '✅' :
                                                     n.type === 'NEW_REGISTRATION' ? '✍️' : 
                                                     n.type === 'BROADCAST' ? '📢' : '🔔'}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className={`text-sm font-bold truncate ${!n.isRead ? 'text-white' : 'text-slate-400'}`}>
                                                        {n.title}
                                                    </p>
                                                    {!n.isRead && (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]" />
                                                    )}
                                                </div>
                                                <p className={`text-[11px] leading-relaxed line-clamp-2 ${!n.isRead ? 'text-slate-300' : 'text-slate-500/80 font-medium'}`}>
                                                    {n.message}
                                                </p>
                                                <p className="text-[9px] text-slate-500 mt-2 font-black uppercase tracking-widest opacity-60">
                                                    {new Date(n.createdAt).toLocaleDateString(undefined, {
                                                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-white/5 bg-white/5 text-center">
                        <button className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-all">
                            View all activity
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
