import { useState, useEffect } from 'react';
import api from '../services/api';
import CollegeCard from '../components/CollegeCard';

const CollegesPage = () => {
    const [colleges, setColleges] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/api/public/colleges')
            .then(res => setColleges(res.data))
            .finally(() => setLoading(false));
    }, []);

    const filtered = colleges.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.location?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-900 p-8">
            <h1 className="text-3xl font-bold text-white mb-2">Browse Colleges</h1>
            <p className="text-slate-400 mb-6">{colleges.length} colleges on the platform</p>

            <input
                type="text"
                placeholder="Search colleges by name or location..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-800 text-white border border-slate-600 rounded-xl px-4 py-3 mb-8 focus:outline-none focus:border-indigo-500"
            />

            {loading ? (
                <div className="text-center text-white">Loading...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center text-slate-400">No colleges found</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map(c => <CollegeCard key={c.id} college={c} />)}
                </div>
            )}
        </div>
    );
};

export default CollegesPage;
