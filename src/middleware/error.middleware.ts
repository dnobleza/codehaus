import type { NextFunction, Request, Response } from 'express';
import logger from '../utils/logger';

const errorMiddleware = (
  err: Error & { statusCode?: number; tag?: string },
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const statusCode = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;

  logger.error(`${req.method} ${req.originalUrl} - ${err.message}`, { tag: err.tag ?? 'ERROR' });

  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 && !isDevelopment ? 'Internal server error' : err.message,
  });
};

export default errorMiddleware;
