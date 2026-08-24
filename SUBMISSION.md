# OutbidWatch Submission & Manual Ingestion Guidelines

This document outlines the submission criteria, automated duplicate checking, production security lockdown, and the standard operating procedure (SOP) used to manually review, verify, and ingest new outbid platforms into the OutbidWatch database.

---

## 1. Philosophy: Human Curation & High Integrity

OutbidWatch is not a scrape dump or an uncurated list. Every platform in the index must be a genuine **pay-to-rank bidding platform** where users bid to claim or hold top positions. 

To maintain 100% data integrity, **all community submissions are placed into a pending queue and manually verified by a maintainer** before being promoted to the live directory.

---

## 2. Production Security Lockdown (Maintainers Only)

On production, all backend mutation, review, and approval endpoints are strictly protected so **no external third-party can access maintainer endpoints or forge submissions**.

### Protection Layers
1. **Admin Bearer Token Authentication (`ADMIN_API_KEY`):**
   * All `/api/submissions/*` endpoints (queue listing, approval, rejection) require `Authorization: Bearer <ADMIN_API_KEY>` or `X-Admin-Secret: <ADMIN_API_KEY>`.
   * Unauthenticated requests receive `401 Unauthorized`.
2. **Origin Guard Middleware:**
   * Protects `POST /api/submit` from cross-site bot spam and scraping tools.
   * Only allows submissions originating from `outbidwatch.com` (`Sec-Fetch-Site: same-origin`).
3. **IP Rate Limiting:**
   * Protects `POST /api/submit` with a sliding window rate limit of **max 5 submissions per 10 minutes per IP**.

### Setting Production Admin Key
```bash
# Set your secure private maintainer key in Cloudflare Secrets
bun x wrangler secret put ADMIN_API_KEY
```

---

## 3. What We Collect from Submitters

When submitting a platform via the UI or `POST /api/submit`, the submitter must provide 5 core facts:

| Field | Required? | Example | Purpose |
|---|---|---|---|
| **Website URL** | **Yes** | `https://rankwars.lol` | The primary platform domain |
| **Founder X Handle** | **Yes** | `@johndoe` | Direct link to the builder's profile |
| **Location / Country** | **Yes** | `Madrid, Spain` | Builder base of operations |
| **Launch Date** | **Yes** | `2026-08-21` | When the platform took its first live bid |
| **Platform Currency** | Optional | `USD`, `EUR`, `SOL`, `INR`, `BRL` | Native currency used on the board *(defaults to USD)* |

---

## 4. Real-Time Pre-Submit Duplicate Prevention

To save submitters time and prevent duplicate submissions, the frontend runs a real-time duplicate check against the API as the user types the domain name:

### Duplicate Check Endpoint
```http
GET /api/submit/check?domain=politicos.lol
```

### Response if Already Indexed
```json
{
  "exists": true,
  "domain": "politicos.lol",
  "slug": "politicos-lol",
  "site_name": "politicos.lol",
  "status": "live",
  "message": "Platform 'politicos.lol' is already tracked in OutbidWatch"
}
```

---

## 5. Submitter API Endpoint

```http
POST /api/submit
Content-Type: application/json

{
  "url": "https://rankwars.lol",
  "founder_x_handle": "janedoe",
  "location": "Berlin, Germany",
  "launch_date": "2026-08-23",
  "currency": "EUR",
  "submitter_note": "Launched yesterday on X"
}
```

---

## 6. Maintainer Review & Approval Workflow (SOP)

When reviewing submissions, maintainers use the authenticated backend API:

### Step 1: List Pending Submissions
```bash
curl -H "Authorization: Bearer $ADMIN_API_KEY" \
  https://outbidwatch.com/api/submissions?status=pending
```

### Step 2: Verify Criteria
Visit the platform and verify:
1. Is it a true pay-to-rank bidding platform?
2. Is the founder X handle genuine?
3. What is the native currency and actual launch date?

### Step 3: Approve & Promote to Live Directory
```bash
curl -X POST https://outbidwatch.com/api/submissions/<SUBMISSION_ID>/approve \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Games & Competitive Battles",
    "summary_256": "RankWars is a competitive pay-to-rank arena where builders outbid rivals for the top 3 featured spots. Each bid increases the floor price by 10% in real-time."
  }'
```

*This automatically resolves geographic flags, generates the secure edge logo URL, and publishes the site to the live directory.*

### Step 4: Reject Submission (if invalid)
```bash
curl -X POST https://outbidwatch.com/api/submissions/<SUBMISSION_ID>/reject \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Not an outbid platform. Standard SaaS directory."
  }'
```
