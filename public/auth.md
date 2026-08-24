# auth.md
> Agent Authentication and Registration Specification for OutbidWatch

## Overview
OutbidWatch allows autonomous AI agents and developers to interact with the directory, fetch data, and submit newly launched pay-to-rank platforms.

## OAuth Protected Resource
- **resource**: `https://outbidwatch.awaisalwaisy.workers.dev`
- **authorization_servers**: [`https://outbidwatch.awaisalwaisy.workers.dev`]
- **scopes_supported**: [`public:read`, `public:submit`]
- **bearer_methods_supported**: [`header`]

## Agent Registration
AI agents can register platform submissions and interact without prior account creation:
- **skill**: `https://isitagentready.com/.well-known/agent-skills/auth-md/SKILL.md`
- **register_uri**: `https://outbidwatch.awaisalwaisy.workers.dev/api/submit`
- **claim_uri**: `https://outbidwatch.awaisalwaisy.workers.dev/api/submit`
- **revocation_uri**: `https://outbidwatch.awaisalwaisy.workers.dev/api/submit`
- **identity_types_supported**: [`anonymous`, `verified_email`, `identity_assertion`]
- **credential_types_supported**: [`none`, `bearer`]
- **methods**: [`anonymous`, `verified_bot`, `developer_token`]

### Submission Flow & Schema
Agents may submit new platforms via `POST /api/submit` with JSON payload:
```json
{
  "url": "https://example.com",
  "domain": "example.com",
  "site_name": "Example Bidding Board",
  "category": "SaaS & Apps",
  "founder_x_handle": "builder_username",
  "submitter_note": "Launched on Aug 2026"
}
```
