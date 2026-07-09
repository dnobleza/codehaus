import 'dotenv/config';

import app from './app';
import { testConnection } from './config/database';
import logger from './utils/logger';

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

const start = async (): Promise<void> => {
  const dbStatus = await testConnection();

  if (dbStatus.success) {
    logger.info('Startup database check: connection successful.', { tag: 'DATABASE' });
  } else {
    logger.warn(
      `Startup database check failed: ${dbStatus.error}. Server will start anyway; requests requiring the database will fail until it is reachable.`,
      { tag: 'DATABASE' },
    );
  }

  app.listen(PORT, () => {
    logger.info(`Server listening on port ${PORT}`, { tag: 'SERVER' });
  });
};

start();
