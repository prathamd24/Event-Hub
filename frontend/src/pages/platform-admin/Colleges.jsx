import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from '../../components/Toast';
import CreateCollegeModal from '../../components/modals/CreateCollegeModal';
import LoadingSpinner from '../../components/LoadingSpinner';

const statusColors = {
    APPROVED:  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    PENDING:   'bg-amber-500/10  text-amber-400  border border-amber-500/20',
    REJECTED:  'bg-red-500/10    text-red-400    border border-red-500/20',
    SUSPENDED: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
};

export default function PlatformAdminColleges() {
    const [colleges, setColleges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    useEffect(() => { fetchColleges(); }, []);

    const fetchColleges = async () => {
        try {
            const res = await api.get('/api/platform-admin/colleges');
            setColleges(res.data);
        } catch {
            toast('Failed to load colleges', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove  = async (id) => { try { await api.put(`/api/platform-admin/colleges/${id}/approve`);  toast('Approved ✓', 'success'); fetchColleges(); } catch { toast('Failed', 'error'); } };
    const handleReject   = async (id) => { try { await api.put(`/api/platform-admin/colleges/${id}/reject`);   toast('Rejected',  'success'); fetchColleges(); } catch { toast('Failed', 'error'); } };
    const handleSuspend  = async (id) => { try { await api.put(`/api/platform-admin/colleges/${id}/suspend`);  toast('Suspended', 'success'); fetchColleges(); } catch { toast('Failed', 'error'); } };
    const handleSuccess  = (newCollege) => setColleges([newCollege, ...colleges]);

    if (loading) return <LoadingSpinner />;

    const filtered = colleges.filter(c => {
        const matchSearch = !search ||
            c.name?.toLowerCase().includes(search.toLowerCase()) ||
            (c.location || '').toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'All' || c.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const statuses = ['All', 'APPROVED', 'PENDING', 'SUSPENDED', 'REJECTED'];

    return (
        <div className="space-y-6 animate-fadeIn pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white">College Management</h1>
                    <p className="text-slate-400 text-sm mt-1">Onboard, approve, and manage connected institutions.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center gap-2 whitespace-nowrap text-sm"
                >
                    ➕ Add College
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search by name or location…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-sm text-white rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-500"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {statuses.map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                                statusFilter === s
                                    ? 'bg-indigo-500/20 text-white border-indigo-500/40'
                                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:bg-white/10'
                            }`}>{s}</button>
                    ))}
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['APPROVED','PENDING','SUSPENDED','REJECTED'].map(s => (
                    <div key={s} className={`rounded-2xl border px-4 py-3 ${statusColors[s] || 'bg-white/5 border-white/10'}`}>
                        <p className="text-xl font-black">{colleges.filter(c => c.status === s).length}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mt-0.5">{s}</p>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[700px]">
                        <thead className="text-xs text-slate-400 uppercase bg-black/20 border-b border-white/10">
                            <tr>
                                <th className="px-5 py-4 text-left font-bold tracking-wider">College</th>
                                <th className="px-5 py-4 text-left font-bold tracking-wider">Admin</th>
                                <th className="px-5 py-4 text-left font-bold tracking-wider">Location</th>
                                <th className="px-5 py-4 text-center font-bold tracking-wider">Clubs</th>
                                <th className="px-5 py-4 text-center font-bold tracking-wider">Events</th>
                                <th className="px-5 py-4 text-center font-bold tracking-wider">Status</th>
                                <th className="px-5 py-4 text-left font-bold tracking-wider">Added</th>
                                <th className="px-5 py-4 text-right font-bold tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filtered.length > 0 ? filtered.map(college => (
                                <tr key={college.id} className="hover:bg-white/5 transition-colors group">
                                    {/* College name */}
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs text-white font-bold shadow">
                                                {college.name.charAt(0)}
                                            </div>
                                            <span className="text-white font-semibold truncate max-w-[160px]" title={college.name}>{college.name}</span>
                                        </div>
                                    </td>
                                    {/* Admin */}
                                    <td className="px-5 py-4 text-slate-400 text-xs truncate max-w-[120px]" title={college.adminName}>
                                        {college.adminName || '—'}
                                    </td>
                                    {/* Location */}
                                    <td className="px-5 py-4 text-slate-400 text-xs truncate max-w-[120px]">
                                        {college.location || '—'}
                                    </td>
                                    {/* Clubs */}
                                    <td className="px-5 py-4 text-center text-indigo-400 font-bold">{college.clubCount ?? 0}</td>
                                    {/* Events */}
                                    <td className="px-5 py-4 text-center text-emerald-400 font-bold">{college.eventCount ?? 0}</td>
                                    {/* Status */}
                                    <td className="px-5 py-4 text-center">
                                        <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${statusColors[college.status] || 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                                            {college.status}{college.isVerified ? ' ✓' : ''}
                                        </span>
                                    </td>
                                    {/* Added */}
                                    <td className="px-5 py-4 text-slate-500 text-xs whitespace-nowrap">
                                        {college.createdAt ? new Date(college.createdAt).toLocaleDateString('en-IN') : '—'}
                                    </td>
                                    {/* Actions */}
                                    <td className="px-5 py-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {college.status !== 'APPROVED' && (
                                                <button onClick={() => handleApprove(college.id)} className="text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/30 px-3 py-1.5 rounded-lg transition-all font-semibold">Approve</button>
                                            )}
                                            {college.status === 'APPROVED' && (
                                                <button onClick={() => handleSuspend(college.id)} className="text-xs bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-white border border-orange-500/30 px-3 py-1.5 rounded-lg transition-all font-semibold">Suspend</button>
                                            )}
                                            {college.status !== 'REJECTED' && (
                                                <button onClick={() => handleReject(college.id)} className="text-xs bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30 px-3 py-1.5 rounded-lg transition-all font-semibold">Reject</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="8" className="text-center py-16 text-slate-500">
                                        <div className="text-4xl mb-3 opacity-40">🏢</div>
                                        <p className="font-medium">{search ? 'No colleges match your search.' : 'No colleges found.'}</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <CreateCollegeModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleSuccess}
            />
        </div>
    );
}
