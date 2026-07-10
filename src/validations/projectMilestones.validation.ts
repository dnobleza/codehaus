import { body, query } from 'express-validator';
import { idParamValidation, paginationQueryValidation } from './shared.validation';

export const createMilestoneValidation = [
  body('projectId').isInt({ min: 1 }).withMessage('projectId must be a positive integer'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('title is required')
    .isLength({ max: 150 })
    .withMessage('title must be at most 150 characters'),
  body('requiredProgressPercentage')
    .isFloat({ min: 0, max: 100 })
    .withMessage('requiredProgressPercentage must be between 0 and 100'),
  body('amount').isFloat({ min: 0 }).withMessage('amount must be a non-negative number'),
  body('dueDate').optional().isISO8601().withMessage('dueDate must be a valid date'),
];

export const listMilestonesValidation = [
  query('projectId').isInt({ min: 1 }).withMessage('projectId must be a positive integer'),
  ...paginationQueryValidation,
];

export const milestoneIdParamValidation = [...idParamValidation];

export const updateMilestoneValidation = [
  body('title')
    .optional({ checkFalsy: true })
    .trim()
    .notEmpty()
    .isLength({ max: 150 })
    .withMessage('title must be at most 150 characters'),
  body('requiredProgressPercentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('requiredProgressPercentage must be between 0 and 100'),
  body('amount').optional().isFloat({ min: 0 }).withMessage('amount must be a non-negative number'),
  body('dueDate')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('dueDate must be a valid date'),
];
