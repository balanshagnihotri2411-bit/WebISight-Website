/**
 * SchemaSkill — audits structured data, metadata, and OpenGraph for AI discoverability.
 */
export const name = 'Structured Data';

const HIGH_VALUE_SCHEMA_TYPES = new Set([
  'Organization',
  'WebSite',
  'WebPage',
  'Article',
  'BlogPosting',
  'NewsArticle',
  'Product',
  'FAQPage',
  'HowTo',
  'BreadcrumbList',
  'SiteLinksSearchBox',
]);

const RECOMMENDED_OG_TAGS = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'];

/**
 * Collect all @type values from JSON-LD blocks (handles both single and array forms).
 */
function collectSchemaTypes(jsonLdBlocks) {
  const types = [];
  for (const block of jsonLdBlocks) {
    if (!block.parsed) continue;
    const items = Array.isArray(block.parsed) ? block.parsed : [block.parsed];
    for (const item of items) {
      if (item['@type']) {
        const typeVal = item['@type'];
        if (Array.isArray(typeVal)) types.push(...typeVal);
        else types.push(typeVal);
      }
      // Handle @graph
      if (item['@graph'] && Array.isArray(item['@graph'])) {
        for (const graphItem of item['@graph']) {
          if (graphItem['@type']) {
            const t = graphItem['@type'];
            if (Array.isArray(t)) types.push(...t);
            else types.push(t);
          }
        }
      }
    }
  }
  return types;
}

/**
 * @param {import('../crawler/crawlResult.js').CrawlResult} crawlResult
 * @returns {Array<import('./index.js').Finding>}
 */
