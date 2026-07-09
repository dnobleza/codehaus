import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/helper';
import { verifyAccessToken } from '../utils/jwt.util';

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next(new AppError('Missing or malformed Authorization header', 401, 'AUTH'));
    return;
  }
  try {
    req.user = verifyAccessToken(header.slice('Bearer '.length));
    next();
  } catch {
    next(new AppError('Invalid or expired access token', 401, 'AUTH'));
  }
};

export const authorize =
  (...roles: Array<'client' | 'admin'>) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Authentication required', 401, 'AUTH'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError('Forbidden: insufficient role', 403, 'AUTH'));
      return;
    }
    next();
  };
