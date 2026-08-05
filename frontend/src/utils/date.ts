import { formatDistanceToNow, parseISO } from "date-fns";

/**
 * Format ISO date strings into relative time (e.g., "21 minutes ago").
 * Ensures strict UTC parsing across all browser engines (iOS Safari, Chrome, etc.)
 */
export function formatTimeAgo(dateString?: string | null): string {
    if (!dateString) return "";
    try {
        // Ensure string is ISO 8601 UTC compliant
        let str = String(dateString).trim();
        if (!str.includes("T")) {
            str = str.replace(" ", "T");
        }
        if (!str.endsWith("Z") && !str.includes("+") && !str.includes("-", 10)) {
            str += "Z";
        }
        const parsedDate = parseISO(str);
        if (isNaN(parsedDate.getTime())) return "";
        return formatDistanceToNow(parsedDate, { addSuffix: true });
    } catch {
        return "";
    }
}
