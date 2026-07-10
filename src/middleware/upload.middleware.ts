import type { NextFunction, Request, RequestHandler, Response } from 'express';
import multer from 'multer';
import { AppError } from '../utils/helper';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error('UNSUPPORTED_FILE_TYPE'));
      return;
    }
    cb(null, true);
  },
});

const handleUploadErrors = (
  err: unknown,
  _req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    next(new AppError('Image exceeds the 5MB size limit', 400, 'UPLOAD'));
    return;
  }
  if (err instanceof Error && err.message === 'UNSUPPORTED_FILE_TYPE') {
    next(new AppError('Unsupported file type. Allowed: JPEG, PNG, WebP', 400, 'UPLOAD'));
    return;
  }
  if (err) {
    next(err);
    return;
  }
  next();
};

export const uploadSingleImage = (
  fieldName: string,
): [RequestHandler, (err: unknown, req: Request, res: Response, next: NextFunction) => void] => [
  upload.single(fieldName),
  handleUploadErrors,
];
