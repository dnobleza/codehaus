import { Router } from 'express';
import * as bundlesController from '../controllers/bundles.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { uploadSingleImage } from '../middleware/upload.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  attachFeaturesValidation,
  bundleIdParamValidation,
  createBundleValidation,
  detachFeatureValidation,
  listBundlesValidation,
  updateBundleValidation,
} from '../validations/bundles.validation';

const router = Router();

router.post(
  '/',
  authenticate,
  authorize('admin'),
  createBundleValidation,
  validate,
  bundlesController.createBundle,
);
router.get(
  '/',
  authenticate,
  authorize('client', 'admin'),
  listBundlesValidation,
  validate,
  bundlesController.listBundles,
);
router.get(
  '/:id',
  authenticate,
  authorize('client', 'admin'),
  bundleIdParamValidation,
  validate,
  bundlesController.getBundleById,
);
router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  bundleIdParamValidation,
  updateBundleValidation,
  validate,
  bundlesController.updateBundle,
);
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  bundleIdParamValidation,
  validate,
  bundlesController.deleteBundle,
);
router.post(
  '/:id/features',
  authenticate,
  authorize('admin'),
  attachFeaturesValidation,
  validate,
  bundlesController.attachFeatures,
);
router.delete(
  '/:id/features/:featureId',
  authenticate,
  authorize('admin'),
  detachFeatureValidation,
  validate,
  bundlesController.detachFeature,
);
router.patch(
  '/:id/image',
  authenticate,
  authorize('admin'),
  bundleIdParamValidation,
  validate,
  ...uploadSingleImage('image'),
  bundlesController.updateBundleImage,
);
router.delete(
  '/:id/image',
  authenticate,
  authorize('admin'),
  bundleIdParamValidation,
  validate,
  bundlesController.deleteBundleImage,
);

export default router;
