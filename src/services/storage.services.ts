import crypto from 'crypto';
import supabase, { STORAGE_BUCKET } from '../config/supabase';
import { AppError } from '../utils/helper';
import logger from '../utils/logger';

export type ImageFolder = 'avatars' | 'bundles' | 'features' | 'payment-proofs' | 'payment-methods';

const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export interface UploadImageResult {
  url: string;
  path: string;
}

export const uploadImage = async (
  buffer: Buffer,
  mimeType: string,
  folder: ImageFolder,
): Promise<UploadImageResult> => {
  const extension = MIME_TO_EXTENSION[mimeType];
  if (!extension) {
    throw new AppError('Unsupported file type. Allowed: JPEG, PNG, WebP', 400, 'UPLOAD');
  }

  const path = `${folder}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, { contentType: mimeType, upsert: false });

  if (error) {
    logger.error(`Failed to upload image to Supabase Storage: ${error.message}`, {
      tag: 'STORAGE',
    });
    throw new AppError('Failed to upload image', 502, 'STORAGE');
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);

  return { url: publicUrl, path };
};

export const deleteImage = async (pathOrUrl: string): Promise<void> => {
  const marker = `/object/public/${STORAGE_BUCKET}/`;
  const markerIndex = pathOrUrl.indexOf(marker);
  const path = markerIndex >= 0 ? pathOrUrl.slice(markerIndex + marker.length) : pathOrUrl;

  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
  if (error) {
    logger.warn(`Failed to delete image from Supabase Storage: ${error.message}`, {
      tag: 'STORAGE',
    });
  }
};
