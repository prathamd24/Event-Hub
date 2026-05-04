import api from '../../services/api';
import { toast } from '../../components/Toast';
import { BACKEND_URL } from '../../config';

export default function CollegeProfile() {
    const [profile, setProfile] = useState({ name: '', description: '', location: '', website: '', logoUrl: null, bannerUrl: null });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/api/college-admin/profile')
            .then(res => { setProfile(res.data); setLoading(false); });
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = new FormData();
        data.append('name', profile.name);
        data.append('description', profile.description);
        data.append('location', profile.location);
        data.append('website', profile.website);

        const fileLogo = document.getElementById('logoFile').files[0];
        const fileBanner = document.getElementById('bannerFile').files[0];
        if (fileLogo) data.append('logo', fileLogo);
        if (fileBanner) data.append('banner', fileBanner);

        try {
            const res = await api.put('/api/college-admin/profile', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast('Profile updated successfully', 'success');
            setProfile(res.data);
        } catch (err) {
            toast('Failed to update profile', 'error');
        }
    };

    if (loading) return null;

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold text-white tracking-tight">College Profile Settings</h1>

            <form onSubmit={handleSubmit} className="bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-xl space-y-6">
                <div>
                    <label className="block text-sm text-slate-300 mb-1">College Name</label>
                    <input className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-500"
                        value={profile.name || ''} onChange={e => setProfile({ ...profile, name: e.target.value })} />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-slate-300 mb-1">Location Address</label>
                        <input className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-500"
                            value={profile.location || ''} onChange={e => setProfile({ ...profile, location: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-300 mb-1">Website URL</label>
                        <input type="url" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-500"
                            value={profile.website || ''} onChange={e => setProfile({ ...profile, website: e.target.value })} />
                    </div>
                </div>

                <div>
                    <label className="block text-sm text-slate-300 mb-1">Description Overview</label>
                    <textarea rows="4" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-500"
                        value={profile.description || ''} onChange={e => setProfile({ ...profile, description: e.target.value })}></textarea>
                </div>

                <div className="pt-4 border-t border-slate-700 grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <label className="block text-sm font-semibold text-brand-400 mb-1">Logo Image</label>
                        {profile.logoUrl && <img src={`${BACKEND_URL}${profile.logoUrl}`} className="h-16 w-16 rounded-full object-cover border-4 border-slate-700 bg-slate-900" />}
                        <input type="file" id="logoFile" accept="image/*" className="text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-600 file:text-white hover:file:bg-brand-500 transition-colors" />
                    </div>

                    <div className="space-y-3">
                        <label className="block text-sm font-semibold text-brand-400 mb-1">Banner Image</label>
                        {profile.bannerUrl && <img src={`${BACKEND_URL}${profile.bannerUrl}`} className="h-20 w-auto object-cover rounded shadow-md border-2 border-slate-700" />}
                        <input type="file" id="bannerFile" accept="image/*" className="text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-600 file:text-white hover:file:bg-brand-500 transition-colors" />
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-700 flex justify-end">
                    <button type="submit" className="bg-brand-600 hover:bg-brand-500 px-6 py-2.5 text-white font-medium rounded-lg transition-colors shadow-lg">
                        Save Profile Changes
                    </button>
                </div>
            </form>
        </div>
    );
}
