import * as bundlesRepository from '../repositories/bundles.repository';
import * as featuresRepository from '../repositories/features.repository';
import * as storageServices from './storage.services';
import type { Pagination } from '../types/common';
import { AppError } from '../utils/helper';
import { assertHasUpdateFields, rethrowDuplicate } from '../utils/serviceHelpers';

export interface BundleFeatureDTO {
  featureId: number;
  featureName: string;
  category: string;
  price: number;
}

export interface BundleDTO {
  bundleId: number;
  bundleName: string;
  description: string | null;
  price: number | null;
  pricingType: 'Fixed' | 'Manual';
  isActive: boolean;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BundleWithFeaturesDTO extends BundleDTO {
  features: BundleFeatureDTO[];
}

const toBundleDTO = (row: bundlesRepository.BundleRow): BundleDTO => ({
  bundleId: row.bundle_id,
  bundleName: row.bundle_name,
  description: row.description,
  price: row.price !== null ? Number(row.price) : null,
  pricingType: row.pricing_type,
  isActive: Boolean(row.is_active),
  imageUrl: row.image_url,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toBundleFeatureDTO = (row: bundlesRepository.BundleFeatureRow): BundleFeatureDTO => ({
  featureId: row.feature_id,
  featureName: row.feature_name,
  category: row.category,
  price: Number(row.price),
});

const fetchBundleWithFeatures = async (bundleId: number): Promise<BundleWithFeaturesDTO> => {
  const bundle = await bundlesRepository.findBundleById(bundleId);
  if (!bundle) {
    throw new AppError('Bundle not found', 404, 'BUNDLE');
  }
  const features = await bundlesRepository.findBundleFeatures(bundleId);
  return { ...toBundleDTO(bundle), features: features.map(toBundleFeatureDTO) };
};

const assertFeaturesExist = async (featureIds: number[]): Promise<void> => {
  if (featureIds.length === 0) {
    return;
  }
  const existing = await featuresRepository.findFeaturesByIds(featureIds);
  if (existing.length !== featureIds.length) {
    throw new AppError('One or more features not found', 404, 'BUNDLE');
  }
};

export interface CreateBundleInput {
  bundleName: string;
  description?: string;
  pricingType: 'Fixed' | 'Manual';
  price?: number;
  isActive?: boolean;
  featureIds?: number[];
}

export const createBundle = async (input: CreateBundleInput): Promise<BundleWithFeaturesDTO> => {
  const featureIds = Array.from(new Set(input.featureIds ?? []));
  await assertFeaturesExist(featureIds);

  let bundleId: number;
  try {
    bundleId = await bundlesRepository.createBundleTx(
      {
        bundleName: input.bundleName,
        description: input.description ?? null,
        price: input.pricingType === 'Fixed' ? (input.price ?? null) : null,
        pricingType: input.pricingType,
        isActive: input.isActive ?? true,
      },
      featureIds,
    );
  } catch (error) {
    return rethrowDuplicate(error, 'Bundle name already exists', 'BUNDLE');
  }

  return fetchBundleWithFeatures(bundleId);
};

export interface PaginatedBundles {
  bundles: BundleDTO[];
  pagination: Pagination;
}

export interface ListBundlesFilters {
  search?: string;
  isActive?: boolean;
  role: 'client' | 'admin';
}

export const listBundles = async (
  page: number,
  limit: number,
  filters: ListBundlesFilters,
): Promise<PaginatedBundles> => {
  const offset = (page - 1) * limit;
  const effectiveFilters = {
    search: filters.search,
    isActive: filters.role === 'client' ? true : filters.isActive,
  };

  const [rows, total] = await Promise.all([
    bundlesRepository.findBundlesList(limit, offset, effectiveFilters),
    bundlesRepository.countBundles(effectiveFilters),
  ]);

  return {
    bundles: rows.map(toBundleDTO),
    pagination: { page, limit, total },
  };
};

export const getBundleById = async (
  bundleId: number,
  role: 'client' | 'admin',
): Promise<BundleWithFeaturesDTO> => {
  const bundle = await fetchBundleWithFeatures(bundleId);
  if (role === 'client' && !bundle.isActive) {
    throw new AppError('Bundle not found', 404, 'BUNDLE');
  }
  return bundle;
};

export interface UpdateBundleInput {
  bundleName?: string;
  description?: string;
  price?: number | null;
  pricingType?: 'Fixed' | 'Manual';
  isActive?: boolean;
}

export const updateBundle = async (
  bundleId: number,
  input: UpdateBundleInput,
): Promise<BundleWithFeaturesDTO> => {
  assertHasUpdateFields(input, 'BUNDLE');

  const existing = await bundlesRepository.findBundleById(bundleId);
  if (!existing) {
    throw new AppError('Bundle not found', 404, 'BUNDLE');
  }

  const effectivePricingType = input.pricingType ?? existing.pricing_type;

  let price: number | null;
  if (effectivePricingType === 'Fixed') {
    const candidatePrice =
      input.price !== undefined
        ? input.price
        : existing.price !== null
          ? Number(existing.price)
          : undefined;
    if (candidatePrice === undefined) {
      throw new AppError('price is required for Fixed pricing type', 400, 'BUNDLE');
    }
    price = candidatePrice;
  } else {
    if (input.price !== undefined && input.price !== null) {
      throw new AppError('price must not be provided for Manual pricing type', 400, 'BUNDLE');
    }
    price = null;
  }

  try {
    await bundlesRepository.updateBundle(bundleId, {
      bundleName: input.bundleName,
      description: input.description,
      price,
      pricingType: input.pricingType,
      isActive: input.isActive,
    });
  } catch (error) {
    rethrowDuplicate(error, 'Bundle name already exists', 'BUNDLE');
  }

  return fetchBundleWithFeatures(bundleId);
};

export const deleteBundle = async (bundleId: number): Promise<void> => {
  const deleted = await bundlesRepository.deleteBundle(bundleId);
  if (!deleted) {
    throw new AppError('Bundle not found', 404, 'BUNDLE');
  }
};

export const attachFeatures = async (
  bundleId: number,
  featureIds: number[],
): Promise<BundleWithFeaturesDTO> => {
  const bundle = await bundlesRepository.findBundleById(bundleId);
  if (!bundle) {
    throw new AppError('Bundle not found', 404, 'BUNDLE');
  }

  const uniqueIds = Array.from(new Set(featureIds));
  await assertFeaturesExist(uniqueIds);

  await bundlesRepository.attachFeatures(bundleId, uniqueIds);
  return fetchBundleWithFeatures(bundleId);
};

export const detachFeature = async (bundleId: number, featureId: number): Promise<void> => {
  const bundle = await bundlesRepository.findBundleById(bundleId);
  if (!bundle) {
    throw new AppError('Bundle not found', 404, 'BUNDLE');
  }

  const removed = await bundlesRepository.detachFeature(bundleId, featureId);
  if (!removed) {
    throw new AppError('Feature is not attached to this bundle', 404, 'BUNDLE');
  }
};

export const updateBundleImage = async (
  bundleId: number,
  file: Express.Multer.File,
): Promise<BundleWithFeaturesDTO> => {
  const existing = await bundlesRepository.findBundleById(bundleId);
  if (!existing) {
    throw new AppError('Bundle not found', 404, 'BUNDLE');
  }

  const previousImageUrl = existing.image_url;
  const { url } = await storageServices.uploadImage(file.buffer, file.mimetype, 'bundles');
  await bundlesRepository.updateBundleImageUrl(bundleId, url);

  if (previousImageUrl) {
    await storageServices.deleteImage(previousImageUrl);
  }

  return fetchBundleWithFeatures(bundleId);
};

export const deleteBundleImage = async (bundleId: number): Promise<BundleWithFeaturesDTO> => {
  const existing = await bundlesRepository.findBundleById(bundleId);
  if (!existing) {
    throw new AppError('Bundle not found', 404, 'BUNDLE');
  }

  if (existing.image_url) {
    await storageServices.deleteImage(existing.image_url);
    await bundlesRepository.updateBundleImageUrl(bundleId, null);
  }

  return fetchBundleWithFeatures(bundleId);
};
