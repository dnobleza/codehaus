import { body, query } from 'express-validator';
import { idParamValidation, paginationQueryValidation } from './shared.validation';

export const createFeatureValidation = [
  body('featureName')
    .trim()
    .notEmpty()
    .withMessage('featureName is required')
    .isLength({ max: 150 })
    .withMessage('featureName must be at most 150 characters'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('category is required')
    .isLength({ max: 100 })
    .withMessage('category must be at most 100 characters'),
  body('description').optional({ checkFalsy: true }).trim(),
  body('price')
    .notEmpty()
    .withMessage('price is required')
    .isFloat({ min: 0 })
    .withMessage('price must be a non-negative number'),
];

export const updateFeatureValidation = [
  body('featureName')
    .optional({ checkFalsy: true })
    .trim()
    .notEmpty()
    .isLength({ max: 150 })
    .withMessage('featureName must be at most 150 characters'),
  body('category')
    .optional({ checkFalsy: true })
    .trim()
    .notEmpty()
    .isLength({ max: 100 })
    .withMessage('category must be at most 100 characters'),
  body('description').optional({ checkFalsy: true }).trim(),
  body('price').optional().isFloat({ min: 0 }).withMessage('price must be a non-negative number'),
];

export const featureIdParamValidation = [...idParamValidation];

export const listFeaturesValidation = [
  ...paginationQueryValidation,
  query('category').optional().trim().isLength({ max: 100 }),
  query('search').optional().trim().isLength({ max: 150 }),
];
