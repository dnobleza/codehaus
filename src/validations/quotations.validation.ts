import { body, query } from 'express-validator';
import { idParamValidation, paginationQueryValidation } from './shared.validation';

export const createQuotationValidation = [
  body('bundleId').isInt({ min: 1 }).withMessage('bundleId must be a positive integer'),
  body('extraFeatureIds').optional().isArray().withMessage('extraFeatureIds must be an array'),
  body('extraFeatureIds.*')
    .isInt({ min: 1 })
    .withMessage('extraFeatureIds must contain positive integers'),
];

export const quotationIdParamValidation = [...idParamValidation];

export const listQuotationsValidation = [
  ...paginationQueryValidation,
  query('status')
    .optional()
    .isIn(['Pending', 'Approved', 'Rejected', 'Expired'])
    .withMessage('status must be one of Pending, Approved, Rejected, Expired'),
  query('clientId').optional().isInt({ min: 1 }).withMessage('clientId must be a positive integer'),
];

export const updateQuotationStatusValidation = [
  ...idParamValidation,
  body('status')
    .isIn(['Approved', 'Rejected', 'Expired'])
    .withMessage('status must be one of Approved, Rejected, Expired'),
  body('discount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('discount must be a non-negative number'),
  body('tax').optional().isFloat({ min: 0 }).withMessage('tax must be a non-negative number'),
];
