import { useLocation, useNavigate, Link } from 'react-router-dom';

const configs = {
    PENDING: {
        icon: '⏳',
        iconBg: 'bg-amber-500/20 border-amber-500/30',
        title: 'College Application Under Review',
        subtitle: "Your college registration is being reviewed by our platform administrators.",
        detail: "This typically takes 1-3 business days. You'll be able to login once your college is approved.",
        color: 'text-amber-400',
        border: 'border-amber-500/30',
        actions: null,
    },
    REJECTED: {
        icon: '❌',
        iconBg: 'bg-red-500/20 border-red-500/30',
        title: 'College Application Rejected',
        subtitle: "Unfortunately, your college registration was not approved by the platform admin.",
        detail: "You may register with a new or corrected application. If you believe this is a mistake, please contact support.",
        color: 'text-red-400',
        border: 'border-red-500/30',
        actions: (
            <Link to="/register-college" className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-blue-500/20">
                Register New College
            </Link>
        ),
    },
    SUSPENDED: {
        icon: '⚠️',
        iconBg: 'bg-orange-500/20 border-orange-500/30',
        title: 'College Account Suspended',
        subtitle: "Your college account has been suspended by the platform admin.",
        detail: "Please contact support to resolve this issue and restore access.",
        color: 'text-orange-400',
        border: 'border-orange-500/30',
        actions: (
            <a href="mailto:support@eventhub.com" className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-amber-500/20">
                Contact Support
            </a>
        ),
    },
};

export default function CollegeBlockedPage() {
    const { state } = useLocation();
    const navigate = useNavigate();
    const reason = state?.reason || 'PENDING';
    const message = state?.message || '';
    const config = configs[reason] || configs.PENDING;

    return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className={`max-w-md w-full bg-[#1e293b] border ${config.border} rounded-2xl p-10 text-center shadow-2xl`}>
                <div className={`w-20 h-20 mx-auto rounded-full ${config.iconBg} border flex items-center justify-center text-4xl mb-6`}>
                    {config.icon}
                </div>
                <h1 className={`text-2xl font-bold ${config.color} mb-3`}>{config.title}</h1>
                <p className="text-slate-300 mb-3 font-medium">{message || config.subtitle}</p>
                <p className="text-slate-500 text-sm mb-8">{config.detail}</p>

                <div className="flex flex-col gap-3 items-center">
                    {config.actions}
                    <button
                        onClick={() => navigate('/login')}
                        className="text-sm text-slate-400 hover:text-slate-200 transition-colors mt-2"
                    >
                        ← Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
}
