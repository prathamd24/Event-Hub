import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from '../../components/Toast';
import CreateCollegeModal from '../../components/modals/CreateCollegeModal';
import LoadingSpinner from '../../components/LoadingSpinner';

const statusColors = {
    APPROVED: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
    PENDING: 'bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]',
    REJECTED: 'bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]',
    SUSPENDED: 'bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.2)]',
};

export default function PlatformAdminColleges() {
    const [colleges, setColleges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [search, setSearch] = useState('');

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

    const handleApprove = async (collegeId) => {
        try {
            await api.put(`/api/platform-admin/colleges/${collegeId}/approve`);
            toast('College approved successfully', 'success');
            fetchColleges();
        } catch { toast('Failed to approve college', 'error'); }
    };

    const handleReject = async (collegeId) => {
        try {
            await api.put(`/api/platform-admin/colleges/${collegeId}/reject`);
            toast('College rejected', 'success');
            fetchColleges();
        } catch { toast('Failed to reject college', 'error'); }
    };

    const handleSuspend = async (collegeId) => {
        try {
            await api.put(`/api/platform-admin/colleges/${collegeId}/suspend`);
            toast('College suspended', 'success');
            fetchColleges();
        } catch { toast('Failed to suspend college', 'error'); }
    };

    const handleSuccess = (newCollege) => setColleges([newCollege, ...colleges]);

    if (loading) return <LoadingSpinner />;

    const filtered = colleges.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.location || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.status || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fadeIn pb-12 relative">
            <div className="fixed top-32 right-32 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
                <div>
                    <h1 className="text-3xl font-display font-black text-white">College Management</h1>
                    <p className="text-slate-400 text-sm mt-1 font-medium">Onboard, approve, and manage connected institutions.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    <div className="relative group">
                        <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        <input
                            type="text"
                            placeholder="Search by name, location, status..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-white/5 border border-white/10 text-sm text-white rounded-xl pl-12 pr-4 py-3 w-72 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all shadow-inner font-medium placeholder:text-slate-500"
                        />
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] flex items-center gap-2 whitespace-nowrap"
                    >
                        ➕ Add College
                    </button>
                </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl relative z-10">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300 block md:table">
                        <thead className="hidden md:table-header-group text-xs text-slate-400 uppercase bg-black/20 border-b border-white/10">
                            <tr>
                                <th scope="col" className="px-6 py-5 font-bold tracking-wider">College Name</th>
                                <th scope="col" className="px-6 py-5 font-bold tracking-wider">Location</th>
                                <th scope="col" className="px-6 py-5 text-center font-bold tracking-wider">Clubs</th>
                                <th scope="col" className="px-6 py-5 text-center font-bold tracking-wider">Events</th>
                                <th scope="col" className="px-6 py-5 font-bold tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-5 text-right font-bold tracking-wider">Added On</th>
                                <th scope="col" className="px-6 py-5 text-right font-bold tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 block md:table-row-group">
                            {filtered.length > 0 ? (
                                filtered.map((college) => (
                                    <tr key={college.id} className="hover:bg-white/5 transition-colors group flex flex-col md:table-row border-b border-white/5 md:border-0 mb-4 md:mb-0">
                                        <td className="px-4 py-3 md:px-6 md:py-5 font-bold text-white flex items-center gap-3 block md:table-cell relative border-b border-white/5 md:border-0">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs text-white shadow-lg shrink-0">
                                                {college.name.charAt(0)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="md:hidden text-[10px] text-slate-500 uppercase font-black tracking-widest italic mb-1">College Name</span>
                                                {college.name}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 md:px-6 md:py-5 text-slate-400 font-medium block md:table-cell relative border-b border-white/5 md:border-0">
                                            <div className="md:hidden text-[10px] text-slate-500 uppercase font-black tracking-widest italic mb-1">Location</div>
                                            {college.location || '-'}
                                        </td>
                                        <td className="px-4 py-3 md:px-6 md:py-5 text-left md:text-center font-bold text-indigo-400 bg-indigo-500/5 block md:table-cell relative border-b border-white/5 md:border-0">
                                            <div className="md:hidden text-[10px] text-slate-500 uppercase font-black tracking-widest italic mb-1 text-slate-400">Clubs</div>
                                            {college.clubCount}
                                        </td>
                                        <td className="px-4 py-3 md:px-6 md:py-5 text-left md:text-center font-bold text-emerald-400 bg-emerald-500/5 block md:table-cell relative border-b border-white/5 md:border-0">
                                            <div className="md:hidden text-[10px] text-slate-500 uppercase font-black tracking-widest italic mb-1 text-slate-400">Events</div>
                                            {college.eventCount}
                                        </td>
                                        <td className="px-4 py-3 md:px-6 md:py-5 block md:table-cell relative border-b border-white/5 md:border-0">
                                            <div className="md:hidden text-[10px] text-slate-500 uppercase font-black tracking-widest italic mb-1">Status</div>
                                            <span className={`text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-wider ${statusColors[college.status] || 'bg-slate-800/50 text-slate-400 border border-slate-700'}`}>
                                                {college.status}
                                                {college.isVerified && ' ✓'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 md:px-6 md:py-5 text-left md:text-right whitespace-nowrap text-slate-400 font-medium block md:table-cell relative border-b border-white/5 md:border-0">
                                            <div className="md:hidden text-[10px] text-slate-500 uppercase font-black tracking-widest italic mb-1">Added On</div>
                                            {college.createdAt ? new Date(college.createdAt).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-4 py-3 md:px-6 md:py-5 text-left md:text-right block md:table-cell relative">
                                            <div className="md:hidden text-[10px] text-slate-500 uppercase font-black tracking-widest italic mb-2">Actions</div>
                                            <div className="flex gap-2 md:justify-end flex-wrap md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                {college.status !== 'APPROVED' && (
                                                    <button onClick={() => handleApprove(college.id)} className="text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/30 px-3 py-2 rounded-lg transition-all font-bold shadow-sm">Approve</button>
                                                )}
                                                {college.status === 'APPROVED' && (
                                                    <button onClick={() => handleSuspend(college.id)} className="text-xs bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-white border border-orange-500/30 px-3 py-2 rounded-lg transition-all font-bold shadow-sm">Suspend</button>
                                                )}
                                                {college.status !== 'REJECTED' && (
                                                    <button onClick={() => handleReject(college.id)} className="text-xs bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30 px-3 py-2 rounded-lg transition-all font-bold shadow-sm">Reject</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500 bg-white/5 block md:table-cell">
                                        <div className="text-4xl mb-3 opacity-50">🏢</div>
                                        <p className="font-medium">{search ? 'No colleges match your search.' : 'No colleges found. Click "Add College" to onboard an institution.'}</p>
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
