# Data Pipeline, Ingestion & Provenance Methodology

> How OutbidWatch discovered, scraped, audited, normalized, and verified 192+ pay-to-rank leaderboard platforms across the indie web.

---

## 1. The Core Problem: The Clone Explosion

In August 2026, Jonathan Wilke launched `outbid.lol`, triggering a viral goldrush across Twitter/X and the indie hacking community. Within weeks, hundreds of developers built and launched their own variants. However:
- Dozens of generic directories claimed to be "bidding leaderboards" despite lacking actual pay-to-rank mechanics.
- Many clones were abandoned, parked, or broken within 48 hours.
- Founders frequently copy-pasted landing page metadata without proper self-attribution or launch dates.
- There was zero central chronological record showing who built first versus who cloned later.

I built **OutbidWatch** to be the definitive, high-integrity directory and timeline for this movement.

---

## 2. Ingestion Pipeline & Architecture

The OutbidWatch dataset was gathered using a multi-stage automated pipeline combined with human auditing:

```
  ┌─────────────────────────────────────────────────────────────┐
  │                   1. Discovery & Crawling                   │
  │   - Real-time X keyword monitoring (outbid.lol, pay to rank)│
  │   - Certificate Transparency log monitoring (.lol domains)  │
  │   - Community submissions queue (/api/submit)               │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                   2. Automated Verification                 │
  │   - Headless scraping to detect live leaderboard elements   │
  │   - Payment gateway / Stripe / Web3 contract verification   │
  │   - HTTP status, edge latency, and TLS verification         │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                   3. Lineage & RDAP Resolution              │
  │   - Authoritative WHOIS / RDAP domain registration queries  │
  │   - Precise chronological ranking (oldest domain registered)│
  │   - TLD registry timestamp normalization                    │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                   4. Geographic Provenance Mapping          │
  │   - Founder X profile bio & location analysis               │
  │   - ISO 3166-1 alpha-2 country code resolution              │
  │   - Provenance categorization (self_reported vs whois)      │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                   5. D1 Edge Storage & CDN Invalidation     │
  │   - Idempotent database migrations (schema.sql / seed.sql)  │
  │   - Dynamic logo proxy caching (/api/logos/:domain.png)     │
  │   - Edge SSR rendering on Cloudflare Workers                │
  └─────────────────────────────────────────────────────────────┘
```

---

## 3. Provenance Audit Categories

Every platform in the database includes a `location_provenance` flag and audit note:

1. **`self_reported`**: The founder explicitly lists their city or country on their verified X/Twitter bio, GitHub profile, or personal website.
2. **`whois_registry`**: Origin verified via public RDAP/WHOIS registry records associated with the domain registrar.
3. **`inferred`**: Geographic base determined via company filings, regional currency defaults, or associated development studio records.

---

## 4. Lineage Tracking & Sorting Rule

Unlike directories that sort by payment sponsorship or traffic estimates, OutbidWatch enforces a strict chronological rule:

> **Domain Registration Date is King.**  
> The site registered earliest sits highest in the default chronological index, recognizing true pioneers regardless of current bidding volume or hype.

---

[← Back to README](../README.md)
