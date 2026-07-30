"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { tokenStore } from '@/services/token-store';

export type User = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role?: string;
    systemRole?: string;
    communityTier?: string;
    isActive?: boolean;
    chapterId?: string | null;
    chapterName?: string | null;
    chapterCode?: string | null;
    profilePicture?: string | null;
    professionTitle?: string | null;
    industryId?: string | null;
    industry?: { id: string; name: string } | null;
    companyName?: string | null;
    location?: string | null;
    countryOfOrigin?: string | null;
    countryOfResidence?: string | null;
    dateOfBirth?: string | null;
    tattMemberId?: string | null;
    flags?: string[];
    connectionPreference?: string;
    expertise?: string;
    businessName?: string;
    businessRole?: string;
    businessProfileLink?: string;
    professionalHighlight?: string;
    interests?: { id: string; name: string }[];
    deletionRequestedAt?: string | null;
    linkedInProfileUrl?: string;
    hasAutoPayEnabled?: boolean;
    subscriptionExpiresAt?: string | Date | null;
    billingCycle?: string | null;
    createdAt?: string;
};


type AuthContextType = {
    user: User | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    updateUser: (updates: Partial<User>) => void;
    isAuthenticated: boolean;
    isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const queryClient = useQueryClient();

    // On mount: attempt a silent re-auth using the in-memory check.
    // If the user has a session hint (from a previous login in this browser session),
    // we hit /auth/me to verify the cookie/token is still valid.
    useEffect(() => {
        const verifyAuth = async () => {
            // Only attempt re-auth if there's a session hint
            if (!tokenStore.hasHint()) {
                setIsLoading(false);
                return;
            }

            try {
                // The request interceptor will attach the in-memory token if available.
                // If using HttpOnly cookies, the browser sends them automatically (withCredentials: true).
                const response = await api.get('/auth/me');
                const verifiedUser: User = response.data;
                setUser(verifiedUser);
            } catch {
                // Token is expired or invalid — clear everything silently.
                tokenStore.clear();
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        verifyAuth();
    }, []);

    const login = useCallback((newToken: string, newUser: User) => {
        // Store token securely in memory, not localStorage
        tokenStore.set(newToken);
        setUser(newUser);
    }, []);

    const logout = useCallback(() => {
        tokenStore.clear();
        setUser(null);
        // Clear all cached queries on logout to prevent data leaks between sessions
        queryClient.clear();
        window.location.href = '/';
    }, [queryClient]);

    const updateUser = useCallback((updates: Partial<User>) => {
        setUser((prev) => (prev ? { ...prev, ...updates } : prev));
    }, []);

    // ─── Inactivity Auto-Logout ────────────────────────────────────────────────
    useEffect(() => {
        if (!user) return;

        let inactivityTimer: ReturnType<typeof setTimeout>;

        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                console.log('[Auth] Session timed out due to inactivity.');
                logout();
            }, 12 * 60 * 60 * 1000); // 12 hours
        };

        const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
        events.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));
        resetTimer();

        return () => {
            clearTimeout(inactivityTimer);
            events.forEach((evt) => window.removeEventListener(evt, resetTimer));
        };
    }, [user, logout]);

    return (
        <AuthContext.Provider
            value={{
                user,
                login,
                logout,
                updateUser,
                isAuthenticated: !!user,
                isLoading,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
