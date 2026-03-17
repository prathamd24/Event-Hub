import axios from 'axios';
import { auth } from '../firebase';
import { BACKEND_URL } from '../config';

const api = axios.create({
    baseURL: BACKEND_URL,
});

api.interceptors.request.use(async (config) => {
    if (auth.currentUser) {
        try {
            const token = await auth.currentUser.getIdToken();
            config.headers.Authorization = `Bearer ${token}`;
        } catch (error) {
            console.error('Error fetching Firebase token:', error);
        }
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Don't auto-redirect if we are just checking identity or registering
            if (!error.config.url.includes('/api/auth/me') && !error.config.url.includes('/api/auth/register')) {
                await auth.signOut();
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
        } else if (error.response?.status === 403 && error.response.data?.blocked) {
            // If the backend says the college is blocked/pending, force redirect
            const { reason, message } = error.response.data;
            if (window.location.pathname !== '/college-blocked') {
                window.location.href = `/college-blocked?reason=${reason}&message=${encodeURIComponent(message)}`;
            }
        }
        return Promise.reject(error);
    }
);

export default api;
