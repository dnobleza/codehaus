import cors from 'cors';
import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { testConnection } from './config/database';
import errorMiddleware from './middleware/error.middleware';
import requestLogger from './middleware/requestLogger.middleware';
import bundlesRouter from './routes/bundles.route';
import featuresRouter from './routes/features.route';
import paymentMethodsRouter from './routes/paymentMethods.route';
import paymentsRouter from './routes/payments.route';
import projectMilestonesRouter from './routes/projectMilestones.route';
import projectUpdatesRouter from './routes/projectUpdates.route';
import projectsRouter from './routes/projects.route';
import quotationsRouter from './routes/quotations.route';
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

app.use(requestLogger);

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
app.use('/api/bundles', bundlesRouter);
app.use('/api/features', featuresRouter);
app.use('/api/quotations', quotationsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/project-updates', projectUpdatesRouter);
app.use('/api/project-milestones', projectMilestonesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/payment-methods', paymentMethodsRouter);

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use(errorMiddleware);

export default app;
