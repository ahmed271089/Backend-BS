import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'video/mp4',
  'video/quicktime',
];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const getStorage = () => {
  if (process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID) {
    return multerS3({
      s3: s3Client,
      bucket: process.env.AWS_S3_BUCKET,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: (_req, file, cb) => {
        const unique = randomUUID();
        cb(null, `${unique}${extname(file.originalname)}`);
      },
    });
  }

  // Fallback to local disk storage
  return diskStorage({
    destination: './uploads',
    filename: (_req, file, callback) => {
      const unique = randomUUID();
      callback(null, `${unique}${extname(file.originalname)}`);
    },
  });
};

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: getStorage(),
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          return callback(new BadRequestException('Unsupported file type'), false);
        }
        callback(null, true);
      },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');

    const type = file.mimetype.startsWith('video/') ? 'VIDEO' : 'PHOTO';

    let url = '';
    if ((file as any).location) {
      // Returned by multer-s3
      url = (file as any).location;
    } else {
      // Local fallback
      const baseUrl = process.env.PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
      url = `${baseUrl}/uploads/${file.filename}`;
    }

    return {
      url,
      type,
      sizeBytes: file.size,
    };
  }
}
