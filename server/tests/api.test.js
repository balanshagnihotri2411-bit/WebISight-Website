import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

// Mock the audit service to avoid real network calls
vi.mock('../src/services/auditService.js', () => ({
  auditWithTimeout: vi.fn(),
}));

// Mock the cache so tests are isolated
vi.mock('../src/utils/cache.js', () => ({
  auditCache: { get: vi.fn(() => undefined), set: vi.fn() },
  normalizeCacheKey: (url) => url,
}));

import { auditWithTimeout } from '../src/services/auditService.js';
import { AuditTimeoutError, AuditFailedError, InvalidUrlError } from '../src/errors/index.js';

const MOCK_REPORT = {
  url: 'https://example.com',
  generatedAt: '2024-01-01T00:00:00.000Z',
  overallScore: 85,
  skillScores: { Crawlability: 85 },
  summary: { totalChecks: 5, passed: 4, failed: 1, critical: 0, high: 1, medium: 0, low: 0 },
  prioritizedActions: [],
  findingsBySkill: {},
};

describe('POST /api/audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with an audit report for a valid URL', async () => {
    auditWithTimeout.mockResolvedValueOnce(MOCK_REPORT);

    const res = await request(app)
      .post('/api/audit')
      .send({ url: 'https://example.com' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ overallScore: 85, url: 'https://example.com' });
  });

  it('returns 400 for a blank url', async () => {
    const res = await request(app).post('/api/audit').send({ url: '' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 for a non-http URL', async () => {
    const res = await request(app).post('/api/audit').send({ url: 'ftp://example.com' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 for a missing url field', async () => {
    const res = await request(app).post('/api/audit').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 for an InvalidUrlError from SSRF guard', async () => {
    auditWithTimeout.mockRejectedValueOnce(
      new InvalidUrlError('Private IP detected')
    );

    const res = await request(app)
      .post('/api/audit')
      .send({ url: 'http://192.168.1.1' });

    // This will be caught by validation first (not a public http url)
    // Actually 192.168.1.1 is valid format — SSRF throws after DNS
    // So the mock will fire here
    // But validation passes format check, then auditWithTimeout throws InvalidUrlError (400)
    expect([400, 400]).toContain(res.status);
  });

  it('returns 504 for AuditTimeoutError', async () => {
    auditWithTimeout.mockRejectedValueOnce(new AuditTimeoutError('Timed out'));

    const res = await request(app)
      .post('/api/audit')
      .send({ url: 'https://slow-site-example.com' });

    expect(res.status).toBe(504);
    expect(res.body.error).toBe('AuditTimeoutError');
  });

  it('returns 502 for AuditFailedError', async () => {
    auditWithTimeout.mockRejectedValueOnce(new AuditFailedError('Connection refused'));

    const res = await request(app)
      .post('/api/audit')
      .send({ url: 'https://broken-site-example.com' });

    expect(res.status).toBe(502);
    expect(res.body.error).toBe('AuditFailedError');
  });
});

describe('GET /api/ping', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/ping');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('GET /health', () => {
  it('returns 200 with healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });
});

describe('Unknown routes', () => {
  it('returns 404 for an unknown route', async () => {
    const res = await request(app).get('/api/unknown-route');
    expect(res.status).toBe(404);
  });
});
