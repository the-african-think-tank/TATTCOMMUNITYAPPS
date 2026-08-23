import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import advancedFormat from "dayjs/plugin/advancedFormat";
import relativeTime from "dayjs/plugin/relativeTime";

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(advancedFormat);
dayjs.extend(relativeTime);

/**
 * Major concise timezone group mappings for Admin Event Form dropdown
 */
export const TIMEZONE_GROUPS = [
    { label: "(GMT-07:00) Pacific Time - Los Angeles / Vancouver", value: "America/Los_Angeles" },
    { label: "(GMT-06:00) Mountain Time - Denver / Phoenix", value: "America/Denver" },
    { label: "(GMT-05:00) Central Time - Chicago / Dallas", value: "America/Chicago" },
    { label: "(GMT-04:00) Eastern Time - New York / Toronto", value: "America/New_York" },
    { label: "(GMT+00:00) Greenwich Mean Time - Accra / London", value: "Africa/Accra" },
    { label: "(GMT+01:00) West Africa Time - Lagos / Abuja", value: "Africa/Lagos" },
    { label: "(GMT+01:00) Central European Time - Paris / Berlin", value: "Europe/Paris" },
    { label: "(GMT+02:00) Central & South Africa Time - Johannesburg / Kigali", value: "Africa/Johannesburg" },
    { label: "(GMT+03:00) East Africa Time - Nairobi / Addis Ababa", value: "Africa/Nairobi" },
];

/**
 * Normalizes any legacy, alias, or raw timezone string to a valid TIMEZONE_GROUPS value.
 */
export function normalizeTimezone(tz?: string | null): string {
    if (!tz) return "America/Los_Angeles";
    const cleaned = tz.trim();
    
    // Exact match in TIMEZONE_GROUPS
    if (TIMEZONE_GROUPS.some(g => g.value === cleaned)) {
        return cleaned;
    }

    const lower = cleaned.toLowerCase();
    if (lower.includes("los_angeles") || lower.includes("pst") || lower.includes("pdt") || lower.includes("pacific")) return "America/Los_Angeles";
    if (lower.includes("new_york") || lower.includes("est") || lower.includes("edt") || lower.includes("eastern")) return "America/New_York";
    if (lower.includes("chicago") || lower.includes("cst") || lower.includes("cdt") || lower.includes("central time")) return "America/Chicago";
    if (lower.includes("denver") || lower.includes("mst") || lower.includes("mdt") || lower.includes("mountain")) return "America/Denver";
    if (lower.includes("accra") || lower.includes("ghana") || lower.includes("gmt") || lower.includes("utc")) return "Africa/Accra";
    if (lower.includes("lagos") || lower.includes("nigeria") || lower.includes("wat")) return "Africa/Lagos";
    if (lower.includes("paris") || lower.includes("berlin") || lower.includes("cet")) return "Europe/Paris";
    if (lower.includes("johannesburg") || lower.includes("cat") || lower.includes("sast")) return "Africa/Johannesburg";
    if (lower.includes("nairobi") || lower.includes("eat")) return "Africa/Nairobi";

    return "America/Los_Angeles";
}

/**
 * Helper function to replace raw GMT offsets (like "GMT+1", "GMT+3", "+01:00") with friendly abbreviations (WAT, CET, EAT, CAT, GMT, etc.)
 */
export function cleanTimezoneAbbreviation(abbr: string, tzName?: string): string {
    if (!abbr && !tzName) return "";
    
    const lowerTz = (tzName || "").toLowerCase();
    
    // Explicit target timezone string checks
    if (lowerTz.includes("lagos") || lowerTz.includes("nigeria") || lowerTz.includes("benin")) return "WAT";
    if (lowerTz.includes("nairobi") || lowerTz.includes("kenya") || lowerTz.includes("uganda") || lowerTz.includes("ethiopia") || lowerTz.includes("tanzania")) return "EAT";
    if (lowerTz.includes("johannesburg") || lowerTz.includes("harare") || lowerTz.includes("kigali") || lowerTz.includes("lusaka")) return "CAT";
    if (lowerTz.includes("accra") || lowerTz.includes("ghana") || lowerTz.includes("dakar")) return "GMT";
    if (lowerTz.includes("paris") || lowerTz.includes("berlin") || lowerTz.includes("rome") || lowerTz.includes("madrid") || lowerTz.includes("amsterdam")) return "CET";

    // If it's already a clean non-numeric abbreviation (e.g. PST, PDT, EST, EDT, CST, CDT, WAT, EAT, GMT, CET, SAST, CAT), keep it!
    if (/^[A-Z]{3,4}$/.test(abbr) && !abbr.startsWith("GMT") && !abbr.startsWith("UTC")) {
        return abbr;
    }

    // Map offset strings (check specific offsets first before generic GMT)
    if (abbr.includes("-7") || abbr.includes("-07")) return "PDT";
    if (abbr.includes("-8") || abbr.includes("-08")) return "PST";
    if (abbr.includes("-5") || abbr.includes("-05")) return "CDT";
    if (abbr.includes("-6") || abbr.includes("-06")) return "CST";
    if (abbr.includes("-4") || abbr.includes("-04")) return "EDT";
    if (abbr.includes("+1") || abbr.includes("+01")) return "WAT";
    if (abbr.includes("+2") || abbr.includes("+02")) return "CAT";
    if (abbr.includes("+3") || abbr.includes("+03")) return "EAT";
    if (abbr.includes("+0") || abbr.includes("-0") || abbr === "GMT" || abbr === "UTC") return "GMT";

    return abbr;
}

