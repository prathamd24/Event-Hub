import { useNavigate } from 'react-router-dom';
import { BACKEND_URL } from '../config';

const CollegeCard = ({ college }) => {
    const navigate = useNavigate();
    const BASE = BACKEND_URL;

    return (
        <div
            onClick={() => navigate(`/colleges/${college.id}`)}
            className="group relative bg-[#0f172a]/80 backdrop-blur-2xl rounded-[2.5rem] overflow-hidden cursor-pointer border border-white/10 hover:border-indigo-500/30 hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500 flex flex-col h-full z-10"
        >
            {/* Banner Section */}
            <div className="relative h-48 flex-shrink-0 overflow-hidden">
                {college.bannerUrl && (
                    <img
                        src={`${BASE}${college.bannerUrl}`}
                        alt="banner"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        onError={e => e.target.style.display = 'none'}
                    />
                )}
                {/* Immersive Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0f172a] to-transparent backdrop-blur-[2px]" />

            </div>

            {/* Logo - Centered and Floating */}
            <div className="absolute top-32 left-1/2 -translate-x-1/2 z-30">
                <div className="relative">
                    {/* Unique Glow Effect */}
                    <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="w-24 h-24 rounded-[1.8rem] border-[4px] border-[#0f172a] overflow-hidden bg-white flex items-center justify-center shadow-2xl relative z-10 group-hover:scale-105 transition-transform duration-500">
                        {college.logoUrl ? (
                            <img src={`${BASE}${college.logoUrl}`} alt="logo" className="w-full h-full object-contain p-2" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                <span className="text-white font-display font-black text-4xl">{college.name?.charAt(0).toUpperCase()}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Established Badge - Right Side Below Banner */}

            {/* Body */}
            <div className="px-8 pb-8 pt-12 flex-1 flex flex-col items-center text-center relative z-10">
                <h3 className="text-[#fef3c7] font-display font-black text-2xl tracking-tight leading-tight mb-3 group-hover:text-white transition-colors duration-300">
                    {college.name}
                </h3>
                
                <p className="text-[#818cf8] text-sm font-bold flex items-center gap-2 mb-2">
                    <span className="text-xs">📍</span> {college.location || 'Location TBA'}
                </p>

                {college.affiliation && (
                    <div className="mb-4">
                        <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest italic flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            Affiliated: {college.affiliation}
                        </span>
                    </div>
                )}

                {college.description && (
                    <p className="text-slate-400/80 text-sm line-clamp-2 leading-relaxed mb-8">
                        {college.description}
                    </p>
                )}

                {/* Stats Grid - 3 Premium Glass Blocks */}
                <div className="grid grid-cols-3 gap-3 w-full mb-8">
                    <div className="bg-[#1e293b]/50 border border-white/5 rounded-2xl py-4 group-hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all duration-300">
                        <p className="text-white font-display font-black text-2xl mb-1">{college.clubCount ?? 0}+</p>
                        <div className="flex flex-col items-center gap-1.5 grayscale group-hover:grayscale-0 transition-all">
                            <span className="text-xs">👥</span>
                            <span className="text-[8px] font-black text-slate-500 tracking-[0.2em] uppercase">Active Clubs</span>
                        </div>
                    </div>
                    
                    <div className="bg-[#1e293b]/50 border border-white/5 rounded-2xl py-4 group-hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all duration-300">
                        <p className="text-white font-display font-black text-2xl mb-1">{college.eventCount ?? 0}+</p>
                        <div className="flex flex-col items-center gap-1.5 grayscale group-hover:grayscale-0 transition-all">
                            <span className="text-xs">📅</span>
                            <span className="text-[8px] font-black text-slate-500 tracking-[0.2em] uppercase">Events</span>
                        </div>
                    </div>

                    <div className="bg-[#1e293b]/50 border border-white/5 rounded-2xl py-4 group-hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all duration-300">
                        <p className="text-white font-display font-black text-2xl mb-1">{college.studentCount ?? 0}+</p>
                        <div className="flex flex-col items-center gap-1.5 grayscale group-hover:grayscale-0 transition-all">
                            <span className="text-xs">👨‍🎓</span>
                            <span className="text-[8px] font-black text-slate-500 tracking-[0.2em] uppercase">Students</span>
                        </div>
                    </div>
                </div>

                {/* Website Link */}
                {college.website && String(college.website).trim() && (
                    <div className="w-full">
                        <div
                            onClick={e => {
                                e.stopPropagation();
                                window.open(college.website, '_blank');
                            }}
                            className="w-full inline-flex items-center justify-center gap-2 text-sm font-black text-indigo-300 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 py-3 rounded-2xl transition-all group/link cursor-pointer hover:shadow-lg hover:shadow-indigo-500/5"
                        >
                            <span className="text-xs group-hover/link:rotate-45 transition-transform duration-300">🔗</span>
                            {String(college.website).replace(/^https?:\/\//, '').split('/')[0]}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CollegeCard;
