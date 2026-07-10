import { param, query } from 'express-validator';

/**
 * Shared `page`/`limit` query validation, byte-identical across all list
 * endpoints. Spread into each resource's list validation array.
 */
export const paginationQueryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),
];

/**
 * Shared `:id` route param validation, byte-identical across all
 * single-resource endpoints. Spread into each resource's id/action
 * validation array.
 */
export const idParamValidation = [
  param('id').isInt({ min: 1 }).withMessage('id must be a positive integer'),
];
