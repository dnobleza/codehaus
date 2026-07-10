import { body, query } from 'express-validator';
import { idParamValidation, paginationQueryValidation } from './shared.validation';

export const createPaymentValidation = [
  body('milestoneId').isInt({ min: 1 }).withMessage('milestoneId must be a positive integer'),
  body('methodId').isInt({ min: 1 }).withMessage('methodId must be a positive integer'),
  body('amountPaid').isFloat({ min: 0.01 }).withMessage('amountPaid must be a positive number'),
  body('referenceNumber')
    .trim()
    .notEmpty()
    .withMessage('referenceNumber is required')
    .isLength({ max: 150 })
    .withMessage('referenceNumber must be at most 150 characters'),
  body('paymentDate').isISO8601().withMessage('paymentDate must be a valid date'),
];

export const paymentIdParamValidation = [...idParamValidation];

export const listPaymentsValidation = [
  ...paginationQueryValidation,
  query('milestoneId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('milestoneId must be a positive integer'),
  query('projectId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('projectId must be a positive integer'),
  query('status')
    .optional()
    .isIn(['Pending', 'Verified', 'Rejected'])
    .withMessage('status must be one of Pending, Verified, Rejected'),
];

export const updatePaymentStatusValidation = [
  ...idParamValidation,
  body('status')
    .isIn(['Verified', 'Rejected'])
    .withMessage('status must be one of Verified, Rejected'),
];
