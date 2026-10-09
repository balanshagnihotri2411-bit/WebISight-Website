import 'dotenv/config';
import app from './app.js';
import { env } from './config/env.js';

const server = app.listen(env.PORT, () => {
  console.log(`🚀 WebISight API running on http://localhost:${env.PORT}`);
  console.log(`   Environment: ${env.NODE_ENV}`);
  console.log(`   Audit timeout: ${env.AUDIT_TIMEOUT_SECONDS}s`);
  console.log(`   Rate limit: ${env.RATE_LIMIT_PER_MINUTE} req/min`);
  console.log(`   Cache TTL: ${env.CACHE_TTL_SECONDS}s`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received — shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received — shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
