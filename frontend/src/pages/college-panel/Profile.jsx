import { useState, useEffect, useRef } from "react";
import api from '../../services/api';
import { toast } from '../../components/Toast';
import { BACKEND_URL } from '../../config';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function CollegeProfile() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        location: '',
        description: '',
        website: '',
        affiliation: ''
    });

    const [files, setFiles] = useState({
        logo: null,
        banner: null
    });

    const [preview, setPreview] = useState({
        logo: null,
        banner: null
    });

    useEffect(() => {
        const fetchCollegeInfo = async () => {
            if (!user?.collegeId) return;
            try {
                const res = await api.get(`/api/public/colleges/${user.collegeId}`);
                const college = res.data;
                setFormData({
                    location: college.location || '',
                    description: college.description || '',
                    website: college.website || '',
                    affiliation: college.affiliation || ''
                });
                setPreview({
                    logo: college.logoUrl ? (college.logoUrl.startsWith('http') ? college.logoUrl : `${BACKEND_URL}${college.logoUrl}`) : null,
                    banner: college.bannerUrl ? (college.bannerUrl.startsWith('http') ? college.bannerUrl : `${BACKEND_URL}${college.bannerUrl}`) : null
                });
            } catch (error) {
                toast('Failed to load profile details', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchCollegeInfo();
    }, [user]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e, type) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFiles({ ...files, [type]: file });
            setPreview({ ...preview, [type]: URL.createObjectURL(file) });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => data.append(key, formData[key]));
            if (files.logo) data.append('logo', files.logo);
            if (files.banner) data.append('banner', files.banner);

            await api.put('/api/college-admin/profile', data);
            toast('Profile updated successfully', 'success');
        } catch (error) {
            toast(error.response?.data?.error || 'Failed to update profile', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-12 relative">
            <div className="fixed top-32 right-32 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10">
                <h1 className="text-3xl font-display font-black text-white mb-2">College Profile</h1>
                <p className="text-slate-400 text-sm font-medium">Update your institution's public information and branding.</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden relative z-10">
                {/* Banner Section */}
                <div className="relative h-56 bg-slate-900 border-b border-white/10 group cursor-pointer overflow-hidden">
                    {preview.banner ? (
                        <img src={preview.banner} alt="Banner Preview" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-gradient-to-br from-indigo-900/30 to-purple-900/30">
                            <span className="text-5xl mb-3 opacity-50">🖼️</span>
                            <span className="text-sm font-bold tracking-wide">UPLOAD BANNER IMAGE</span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm">
                        <label className="bg-white/10 text-white px-5 py-2.5 rounded-xl font-bold cursor-pointer hover:bg-white/20 transition-all border border-white/20 backdrop-blur-md">
                            Change Banner
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'banner')} />
                        </label>
                    </div>
                </div>

                {/* Logo Section */}
                <div className="px-6 sm:px-10 relative pb-10">
                    <div className="absolute -top-16 left-6 sm:left-10 w-32 h-32 rounded-2xl bg-slate-900 border-4 border-slate-900 overflow-hidden shadow-2xl z-10 group cursor-pointer">
                        {preview.logo ? (
                            <img src={preview.logo} alt="Logo Preview" className="w-full h-full object-contain bg-white" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 bg-gradient-to-br from-white to-slate-200">
                                <span className="text-4xl font-black text-indigo-500">C</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm">
                            <label className="text-white text-xs font-bold cursor-pointer text-center w-full h-full flex items-center justify-center">
                                Change<br />Logo
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'logo')} />
                            </label>
                        </div>
                    </div>

                    <div className="pt-20 space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">College Name</label>
                            <input type="text" value={user?.collegeName || 'Unknown College'} disabled className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-slate-500 cursor-not-allowed font-medium" />
                            <p className="text-xs text-slate-500 mt-2 font-medium">Contact platform admin to change college name.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">University / Board Affiliation</label>
                            <input type="text" name="affiliation" value={formData.affiliation} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all font-medium" placeholder="e.g. Mumbai University, CBSE, etc." />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">Location</label>
                            <input type="text" name="location" value={formData.location} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all font-medium" placeholder="City, State, Country" />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">Website URL</label>
                            <input type="url" name="website" value={formData.website} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all font-medium" placeholder="https://..." />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">About the College</label>
                            <textarea name="description" rows="5" value={formData.description} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all resize-y font-medium" placeholder="Detailed description of the institution..."></textarea>
                        </div>

                        <div className="pt-6 border-t border-white/10 flex justify-end">
                            <button type="submit" disabled={submitting} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] disabled:opacity-50 flex items-center gap-2">
                                {submitting ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
