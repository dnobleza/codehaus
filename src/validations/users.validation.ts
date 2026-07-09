import { body, param, query } from 'express-validator';
import { isStrongPassword } from '../utils/helper';

const emailField = body('email')
  .trim()
  .notEmpty()
  .isEmail()
  .withMessage('A valid email is required')
  .customSanitizer((v: string) => v.toLowerCase());

export const registerValidation = [
  body('firstName').trim().notEmpty().withMessage('First name is required').isLength({ max: 100 }),
  body('middleName').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('lastName').trim().notEmpty().withMessage('Last name is required').isLength({ max: 100 }),
  body('address').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('contactNo')
    .trim()
    .notEmpty()
    .withMessage('Contact number is required')
    .isLength({ max: 20 }),
  emailField,
  body('password')
    .isString()
    .custom((value: string) => isStrongPassword(value))
    .withMessage('Password must be 8+ characters with upper, lower case letters and a number'),
];

export const loginValidation = [
  emailField,
  body('password').notEmpty().withMessage('Password is required'),
];

export const refreshValidation = [
  body('refreshToken').notEmpty().withMessage('refreshToken is required'),
];

export const updateProfileValidation = [
  body('firstName').optional({ checkFalsy: true }).trim().notEmpty().isLength({ max: 100 }),
  body('middleName').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('lastName').optional({ checkFalsy: true }).trim().notEmpty().isLength({ max: 100 }),
  body('address').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('contactNo').optional({ checkFalsy: true }).trim().notEmpty().isLength({ max: 20 }),
];

export const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('currentPassword is required'),
  body('newPassword')
    .isString()
    .custom((value: string) => isStrongPassword(value))
    .withMessage('New password must be 8+ characters with upper, lower case letters and a number'),
];

export const deactivateValidation = [
  body('password').notEmpty().withMessage('password is required'),
];

export const clientIdParamValidation = [
  param('id').isInt({ min: 1 }).withMessage('id must be a positive integer'),
];

export const listClientsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),
];
