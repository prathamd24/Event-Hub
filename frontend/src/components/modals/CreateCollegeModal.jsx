import { useState } from 'react';
import api from '../../services/api';
import { toast } from '../../components/Toast';
import Toast from '../Toast';

export default function CreateCollegeModal({ isOpen, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        collegeName: '',
        location: '',
        affiliation: '',
        description: '',
        website: '',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
        establishedYear: '',
        type: '',
        naacGrade: '',
        contactEmail: '',
        phone: '',
        instagram: '',
        twitter: '',
        linkedin: '',
        facebook: ''
    });

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData
            };
            const res = await api.post('/api/platform-admin/colleges', payload);
            toast(res.data.message || 'College created successfully', 'success');
            setTimeout(() => {
                onSuccess(res.data.college);
                onClose();
            }, 1000);
        } catch (err) {
            toast(err.response?.data?.error || 'Failed to create college', 'error');
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-hidden">
            <div className="bg-[#0f172a] sm:bg-white/10 backdrop-blur-3xl border border-white/20 rounded-t-[2.5rem] sm:rounded-3xl w-full sm:max-w-2xl shadow-2xl overflow-y-auto animate-slideUp sm:animate-fadeIn relative max-h-[90vh] h-auto my-0 sm:my-8 pb-8 sm:pb-0">
                {/* Decorative glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] pointer-events-none" />

                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 relative z-10">
                    <h2 className="text-2xl font-display font-black text-white">Create New College</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-all">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 relative z-10">
                    <div className="space-y-8">
                        {/* College Info */}
                        <div>
                            <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest mb-5 border-b border-white/10 pb-3 flex items-center gap-2">
                                <span className="p-1.5 bg-emerald-500/20 rounded-lg">🎓</span> College Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-300 mb-2">College Name *</label>
                                    <input type="text" name="collegeName" required value={formData.collegeName} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500/50 focus:bg-white/5 outline-none transition-all font-medium" placeholder="e.g. Stanford University" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Location *</label>
                                    <input type="text" name="location" required value={formData.location} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500/50 focus:bg-white/5 outline-none transition-all font-medium" placeholder="City, State" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Affiliation</label>
                                    <input type="text" name="affiliation" value={formData.affiliation} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500/50 focus:bg-white/5 outline-none transition-all font-medium" placeholder="e.g. Mumbai University" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Website URL</label>
                                    <input type="url" name="website" value={formData.website} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500/50 focus:bg-white/5 outline-none transition-all font-medium" placeholder="https://..." />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Description</label>
                                    <textarea name="description" rows="3" value={formData.description} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500/50 focus:bg-white/5 outline-none transition-all font-medium resize-none" placeholder="Short description about the college..."></textarea>
                                </div>
                            </div>

                            <h3 className="text-sm font-black text-amber-400 uppercase tracking-widest mt-8 mb-5 border-b border-white/10 pb-3 flex items-center gap-2">
                                <span className="p-1.5 bg-amber-500/20 rounded-lg">📋</span> Additional Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Established Year</label>
                                    <input type="number" name="establishedYear" value={formData.establishedYear} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500/50 focus:bg-white/5 outline-none transition-all font-medium" placeholder="e.g. 1995" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Institution Type</label>
                                    <select name="type" value={formData.type} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500/50 focus:bg-white/5 outline-none transition-all font-medium appearance-none">
                                        <option value="" className="text-black">Select Type</option>
                                        <option value="Engineering" className="text-black">Engineering</option>
                                        <option value="Arts & Science" className="text-black">Arts & Science</option>
                                        <option value="Medical" className="text-black">Medical</option>
                                        <option value="Commerce" className="text-black">Commerce</option>
                                        <option value="University" className="text-black">University</option>
                                        <option value="Polytechnic" className="text-black">Polytechnic</option>
                                        <option value="Other" className="text-black">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">NAAC Grade / Recognition</label>
                                    <input type="text" name="naacGrade" value={formData.naacGrade} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500/50 focus:bg-white/5 outline-none transition-all font-medium" placeholder="e.g. A++" />
                                </div>
                            </div>

                            <h3 className="text-sm font-black text-rose-400 uppercase tracking-widest mt-8 mb-5 border-b border-white/10 pb-3 flex items-center gap-2">
                                <span className="p-1.5 bg-rose-500/20 rounded-lg">📞</span> Contact & Socials
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Public Contact Email</label>
                                    <input type="email" name="contactEmail" value={formData.contactEmail} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-rose-500/50 focus:bg-white/5 outline-none transition-all font-medium" placeholder="contact@college.edu" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Phone</label>
                                    <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-rose-500/50 focus:bg-white/5 outline-none transition-all font-medium" placeholder="+91..." />
                                </div>
                                <div className="md:col-span-2 grid grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-300 mb-2">Instagram (Optional)</label>
                                        <input type="url" name="instagram" value={formData.instagram} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-rose-500/50 focus:bg-white/5 outline-none transition-all font-medium text-sm" placeholder="https://instagram.com/..." />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-300 mb-2">LinkedIn (Optional)</label>
                                        <input type="url" name="linkedin" value={formData.linkedin} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-rose-500/50 focus:bg-white/5 outline-none transition-all font-medium text-sm" placeholder="https://linkedin.com/..." />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Admin Account */}
                        <div>
                            <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-5 border-b border-white/10 pb-3 flex items-center gap-2">
                                <span className="p-1.5 bg-indigo-500/20 rounded-lg">🛡️</span> Admin Account
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Admin Name *</label>
                                    <input type="text" name="adminName" required value={formData.adminName} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500/50 focus:bg-white/5 outline-none transition-all font-medium" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Admin Email *</label>
                                    <input type="email" name="adminEmail" required value={formData.adminEmail} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500/50 focus:bg-white/5 outline-none transition-all font-medium" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Temporary Password *</label>
                                    <input type="password" name="adminPassword" required minLength="6" value={formData.adminPassword} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500/50 focus:bg-white/5 outline-none transition-all font-medium" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-white/10">
                        <button type="button" onClick={onClose} disabled={loading} className="px-6 py-2.5 rounded-xl text-white font-bold hover:bg-white/10 border border-white/20 transition-all disabled:opacity-50">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] disabled:opacity-50 flex items-center gap-2">
                            {loading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    Creating...
                                </>
                            ) : 'Create College & Admin'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
