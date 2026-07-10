import { body, query } from 'express-validator';
import { idParamValidation, paginationQueryValidation } from './shared.validation';

export const createProjectUpdateValidation = [
  body('projectId').isInt({ min: 1 }).withMessage('projectId must be a positive integer'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('title is required')
    .isLength({ max: 150 })
    .withMessage('title must be at most 150 characters'),
  body('description').optional({ checkFalsy: true }).trim(),
  body('progress').isFloat({ min: 0, max: 100 }).withMessage('progress must be between 0 and 100'),
];

export const listProjectUpdatesValidation = [
  query('projectId').isInt({ min: 1 }).withMessage('projectId must be a positive integer'),
  ...paginationQueryValidation,
];

export const projectUpdateIdParamValidation = [...idParamValidation];
