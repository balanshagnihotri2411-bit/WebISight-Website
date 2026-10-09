/**
 * CrawlSkill — checks fundamental crawlability and page structure for AI discoverability.
 */
export const name = 'Crawlability';

const SLOW_RESPONSE_MS = 3000;
const MAX_TITLE_LENGTH = 70;
const JS_RENDER_RATIO_THRESHOLD = 0.15; // Fewer than 15% of HTML chars are visible words → probably JS-rendered

/**
 * @param {import('../crawler/crawlResult.js').CrawlResult} crawlResult
 * @returns {Array<import('./index.js').Finding>}
 */
export function run(crawlResult) {
  const findings = [];

  // 1. HTTP Status
  if (crawlResult.statusCode >= 400) {
    findings.push({
      skill: name,
      checkName: 'HTTP Status Code',
      severity: 'CRITICAL',
      passed: false,
      issue: `Page returned HTTP ${crawlResult.statusCode}`,
      evidence: `Status code: ${crawlResult.statusCode} for ${crawlResult.finalUrl}`,
      recommendation:
        'Ensure the page returns HTTP 200. AI crawlers will not index error pages.',
    });
  } else if (crawlResult.statusCode >= 300) {
    findings.push({
      skill: name,
      checkName: 'HTTP Status Code',
      severity: 'MEDIUM',
      passed: false,
      issue: `Page returned HTTP ${crawlResult.statusCode} (redirect)`,
      evidence: `Status code: ${crawlResult.statusCode}, final URL: ${crawlResult.finalUrl}`,
      recommendation:
        'Check that redirects resolve to a canonical URL to avoid crawl budget waste.',
    });
  } else {
    findings.push({
      skill: name,
      checkName: 'HTTP Status Code',
      severity: 'INFO',
      passed: true,
      issue: null,
      evidence: `HTTP ${crawlResult.statusCode} OK`,
      recommendation: null,
    });
  }

  // 2. Robots.txt present
  if (!crawlResult.robotsTxtContent) {
    findings.push({
      skill: name,
      checkName: 'robots.txt Exists',
      severity: 'MEDIUM',
      passed: false,
      issue: 'No robots.txt file found at the site origin',
      evidence: `robots.txt fetch returned status: ${crawlResult.robotsTxtStatus ?? 'network error'}`,
      recommendation:
        'Create a /robots.txt file. Without it, some crawlers may behave unpredictably.',
    });
  } else {
    findings.push({
      skill: name,
      checkName: 'robots.txt Exists',
      severity: 'INFO',
      passed: true,
      issue: null,
      evidence: `robots.txt found (${crawlResult.robotsTxtContent.length} chars)`,
      recommendation: null,
    });
  }

  // 3. Robots.txt allows crawling
  if (crawlResult.robotsTxtContent && !crawlResult.robotsTxtAllowsCrawling) {
    findings.push({
      skill: name,
      checkName: 'robots.txt Allows Crawling',
      severity: 'CRITICAL',
      passed: false,
      issue: 'robots.txt blocks crawling of this page',
      evidence: `Robots check result: disallowed for user-agent WebISight or *`,
      recommendation:
        'Review your robots.txt rules. Blocking crawlers prevents AI assistants from indexing this content.',
    });
  } else {
    findings.push({
      skill: name,
      checkName: 'robots.txt Allows Crawling',
      severity: 'INFO',
      passed: true,
      issue: null,
      evidence: crawlResult.robotsTxtContent
        ? 'robots.txt allows crawling'
        : 'No robots.txt — crawling assumed allowed',
      recommendation: null,
    });
  }

  // 4. Page title present and length
  if (!crawlResult.title) {
    findings.push({
      skill: name,
      checkName: 'Page Title',
      severity: 'HIGH',
      passed: false,
      issue: 'Page has no <title> tag',
      evidence: 'No title element found in <head>',
      recommendation:
        'Add a descriptive <title> tag (50–70 characters). AI assistants use the title to identify and cite pages.',
    });
  } else if (crawlResult.title.length > MAX_TITLE_LENGTH) {
    findings.push({
      skill: name,
      checkName: 'Page Title Length',
      severity: 'LOW',
      passed: false,
      issue: `Title is too long (${crawlResult.title.length} characters, max ${MAX_TITLE_LENGTH})`,
      evidence: `Title: "${crawlResult.title}"`,
      recommendation:
        'Shorten the title to 50–70 characters so it is not truncated in search and AI citations.',
    });
  } else {
    findings.push({
      skill: name,
      checkName: 'Page Title',
      severity: 'INFO',
      passed: true,
      issue: null,
      evidence: `Title: "${crawlResult.title}" (${crawlResult.title.length} chars)`,
      recommendation: null,
    });
  }

  // 5. Likely JS-rendered content detection
  const avgWordLen = 5; // assume average word length
  const estimatedTextChars = crawlResult.visibleWordCount * avgWordLen;
  const htmlRatio = crawlResult.rawHtmlSize > 0
    ? estimatedTextChars / crawlResult.rawHtmlSize
    : 1;

  if (crawlResult.rawHtmlSize > 10_000 && htmlRatio < JS_RENDER_RATIO_THRESHOLD && crawlResult.visibleWordCount < 50) {
    findings.push({
      skill: name,
      checkName: 'JavaScript Rendering Dependency',
      severity: 'HIGH',
      passed: false,
      issue: 'Page appears to rely heavily on client-side JavaScript for content',
      evidence: `Raw HTML: ${crawlResult.rawHtmlSize.toLocaleString()} bytes, visible words: ${crawlResult.visibleWordCount} (ratio: ${(htmlRatio * 100).toFixed(1)}%)`,
      recommendation:
        'Implement Server-Side Rendering (SSR) or static generation so AI crawlers see your actual content without executing JavaScript.',
    });
  } else {
    findings.push({
      skill: name,
      checkName: 'JavaScript Rendering Dependency',
      severity: 'INFO',
      passed: true,
      issue: null,
      evidence: `HTML: ${crawlResult.rawHtmlSize.toLocaleString()} bytes, visible words: ${crawlResult.visibleWordCount}`,
      recommendation: null,
    });
  }

  // 6. Response time
  if (crawlResult.responseTimeMs > SLOW_RESPONSE_MS) {
    findings.push({
      skill: name,
      checkName: 'Response Time',
      severity: 'MEDIUM',
      passed: false,
      issue: `Slow page load: ${crawlResult.responseTimeMs}ms (threshold: ${SLOW_RESPONSE_MS}ms)`,
      evidence: `Time to first byte: ${crawlResult.responseTimeMs}ms`,
      recommendation:
        'Improve server response times. Slow pages may be deprioritized by AI crawlers with strict timeouts.',
    });
  } else {
    findings.push({
      skill: name,
      checkName: 'Response Time',
      severity: 'INFO',
      passed: true,
      issue: null,
      evidence: `Response time: ${crawlResult.responseTimeMs}ms`,
      recommendation: null,
    });
  }

  return findings;
}
