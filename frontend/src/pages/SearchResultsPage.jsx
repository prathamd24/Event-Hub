import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

function ResultCard({ type, item }) {
    if (type === 'college') {
        return (
            <Link to={`/colleges/${item.id}`} className="block bg-[#1e293b] border border-slate-700 rounded-xl p-5 hover:border-blue-500/50 hover:bg-slate-800/60 transition-all group">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-2xl flex-shrink-0">
                        🏫
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-1">College</p>
                        <h3 className="font-bold text-white group-hover:text-blue-300 transition-colors truncate">{item.name}</h3>
                        {item.location && <p className="text-slate-400 text-sm mt-1 truncate">📍 {item.location}</p>}
                        <div className="flex gap-4 mt-2 text-xs text-slate-500">
                            <span>{item.clubCount} Clubs</span>
                            <span>{item.eventCount} Events</span>
                        </div>
                    </div>
                </div>
            </Link>
        );
    }
    if (type === 'event') {
        return (
            <Link to={`/events/${item.id}`} className="block bg-[#1e293b] border border-slate-700 rounded-xl p-5 hover:border-purple-500/50 hover:bg-slate-800/60 transition-all group">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-2xl flex-shrink-0">
                        📅
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-semibold text-purple-400 uppercase tracking-wide mb-1">Event</p>
                        <h3 className="font-bold text-white group-hover:text-purple-300 transition-colors truncate">{item.title}</h3>
                        {item.collegeName && <p className="text-slate-400 text-sm mt-1 truncate">🏫 {item.collegeName}</p>}
                        <div className="flex gap-4 mt-2 text-xs text-slate-500">
                            {item.eventDate && <span>📆 {new Date(item.eventDate).toLocaleDateString()}</span>}
                            {item.category && <span>#{item.category}</span>}
                        </div>
                    </div>
                </div>
            </Link>
        );
    }
    if (type === 'club') {
        return (
            <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-5">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl flex-shrink-0">
                        🤝
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-1">Club</p>
                        <h3 className="font-bold text-white truncate">{item.name}</h3>
                        {item.category && <p className="text-slate-400 text-sm mt-1">#{item.category}</p>}
                        <div className="flex gap-4 mt-2 text-xs text-slate-500">
                            <span>{item.memberCount} Members</span>
                            <span>{item.eventCount} Events</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    return null;
}

function Section({ title, icon, items, type }) {
    if (!items || items.length === 0) return null;
    return (
        <div>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>{icon}</span> {title}
                <span className="text-sm text-slate-400 font-normal">({items.length} result{items.length !== 1 ? 's' : ''})</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map(item => <ResultCard key={item.id} type={type} item={item} />)}
            </div>
        </div>
    );
}

export default function SearchResultsPage() {
    const [searchParams] = useSearchParams();
    const q = searchParams.get('q') || '';
    const [results, setResults] = useState({ colleges: [], events: [], clubs: [] });
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    useEffect(() => {
        if (!q || q.length < 2) {
            setSearched(false);
            return;
        }
        const fetch = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/api/public/search?q=${encodeURIComponent(q)}`);
                setResults(res.data);
                setSearched(true);
            } catch (err) {
                console.error('Search failed', err);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [q]);

    const totalResults = (results.colleges?.length || 0) + (results.events?.length || 0) + (results.clubs?.length || 0);

    return (
        <div className="space-y-8 animate-fadeIn">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Search Results</h1>
                {q && searched && !loading && (
                    <p className="text-slate-400">
                        Found <span className="text-white font-semibold">{totalResults}</span> result{totalResults !== 1 ? 's' : ''} for &quot;<span className="text-blue-400">{q}</span>&quot;
                    </p>
                )}
                {q && !searched && !loading && (
                    <p className="text-slate-400">Enter at least 2 characters to search.</p>
                )}
            </div>

            {loading && <LoadingSpinner />}

            {!loading && searched && totalResults === 0 && (
                <div className="text-center py-16 bg-[#1e293b] rounded-xl border border-slate-700">
                    <div className="text-5xl mb-4">🔍</div>
                    <h3 className="text-xl font-bold text-white mb-2">No results found</h3>
                    <p className="text-slate-400">Try a different search term or browse colleges and events directly.</p>
                </div>
            )}

            {!loading && searched && totalResults > 0 && (
                <div className="space-y-10">
                    <Section title="Colleges" icon="🏫" items={results.colleges} type="college" />
                    <Section title="Events" icon="📅" items={results.events} type="event" />
                    <Section title="Clubs" icon="🤝" items={results.clubs} type="club" />
                </div>
            )}
        </div>
    );
}
