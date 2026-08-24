# Contributing to OutbidWatch

Thank you for your interest in contributing to **OutbidWatch**! We welcome community contributions to expand our directory, refine provenance metadata, and improve performance.

---

## Code of Conduct

Please be respectful, concise, and constructive in all issues, pull requests, and discussions.

---

## How You Can Contribute

1. **Submit New Outbid Platforms**: Add missing pay-to-rank platforms via [`/api/submit`](https://outbidwatch.lol) or by submitting a PR to `seed.sql`.
2. **Correct Founder or Provenance Data**: If a founder X handle or country provenance is outdated or inaccurate, open a PR with verified evidence.
3. **Enhance Features & Performance**: Improve Lighthouse performance, optimize CSS/JS bundle sizes, or expand API discovery endpoints.

---

## Local Development Setup

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
wrangler d1 execute outbidwatch-db --local --file=./schema.sql
wrangler d1 execute outbidwatch-db --local --file=./seed.sql
```

### 4. Build Tailwind CSS
```bash
bun run build:css
```

### 5. Run Development Server
```bash
bun run dev
```
The local development server will start at `http://localhost:8787`.

---

## Pull Request Guidelines

1. **Keep it Pure Vanilla & Hono**: Do not introduce heavy frontend frameworks (React/Vue). Keep client-side interactions in `public/app.js` and SSR templates in `src/routes/`.
2. **Type Safety**: Ensure TypeScript compiles cleanly before submitting:
   ```bash
   bun x tsc --noEmit
   ```
3. **Syntax Validation**: Ensure standard JavaScript in `public/app.js` contains no TypeScript type annotations:
   ```bash
   node -c ./public/app.js
   ```

---

## Submitting New Platforms to `seed.sql`

When adding new records to `seed.sql`, ensure:
- The site is a **true bidding / pay-to-rank platform** (where users spend funds to rank).
- `domain_registration_date` is verified via WHOIS / RDAP.
- `founder_x_handle` is accurate without the `@` prefix.
- `country_code` matches ISO 3166-1 alpha-2.

---

[← Back to README](README.md)
