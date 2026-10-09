import { z } from 'zod';

const auditBodySchema = z.object({
  url: z
    .string({ required_error: 'url is required' })
    .min(1, 'url must not be blank')
    .refine(
      (val) => {
        try {
          const u = new URL(val);
          return u.protocol === 'http:' || u.protocol === 'https:';
        } catch {
          return false;
        }
      },
      { message: 'url must be a valid http:// or https:// URL' }
    ),
});

/**
 * Express middleware that validates req.body against the audit schema.
 * Responds with 400 and structured errors on validation failure.
 */
export function validateAuditBody(req, res, next) {
  const result = auditBodySchema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join('.') || 'url',
      message: e.message,
    }));
    return res.status(400).json({
      error: 'Validation failed',
      details: errors,
    });
  }
  req.validatedBody = result.data;
  next();
}
