import { useNavigate } from 'react-router-dom';
import { BACKEND_URL } from '../config';

const categoryGradients = {
    Technical: 'from-blue-900 to-slate-900',
    Sports: 'from-green-900 to-slate-900',
    Cultural: 'from-purple-900 to-slate-900',
    Literary: 'from-amber-900 to-slate-900',
    Management: 'from-cyan-900 to-slate-900',
    Alumni: 'from-rose-900 to-slate-900',
    Other: 'from-slate-800 to-slate-900',
};

const categoryAccents = {
    Technical: 'bg-blue-600',
    Sports: 'bg-green-600',
    Cultural: 'bg-purple-600',
    Literary: 'bg-amber-600',
    Management: 'bg-cyan-600',
    Alumni: 'bg-rose-600',
    Other: 'bg-slate-600',
};

const ClubCard = ({ club }) => {
    const navigate = useNavigate();
    const BASE = BACKEND_URL;
    const gradient = categoryGradients[club.category] || categoryGradients.Other;
    const accent = categoryAccents[club.category] || categoryAccents.Other;

    return (
        <div
            onClick={() => navigate(`/clubs/${club.id}`)}
            className="group bg-slate-800 rounded-2xl overflow-hidden cursor-pointer border border-slate-700 hover:border-purple-500/60 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 hover:-translate-y-1 flex flex-col h-full"
        >
            {/* Cover banner — taller so the logo row below never overlaps */}
            <div className={`relative h-24 bg-gradient-to-br ${gradient} overflow-hidden flex-shrink-0`}>
                {club.coverUrl && (
                    <img
                        src={`${BASE}${club.coverUrl}`}
                        className="w-full h-full object-cover opacity-40 transition-transform duration-500 group-hover:scale-105"
                        alt="cover"
                        onError={e => e.target.style.display = 'none'}
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-800/70 to-transparent" />
                <div className={`absolute top-2 left-3 ${accent} text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded shadow-lg`}>
                    {club.category}
                </div>
            </div>

            {/* Logo row — completely below the banner, not overlapping */}
            <div className="flex items-center px-4 pt-3 pb-1 gap-3">
                <div className={`w-12 h-12 rounded-xl border-2 border-slate-700 overflow-hidden ${accent} flex items-center justify-center shadow-md flex-shrink-0`}>
                    {club.logoUrl ? (
                        <img src={`${BASE}${club.logoUrl}`} className="w-full h-full object-cover" alt="logo" onError={e => e.target.style.display = 'none'} />
                    ) : (
                        <span className="text-white font-bold text-base">{club.name?.charAt(0)}</span>
                    )}
                </div>
                <div className="min-w-0">
                    <h3 className="text-white font-bold text-sm line-clamp-1 group-hover:text-purple-300 transition-colors">{club.name}</h3>
                    {club.coordinatorName && (
                        <p className="text-slate-500 text-xs flex items-center gap-1">👤 {club.coordinatorName}</p>
                    )}
                </div>
            </div>

            {/* Body */}
            <div className="px-4 pb-4 flex-1 flex flex-col">
                <p className="text-slate-400 text-sm line-clamp-2 flex-1">{club.description || 'No description provided.'}</p>

                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-700/60 text-xs text-slate-400">
                    <div className="flex items-center gap-1">
                        <span>📅</span>
                        <span className="font-bold text-white">{club.eventCount ?? 0}</span>
                        <span>Events</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClubCard;
