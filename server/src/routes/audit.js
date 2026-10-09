import { Router } from 'express';
import { postAudit } from '../controllers/auditController.js';
import { auditRateLimit } from '../middleware/rateLimit.js';
import { validateAuditBody } from '../middleware/validate.js';

const router = Router();

// POST /api/audit — validate → rate limit → run audit
router.post('/audit', validateAuditBody, auditRateLimit, postAudit);

// GET /api/ping — health check
router.get('/ping', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
