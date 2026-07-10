import { body, query } from 'express-validator';
import { idParamValidation, paginationQueryValidation } from './shared.validation';

const PROJECT_STATUSES = ['Not Started', 'In Progress', 'On Hold', 'Completed', 'Cancelled'];

export const projectIdParamValidation = [...idParamValidation];

export const listProjectsValidation = [
  ...paginationQueryValidation,
  query('status')
    .optional()
    .isIn(PROJECT_STATUSES)
    .withMessage(`status must be one of ${PROJECT_STATUSES.join(', ')}`),
  query('clientId').optional().isInt({ min: 1 }).withMessage('clientId must be a positive integer'),
];

export const updateProjectValidation = [
  body('projectName')
    .optional({ checkFalsy: true })
    .trim()
    .notEmpty()
    .isLength({ max: 150 })
    .withMessage('projectName must be at most 150 characters'),
  body('status')
    .optional()
    .isIn(PROJECT_STATUSES)
    .withMessage(`status must be one of ${PROJECT_STATUSES.join(', ')}`),
  body('startDate').optional().isISO8601().withMessage('startDate must be a valid date'),
  body('expectedEndDate')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('expectedEndDate must be a valid date'),
  body('overallProgress')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('overallProgress must be between 0 and 100'),
];
