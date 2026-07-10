import type { NextFunction, Request, Response } from 'express';
import logger from '../utils/logger';

const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const user = req.user?.sub ?? 'anonymous';
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(0)}ms user=${user}`;

    if (res.statusCode >= 500) {
      logger.error(message, { tag: 'REQ' });
    } else if (res.statusCode >= 400) {
      logger.warn(message, { tag: 'REQ' });
    } else {
      logger.info(message, { tag: 'REQ' });
    }
  });

  next();
};

export default requestLogger;
