import { Router } from 'express';
import * as featuresController from '../controllers/features.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { uploadSingleImage } from '../middleware/upload.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createFeatureValidation,
  featureIdParamValidation,
  listFeaturesValidation,
  updateFeatureValidation,
} from '../validations/features.validation';

const router = Router();

router.post(
  '/',
  authenticate,
  authorize('admin'),
  createFeatureValidation,
  validate,
  featuresController.createFeature,
);
router.get(
  '/',
  authenticate,
  authorize('client', 'admin'),
  listFeaturesValidation,
  validate,
  featuresController.listFeatures,
);
router.get(
  '/:id',
  authenticate,
  authorize('client', 'admin'),
  featureIdParamValidation,
  validate,
  featuresController.getFeatureById,
);
router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  featureIdParamValidation,
  updateFeatureValidation,
  validate,
  featuresController.updateFeature,
);
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  featureIdParamValidation,
  validate,
  featuresController.deleteFeature,
);
router.patch(
  '/:id/image',
  authenticate,
  authorize('admin'),
  featureIdParamValidation,
  validate,
  ...uploadSingleImage('image'),
  featuresController.updateFeatureImage,
);
router.delete(
  '/:id/image',
  authenticate,
  authorize('admin'),
  featureIdParamValidation,
  validate,
  featuresController.deleteFeatureImage,
);

export default router;
