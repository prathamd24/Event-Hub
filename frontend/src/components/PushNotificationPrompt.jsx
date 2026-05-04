import { useState, useEffect } from 'react';
import { toast } from './Toast';

export default function PushNotificationPrompt() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        // Check if supported
        if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

        // Has already been asked or dismissed?
        const hasPrompted = localStorage.getItem('eventhub_push_prompted');
        if (hasPrompted === 'true') return;

        if (Notification.permission === 'default') {
            const timer = setTimeout(() => setShow(true), 3000); // show after 3 seconds
            return () => clearTimeout(timer);
        }
    }, []);

    const enablePush = async () => {
        try {
            const perm = await Notification.requestPermission();
            if (perm === 'granted') {
                toast('Notifications enabled!', 'success');
            } else {
                toast('Notifications blocked.', 'error');
            }
        } catch (e) {
            console.error(e);
        } finally {
            localStorage.setItem('eventhub_push_prompted', 'true');
            setShow(false);
        }
    };

    const dismiss = () => {
        localStorage.setItem('eventhub_push_prompted', 'true');
        setShow(false);
    };

    if (!show) return null;

    return (
        <div className="fixed bottom-0 sm:bottom-4 left-0 right-0 sm:left-auto sm:right-4 z-[200] sm:max-w-sm w-full animate-slideUp font-sans">
            <div className="bg-[#1e293b]/95 backdrop-blur-xl border border-white/10 sm:rounded-2xl rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] sm:shadow-2xl overflow-hidden p-6 flex flex-col gap-4">
                <div className="flex gap-4 items-start">
                    <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center flex-shrink-0 border border-indigo-500/30 text-2xl">
                        🔔
                    </div>
                    <div>
                        <h4 className="text-white font-bold text-sm tracking-tight">Enable Notifications</h4>
                        <p className="text-slate-400 text-xs mt-1 leading-relaxed">Stay updated on your registrations, upcoming events, and club announcements.</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={dismiss} className="flex-1 py-3 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all">Not Now</button>
                    <button onClick={enablePush} className="flex-1 py-3 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all uppercase tracking-widest">Enable</button>
                </div>
            </div>
        </div>
    );
}
