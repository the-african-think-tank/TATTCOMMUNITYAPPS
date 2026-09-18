import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";

const LS_KEY = "tatt_upgrade_last_prompted";
const SS_KEY = "tatt_upgrade_prompted_session";
const COOLDOWN_DAYS = 3;

function daysSince(isoString: string): number {
    const then = new Date(isoString).getTime();
    const now = Date.now();
    return (now - then) / (1000 * 60 * 60 * 24);
}

interface UseUpgradeReminderReturn {
    shouldShow: boolean;
    dismiss: () => void;
}

export function useUpgradeReminder(): UseUpgradeReminderReturn {
    const { user, isLoading } = useAuth();
    const [shouldShow, setShouldShow] = useState(false);

    useEffect(() => {
        if (isLoading || !user) return;

        // Only target FREE-tier members
        if (user.communityTier !== "FREE") return;

        // Already shown this browser session — don't show again
        if (sessionStorage.getItem(SS_KEY)) return;

        // Check cross-session cooldown
        const lastPrompted = localStorage.getItem(LS_KEY);
        if (lastPrompted && daysSince(lastPrompted) < COOLDOWN_DAYS) return;

        // Delay slightly so the dashboard has time to mount before the modal fires
        const timer = setTimeout(() => {
            setShouldShow(true);
            sessionStorage.setItem(SS_KEY, "1");
            localStorage.setItem(LS_KEY, new Date().toISOString());
        }, 2500);

        return () => clearTimeout(timer);
    }, [isLoading, user]);

    function dismiss() {
        setShouldShow(false);
    }

    return { shouldShow, dismiss };
}
