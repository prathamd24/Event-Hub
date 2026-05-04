export default function StatsCard({ title, value, icon, color = 'indigo' }) {
    const colorMap = {
        indigo: 'text-indigo-400 bg-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)] border border-indigo-500/30',
        emerald: 'text-emerald-400 bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)] border border-emerald-500/30',
        amber: 'text-amber-400 bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)] border border-amber-500/30',
        purple: 'text-purple-400 bg-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.2)] border border-purple-500/30',
        red: 'text-red-400 bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)] border border-red-500/30',
        slate: 'text-slate-400 bg-slate-500/20 border border-slate-500/30'
    };

    return (
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl flex items-center gap-5 hover:bg-white/10 transition-all duration-300 relative overflow-hidden group">
            {/* Subtle glow effect on hover */}
            <div className={`absolute -inset-2 ${colorMap[color]?.split(' ')[0].replace('text-', 'bg-')}/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
            
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl relative z-10 shrink-0 ${colorMap[color] || colorMap.indigo}`}>
                {icon}
            </div>
            <div className="relative z-10">
                <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">{title}</p>
                <h3 className="text-2xl font-black text-white mt-1 drop-shadow-md">{value}</h3>
            </div>
        </div>
    );
}
