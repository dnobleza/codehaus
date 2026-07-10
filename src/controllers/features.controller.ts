import * as featuresService from '../services/features.services';
import { AppError } from '../utils/helper';
import { catchAsync, parsePagination } from '../utils/http';

export const createFeature = catchAsync(async (req, res) => {
  const feature = await featuresService.createFeature(req.body);
  res.status(201).json({ success: true, message: 'Feature created', data: { feature } });
});

export const listFeatures = catchAsync(async (req, res) => {
  const { page, limit } = parsePagination(req);
  const category = req.query.category ? String(req.query.category) : undefined;
  const search = req.query.search ? String(req.query.search) : undefined;
  const data = await featuresService.listFeatures(page, limit, { category, search });
  res.status(200).json({ success: true, message: 'Features retrieved', data });
});

export const getFeatureById = catchAsync(async (req, res) => {
  const feature = await featuresService.getFeatureById(Number(req.params.id));
  res.status(200).json({ success: true, message: 'Feature retrieved', data: { feature } });
});

export const updateFeature = catchAsync(async (req, res) => {
  const feature = await featuresService.updateFeature(Number(req.params.id), req.body);
  res.status(200).json({ success: true, message: 'Feature updated', data: { feature } });
});

export const deleteFeature = catchAsync(async (req, res) => {
  await featuresService.deleteFeature(Number(req.params.id));
  res.status(200).json({ success: true, message: 'Feature deleted' });
});

export const updateFeatureImage = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError('An image file is required', 400, 'UPLOAD');
  }
  const feature = await featuresService.updateFeatureImage(Number(req.params.id), req.file);
  res.status(200).json({ success: true, message: 'Feature image updated', data: { feature } });
});

export const deleteFeatureImage = catchAsync(async (req, res) => {
  const feature = await featuresService.deleteFeatureImage(Number(req.params.id));
  res.status(200).json({ success: true, message: 'Feature image removed', data: { feature } });
});
