import { useAuth } from '../context/AuthContext';

export default function SettingsPage() {
    const { theme, toggleTheme, user } = useAuth();
    const isDark = theme === 'dark';

    return (
        <div className="max-w-2xl mx-auto py-12 px-4 animate-fadeIn">
            {/* Page Header */}
            <div className="mb-10">
                <h1 className="text-4xl font-display font-black text-white mb-2">Settings</h1>
                <p className="text-slate-400 text-lg">Manage your preferences and account settings.</p>
            </div>

            {/* Theme Card */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-xl mb-6">
                <h2 className="text-lg font-display font-bold text-white mb-6 flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-lg">
                        {isDark ? '🌙' : '☀️'}
                    </span>
                    Appearance
                </h2>

                {/* Toggle Row */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <p className="text-white font-semibold">Theme</p>
                        <p className="text-slate-400 text-sm mt-0.5">
                            Currently using <span className="text-indigo-400 font-semibold">{isDark ? 'Dark' : 'Light'} Mode</span>
                        </p>
                    </div>
                    <button
                        onClick={toggleTheme}
                        className={`relative w-16 h-8 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-transparent ${isDark ? 'bg-slate-600' : 'bg-amber-400'}`}
                        aria-label="Toggle theme"
                    >
                        <div className={`absolute top-1 left-1 w-6 h-6 rounded-full shadow-md transition-all duration-300 flex items-center justify-center text-xs ${isDark ? 'translate-x-0 bg-slate-300 text-slate-700' : 'translate-x-8 bg-white text-amber-600'}`}>
                            {isDark ? '🌙' : '☀️'}
                        </div>
                    </button>
                </div>

                {/* Mode Option Cards */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => !isDark && toggleTheme()}
                        className={`flex items-center gap-3 p-5 rounded-2xl border-2 transition-all text-left ${isDark ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_16px_rgba(99,102,241,0.15)]' : 'border-white/10 bg-white/5 opacity-60 hover:opacity-80'}`}
                    >
                        <span className="text-2xl">🌙</span>
                        <div>
                            <p className="text-white font-bold text-sm">Dark Mode</p>
                            <p className="text-slate-400 text-xs mt-0.5">Easy on the eyes</p>
                        </div>
                        {isDark && <span className="ml-auto text-indigo-400 text-xs font-black">✓</span>}
                    </button>
                    <button
                        onClick={() => isDark && toggleTheme()}
                        className={`flex items-center gap-3 p-5 rounded-2xl border-2 transition-all text-left ${!isDark ? 'border-amber-400 bg-amber-500/10 shadow-[0_0_16px_rgba(251,191,36,0.15)]' : 'border-white/10 bg-white/5 opacity-60 hover:opacity-80'}`}
                    >
                        <span className="text-2xl">☀️</span>
                        <div>
                            <p className="text-white font-bold text-sm">Light Mode</p>
                            <p className="text-slate-400 text-xs mt-0.5">Bright and clear</p>
                        </div>
                        {!isDark && <span className="ml-auto text-amber-400 text-xs font-black">✓</span>}
                    </button>
                </div>
            </div>

            {/* Account Card */}
            {user && (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-xl">
                    <h2 className="text-lg font-display font-bold text-white mb-6 flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-lg">👤</span>
                        Account
                    </h2>
                    <div className="space-y-4">
                        {[
                            { label: 'Name', value: user.name, valueClass: 'text-white font-semibold' },
                            { label: 'Email', value: user.email, valueClass: 'text-indigo-400 font-medium' },
                        ].map(({ label, value, valueClass }) => (
                            <div key={label} className="flex items-center justify-between py-3 border-b border-white/5">
                                <span className="text-slate-400 text-sm">{label}</span>
                                <span className={`text-sm ${valueClass}`}>{value}</span>
                            </div>
                        ))}
                        <div className="flex items-center justify-between py-3">
                            <span className="text-slate-400 text-sm">Role</span>
                            <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                                {user.role?.replace(/_/g, ' ')}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <p className="text-center text-slate-500 text-xs mt-10">
                Preferences are saved automatically to your browser.
            </p>
        </div>
    );
}

