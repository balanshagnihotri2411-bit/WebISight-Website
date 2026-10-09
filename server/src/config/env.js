import 'dotenv/config';

const getEnv = (key, defaultVal) => process.env[key] ?? defaultVal;

export const env = {
  PORT: parseInt(getEnv('PORT', '3001'), 10),
  AUDIT_TIMEOUT_SECONDS: parseInt(getEnv('AUDIT_TIMEOUT_SECONDS', '30'), 10),
  RATE_LIMIT_PER_MINUTE: parseInt(getEnv('RATE_LIMIT_PER_MINUTE', '20'), 10),
  MAX_RESPONSE_BYTES: parseInt(getEnv('MAX_RESPONSE_BYTES', String(5 * 1024 * 1024)), 10), // 5 MB
  CACHE_TTL_SECONDS: parseInt(getEnv('CACHE_TTL_SECONDS', '300'), 10), // 5 minutes
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  CLIENT_URL: getEnv('CLIENT_URL', 'http://localhost:5173'),
};
