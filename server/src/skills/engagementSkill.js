/**
 * EngagementSkill — audits content structure, accessibility, and readability for AI discoverability.
 */
export const name = 'Content Quality';

const MIN_WORD_COUNT = 300;
const THIN_WORD_COUNT = 150;
const HIGH_LINK_DENSITY_RATIO = 0.08; // links-per-word ratio above 8% is suspicious
const LONG_CONTENT_NO_H2_THRESHOLD = 600; // words before requiring H2 subheadings
const MAX_MISSING_ALT_IMAGES = 3;

/**
 * @param {import('../crawler/crawlResult.js').CrawlResult} crawlResult
 * @returns {Array<import('./index.js').Finding>}
 */
export function run(crawlResult) {
  const findings = [];

  // 1. Exactly one clear H1
  const h1s = crawlResult.headings.filter((h) => h.level === 'h1');

  if (h1s.length === 0) {
    findings.push({
      skill: name,
      checkName: 'H1 Heading Presence',
      severity: 'HIGH',
      passed: false,
      issue: 'No H1 heading found on the page',
      evidence: 'No <h1> element detected',
      recommendation:
        'Add a single, descriptive H1 heading. It is the primary signal AI systems use to understand the page topic.',
    });
  } else if (h1s.length > 1) {
    findings.push({
      skill: name,
      checkName: 'H1 Heading Uniqueness',
      severity: 'MEDIUM',
      passed: false,
      issue: `Multiple H1 headings found (${h1s.length})`,
      evidence: `H1s: ${h1s.map((h) => `"${h.text}"`).join(', ')}`,
      recommendation:
        'Use exactly one H1 per page. Multiple H1s confuse AI systems about the primary topic of the page.',
    });
  } else {
    findings.push({
      skill: name,
      checkName: 'H1 Heading Presence',
      severity: 'INFO',
      passed: true,
      issue: null,
      evidence: `Single H1 found: "${h1s[0].text}"`,
      recommendation: null,
    });
  }

  // 2. Long content without H2 subheadings
  const h2s = crawlResult.headings.filter((h) => h.level === 'h2');

  if (crawlResult.visibleWordCount >= LONG_CONTENT_NO_H2_THRESHOLD && h2s.length === 0) {
    findings.push({
      skill: name,
      checkName: 'H2 Subheadings for Long Content',
      severity: 'MEDIUM',
      passed: false,
      issue: `Long content (${crawlResult.visibleWordCount} words) with no H2 subheadings`,
      evidence: `Word count: ${crawlResult.visibleWordCount}, H2 count: 0`,
      recommendation:
        'Break long content into sections with descriptive H2 headings. AI assistants use heading structure to extract and cite specific sections of your content.',
    });
  } else if (crawlResult.visibleWordCount >= LONG_CONTENT_NO_H2_THRESHOLD) {
    findings.push({
      skill: name,
      checkName: 'H2 Subheadings for Long Content',
      severity: 'INFO',
      passed: true,
      issue: null,
      evidence: `${h2s.length} H2 subheading(s) found for ${crawlResult.visibleWordCount} words of content`,
      recommendation: null,
    });
  } else {
    findings.push({
      skill: name,
      checkName: 'H2 Subheadings for Long Content',
      severity: 'INFO',
      passed: true,
      issue: null,
      evidence: `Content length (${crawlResult.visibleWordCount} words) below H2 threshold`,
      recommendation: null,
    });
  }

  // 3. Images missing alt text
  const missingCount = crawlResult.imagesMissingAlt.length;
  if (missingCount > MAX_MISSING_ALT_IMAGES) {
    findings.push({
      skill: name,
      checkName: 'Image Alt Text',
      severity: 'MEDIUM',
      passed: false,
      issue: `${missingCount} image(s) are missing alt text`,
      evidence: `First few offenders: ${crawlResult.imagesMissingAlt
        .slice(0, 3)
        .map((img) => img.src)
        .join(', ')}`,
      recommendation:
        'Add descriptive alt attributes to all images. Alt text helps AI assistants understand visual content and improves accessibility for screen readers.',
    });
  } else if (missingCount > 0) {
    findings.push({
      skill: name,
      checkName: 'Image Alt Text',
      severity: 'LOW',
      passed: false,
      issue: `${missingCount} image(s) are missing alt text`,
      evidence: `Images without alt: ${crawlResult.imagesMissingAlt
        .map((img) => img.src)
        .join(', ')}`,
      recommendation: 'Add descriptive alt attributes to the images listed in evidence.',
    });
  } else {
    findings.push({
      skill: name,
      checkName: 'Image Alt Text',
      severity: 'INFO',
      passed: true,
      issue: null,
      evidence: 'All images have alt text (or no images on page)',
      recommendation: null,
    });
  }

  // 4. Thin content
  if (crawlResult.visibleWordCount < THIN_WORD_COUNT) {
    findings.push({
      skill: name,
      checkName: 'Content Depth',
      severity: 'HIGH',
      passed: false,
      issue: `Very thin content: only ${crawlResult.visibleWordCount} visible words`,
      evidence: `Word count: ${crawlResult.visibleWordCount} (threshold for thin content: ${THIN_WORD_COUNT})`,
      recommendation:
        'Expand page content to at least 300 words with substantive, unique information. Thin pages are rarely cited by AI assistants.',
    });
  } else if (crawlResult.visibleWordCount < MIN_WORD_COUNT) {
    findings.push({
      skill: name,
      checkName: 'Content Depth',
      severity: 'MEDIUM',
      passed: false,
      issue: `Below recommended content length: ${crawlResult.visibleWordCount} words (recommended: ${MIN_WORD_COUNT}+)`,
      evidence: `Word count: ${crawlResult.visibleWordCount}`,
      recommendation:
        'Consider adding more substantive content. AI assistants are more likely to cite comprehensive, in-depth pages.',
    });
  } else {
    findings.push({
      skill: name,
      checkName: 'Content Depth',
      severity: 'INFO',
      passed: true,
      issue: null,
      evidence: `Sufficient content depth: ${crawlResult.visibleWordCount} words`,
      recommendation: null,
    });
  }

  // 5. High link density
  if (crawlResult.visibleWordCount > 0) {
    const linkDensity = crawlResult.linkCount / crawlResult.visibleWordCount;
    if (linkDensity > HIGH_LINK_DENSITY_RATIO) {
      findings.push({
        skill: name,
        checkName: 'Link Density',
        severity: 'LOW',
        passed: false,
        issue: `High link density: ${crawlResult.linkCount} links for ${crawlResult.visibleWordCount} words (ratio: ${(linkDensity * 100).toFixed(1)}%)`,
        evidence: `Link density: ${(linkDensity * 100).toFixed(1)}% (threshold: ${HIGH_LINK_DENSITY_RATIO * 100}%)`,
        recommendation:
          'Reduce the ratio of links to content. Excessive links may signal low-quality content to AI evaluation systems.',
      });
    } else {
      findings.push({
        skill: name,
        checkName: 'Link Density',
        severity: 'INFO',
        passed: true,
        issue: null,
        evidence: `Link density: ${(linkDensity * 100).toFixed(1)}% (${crawlResult.linkCount} links, ${crawlResult.visibleWordCount} words)`,
        recommendation: null,
      });
    }
  }

  return findings;
}
