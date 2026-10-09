import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { env } from './config/env.js';
import auditRouter from './routes/audit.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin:
      env.NODE_ENV === 'production'
        ? false // served from same origin in production
        : [env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  })
);

// Body parsing
app.use(express.json({ limit: '100kb' }));

// Health check (outside /api so infra can check without auth)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API routes
app.use('/api', auditRouter);

// Serve built React client in production
const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDistPath = join(__dirname, '..', '..', 'client', 'dist');

if (env.NODE_ENV === 'production' && existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  // SPA fallback: serve index.html for any non-API route
  app.get('*', (req, res) => {
    res.sendFile(join(clientDistPath, 'index.html'));
  });
} else {
  // 404 handler for unknown routes (dev mode)
  app.use((req, res) => {
    res.status(404).json({ error: 'NotFound', message: `Route ${req.method} ${req.path} not found` });
  });
}

// Centralized error handler (must be last)
app.use(errorHandler);

export default app;
