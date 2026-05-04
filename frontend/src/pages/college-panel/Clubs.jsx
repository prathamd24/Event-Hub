import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import ClubCard from '../../components/ClubCard';
import CreateClubModal from '../../components/modals/CreateClubModal';
import EditClubModal from '../../components/modals/EditClubModal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { toast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';

export default function CollegeAdminClubs() {
    const { user } = useAuth();
    const [clubs, setClubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingClub, setEditingClub] = useState(null);

    useEffect(() => { 
        fetchClubs(); 
        
        // Handle redirect result for Google account linking in the modal
        const checkRedirect = async () => {
            const shouldReopen = sessionStorage.getItem('reopen_create_club_modal');
            if (shouldReopen === 'true') {
                try {
                    const { getRedirectResult } = await import('firebase/auth');
                    const { auth } = await import('../../firebase');
                    const result = await getRedirectResult(auth);
                    
                    if (result) {
                        // modal should already be showing if we set isCreateOpen(true) in a separate hook or just now
                        setIsCreateOpen(true);
                        // The modal itself will handle restoring formData from sessionStorage if it sees it
                        toast('Google Account linked successfully!', 'success');
                    }
                } catch (error) {
                    console.error("Redirect link error:", error);
                } finally {
                    sessionStorage.removeItem('reopen_create_club_modal');
                }
            }
        };
        checkRedirect();
    }, []);

    const fetchClubs = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/college-admin/clubs');
            console.log("Clubs response:", res.data);
            const clubsList = Array.isArray(res.data)
                ? res.data
                : (res.data.clubs || []);
            setClubs(clubsList);
        } catch (error) {
            console.error("Failed to fetch clubs:", error);
            toast('Failed to load clubs', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (club) => {
        setEditingClub(club);
        setIsEditOpen(true);
    };

    const handleEditSuccess = (updatedClub) => {
        setClubs(prev => prev.map(c => c.id === updatedClub.id ? updatedClub : c));
    };

    const handleDelete = async (clubId, e) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this club? This action cannot be undone and will also delete the coordinator account.')) return;
        
        try {
            await api.delete(`/api/college-admin/clubs/${clubId}`);
            setClubs(prev => prev.filter(c => c.id !== clubId));
            toast('Club deleted successfully', 'success');
        } catch (error) {
            toast('Failed to delete club', 'error');
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6 animate-fadeIn pb-12 relative">
            <div className="fixed top-32 right-32 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
                <div>
                    <h1 className="text-3xl font-display font-black text-white">Manage Clubs</h1>
                    <p className="text-slate-400 text-sm mt-1 font-medium">Create and oversee all clubs in your college.</p>
                </div>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] flex items-center gap-2"
                >
                    ➕ Create Club
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                {clubs.length > 0 ? (
                    clubs.map(club => (
                        <div key={club.id} className="relative group">
                            <ClubCard club={club} />
                            {/* Actions overlay on hover */}
                            <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                                <Link
                                    to={`/club/dashboard/${club.id}`}
                                    className="bg-emerald-500 text-white border border-emerald-400 text-xs font-bold px-4 py-2 rounded-xl shadow-lg hover:bg-emerald-400 flex items-center justify-center gap-2 transition-colors"
                                >
                                    🛡️ Manage
                                </Link>
                                <button
                                    onClick={() => handleEdit(club)}
                                    className="bg-black/60 backdrop-blur-md text-white border border-white/20 text-xs font-bold px-4 py-2 rounded-xl shadow-lg hover:bg-indigo-500 hover:border-indigo-400 flex items-center justify-center gap-2 transition-colors"
                                >
                                    ✏️ Edit
                                </button>
                                <button
                                    onClick={(e) => handleDelete(club.id, e)}
                                    className="bg-black/60 backdrop-blur-md text-white border border-red-500/50 text-xs font-bold px-4 py-2 rounded-xl shadow-lg hover:bg-red-500 hover:border-red-400 flex items-center justify-center gap-2 transition-colors"
                                >
                                    🗑️ Delete
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center bg-white/5 backdrop-blur-xl rounded-3xl border border-dashed border-white/10">
                        <div className="text-6xl mb-4 opacity-50">🤝</div>
                        <h3 className="text-xl font-display font-bold text-white mb-2">No Clubs Yet</h3>
                        <p className="text-slate-400 font-medium">Click "Create Club" to start building your campus community.</p>
                    </div>
                )}
            </div>

            <CreateClubModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={() => { setIsCreateOpen(false); fetchClubs(); }}
            />
            <EditClubModal
                isOpen={isEditOpen}
                club={editingClub}
                onClose={() => { setIsEditOpen(false); setEditingClub(null); }}
                onSuccess={() => { setIsEditOpen(false); fetchClubs(); }}
            />
        </div>
    );
}
