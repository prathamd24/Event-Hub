import { NavLink } from 'react-router-dom';

export default function Sidebar({ links }) {
    return (
        <aside className="fixed bottom-0 left-0 w-full z-50 bg-[#0f172a]/95 backdrop-blur-xl border-t border-white/10 md:relative md:w-full md:bg-transparent md:border-none md:p-6 flex md:block">
            <div className="hidden md:block absolute top-0 left-0 w-32 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
            
            <nav className="flex flex-row w-full justify-around items-center p-2 md:p-0 md:space-y-2 md:flex-col md:relative md:z-10 overflow-x-auto no-scrollbar gap-1">
                {links.map((link) => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        end={link.end}
                        className={({ isActive }) =>
                            `relative flex flex-col md:flex-row items-center justify-center md:justify-between px-2 md:px-4 py-2 md:py-3.5 rounded-xl text-[10px] md:text-sm font-bold transition-all duration-300 min-w-[70px] flex-shrink-0 ${
                                isActive
                                    ? 'bg-indigo-500/20 text-white shadow-[0_4px_20px_rgba(99,102,241,0.15)] md:border border-indigo-500/30'
                                    : 'text-slate-400 hover:bg-white/5 hover:text-white md:border border-transparent'
                            }`
                        }
                    >
                        <div className="flex flex-col md:flex-row items-center gap-1 md:gap-3">
                            <span className="text-xl md:text-lg opacity-80">{link.icon}</span>
                            <span className="truncate whitespace-nowrap">{link.label}</span>
                        </div>
                        {link.badge && (
                            <span className="absolute top-1 right-2 md:relative md:top-auto md:right-auto bg-indigo-500 text-white text-[10px] font-black px-1.5 md:px-2 py-0.5 rounded-full shadow-lg shadow-indigo-500/40 animate-bounce">
                                {link.badge}
                            </span>
                        )}
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
}

