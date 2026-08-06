import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";

// Initialize plugins
dayjs.extend(relativeTime);
dayjs.extend(utc);

/**
 * Format ISO date strings into relative time (e.g., "21 minutes ago").
 * Uses dayjs + utc plugin to ensure strict UTC parsing across all browser engines.
 */
export function formatTimeAgo(dateString?: string | null): string {
    if (!dateString) return "";
    try {
        let str = String(dateString).trim();
        if (!str.includes("T")) {
            str = str.replace(" ", "T");
        }
        if (!str.endsWith("Z") && !str.includes("+") && !str.includes("-", 10)) {
            str += "Z";
        }
        const d = dayjs.utc(str);
        if (!d.isValid()) return "";
        return d.fromNow();
    } catch {
        return "";
    }
}
