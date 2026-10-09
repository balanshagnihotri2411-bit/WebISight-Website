import { describe, it, expect } from 'vitest';
import { run, name } from '../src/skills/schemaSkill.js';
import { CrawlResult } from '../src/crawler/crawlResult.js';

function makeCrawl(overrides = {}) {
  return new CrawlResult({
    finalUrl: 'https://example.com',
    statusCode: 200,
    responseTimeMs: 500,
    rawHtmlSize: 30_000,
    title: 'Example',
    metaDescription: 'A well-written meta description that is the right length for SEO.',
    openGraph: {
      'og:title': 'Example',
      'og:description': 'Great site',
      'og:image': 'https://example.com/img.png',
      'og:url': 'https://example.com',
      'og:type': 'website',
    },
    articleModifiedTime: null,
    articlePublishedTime: null,
    headings: [],
    jsonLdBlocks: [
      {
        raw: '{"@context":"https://schema.org","@type":"Organization","name":"Example Corp"}',
        parsed: { '@context': 'https://schema.org', '@type': 'Organization', name: 'Example Corp' },
      },
    ],
    imagesMissingAlt: [],
    visibleWordCount: 500,
    linkCount: 20,
    robotsTxtContent: 'User-agent: *\nAllow: /',
    robotsTxtStatus: 200,
    robotsTxtAllowsCrawling: true,
    footerText: '',
    ...overrides,
  });
}

describe(`${name} skill`, () => {
  it('passes all checks for a fully equipped page', () => {
    const findings = run(makeCrawl());
    const failed = findings.filter((f) => !f.passed);
    expect(failed).toHaveLength(0);
  });

  it('flags HIGH when no JSON-LD is present', () => {
    const findings = run(makeCrawl({ jsonLdBlocks: [] }));
    const finding = findings.find((f) => f.checkName === 'JSON-LD Structured Data');
    expect(finding.passed).toBe(false);
    expect(finding.severity).toBe('HIGH');
  });

  it('flags HIGH when JSON-LD is malformed', () => {
    const findings = run(
      makeCrawl({
        jsonLdBlocks: [{ raw: '{ broken json }', parsed: null }],
      })
    );
    const finding = findings.find((f) => f.checkName === 'JSON-LD Structured Data');
    expect(finding.passed).toBe(false);
    expect(finding.severity).toBe('HIGH');
  });

  it('flags MEDIUM when Organization/WebSite schema is missing', () => {
    const findings = run(
      makeCrawl({
        jsonLdBlocks: [
          {
            raw: '{"@type":"Article"}',
            parsed: { '@type': 'Article' },
          },
        ],
      })
    );
    const finding = findings.find((f) => f.checkName === 'Organization or WebSite Schema');
    expect(finding.passed).toBe(false);
    expect(finding.severity).toBe('MEDIUM');
  });

  it('flags HIGH for missing meta description', () => {
    const findings = run(makeCrawl({ metaDescription: null }));
    const finding = findings.find((f) => f.checkName === 'Meta Description');
    expect(finding.passed).toBe(false);
    expect(finding.severity).toBe('HIGH');
  });

  it('flags MEDIUM for missing OpenGraph tags', () => {
    const findings = run(makeCrawl({ openGraph: {} }));
    const finding = findings.find((f) => f.checkName === 'OpenGraph Tags');
    expect(finding.passed).toBe(false);
    expect(finding.severity).toBe('MEDIUM');
  });

  it('detects schema types in @graph', () => {
    const findings = run(
      makeCrawl({
        jsonLdBlocks: [
          {
            raw: '{"@graph":[{"@type":"WebSite"}]}',
            parsed: { '@graph': [{ '@type': 'WebSite' }] },
          },
        ],
      })
    );
    const orgFinding = findings.find((f) => f.checkName === 'Organization or WebSite Schema');
    expect(orgFinding.passed).toBe(true);
  });
});
