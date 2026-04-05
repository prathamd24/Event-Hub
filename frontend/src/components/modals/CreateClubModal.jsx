import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from '../../components/Toast';

export default function CreateClubModal({ isOpen, onClose, onSuccess }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: 'Technical',
        instagram: ''
    });

    const [logo, setLogo] = useState(null);
    const [cover, setCover] = useState(null);

    // CATEGORY LOGIC
    const [categories, setCategories] = useState([]);
    const [showCustomCategory, setShowCustomCategory] = useState(false);
    const [customCategory, setCustomCategory] = useState('');

    // MULTIPLE COORDINATORS LOGIC
    const [coordinators, setCoordinators] = useState([{ name: '', email: '', password: '' }]);

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setFormData({ name: '', description: '', category: 'Technical', instagram: '' });
            setCoordinators([{ name: '', email: '', password: '' }]);
            setCustomCategory('');
            setShowCustomCategory(false);
            setLogo(null);
            setCover(null);

            api.get('/api/college-admin/categories')
               .then(res => setCategories(res.data.categories || []))
               .catch(err => console.error("Failed to load categories", err));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

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

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setLogo(e.target.files[0]);
        }
    };

    const addCoordinator = () => {
        setCoordinators([...coordinators, { name: '', email: '', password: '' }]);
    };

    const removeCoordinator = (idx) => {
        if (coordinators.length > 1) {
            setCoordinators(coordinators.filter((_, i) => i !== idx));
        } else {
            toast('At least one coordinator is required', 'error');
        }
    };

    const updateCoordinator = (idx, field, value) => {
        const updated = [...coordinators];
        updated[idx][field] = value;
        setCoordinators(updated);
    };

    const nextStep = () => {
        // Validation for step 1
        if (!formData.name.trim()) return toast('Club Name is required', 'error');
        if (!formData.description.trim()) return toast('Description is required', 'error');
        if (showCustomCategory && !customCategory.trim()) return toast('Custom category name is required', 'error');
        setStep(2);
    };
    
    const prevStep = () => setStep(1);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate coordinators
        for (let i = 0; i < coordinators.length; i++) {
            const c = coordinators[i];
            if (!c.name.trim() || !c.email.trim() || !c.password.trim()) {
                return toast(`Please fill all details for Coordinator ${i + 1}`, 'error');
            }
        }

        setLoading(true);
        try {
            const data = new FormData();
            
            // Append basic info
            data.append('name', formData.name.trim());
            data.append('description', formData.description.trim());
            data.append('instagram', formData.instagram.trim());
            
            // Handle Custom Category
            const finalCategory = showCustomCategory ? customCategory.trim() : formData.category;
            data.append('category', finalCategory);

            // Append Photos
            if (logo) data.append('logo', logo);
            if (cover) data.append('cover', cover);

            // Append Coordinators array
            data.append('coordinators', JSON.stringify(coordinators));

            // Create club
            const res = await api.post('/api/college-admin/clubs', data);
            
            // If it was a custom category, save it globally
            if (showCustomCategory) {
                try {
                    await api.post('/api/college-admin/categories', { category: finalCategory });
                } catch (catErr) {
                    console.error("Failed to save custom category", catErr);
                }
            }

            toast(res.data.message || 'Club created successfully', 'success');
            setTimeout(() => {
                onSuccess(res.data.club);
                onClose();
            }, 1000);
        } catch (err) {
            toast(err.response?.data?.error || 'Failed to create club', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-hidden">
            <div className="bg-[#0f172a] sm:bg-white/10 backdrop-blur-3xl border border-white/20 rounded-t-[2.5rem] sm:rounded-3xl w-full sm:max-w-2xl shadow-2xl overflow-hidden my-0 sm:my-8 animate-slideUp sm:animate-fadeIn relative flex flex-col max-h-[95vh] h-auto pb-8 sm:pb-0">
                
                {/* Header - Close Button on RIGHT */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 relative z-10 shrink-0">
                    <h2 className="text-2xl font-display font-black text-white">Create New Club</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-all">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="px-6 pt-4 pb-2 border-b border-white/10 bg-black/20 relative z-10 shrink-0">
                    <div className="flex items-center gap-4 text-sm font-bold tracking-wide">
                        <div className={`flex items-center gap-2 ${step === 1 ? 'text-indigo-400' : 'text-emerald-400'}`}>
                            <span className="w-6 h-6 rounded-full flex items-center justify-center border-2 border-current shadow-lg">1</span>
                            Club Info
                        </div>
                        <div className="flex-1 h-px bg-white/10"></div>
                        <div className={`flex items-center gap-2 ${step === 2 ? 'text-indigo-400' : 'text-slate-500'}`}>
                            <span className="w-6 h-6 rounded-full flex items-center justify-center border-2 border-current shadow-lg">2</span>
                            Coordinators
                        </div>
                    </div>
                </div>

                <div className="p-6 relative z-10 overflow-y-auto flex-1 custom-scrollbar">
                    {step === 1 ? (
                        <div className="space-y-5 animate-fadeIn">
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">Club Name *</label>
                                <input type="text" name="name" required value={formData.name} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 focus:bg-white/5 transition-all font-medium" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">Description *</label>
                                <textarea name="description" required rows="3" value={formData.description} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 focus:bg-white/5 transition-all resize-y font-medium"></textarea>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Category *</label>
                                    <select name="category" value={formData.category} onChange={handleCategoryChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 focus:bg-white/5 transition-all font-medium">
                                        {categories.map((cat, i) => (
                                            <option key={i} value={cat} className="bg-slate-900 text-white">{cat}</option>
                                        ))}
                                        {!categories.length && (
                                            <>
                                                <option value="Technical" className="bg-slate-900 text-white">Technical</option>
                                                <option value="Cultural" className="bg-slate-900 text-white">Cultural</option>
                                                <option value="Sports" className="bg-slate-900 text-white">Sports</option>
                                            </>
                                        )}
                                        <option value="Other" className="bg-slate-900 text-white">Other...</option>
                                    </select>
                                    {showCustomCategory && (
                                        <input 
                                            type="text" 
                                            placeholder="Enter custom category"
                                            value={customCategory} 
                                            onChange={(e) => setCustomCategory(e.target.value)} 
                                            className="w-full mt-3 bg-indigo-900/20 border border-indigo-500/30 rounded-xl px-4 py-2.5 text-white outline-none focus:border-indigo-500" 
                                        />
                                    )}
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Club Logo</label>
                                    <input type="file" accept="image/*" onChange={handleFileChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-slate-300 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/20 file:text-indigo-300 hover:file:bg-indigo-500/30 outline-none transition-all cursor-pointer" />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Club Cover Photo</label>
                                    <input type="file" accept="image/*" onChange={(e) => setCover(e.target.files[0])} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-slate-300 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-500/20 file:text-purple-300 hover:file:bg-purple-500/30 outline-none transition-all cursor-pointer" />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Instagram Link</label>
                                    <input type="text" name="instagram" value={formData.instagram} onChange={handleChange} placeholder="https://instagram.com/..." className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 focus:bg-white/5 transition-all font-medium" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/10">
                                <h3 className="text-white font-bold text-sm">Add Coordinators <span className="text-slate-400 font-normal">({coordinators.length})</span></h3>
                                <button type="button" onClick={addCoordinator} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all shadow-lg shadow-indigo-500/20">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                    Add Member
                                </button>
                            </div>

                            {coordinators.map((coord, idx) => (
                                <div key={idx} className="bg-black/20 border border-white/10 p-5 rounded-2xl relative shadow-inner">
                                    {coordinators.length > 1 && (
                                        <button type="button" onClick={() => removeCoordinator(idx)} className="absolute -top-3 -right-3 w-7 h-7 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-full flex items-center justify-center transition-all border border-red-500/50 backdrop-blur-md shadow-lg shadow-red-500/20 z-10">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                        </button>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-300 mb-1.5">Full Name *</label>
                                            <input type="text" required value={coord.name} onChange={(e) => updateCoordinator(idx, 'name', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all font-medium" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-300 mb-1.5">Email *</label>
                                            <input type="email" required value={coord.email} onChange={(e) => updateCoordinator(idx, 'email', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all font-medium" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-slate-300 mb-1.5">Password *</label>
                                            <input type="password" required minLength="6" value={coord.password} onChange={(e) => updateCoordinator(idx, 'password', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all font-medium" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-6 border-t border-white/10 flex justify-end gap-3 shrink-0">
                    {step === 2 && (
                        <button type="button" onClick={prevStep} disabled={loading} className="px-6 py-2.5 rounded-xl text-white font-bold hover:bg-white/10 border border-white/20 transition-all disabled:opacity-50">
                            Back
                        </button>
                    )}
                    {step === 1 ? (
                        <button type="button" onClick={nextStep} className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)]">
                            Continue
                        </button>
                    ) : (
                        <button onClick={handleSubmit} disabled={loading} className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] disabled:opacity-50 flex items-center gap-2">
                            {loading ? 'Creating...' : 'Create Club'}
                        </button>
                    )}
                </div>
                
            </div>
        </div>
    );
}
