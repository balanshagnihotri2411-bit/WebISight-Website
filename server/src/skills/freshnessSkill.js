/**
 * FreshnessSkill — checks content freshness signals for AI discoverability.
 * AI assistants prefer and trust recent, up-to-date content.
 */
export const name = 'Freshness';

const STALE_AGE_MONTHS = 18; // content not updated in 18 months is considered stale
const CURRENT_YEAR = new Date().getFullYear();

/**
 * Parse an ISO 8601 date string and return a Date or null.
 */
function parseDate(str) {
  if (!str) return null;
  try {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/**
 * Extract all 4-digit years found in a string.
 */
function extractYears(text) {
  const matches = text.match(/\b(19|20)\d{2}\b/g) || [];
  return [...new Set(matches.map(Number))];
}

/**
 * @param {import('../crawler/crawlResult.js').CrawlResult} crawlResult
 * @returns {Array<import('./index.js').Finding>}
 */
export function run(crawlResult) {
  const findings = [];

  // 1. article:modified_time / published_time
  const modifiedDate = parseDate(crawlResult.articleModifiedTime);
  const publishedDate = parseDate(crawlResult.articlePublishedTime);
  const primaryDate = modifiedDate || publishedDate;

  if (!primaryDate) {
    findings.push({
      skill: name,
      checkName: 'Publication / Modification Date',
      severity: 'MEDIUM',
      passed: false,
      issue: 'No article:modified_time or article:published_time meta tag found',
      evidence: 'Neither article:modified_time nor article:published_time detected in meta tags',
      recommendation:
        'Add <meta property="article:modified_time" content="..."> and <meta property="article:published_time" content="...">. AI assistants use these to judge content freshness and may deprioritize undated content.',
    });
  } else {
    const ageMs = Date.now() - primaryDate.getTime();
    const ageMonths = ageMs / (1000 * 60 * 60 * 24 * 30);

    if (ageMonths > STALE_AGE_MONTHS) {
      findings.push({
        skill: name,
        checkName: 'Publication / Modification Date',
        severity: 'MEDIUM',
        passed: false,
        issue: `Content was last modified ${Math.round(ageMonths)} months ago (threshold: ${STALE_AGE_MONTHS} months)`,
        evidence: modifiedDate
          ? `article:modified_time: ${crawlResult.articleModifiedTime}`
          : `article:published_time: ${crawlResult.articlePublishedTime}`,
        recommendation:
          'Update the page content and set article:modified_time to the current date. AI assistants favour recently updated content.',
      });
    } else {
      findings.push({
        skill: name,
        checkName: 'Publication / Modification Date',
        severity: 'INFO',
        passed: true,
        issue: null,
        evidence: modifiedDate
          ? `Last modified: ${crawlResult.articleModifiedTime} (${Math.round(ageMonths)} months ago)`
          : `Published: ${crawlResult.articlePublishedTime} (${Math.round(ageMonths)} months ago)`,
        recommendation: null,
      });
    }
  }

  // 2. Stale copyright year in footer
  if (crawlResult.footerText) {
    const footerYears = extractYears(crawlResult.footerText);
    const copyrightPattern = /©|copyright|©/i;
    if (copyrightPattern.test(crawlResult.footerText) && footerYears.length > 0) {
      const maxYear = Math.max(...footerYears);
      if (maxYear < CURRENT_YEAR - 1) {
        findings.push({
          skill: name,
          checkName: 'Copyright Year',
          severity: 'LOW',
          passed: false,
          issue: `Footer copyright year appears stale (shows ${maxYear}, current year is ${CURRENT_YEAR})`,
          evidence: `Footer excerpt: "${crawlResult.footerText.slice(0, 150)}"`,
          recommendation:
            `Update the copyright year to ${CURRENT_YEAR} or use a dynamic year range (e.g., "© 2020–${CURRENT_YEAR}"). Stale copyright years signal neglected content to AI systems.`,
        });
      } else {
        findings.push({
          skill: name,
          checkName: 'Copyright Year',
          severity: 'INFO',
          passed: true,
          issue: null,
          evidence: `Footer copyright year ${maxYear} appears current`,
          recommendation: null,
        });
      }
    } else {
      findings.push({
        skill: name,
        checkName: 'Copyright Year',
        severity: 'INFO',
        passed: true,
        issue: null,
        evidence: 'No copyright notice detected in footer (or no footer)',
        recommendation: null,
      });
    }
  } else {
    findings.push({
      skill: name,
      checkName: 'Copyright Year',
      severity: 'INFO',
      passed: true,
      issue: null,
      evidence: 'No footer element found',
      recommendation: null,
    });
  }

  // 3. Multiple stale year references in H1/H2 headings
  const headingText = crawlResult.headings
    .filter((h) => h.level === 'h1' || h.level === 'h2')
    .map((h) => h.text)
    .join(' ');

  if (headingText) {
    const headingYears = extractYears(headingText);
    const staleHeadingYears = headingYears.filter((y) => y < CURRENT_YEAR - 1);

    if (staleHeadingYears.length >= 2) {
      findings.push({
        skill: name,
        checkName: 'Year References in Headings',
        severity: 'LOW',
        passed: false,
        issue: `Multiple stale year references found in headings: ${staleHeadingYears.join(', ')}`,
        evidence: `Headings containing years: ${crawlResult.headings
          .filter((h) => (h.level === 'h1' || h.level === 'h2') && /\b(19|20)\d{2}\b/.test(h.text))
          .map((h) => `"${h.text}"`)
          .join('; ')}`,
        recommendation:
          'Update or remove year-specific headings that are now stale. Outdated section titles can signal to AI that the content is no longer relevant.',
      });
    } else {
      findings.push({
        skill: name,
        checkName: 'Year References in Headings',
        severity: 'INFO',
        passed: true,
        issue: null,
        evidence:
          staleHeadingYears.length === 1
            ? `One stale year reference in headings (${staleHeadingYears[0]}), below threshold`
            : 'No stale year references in headings',
        recommendation: null,
      });
    }
  }

  return findings;
}
