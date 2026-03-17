import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { toast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';

export default function CreateEventModal({ isOpen, onClose, onSuccess, isClub: isClubProp, clubId }) {
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const isClub = isClubProp !== undefined ? isClubProp : (user?.role === 'CLUB_COORDINATOR' || (user?.role === 'COLLEGE_ADMIN' && clubId));

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: isClub ? user?.clubCategory : 'Technical',
        eventDate: '',
        endDate: '',
        startTime: '',
        endTime: '',
        registrationDeadline: '',
        venue: '',
        venueMapLink: '',
        eventScope: 'INTRA',
        maxParticipants: 100, // Initialize with a number
        registrationFee: 0,    // Initialized as number 0 to fix "0100" bug
        rules: '',
        eligibilityCriteria: 'Open to All',
        eligibility: '',
        requiredMaterials: '',
        themes: [],
        themeInput: '',
        prizes: [],
        assignedClubId: null,
        upiId: '',
        upiName: '',
        registrationType: 'INDIVIDUAL',
        teamMinSize: 2,
        teamMaxSize: 4,
        maxTeams: 10,
        topics: [],
        topicInput: '',
        highlights: [],
        highlightInput: '',
        chiefGuests: [], // Now array of objects: { name, photo, photoPreview }
        judges: [],      // Now array of objects: { name, photo, photoPreview }
    });
    const [paymentQr, setPaymentQr] = useState(null);
    const [suggestedClubs, setSuggestedClubs] = useState([]);
    const [selectedClubId, setSelectedClubId] = useState(null);
    const [cover, setCover] = useState(null);
    const [eventPhotos, setEventPhotos] = useState([]);
    const [photoDragging, setPhotoDragging] = useState(false);
    const [isFree, setIsFree] = useState(false);
    const [isUnlimited, setIsUnlimited] = useState(false);
    const [maxTeamsUnlimited, setMaxTeamsUnlimited] = useState(false);
    const [error, setError] = useState("");
    const photoInputRef = useRef(null);
    const [categories, setCategories] = useState([]);
    const [showCategoryInput, setShowCategoryInput] = useState(false);
    const [newCategory, setNewCategory] = useState("");
    const [savingCategory, setSavingCategory] = useState(false);
    const [lockedCategory, setLockedCategory] = useState(null);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const endpoint = isClub ? '/api/club/categories' : '/api/college-admin/categories';
                const res = await api.get(endpoint);
                const cats = res.data.categories || [];
                setCategories(cats);
                
                if (isClub && res.data.clubCategory) {
                    setLockedCategory(res.data.clubCategory);
                    setFormData(prev => ({ ...prev, category: res.data.clubCategory }));
                } else if (!formData.category && cats.length > 0) {
                    setFormData(prev => ({ ...prev, category: cats[0] }));
                }
            } catch (err) {
                console.error("Fetch categories failed", err);
                setCategories(["Technical", "Cultural", "Sports", "Literary", "Workshop", "Seminar", "Hackathon", "Competition", "Social", "Other"]);
            }
        };
        fetchCategories();
    }, [isClub, isOpen]);

    const handleSaveCategory = async () => {
        if (!newCategory.trim()) return;
        setSavingCategory(true);
        try {
            const endpoint = isClub ? '/api/club/categories' : '/api/college-admin/categories';
            await api.post(endpoint, { category: newCategory });
            
            // Add to list and select it
            setCategories(prev => {
                const filtered = prev.filter(c => c !== "Other" && c !== newCategory);
                return [...filtered, newCategory, "Other"];
            });
            setFormData(prev => ({ ...prev, category: newCategory }));
            setShowCategoryInput(false);
            setNewCategory("");
            toast("New category saved!", "success");
        } catch (err) {
            toast(err.response?.data?.message || "Failed to save category", "error");
        } finally {
            setSavingCategory(false);
        }
    };

    if (!isOpen) return null;

    const handleChange = async (e) => {
        const { name, value } = e.target;
        let newData = { ...formData, [name]: value };
        setError(""); // Clear error on any change

        if (name === 'registrationFee' && !isFree) {
            const val = Math.max(0, parseInt(value) || 0);
            newData[name] = val;
        }

        if (name === 'maxParticipants' && !isUnlimited) {
            const val = Math.max(1, parseInt(value) || 1);
            newData[name] = val;
        }

        if (name === 'maxTeams' && !maxTeamsUnlimited) {
            const val = Math.max(1, parseInt(value) || 1);
            newData[name] = val;
        }

        if (name === 'teamMinSize') {
            const val = Math.max(1, parseInt(value) || 1);
            newData[name] = val;
        }

        if (name === 'teamMaxSize') {
            const val = Math.max(1, parseInt(value) || 1);
            newData[name] = val;
        }

        if (name === 'category' && !isClub) {
            // Check for clubs in this category
            try {
                const res = await api.get(`/api/college-admin/clubs?category=${value}`);
                setSuggestedClubs(res.data);
                // Reset selected club if category changes
                setSelectedClubId(null);
                newData.assignedClubId = null;
            } catch (err) {
                console.error("Failed to check clubs", err);
            }
        }

        setFormData(newData);
    };

    const handleSelectClub = (clubId) => {
        setSelectedClubId(clubId);
        setFormData(prev => ({ ...prev, assignedClubId: clubId }));
    };
    
    const calculateDuration = () => {
        if (!formData.eventDate || !formData.startTime || !formData.endTime) return null;
        try {
            const start = new Date(`${formData.eventDate}T${formData.startTime}`);
            const end = new Date(`${formData.endDate || formData.eventDate}T${formData.endTime}`);
            const diffMs = end - start;
            if (diffMs <= 0) return null;
            const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            
            let str = "";
            if (diffHrs > 0) str += `${diffHrs} hr${diffHrs > 1 ? 's' : ''}`;
            if (diffMins > 0) str += ` ${diffMins} min${diffMins > 1 ? 's' : ''}`;
            return str.trim();
        } catch (e) { return null; }
    };

    const addPhotos = (files) => {
        const valid = Array.from(files).filter(f =>
            ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"].includes(f.type)
        );
        const remaining = 5 - eventPhotos.length;
        const toAdd = valid.slice(0, remaining).map(file => ({
            file,
            preview: URL.createObjectURL(file),
            existing: false,
            url: null
        }));
        setEventPhotos(prev => [...prev, ...toAdd].slice(0, 5));
    };

    const removePhoto = (index) => {
        setEventPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const nextStep = () => {
        const todayStr = new Date().toISOString().split("T")[0];

        if (step === 1) {
            if (!formData.title.trim()) { setError("Event title is required"); return; }
            if (!formData.description.trim()) { setError("Description is required"); return; }
        }

        if (step === 2) {
            if (!formData.eventDate) { setError("Start date is required"); return; }
            if (formData.eventDate < todayStr) { setError("Start date cannot be in the past"); return; }
            
            const startDateTime = new Date(`${formData.eventDate}T${formData.startTime || '00:00'}`);
            const endDateTime = new Date(`${formData.endDate || formData.eventDate}T${formData.endTime || '23:59'}`);

            if (formData.endDate && formData.endDate < formData.eventDate) {
                setError("End date cannot be before start date"); return;
            }
            if (!formData.startTime) { setError("Start time is required"); return; }
            if (!formData.endTime) { setError("End time is required"); return; }
            
            if (endDateTime <= startDateTime) {
                setError("End date/time must be strictly after start date/time"); return;
            }

            if (formData.registrationDeadline && formData.registrationDeadline > formData.eventDate) {
                setError("Registration deadline must be before or on the event start date"); 
                return;
            }
        }
        
        if (step === 3) {
            if (!formData.venue.trim()) { setError("Venue is required"); return; }
        }

        if (step === 4) {
            if (!isFree && (formData.registrationFee < 0 || isNaN(formData.registrationFee))) {
                setError("Registration fee must be 0 or a positive number"); return;
            }
            if (!isUnlimited && (!formData.maxParticipants || formData.maxParticipants < 1)) {
                setError("Max participants must be at least 1 or enable unlimited"); return;
            }
            if (formData.registrationType !== 'INDIVIDUAL') {
                if (formData.teamMinSize < 1) { setError("Min team size must be at least 1"); return; }
                if (formData.teamMaxSize < formData.teamMinSize) { setError("Max team size cannot be less than min team size"); return; }
                if (!maxTeamsUnlimited && (!formData.maxTeams || formData.maxTeams < 1)) {
                    setError("Max teams must be at least 1 or enable unlimited"); return;
                }
            }
        }

        if (step === 5) {
            if (!isFree) {
                if (!formData.upiId.trim()) { setError("UPI ID is required for paid events"); return; }
                if (!formData.upiName.trim()) { setError("Account Name is required for paid events"); return; }
                if (!paymentQr) { setError("Payment QR code is required for paid events"); return; }
            }
        }

        setError("");
        if (step === 4 && isFree) {
            setStep(s => s + 2); // Skip Payment Details if free
        } else {
            setStep(s => s + 1);
        }
    };
    const prevStep = () => {
        setError("");
        if (step === 6 && isFree) {
            setStep(s => s - 2); // Go back to Participation if free
        } else {
            setStep(s => s - 1);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const q = (user?.role === 'COLLEGE_ADMIN' && clubId) ? `?club_id=${clubId}` : '';
            const endpoint = isClub ? `/api/club/events${q}` : '/api/college-admin/events';
            const data = new FormData();

            // Append simple fields
            const simpleFields = ['title', 'description', 'category', 'eventDate', 'endDate',
                'startTime', 'endTime', 'venue', 'venueMapLink', 'eventScope',
                'rules', 'eligibilityCriteria', 'eligibility', 'requiredMaterials'];
            
            simpleFields.forEach(key => data.append(key, formData[key] ?? ''));

            // Handle optional deadline
            data.append('registrationDeadline', formData.registrationDeadline || '');

            // Handle fee
            data.append('registrationFee', isFree ? 0 : (formData.registrationFee || 0));

            // Handle max participants (null for unlimited)
            data.append('maxParticipants', isUnlimited ? '' : (formData.maxParticipants || ''));

            // Team fields
            data.append('registrationType', formData.registrationType);
            data.append('teamMinSize', formData.registrationType !== 'INDIVIDUAL' ? formData.teamMinSize : 2);
            data.append('teamMaxSize', formData.registrationType !== 'INDIVIDUAL' ? formData.teamMaxSize : 4);
            data.append('maxTeams', formData.registrationType !== 'INDIVIDUAL' && !maxTeamsUnlimited ? formData.maxTeams : '');
            if (formData.assignedClubId) {
                data.append('assignedClubId', formData.assignedClubId);
            }

            // Append array fields
            ['themes', 'topics', 'highlights', 'prizes'].forEach(arrField => {
                if (formData[arrField]?.length > 0) {
                    data.append(arrField, JSON.stringify(formData[arrField]));
                }
            });

            // Handle guests and judges specifically (name only for JSON, photos separate)
            const guestNames = formData.chiefGuests.map(g => g.name);
            data.append('chiefGuests', JSON.stringify(guestNames));
            formData.chiefGuests.forEach((g, i) => {
                if (g.photo) data.append(`guest_photo_${i}`, g.photo);
            });

            const judgeNames = formData.judges.map(j => j.name);
            data.append('judges', JSON.stringify(judgeNames));
            formData.judges.forEach((j, i) => {
                if (j.photo) data.append(`judge_photo_${i}`, j.photo);
            });

            if (cover) data.append('cover', cover);

            // Append event photos
            eventPhotos.forEach((photo, i) => {
                if (photo.file) data.append(`photo_${i}`, photo.file);
            });

            if (!isFree && paymentQr) {
                data.append('paymentQr', paymentQr);
                data.append('upiId', formData.upiId);
                data.append('upiName', formData.upiName);
            }

            const res = await api.post(endpoint, data);
            toast(res.data.message || 'Event created successfully', 'success');
            setTimeout(() => {
                setLoading(false);
                onSuccess(res.data.event);
                onClose();
            }, 1000);
        } catch (err) {
            toast(err.response?.data?.error || 'Failed to create event', 'error');
            setLoading(false);
        }
    };

    const TOTAL_STEPS = 7;
    const steps = ['Basic Info', 'Date & Time', 'Location', 'Participation', 'Payment Details', 'Extra Details', 'Photos'];

    const inputCls = "w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 focus:bg-white/5 transition-all font-medium";

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm md:p-4 overflow-hidden">
            <div className="bg-[#0f172a] md:bg-white/10 md:backdrop-blur-3xl md:border border-white/20 w-full h-[95vh] md:h-auto md:max-h-[90vh] md:max-w-2xl rounded-t-3xl md:rounded-3xl shadow-2xl overflow-y-auto animate-slideUp md:animate-fadeIn relative flex flex-col">
                {/* Decorative glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none" />

                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 relative z-10">
                    <h2 className="text-2xl font-display font-black text-white">
                        Create {isClub ? 'Club' : 'College'} Event
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-all">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="px-6 py-4 flex flex-wrap gap-2 text-xs border-b border-white/10 bg-black/20 mb-4 justify-between relative z-10">
                    {steps.map((s, idx) => (
                        <div key={idx} className={`flex items-center gap-1.5 font-bold tracking-wide ${step === idx + 1 ? 'text-indigo-400' : step > idx + 1 ? 'text-emerald-400' : 'text-slate-500'}`}>
                            <span className="w-6 h-6 rounded-full flex items-center justify-center border-2 border-current shadow-lg">{idx + 1}</span>
                            <span className="hidden sm:inline">{s}</span>
                        </div>
                    ))}
                </div>

                <form 
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (step === TOTAL_STEPS) {
                            handleSubmit(e);
                        } else {
                            nextStep();
                        }
                    }} 
                    className="p-6 pt-2 relative z-10"
                >
                    {error && (
                        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm animate-shake font-bold">
                            <span>⚠</span> {error}
                        </div>
                    )}
                    {/* STEP 1 — Basic Info */}
                    {step === 1 && (
                        <div className="space-y-5 animate-fadeIn">
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">Event Title *</label>
                                <input type="text" name="title" required value={formData.title} onChange={handleChange} className={inputCls} />
                            </div>

                            {/* Topics - MOVED HERE */}
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-1">Topics / Agenda</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Add a topic..."
                                        value={formData.topicInput || ''}
                                        onChange={e => setFormData(p => ({ ...p, topicInput: e.target.value }))}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const tag = (formData.topicInput || '').trim();
                                                if (tag && !formData.topics?.includes(tag)) {
                                                    setFormData(p => ({ ...p, topics: [...(p.topics||[]), tag], topicInput: '' }));
                                                }
                                            }
                                        }}
                                        className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-slate-500 outline-none focus:border-indigo-500/50 text-sm"
                                    />
                                    <button type="button" onClick={() => {
                                        const tag = (formData.topicInput || '').trim();
                                        if (tag && !formData.topics?.includes(tag)) {
                                            setFormData(p => ({ ...p, topics: [...(p.topics||[]), tag], topicInput: '' }));
                                        }
                                    }} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all">Add</button>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {(formData.topics || []).map(tag => (
                                        <span key={tag} className="flex items-center gap-1 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold">
                                            {tag}
                                            <button type="button" onClick={() => setFormData(p => ({ ...p, topics: p.topics.filter(t => t !== tag) }))} className="text-slate-400 hover:text-red-400 ml-1 font-black">×</button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Highlights - MOVED HERE */}
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-1">Event Highlights</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Add a highlight..."
                                        value={formData.highlightInput || ''}
                                        onChange={e => setFormData(p => ({ ...p, highlightInput: e.target.value }))}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const val = (formData.highlightInput || '').trim();
                                                if (val) {
                                                    setFormData(p => ({ ...p, highlights: [...(p.highlights||[]), val], highlightInput: '' }));
                                                }
                                            }
                                        }}
                                        className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-slate-500 outline-none focus:border-indigo-500/50 text-sm"
                                    />
                                    <button type="button" onClick={() => {
                                        const val = (formData.highlightInput || '').trim();
                                        if (val) {
                                            setFormData(p => ({ ...p, highlights: [...(p.highlights||[]), val], highlightInput: '' }));
                                        }
                                    }} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all">Add</button>
                                </div>
                                <div className="space-y-1.5 mt-2">
                                    {(formData.highlights || []).map((h, i) => (
                                        <div key={i} className="flex justify-between items-center bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                                            <span className="text-slate-300 text-xs flex items-center gap-2"><span className="text-emerald-400 text-[10px]">⭐</span> {h}</span>
                                            <button type="button" onClick={() => setFormData(p => ({ ...p, highlights: p.highlights.filter((_, idx) => idx !== i) }))} className="text-slate-500 hover:text-red-400 font-black px-2 self-start">×</button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                                    Category
                                    {lockedCategory && (
                                        <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-lg border border-amber-500/20 flex items-center gap-1 font-black uppercase tracking-widest italic">
                                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                            </svg>
                                            Locked to Club
                                        </span>
                                    )}
                                </label>
                                <div className="space-y-4">
                                    <div className="relative">
                                        <select 
                                            name="category" 
                                            value={formData.category} 
                                            disabled={!!lockedCategory}
                                            onChange={(e) => {
                                                if (e.target.value === 'Other') {
                                                    setShowCategoryInput(true);
                                                    setFormData(prev => ({ ...prev, category: 'Other' }));
                                                } else {
                                                    setShowCategoryInput(false);
                                                    handleChange(e);
                                                }
                                            }} 
                                            className={`${inputCls} appearance-none ${lockedCategory ? 'opacity-70 cursor-not-allowed border-amber-500/30' : ''}`}
                                        >
                                            {categories.map(c => (
                                                <option key={c} value={c} className="bg-slate-900">{c}</option>
                                            ))}
                                        </select>
                                        {!lockedCategory && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        )}
                                    </div>

                                    {showCategoryInput && !lockedCategory && (
                                        <div className="flex gap-2 animate-in slide-in-from-top-2 duration-200">
                                            <input
                                                type="text"
                                                placeholder="Enter new category..."
                                                value={newCategory}
                                                onChange={e => setNewCategory(e.target.value)}
                                                className="flex-1 bg-white/5 border border-indigo-500/30 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-indigo-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleSaveCategory}
                                                disabled={savingCategory || !newCategory.trim()}
                                                className="px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20"
                                            >
                                                {savingCategory ? '...' : 'Save'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">Description *</label>
                                <textarea name="description" required rows="4" value={formData.description} onChange={handleChange} className={`${inputCls} resize-none`}></textarea>
                            </div>

                            {/* Club Suggestion Box */}
                            {!isClub && suggestedClubs.length > 0 && (
                                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 mt-2 animate-in fade-in zoom-in-95 duration-300">
                                    <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        ✨ Club Offer Available
                                    </h4>
                                    <p className="text-slate-400 text-xs mb-4">
                                        We found {suggestedClubs.length} club{suggestedClubs.length > 1 ? 's' : ''} in the {formData.category} category. Want to assign this event?
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleSelectClub(null)}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${!selectedClubId ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg' : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'}`}
                                        >
                                            No, host as College Admin
                                        </button>
                                        {suggestedClubs.map(club => (
                                            <button
                                                key={club.id}
                                                type="button"
                                                onClick={() => handleSelectClub(club.id)}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${selectedClubId === club.id ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg' : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'}`}
                                            >
                                                Offer to {club.name}
                                            </button>
                                        ))}
                                    </div>
                                    {selectedClubId && (
                                        <p className="text-[10px] text-indigo-300 mt-3 italic font-medium">
                                            Note: The event status will be "Pending Acceptance" until the club coordinator accepts it.
                                        </p>
                                    )}
                                </div>
                            )}
                            {/* Themes / Tags */}
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-1">Themes / Tags <span className="text-slate-500 font-normal">(optional)</span></label>
                                <p className="text-slate-500 text-xs mb-2">Add keywords like "Web3", "AI", "Dance", "Photography"</p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Type a theme and press Enter or Add"
                                        value={formData.themeInput}
                                        onChange={e => setFormData(p => ({ ...p, themeInput: e.target.value }))}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const tag = formData.themeInput.trim();
                                                if (tag && formData.themes.length < 8 && !formData.themes.includes(tag)) {
                                                    setFormData(p => ({ ...p, themes: [...p.themes, tag], themeInput: '' }));
                                                }
                                            }
                                        }}
                                        className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 outline-none focus:border-indigo-500/50 text-sm"
                                    />
                                    <button type="button" onClick={() => {
                                        const tag = formData.themeInput.trim();
                                        if (tag && formData.themes.length < 8 && !formData.themes.includes(tag)) {
                                            setFormData(p => ({ ...p, themes: [...p.themes, tag], themeInput: '' }));
                                        }
                                    }} className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all">
                                        Add
                                    </button>
                                </div>
                                {formData.themes.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {formData.themes.map(tag => (
                                            <span key={tag} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-medium">
                                                {tag}
                                                <button type="button" onClick={() => setFormData(p => ({ ...p, themes: p.themes.filter(t => t !== tag) }))} className="text-indigo-400 hover:text-red-400 transition-colors text-sm leading-none">×</button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">Event Cover Photo</label>
                                <input type="file" accept="image/*" onChange={e => setCover(e.target.files[0])} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-slate-300 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/20 file:text-indigo-300 hover:file:bg-indigo-500/30 outline-none transition-all cursor-pointer" />
                                <p className="text-slate-400 text-xs mt-2 italic font-medium">Shown on event card to attract students</p>
                            </div>
                        </div>
                    )}

                    {/* STEP 2 — Date & Time */}
                    {step === 2 && (
                        <div className="space-y-5 animate-fadeIn">
                            {/* Start + End Date */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Start Date <span className="text-red-400">*</span></label>
                                    <input type="date" name="eventDate" required value={formData.eventDate} onChange={handleChange} className={`${inputCls} [color-scheme:dark]`} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">End Date <span className="text-slate-500 font-normal">(optional)</span></label>
                                    <input type="date" name="endDate" value={formData.endDate} min={formData.eventDate} onChange={handleChange} className={`${inputCls} [color-scheme:dark]`} />
                                </div>
                            </div>
                            {formData.endDate && formData.endDate !== formData.eventDate && (
                                <p className="text-indigo-400 text-xs font-bold flex items-center gap-1">📅 This is a multi-day event</p>
                            )}

                            {/* Start + End Time (24hr) */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-slate-300 text-sm font-bold mb-1.5 block">
                                        Start Time <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="time"
                                        name="startTime"
                                        value={formData.startTime}
                                        onChange={handleChange}
                                        className={`${inputCls} [color-scheme:dark]`}
                                    />
                                    <p className="text-slate-500 text-[10px] mt-1 font-bold italic">24-hr e.g. 09:00</p>
                                </div>

                                <div>
                                    <label className="text-slate-300 text-sm font-bold mb-1.5 block">
                                        End Time <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="time"
                                        name="endTime"
                                        value={formData.endTime}
                                        onChange={handleChange}
                                        className={`${inputCls} [color-scheme:dark]`}
                                    />
                                    <p className="text-slate-500 text-[10px] mt-1 font-bold italic">24-hr e.g. 17:30</p>
                                </div>
                            </div>
                            
                            {calculateDuration() && (
                                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest italic">⏱ Calculated Duration</span>
                                    <span className="text-white font-black text-xs">{calculateDuration()}</span>
                                </div>
                            )}

                            {/* Optional Registration Deadline */}
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">Registration Deadline <span className="text-slate-500 font-normal">(optional)</span></label>
                                <input type="date" name="registrationDeadline" value={formData.registrationDeadline} onChange={handleChange} className={`${inputCls} [color-scheme:dark]`} />
                                <p className="text-[10px] text-slate-500 mt-2 font-bold italic">
                                    If left blank, registration stays open until the event starts.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* STEP 3 — Location */}
                    {step === 3 && (
                        <div className="space-y-5 animate-fadeIn">
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">Venue *</label>
                                <input type="text" name="venue" required value={formData.venue} onChange={handleChange} className={inputCls} placeholder="e.g. Main Auditorium" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">Venue Map Link <span className="text-slate-500 font-normal">(optional)</span></label>
                                <input type="url" name="venueMapLink" value={formData.venueMapLink} onChange={handleChange} className={inputCls} placeholder="e.g. https://maps.google.com/..." />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">Event Scope *</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, eventScope: 'INTRA' })}
                                        className={`py-3 rounded-xl text-sm font-black transition-all border ${formData.eventScope === 'INTRA' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-white/5 text-slate-400 border-white/10'}`}
                                    >
                                        INTRA-COLLEGE
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, eventScope: 'INTER' })}
                                        className={`py-3 rounded-xl text-sm font-black transition-all border ${formData.eventScope === 'INTER' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-white/5 text-slate-400 border-white/10'}`}
                                    >
                                        INTER-COLLEGE
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2 italic">INTER events are visible to students from all colleges.</p>
                            </div>
                        </div>
                    )}

                    {/* STEP 4 — Participation */}
                    {step === 4 && (
                        <div className="space-y-5 animate-fadeIn">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Max Participants */}
                                <div>
                                    <label className="text-slate-300 text-sm font-bold mb-1.5 block">
                                        Max Participants {!isUnlimited && <span className="text-red-400">*</span>}
                                    </label>

                                    <div className="relative">
                                        <input
                                            type="number"
                                            name="maxParticipants"
                                            min="1"
                                            step="1"
                                            placeholder={isUnlimited ? "" : "e.g. 100"}
                                            value={isUnlimited ? "" : (formData.maxParticipants || "")}
                                            disabled={isUnlimited}
                                            onChange={handleChange}
                                            className={`${inputCls} ${isUnlimited ? "opacity-60 cursor-not-allowed border-indigo-500/50" : ""}`}
                                        />
                                        {isUnlimited && (
                                            <div className="absolute inset-0 flex items-center px-4 pointer-events-none">
                                                <span className="text-indigo-400 text-sm font-bold">∞ Unlimited</span>
                                            </div>
                                        )}
                                    </div>

                                    <label className="flex items-center gap-2.5 mt-3 cursor-pointer group select-none w-fit">
                                        <div
                                            onClick={() => {
                                                const next = !isUnlimited;
                                                setIsUnlimited(next);
                                                if (next) setFormData(p => ({ ...p, maxParticipants: null }));
                                                else setFormData(p => ({ ...p, maxParticipants: 100 }));
                                            }}
                                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-150 flex-shrink-0 ${isUnlimited ? "bg-indigo-500 border-indigo-500" : "border-white/20 hover:border-indigo-400 bg-white/5"}`}
                                        >
                                            {isUnlimited && (
                                                <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                                </svg>
                                            )}
                                        </div>
                                        <span className={`text-xs font-bold transition-colors ${isUnlimited ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-300"}`}>
                                            Allow unlimited registrations
                                        </span>
                                    </label>
                                </div>

                                {/* Registration Fee */}
                                <div>
                                    <label className="text-slate-300 text-sm font-bold mb-1.5 block">
                                        Registration Fee {!isFree && <span className="text-red-400">*</span>}
                                    </label>

                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-sm select-none">₹</span>
                                        <input
                                            type="number"
                                            name="registrationFee"
                                            min="0"
                                            step="1"
                                            placeholder="0"
                                            value={isFree ? 0 : formData.registrationFee}
                                            disabled={isFree}
                                            onChange={handleChange}
                                            className={`${inputCls} pl-8 ${isFree ? "opacity-60 cursor-not-allowed border-emerald-500/50" : ""}`}
                                        />
                                        {isFree && (
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400 text-sm font-black tracking-widest">FREE</span>
                                        )}
                                    </div>

                                    <label className="flex items-center gap-2.5 mt-3 cursor-pointer group select-none w-fit">
                                        <div
                                            onClick={() => {
                                                const next = !isFree;
                                                setIsFree(next);
                                                if (next) setFormData(p => ({ ...p, registrationFee: 0 }));
                                            }}
                                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-150 flex-shrink-0 ${isFree ? "bg-emerald-500 border-emerald-500" : "border-white/20 hover:border-emerald-400 bg-white/5"}`}
                                        >
                                            {isFree && (
                                                <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                                </svg>
                                            )}
                                        </div>
                                        <span className={`text-xs font-bold transition-colors ${isFree ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-300"}`}>
                                            Make this event free
                                        </span>
                                    </label>
                                </div>
                            </div>
                            {/* Prizes */}
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">Prizes / Rewards <span className="text-slate-500 font-normal">(optional)</span></label>
                                {formData.prizes.map((prize, i) => (
                                    <div key={i} className="flex gap-2 mb-2 items-center">
                                        <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏅'}</span>
                                        <input type="text" placeholder="Position (e.g. 1st Prize)" value={prize.position}
                                            onChange={e => { const u = [...formData.prizes]; u[i] = { ...u[i], position: e.target.value }; setFormData(p => ({ ...p, prizes: u })); }}
                                            className="flex-1 bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 outline-none focus:border-indigo-500/50 text-sm" />
                                        <input type="text" placeholder="Amount (e.g. ₹30,000)" value={prize.amount}
                                            onChange={e => { const u = [...formData.prizes]; u[i] = { ...u[i], amount: e.target.value }; setFormData(p => ({ ...p, prizes: u })); }}
                                            className="flex-1 bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 outline-none focus:border-indigo-500/50 text-sm" />
                                        <input type="text" placeholder="Extra info" value={prize.description}
                                            onChange={e => { const u = [...formData.prizes]; u[i] = { ...u[i], description: e.target.value }; setFormData(p => ({ ...p, prizes: u })); }}
                                            className="flex-1 bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 outline-none focus:border-indigo-500/50 text-sm" />
                                        <button type="button" onClick={() => setFormData(p => ({ ...p, prizes: p.prizes.filter((_, idx) => idx !== i) }))} className="text-red-400 hover:text-red-300 text-lg px-1">×</button>
                                    </div>
                                ))}
                                {formData.prizes.length < 5 && (
                                    <button type="button" onClick={() => setFormData(p => ({ ...p, prizes: [...p.prizes, { position: '', amount: '', description: '' }] }))}
                                        className="mt-1 flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
                                        <span className="text-lg">+</span> Add prize
                                    </button>
                                )}
                            </div>

                            <div className="pt-4 border-t border-white/5 space-y-5">
                                <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                    👥 Participation Settings
                                </h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-300 mb-2">Registration Type</label>
                                        <div className="flex flex-wrap gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/5">
                                            {['INDIVIDUAL', 'TEAM', 'BOTH'].map((type) => (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={() => setFormData(p => ({ ...p, registrationType: type }))}
                                                    className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex-1 ${formData.registrationType === type ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                                >
                                                    {type.charAt(0) + type.slice(1).toLowerCase()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {formData.registrationType !== 'INDIVIDUAL' && (
                                        <div className="animate-fadeIn">
                                            <label className="block text-sm font-bold text-slate-300 mb-2">Max. Teams</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    name="maxTeams"
                                                    min="1"
                                                    disabled={maxTeamsUnlimited}
                                                    value={maxTeamsUnlimited ? "" : formData.maxTeams}
                                                    onChange={handleChange}
                                                    className={`${inputCls} ${maxTeamsUnlimited ? "opacity-60 cursor-not-allowed border-indigo-500/50" : ""}`}
                                                />
                                                {maxTeamsUnlimited && (
                                                    <div className="absolute inset-0 flex items-center px-4 pointer-events-none">
                                                        <span className="text-indigo-400 text-sm font-bold">∞ Unlimited Teams</span>
                                                    </div>
                                                )}
                                            </div>
                                            <label onClick={() => setMaxTeamsUnlimited(!maxTeamsUnlimited)} className="flex items-center gap-2 mt-2 cursor-pointer group w-fit">
                                                <div className={`w-4 h-4 rounded border-2 transition-all ${maxTeamsUnlimited ? 'bg-indigo-500 border-indigo-500' : 'border-white/20'}`}>
                                                    {maxTeamsUnlimited && <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>}
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-500 group-hover:text-indigo-400 uppercase tracking-wider transition-colors">Unlimited teams</span>
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {formData.registrationType !== 'INDIVIDUAL' && (
                                    <div className="grid grid-cols-2 gap-4 animate-fadeIn">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-300 mb-2">Min Team Size</label>
                                            <input type="number" name="teamMinSize" min="1" value={formData.teamMinSize} onChange={handleChange} className={inputCls} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-300 mb-2">Max Team Size</label>
                                            <input type="number" name="teamMaxSize" min={formData.teamMinSize} value={formData.teamMaxSize} onChange={handleChange} className={inputCls} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 5 — Payment Details (Only if not free) */}
                    {step === 5 && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-6">
                                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                    💳 Payment Setup
                                </h3>
                                <p className="text-slate-400 text-sm mb-6">
                                    Since this is a paid event (₹{formData.registrationFee}), you need to provide payment details for students.
                                </p>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-300 mb-2">UPI ID *</label>
                                        <input 
                                            type="text" 
                                            name="upiId" 
                                            placeholder="e.g. college@okaxis" 
                                            value={formData.upiId} 
                                            onChange={handleChange} 
                                            className={inputCls} 
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-300 mb-2">Account Name / Holder Name *</label>
                                        <input 
                                            type="text" 
                                            name="upiName" 
                                            placeholder="e.g. College Cultural Committee" 
                                            value={formData.upiName} 
                                            onChange={handleChange} 
                                            className={inputCls} 
                                        />
                                        <p className="text-[10px] text-slate-500 mt-2 italic font-medium">This name will be shown to students to verify payment.</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-300 mb-2">Payment QR Code *</label>
                                        <div 
                                            className="w-full h-48 bg-black/40 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500/50 transition-all overflow-hidden relative"
                                            onClick={() => document.getElementById('qr-upload').click()}
                                        >
                                            {paymentQr ? (
                                                <>
                                                    <img src={URL.createObjectURL(paymentQr)} alt="QR Preview" className="w-full h-full object-contain p-2" />
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                                                        <span className="text-white text-xs font-bold">Change QR</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-3xl mb-2">📷</span>
                                                    <span className="text-slate-400 text-sm font-bold">Click to upload QR Code</span>
                                                    <span className="text-slate-600 text-[10px] mt-1">PNG, JPG or WEBP</span>
                                                </>
                                            )}
                                        </div>
                                        <input 
                                            id="qr-upload" 
                                            type="file" 
                                            accept="image/*" 
                                            onChange={(e) => setPaymentQr(e.target.files[0])} 
                                            className="hidden" 
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                                <span className="text-amber-400 text-lg mt-0.5">💡</span>
                                <p className="text-amber-200/80 text-xs font-medium leading-relaxed">
                                    Tip: Use a clear, high-quality QR code. Students will scan this at registration and upload a screenshot of their transaction.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* STEP 6 — Extra Details */}
                    {step === 6 && (
                        <div className="space-y-5 animate-fadeIn">
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">Rules & Guidelines</label>
                                <textarea name="rules" rows="3" value={formData.rules} onChange={handleChange} className={`${inputCls} resize-none`}></textarea>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Eligibility (preset)</label>
                                    <select name="eligibilityCriteria" value={formData.eligibilityCriteria} onChange={handleChange} className={`${inputCls} appearance-none`}>
                                        <option value="Open to All" className="bg-slate-900">Open to All</option>
                                        <option value="Same College Only" className="bg-slate-900">Same College Only</option>
                                        <option value="Specific Year" className="bg-slate-900">Specific Year</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Required Materials</label>
                                    <input type="text" name="requiredMaterials" value={formData.requiredMaterials} onChange={handleChange} className={inputCls} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">Eligibility Criteria <span className="text-slate-500 font-normal">(optional, free text)</span></label>
                                <textarea name="eligibility" placeholder="Who can participate? e.g. Open to all 1st and 2nd year students. Streams: BCA, BBA, MCA" value={formData.eligibility} onChange={handleChange} rows={3} className={`${inputCls} resize-none`} />
                            </div>

                            {/* Additional Arrays: Topics, Highlights, Guests, Judges */}
                            <div className="pt-4 border-t border-white/5 space-y-5">
                                <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                    ✨ Extra Enhancements (Optional)
                                </h4>

                                {/* Topics */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-1">Topics Covered</label>
                                    <p className="text-slate-500 text-xs mb-2">e.g. React.js, Web3 basics, Public Speaking</p>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Add a topic..."
                                            value={formData.topicInput || ''}
                                            onChange={e => setFormData(p => ({ ...p, topicInput: e.target.value }))}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const tag = (formData.topicInput || '').trim();
                                                    if (tag && !formData.topics?.includes(tag)) {
                                                        setFormData(p => ({ ...p, topics: [...(p.topics||[]), tag], topicInput: '' }));
                                                    }
                                                }
                                            }}
                                            className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-slate-500 outline-none focus:border-indigo-500/50 text-sm"
                                        />
                                        <button type="button" onClick={() => {
                                            const tag = (formData.topicInput || '').trim();
                                            if (tag && !formData.topics?.includes(tag)) {
                                                setFormData(p => ({ ...p, topics: [...(p.topics||[]), tag], topicInput: '' }));
                                            }
                                        }} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all">Add</button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {(formData.topics || []).map(tag => (
                                            <span key={tag} className="flex items-center gap-1 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs shadow-sm">
                                                {tag}
                                                <button type="button" onClick={() => setFormData(p => ({ ...p, topics: p.topics.filter(t => t !== tag) }))} className="text-slate-400 hover:text-red-400 ml-1">×</button>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Highlights */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-1">Key Highlights</label>
                                    <p className="text-slate-500 text-xs mb-2">e.g. Hands-on project, Certificate of Completion</p>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Add an event highlight..."
                                            value={formData.highlightInput || ''}
                                            onChange={e => setFormData(p => ({ ...p, highlightInput: e.target.value }))}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const val = (formData.highlightInput || '').trim();
                                                    if (val) {
                                                        setFormData(p => ({ ...p, highlights: [...(p.highlights||[]), val], highlightInput: '' }));
                                                    }
                                                }
                                            }}
                                            className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-slate-500 outline-none focus:border-indigo-500/50 text-sm"
                                        />
                                        <button type="button" onClick={() => {
                                            const val = (formData.highlightInput || '').trim();
                                            if (val) {
                                                setFormData(p => ({ ...p, highlights: [...(p.highlights||[]), val], highlightInput: '' }));
                                            }
                                        }} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all">Add</button>
                                    </div>
                                    <div className="space-y-2 mt-2">
                                        {(formData.highlights || []).map((h, i) => (
                                            <div key={i} className="flex justify-between items-start bg-slate-800/50 p-2 rounded-lg border border-slate-700">
                                                <span className="text-slate-300 text-sm flex items-center gap-2"><span className="text-emerald-400 text-xs">⭐</span> {h}</span>
                                                <button type="button" onClick={() => setFormData(p => ({ ...p, highlights: p.highlights.filter((_, idx) => idx !== i) }))} className="text-slate-500 hover:text-red-400 text-lg px-2">×</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Chief Guests */}
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <label className="text-sm font-bold text-slate-300">Chief Guests</label>
                                        <button 
                                            type="button" 
                                            onClick={() => setFormData(p => ({ ...p, chiefGuests: [...p.chiefGuests, { name: '', photo: null, photoPreview: null }] }))}
                                            className="text-indigo-400 text-xs font-bold hover:text-indigo-300"
                                        >
                                            + Add Guest
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {formData.chiefGuests.map((cg, i) => (
                                            <div key={i} className="bg-slate-800/50 border border-slate-700 p-4 rounded-2xl relative flex items-center gap-4">
                                                <button 
                                                    type="button" 
                                                    onClick={() => setFormData(p => ({ ...p, chiefGuests: p.chiefGuests.filter((_, idx) => idx !== i) }))}
                                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs shadow-lg font-black"
                                                >✕</button>
                                                
                                                <div 
                                                    className="w-14 h-14 rounded-full border-2 border-indigo-500/30 flex-shrink-0 bg-slate-700 overflow-hidden cursor-pointer relative group"
                                                    onClick={() => document.getElementById(`guest_photo_input_${i}`).click()}
                                                >
                                                    {cg.photoPreview ? (
                                                        <img src={cg.photoPreview} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full text-xl opacity-50">👤</div>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[8px] text-white font-bold">CHANGE</div>
                                                </div>
                                                <input 
                                                    id={`guest_photo_input_${i}`}
                                                    type="file" 
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={e => {
                                                        const file = e.target.files[0];
                                                        if (file) {
                                                            const u = [...formData.chiefGuests];
                                                            u[i] = { ...u[i], photo: file, photoPreview: URL.createObjectURL(file) };
                                                            setFormData(p => ({ ...p, chiefGuests: u }));
                                                        }
                                                    }}
                                                />
                                                <input 
                                                    type="text" 
                                                    placeholder="Name, Role"
                                                    value={cg.name}
                                                    onChange={e => {
                                                        const u = [...formData.chiefGuests];
                                                        u[i] = { ...u[i], name: e.target.value };
                                                        setFormData(p => ({ ...p, chiefGuests: u }));
                                                    }}
                                                    className="bg-transparent border-b border-slate-700 focus:border-indigo-500 outline-none text-white text-sm w-full py-1 h-fit"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Judges */}
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <label className="text-sm font-bold text-slate-300">Event Judges</label>
                                        <button 
                                            type="button" 
                                            onClick={() => setFormData(p => ({ ...p, judges: [...p.judges, { name: '', photo: null, photoPreview: null }] }))}
                                            className="text-indigo-400 text-xs font-bold hover:text-indigo-300"
                                        >
                                            + Add Judge
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {formData.judges.map((jd, i) => (
                                            <div key={i} className="bg-slate-800/50 border border-slate-700 p-4 rounded-2xl relative flex items-center gap-4">
                                                <button 
                                                    type="button" 
                                                    onClick={() => setFormData(p => ({ ...p, judges: p.judges.filter((_, idx) => idx !== i) }))}
                                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs shadow-lg font-black"
                                                >✕</button>
                                                
                                                <div 
                                                    className="w-14 h-14 rounded-full border-2 border-indigo-500/30 flex-shrink-0 bg-slate-700 overflow-hidden cursor-pointer relative group"
                                                    onClick={() => document.getElementById(`judge_photo_input_${i}`).click()}
                                                >
                                                    {jd.photoPreview ? (
                                                        <img src={jd.photoPreview} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full text-xl opacity-50">⚖️</div>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[8px] text-white font-bold">CHANGE</div>
                                                </div>
                                                <input 
                                                    id={`judge_photo_input_${i}`}
                                                    type="file" 
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={e => {
                                                        const file = e.target.files[0];
                                                        if (file) {
                                                            const u = [...formData.judges];
                                                            u[i] = { ...u[i], photo: file, photoPreview: URL.createObjectURL(file) };
                                                            setFormData(p => ({ ...p, judges: u }));
                                                        }
                                                    }}
                                                />
                                                <input 
                                                    type="text" 
                                                    placeholder="Name, Expertise"
                                                    value={jd.name}
                                                    onChange={e => {
                                                        const u = [...formData.judges];
                                                        u[i] = { ...u[i], name: e.target.value };
                                                        setFormData(p => ({ ...p, judges: u }));
                                                    }}
                                                    className="bg-transparent border-b border-slate-700 focus:border-indigo-500 outline-none text-white text-sm w-full py-1 h-fit"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-black/20 p-5 rounded-2xl border border-white/10 mt-6 backdrop-blur-md">
                                <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-3">Organizer</h4>
                                <div className="text-white">
                                    <p className="font-bold text-lg">{user.collegeName}</p>
                                    <p className="text-slate-400 text-sm font-medium mt-1">Organized by: <span className="text-white">{isClub ? `${user.clubName} (Club)` : 'College Board'}</span></p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 7 — Photos */}
                    {step === 7 && (
                        <div className="animate-fadeIn">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <label className="text-slate-200 text-sm font-semibold block">📸 Event Photos <span className="text-slate-500 font-normal">(optional)</span></label>
                                    <p className="text-slate-500 text-xs mt-0.5">Add up to 5 photos — shown on event cards and detail page</p>
                                </div>
                                <span className={`text-sm font-semibold px-3 py-1 rounded-full ${eventPhotos.length >= 5 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700/50 text-slate-400'}`}>
                                    {eventPhotos.length} / 5
                                </span>
                            </div>

                            {eventPhotos.length < 5 && (
                                <div
                                    onClick={() => photoInputRef.current?.click()}
                                    onDrop={e => { e.preventDefault(); setPhotoDragging(false); addPhotos(e.dataTransfer.files); }}
                                    onDragOver={e => { e.preventDefault(); setPhotoDragging(true); }}
                                    onDragLeave={() => setPhotoDragging(false)}
                                    className={`rounded-2xl border-2 border-dashed cursor-pointer p-8 text-center transition-all duration-200 mb-4 ${photoDragging ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]' : 'border-slate-600 bg-slate-700/20 hover:border-indigo-500/60 hover:bg-slate-700/40'}`}
                                >
                                    <div className="text-4xl mb-3">{photoDragging ? '📂' : '🖼️'}</div>
                                    <p className="text-slate-300 text-sm font-medium">{photoDragging ? 'Drop photos here!' : 'Drag & drop photos or click to browse'}</p>
                                    <p className="text-slate-500 text-xs mt-1">JPG, PNG, WEBP · Max 5 photos · 16MB each</p>
                                    {eventPhotos.length === 0 && (
                                        <p className="text-indigo-400 text-xs mt-2 font-medium">✨ Photos make students 3× more likely to register</p>
                                    )}
                                </div>
                            )}

                            <input ref={photoInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" multiple onChange={e => addPhotos(e.target.files)} className="hidden" />

                            {eventPhotos.length > 0 && (
                                <div className="grid grid-cols-5 gap-2">
                                    {eventPhotos.map((photo, i) => (
                                        <div key={i} className="relative group rounded-xl overflow-hidden aspect-square bg-slate-700 border border-slate-600/50">
                                            <img src={photo.preview} alt={`Event photo ${i + 1}`} className="w-full h-full object-cover" />
                                            <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                                                <span className="text-white text-xs font-bold">{i + 1}</span>
                                            </div>
                                            <button type="button" onClick={() => removePhoto(i)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-lg">×</button>
                                            {i === 0 && (
                                                <div className="absolute bottom-1 left-1 right-1 bg-indigo-500/80 rounded-lg py-0.5 text-center">
                                                    <span className="text-white text-xs font-medium">Cover</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {eventPhotos.length < 5 && (
                                        <button type="button" onClick={() => photoInputRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-slate-600 hover:border-indigo-500 bg-slate-700/30 hover:bg-slate-700/50 flex flex-col items-center justify-center transition-all gap-1">
                                            <span className="text-slate-400 text-2xl">+</span>
                                            <span className="text-slate-500 text-xs">Add more</span>
                                        </button>
                                    )}
                                </div>
                            )}
                            {eventPhotos.length > 0 && (
                                <p className="text-slate-500 text-xs mt-2">📌 Photo 1 is used as the card thumbnail on the home page</p>
                            )}
                        </div>
                    )}

                    <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-white/10">
                        {step > 1 && (
                            <button type="button" onClick={prevStep} disabled={loading} className="px-6 py-2.5 rounded-xl text-white font-bold hover:bg-white/10 border border-white/20 transition-all disabled:opacity-50">Back</button>
                        )}
                        {step < TOTAL_STEPS ? (
                            <button type="submit" className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)]">Next</button>
                        ) : (
                            <button type="submit" disabled={loading} className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] disabled:opacity-50 flex items-center gap-2">
                                {loading ? (<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>Creating...</>) : 'Launch Event'}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
