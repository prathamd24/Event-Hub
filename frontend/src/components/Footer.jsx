import { Link } from 'react-router-dom';
import Logo from './Logo';

export default function Footer() {
    return (
        <footer className="w-full bg-[#0f172a] border-t border-white/5 mt-20 relative z-50">
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-2 space-y-4">
                        <Link to="/" className="w-fit block mb-2">
                            <Logo className="text-4xl" />
                        </Link>
                        <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
                            The ultimate platform for college events, clubs, and registrations. Experience seamless campus life without the FOMO.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div className="space-y-4">
                        <h4 className="text-white font-bold tracking-widest uppercase text-xs">Explore</h4>
                        <ul className="space-y-2">
                            <li><Link to="/events" className="text-slate-400 hover:text-indigo-400 text-sm transition-colors">All Events</Link></li>
                            <li><Link to="/colleges" className="text-slate-400 hover:text-indigo-400 text-sm transition-colors">Colleges</Link></li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div className="space-y-4">
                        <h4 className="text-white font-bold tracking-widest uppercase text-xs">Support</h4>
                        <ul className="space-y-2">
                            <li><Link to="/feedback" className="text-slate-400 hover:text-indigo-400 text-sm transition-colors">Feedback</Link></li>
                            <li><Link to="/register-college" className="text-slate-400 hover:text-indigo-400 text-sm transition-colors">Register College</Link></li>
                        </ul>
                    </div>
                    {/* Legal */}
                    <div className="space-y-4">
                        <h4 className="text-white font-bold tracking-widest uppercase text-xs">Legal</h4>
                        <ul className="space-y-2">
                            <li><Link to="/privacy" className="text-slate-400 hover:text-indigo-400 text-sm transition-colors">Privacy Policy</Link></li>
                            <li><Link to="/terms" className="text-slate-400 hover:text-indigo-400 text-sm transition-colors">Terms of Service</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/5 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-slate-500 text-xs text-center md:text-left">
                        © {new Date().getFullYear()} Event Hub. All rights reserved.
                    </p>
                    <div className="flex items-center gap-4 text-slate-500">
                        <span className="text-[10px] font-black uppercase tracking-widest">Built with ❤️ for Students</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
