import { describe, it, expect } from 'vitest';
import { run, name } from '../src/skills/crawlSkill.js';
import { CrawlResult } from '../src/crawler/crawlResult.js';

/** Helper: build a minimal CrawlResult with overrides */
function makeCrawl(overrides = {}) {
  return new CrawlResult({
    finalUrl: 'https://example.com',
    statusCode: 200,
    responseTimeMs: 500,
    rawHtmlSize: 50_000,
    title: 'Example Title',
    metaDescription: 'A good description here.',
    openGraph: {},
    articleModifiedTime: null,
    articlePublishedTime: null,
    headings: [{ level: 'h1', text: 'Hello World' }],
    jsonLdBlocks: [],
    imagesMissingAlt: [],
    visibleWordCount: 800,
    linkCount: 20,
    robotsTxtContent: 'User-agent: *\nAllow: /',
    robotsTxtStatus: 200,
    robotsTxtAllowsCrawling: true,
    footerText: '',
    ...overrides,
  });
}

describe(`${name} skill`, () => {
  it('passes all checks for a healthy page', () => {
    const findings = run(makeCrawl());
    const failed = findings.filter((f) => !f.passed);
    expect(failed).toHaveLength(0);
  });

  it('flags CRITICAL for HTTP 404 status', () => {
    const findings = run(makeCrawl({ statusCode: 404 }));
    const httpFinding = findings.find((f) => f.checkName === 'HTTP Status Code');
    expect(httpFinding.passed).toBe(false);
    expect(httpFinding.severity).toBe('CRITICAL');
  });

  it('flags MEDIUM for missing robots.txt', () => {
    const findings = run(
      makeCrawl({ robotsTxtContent: null, robotsTxtStatus: 404 })
    );
    const robotsFinding = findings.find((f) => f.checkName === 'robots.txt Exists');
    expect(robotsFinding.passed).toBe(false);
    expect(robotsFinding.severity).toBe('MEDIUM');
  });

  it('flags CRITICAL when robots.txt blocks crawling', () => {
    const findings = run(
      makeCrawl({
        robotsTxtContent: 'User-agent: *\nDisallow: /',
        robotsTxtAllowsCrawling: false,
      })
    );
    const robotsFinding = findings.find((f) => f.checkName === 'robots.txt Allows Crawling');
    expect(robotsFinding.passed).toBe(false);
    expect(robotsFinding.severity).toBe('CRITICAL');
  });

  it('flags HIGH for missing title', () => {
    const findings = run(makeCrawl({ title: null }));
    const titleFinding = findings.find((f) => f.checkName === 'Page Title');
    expect(titleFinding.passed).toBe(false);
    expect(titleFinding.severity).toBe('HIGH');
  });

  it('flags LOW for too-long title', () => {
    const findings = run(makeCrawl({ title: 'A'.repeat(80) }));
    const titleFinding = findings.find((f) => f.checkName === 'Page Title Length');
    expect(titleFinding.passed).toBe(false);
    expect(titleFinding.severity).toBe('LOW');
  });

  it('flags HIGH for JS-rendered content', () => {
    const findings = run(
      makeCrawl({
        rawHtmlSize: 200_000,
        visibleWordCount: 5,
      })
    );
    const jsFinding = findings.find((f) => f.checkName === 'JavaScript Rendering Dependency');
    expect(jsFinding.passed).toBe(false);
    expect(jsFinding.severity).toBe('HIGH');
  });

  it('flags MEDIUM for slow response', () => {
    const findings = run(makeCrawl({ responseTimeMs: 5000 }));
    const timeFinding = findings.find((f) => f.checkName === 'Response Time');
    expect(timeFinding.passed).toBe(false);
    expect(timeFinding.severity).toBe('MEDIUM');
  });
});
