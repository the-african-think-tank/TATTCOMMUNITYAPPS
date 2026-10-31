import { ApiProperty } from '@nestjs/swagger';

export type MediaCategory = 'image' | 'video' | 'audio' | 'document';

// ─── Allowed MIME types per category ─────────────────────────────────────────

export const ALLOWED_MIME_TYPES: Record<MediaCategory, string[]> = {
    image: [
        'image/jpeg', 'image/png', 'image/gif',
        'image/webp', 'image/bmp', 'image/tiff',
    ],
    video: [
        'video/mp4', 'video/quicktime', 'video/x-msvideo',
        'video/webm', 'video/mpeg', 'video/ogg', 'video/3gpp',
    ],
    audio: [
        'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
        'audio/aac', 'audio/flac', 'audio/x-ms-wma', 'audio/webm',
    ],
    document: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv',
        'application/zip',
        'application/x-zip-compressed',
    ],
};

/** All allowed MIME types as a flat set for fast lookup */
export const ALL_ALLOWED_MIMES = new Set<string>(
    Object.values(ALLOWED_MIME_TYPES).flat(),
);

/** Maximum file size (bytes) per category */
export const SIZE_LIMITS: Record<MediaCategory, number> = {
    image: 50 * 1024 * 1024,    // 50 MB
    video: 500 * 1024 * 1024,   // 500 MB
    audio: 100 * 1024 * 1024,   // 100 MB
    document: 100 * 1024 * 1024,// 100 MB
};

/** Resolve which category a MIME type belongs to */
export function resolveMimeCategory(mimeType: string): MediaCategory | null {
    for (const [cat, mimes] of Object.entries(ALLOWED_MIME_TYPES)) {
        if (mimes.includes(mimeType)) return cat as MediaCategory;
    }
    return null;
}

// ─── Response schemas ─────────────────────────────────────────────────────────

export class UploadedFileSchema {
    @ApiProperty({
        example: 'https://api.tatt.org/uploads/images/2026/02/22/a1b2c3d4.jpg',
        description: 'Publicly accessible URL of the uploaded file. Pass this into `mediaUrls[]` when creating a post.',
    })
    url: string;

    @ApiProperty({ example: 'image', enum: ['image', 'video', 'audio', 'document'] })
    category: MediaCategory;

    @ApiProperty({ example: 'profile-banner.jpg', description: 'Original file name as sent by the client.' })
    originalName: string;

    @ApiProperty({ example: 'image/jpeg' })
    mimeType: string;

    @ApiProperty({ example: 204800, description: 'File size in bytes.' })
    size: number;

    @ApiProperty({
        example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg',
        description: 'Server-generated filename (UUID-based, collision-safe).',
    })
    filename: string;
}

export class UploadResponseSchema {
    @ApiProperty({ example: 3, description: 'Number of files successfully uploaded.' })
    uploaded: number;

    @ApiProperty({ type: [UploadedFileSchema] })
    files: UploadedFileSchema[];
}
