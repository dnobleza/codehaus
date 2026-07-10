import * as bundlesService from '../services/bundles.services';
import { AppError } from '../utils/helper';
import { catchAsync, parseAdminIsActiveFilter, parsePagination } from '../utils/http';

export const createBundle = catchAsync(async (req, res) => {
  const bundle = await bundlesService.createBundle(req.body);
  res.status(201).json({ success: true, message: 'Bundle created', data: { bundle } });
});

export const listBundles = catchAsync(async (req, res) => {
  const { page, limit } = parsePagination(req);
  const search = req.query.search ? String(req.query.search) : undefined;
  const role = req.user!.role;
  const isActive = parseAdminIsActiveFilter(req, role);

  const data = await bundlesService.listBundles(page, limit, { search, isActive, role });
  res.status(200).json({ success: true, message: 'Bundles retrieved', data });
});

export const getBundleById = catchAsync(async (req, res) => {
  const bundle = await bundlesService.getBundleById(Number(req.params.id), req.user!.role);
  res.status(200).json({ success: true, message: 'Bundle retrieved', data: { bundle } });
});

export const updateBundle = catchAsync(async (req, res) => {
  const bundle = await bundlesService.updateBundle(Number(req.params.id), req.body);
  res.status(200).json({ success: true, message: 'Bundle updated', data: { bundle } });
});

export const deleteBundle = catchAsync(async (req, res) => {
  await bundlesService.deleteBundle(Number(req.params.id));
  res.status(200).json({ success: true, message: 'Bundle deleted' });
});

export const attachFeatures = catchAsync(async (req, res) => {
  const bundle = await bundlesService.attachFeatures(Number(req.params.id), req.body.featureIds);
  res.status(200).json({ success: true, message: 'Features attached to bundle', data: { bundle } });
});

export const detachFeature = catchAsync(async (req, res) => {
  await bundlesService.detachFeature(Number(req.params.id), Number(req.params.featureId));
  res.status(200).json({ success: true, message: 'Feature detached from bundle' });
});

export const updateBundleImage = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError('An image file is required', 400, 'UPLOAD');
  }
  const bundle = await bundlesService.updateBundleImage(Number(req.params.id), req.file);
  res.status(200).json({ success: true, message: 'Bundle image updated', data: { bundle } });
});

export const deleteBundleImage = catchAsync(async (req, res) => {
  const bundle = await bundlesService.deleteBundleImage(Number(req.params.id));
  res.status(200).json({ success: true, message: 'Bundle image removed', data: { bundle } });
});
