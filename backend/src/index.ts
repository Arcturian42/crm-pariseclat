import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import authRouter from './routes/auth';
import prospectsRouter from './routes/prospects';
import clientsRouter from './routes/clients';
import dashboardRouter from './routes/dashboard';
import agentsRouter from './routes/agents';

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// CORS configuration
app.use(
  cors({
    origin: [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Paris Éclat CRM API is running' });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/prospects', prospectsRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/agents', agentsRouter);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found', message: 'Route not found' });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
  });
});

app.listen(PORT, () => {
  console.log(`Paris Éclat CRM API running on port ${PORT}`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);
});

export default app;