export function run(crawlResult) {
  const findings = [];

  // 1. JSON-LD present and parseable
  const hasJsonLd = crawlResult.jsonLdBlocks.length > 0;
  const parseableBlocks = crawlResult.jsonLdBlocks.filter((b) => b.parsed !== null);
  const brokenBlocks = crawlResult.jsonLdBlocks.filter((b) => b.parsed === null);

  if (!hasJsonLd) {
    findings.push({
      skill: name,
      checkName: 'JSON-LD Structured Data',
      severity: 'HIGH',
      passed: false,
      issue: 'No JSON-LD structured data found',
      evidence: 'No <script type="application/ld+json"> blocks detected',
      recommendation:
        'Add JSON-LD structured data (e.g., Organization, WebSite, Article). AI assistants use schema.org markup to understand and cite your content accurately.',
    });
  } else if (brokenBlocks.length > 0) {
    findings.push({
      skill: name,
      checkName: 'JSON-LD Structured Data',
      severity: 'HIGH',
      passed: false,
      issue: `${brokenBlocks.length} JSON-LD block(s) contain invalid JSON`,
      evidence: `Found ${crawlResult.jsonLdBlocks.length} block(s), ${brokenBlocks.length} failed to parse`,
      recommendation:
        'Fix malformed JSON in your JSON-LD blocks. Invalid structured data is ignored by search engines and AI crawlers.',
    });
  } else {
    findings.push({
      skill: name,
      checkName: 'JSON-LD Structured Data',
      severity: 'INFO',
      passed: true,
      issue: null,
      evidence: `${parseableBlocks.length} valid JSON-LD block(s) found`,
      recommendation: null,
    });
  }

  // 2. Schema @type inventory
  const schemaTypes = collectSchemaTypes(crawlResult.jsonLdBlocks);
  const hasOrgOrWebSite = schemaTypes.some(
    (t) => t === 'Organization' || t === 'WebSite'
  );

  if (schemaTypes.length > 0) {
    findings.push({
      skill: name,
      checkName: 'Schema @type Values',
      severity: 'INFO',
      passed: true,
      issue: null,
      evidence: `Schema types detected: ${schemaTypes.join(', ')}`,
      recommendation: null,
    });
  }

  // 3. Organization / WebSite schema
  if (!hasOrgOrWebSite && hasJsonLd) {
    findings.push({
      skill: name,
      checkName: 'Organization or WebSite Schema',
      severity: 'MEDIUM',
      passed: false,
      issue: 'No Organization or WebSite schema type found',
      evidence: `Detected schema types: ${schemaTypes.length > 0 ? schemaTypes.join(', ') : 'none'}`,
      recommendation:
        'Add an Organization and/or WebSite schema block. These help AI assistants understand who owns the site and answer brand-related queries accurately.',
    });
  } else if (hasOrgOrWebSite) {
    findings.push({
      skill: name,
      checkName: 'Organization or WebSite Schema',
      severity: 'INFO',
      passed: true,
      issue: null,
      evidence: `Organization/WebSite schema present (types: ${schemaTypes.join(', ')})`,
      recommendation: null,
    });
  }

  // 4. Meta description
  if (!crawlResult.metaDescription) {
    findings.push({
      skill: name,
      checkName: 'Meta Description',
      severity: 'HIGH',
      passed: false,
      issue: 'No meta description found',
      evidence: 'No <meta name="description"> tag detected',
      recommendation:
        'Add a concise, unique meta description (120–160 characters). AI assistants often use this to summarize pages in answers.',
    });
  } else if (crawlResult.metaDescription.length < 50) {
    findings.push({
      skill: name,
      checkName: 'Meta Description Length',
      severity: 'LOW',
      passed: false,
      issue: `Meta description is too short (${crawlResult.metaDescription.length} chars, recommended: 120–160)`,
      evidence: `Meta description: "${crawlResult.metaDescription}"`,
      recommendation:
        'Expand the meta description to 120–160 characters with a clear value proposition.',
    });
  } else if (crawlResult.metaDescription.length > 320) {
    findings.push({
      skill: name,
      checkName: 'Meta Description Length',
      severity: 'LOW',
      passed: false,
      issue: `Meta description is too long (${crawlResult.metaDescription.length} chars, recommended: ≤160)`,
      evidence: `Meta description: "${crawlResult.metaDescription.slice(0, 100)}..."`,
      recommendation: 'Shorten the meta description to under 160 characters.',
    });
  } else {
    findings.push({
      skill: name,
      checkName: 'Meta Description',
      severity: 'INFO',
      passed: true,
      issue: null,
      evidence: `Meta description: "${crawlResult.metaDescription.slice(0, 80)}..." (${crawlResult.metaDescription.length} chars)`,
      recommendation: null,
    });
  }

  // 5. OpenGraph tags
  const presentOgTags = RECOMMENDED_OG_TAGS.filter((tag) => crawlResult.openGraph[tag]);
  const missingOgTags = RECOMMENDED_OG_TAGS.filter((tag) => !crawlResult.openGraph[tag]);

  if (presentOgTags.length === 0) {
    findings.push({
      skill: name,
      checkName: 'OpenGraph Tags',
      severity: 'MEDIUM',
      passed: false,
      issue: 'No OpenGraph tags found',
      evidence: 'None of the recommended og: meta tags are present',
      recommendation:
        'Add OpenGraph tags (og:title, og:description, og:image, og:url, og:type). These are used by AI crawlers and social platforms to understand and preview your content.',
    });
  } else if (missingOgTags.length > 0) {
    findings.push({
      skill: name,
      checkName: 'OpenGraph Tags',
      severity: 'LOW',
      passed: false,
      issue: `Missing ${missingOgTags.length} recommended OpenGraph tag(s): ${missingOgTags.join(', ')}`,
      evidence: `Present: ${presentOgTags.join(', ')}`,
      recommendation: `Add the missing OpenGraph tags: ${missingOgTags.join(', ')}.`,
    });
  } else {
    findings.push({
      skill: name,
      checkName: 'OpenGraph Tags',
      severity: 'INFO',
      passed: true,
      issue: null,
      evidence: `All recommended OpenGraph tags present: ${presentOgTags.join(', ')}`,
      recommendation: null,
    });
  }

  return findings;
}
