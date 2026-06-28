import axios from 'axios';
import { tokenStore } from './token-store';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://staff.theafricanthinktank.org/api',
    withCredentials: true,
    timeout: 15000,
});

// ─── Request Interceptor ─────────────────────────────────────────────────────
// Reads the token from the secure in-memory store (not localStorage).
api.interceptors.request.use((config) => {
    const token = tokenStore.get();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ─── Response Interceptor ─────────────────────────────────────────────────────
// Handles expired/invalid tokens globally. Clears the in-memory token and
// redirects to the login page so users are never stuck in a broken state.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.warn('[API] 401 Unauthorized – clearing session');
            tokenStore.clear();
            if (typeof window !== 'undefined') {
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
