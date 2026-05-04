import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import api from '../services/api';
import { toast } from '../components/Toast';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [scClub, setScClub] = useState(null);
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

    const checkSCStatus = async () => {
        try {
            const res = await api.get('/api/sc/my-club');
            setScClub(res.data.club);
        } catch (e) {
            setScClub(null);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // If a registration is in progress, skip fetching — the user doesn't exist in our DB yet.
                if (sessionStorage.getItem('registration_in_progress') === 'true') {
                    console.log('[AuthContext] Registration in progress — skipping /api/auth/me');
                    setLoading(false);
                    return;
                }
                try {
                    const res = await api.get('/api/auth/me');
                    const userData = res.data;
                    setUser(userData);
                    if (userData.role === 'STUDENT') await checkSCStatus();
                    else setScClub(null);
                } catch (error) {
                    console.error('[AuthContext] /api/auth/me failed:', error?.response?.status, error?.response?.data);

                    if (error.response?.status === 403 && error.response.data?.blocked) {
                        window.location.href = `/college-blocked?reason=${error.response.data.reason}&message=${encodeURIComponent(error.response.data.message)}`;
                        return;
                    }

                    // User is in Firebase but NOT in our DB (unregistered or deleted).
                    // MUST sign out of Firebase to prevent the popup from auto-resolving
                    // with this stale session on next login attempt — the bypass loophole.
                    if (error.response?.status === 404 || error.response?.status === 401) {
                        console.log('[AuthContext] Unregistered Firebase user — clearing session.');
                        try { await signOut(auth); } catch (_) {}
                    }

                    setUser(null);
                    setScClub(null);
                }
            } else {
                setUser(null);
                setScClub(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

    const logout = async () => {
        await signOut(auth);
        setUser(null);
        setScClub(null);
    };

    return (
        <AuthContext.Provider value={{ user, scClub, checkSCStatus, setUser, logout, loading, theme, toggleTheme }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
