# 👁️ WebISight — Website Readiness & AI Discoverability Analyzer

> **Can AI assistants find, understand, cite, and represent your website accurately?**
> 
> WebISight crawls your page once, runs multiple audit "skills" against the same crawl result, scores it, and returns a prioritized, evidence-backed report.

![Node.js](https://img.shields.io/badge/Node.js-20+-brightgreen)
![Express](https://img.shields.io/badge/Express-4.x-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![Vite](https://img.shields.io/badge/Vite-5-purple)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Table of Contents

- [Features](#features)
- [Architecture Overview](#architecture-overview)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Audit Skills](#audit-skills)
- [Adding a New Skill](#adding-a-new-skill)
- [Testing](#testing)
- [Docker Deployment](#docker-deployment)
- [Why No Database?](#why-no-database)

---

## Features

- 🕷️ **Single-fetch crawl** — fetches the target URL exactly once; all skills share the same data
- 🤖 **4 audit skills** — Crawlability, Structured Data, Freshness, Content Quality
- 🛡️ **SSRF protection** — DNS resolves every hostname and blocks private/reserved IP ranges
- ⚡ **In-memory caching** — avoids re-crawling the same site within a configurable TTL
- 🎯 **Prioritized report** — failing findings sorted worst-first with evidence and recommendations
- 📊 **Score rings** — 0–100 per-skill scores with an overall average
- 💾 **Download / Upload** — save reports as JSON; reload and view them later
- 🕘 **Recent audits** — last 5 audits stored in browser localStorage only
- 🔒 **Rate limiting** — configurable req/min per IP; helmet security headers
- 🐳 **Docker-ready** — multi-stage build, non-root user, health check

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                  React Client (Vite)                  │
│  UrlForm → ScoreRing → SummaryChips → PrioritizedActs│
│  FindingsBySkill → DownloadButton → RecentAudits      │
└───────────────────┬──────────────────────────────────┘
                    │ POST /api/audit
                    ▼
┌──────────────────────────────────────────────────────┐
│                Express API Server                     │
│                                                       │
│  validateAuditBody (Zod) → auditRateLimit            │
│  → auditController → auditService (timeout)          │
│  → auditOrchestrator                                  │
│       │                                               │
│       ├─→ httpFetcher (single fetch + SSRF guard)     │
│       │        └─→ CrawlResult                        │
│       │                                               │
│       └─→ Skills (auto-loaded, run in parallel)       │
│             ├─ CrawlSkill                             │
│             ├─ SchemaSkill                            │
│             ├─ FreshnessSkill                         │
│             └─ EngagementSkill                        │
│       │                                               │
│       └─→ reportGenerator → AuditReport JSON         │
└──────────────────────────────────────────────────────┘
```

**Data flow:** The orchestrator fetches the page once → passes a single `CrawlResult` to all skills → skills return `Finding[]` → report generator scores and sorts them → JSON returned to client.

---

## Quick Start

### Prerequisites

- Node.js 20+
- npm 9+

### Development (two terminals)

```bash
# Terminal 1 — start the Express API server
cd server
npm install
npm run dev    # listens on http://localhost:3001

# Terminal 2 — start the React dev server
cd client
npm install
npm run dev    # listens on http://localhost:5173 (proxies /api → :3001)
```

Open **http://localhost:5173** in your browser.

### Production (single process)

```bash
# Build the client
cd client && npm run build

# Start the server (serves built client too)
cd ../server && NODE_ENV=production npm start
```

Open **http://localhost:3001**.

---

## Environment Variables

All variables are configured in `server/.env` (copy from `.env.example`):

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Express listen port |
| `AUDIT_TIMEOUT_SECONDS` | `30` | Hard timeout for a full audit |
| `RATE_LIMIT_PER_MINUTE` | `20` | Max audit requests per IP per minute |
| `MAX_RESPONSE_BYTES` | `5242880` | Max response body size to fetch (5 MB) |
| `CACHE_TTL_SECONDS` | `300` | In-memory cache TTL (5 minutes) |
| `NODE_ENV` | `development` | Set to `production` in Docker |
| `CLIENT_URL` | `http://localhost:5173` | CORS origin in development |

---

## API Documentation

### `POST /api/audit`

Run an AI discoverability audit on a public URL.

**Request body:**
```json
{ "url": "https://example.com" }
```

**Validations:**
- `url` must not be blank
- Must start with `http://` or `https://`
- Hostname must resolve to a public IP (SSRF protection)

**Success (200):**
```json
{
  "url": "https://example.com",
  "generatedAt": "2024-01-15T12:00:00.000Z",
  "overallScore": 72,
  "skillScores": {
    "Crawlability": 90,
    "Structured Data": 60,
    "Freshness": 80,
    "Content Quality": 60
  },
  "summary": {
    "totalChecks": 18,
    "passed": 12,
    "failed": 6,
    "critical": 0,
    "high": 2,
    "medium": 3,
    "low": 1
  },
  "prioritizedActions": [
    {
      "skill": "Structured Data",
      "checkName": "JSON-LD Structured Data",
      "severity": "HIGH",
      "passed": false,
      "issue": "No JSON-LD structured data found",
      "evidence": "No <script type=\"application/ld+json\"> blocks detected",
      "recommendation": "Add JSON-LD structured data..."
    }
  ],
  "findingsBySkill": {
    "Crawlability": [ /* Finding[] */ ],
    "Structured Data": [ /* Finding[] */ ]
  }
}
```

**Error responses:**

| Status | When |
|---|---|
| `400 Bad Request` | Invalid or blank URL, SSRF-blocked IP |
| `429 Too Many Requests` | Rate limit exceeded |
| `502 Bad Gateway` | Target site unreachable or parse failure |
| `504 Gateway Timeout` | Audit exceeded the timeout |

### `GET /api/ping`

```json
{ "status": "ok", "timestamp": "2024-01-15T12:00:00.000Z" }
```

### `GET /health`

```json
{
  "status": "healthy",
  "uptime": 12345.6,
  "timestamp": "2024-01-15T12:00:00.000Z",
  "version": "1.0.0"
}
```

---

## Audit Skills

Each skill starts at **100** and subtracts weighted penalties for each failing finding:

| Severity | Penalty |
|---|---|
| CRITICAL | −30 |
| HIGH | −20 |
| MEDIUM | −10 |
| LOW | −5 |
| INFO | 0 |

The **overall score** is the average of all skill scores.

### Crawlability
Checks: HTTP status, robots.txt exists, robots.txt allows crawling, page title, JS rendering detection, response time.

### Structured Data
Checks: JSON-LD present and parseable, schema @type values, Organization/WebSite schema, meta description, OpenGraph tags.

### Freshness
Checks: article:modified_time / published_time present, content age, stale copyright year in footer, stale year references in headings.

### Content Quality
Checks: exactly one H1, H2 subheadings for long content, image alt text, content word count (thin content), link density.

---

## Adding a New Skill

Adding a skill requires **only one file** — no central registry:

1. Create `server/src/skills/mySkill.js`:

```js
export const name = 'My Skill Name';

export function run(crawlResult) {
  const findings = [];

  // Your logic here...
  findings.push({
    skill: name,
    checkName: 'My Check',
    severity: 'HIGH',           // CRITICAL | HIGH | MEDIUM | LOW | INFO
    passed: false,
    issue: 'Describe the problem',
    evidence: 'Supporting data from crawlResult',
    recommendation: 'Actionable fix',
  });

  return findings;
}
```

2. That's it! The `skills/index.js` auto-loader picks up all `*Skill.js` files automatically.

---

## Testing

```bash
cd server
npm test              # run all tests once
npm run test:watch    # watch mode
npm run test:coverage # with coverage report
```

**Test coverage:**
- Unit tests for each skill with fixture `CrawlResult` objects (no network)
- Unit tests for the report generator (scoring, ordering)
- Unit tests for the SSRF guard
- API integration tests with Supertest + mocked audit service (no network)

---

## Docker Deployment

### Build and run with Docker Compose

```bash
docker compose up --build
```

The app will be available at **http://localhost:3001**.

### Manual Docker build

```bash
docker build -t webisight .
docker run -p 3001:3001 \
  -e NODE_ENV=production \
  -e AUDIT_TIMEOUT_SECONDS=30 \
  webisight
```

The Dockerfile uses a **multi-stage build**:
1. **`client-builder`** — builds the React app with Vite
2. **`server-deps`** — installs production-only server dependencies
3. **`production`** — combines both into a minimal Alpine image; runs as a non-root user (`webisight`)

---

## Why No Database?

WebISight is **intentionally database-free** and fully stateless on the server:

- **Audits are ephemeral** — each request fetches and analyzes a URL in real-time; results don't need to persist
- **Privacy by design** — no audit history is stored server-side; users control their data locally
- **Zero operational overhead** — no database to provision, back up, migrate, or secure
- **Horizontal scaling** — stateless servers can be replicated freely behind a load balancer
- **Optional cache** — a TTL in-memory `Map` avoids re-crawling the same URL within 5 minutes; it's intentionally lost on restart
- **Client-side history** — the last 5 audits are stored in browser `localStorage` only
- **Portable reports** — the "Download JSON" feature lets users archive results themselves

---

## Project Structure

```
project87/
├── server/
│   ├── src/
│   │   ├── app.js                    # Express app setup
│   │   ├── server.js                 # Entry point
│   │   ├── config/env.js             # Environment config
│   │   ├── routes/audit.js           # API routes
│   │   ├── controllers/auditController.js
│   │   ├── services/auditService.js  # Timeout wrapper
│   │   ├── orchestrator/auditOrchestrator.js
│   │   ├── crawler/
│   │   │   ├── httpFetcher.js        # Single-fetch crawler
│   │   │   └── crawlResult.js        # Data contract
│   │   ├── skills/
│   │   │   ├── index.js              # Auto-loader
│   │   │   ├── crawlSkill.js
│   │   │   ├── schemaSkill.js
│   │   │   ├── freshnessSkill.js
│   │   │   └── engagementSkill.js
│   │   ├── report/reportGenerator.js
│   │   ├── middleware/
│   │   │   ├── rateLimit.js
│   │   │   ├── validate.js
│   │   │   └── errorHandler.js
│   │   ├── utils/
│   │   │   ├── ssrfGuard.js
│   │   │   └── cache.js
│   │   └── errors/index.js
│   ├── tests/                        # 45 tests across 6 test files
│   └── package.json
│
├── client/
│   ├── src/
│   │   ├── App.jsx                   # Root component
│   │   ├── api.js                    # API client
│   │   ├── index.css                 # Design system
│   │   └── components/
│   │       ├── UrlForm.jsx
│   │       ├── ScoreRing.jsx
│   │       ├── SummaryChips.jsx
│   │       ├── PrioritizedActions.jsx
│   │       ├── FindingsBySkill.jsx
│   │       ├── DownloadButton.jsx
│   │       └── RecentAudits.jsx
│   └── vite.config.js
│
├── Dockerfile                        # Multi-stage build
├── docker-compose.yml
└── README.md
```
