# Built-in First-Party Analytics Engine

> High-integrity, privacy-first telemetry without Google Analytics, Mixpanel, or third-party cookies.

---

## 1. Overview

OutbidWatch includes a custom, zero-dependency analytics system built directly into the Cloudflare Worker and D1 database.

- **URL**: [https://outbidwatch.lol/analytics](https://outbidwatch.lol/analytics)
- **Zero Third-Party Trackers**: 100% first-party telemetry with no third-party scripts or ad networks.
- **GDPR & Privacy Compliant**: No IP addresses are stored. Visits are aggregated using anonymous `HttpOnly` session IDs.

---

## 2. Metrics Tracked

1. **Page Views & Unique Visitors**: Daily, weekly, and all-time traffic counts.
2. **Geographic Distribution**: Visitor breakdown by country utilizing Cloudflare`s `CF-IPCountry` edge header.
3. **Outbound Board Clicks**: Tracks which outbid platforms receive real referral traffic from OutbidWatch.
4. **Device & OS Fingerprint**: Lightweight user-agent categorization into hardware classes (Mac, Windows, iOS, Android, Linux).
5. **Real-time Live Events**: `navigator.sendBeacon` event ingestion endpoint at `/api/analytics/event`.

---

[← Back to README](../README.md)
