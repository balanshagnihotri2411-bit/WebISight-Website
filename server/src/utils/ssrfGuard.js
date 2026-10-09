import dns from 'dns/promises';
import { InvalidUrlError } from '../errors/index.js';

// Private/reserved IP ranges to block
const BLOCKED_RANGES = [
  // IPv4
  /^127\./,                          // 127.0.0.0/8 loopback
  /^10\./,                           // 10.0.0.0/8 private
  /^192\.168\./,                     // 192.168.0.0/16 private
  /^172\.(1[6-9]|2\d|3[01])\./,     // 172.16.0.0/12 private
  /^169\.254\./,                     // 169.254.0.0/16 link-local
  /^0\./,                            // 0.0.0.0/8
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,  // 100.64.0.0/10 CGN
  /^198\.51\.100\./,                 // TEST-NET-2
  /^203\.0\.113\./,                  // TEST-NET-3
  /^198\.18\./,                      // Benchmark
  /^240\./,                          // Reserved
  /^255\.255\.255\.255$/,            // Broadcast
  // IPv6
  /^::1$/,                           // loopback
  /^fc/i,                            // fc00::/7 unique local
  /^fd/i,                            // fc00::/7 unique local
  /^fe80/i,                          // link-local
  /^::$/,                            // unspecified
];

function isPrivateIp(ip) {
  return BLOCKED_RANGES.some((re) => re.test(ip));
}

/**
 * Validates a URL is safe to fetch (not SSRF).
 * Resolves DNS and checks resolved IPs are public.
 * @param {string} rawUrl
 * @returns {Promise<URL>} parsed URL if safe
 * @throws {InvalidUrlError} if unsafe
 */
export async function ssrfGuard(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new InvalidUrlError(`Malformed URL: ${rawUrl}`);
  }

  const { protocol, hostname } = parsed;

  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new InvalidUrlError(`Only http and https schemes are allowed, got: ${protocol}`);
  }

  // Block numeric IP access patterns first
  // Try to resolve DNS
  let addresses;
  try {
    const result = await dns.lookup(hostname, { all: true });
    addresses = result.map((r) => r.address);
  } catch {
    throw new InvalidUrlError(`Could not resolve hostname: ${hostname}`);
  }

  for (const ip of addresses) {
    if (isPrivateIp(ip)) {
      throw new InvalidUrlError(
        `URL resolves to a private/reserved IP address (${ip}), which is not allowed`
      );
    }
  }

  return parsed;
}
