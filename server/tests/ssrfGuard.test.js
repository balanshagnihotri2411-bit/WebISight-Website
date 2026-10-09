import { describe, it, expect } from 'vitest';
import { ssrfGuard } from '../src/utils/ssrfGuard.js';

// Note: ssrfGuard calls dns.lookup so we test with real DNS resolution
// For private-IP tests we use hostnames that we know resolve to private ranges,
// or we test the URL-validation layers that don't need DNS.

describe('ssrfGuard', () => {
  it('throws InvalidUrlError for non-http scheme', async () => {
    await expect(ssrfGuard('ftp://example.com')).rejects.toMatchObject({
      name: 'InvalidUrlError',
    });
  });

  it('throws InvalidUrlError for file:// scheme', async () => {
    await expect(ssrfGuard('file:///etc/passwd')).rejects.toMatchObject({
      name: 'InvalidUrlError',
    });
  });

  it('throws InvalidUrlError for malformed URL', async () => {
    await expect(ssrfGuard('not-a-url')).rejects.toMatchObject({
      name: 'InvalidUrlError',
    });
  });

  it('throws InvalidUrlError for javascript: scheme', async () => {
    await expect(ssrfGuard('javascript:alert(1)')).rejects.toMatchObject({
      name: 'InvalidUrlError',
    });
  });

  it('throws InvalidUrlError for unresolvable hostname', async () => {
    await expect(
      ssrfGuard('http://this-hostname-does-not-exist-webisight.invalid/')
    ).rejects.toMatchObject({
      name: 'InvalidUrlError',
    });
  });

  it('accepts a valid public URL', async () => {
    // This test makes a real DNS call to example.com
    const result = await ssrfGuard('https://example.com');
    expect(result).toBeInstanceOf(URL);
    expect(result.hostname).toBe('example.com');
  });
});
