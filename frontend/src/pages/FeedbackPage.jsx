import { useState } from 'react';
import api from '../services/api';
import { toast } from '../components/Toast';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';

export default function FeedbackPage() {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) {
            toast('Please select a star rating', 'error');
            return;
        }

        setLoading(true);
        try {
            await api.post('/api/feedback/submit', { rating, comment });
            toast('Thank you for your feedback! ❤️', 'success');
            setTimeout(() => navigate('/'), 2000);
        } catch (error) {
            toast(error.response?.data?.error || 'Failed to submit feedback', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex flex-col pt-20 animate-fadeIn relative overflow-x-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center relative z-10">
                <div className="w-full max-w-xl bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl">
                    <div className="text-center mb-10">
                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-lg mb-6 animate-bounce-slow">
                            ⭐
                        </div>
                        <h1 className="text-3xl md:text-4xl font-display font-black text-white mb-3">Rate Event Hub</h1>
                        <p className="text-slate-400">Your feedback helps us make the platform better for everyone!</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Star Rating */}
                        <div className="flex flex-col items-center gap-4">
                            <div className="flex gap-3">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        className={`text-4xl transition-all duration-200 transform hover:scale-125 ${
                                            (hover || rating) >= star ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-slate-600'
                                        }`}
                                        onClick={() => setRating(star)}
                                        onMouseEnter={() => setHover(star)}
                                        onMouseLeave={() => setHover(0)}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs font-black uppercase tracking-widest text-indigo-400">
                                {rating === 1 ? 'Poor' : rating === 2 ? 'Fair' : rating === 3 ? 'Good' : rating === 4 ? 'Very Good' : rating === 5 ? 'Excellent' : 'Select a rating'}
                            </p>
                        </div>

                        {/* Comment Input */}
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1 italic text-indigo-400">Write your thoughts</label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="What did you like? What can we improve?"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-slate-600 outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all min-h-[120px] resize-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Submitting...' : 'Submit Feedback'}
                        </button>
                    </form>
                </div>
            </div>

            <Footer />
        </div>
    );
}
