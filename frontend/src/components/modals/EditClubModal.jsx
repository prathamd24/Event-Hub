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

    useEffect(() => {
        if (club) {
            setFormData({
                name: club.name || '',
                description: club.description || '',
                category: club.category || 'Technical',
                instagram: club.instagram || ''
            });
            setLogoPreview(club.logoUrl ? `${BASE}${club.logoUrl}` : null);
            setCoverPreview(club.coverUrl ? `${BASE}${club.coverUrl}` : null);

            // Pre-populate club photos
            const existing = (club.clubPhotos || []).map(url => ({
                file: null, preview: `${BASE}${url}`, existing: true, url
            }));
            setClubPhotos(existing);
        }
    }, [club]);

    if (!isOpen) return null;

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

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

    const removePhoto = (index) => {
        setClubPhotos(prev => prev.filter((_, i) => i !== index));
    };

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
            Object.keys(formData).forEach(k => { if (formData[k] !== undefined && formData[k] !== null) data.append(k, formData[k]); });
            if (logo) data.append('logo', logo);
            if (cover) data.append('cover', cover);

            // Photos to remove (existing that were removed)
            const removed = (club.clubPhotos || []).filter(url =>
                !clubPhotos.some(p => p.existing && p.url === url)
            );
            if (removed.length) data.append('remove_photos', JSON.stringify(removed));

            // New photos to upload
            let photoIdx = 0;
            clubPhotos.forEach(p => {
                if (p.file) {
                    data.append(`photo_${photoIdx++}`, p.file);
                }
            });

            const res = await api.put(`/api/college-admin/clubs/${club.id}`, data);
            toast('Club updated successfully', 'success');
            onSuccess(res.data);
            onClose();
        } catch (err) {
            toast(err.response?.data?.error || 'Failed to update club', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white/10 backdrop-blur-3xl border border-white/20 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-8 animate-fadeIn relative">
                {/* Decorative glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none" />
                
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 relative z-10">
                    <h2 className="text-2xl font-display font-black text-white">Edit Club</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-all">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5 relative z-10">
                    {/* Cover preview */}
                    {coverPreview && (
                        <div className="relative h-32 rounded-2xl overflow-hidden mb-2 border border-white/10 shadow-lg group">
                            <img src={coverPreview} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="cover preview" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-4">
                                <span className="text-white text-xs font-bold uppercase tracking-wider">Banner Preview</span>
                            </div>
                        </div>
                    )}

                    {/* Logo + Name row */}
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
                        <textarea name="description" rows="3" value={formData.description} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 focus:bg-white/5 transition-all resize-none font-medium" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">Category</label>
                            <select name="category" value={formData.category} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 focus:bg-white/5 transition-all font-medium appearance-none">
                                {['Technical', 'Sports', 'Cultural', 'Literary', 'Management', 'Alumni', 'Other'].map(c => <option key={c} value={c} className="bg-slate-900 text-white">{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">Instagram</label>
                            <input type="text" name="instagram" placeholder="@club_handle" value={formData.instagram} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 focus:bg-white/5 transition-all font-medium" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">Club Logo</label>
                            <input type="file" accept="image/*" onChange={handleLogoChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-slate-300 file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-500/20 file:text-indigo-300 hover:file:bg-indigo-500/30 outline-none transition-all cursor-pointer" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">Club Banner</label>
                            <input type="file" accept="image/*" onChange={handleCoverChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-slate-300 file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-500/20 file:text-purple-300 hover:file:bg-purple-500/30 outline-none transition-all cursor-pointer" />
                        </div>
                    </div>

                    {/* Club Photos Gallery Manager */}
                    <div className="pt-2 border-t border-white/10">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <label className="text-slate-200 text-sm font-semibold block">📸 Club Photos <span className="text-slate-500 font-normal">(optional)</span></label>
                                <p className="text-slate-500 text-xs mt-0.5">Up to 5 photos for the club's gallery</p>
                            </div>
                            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${clubPhotos.length >= 5 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700/50 text-slate-400'}`}>
                                {clubPhotos.length} / 5
                            </span>
                        </div>

                        {clubPhotos.length < 5 && (
                            <div
                                onClick={() => photoInputRef.current?.click()}
                                onDrop={e => { e.preventDefault(); setPhotoDragging(false); addPhotos(e.dataTransfer.files); }}
                                onDragOver={e => { e.preventDefault(); setPhotoDragging(true); }}
                                onDragLeave={() => setPhotoDragging(false)}
                                className={`rounded-2xl border-2 border-dashed cursor-pointer p-6 text-center transition-all duration-200 mb-4 ${photoDragging ? 'border-purple-400 bg-purple-500/10' : 'border-slate-600 bg-slate-700/20 hover:border-purple-500/60'}`}
                            >
                                <p className="text-slate-300 text-sm font-medium">Drag & drop photos or click to browse</p>
                            </div>
                        )}

                        <input ref={photoInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" multiple onChange={e => addPhotos(e.target.files)} className="hidden" />

                        {clubPhotos.length > 0 && (
                            <div className="grid grid-cols-5 gap-2">
                                {clubPhotos.map((photo, i) => (
                                    <div key={i} className="relative group rounded-xl overflow-hidden aspect-square bg-slate-700 border border-slate-600/50">
                                        <img src={photo.preview} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                                        <button type="button" onClick={() => removePhoto(i)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">×</button>
                                        {photo.existing && (
                                            <div className="absolute bottom-1 left-0 right-0 text-center">
                                                <span className="text-xs bg-emerald-500/80 text-white px-2 rounded">saved</span>
                                            </div>
                                        )}
                                        {i === 0 && (
                                            <div className="absolute top-1 left-1">
                                                <span className="text-[10px] bg-purple-500/80 text-white px-1.5 py-0.5 rounded-full font-bold">Cover</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-white/10">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-white font-bold hover:bg-white/10 border border-white/20 transition-all disabled:opacity-50">Cancel</button>
                        <button type="submit" disabled={loading} className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] disabled:opacity-50 flex items-center gap-2">
                            {loading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    Saving...
                                </>
                            ) : '✓ Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
