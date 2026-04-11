let _rawUrl = import.meta.env.VITE_API_URL || '';

// Force the correct backend URL depending on the environment
// This ensures that even if local .env files leak into the build, the live site will always use the correct backend.
if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // If we're on the live site, ALWAYS use the production URL
    _rawUrl = 'https://event-hub-backend-cwr3.onrender.com';
} else {
    // We are on localhost, so use the environment variable or fallback to 8080
    // Using 127.0.0.1 instead of localhost prevents IPv6/IPv4 connection refused errors with Flask
    if (!_rawUrl || _rawUrl.includes('event-hub-backend')) {
        _rawUrl = 'http://127.0.0.1:8080';
    }
}

// Clean the URL: strip trailing /api and ensure no double slashes
export const BACKEND_URL = _rawUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');
