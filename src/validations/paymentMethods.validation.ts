import { body, query } from 'express-validator';
import { idParamValidation, paginationQueryValidation } from './shared.validation';

const methodTypeValidator = body('methodType')
  .optional()
  .custom((value: unknown) => {
    if (value !== 'manual') {
      throw new Error('paymongo/stripe support is not yet available');
    }
    return true;
  });

export const createPaymentMethodValidation = [
  body('methodName')
    .trim()
    .notEmpty()
    .withMessage('methodName is required')
    .isLength({ max: 150 })
    .withMessage('methodName must be at most 150 characters'),
  methodTypeValidator,
  body('accountName').optional({ checkFalsy: true }).trim().isLength({ max: 150 }),
  body('accountNumber').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
];

export const paymentMethodIdParamValidation = [...idParamValidation];

export const listPaymentMethodsValidation = [
  ...paginationQueryValidation,
  query('search').optional().trim().isLength({ max: 150 }),
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

export const updatePaymentMethodValidation = [
  body('methodName')
    .optional({ checkFalsy: true })
    .trim()
    .notEmpty()
    .isLength({ max: 150 })
    .withMessage('methodName must be at most 150 characters'),
  methodTypeValidator,
  body('accountName').optional({ checkFalsy: true }).trim().isLength({ max: 150 }),
  body('accountNumber').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];
