import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CookieBanner() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('cookie-consent');
        if (!consent) {
            // Small delay to prevent immediate pop showing up aggressively
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const acceptCookies = () => {
        localStorage.setItem('cookie-consent', 'true');
        setIsVisible(false);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div 
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 z-50 md:max-w-md w-full bg-slate-800/90 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-2xl overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-3" onClick={() => setIsVisible(false)}>
                        <X className="w-4 h-4 text-slate-400 hover:text-white cursor-pointer transition-colors" />
                    </div>

                    <div className="flex items-start gap-4 pr-4">
                        <div className="p-2 bg-indigo-500/20 rounded-full shrink-0">
                            <Info className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-white font-semibold text-sm">We value your privacy</h3>
                            <p className="text-slate-400 text-xs leading-relaxed">
                                Event Hub uses cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. By continuing to use this site, you consent to our use of cookies.
                            </p>
                            
                            <div className="flex items-center gap-3 pt-2">
                                <button 
                                    onClick={acceptCookies}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 px-4 rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
                                >
                                    Accept All
                                </button>
                                <Link 
                                    to="/privacy" 
                                    onClick={() => setIsVisible(false)}
                                    className="text-slate-400 hover:text-white text-xs transition-colors"
                                >
                                    Privacy Policy
                                </Link>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
