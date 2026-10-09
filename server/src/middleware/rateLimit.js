import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const auditRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: env.RATE_LIMIT_PER_MINUTE,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Rate limit exceeded',
    message: `You can only request ${env.RATE_LIMIT_PER_MINUTE} audits per minute. Please wait and try again.`,
    retryAfter: 60,
  },
  handler: (req, res, next, options) => {
    res.status(429).json(options.message);
  },
});
