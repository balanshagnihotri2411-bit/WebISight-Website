/**
 * Centralized Express error handler.
 * Returns consistent JSON error responses.
 */
export function errorHandler(err, req, res, next) {
  // Known application errors with a statusCode
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      error: err.name,
      message: err.message,
    });
  }

  // Express body-parser JSON syntax errors
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'BadRequest',
      message: 'Invalid JSON in request body',
    });
  }

  // Unhandled/unexpected errors
  console.error('Unhandled error:', err);
  return res.status(500).json({
    error: 'InternalServerError',
    message: 'An unexpected error occurred',
  });
}
