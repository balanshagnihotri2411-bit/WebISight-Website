import { env } from '../config/env.js';

/**
 * Simple in-memory TTL cache backed by a Map.
 * Safe to lose on restart — purely optional performance optimization.
 */
class TtlCache {
  constructor(ttlMs) {
    this.ttlMs = ttlMs;
    this.store = new Map();
  }

  _prune() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value) {
    this._prune();
    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  get size() {
    this._prune();
    return this.store.size;
  }
}

export const auditCache = new TtlCache(env.CACHE_TTL_SECONDS * 1000);

/**
 * Normalize a URL for use as a cache key.
 * Lowercases scheme and host, removes trailing slash, strips fragment.
 */
export function normalizeCacheKey(rawUrl) {
  try {
    const u = new URL(rawUrl);
    u.hash = '';
    // Lowercase protocol and host
    const normalized = `${u.protocol.toLowerCase()}//${u.hostname.toLowerCase()}${
      u.port ? ':' + u.port : ''
    }${u.pathname}${u.search}`;
    return normalized.replace(/\/+$/, '') || '/';
  } catch {
    return rawUrl;
  }
}
