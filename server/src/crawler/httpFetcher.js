import axios from 'axios';
import * as cheerio from 'cheerio';
import robotsParser from 'robots-parser';
import { CrawlResult } from './crawlResult.js';
import { ssrfGuard } from '../utils/ssrfGuard.js';
import { env } from '../config/env.js';

const USER_AGENT = 'WebISight/1.0 (+https://github.com/webisight; AI discoverability audit bot)';
const REQUEST_TIMEOUT_MS = env.AUDIT_TIMEOUT_SECONDS * 1000 * 0.7; // 70% of the overall audit timeout

/**
 * Create an axios instance configured for page fetching.
 */
function makeAxiosInstance(maxBytes) {
  return axios.create({
    timeout: REQUEST_TIMEOUT_MS,
    maxRedirects: 5,
    maxContentLength: maxBytes,
    maxBodyLength: maxBytes,
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    decompress: true,
    responseType: 'text',
  });
}

/**
 * Try to fetch /robots.txt. Never throws — returns null values on failure.
 */
async function fetchRobotsTxt(origin, axiosInstance) {
  const robotsUrl = `${origin}/robots.txt`;
  try {
    const res = await axiosInstance.get(robotsUrl);
    return { content: String(res.data), status: res.status };
  } catch (err) {
    const status = err?.response?.status ?? null;
    return { content: null, status };
  }
}

/**
 * Parse raw HTML with cheerio and extract all audit-relevant fields.
 */
function parseHtml(html, finalUrl) {
  const $ = cheerio.load(html);

  // Remove scripts / styles / noscript for visible text estimation
  const $clone = cheerio.load(html);
  $clone('script, style, noscript, iframe, head').remove();
  const visibleText = $clone('body').text().replace(/\s+/g, ' ').trim();
  const visibleWordCount = visibleText ? visibleText.split(/\s+/).length : 0;

  // Title
  const title = $('title').first().text().trim() || null;

  // Meta description
  const metaDescription =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[name="Description"]').attr('content')?.trim() ||
    null;

  // OpenGraph tags
  const openGraph = {};
  $('meta[property^="og:"]').each((_, el) => {
    const prop = $(el).attr('property');
    const content = $(el).attr('content')?.trim();
    if (prop && content) openGraph[prop] = content;
  });

  // Article times
  const articleModifiedTime =
    $('meta[property="article:modified_time"]').attr('content')?.trim() ||
    $('meta[name="article:modified_time"]').attr('content')?.trim() ||
    null;

  const articlePublishedTime =
    $('meta[property="article:published_time"]').attr('content')?.trim() ||
    $('meta[name="article:published_time"]').attr('content')?.trim() ||
    null;

  // Headings H1/H2/H3
  const headings = [];
  $('h1, h2, h3').each((_, el) => {
    const level = el.tagName.toLowerCase();
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text) headings.push({ level, text });
  });

  // JSON-LD blocks
  const jsonLdBlocks = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html()?.trim() || '';
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // intentionally ignored
    }
    jsonLdBlocks.push({ raw, parsed });
  });

  // Images missing alt text
  const imagesMissingAlt = [];
  $('img').each((_, el) => {
    const alt = $(el).attr('alt');
    if (alt === undefined || alt.trim() === '') {
      const src = $(el).attr('src') || '[no src]';
      // Get contextual parent text
      const context = $(el).closest('figure, div, section, a').first().text().trim().slice(0, 80);
      imagesMissingAlt.push({ src, context });
    }
  });

  // Link count
  const linkCount = $('a[href]').length;

  // Footer text for copyright year detection
  const footerText = $('footer').text().replace(/\s+/g, ' ').trim().slice(0, 500);

  return {
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
    footerText,
  };
}

/**
 * Fetch a page and return a CrawlResult.
 * This is the single network fetch for the entire audit.
 * @param {string} rawUrl
 * @returns {Promise<CrawlResult>}
 */
export async function fetchAndCrawl(rawUrl) {
  // SSRF validation
  await ssrfGuard(rawUrl);

  const maxBytes = env.MAX_RESPONSE_BYTES;
  const http = makeAxiosInstance(maxBytes);

  const startTime = Date.now();
  let response;
  try {
    response = await http.get(rawUrl);
  } catch (err) {
    // If we got a response (4xx/5xx), use it; otherwise rethrow
    if (err?.response) {
      response = err.response;
    } else {
      throw err;
    }
  }

  const responseTimeMs = Date.now() - startTime;
  const finalUrl = response.request?.res?.responseUrl || response.config?.url || rawUrl;
  const statusCode = response.status;
  const rawHtml = String(response.data || '');
  const rawHtmlSize = Buffer.byteLength(rawHtml, 'utf8');

  // SSRF re-check after redirects
  if (finalUrl !== rawUrl) {
    await ssrfGuard(finalUrl);
  }

  // Fetch robots.txt from same origin (non-blocking)
  const origin = new URL(finalUrl).origin;
  const robotsData = await fetchRobotsTxt(origin, http);

  // Check if robots.txt allows our user agent
  let robotsTxtAllowsCrawling = true;
  if (robotsData.content) {
    try {
      const robots = robotsParser(`${origin}/robots.txt`, robotsData.content);
      robotsTxtAllowsCrawling = robots.isAllowed(finalUrl, USER_AGENT) !== false;
    } catch {
      robotsTxtAllowsCrawling = true;
    }
  }

  // Parse HTML
  const parsed = parseHtml(rawHtml, finalUrl);

  return new CrawlResult({
    finalUrl,
    statusCode,
    responseTimeMs,
    rawHtmlSize,
    robotsTxtContent: robotsData.content,
    robotsTxtStatus: robotsData.status,
    robotsTxtAllowsCrawling,
    ...parsed,
  });
}
