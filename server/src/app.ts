import express, { Request, Response } from 'express';
import cors from 'cors';
import apiRouter from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';

const app = express();

// CORS is restricted to configured frontend origins (comma-separated
// CLIENT_ORIGINS env override). Local dev defaults cover the Vite dev server
// and a common React port. No credentials/cookies are used — JWT travels in the
// Authorization header.
const corsOrigins = process.env.CLIENT_ORIGINS
  ? process.env.CLIENT_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({ origin: corsOrigins }));

// Parse incoming JSON requests
app.use(express.json());

// Health Check Endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Centralized API Routes
app.use('/api', apiRouter);

// 404 Handler for undefined routes
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

export default app;
