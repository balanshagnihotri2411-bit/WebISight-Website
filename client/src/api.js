/**
 * API client for the WebISight backend.
 * In development, Vite proxies /api → http://localhost:3001.
 */

const API_BASE = '/api';

/**
 * Run an audit for the given URL.
 * @param {string} url
 * @returns {Promise<object>} AuditReport
 * @throws {Error} with .status and .message from the server
 */
export async function runAudit(url) {
  const response = await fetch(`${API_BASE}/audit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  const data = await response.json();

  if (!response.ok) {
    const err = new Error(
      data.message || data.error || 'Unknown error from server'
    );
    err.status = response.status;
    err.serverData = data;
    throw err;
  }

  return data;
}

/**
 * Friendly error message based on HTTP status.
 */
export function friendlyErrorMessage(err) {
  switch (err?.status) {
    case 400:
      return err.serverData?.details?.[0]?.message || 'Invalid URL. Please enter a valid http:// or https:// URL.';
    case 429:
      return 'Too many requests. You can run up to 20 audits per minute. Please wait a moment and try again.';
    case 502:
      return 'Could not reach the target website. It may be down or blocking crawlers. Please try a different URL.';
    case 504:
      return 'The audit timed out. The target website took too long to respond. Please try again later.';
    default:
      return err?.message || 'An unexpected error occurred. Please try again.';
  }
}
