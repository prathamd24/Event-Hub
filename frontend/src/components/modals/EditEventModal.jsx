import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { toast } from '../../components/Toast';
import { BACKEND_URL } from '../../config';

export default function EditEventModal({ isOpen, onClose, onSuccess, initialData, apiPrefix = 'college-admin', clubId }) {
    const BASE = BACKEND_URL;
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [cover, setCover] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [eventPhotos, setEventPhotos] = useState([]);
    const [photoDragging, setPhotoDragging] = useState(false);
    const [isFree, setIsFree] = useState(false);
    const [isUnlimited, setIsUnlimited] = useState(false);
    const [maxTeamsUnlimited, setMaxTeamsUnlimited] = useState(false);
    const [error, setError] = useState("");
    const photoInputRef = useRef(null);
    const [paymentQr, setPaymentQr] = useState(null);
    const [qrPreview, setQrPreview] = useState(null);
    const [categories, setCategories] = useState([]);
    const [showCategoryInput, setShowCategoryInput] = useState(false);
    const [newCategory, setNewCategory] = useState("");
    const [savingCategory, setSavingCategory] = useState(false);
    const [lockedCategory, setLockedCategory] = useState(null);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const q = (apiPrefix === 'club' && clubId) ? `?club_id=${clubId}` : '';
                const endpoint = (apiPrefix === 'club') ? `/api/club/categories${q}` : `/api/college-admin/categories${q}`;
                const res = await api.get(endpoint);
                setCategories(res.data.categories || []);
                if (apiPrefix === 'club' && res.data.clubCategory) {
                    setLockedCategory(res.data.clubCategory);
                }
            } catch (err) {
                console.error("Fetch categories failed", err);
                setCategories(["Technical", "Cultural", "Sports", "Literary", "Workshop", "Seminar", "Hackathon", "Competition", "Social", "Other"]);
            }
        };
        fetchCategories();
    }, [apiPrefix, isOpen]);

    const handleSaveCategory = async () => {
        if (!newCategory.trim()) return;
        setSavingCategory(true);
        try {
            const q = (apiPrefix === 'club' && clubId) ? `?club_id=${clubId}` : '';
            const endpoint = (apiPrefix === 'club') ? `/api/club/categories${q}` : `/api/college-admin/categories${q}`;
            await api.post(endpoint, { category: newCategory });
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

    const [formData, setFormData] = useState({
        title: '', description: '', category: 'Technical', eventDate: '',
        endDate: '', startTime: '', endTime: '', registrationDeadline: '', venue: '',
        maxParticipants: 100, registrationFee: 0, rules: '',
        eligibilityCriteria: 'Open to All', eligibility: '', requiredMaterials: '',
        themes: [], themeInput: '', prizes: [],
        eventScope: 'INTRA', venueMapLink: '',
        upiId: '',
        upiName: '',
        registrationType: 'INDIVIDUAL',
        teamMinSize: 2,
        teamMaxSize: 4,
        maxTeams: 10,
        topics: [],
        highlights: [],
        chiefGuests: [],
        judges: [],
        topicInput: '',
        highlightInput: '',
        guestInput: '',
        judgeInput: '',
    });

    const prevInitialDataId = useRef(null);

    useEffect(() => {
        if (isOpen && initialData) {
            if (prevInitialDataId.current !== initialData.id) {
                setFormData({
                    title: initialData.title || '',
                    description: initialData.description || '',
                    category: initialData.category || 'Technical',
                    eventDate: initialData.eventDate ? initialData.eventDate.split('T')[0] : '',
                    endDate: initialData.endDate ? initialData.endDate.split('T')[0] : '',
                    startTime: initialData.startTime || '',
                    endTime: initialData.endTime || '',
                    registrationDeadline: initialData.registrationDeadline ? initialData.registrationDeadline.split('T')[0] : '',
                    venue: initialData.venue || '',
                    maxParticipants: initialData.maxParticipants,
                    registrationFee: initialData.registrationFee ?? 0,
                    rules: initialData.rules || '',
                    eligibilityCriteria: initialData.eligibilityCriteria || 'Open to All',
                    eligibility: initialData.eligibility || '',
                    requiredMaterials: initialData.requiredMaterials || '',
                    themes: initialData.themes || [],
                    themeInput: '',
                    prizes: initialData.prizes || [],
                    eventScope: initialData.eventScope || 'INTRA',
                    venueMapLink: initialData.venueMapLink || '',
                    upiId: initialData.upiId || '',
                    upiName: initialData.upiName || '',
                    registrationType: initialData.registrationType || 'INDIVIDUAL',
                    teamMinSize: initialData.teamMinSize || 2,
                    teamMaxSize: initialData.teamMaxSize || 4,
                    maxTeams: initialData.maxTeams || 10,
                    topics: initialData.topics || [],
                    highlights: initialData.highlights || [],
                    chiefGuests: (initialData.chief_guests || []).map(g => ({
                        name: typeof g === 'string' ? g : (g.name || ''),
                        photo: null,
                        photoPreview: typeof g === 'object' && g.photo ? `${BASE}${g.photo}` : null,
                        existingPhoto: typeof g === 'object' ? g.photo : null,
                        existing: true
                    })),
                    judges: (initialData.judges || []).map(j => ({
                        name: typeof j === 'string' ? j : (j.name || ''),
                        photo: null,
                        photoPreview: typeof j === 'object' && j.photo ? `${BASE}${j.photo}` : null,
                        existingPhoto: typeof j === 'object' ? j.photo : null,
                        existing: true
                    })),
                    topicInput: '',
                    highlightInput: '',
                    guestInput: '',
                    judgeInput: '',
                });
                setIsFree((initialData.registrationFee ?? 0) === 0);
                setIsUnlimited(initialData.maxParticipants === null || initialData.maxParticipants === undefined);
                setMaxTeamsUnlimited(initialData.maxTeams === null || initialData.maxTeams === undefined);
                setPreviewUrl(initialData.coverUrl ? `${BASE}${initialData.coverUrl}` : null);
                setQrPreview(initialData.paymentQrUrl ? `${BASE}${initialData.paymentQrUrl}` : null);

                // Pre-populate photos
                const existing = (initialData.eventPhotos || []).map(url => ({
                    file: null, preview: `${BASE}${url}`, existing: true, url
                }));
                setEventPhotos(existing);
                
                prevInitialDataId.current = initialData.id;
            }
        } else if (!isOpen) {
            prevInitialDataId.current = null;
        }
    }, [isOpen, initialData, BASE]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setError(""); // Clear error

        if (name === 'registrationFee' && !isFree) {
            const val = Math.max(0, parseInt(value) || 0);
            setFormData(p => ({ ...p, registrationFee: val }));
        } else if (name === 'maxParticipants' && !isUnlimited) {
            const val = Math.max(1, parseInt(value) || 1);
            setFormData(p => ({ ...p, maxParticipants: val }));
        } else if (name === 'maxTeams' && !maxTeamsUnlimited) {
            const val = Math.max(1, parseInt(value) || 1);
            setFormData(p => ({ ...p, maxTeams: val }));
        } else if (name === 'teamMinSize') {
            const val = Math.max(1, parseInt(value) || 1);
            setFormData(p => ({ ...p, teamMinSize: val }));
        } else if (name === 'teamMaxSize') {
            const val = Math.max(1, parseInt(value) || 1);
            setFormData(p => ({ ...p, teamMaxSize: val }));
        } else {
            setFormData(p => ({ ...p, [name]: value }));
        }
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
            file, preview: URL.createObjectURL(file), existing: false, url: null
        }));
        setEventPhotos(prev => [...prev, ...toAdd].slice(0, 5));
    };

    const removePhoto = (index) => {
        setEventPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = new FormData();

            const simpleFields = ['title', 'description', 'category', 'eventDate', 'endDate',
                'startTime', 'endTime', 'venue', 'venueMapLink', 'eventScope',
                'rules', 'eligibilityCriteria', 'eligibility', 'requiredMaterials'];
            simpleFields.forEach(k => data.append(k, formData[k] ?? ''));

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

            data.append('themes', JSON.stringify(formData.themes));
            data.append('prizes', JSON.stringify(formData.prizes));

            const guestList = formData.chiefGuests.map(g => ({
                name: g.name,
                photo: g.photo ? null : g.existingPhoto
            }));
            data.append('chiefGuests', JSON.stringify(guestList));
            formData.chiefGuests.forEach((g, i) => {
                if (g.photo) data.append(`guest_photo_${i}`, g.photo);
            });

            const judgeList = formData.judges.map(g => ({
                name: g.name,
                photo: g.photo ? null : g.existingPhoto
            }));
            data.append('judges', JSON.stringify(judgeList));
            formData.judges.forEach((g, i) => {
                if (g.photo) data.append(`judge_photo_${i}`, g.photo);
            });

            if (formData.topics?.length > 0) data.append('topics', JSON.stringify(formData.topics));
            if (formData.highlights?.length > 0) data.append('highlights', JSON.stringify(formData.highlights));

            if (!isFree) {
                data.append('upiId', formData.upiId);
                data.append('upiName', formData.upiName);
                if (paymentQr) data.append('paymentQr', paymentQr);
            }

            if (cover) data.append('cover', cover);

            // Photos to remove (existing that were removed)
            const removed = (initialData.eventPhotos || []).filter(url =>
                !eventPhotos.some(p => p.existing && p.url === url)
            );
            if (removed.length) data.append('remove_photos', JSON.stringify(removed));

            // New photos to upload
            let photoIdx = 0;
            eventPhotos.forEach(p => {
                if (p.file) {
                    data.append(`photo_${photoIdx++}`, p.file);
                }
            });

            const q = (apiPrefix === 'club' && clubId) ? `?club_id=${clubId}` : '';
            const res = await api.put(`/api/${apiPrefix}/events/${initialData.id}${q}`, data);
            toast('Event updated successfully', 'success');
            setTimeout(() => {
                setLoading(false);
                onSuccess(res.data);
                onClose();
            }, 800);
        } catch (err) {
            toast(err.response?.data?.error || 'Failed to update event', 'error');
            setLoading(false);
        }
    };

    const steps = ['Basic Info', 'Date & Time', 'Location', 'Participation', 'Payment Details', 'Extra Details', 'Photos'];
    const TOTAL_STEPS = 7;
    const nextStep = () => {
        const todayStr = new Date().toISOString().split("T")[0];

        if (step === 1) {
            if (!formData.title.trim()) { setError("Event title is required"); return; }
            if (!formData.description.trim()) { setError("Description is required"); return; }
        }

        if (step === 2) {
            if (!formData.eventDate) { setError("Start date is required"); return; }
            
            // Allow editing existing date even if in past (but new date must be >= today)
            const isNewDate = formData.eventDate !== initialData.eventDate?.split('T')[0];
            if (isNewDate && formData.eventDate < todayStr) {
                setError("Start date cannot be in the past"); return;
            }

            if (!formData.endDate) { setError("End date is required"); return; }
            if (formData.endDate < formData.eventDate) {
                setError("End date cannot be before start date"); return;
            }
            if (!formData.startTime) { setError("Start time is required"); return; }
            if (!formData.endTime) { setError("End time is required"); return; }
            
            // Time validation for same-day events
            if (formData.endDate === formData.eventDate || !formData.endDate) {
                if (formData.endTime <= formData.startTime) {
                    setError("End time must be after start time"); return;
                }
            }

            if (formData.registrationDeadline) {
                if (formData.registrationDeadline > formData.eventDate) {
                    setError("Registration deadline must be before or on the event start date"); 
                    return;
                }
                const isNewDeadline = formData.registrationDeadline !== initialData.registrationDeadline?.split('T')[0];
                if (isNewDeadline && formData.registrationDeadline < todayStr) {
                    setError("Registration deadline cannot be in the past"); return;
                }
            }
        }
        
        if (step === 4) {
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
                if (!paymentQr && !qrPreview) { setError("Payment QR code is required for paid events"); return; }
            }
        }

        setError("");
        if (step === 4 && isFree) {
            setStep(s => s + 2); // Skip Payment Details if free
        } else {
            setStep(s => Math.min(s + 1, TOTAL_STEPS));
        }
    };
    const prevStep = () => {
        setError("");
        if (step === 6 && isFree) {
            setStep(s => s - 2); // Go back to Participation if free
        } else {
            setStep(s => Math.max(s - 1, 1));
        }
    };

    const inputCls = "w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 focus:bg-white/5 transition-all font-medium";

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-hidden">
            <div className="bg-[#0f172a] sm:bg-white/10 backdrop-blur-3xl border border-white/20 rounded-t-[2.5rem] sm:rounded-3xl w-full sm:max-w-2xl shadow-2xl overflow-y-auto my-0 sm:my-8 animate-slideUp sm:animate-fadeIn relative max-h-[90vh] pb-8 sm:pb-0">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none" />

                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 relative z-10">
                    <div>
                        <h2 className="text-2xl font-display font-black text-white">Edit Event</h2>
                        <p className="text-slate-400 text-sm font-medium">Update event details</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-all">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
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
                    {/* STEP 1 */}
                    {step === 1 && (
                        <div className="space-y-5 animate-fadeIn">
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">Event Title *</label>
                                <input type="text" name="title" required value={formData.title} onChange={handleChange} className={inputCls} />
                            </div>

                            {/* Topics & Highlights moved up */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-1">Topics / Agenda</label>
                                    <div className="flex gap-1.5">
                                        <input type="text" placeholder="e.g. Workshop" value={formData.topicInput} onChange={e=>setFormData(p=>({...p, topicInput: e.target.value}))} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault(); const v=formData.topicInput.trim(); if(v){setFormData(p=>({...p, topics:[...p.topics, v], topicInput:''}))}}}} className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs" />
                                        <button type="button" onClick={()=>{const v=formData.topicInput.trim(); if(v) setFormData(p=>({...p, topics:[...p.topics, v], topicInput:''}))}} className="bg-slate-700 px-2 rounded-lg text-white font-bold text-xs">+</button>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                        {formData.topics.map((t,i)=>(
                                            <span key={i} className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full flex items-center gap-1 border border-indigo-500/30">
                                                {t} <button type="button" onClick={()=>setFormData(p=>({...p, topics: p.topics.filter((_,idx)=>idx!==i)}))} className="hover:text-red-400">×</button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-1">Event Highlights</label>
                                    <div className="flex gap-1.5">
                                        <input type="text" placeholder="e.g. Free Pizza" value={formData.highlightInput} onChange={e=>setFormData(p=>({...p, highlightInput: e.target.value}))} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault(); const v=formData.highlightInput.trim(); if(v){setFormData(p=>({...p, highlights:[...p.highlights, v], highlightInput:''}))}}}} className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs" />
                                        <button type="button" onClick={()=>{const v=formData.highlightInput.trim(); if(v) setFormData(p=>({...p, highlights:[...p.highlights, v], highlightInput:''}))}} className="bg-slate-700 px-2 rounded-lg text-white font-bold text-xs">+</button>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                        {formData.highlights.map((h,i)=>(
                                            <span key={i} className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/30">
                                                {h} <button type="button" onClick={()=>setFormData(p=>({...p, highlights: p.highlights.filter((_,idx)=>idx!==i)}))} className="hover:text-red-400">×</button>
                                            </span>
                                        ))}
                                    </div>
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
                                <textarea name="description" required rows="3" value={formData.description} onChange={handleChange} className={`${inputCls} resize-none`} />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">Cover Photo</label>
                                {previewUrl && (
                                    <div className="mb-3 rounded-2xl overflow-hidden h-32 relative border border-white/10 shadow-lg group">
                                        <img src={previewUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="Event cover preview" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-4">
                                            <span className="text-white text-xs font-bold uppercase tracking-wider">Current Cover</span>
                                        </div>
                                    </div>
                                )}
                                <input type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if (f) { setCover(f); setPreviewUrl(URL.createObjectURL(f)); } }} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-slate-300 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/20 file:text-indigo-300 hover:file:bg-indigo-500/30 outline-none transition-all cursor-pointer" />
                                {previewUrl && <p className="text-slate-400 text-xs mt-2 italic font-medium">Upload a new file to replace the current cover</p>}
                            </div>
                        </div>
                    )}

                    {/* STEP 2 */}
                    {step === 2 && (
                        <div className="space-y-5 animate-fadeIn">
                            {/* Start + End Date */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Start Date <span className="text-red-400">*</span></label>
                                    <input type="date" name="eventDate" required value={formData.eventDate} onChange={handleChange} className={`${inputCls} [color-scheme:dark]`} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">End Date <span className="text-red-400">*</span></label>
                                    <input type="date" name="endDate" required value={formData.endDate} min={formData.eventDate} onChange={handleChange} className={`${inputCls} [color-scheme:dark]`} />
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
                    {step === 3 && (
                        <div className="animate-fadeIn">
                            <label className="block text-sm font-bold text-slate-300 mb-2">Venue *</label>
                            <input type="text" name="venue" required value={formData.venue} onChange={handleChange} placeholder="e.g. Main Auditorium" className={inputCls} />
                            <div className="mt-5">
                                <label className="block text-sm font-bold text-slate-300 mb-2">Venue Map Link <span className="text-slate-500 font-normal">(optional)</span></label>
                                <input type="url" name="venueMapLink" value={formData.venueMapLink} onChange={handleChange} className={inputCls} placeholder="e.g. https://maps.google.com/..." />
                            </div>
                            <div className="mt-5">
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
                            </div>
                        </div>
                    )}

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
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">Prizes / Rewards <span className="text-slate-500 font-normal">(optional)</span></label>
                                {formData.prizes.map((prize, i) => (
                                    <div key={i} className="flex gap-2 mb-2 items-center">
                                        <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏅'}</span>
                                        <input type="text" placeholder="Position" value={prize.position}
                                            onChange={e => { const u = [...formData.prizes]; u[i] = { ...u[i], position: e.target.value }; setFormData(p => ({ ...p, prizes: u })); }}
                                            className="flex-1 bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 outline-none focus:border-indigo-500/50 text-sm" />
                                        <input type="text" placeholder="Amount" value={prize.amount}
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
                                        className="mt-1 flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm">
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
                                        <p className="text-[10px] text-slate-500 mt-2 italic font-medium">Verified holder name for payment.</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-300 mb-2">Payment QR Code *</label>
                                        <div 
                                            className="w-full h-48 bg-black/40 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500/50 transition-all overflow-hidden relative"
                                            onClick={() => document.getElementById('qr-upload-edit').click()}
                                        >
                                            {paymentQr || qrPreview ? (
                                                <>
                                                    <img src={paymentQr ? URL.createObjectURL(paymentQr) : qrPreview} alt="QR Preview" className="w-full h-full object-contain p-2" />
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
                                            id="qr-upload-edit" 
                                            type="file" 
                                            accept="image/*" 
                                            onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    setPaymentQr(file);
                                                }
                                            }} 
                                            className="hidden" 
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                                <span className="text-amber-400 text-lg mt-0.5">💡</span>
                                <p className="text-amber-200/80 text-xs font-medium leading-relaxed">
                                    Tip: Use a clear, high-quality QR code. Students will scan this at registration.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* STEP 6 — Extra Details */}
                    {step === 6 && (
                        <div className="space-y-5 animate-fadeIn">
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">Rules & Guidelines</label>
                                <textarea name="rules" rows="3" value={formData.rules} onChange={handleChange} className={`${inputCls} resize-none`} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Eligibility (preset)</label>
                                    <select name="eligibilityCriteria" value={formData.eligibilityCriteria} onChange={handleChange} className={`${inputCls} appearance-none`}>
                                        {['Open to All', 'Same College Only', 'Specific Year'].map(o =>
                                            <option key={o} value={o} className="bg-slate-900 text-white">{o}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Required Materials</label>
                                    <input type="text" name="requiredMaterials" value={formData.requiredMaterials} onChange={handleChange} className={inputCls} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">Eligibility Criteria (free text)</label>
                                <textarea name="eligibility" value={formData.eligibility} onChange={handleChange} rows={3} placeholder="Describe who can participate…" className={`${inputCls} resize-none`} />
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
                                                onClick={() => document.getElementById(`edit_guest_photo_${i}`).click()}
                                            >
                                                {cg.photoPreview ? (
                                                    <img src={cg.photoPreview} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-xl opacity-50">👤</div>
                                                )}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[8px] text-white font-bold">CHANGE</div>
                                            </div>
                                            <input 
                                                id={`edit_guest_photo_${i}`}
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
                                                onClick={() => document.getElementById(`edit_judge_photo_${i}`).click()}
                                            >
                                                {jd.photoPreview ? (
                                                    <img src={jd.photoPreview} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-xl opacity-50">⚖️</div>
                                                )}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[8px] text-white font-bold">CHANGE</div>
                                            </div>
                                            <input 
                                                id={`edit_judge_photo_${i}`}
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
                    )}

                    {/* STEP 7 — Photos */}
                    {step === 7 && (
                        <div className="animate-fadeIn">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <label className="text-slate-200 text-sm font-semibold block">📸 Event Photos</label>
                                    <p className="text-slate-500 text-xs mt-0.5">Up to 5 photos — shown on event cards and detail page</p>
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
                                    className={`rounded-2xl border-2 border-dashed cursor-pointer p-8 text-center transition-all duration-200 mb-4 ${photoDragging ? 'border-indigo-400 bg-indigo-500/10' : 'border-slate-600 bg-slate-700/20 hover:border-indigo-500/60'}`}
                                >
                                    <div className="text-4xl mb-2">🖼️</div>
                                    <p className="text-slate-300 text-sm font-medium">Drag & drop or click to browse</p>
                                    <p className="text-slate-500 text-xs mt-1">JPG, PNG, WEBP · Max 5 photos</p>
                                </div>
                            )}

                            <input ref={photoInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" multiple onChange={e => addPhotos(e.target.files)} className="hidden" />

                            {eventPhotos.length > 0 && (
                                <div className="grid grid-cols-5 gap-2">
                                    {eventPhotos.map((photo, i) => (
                                        <div key={i} className="relative group rounded-xl overflow-hidden aspect-square bg-slate-700 border border-slate-600/50">
                                            <img src={photo.preview} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                                            <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                                                <span className="text-white text-xs font-bold">{i + 1}</span>
                                            </div>
                                            <button type="button" onClick={() => removePhoto(i)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">×</button>
                                            {photo.existing && (
                                                <div className="absolute bottom-1 left-0 right-0 text-center">
                                                    <span className="text-xs bg-emerald-500/80 text-white px-2 rounded">saved</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {eventPhotos.length < 5 && (
                                        <button type="button" onClick={() => photoInputRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-slate-600 hover:border-indigo-500 bg-slate-700/30 hover:bg-slate-700/50 flex flex-col items-center justify-center transition-all gap-1">
                                            <span className="text-slate-400 text-2xl">+</span>
                                            <span className="text-slate-500 text-xs">Add</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-white/10">
                        {step > 1 && (
                            <button type="button" onClick={prevStep} disabled={loading} className="px-6 py-2.5 rounded-xl text-white font-bold hover:bg-white/10 border border-white/20 transition-all disabled:opacity-50">Back</button>
                        )}
                        {step < TOTAL_STEPS ? (
                            <button type="submit" className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)]">Next</button>
                        ) : (
                            <button type="submit" disabled={loading} className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 flex items-center gap-2">
                                {loading ? (<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>Saving...</>) : '✓ Save Changes'}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
