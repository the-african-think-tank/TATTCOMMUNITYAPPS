import { useEffect, useRef, useCallback } from "react";
import api from "@/services/api";

/**
 * Custom React hook for high-performance, batched post view (impression) tracking.
 *
 * Rules:
 * 1. Post DOM node must be visible (≥ 50% threshold) for at least 1000ms.
 * 2. Session deduplication: Post ID is tracked in a Set during the session so scrolling up/down doesn't re-track.
 * 3. Dual-trigger batching: Queue flushes when buffer reaches 10 items OR every 10 seconds.
 * 4. Empty Queue Guard: If queue is empty, no network requests are sent.
 * 5. Lifecycle Cleanup: Disconnects observers, clears timers, removes listeners on unmount.
 */
export function usePostViewTracker() {
    const queueRef = useRef<string[]>([]);
    const trackedSessionSetRef = useRef<Set<string>>(new Set());
    const visibilityTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
    const pendingNodesRef = useRef<Map<string, HTMLElement>>(new Map());
    const observerRef = useRef<IntersectionObserver | null>(null);

    // Flush batch queue to backend API
    const flushQueue = useCallback(async () => {
        if (queueRef.current.length === 0) return;

        const postIdsToSend = [...queueRef.current];
        queueRef.current = [];

        console.log('[ViewTracker] Flushing view impressions batch to server:', postIdsToSend);

        try {
            await api.post("/feed/views", { postIds: postIdsToSend });
        } catch (err) {
            console.error('[ViewTracker] Failed to record views batch:', err);
        }
    }, []);

    // Initial setup of IntersectionObserver & timer interval
    useEffect(() => {
        // 3-second interval check for responsive developer feedback
        const intervalId = setInterval(() => {
            if (queueRef.current.length > 0) {
                flushQueue();
            }
        }, 3000);

        // Page visibility / unload handlers
        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden" && queueRef.current.length > 0) {
                flushQueue();
            }
        };

        window.addEventListener("visibilitychange", handleVisibilityChange);

        // IntersectionObserver setup
        const obs = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const postId = entry.target.getAttribute("data-post-id");
                    if (!postId || trackedSessionSetRef.current.has(postId)) return;

                    if (entry.isIntersecting) {
                        // Start 500ms qualification timer
                        if (!visibilityTimersRef.current.has(postId)) {
                            const timer = setTimeout(() => {
                                if (!trackedSessionSetRef.current.has(postId)) {
                                    trackedSessionSetRef.current.add(postId);
                                    queueRef.current.push(postId);
                                    console.log('[ViewTracker] Qualified post impression:', postId);

                                    // Immediate flush if batch size threshold (>= 5) is reached
                                    if (queueRef.current.length >= 5) {
                                        flushQueue();
                                    }
                                }
                                visibilityTimersRef.current.delete(postId);
                            }, 500);

                            visibilityTimersRef.current.set(postId, timer);
                        }
                    } else {
                        // User scrolled away before 500ms threshold -> cancel qualification
                        if (visibilityTimersRef.current.has(postId)) {
                            clearTimeout(visibilityTimersRef.current.get(postId));
                            visibilityTimersRef.current.delete(postId);
                        }
                    }
                });
            },
            { threshold: 0.1 }
        );

        observerRef.current = obs;

        // Observe any nodes that were registered before observer initialization
        pendingNodesRef.current.forEach((node) => {
            obs.observe(node);
        });

        // Complete lifecycle cleanup on unmount
        return () => {
            clearInterval(intervalId);
            window.removeEventListener("visibilitychange", handleVisibilityChange);

            if (observerRef.current) {
                observerRef.current.disconnect();
                observerRef.current = null;
            }

            visibilityTimersRef.current.forEach((t) => clearTimeout(t));
            visibilityTimersRef.current.clear();

            // Final flush if anything remains
            if (queueRef.current.length > 0) {
                flushQueue();
            }
        };
    }, [flushQueue]);

    // Callback ref binder for post cards
    const registerPostRef = useCallback((node: HTMLElement | null, postId: string) => {
        if (!postId || trackedSessionSetRef.current.has(postId)) return;

        if (node) {
            node.setAttribute("data-post-id", postId);
            pendingNodesRef.current.set(postId, node);
            if (observerRef.current) {
                observerRef.current.observe(node);
            }
        } else {
            pendingNodesRef.current.delete(postId);
        }
    }, []);

    return { registerPostRef };
}
