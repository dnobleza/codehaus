import cors from 'cors';
import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { testConnection } from './config/database';
import errorMiddleware from './middleware/error.middleware';
import usersRouter from './routes/users.route';
import logger from './utils/logger';

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use(
  morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim(), { tag: 'HTTP' }),
    },
  }),
);

app.get('/health', async (_req: Request, res: Response) => {
  const dbStatus = await testConnection();

  res.status(dbStatus.success ? 200 : 503).json({
    success: dbStatus.success,
    message: dbStatus.success ? 'Service is healthy' : 'Service is degraded',
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: { status: dbStatus.success ? 'connected' : 'disconnected' },
    },
  });
});

app.use('/api/users', usersRouter);

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use(errorMiddleware);

export default app;
