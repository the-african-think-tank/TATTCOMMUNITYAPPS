import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import {
    resolveMimeCategory, SIZE_LIMITS, ALL_ALLOWED_MIMES,
    UploadedFileSchema, MediaCategory,
} from './dto/upload.types';

@Injectable()
export class UploadsService {
    private readonly logger = new Logger(UploadsService.name);
    private s3Client: S3Client | null = null;

    private getS3Client(): S3Client {
        if (!this.s3Client) {
            const region = process.env.AWS_REGION || 'us-east-1';
            const endpoint = process.env.S3_ENDPOINT;
            const forcePathStyle = process.env.AWS_S3_FORCE_PATH_STYLE === 'true' || !!endpoint;

            this.s3Client = new S3Client({
                region,
                ...(endpoint ? { endpoint } : {}),
                ...(forcePathStyle ? { forcePathStyle: true } : {}),
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
                },
            });
        }
        return this.s3Client;
    }

    /**
     * Process a batch of multer-uploaded files.
     * - Validates MIME type against the allowlist
     * - Enforces per-category file size limits
     * - Saves to AWS S3 (when STORAGE_DRIVER=s3) or local disk directory (STORAGE_DRIVER=local)
     * - Returns public URL for each accepted file
     */
    async processUploads(
        files: Express.Multer.File[],
        baseUploadDir: string,
        basePublicUrl: string,
    ): Promise<UploadedFileSchema[]> {
        if (!files?.length) {
            throw new BadRequestException('No files were received. Ensure the form field name is `files`.');
        }

        const driver = (process.env.STORAGE_DRIVER || 'local').toLowerCase();
        const results: UploadedFileSchema[] = [];
        const errors: string[] = [];

        for (const file of files) {
            const outcome = await this.processSingleFile(file, driver, baseUploadDir, basePublicUrl);
            if (outcome.success === false) {
                errors.push(outcome.error);
            } else {
                results.push(outcome.fileSchema);
            }
        }

        if (results.length === 0 && errors.length > 0) {
            throw new BadRequestException({
                message: 'All uploaded files were rejected.',
                errors,
            });
        }

        return results;
    }

    // ─── Core Processing Pipeline ─────────────────────────────────────────────

    private async processSingleFile(
        file: Express.Multer.File,
        driver: string,
        baseUploadDir: string,
        basePublicUrl: string,
    ): Promise<{ success: true; fileSchema: UploadedFileSchema } | { success: false; error: string }> {
        try {
            const validation = this.validateFile(file);
            if (validation.valid === false) {
                this.deleteFile(file.path);
                return { success: false, error: validation.error };
            }

            const { category } = validation;
            const relativePath = this.generateRelativePath(file, category);

            const publicUrl = driver === 's3'
                ? await this.uploadToS3(file, relativePath)
                : this.saveToLocalDisk(file, relativePath, baseUploadDir, basePublicUrl);

            this.logger.log(`Uploaded [${driver.toUpperCase()}]: ${file.originalname} → ${relativePath} (${this.formatBytes(file.size)})`);

            return {
                success: true,
                fileSchema: {
                    url: publicUrl,
                    category,
                    originalName: file.originalname,
                    mimeType: file.mimetype,
                    size: file.size,
                    filename: path.basename(relativePath),
                },
            };
        } catch (err) {
            this.deleteFile(file.path);
            this.logger.error(`Error processing file "${file.originalname}":`, err);
            return { success: false, error: `"${file.originalname}": internal error during processing.` };
        }
    }

    // ─── File Validation ──────────────────────────────────────────────────────

    private validateFile(file: Express.Multer.File): { valid: true; category: MediaCategory } | { valid: false; error: string } {
        if (!ALL_ALLOWED_MIMES.has(file.mimetype)) {
            return {
                valid: false,
                error: `"${file.originalname}": unsupported type "${file.mimetype}". Allowed: images, videos, audio, and documents.`,
            };
        }

        const category = resolveMimeCategory(file.mimetype);
        const sizeLimit = SIZE_LIMITS[category];

        if (file.size > sizeLimit) {
            const limitMb = Math.round(sizeLimit / 1024 / 1024);
            const categoryCap = category.charAt(0).toUpperCase() + category.slice(1);
            return {
                valid: false,
                error: `"${file.originalname}": file too large (${this.formatBytes(file.size)}). ${categoryCap} limit is ${limitMb} MB.`,
            };
        }

        return { valid: true, category };
    }

    // ─── Storage Drivers ──────────────────────────────────────────────────────

    private saveToLocalDisk(
        file: Express.Multer.File,
        relativePath: string,
        baseUploadDir: string,
        basePublicUrl: string,
    ): string {
        const destPath = path.join(baseUploadDir, relativePath);
        fs.mkdirSync(path.dirname(destPath), { recursive: true });

        try {
            fs.renameSync(file.path, destPath);
        } catch (err: any) {
            if (err.code === 'EXDEV') {
                fs.copyFileSync(file.path, destPath);
                fs.unlinkSync(file.path);
            } else {
                throw err;
            }
        }

        return `${basePublicUrl.replace(/\/$/, '')}/uploads/${relativePath}`;
    }

    private async uploadToS3(
        file: Express.Multer.File,
        s3Key: string,
    ): Promise<string> {
        const bucket = process.env.AWS_S3_BUCKET;
        if (!bucket) {
            throw new BadRequestException('AWS_S3_BUCKET environment variable is not configured.');
        }

        const client = this.getS3Client();
        const fileStream = fs.createReadStream(file.path);

        try {
            await client.send(
                new PutObjectCommand({
                    Bucket: bucket,
                    Key: s3Key,
                    Body: fileStream,
                    ContentType: file.mimetype,
                }),
            );

            this.deleteFile(file.path);

            if (process.env.UPLOAD_BASE_URL) {
                return `${process.env.UPLOAD_BASE_URL.replace(/\/$/, '')}/${s3Key}`;
            }

            const region = process.env.AWS_REGION || 'us-east-1';
            const endpoint = process.env.S3_ENDPOINT;
            if (endpoint) {
                return `${endpoint.replace(/\/$/, '')}/${bucket}/${s3Key}`;
            }

            return `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;
        } catch (err) {
            this.deleteFile(file.path);
            this.logger.error(`Failed to upload file to S3 bucket "${bucket}" with key "${s3Key}":`, err);
            throw err;
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private generateRelativePath(file: Express.Multer.File, category: string): string {
        const dateDir = this.todayPath();
        const ext = path.extname(file.originalname).toLowerCase() || this.defaultExt(file.mimetype);
        const filename = `${crypto.randomUUID()}${ext}`;
        return `${category}/${dateDir}/${filename}`;
    }

    private deleteFile(filePath: string) {
        try {
            if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (e) {
            this.logger.warn(`Could not delete temp file: ${filePath}`, e);
        }
    }

    private todayPath(): string {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}/${m}/${d}`;
    }

    private formatBytes(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    }

    /** Fallback extension when original filename had none */
    private defaultExt(mimeType: string): string {
        const map: Record<string, string> = {
            'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif',
            'image/webp': '.webp', 'image/svg+xml': '.svg',
            'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov',
            'audio/mpeg': '.mp3', 'audio/wav': '.wav', 'audio/ogg': '.ogg',
            'audio/aac': '.aac', 'audio/flac': '.flac',
            'application/pdf': '.pdf',
            'text/plain': '.txt', 'text/csv': '.csv',
        };
        return map[mimeType] ?? '';
    }
}

