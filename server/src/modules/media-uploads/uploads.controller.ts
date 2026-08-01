import {
    Controller, Post, UploadedFiles,
    UseGuards, UseInterceptors, Request,
    BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as os from 'os';
import {
    ApiTags, ApiOperation, ApiBearerAuth,
    ApiConsumes, ApiBody, ApiResponse,
    ApiExtraModels,
} from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { UploadedFileSchema, UploadResponseSchema, ALL_ALLOWED_MIMES } from './dto/upload.types';
import { JwtAuthGuard } from '../iam/auth/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

/** Multer stores files in OS temp dir; the service finalises location after validation */
const TEMP_STORAGE = diskStorage({
    destination: os.tmpdir(),
    filename: (_req, file, cb) => {
        // Sanitise the original name to avoid path traversal in the temp name
        const safe = path.basename(file.originalname).replace(/[^\w.-]/g, '_');
        cb(null, `tatt_upload_${Date.now()}_${safe}`);
    },
});

/**
 * Multer fileFilter — rejects unknown MIME types at the boundary so they never
 * hit disk in the first place as a raw unknown blob.
 */
function mimeFilter(
    _req: any,
    file: Express.Multer.File,
    cb: (err: Error | null, accept: boolean) => void,
): void {
    if (ALL_ALLOWED_MIMES.has(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new BadRequestException(
                `File "${file.originalname}" has an unsupported type "${file.mimetype}". ` +
                `Accepted types: JPEG/PNG/GIF/WebP (image), MP4/MOV/WebM (video), ` +
                `MP3/WAV/AAC/FLAC (audio), PDF/DOCX/XLSX/PPTX/TXT/CSV (document).`,
            ),
            false,
        );
    }
}

@ApiTags('Media Uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiExtraModels(UploadedFileSchema, UploadResponseSchema)
@Controller('uploads')
export class UploadsController {
    constructor(private readonly uploadsService: UploadsService) { }

    @ApiOperation({
        summary: 'Upload media files for use in posts',
        description:
            'Upload one or more files in a single `multipart/form-data` request. ' +
            'Use field name **`files`** for all attachments.\n\n' +
            '### Supported types & size limits\n' +
            '| Category | Accepted formats | Max per file |\n' +
            '|---|---|---|\n' +
            '| **Image** | JPEG, PNG, GIF, WebP, SVG, BMP, TIFF | 10 MB |\n' +
            '| **Video** | MP4, MOV, AVI, WebM, MPEG, OGG, 3GP | 200 MB |\n' +
            '| **Audio** | MP3, WAV, OGG, AAC, FLAC, WMA, WebM audio | 50 MB |\n' +
            '| **Document** | PDF, DOCX, XLSX, PPTX, TXT, CSV, ZIP | 25 MB |\n\n' +
            '### Upload → Post workflow\n' +
            '1. Call `POST /uploads/media` with your files\n' +
            '2. Get back an array of `{ url, category, ... }` objects\n' +
            '3. Pass the `url` values into the `mediaUrls[]` array when calling `POST /feed` or `PATCH /feed/:postId`\n\n' +
            '### Partial success\n' +
            'If some files pass and others fail validation, the accepted files are returned ' +
            'with HTTP 201 and rejected files are described in the `errors` array.',
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'One or more files. Use field name `files` for all attachments.',
        schema: {
            type: 'object',
            properties: {
                files: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                    description: 'Up to 10 files per request.',
                },
            },
            required: ['files'],
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Files uploaded. Returns public URLs for use in post `mediaUrls[]`.',
        schema: {
            properties: {
                uploaded: { type: 'integer', example: 2 },
                files: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/UploadedFileSchema' },
                },
                errors: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Validation errors for rejected files (present only when some files failed).',
                    example: [],
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'All files failed validation — unsupported types or size limit exceeded.',
        schema: {
            properties: {
                statusCode: { type: 'integer', example: 400 },
                message: { type: 'string', example: 'All uploaded files were rejected.' },
                errors: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['"huge-movie.mp4": file too large (250.0 MB). Video limit is 200 MB.'],
                },
            },
        },
    })
    @ApiResponse({ status: 401, description: 'Missing or invalid Bearer token.' })
    @Public()
    @Post('media')
    @UseInterceptors(
        FilesInterceptor('files', 10, {
            storage: TEMP_STORAGE,
            fileFilter: mimeFilter,
            limits: {
                fileSize: 200 * 1024 * 1024, // 200 MB overall cap (video max)
                files: 10,
            },
        }),
    )
    async uploadMedia(
        @Request() req,
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        const uploadDir = process.env.UPLOAD_DIR ?? './uploads';
        const baseUrl = process.env.UPLOAD_BASE_URL ?? process.env.API_BASE_URL ?? 'http://localhost:3000';

        const accepted = await this.uploadsService.processUploads(files, uploadDir, baseUrl);

        return {
            uploaded: accepted.length,
            files: accepted,
        };
    }
}
