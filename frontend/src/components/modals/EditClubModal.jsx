import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { toast } from '../../components/Toast';
import { BACKEND_URL } from '../../config';

export default function EditClubModal({ isOpen, onClose, onSuccess, club }) {
    const BASE = BACKEND_URL;
    const [loading, setLoading] = useState(false);
    const [logo, setLogo] = useState(null);
    const [cover, setCover] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [coverPreview, setCoverPreview] = useState(null);

    const [formData, setFormData] = useState({
        name: '', description: '', category: 'Technical', instagram: ''
    });

    const [clubPhotos, setClubPhotos] = useState([]);
    const [photoDragging, setPhotoDragging] = useState(false);
    const photoInputRef = useRef(null);

    // CATEGORY LOGIC
    const [categories, setCategories] = useState([]);
    const [showCustomCategory, setShowCustomCategory] = useState(false);
    const [customCategory, setCustomCategory] = useState('');

    // COORDINATOR LOGIC
    const [coordinators, setCoordinators] = useState([]);
    const [newCoordinator, setNewCoordinator] = useState({ name: '', email: '', password: '' });
    const [showAddCoordinator, setShowAddCoordinator] = useState(false);
    const [savingCoordinatorId, setSavingCoordinatorId] = useState(null);

    const prevClubId = useRef(null);

    useEffect(() => {
        if (club && isOpen) {
            // Only initialize if it's a different club OR if it hasn't been initialized yet for this open session
            if (prevClubId.current !== club.id) {
                setFormData({
                    name: club.name || '',
                    description: club.description || '',
                    category: club.category || 'Technical',
                    instagram: club.instagram || ''
                });
                setLogoPreview(club.logoUrl ? `${BASE}${club.logoUrl}` : null);
                setCoverPreview(club.coverUrl ? `${BASE}${club.coverUrl}` : null);

                // Fetch generic references
                api.get('/api/college-admin/categories')
                   .then(res => {
                       const cats = res.data.categories || [];
                       setCategories(cats);
                       if (club.category && !cats.includes(club.category)) {
                           setFormData(prev => ({ ...prev, category: 'Other' }));
                           setShowCustomCategory(true);
                           setCustomCategory(club.category);
                       } else {
                           setShowCustomCategory(false);
                           setCustomCategory('');
                       }
                   })
                   .catch(err => console.error("Failed to load categories", err));

                // Fetch coordinators
                if (club.id) {
                    api.get(`/api/college-admin/clubs/${club.id}/coordinators`)
                       .then(res => setCoordinators(res.data.coordinators || []))
                       .catch(err => console.error("Failed to load coordinators", err));

                    // Load photos
                    const existing = (club.photos || []).map(url => ({
                        file: null, preview: `${BASE}${url}`, existing: true, url
                    }));
                    setClubPhotos(existing);
                }
                
                prevClubId.current = club.id;
            }
        } else if (!isOpen) {
            // Reset when closed so it can re-init next time
            prevClubId.current = null;
        }
    }, [club, isOpen, BASE]);

    if (!isOpen) return null;

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleCategoryChange = (e) => {
        const val = e.target.value;
        if (val === 'Other') {
            setShowCustomCategory(true);
            setFormData({ ...formData, category: 'Other' });
        } else {
            setShowCustomCategory(false);
            setFormData({ ...formData, category: val });
        }
    };

    const addPhotos = (files) => {
        const valid = Array.from(files).filter(f =>
            ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"].includes(f.type)
        );
        const remaining = 5 - clubPhotos.length;
        const toAdd = valid.slice(0, remaining).map(file => ({
            file, preview: URL.createObjectURL(file), existing: false, url: null
        }));
        setClubPhotos(prev => [...prev, ...toAdd].slice(0, 5));
    };

    const removePhoto = (index) => setClubPhotos(prev => prev.filter((_, i) => i !== index));

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) { setLogo(file); setLogoPreview(URL.createObjectURL(file)); }
    };

    const handleCoverChange = (e) => {
        const file = e.target.files[0];
        if (file) { setCover(file); setCoverPreview(URL.createObjectURL(file)); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = new FormData();
            Object.keys(formData).forEach(k => { 
                if (formData[k] !== undefined && formData[k] !== null && k !== 'category') {
                    data.append(k, formData[k]); 
                } 
            });

            const finalCategory = showCustomCategory ? customCategory.trim() : formData.category;
            data.append('category', finalCategory);

            if (logo) data.append('logo', logo);
            if (cover) data.append('cover', cover);

            // Append coordinators for bulk update
            data.append('coordinators', JSON.stringify(coordinators));

            const removed = (club.clubPhotos || []).filter(url =>
                !clubPhotos.some(p => p.existing && p.url === url)
            );
            if (removed.length) data.append('remove_photos', JSON.stringify(removed));

            let photoIdx = 0;
            clubPhotos.forEach(p => {
                if (p.file) data.append(`photo_${photoIdx++}`, p.file);
            });

            const res = await api.put(`/api/college-admin/clubs/${club.id}`, data, {
                headers: { 'Content-Type': undefined }
            });
            
            if (showCustomCategory) {
                try { await api.post('/api/college-admin/categories', { category: finalCategory }); } catch(e){}
            }

            toast('Club and Coordinators updated successfully', 'success');
            onSuccess(res.data);
            onClose();
        } catch (err) {
            toast(err.response?.data?.error || 'Failed to update club', 'error');
        } finally {
            setLoading(false);
        }
    };

    // --- COORDINATOR CRUD (LOCAL UI) ---
    const handleAddCoordinator = () => {
        if (!newCoordinator.name || !newCoordinator.email || !newCoordinator.password) {
            return toast('Fill all fields for the new coordinator', 'error');
        }
        // Locally add
        setCoordinators([...coordinators, { ...newCoordinator, id: null }]);
        setNewCoordinator({ name: '', email: '', password: '' });
        setShowAddCoordinator(false);
        toast('Coordinator added to list (click save to apply)', 'info');
    };

    const handleDeleteCoordinator = (index) => {
        if (!window.confirm("Are you sure you want to remove this coordinator?")) return;
        setCoordinators(coordinators.filter((_, i) => i !== index));
        toast('Coordinator removed from list', 'info');
    };

    const updateCoordField = (index, field, value) => {
        const updated = [...coordinators];
        updated[index][field] = value;
        setCoordinators(updated);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-hidden">
            <div className="bg-[#0f172a] sm:bg-white/10 backdrop-blur-3xl border border-white/20 rounded-t-[2.5rem] sm:rounded-3xl w-full sm:max-w-2xl shadow-2xl overflow-hidden my-0 sm:my-8 animate-slideUp sm:animate-fadeIn relative flex flex-col max-h-[95vh] h-auto pb-8 sm:pb-0">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none" />
                
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 relative z-10 shrink-0">
                    <h2 className="text-2xl font-display font-black text-white">Edit Club</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-all">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    {/* --- BASIC INFO TAB --- */}
                    <form id="edit-club-form" onSubmit={handleSubmit} className="p-6 space-y-5 relative z-10">
                        {coverPreview && (
                            <div className="relative h-32 rounded-2xl overflow-hidden shadow-lg group">
                                <img src={coverPreview} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="cover preview" />
                            </div>
                        )}

                        <div className="flex gap-5 items-center">
                            {logoPreview && (
                                <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/20 shadow-lg flex-shrink-0 bg-black/40 p-1">
                                    <img src={logoPreview} className="w-full h-full rounded-xl object-cover" alt="logo preview" />
                                </div>
                            )}
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-slate-300 mb-2">Club Name *</label>
                                <input type="text" name="name" required value={formData.name} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 focus:bg-white/5 transition-all font-medium" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">Description</label>
                            <textarea name="description" rows="3" value={formData.description} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 focus:bg-white/5 transition-all resize-y font-medium" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">Category</label>
                                <select name="category" value={formData.category} onChange={handleCategoryChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 focus:bg-white/5 transition-all font-medium appearance-none">
                                    {categories.map((cat, i) => <option key={i} value={cat} className="bg-slate-900 text-white">{cat}</option>)}
                                    {!categories.length && <option value="Technical" className="bg-slate-900 text-white">Technical</option>}
                                    <option value="Other" className="bg-slate-900 text-white">Other...</option>
                                </select>
                                {showCustomCategory && (
                                    <input type="text" placeholder="Enter custom category" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} className="w-full mt-3 bg-indigo-900/20 border border-indigo-500/30 rounded-xl px-4 py-2 text-white outline-none focus:border-indigo-500 text-sm" />
                                )}
                            </div>
                            <div className="sm:col-span-1 lg:col-span-2">
                                <label className="block text-sm font-bold text-slate-300 mb-2">Instagram</label>
                                <input type="text" name="instagram" placeholder="@club_handle" value={formData.instagram} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 focus:bg-white/5 transition-all font-medium" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">Club Logo</label>
                                <input type="file" accept="image/*" onChange={handleLogoChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-slate-300 file:text-xs file:font-semibold file:bg-indigo-500/20 file:text-indigo-300 hover:file:bg-indigo-500/30 outline-none transition-all cursor-pointer" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">Club Banner</label>
                                <input type="file" accept="image/*" onChange={handleCoverChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-slate-300 file:text-xs file:font-semibold file:bg-purple-500/20 file:text-purple-300 hover:file:bg-purple-500/30 outline-none transition-all cursor-pointer" />
                            </div>
                        </div>

                        {/* Club Gallery Manager */}
                        <div className="pt-2 border-t border-white/10">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <label className="text-slate-200 text-sm font-semibold block">📸 Club Gallery <span className="text-slate-500 font-normal">(optional)</span></label>
                                    <p className="text-slate-500 text-xs mt-0.5">Up to 5 photos limits</p>
                                </div>
                                <span className={`text-sm font-semibold px-3 py-1 rounded-full ${clubPhotos.length >= 5 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700/50 text-slate-400'}`}>{clubPhotos.length} / 5</span>
                            </div>

                            {clubPhotos.length < 5 && (
                                <div onClick={() => photoInputRef.current?.click()} onDrop={e => { e.preventDefault(); setPhotoDragging(false); addPhotos(e.dataTransfer.files); }} onDragOver={e => { e.preventDefault(); setPhotoDragging(true); }} onDragLeave={() => setPhotoDragging(false)} className={`rounded-xl border-2 border-dashed flex justify-center items-center cursor-pointer p-6 text-center transition-all min-h-24 duration-200 mb-4 ${photoDragging ? 'border-purple-400 bg-purple-500/10' : 'border-slate-600 bg-slate-700/20 hover:border-purple-500/60'}`}>
                                    <p className="text-slate-300 text-sm font-medium">Drag & drop photos or click to browse</p>
                                </div>
                            )}

                            <input ref={photoInputRef} type="file" accept="image/*" multiple onChange={e => addPhotos(e.target.files)} className="hidden" />

                            {clubPhotos.length > 0 && (
                                <div className="grid grid-cols-5 gap-2">
                                    {clubPhotos.map((photo, i) => (
                                        <div key={i} className="relative group rounded-xl overflow-hidden aspect-square bg-slate-700 border border-slate-600/50">
                                            <img src={photo.preview} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                                            <button type="button" onClick={() => removePhoto(i)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">×</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* --- COORDINATORS MANAGER (INTEGRATED) --- */}
                        <div className="p-6 pt-0 space-y-5 border-t border-white/10 mt-6 -mx-6">
                            <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl mt-6 border border-white/10">
                                <div>
                                    <h3 className="text-white font-bold text-sm">Club Coordinators <span className="text-slate-400 font-normal">({coordinators.length})</span></h3>
                                    <p className="text-xs text-slate-400">Managers have full access to this club</p>
                                </div>
                                {!showAddCoordinator && (
                                    <button type="button" onClick={() => setShowAddCoordinator(true)} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all">
                                        + Add New
                                    </button>
                                )}
                            </div>

                            {showAddCoordinator && (
                                <div className="bg-indigo-500/10 border border-indigo-500/30 p-5 rounded-2xl relative shadow-inner">
                                    <h4 className="text-indigo-300 font-bold mb-3 text-sm">New Coordinator Detail</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input type="text" placeholder="Full Name" value={newCoordinator.name} onChange={(e) => setNewCoordinator({...newCoordinator, name: e.target.value})} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500/50 outline-none" />
                                        <input type="email" placeholder="Email Address" value={newCoordinator.email} onChange={(e) => setNewCoordinator({...newCoordinator, email: e.target.value})} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500/50 outline-none" />
                                        <input type="password" placeholder="Set Password" value={newCoordinator.password} onChange={(e) => setNewCoordinator({...newCoordinator, password: e.target.value})} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500/50 outline-none md:col-span-2" />
                                    </div>
                                    <div className="mt-4 flex justify-end gap-2">
                                        <button type="button" onClick={() => setShowAddCoordinator(false)} className="text-xs px-4 py-2 hover:bg-white/10 rounded-lg text-slate-300">Cancel</button>
                                        <button type="button" onClick={handleAddCoordinator} className="text-xs px-4 py-2 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-lg text-white">Add to List</button>
                                    </div>
                                </div>
                            )}

                            {coordinators.map((coord, idx) => (
                                <div key={coord.id || idx} className="bg-black/20 border border-white/10 p-4 rounded-xl relative flex flex-col gap-3 group">
                                    <button type="button" onClick={() => handleDeleteCoordinator(idx)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500/80 text-white hover:bg-red-500 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-lg z-10">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    </button>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] text-slate-400 uppercase font-bold ml-1">Name</label>
                                            <input type="text" value={coord.name || ''} onChange={(e) => updateCoordField(idx, 'name', e.target.value)} className="w-full bg-white/10 border border-white/5 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500/50 transition-all font-medium" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-400 uppercase font-bold ml-1">Email</label>
                                            <input type="email" value={coord.email || ''} onChange={(e) => updateCoordField(idx, 'email', e.target.value)} className="w-full bg-white/10 border border-white/5 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500/50 transition-all font-mono" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-[10px] text-slate-400 uppercase font-bold ml-1">Change Password (optional)</label>
                                            <input type="password" placeholder="Leave blank to keep current" value={coord.password || ''} onChange={(e) => updateCoordField(idx, 'password', e.target.value)} className="w-full bg-white/10 border border-white/5 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500/50 transition-all" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-white/10 flex justify-end gap-3 shrink-0 bg-black/20 z-10">
                    <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-white font-bold hover:bg-white/10 border border-white/20 transition-all disabled:opacity-50">Cancel</button>
                    <button type="submit" form="edit-club-form" disabled={loading} className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition-all shadow-lg disabled:opacity-50 flex items-center gap-2">
                        {loading ? 'Saving...' : 'Save All Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

