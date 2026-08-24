# Architecture & Zero-Framework Philosophy

> Why OutbidWatch uses Vanilla HTML/JS, Tailwind CSS v4, and Hono SSR on Cloudflare Workers instead of heavy frontend frameworks.

---

## 1. Zero-Framework Philosophy

Modern web applications often ship hundreds of kilobytes of React, Next.js, or Vue runtime bundles just to render structured lists and modal cards. 

OutbidWatch is engineered with a **pure zero-framework architecture**:
- **Zero JavaScript Framework Runtimes**: No React, no Vue, no Svelte, no hydration overhead.
- **Server-Side Rendered (SSR) HTML**: Hono v4 templates render instant, complete HTML from Cloudflare Workers edge nodes in under 15ms.
- **Micro-Client Interactivity**: A single lightweight `public/app.js` script handles debounced search, server-side pagination, drawer navigation, and spring view transitions.
- **Tailwind CSS v4 Standalone Bundle**: Pre-compiled static stylesheet (~29KB minified, ~7KB gzip) with zero runtime CSS-in-JS calculation.

---

## 2. Edge Stack Overview

| Layer | Technology | Purpose |
|---|---|---|
| **Runtime** | Cloudflare Workers | Global V8 serverless execution at 300+ edge locations |
| **Routing / SSR** | Hono v4 | Strict TypeScript routing, content negotiation, and HTML streaming |
| **Database** | Cloudflare D1 (SQLite) | Serverless relational edge database with sub-5ms query times |
| **Styling** | Tailwind CSS v4 | Ultra-fast pre-compiled styling with modern CSS variables |
| **Transitions** | CSS View Transitions API | Native browser spring morphing transitions between cards and board views |
| **Favicons & OG** | Resvg + Sharp + Dynamic SVG | Vector-rendered 1200×630 dynamic OpenGraph images on demand |

---

## 3. High Performance Metrics

- **Desktop Lighthouse Score**: 90+ across Performance, Accessibility, Best Practices, and SEO.
- **Mobile Lighthouse Score**: 75+ (optimized for low-end mobile CPUs with off-screen layout virtualization).
- **Edge TTFB (Time to First Byte)**: < 50ms worldwide via Cloudflare Edge Cache.

---

[← Back to README](../README.md)
