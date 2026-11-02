/**
 * Centralized upload utilities, limits, and error extractors.
 */

export const UPLOAD_LIMITS = {
    IMAGE: { maxBytes: 50 * 1024 * 1024, maxMb: 50, label: "Images" },
    VIDEO: { maxBytes: 500 * 1024 * 1024, maxMb: 500, label: "Videos" },
    AUDIO: { maxBytes: 100 * 1024 * 1024, maxMb: 100, label: "Audio" },
    DOCUMENT: { maxBytes: 100 * 1024 * 1024, maxMb: 100, label: "Documents" },
    RESUME: { maxBytes: 5 * 1024 * 1024, maxMb: 5, label: "Resumes" },
    LOGO: { maxBytes: 10 * 1024 * 1024, maxMb: 10, label: "Logos" },
};

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Extracts all URLs returned from the /uploads/media endpoint.
 * Handles both { files: [{ url }] } and { urls: [] } and { files: string[] }.
 */
export function extractUploadedUrls(data: any): string[] {
    if (!data) return [];
    if (Array.isArray(data.urls)) {
        return data.urls.map((u: any) => (typeof u === "string" ? u : u?.url)).filter(Boolean);
    }
    if (Array.isArray(data.files)) {
        return data.files.map((f: any) => (typeof f === "string" ? f : f?.url)).filter(Boolean);
    }
    if (data.url && typeof data.url === "string") {
        return [data.url];
    }
    return [];
}

/**
 * Extracts a user-friendly error message from Axios errors returned by backend uploads.
 */
export function getUploadErrorMessage(err: any, fallback = "Failed to upload file"): string {
    if (!err) return fallback;

    if (err.response?.status === 413) {
        return "File size exceeds the server upload limit.";
    }

    if (err.code === "ECONNABORTED" || err.message?.toLowerCase().includes("timeout")) {
        return "Upload timed out. Please try a smaller file or check your internet connection.";
    }

    const resData = err.response?.data;
    if (resData) {
        if (Array.isArray(resData.errors) && resData.errors.length > 0) {
            return String(resData.errors[0]);
        }
        if (typeof resData.message === "string" && resData.message.trim()) {
            return resData.message;
        }
        if (Array.isArray(resData.message) && resData.message.length > 0) {
            return String(resData.message[0]);
        }
    }

    if (err.message && typeof err.message === "string" && !err.message.includes("status code")) {
        return err.message;
    }

    return fallback;
}

/**
 * Validates file size before uploading.
 */
export function validateFileSize(
    file: File,
    maxBytes: number,
    label = "File"
): { valid: boolean; error?: string } {
    if (file.size > maxBytes) {
        return {
            valid: false,
            error: `${label} exceeds the maximum allowed size of ${formatBytes(maxBytes)} (current: ${formatBytes(file.size)}).`,
        };
    }
    return { valid: true };
}
