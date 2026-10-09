import { describe, it, expect } from 'vitest';
import { run, name } from '../src/skills/engagementSkill.js';
import { CrawlResult } from '../src/crawler/crawlResult.js';

function makeCrawl(overrides = {}) {
  return new CrawlResult({
    finalUrl: 'https://example.com',
    statusCode: 200,
    responseTimeMs: 500,
    rawHtmlSize: 30_000,
    title: 'Example',
    metaDescription: 'Good description.',
    openGraph: {},
    articleModifiedTime: null,
    articlePublishedTime: null,
    headings: [
      { level: 'h1', text: 'Main Heading' },
      { level: 'h2', text: 'Section One' },
      { level: 'h2', text: 'Section Two' },
    ],
    jsonLdBlocks: [],
    imagesMissingAlt: [],
    visibleWordCount: 500,
    linkCount: 20,
    robotsTxtContent: null,
    robotsTxtStatus: 404,
    robotsTxtAllowsCrawling: true,
    footerText: '',
    ...overrides,
  });
}

describe(`${name} skill`, () => {
  it('passes all checks for a well-structured page', () => {
    const findings = run(makeCrawl());
    const failed = findings.filter((f) => !f.passed);
    expect(failed).toHaveLength(0);
  });

  it('flags HIGH when no H1 is present', () => {
    const findings = run(makeCrawl({ headings: [] }));
    const finding = findings.find((f) => f.checkName === 'H1 Heading Presence');
    expect(finding.passed).toBe(false);
    expect(finding.severity).toBe('HIGH');
  });

  it('flags MEDIUM when multiple H1s are present', () => {
    const findings = run(
      makeCrawl({
        headings: [
          { level: 'h1', text: 'First H1' },
          { level: 'h1', text: 'Second H1' },
        ],
      })
    );
    const finding = findings.find((f) => f.checkName === 'H1 Heading Uniqueness');
    expect(finding.passed).toBe(false);
    expect(finding.severity).toBe('MEDIUM');
  });

  it('flags MEDIUM for long content without H2', () => {
    const findings = run(
      makeCrawl({
        headings: [{ level: 'h1', text: 'Only H1' }],
        visibleWordCount: 700,
      })
    );
    const finding = findings.find((f) => f.checkName === 'H2 Subheadings for Long Content');
    expect(finding.passed).toBe(false);
    expect(finding.severity).toBe('MEDIUM');
  });

  it('flags MEDIUM for many images without alt text', () => {
    const images = Array.from({ length: 5 }, (_, i) => ({
      src: `img${i}.jpg`,
      context: '',
    }));
    const findings = run(makeCrawl({ imagesMissingAlt: images }));
    const finding = findings.find((f) => f.checkName === 'Image Alt Text');
    expect(finding.passed).toBe(false);
    expect(finding.severity).toBe('MEDIUM');
  });

  it('flags HIGH for very thin content', () => {
    const findings = run(makeCrawl({ visibleWordCount: 50 }));
    const finding = findings.find((f) => f.checkName === 'Content Depth');
    expect(finding.passed).toBe(false);
    expect(finding.severity).toBe('HIGH');
  });

  it('flags LOW for high link density', () => {
    const findings = run(
      makeCrawl({ visibleWordCount: 100, linkCount: 20 })
    );
    const finding = findings.find((f) => f.checkName === 'Link Density');
    expect(finding.passed).toBe(false);
    expect(finding.severity).toBe('LOW');
  });
});
