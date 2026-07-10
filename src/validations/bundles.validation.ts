import { body, param, query } from 'express-validator';
import { idParamValidation, paginationQueryValidation } from './shared.validation';

const pricingCoherenceValidator = body('price').custom((value: unknown, { req }) => {
  const pricingType = req.body?.pricingType;
  if (pricingType === 'Fixed' && (value === undefined || value === null || value === '')) {
    throw new Error('price is required when pricingType is Fixed');
  }
  if (pricingType === 'Manual' && value !== undefined && value !== null) {
    throw new Error('price must not be provided when pricingType is Manual');
  }
  return true;
});

export const createBundleValidation = [
  body('bundleName')
    .trim()
    .notEmpty()
    .withMessage('bundleName is required')
    .isLength({ max: 150 })
    .withMessage('bundleName must be at most 150 characters'),
  body('description').optional({ checkFalsy: true }).trim(),
  body('pricingType')
    .notEmpty()
    .withMessage('pricingType is required')
    .isIn(['Fixed', 'Manual'])
    .withMessage("pricingType must be 'Fixed' or 'Manual'"),
  body('price')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('price must be a non-negative number'),
  pricingCoherenceValidator,
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('featureIds').optional().isArray().withMessage('featureIds must be an array'),
  body('featureIds.*').isInt({ min: 1 }).withMessage('featureIds must contain positive integers'),
];

export const updateBundleValidation = [
  body('bundleName')
    .optional({ checkFalsy: true })
    .trim()
    .notEmpty()
    .isLength({ max: 150 })
    .withMessage('bundleName must be at most 150 characters'),
  body('description').optional({ checkFalsy: true }).trim(),
  body('pricingType')
    .optional()
    .isIn(['Fixed', 'Manual'])
    .withMessage("pricingType must be 'Fixed' or 'Manual'"),
  body('price')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('price must be a non-negative number'),
  pricingCoherenceValidator,
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

export const bundleIdParamValidation = [...idParamValidation];

export const listBundlesValidation = [
  ...paginationQueryValidation,
  query('search').optional().trim().isLength({ max: 150 }),
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

export const attachFeaturesValidation = [
  ...idParamValidation,
  body('featureIds').isArray({ min: 1 }).withMessage('featureIds must be a non-empty array'),
  body('featureIds.*').isInt({ min: 1 }).withMessage('featureIds must contain positive integers'),
];

export const detachFeatureValidation = [
  ...idParamValidation,
  param('featureId').isInt({ min: 1 }).withMessage('featureId must be a positive integer'),
];
