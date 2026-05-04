import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import { BACKEND_URL } from '../../config';

export default function CollegeAdminClubDetail() {
    const { id } = useParams();
    const [club, setClub] = useState(null);
    const [events, setEvents] = useState([]);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchClubData = async () => {
            try {
                const [clubRes, eventsRes] = await Promise.all([
                    api.get(`/api/public/colleges/clubs/${id}`),
                    api.get(`/api/public/events?clubId=${id}`)
                ]);

                // For members, we can fetch from a specific college admin endpoint if available,
                // but for now, we'll try to get it if the backend supports it, or use empty array.
                let membersData = [];
                try {
                    const memRes = await api.get(`/api/club/members`); // Note: college admin may not have explicit member route for clubs unless added. Let's assume public club detail has basic member counts or we just list events here.
                    // Instead, let's just focus on events and club info for college admin view unless we build a specific members endpoint.
                } catch (e) { }

                setClub(clubRes.data.club);
                setEvents(eventsRes.data);
                setMembers(membersData);
            } catch (error) {
                toast('Failed to load club details', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchClubData();
    }, [id]);

    const handleApprove = async () => {
        try {
            await api.put(`/api/college-admin/clubs/${id}/approve`);
            setClub({ ...club, status: 'APPROVED' });
            toast('Club approved successfully', 'success');
        } catch (error) {
            toast('Failed to approve club', 'error');
        }
    };

    if (loading) return <LoadingSpinner />;
    if (!club) return <div className="text-white">Club not found.</div>;

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-start mb-4">
                <Link to="/college-panel/clubs" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-2 text-sm font-medium">
                    ← Back to Clubs
                </Link>
            </div>

            <div className="bg-[#1e293b] rounded-xl border border-slate-700 overflow-hidden shadow-lg p-6 lg:p-8 relative">
                {club.status === 'PENDING' && (
                    <div className="absolute top-6 right-6 flex flex-col items-end gap-3">
                        <span className="bg-amber-500/20 text-amber-500 text-sm font-bold px-3 py-1 rounded-full">Pending Approval</span>
                        <button onClick={handleApprove} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-emerald-500/20 transition-colors">
                            Approve Club
                        </button>
                    </div>
                )}

                <div className="flex flex-col md:flex-row gap-6 lg:gap-8">
                    <div className="w-32 h-32 rounded-2xl bg-slate-800 border-2 border-slate-700 flex-shrink-0 flex items-center justify-center p-2">
                        {club.logoUrl ? (
                            <img src={club.logoUrl.startsWith('http') ? club.logoUrl : `${BACKEND_URL}${club.logoUrl}`} alt="Logo" className="w-full h-full object-contain rounded-xl bg-white" />
                        ) : (
                            <span className="text-4xl font-bold text-slate-500">{club.name.charAt(0)}</span>
                        )}
                    </div>

                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-white mb-2">{club.name}</h1>
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                            <span className="bg-slate-800 text-slate-300 text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-700">
                                {club.category}
                            </span>
                            <span className="text-slate-400 text-sm flex items-center gap-1.5">
                                <span className="opacity-70">👥</span> {club.memberCount} Members
                            </span>
                        </div>
                        <p className="text-slate-300 text-base leading-relaxed max-w-3xl">
                            {club.description}
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-8">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <span className="text-indigo-400 border border-indigo-500/30 bg-indigo-500/10 w-8 h-8 rounded-lg flex items-center justify-center">📅</span>
                    Club Events
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.length > 0 ? (
                        events.map(event => (
                            <EventCard key={event.id} event={event} />
                        ))
                    ) : (
                        <div className="col-span-full py-12 text-center text-slate-500 bg-[#1e293b] rounded-xl border border-slate-700">
                            No events organized by this club yet.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
