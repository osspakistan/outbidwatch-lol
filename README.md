# OutbidWatch

> The definitive open directory, live community observatory, and lineage tracker for pay-to-rank outbid leaderboard platforms.

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Cloudflare D1](https://img.shields.io/badge/Cloudflare-D1_SQLite-F38020?logo=sqlite&logoColor=white)](https://developers.cloudflare.com/d1/)
[![Hono](https://img.shields.io/badge/Framework-Hono_v4-E36002?logo=hono&logoColor=white)](https://hono.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4_CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Agent Ready](https://img.shields.io/badge/AI_Agents-100%2F100_Ready-10B981?logo=openai&logoColor=white)](https://outbidwatch.awaisalwaisy.workers.dev/llms.txt)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript_Strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Overview

**OutbidWatch** is a curated, high-integrity directory and live community observatory indexing the rapid rise of competitive pay-to-rank leaderboards across the indie web. Every site in the directory has been strictly vetted to ensure it is a true bidding platform (where users spend currency to outbid each other for top rank positions), with 100% verified founder attribution, chronological domain registration tracking, and geographic provenance metadata.

- **Production URL**: [https://outbidwatch.lol](https://outbidwatch.lol) (Edge: [https://outbidwatch.awaisalwaisy.workers.dev](https://outbidwatch.awaisalwaisy.workers.dev))
- **Live Community Timeline**: [https://outbidwatch.lol/timeline](https://outbidwatch.lol/timeline)
- **Founder Story**: [https://outbidwatch.lol/story](https://outbidwatch.lol/story)
- **Founder & Maintainer**: Awais Alwaisy ([@alvaisy](https://x.com/alvaisy) on X)

---

## Key Highlights & Features

* **192 Verified Platforms:** 100% pure outbid platforms (zero generic directories or standard SaaS).
* **Chronological Domain Lineage:** Sorted by domain registration date so early pioneers are recognized regardless of current bid price or hype.
* **Live Community Timeline (`/timeline`):** Real-time feed aggregating builder launch notes, downtime discussions, and revenue milestones from X (`outbid.lol`, `pay to outbid`, and `@jonathan_wilke`).
* **Rich Media & Video Support:** Renders verified author checkmarks, resolved domain links (no `t.co` hashes), zoomable screenshot images, and native auto-looping MP4 video screen recordings with a `no-referrer` stream policy.
* **10 Real Category Verticals:** Clean categorization without generic catch-alls (Games & Battles, SaaS & Apps, Pixel Walls, Creator Profiles, Meta Directories, Niche, Regional, AI Tools, Charity, VC).
* **Location & Provenance Tracking:** Builder locations mapped with transparent audit notes (`self_reported`, `whois_registry`, `inferred`).
* **Flicker-Free Spring View Transitions:** Seamless morphing transitions between directory cards and individual board profile pages (`/boards/:domain`).
* **100/100 Agentic Readiness:** Full support for autonomous AI agents via Markdown content negotiation (`Accept: text/markdown`), `.md` URL routes, `llms.txt`, RFC 9727 API Catalog, SEP-1649 MCP Server Card, and Schema.org JSON-LD.
* **Blazing Performance:** Pre-compiled static Tailwind CSS v4 (~7KB transfer), `content-visibility: auto` offscreen layout virtualization, and global Cloudflare Edge `Cache-Control`.

---

## Architecture & Tech Stack

```
                                  ┌─────────────────────────────┐
                                  │      Client / AI Agent      │
                                  └──────────────┬──────────────┘
                                                 │
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              Cloudflare Workers Edge                                    │
│                                                                                         │
│  ┌──────────────────────┐   ┌───────────────────────────┐   ┌─────────────────────────┐ │
│  │  Global RFC 8288     │──►│   Hono Application Router │──►│  Markdown Negotiation   │ │
│  │  Link Headers & CORS │   │        (v4 SSR)           │   │  (acceptmarkdown.com)   │ │
│  └──────────────────────┘   └─────────────┬─────────────┘   └────────────┬────────────┘ │
│                                           │                              │              │
│                                           ▼                              ▼              │
│  ┌──────────────────────┐   ┌───────────────────────────┐   ┌─────────────────────────┐ │
│  │  Treg / X API Client │   │   DbRepository / D1 SQL   │   │  Cloudflare Edge Cache  │ │
│  │ (2h Cached Searches) │   │  (outbidwatch-db SQLite)  │   │  (Public Static Assets) │ │
│  └──────────────────────┘   └───────────────────────────┘   └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
.
├── schema.sql                 # D1 Database schema definition (sites, submissions, timeline_cache)
├── seed.sql                   # Idempotent master dataset seed (192 verified sites)
├── wrangler.jsonc             # Cloudflare Workers & D1 database bindings configuration
├── .dev.vars.example          # Local environment variables & secrets template
├── package.json               # Dependencies, scripts, and build hooks
├── tsconfig.json              # TypeScript strict configuration
├── SUBMISSION.md              # Submission guidelines & manual ingestion SOP
├── public/                    # Static assets & agent discovery metadata
│   ├── style.css              # Pre-compiled, minified Tailwind CSS bundle (~29KB)
│   ├── app.js                 # Client-side spring transitions & drawer logic
│   ├── robots.txt             # RFC 9309 rules with AI crawlers & Content-Signals
│   ├── llms.txt               # When-to-use guide & REST reference for LLMs
│   ├── auth.md                # Agent authentication & public access policy
│   ├── openapi.json           # OpenAPI 3.1.0 specification with MPP extensions
│   └── .well-known/           # Standardized agent discovery endpoints
│       ├── api-catalog        # RFC 9727 linkset API catalog
│       ├── mcp/server-card.json # SEP-1649 Model Context Protocol card
│       ├── agent-skills/      # Agent Skills Discovery RFC index
│       ├── ai-catalog.json    # Agentic Resource Discovery (ARD) manifest
│       ├── oauth-protected-resource # Public OAuth resource metadata
│       ├── acp.json           # Agentic Commerce Protocol manifest
│       └── ucp                # Universal Commerce Protocol profile
└── src/
    ├── index.ts               # Application entrypoint, Link middleware, & route mounting
    ├── types/                 # Worker bindings, site entities, and API envelopes
    ├── db/                    # D1 client factory & prepared queries
    ├── middleware/            # CORS, logger, and agent-friendly 404 error handlers
    ├── lib/
    │   ├── geo.ts             # Geographic normalization helper
    │   ├── utils.ts           # Logo proxy URL helpers
    │   └── x-search.ts        # Parallel multi-query search with 2-hour D1 edge cache
    ├── styles/
    │   └── input.css          # Tailwind source CSS with spring transitions & variables
    └── routes/
        ├── directory-view.ts  # SSR Directory (/) and Markdown (/index.md)
        ├── timeline-view.ts   # SSR Timeline (/timeline) and Markdown (/timeline.md)
        ├── timeline-api.ts    # JSON API (/api/timeline)
        ├── board-view.ts      # SSR Profile (/boards/:domain) and Markdown (.md)
        ├── agent-ready.ts     # Robots, sitemaps, .well-known, /about, /privacy
        ├── sites.ts           # REST /api/sites endpoints
        ├── stats.ts           # REST /api/stats endpoint
        ├── taxonomy.ts        # /api/categories, /api/countries, /api/currencies
        ├── submit.ts          # /api/submit endpoint
        ├── submissions.ts     # Admin submissions reviewer
        ├── feed.ts            # /api/feed.json (JSON Feed v1.1)
        └── logos.ts           # /api/logos/:domain.png (Secure Edge Proxy)
```

---

## Build & Development Workflow

### Prerequisites
* [Bun](https://bun.sh/) (v1.1+)
* [Cloudflare Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

### 1. Install Dependencies
```bash
bun install
```

### 2. Configure Local Secrets (`.dev.vars`)
Create a local `.dev.vars` file (automatically ignored by git):
```bash
cp .dev.vars.example .dev.vars
```

Add your optional credentials:
```bash
TREG_TOKEN=your_treg_token_here
TREG_ORG=amicoder
```

### 3. Initialize & Seed Local D1 Database
```bash
bun run db:migrate:local
bun x wrangler d1 execute outbidwatch-db --local --file=./seed.sql
```

### 4. Build Static CSS
Compile the minified production stylesheet using Tailwind CLI:
```bash
bun run build:css
```

### 5. Run Local Development Server
```bash
bun run dev
```
The local server will be live at `http://localhost:8787`.

---

## Database Migrations (Cloudflare D1)

OutbidWatch uses **Cloudflare D1** (Serverless SQLite) with database binding `outbidwatch-db` (`b5b7fc6e-7533-47c0-8e8c-d85db7ac2213`).

### 1. Apply Schema Migrations to Remote Production (`--remote`)
Execute schema updates directly against the live production D1 database:

```bash
# Execute master schema on remote production D1
wrangler d1 execute outbidwatch-db --remote --file=./schema.sql

# Seed initial verified platforms (if empty)
wrangler d1 execute outbidwatch-db --remote --file=./seed.sql
```

### 2. Apply Schema Migrations to Local Environment (`--local`)
Run migrations on the local development SQLite emulator:

```bash
# Local schema migration
wrangler d1 execute outbidwatch-db --local --file=./schema.sql

# Local seed
wrangler d1 execute outbidwatch-db --local --file=./seed.sql
```

### 3. Verify & Query Remote D1 State
Inspect live database records directly from your terminal:

```bash
# Count total indexed platforms
wrangler d1 execute outbidwatch-db --remote --command="SELECT count(*) as total_sites FROM sites;"

# Inspect table schema
wrangler d1 execute outbidwatch-db --remote --command="PRAGMA table_info(sites);"

# Check pending submissions
wrangler d1 execute outbidwatch-db --remote --command="SELECT id, domain, status, created_at FROM submissions WHERE status='pending';"
```

---

## Production Deployment (Cloudflare Workers)

Deploying OutbidWatch compiles minified Tailwind CSS and deploys edge assets to both `outbidwatch.lol` and `outbidwatch.awaisalwaisy.workers.dev`:

### 1. Set Production Secrets (Optional)
```bash
echo "your_treg_token_here" | wrangler secret put TREG_TOKEN
```

### 2. Deploy Worker & Static Assets
```bash
bun run deploy
# Or via global Wrangler:
bun run build:css && wrangler deploy
```

---

## AI Agent & LLM Integration (`.md` & Protocols)

OutbidWatch is fully optimized for autonomous AI agents (OpenAI GPT-4o, Claude 3.5 Sonnet, Cursor, Perplexity):

### 1. Markdown for Agents ([acceptmarkdown.com](https://acceptmarkdown.com))
Any human or AI agent can view token-efficient Markdown by appending `.md` or passing `Accept: text/markdown`:

| Human URL | AI Agent Markdown URL | Purpose |
|---|---|---|
| `/` | [`/index.md`](https://outbidwatch.awaisalwaisy.workers.dev/index.md) | Paginated platforms list with stats & categories |
| `/timeline` | [`/timeline.md`](https://outbidwatch.awaisalwaisy.workers.dev/timeline.md) | Recent X discussions, metrics, and downtime updates |
| `/boards/outbid.lol` | [`/boards/outbid.lol.md`](https://outbidwatch.awaisalwaisy.workers.dev/boards/outbid.lol.md) | Single board profile with WHOIS provenance |
| `/about` | [`/about.md`](https://outbidwatch.awaisalwaisy.workers.dev/about.md) | About page & maintainer details |

### 2. Standard Discovery Endpoints
* **`/llms.txt`**: Concise guide on when and how LLMs should query OutbidWatch.
* **`/llms-full.txt`**: Complete plain-text knowledge base of all 192 platforms.
* **`/.well-known/api-catalog`**: RFC 9727 Linkset API catalog.
* **`/.well-known/mcp/server-card.json`**: SEP-1649 MCP Server Card for tool calling.
* **`/.well-known/agent-skills/index.json`**: Agent skills discovery index.
* **`/.well-known/ai-catalog.json`**: ARD manifest with semantic query embeddings.
* **`/robots.txt`**: Explicit crawl rules for AI bots + Content-Signals RFC preferences.
* **`/sitemap.xml`**: Dynamic XML sitemap listing all 192 board profiles.

---

## Public REST API Reference

All API responses follow a consistent, fully typed JSON envelope:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "total": 192,
    "page": 1,
    "limit": 25,
    "total_pages": 8,
    "has_next_page": true,
    "has_prev_page": false
  },
  "timestamp": "2026-08-24T12:00:00.000Z"
}
```

| Method | Endpoint | Description | Query Parameters |
|---|---|---|---|
| `GET` | `/api/health` | System health check | None |
| `GET` | `/api/stats` | Directory overview & stats | None |
| `GET` | `/api/sites` | Paginated listing of platforms | `q`, `category`, `status`, `order_by`, `order_dir`, `limit`, `page` |
| `GET` | `/api/sites/:slug` | Detailed site profile by slug | None |
| `GET` | `/api/sites/domain/:domain` | Lookup by exact domain | None |
| `GET` | `/api/timeline` | Curated real-time posts from X | None |
| `GET` | `/api/categories` | 10 category verticals with live counts | None |
| `GET` | `/api/countries` | Country breakdown with flags & counts | None |
| `GET` | `/api/currencies` | Supported currencies breakdown | None |
| `GET` | `/api/submit/check` | Pre-submit duplicate checker | `?domain=xyz.lol` |
| `POST` | `/api/submit` | Submit platform to review queue | JSON Body |
| `GET` | `/api/logos/:domain.png` | Edge logo proxy with 30-day CDN cache | None |
| `GET` | `/api/feed.json` | JSON Feed v1.1 for aggregators | None |

---

## Submissions & Verification Workflow

OutbidWatch enforces strict verification for all new platform additions. Submissions are queued in the database and vetted by maintainers to prevent spam, duplicate domains, or non-bidding websites.

For details on submitting a platform or how submissions are audited, read [**SUBMISSION.md**](SUBMISSION.md).

---

## Maintainer & Community

- **Built by**: Awais Alwaisy ([@alvaisy](https://x.com/alvaisy))
- **Source Code**: [GitHub Repository](https://github.com/alvaisy/outbidwatch)
- **License**: [MIT License](LICENSE)
