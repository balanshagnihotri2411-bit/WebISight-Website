import { runAudit } from '../orchestrator/auditOrchestrator.js';
import { AuditTimeoutError, AuditFailedError } from '../errors/index.js';
import { env } from '../config/env.js';

const TIMEOUT_MS = env.AUDIT_TIMEOUT_SECONDS * 1000;

/**
 * Wrap the orchestrator with a hard timeout.
 * Throws AuditTimeoutError (504) if the audit takes too long.
 * Throws AuditFailedError (502) for any other error.
 *
 * @param {string} url
 * @returns {Promise<object>} AuditReport
 */
export async function auditWithTimeout(url) {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new AuditTimeoutError(`Audit exceeded ${env.AUDIT_TIMEOUT_SECONDS}s timeout`));
    }, TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([runAudit(url), timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
  } catch (err) {
    clearTimeout(timeoutId);

    if (err instanceof AuditTimeoutError) {
      throw err;
    }

    // Re-throw known InvalidUrlError as-is so the controller can handle it
    if (err.name === 'InvalidUrlError') {
      throw err;
    }

    // Wrap everything else as AuditFailedError
    throw new AuditFailedError(
      `Audit failed: ${err.message || 'Unknown error'}`
    );
  }
}
