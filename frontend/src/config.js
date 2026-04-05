// Hardcoded to strictly bypass stale Vite cache, we'll restore env logic before deployment
export const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
