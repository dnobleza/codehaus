import rateLimit from 'express-rate-limit';

const skipInTests = (): boolean => process.env.NODE_ENV === 'test';

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { success: false, message: 'Too many registration attempts. Please try again later.' },
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: skipInTests,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
});

export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { success: false, message: 'Too many token refresh attempts. Please try again later.' },
});
