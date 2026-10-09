import { auditWithTimeout } from '../services/auditService.js';
import { auditCache, normalizeCacheKey } from '../utils/cache.js';

/**
 * POST /api/audit
 */
export async function postAudit(req, res, next) {
  try {
    const { url } = req.validatedBody;
    const cacheKey = normalizeCacheKey(url);

    // Check cache first
    const cached = auditCache.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const report = await auditWithTimeout(url);

    // Store in cache
    auditCache.set(cacheKey, report);

    return res.json(report);
  } catch (err) {
    next(err);
  }
}
