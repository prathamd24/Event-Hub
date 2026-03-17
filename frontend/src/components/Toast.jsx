import { useState, useEffect } from 'react';

// Toast store
let toastFn = null;

export function toast(message, type = 'success') {
    if (toastFn) toastFn(message, type);
}

export default function ToastContainer() {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        toastFn = (message, type) => {
            const id = Date.now() + Math.random();
            setToasts(prev => [...prev, { id, message, type }]);
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, 3000);
        };
    }, []);

    const styles = {
        success: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
        error: 'bg-red-500/20 border-red-500/30 text-red-400',
        info: 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400'
    };

    const icons = {
        success: <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>,
        error: <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>,
        info: <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
    };

    return (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
            {toasts.map(t => (
                <div key={t.id} className={`${styles[t.type] || styles.info} backdrop-blur-xl border px-4 py-3 rounded-2xl shadow-2xl min-w-[300px] max-w-sm pointer-events-auto flex items-start gap-3 animate-fadeIn`}>
                    <div className="mt-0.5">{icons[t.type] || icons.info}</div>
                    <span className="text-sm font-medium leading-relaxed">{t.message}</span>
                </div>
            ))}
        </div>
    );
}