/**
 * Format timestamp in browser's local timezone (e.g. "Sep 15, 2026 • 2:00 PM WAT")
 */
export function formatLocalTime(dateTimeStr: string | Date): string {
    if (!dateTimeStr) return "";
    try {
        const d = dayjs(dateTimeStr);
        if (!d.isValid()) return "";
        const rawAbbr = d.format("z");
        const userTz = dayjs.tz.guess();
        const cleanAbbr = cleanTimezoneAbbreviation(rawAbbr, userTz);
        return `${d.format("MMM D, YYYY • h:mm A")} ${cleanAbbr}`;
    } catch {
        return "";
    }
}

/**
 * Format time portion only in browser's local timezone (e.g. "3:00 PM WAT")
 */
export function formatLocalTimeString(dateTimeStr: string | Date): string {
    if (!dateTimeStr) return "";
    try {
        const d = dayjs(dateTimeStr);
        if (!d.isValid()) return "";
        const rawAbbr = d.format("z");
        const userTz = dayjs.tz.guess();
        const cleanAbbr = cleanTimezoneAbbreviation(rawAbbr, userTz);
        return `${d.format("h:mm A")} ${cleanAbbr}`;
    } catch {
        return "";
    }
}

/**
 * Format timestamp in a specific target IANA timezone (e.g. "America/Los_Angeles" or "Africa/Nairobi")
 */
export function formatInTimezone(dateTimeStr: string | Date, targetTimezone: string): string {
    if (!dateTimeStr) return "";
    try {
        const tz = targetTimezone || "America/Los_Angeles";
        const d = dayjs(dateTimeStr).tz(tz);
        if (!d.isValid()) return "";
        const rawAbbr = d.format("z");
        const cleanAbbr = cleanTimezoneAbbreviation(rawAbbr, tz);
        return `${d.format("MMM D, YYYY • h:mm A")} ${cleanAbbr}`;
    } catch {
        return formatLocalTime(dateTimeStr);
    }
}

/**
 * Format timestamp into relative time ("3 mins ago", "2 hours ago", "yesterday")
 */
export function formatRelativeTime(dateTimeStr: string | Date): string {
    if (!dateTimeStr) return "";
    try {
        const d = dayjs(dateTimeStr);
        if (!d.isValid()) return "";
        return d.fromNow();
    } catch {
        return "";
    }
}

/**
 * Format date portion only in local timezone ("MMM D, YYYY")
 */
export function formatLocalDate(dateTimeStr: string | Date): string {
    if (!dateTimeStr) return "";
    try {
        const d = dayjs(dateTimeStr);
        if (!d.isValid()) return "";
        return d.format("MMM D, YYYY");
    } catch {
        return "";
    }
}

/**
 * Converts a local datetime-local string (e.g. "2026-09-15T14:00") + selected timezone
 * into a UTC ISO string ("2026-09-15T21:00:00.000Z") for API submission.
 */
export function toUtcIso(localDateTimeStr: string, selectedTimezone?: string): string {
    if (!localDateTimeStr) return new Date().toISOString();
    try {
        const tz = selectedTimezone || "America/Los_Angeles";
        return dayjs.tz(localDateTimeStr, tz).toISOString();
    } catch {
        return new Date(localDateTimeStr).toISOString();
    }
}

/**
 * Format UTC timestamp into 'YYYY-MM-DDTHH:mm' for datetime-local input using the event's native timezone
 */
export function toNativeDateTimeInput(dateTimeStr: string | Date, targetTimezone?: string): string {
    if (!dateTimeStr) return "";
    try {
        const tz = targetTimezone || "America/Los_Angeles";
        return dayjs(dateTimeStr).tz(tz).format("YYYY-MM-DDTHH:mm");
    } catch {
        return "";
    }
}

export default dayjs;
