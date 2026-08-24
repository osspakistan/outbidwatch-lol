# OutbidWatch

> The definitive open-source directory, live community observatory, and lineage tracker for pay-to-rank outbid leaderboard platforms.

[![Live Site](https://img.shields.io/badge/Live%20Production-outbidwatch.lol-BACB45?style=flat-square&logo=cloudflare&logoColor=black)](https://outbidwatch.lol)
[![GitHub License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Edge%20Runtime-Cloudflare%20Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Cloudflare D1](https://img.shields.io/badge/Database-Cloudflare%20D1%20SQLite-F38020?style=flat-square&logo=sqlite&logoColor=white)](https://developers.cloudflare.com/d1/)
[![Hono v4](https://img.shields.io/badge/Framework-Hono%20v4%20SSR-E36002?style=flat-square&logo=hono&logoColor=white)](https://hono.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Styling-Tailwind%20v4%20CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Agent Ready](https://img.shields.io/badge/AI%20Agent%20Ready-98%2F100-10B981?style=flat-square&logo=openai&logoColor=white)](docs/agent-readiness.md)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

---

## 📖 Overview

In August 2026, Jonathan Wilke launched `outbid.lol`, igniting a viral explosion of pay-to-rank leaderboard websites across the indie web. Within weeks, over 192 developers built and launched their own spin-offs across various niches (AI startups, domain names, creator profiles, regional markets, pixel walls, and newsletters).

I built **OutbidWatch** to solve the chaos: an open, high-integrity directory and live community observatory that tracks the exact chronological lineage of every platform, verifies true bidding mechanics, maps builder geographic provenance, and provides real-time community monitoring.

- 🌐 **Live URL**: [https://outbidwatch.lol](https://outbidwatch.lol) (Edge: [https://outbidwatch.awaisalwaisy.workers.dev](https://outbidwatch.awaisalwaisy.workers.dev))
- ⏱️ **Live Community Timeline**: [https://outbidwatch.lol/timeline](https://outbidwatch.lol/timeline)
- 🗺️ **Global Builder Map**: [https://outbidwatch.lol/map](https://outbidwatch.lol/map)
- 📊 **Built-in First-Party Analytics**: [https://outbidwatch.lol/analytics](https://outbidwatch.lol/analytics)
- 📖 **Founder Story**: [https://outbidwatch.lol/story](https://outbidwatch.lol/story)
- 🧑‍💻 **Maintainer**: Awais Alwaisy ([@alvaisy](https://x.com/alvaisy) on X)
- 🐙 **Repository**: [https://github.com/osspakistan/outbidwatch-lol](https://github.com/osspakistan/outbidwatch-lol)

---

## ✨ Key Features & Architecture Highlights

### 1. ⚡ Zero-Framework Architecture (Pure Vanilla + Hono SSR)
OutbidWatch does not ship bloated client-side runtimes like React, Next.js, or Vue. 
- **Lightning Fast Edge SSR**: Hono v4 renders semantic HTML directly on Cloudflare Workers edge nodes in under 15ms.
- **Ultra-lightweight Client**: A single, clean `public/app.js` script handles debounced search, modal drawers, and spring view transitions.
- **Tailwind CSS v4 Pre-compiled**: Standalone static bundle (~29KB minified, ~7KB gzip) with zero runtime CSS-in-JS calculation.
- 🔗 *Read more*: [Architecture & Zero-Framework Guide](docs/architecture-and-tech-stack.md)

### 2. 🚀 Blazing Lighthouse Performance Scores
- **Desktop Performance**: **90+ Lighthouse score** across Performance, Accessibility, Best Practices, and SEO.
- **Mobile Performance**: **75+ Lighthouse score**, engineered with `content-visibility: auto` off-screen DOM virtualization for smooth scrolling on low-power devices.

### 3. 🎯 192+ Verified Outbid Platforms & Chronological Lineage
- **Pure Outbid Integrity**: Zero generic link farms or static directories — 100% of listed sites have active bidding or pay-to-rank mechanics.
- **Domain Registration Date is King**: Ranked chronologically by authoritative WHOIS / RDAP domain creation dates, recognizing true pioneers regardless of bid price.
- **Geographic Provenance Audit**: Locations classified by audit source (`self_reported`, `whois_registry`, or `inferred`).
- 🔗 *Read more*: [Data Pipeline & Ingestion Methodology](docs/data-pipeline-and-provenance.md)

### 4. 📱 Mobile-First Responsive Experience
- Clean, uncluttered mobile card viewports hiding redundant badges while retaining full founder handles and categories.
- Spring-physics morphing view transitions between cards and board viewports.
- Real-time debounced asynchronous search querying across domains, founder handles, categories, and country names.

### 5. ⏱️ Live Community Timeline (`/timeline`)
- Real-time curated stream tracking builder launches, milestone announcements, downtime discussions, and drama from X.
- Embedded video support with loop controls, native image screenshots, and verified author badges.

### 6. 📊 Built-in Privacy-Preserving Analytics (`/analytics`)
- 100% first-party telemetry with **zero third-party tracking scripts** (no Google Analytics, no Mixpanel).
- Tracks unique visitors, geographic distribution via Cloudflare `CF-IPCountry`, hardware categories, and outbound referral clicks.
- 🔗 *Read more*: [Built-in Analytics Documentation](docs/built-in-analytics.md)

### 7. 🗺️ Interactive Global Builder Map (`/map`)
- Visual interactive map pinpointing indie makers and outbid startups worldwide across North America, Europe, Asia, Latin America, and Oceania.

### 8. 🤖 100/100 AI Agent Readiness & WebMCP Native
- **Vercel Agent-Ready Benchmark**: **98 / 100**
- **Cloudflare AI Crawler Compatibility**: **93 / 100**
- Supports Markdown content negotiation (`Accept: text/markdown`), direct `.md` URLs, [`/llms.txt`](https://outbidwatch.lol/llms.txt), RFC 9727 API Catalog, SEP-1649 MCP Server Card, and WebMCP protocol.
- 🔗 *Read more*: [AI Agent Readiness Guide](docs/agent-readiness.md)

---

## 🗂️ Documentation Directory

| Document | Description |
|---|---|
| [**Architecture & Tech Stack**](docs/architecture-and-tech-stack.md) | Zero-framework philosophy, edge SSR with Hono, Tailwind v4, and performance benchmarks |
| [**Data Pipeline & Provenance**](docs/data-pipeline-and-provenance.md) | How all 192+ platforms were scraped, verified, normalized, and chronologically indexed |
| [**Built-in Analytics Engine**](docs/built-in-analytics.md) | Privacy-preserving, zero-cookie first-party telemetry system on Cloudflare D1 |
| [**AI Agent Readiness Guide**](docs/agent-readiness.md) | Machine discovery, Markdown content negotiation, WebMCP, and MCP Server Card |
| [**Contributing Guide**](CONTRIBUTING.md) | Code of conduct, local setup, PR guidelines, and platform submission instructions |
| [**Submission SOP**](SUBMISSION.md) | Manual platform vetting checklist and approval standards |
| [**License (MIT)**](LICENSE) | Open-source MIT License terms and permissions |

---

## 🛠️ Tech Stack

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
│  │  First-Party         │   │   DbRepository / D1 SQL   │   │  Cloudflare Edge Cache  │ │
│  │  Analytics Engine    │   │  (outbidwatch-db SQLite)  │   │  (Public Static Assets) │ │
│  └──────────────────────┘   └───────────────────────────┘   └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Serverless Edge Runtime**: Cloudflare Workers
- **Application Framework**: Hono v4 (SSR + REST API)
- **Database**: Cloudflare D1 (Serverless SQLite)
- **Styling**: Tailwind CSS v4 (Pre-compiled static bundle)
- **Icons**: Phosphor Icons (Vector SVG)
- **Dynamic OG Image Engine**: Resvg + SVG Generator (`/api/og`)
- **Package Manager & Runtime**: Bun (v1.1+)

---

## 💻 Local Development Setup

### Prerequisites
- [Bun](https://bun.sh/) (v1.1+)
- [Cloudflare Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

### 1. Clone the Repository
```bash
git clone git@github.com:osspakistan/outbidwatch-lol.git
cd outbidwatch-lol
```

### 2. Install Dependencies
```bash
bun install
```

### 3. Initialize Local D1 Database
```bash
# Create local tables
wrangler d1 execute outbidwatch-db --local --file=./schema.sql

# Seed local database with 192 master platforms
wrangler d1 execute outbidwatch-db --local --file=./seed.sql
```

### 4. Build Static Stylesheet
```bash
bun run build:css
```

### 5. Start Local Server
```bash
bun run dev
```
Visit `http://localhost:8787` in your browser.

---

## 🗄️ Database Migrations (Cloudflare D1)

OutbidWatch uses **Cloudflare D1** (Serverless SQLite) with binding `outbidwatch-db` (`b5b7fc6e-7533-47c0-8e8c-d85db7ac2213`).

### Apply to Remote Production (`--remote`)
```bash
# Execute schema migration on remote D1
wrangler d1 execute outbidwatch-db --remote --file=./schema.sql

# Seed remote D1 (first time setup)
wrangler d1 execute outbidwatch-db --remote --file=./seed.sql
```

### Query Remote D1 State
```bash
# Count total indexed platforms
wrangler d1 execute outbidwatch-db --remote --command="SELECT count(*) as total_sites FROM sites;"

# Check pending submissions
wrangler d1 execute outbidwatch-db --remote --command="SELECT id, domain, status FROM submissions WHERE status='pending';"
```

---

## 🚀 Production Deployment

Deploying compiles minified CSS and updates Cloudflare Workers triggers on `outbidwatch.lol` and `www.outbidwatch.lol`:

```bash
bun run deploy
```

---

## 🤝 Contributing

Contributions are welcome! Please read [**CONTRIBUTING.md**](CONTRIBUTING.md) for instructions on proposing new features, adding outbid platforms, and following our pull request guidelines.

---

## 📄 License

This project is open source and available under the [**MIT License**](LICENSE).

Built with precision by **Awais Alwaisy** ([@alvaisy](https://x.com/alvaisy) on X).
