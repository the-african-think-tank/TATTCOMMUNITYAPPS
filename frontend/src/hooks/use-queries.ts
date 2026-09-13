/**
 * Centralized TanStack Query hooks for the TATT Membership Platform.
 *
 * By co-locating all query keys and fetcher functions here, we ensure:
 * - Consistent cache keys across the app (no duplicate keys causing cache misses)
 * - Easy cache invalidation (e.g., after a mutation, call queryClient.invalidateQueries({ queryKey: QUERY_KEYS.connections }))
 * - A single place to update API paths
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import type { User } from '@/context/auth-context';

// ─── Query Key Registry ────────────────────────────────────────────────────────
// Centralised key definitions prevent typos and make invalidation easy.
export const QUERY_KEYS = {
    currentUser:        ['auth', 'me'] as const,
    dashboardStats:     ['dashboard', 'stats'] as const,
    dashboardOverview:  ['admin', 'dashboard', 'overview'] as const,
    connections:        ['connections', 'network'] as const,
    connectionRequests: ['connections', 'requests'] as const,
    events:             (upcoming?: boolean) => ['events', { upcoming }] as const,
    unreadCount:        ['messages', 'unread-count'] as const,
    volunteerStats:     ['volunteers', 'stats'] as const,
    members:            (filters?: Record<string, unknown>) => ['members', filters] as const,
    memberDetail:       (id: string) => ['members', id] as const,
    chapters:           ['chapters'] as const,
    membershipTiers:    ['membership', 'tiers'] as const,
    membershipAnalytics:['membership', 'analytics'] as const,
    notifications:      ['notifications'] as const,
    jobs:               (filters?: Record<string, unknown>) => ['jobs', filters] as const,
    savedJobs:          ['jobs', 'saved'] as const,
    savedJobIds:        ['jobs', 'saved-ids'] as const,
    jobDetail:          (id: string) => ['jobs', id] as const,
    publicConfig:       ['system', 'public-config'] as const,
};

// ─── Auth ─────────────────────────────────────────────────────────────────────
export function useCurrentUser() {
    return useQuery({
        queryKey: QUERY_KEYS.currentUser,
        queryFn: async (): Promise<User> => {
            const { data } = await api.get('/auth/me');
            return data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes – profile doesn't change often
        retry: false,
    });
}

// ─── Dashboard (Member) ───────────────────────────────────────────────────────
export function useConnections() {
    return useQuery({
        queryKey: QUERY_KEYS.connections,
        queryFn: async () => {
            const { data } = await api.get<Array<{ connectionId: string; member: unknown }>>('/connections/network');
            return data;
        },
        staleTime: 2 * 60 * 1000,
    });
}

export function useConnectionRequests() {
    return useQuery({
        queryKey: QUERY_KEYS.connectionRequests,
        queryFn: async () => {
            const { data } = await api.get('/connections/requests/incoming');
            return Array.isArray(data) ? data : [];
        },
        staleTime: 60 * 1000,
    });
}

export function useUpcomingEvents(upcoming = true) {
    return useQuery({
        queryKey: QUERY_KEYS.events(upcoming),
        queryFn: async () => {
            const { data } = await api.get(`/events${upcoming ? '?upcoming=true' : ''}`);
            return Array.isArray(data) ? data : [];
        },
        staleTime: 5 * 60 * 1000,
    });
}

export function useUnreadMessageCount() {
    return useQuery({
        queryKey: QUERY_KEYS.unreadCount,
        queryFn: async (): Promise<number> => {
            const { data } = await api.get('/messages/unread-count');
            return data?.count ?? 0;
        },
        staleTime: 60 * 1000,
        refetchInterval: 60 * 1000, // Poll every minute for new messages
    });
}

export function useVolunteerStats() {
    return useQuery({
        queryKey: QUERY_KEYS.volunteerStats,
        queryFn: async () => {
            const { data } = await api.get('/volunteers/stats');
            return data;
        },
        staleTime: 5 * 60 * 1000,
    });
}

// ─── Admin Dashboard ─────────────────────────────────────────────────────────
export function useAdminDashboardOverview() {
    return useQuery({
        queryKey: QUERY_KEYS.dashboardOverview,
        queryFn: async () => {
            const { data } = await api.get('/dashboard/overview');
            return data;
        },
        staleTime: 5 * 60 * 1000,
    });
}

// ─── Members ─────────────────────────────────────────────────────────────────
export function useMembers(filters?: Record<string, unknown>) {
    return useQuery({
        queryKey: QUERY_KEYS.members(filters),
        queryFn: async () => {
            const { data } = await api.get('/users', { params: filters });
            return data;
        },
        staleTime: 2 * 60 * 1000,
    });
}

export function useMemberDetail(id: string) {
    return useQuery({
        queryKey: QUERY_KEYS.memberDetail(id),
        queryFn: async () => {
            const { data } = await api.get(`/users/${id}`);
            return data;
        },
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    });
}

// ─── Chapters ────────────────────────────────────────────────────────────────
export function useChapters() {
    return useQuery({
        queryKey: QUERY_KEYS.chapters,
        queryFn: async () => {
            const { data } = await api.get('/chapters');
            return data;
        },
        staleTime: 10 * 60 * 1000, // Chapters rarely change
    });
}

// ─── Membership ──────────────────────────────────────────────────────────────
export function useMembershipTiers() {
    return useQuery({
        queryKey: QUERY_KEYS.membershipTiers,
        queryFn: async () => {
            const { data } = await api.get('/membership-center/tiers');
            return data;
        },
        staleTime: 10 * 60 * 1000,
    });
}

export function useMembershipAnalytics() {
    return useQuery({
        queryKey: QUERY_KEYS.membershipAnalytics,
        queryFn: async () => {
            const { data } = await api.get('/membership-center/analytics');
            return data;
        },
        staleTime: 5 * 60 * 1000,
    });
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────
export function useJobs(filters?: Record<string, unknown>) {
    return useQuery({
        queryKey: QUERY_KEYS.jobs(filters),
        queryFn: async () => {
            const { data } = await api.get('/jobs', { params: filters });
            return data;
        },
        staleTime: 3 * 60 * 1000,
    });
}

export function useSavedJobIds() {
    return useQuery({
        queryKey: QUERY_KEYS.savedJobIds,
        queryFn: async (): Promise<string[]> => {
            const { data } = await api.get('/jobs/saved-ids');
            return data ?? [];
        },
        staleTime: 2 * 60 * 1000,
    });
}

export function useJobDetail(id: string) {
    return useQuery({
        queryKey: QUERY_KEYS.jobDetail(id),
        queryFn: async () => {
            const { data } = await api.get(`/jobs/${id}`);
            return data;
        },
        enabled: !!id,
    });
}

// ─── Mutations ─────────────────────────────────────────────────────────────────
// Mutations automatically invalidate related queries to keep data fresh.

export function useUpdateProfile() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (updates: Partial<User>) => {
            const { data } = await api.patch('/users/me', updates);
            return data;
        },
        onSuccess: (updatedUser) => {
            // Update the cache directly without a refetch
            queryClient.setQueryData(QUERY_KEYS.currentUser, updatedUser);
        },
    });
}

export function useJobSaveToggle() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ jobId, isSaved }: { jobId: string; isSaved: boolean }) => {
            if (isSaved) {
                await api.delete(`/jobs/${jobId}/save`);
            } else {
                await api.post(`/jobs/${jobId}/save`);
            }
            return { jobId, newState: !isSaved };
        },
        onSuccess: () => {
            // Invalidate saved jobs to refetch
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.savedJobIds });
        },
    });
}

export function useConnectionAction() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ action, connectionId }: { action: 'accept' | 'reject'; connectionId: string }) => {
            await api.patch(`/connections/${connectionId}`, { action });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.connectionRequests });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.connections });
        },
    });
}

// ─── Public System Configuration ──────────────────────────────────────────────
export interface PublicConfig {
    showBetaNotice: boolean;
    betaBannerMessage: string;
    betaVersionTag: string;
}

export const DEFAULT_PUBLIC_CONFIG: PublicConfig = {
    showBetaNotice: true,
    betaBannerMessage: 'Welcome to TATT Community Apps Beta. You are exploring early access features.',
    betaVersionTag: 'v0.9.0-beta',
};

export function usePublicConfig() {
    return useQuery({
        queryKey: QUERY_KEYS.publicConfig,
        queryFn: async (): Promise<PublicConfig> => {
            try {
                const { data } = await api.get<PublicConfig>('/admin/settings/public');
                return data;
            } catch {
                return DEFAULT_PUBLIC_CONFIG;
            }
        },
        staleTime: 5 * 60 * 1000,
        placeholderData: DEFAULT_PUBLIC_CONFIG,
    });
}
