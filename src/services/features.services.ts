import * as featuresRepository from '../repositories/features.repository';
import * as storageServices from './storage.services';
import type { Pagination } from '../types/common';
import { AppError } from '../utils/helper';
import { assertHasUpdateFields, rethrowDuplicate } from '../utils/serviceHelpers';

export interface FeatureDTO {
  featureId: number;
  featureName: string;
  category: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const toFeatureDTO = (row: featuresRepository.FeatureRow): FeatureDTO => ({
  featureId: row.feature_id,
  featureName: row.feature_name,
  category: row.category,
  description: row.description,
  price: Number(row.price),
  imageUrl: row.image_url,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export interface CreateFeatureInput {
  featureName: string;
  category: string;
  description?: string;
  price: number;
}

export const createFeature = async (input: CreateFeatureInput): Promise<FeatureDTO> => {
  try {
    const featureId = await featuresRepository.createFeature(input);
    const feature = await featuresRepository.findFeatureById(featureId);
    return toFeatureDTO(feature!);
  } catch (error) {
    return rethrowDuplicate(error, 'Feature name already exists', 'FEATURE');
  }
};

export interface PaginatedFeatures {
  features: FeatureDTO[];
  pagination: Pagination;
}

export interface ListFeaturesFilters {
  category?: string;
  search?: string;
}

export const listFeatures = async (
  page: number,
  limit: number,
  filters: ListFeaturesFilters,
): Promise<PaginatedFeatures> => {
  const offset = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    featuresRepository.findFeaturesList(limit, offset, filters),
    featuresRepository.countFeatures(filters),
  ]);

  return {
    features: rows.map(toFeatureDTO),
    pagination: { page, limit, total },
  };
};

export const getFeatureById = async (featureId: number): Promise<FeatureDTO> => {
  const feature = await featuresRepository.findFeatureById(featureId);
  if (!feature) {
    throw new AppError('Feature not found', 404, 'FEATURE');
  }
  return toFeatureDTO(feature);
};

export interface UpdateFeatureInput {
  featureName?: string;
  category?: string;
  description?: string;
  price?: number;
}

export const updateFeature = async (
  featureId: number,
  input: UpdateFeatureInput,
): Promise<FeatureDTO> => {
  assertHasUpdateFields(input, 'FEATURE');

  const existing = await featuresRepository.findFeatureById(featureId);
  if (!existing) {
    throw new AppError('Feature not found', 404, 'FEATURE');
  }

  try {
    await featuresRepository.updateFeature(featureId, input);
  } catch (error) {
    rethrowDuplicate(error, 'Feature name already exists', 'FEATURE');
  }

  const updated = await featuresRepository.findFeatureById(featureId);
  return toFeatureDTO(updated!);
};

export const deleteFeature = async (featureId: number): Promise<void> => {
  const deleted = await featuresRepository.deleteFeature(featureId);
  if (!deleted) {
    throw new AppError('Feature not found', 404, 'FEATURE');
  }
};

export const updateFeatureImage = async (
  featureId: number,
  file: Express.Multer.File,
): Promise<FeatureDTO> => {
  const existing = await featuresRepository.findFeatureById(featureId);
  if (!existing) {
    throw new AppError('Feature not found', 404, 'FEATURE');
  }

  const previousImageUrl = existing.image_url;
  const { url } = await storageServices.uploadImage(file.buffer, file.mimetype, 'features');
  await featuresRepository.updateFeatureImageUrl(featureId, url);

  if (previousImageUrl) {
    await storageServices.deleteImage(previousImageUrl);
  }

  const updated = await featuresRepository.findFeatureById(featureId);
  return toFeatureDTO(updated!);
};

export const deleteFeatureImage = async (featureId: number): Promise<FeatureDTO> => {
  const existing = await featuresRepository.findFeatureById(featureId);
  if (!existing) {
    throw new AppError('Feature not found', 404, 'FEATURE');
  }

  if (existing.image_url) {
    await storageServices.deleteImage(existing.image_url);
    await featuresRepository.updateFeatureImageUrl(featureId, null);
  }

  const updated = await featuresRepository.findFeatureById(featureId);
  return toFeatureDTO(updated!);
};
