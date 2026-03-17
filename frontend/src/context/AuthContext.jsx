import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import api from '../services/api';

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
                try {
                    const res = await api.get('/api/auth/me');
                    const userData = res.data;
                    setUser(userData);
                    
                    // If student, check if they are a coordinator
                    if (userData.role === 'STUDENT') {
                        await checkSCStatus();
                    } else {
                        setScClub(null);
                    }
                } catch (error) {
                    console.error('Failed to fetch user data from backend', error);
                    if (error.response?.status === 403 && error.response.data?.blocked) {
                        window.location.href = `/college-blocked?reason=${error.response.data.reason}&message=${encodeURIComponent(error.response.data.message)}`;
                        return;
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

    // Apply theme to <html> element
    useEffect(() => {
        const root = document.documentElement;
        root.setAttribute('data-theme', theme);
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
