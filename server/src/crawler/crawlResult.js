/**
 * CrawlResult — the single data contract passed to every skill.
 * Constructed by httpFetcher after fetching and parsing a page.
 */
export class CrawlResult {
  constructor({
    finalUrl,
    statusCode,
    responseTimeMs,
    rawHtmlSize,
    title,
    metaDescription,
    openGraph,
    articleModifiedTime,
    articlePublishedTime,
    headings,
    jsonLdBlocks,
    imagesMissingAlt,
    visibleWordCount,
    linkCount,
    robotsTxtContent,
    robotsTxtStatus,
    robotsTxtAllowsCrawling,
    footerText,
  }) {
    /** @type {string} */
    this.finalUrl = finalUrl;
    /** @type {number} */
    this.statusCode = statusCode;
    /** @type {number} */
    this.responseTimeMs = responseTimeMs;
    /** @type {number} bytes of raw HTML */
    this.rawHtmlSize = rawHtmlSize;
    /** @type {string|null} */
    this.title = title;
    /** @type {string|null} */
    this.metaDescription = metaDescription;
    /**
     * @type {Record<string, string>}
     * e.g. { 'og:title': '...', 'og:description': '...', 'og:image': '...' }
     */
    this.openGraph = openGraph;
    /** @type {string|null} ISO 8601 */
    this.articleModifiedTime = articleModifiedTime;
    /** @type {string|null} ISO 8601 */
    this.articlePublishedTime = articlePublishedTime;
    /**
     * @type {Array<{ level: 'h1'|'h2'|'h3', text: string }>}
     */
    this.headings = headings;
    /**
     * @type {Array<{ raw: string, parsed: object|null }>}
     */
    this.jsonLdBlocks = jsonLdBlocks;
    /**
     * @type {Array<{ src: string, context: string }>}
     * Images missing alt text (or with empty alt)
     */
    this.imagesMissingAlt = imagesMissingAlt;
    /** @type {number} approximate word count of visible text */
    this.visibleWordCount = visibleWordCount;
    /** @type {number} total anchor tags found */
    this.linkCount = linkCount;
    /** @type {string|null} raw content of /robots.txt */
    this.robotsTxtContent = robotsTxtContent;
    /** @type {number|null} HTTP status of robots.txt fetch */
    this.robotsTxtStatus = robotsTxtStatus;
    /** @type {boolean} whether robots.txt allows the crawling user-agent */
    this.robotsTxtAllowsCrawling = robotsTxtAllowsCrawling;
    /** @type {string} text content of footer element (for copyright year detection) */
    this.footerText = footerText;
  }
}
