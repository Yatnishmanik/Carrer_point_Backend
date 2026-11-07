import express from 'express';
import cors from 'cors';
import { config } from './config';
import apiRoutes from './routes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

// Middlewares
app.use(
  cors({
    origin: [config.frontendUrl, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  })
);

app.use('/api/questions/bulk', express.json({ limit: '3mb' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// Welcome Route
app.get('/', (_req, res) => {
  res.json({
    message: 'Welcome to AR Career Point Backend API',
    documentation: '/api/health',
    version: '1.0.0',
    stack: 'Node.js + Express + TypeScript + PostgreSQL + Prisma',
  });
});

// Mount Master API Router
app.use('/api', apiRoutes);

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'एपीआई एंडपॉइंट नहीं मिला (API Endpoint not found)',
  });
});

// Error Handling Middleware
app.use(errorHandler);

export default app;
