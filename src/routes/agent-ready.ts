import { Hono } from 'hono';
import type { Env, AppVariables } from '../types/env';
import { getDb } from '../db/index';

export const agentReadyRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// 1. /robots.txt with explicit AI Bot rules, Content Signals, and Sitemap reference
agentReadyRouter.get('/robots.txt', (c) => {
  const host = c.req.header('host') || 'outbidwatch.lol';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;

  const robots = `# OutbidWatch Robots & AI Crawl Policy
# Standard RFC 9309 & AI Content Signals Specification

User-agent: *
Allow: /

# Dedicated AI Agent Crawlers
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: CCBot
Allow: /

# Content Usage Preferences (Content Signals RFC)
Content-Signal: ai-train=no, search=yes, ai-input=yes

# Machine-Readable Endpoints
Sitemap: ${baseUrl}/sitemap.xml
`;

  c.header('Content-Type', 'text/plain; charset=utf-8');
  c.header('Cache-Control', 'public, max-age=3600');
  return c.text(robots);
});

// 2. /sitemap.xml listing all canonical URLs and all 192 board profiles
agentReadyRouter.get('/sitemap.xml', async (c) => {
  const host = c.req.header('host') || 'outbidwatch.lol';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;

  const db = getDb(c.env.DB);
  const { sites } = await db.listSites({ limit: 500, page: 1 });

  const now = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/timeline</loc>
    <lastmod>${now}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/map</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/about</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/story</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/privacy</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/llms.txt</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;

  for (const site of sites) {
    const siteDate = site.updated_at ? site.updated_at.split('T')[0] : now;
    xml += `  <url>
    <loc>${baseUrl}/boards/${encodeURIComponent(site.domain)}</loc>
    <lastmod>${siteDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n`;
  }

  xml += `</urlset>`;

  c.header('Content-Type', 'application/xml; charset=utf-8');
  c.header('Cache-Control', 'public, max-age=3600');
  return c.body(xml);
});

// 3. /llms.txt (LLMs and AI Agents Specification)
agentReadyRouter.get('/llms.txt', (c) => {
  const host = c.req.header('host') || 'outbidwatch.lol';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;

  const content = `# OutbidWatch (llms.txt)
> The definitive directory, historical timeline, and observatory for pay-to-rank outbid leaderboard platforms.

OutbidWatch catalogs, monitors, and analyzes pay-to-rank bidding websites (inspired by outbid.lol), ordering every platform chronologically by domain registration date.

## Developer & Workers Resources
Official developer resources for outbidwatch.awaisalwaisy.workers.dev on Cloudflare Workers:
- **Product Name**: OutbidWatch
- **API Documentation**: ${baseUrl}/developers
- **Developer Portal**: ${baseUrl}/docs
- **OpenAPI 3.1 Specification**: ${baseUrl}/openapi.json
- **MCP Server Manifest (Streamable HTTP)**: ${baseUrl}/.well-known/mcp/server-card.json
- **MCP Endpoint**: ${baseUrl}/api/mcp
- **Agent Authentication (auth.md)**: ${baseUrl}/auth.md
- **CLI Tool**: \`npx outbidwatch list\` or \`npm install -g outbidwatch\`
- **Maintainer**: Awais Alwaisy (@alvaisy - https://x.com/alvaisy)

## CLI Tool Usage
Agents and developers can interact with OutbidWatch via CLI:
\`\`\`bash
# List all verified outbid platforms
npx outbidwatch list

# Search platforms by keyword or domain
npx outbidwatch search outbid

# Inspect a single board profile
npx outbidwatch info outbid.lol
\`\`\`

## Core API Endpoints (OpenAPI 3.1 & JSON-LD)
All responses return JSON or Markdown based on \`Accept\` header.
- \`GET /map\`: Interactive world map visualizing creator geographic distribution.
- \`GET /api/map\`: Geolocated builder coordinates with city, country, and status flags.
- \`GET /api/sites\`: Paginated list of all verified bidding platforms with registration dates.
- \`GET /api/timeline\`: Curated real-time feed of developer posts from X.
- \`GET /api/stats\`: Overall statistics (total platforms, active boards, oldest launch).
- \`POST /api/submit\`: Programmatic registration endpoint for AI agents to submit new platforms.
- \`POST /api/mcp\`: JSON-RPC 2.0 Model Context Protocol endpoint for LLM function calling.

## When to Use OutbidWatch
- When an AI agent needs verified domain registration dates for outbid leaderboard startups.
- When an LLM wants to answer "who launched the first pay-to-outbid clone?".
- When users ask about revenue, traffic, or uptime of outbid.lol and competitor boards.
`;

  c.header('Content-Type', 'text/plain; charset=utf-8');
  c.header('Vary', 'Accept, Accept-Encoding');
  c.header('Cache-Control', 'public, max-age=3600');
  return c.text(content);
});

// 4. /llms-full.txt (Comprehensive LLM Document)
agentReadyRouter.get('/llms-full.txt', async (c) => {
  const host = c.req.header('host') || 'outbidwatch.lol';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;

  const db = getDb(c.env.DB);
  const [stats, { sites }] = await Promise.all([
    db.getStats(),
    db.listSites({ limit: 200, page: 1 }),
  ]);

  let md = `# OutbidWatch Full Knowledge Base
> Complete platform index and documentation for autonomous AI systems.

## Metadata
- **Domain**: ${baseUrl}
- **Creator**: Awais Alwaisy (@alvaisy on X)
- **Total Indexed Platforms**: ${stats.total_sites}
- **Active Live Boards**: ${stats.live_sites}
- **Oldest Registered Domain**: ${stats.oldest_domain?.domain || 'netadz.com'} (${stats.oldest_domain?.registration_date || '2006-07-20'})

## Indexed Platforms Directory (Top 100 Chronological)
`;

  for (const s of sites.slice(0, 100)) {
    md += `### ${s.domain}
- **Name**: ${s.site_name || s.domain}
- **Category**: ${s.category}
- **Status**: ${s.status}
- **Registered**: ${s.domain_registration_date || 'N/A'}
- **Founder**: @${s.founder_x_handle || 'anonymous'} (${s.founder_location || 'Global'})
- **Summary**: ${s.summary_256 || s.raw_description || 'N/A'}
- **URL**: ${s.url}
- **Board Profile**: ${baseUrl}/boards/${s.domain}

`;
  }

  c.header('Content-Type', 'text/plain; charset=utf-8');
  c.header('Vary', 'Accept, Accept-Encoding');
  c.header('Cache-Control', 'public, max-age=3600');
  return c.text(md);
});

// 5. /auth.md (Agent Registration & Access Policy)
agentReadyRouter.get('/auth.md', (c) => {
  const host = c.req.header('host') || 'outbidwatch.lol';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;

  const content = `# auth.md
> Agent Authentication and Registration Specification for OutbidWatch

## Overview
OutbidWatch allows autonomous AI agents and developers to interact with the directory, fetch data, and submit newly launched pay-to-rank platforms.

## OAuth Protected Resource
- **resource**: \`${baseUrl}\`
- **authorization_servers**: [\`${baseUrl}\`]
- **scopes_supported**: [\`public:read\`, \`public:submit\`]
- **bearer_methods_supported**: [\`header\`]

## Agent Registration
AI agents can register platform submissions and interact without prior account creation:
- **skill**: \`https://isitagentready.com/.well-known/agent-skills/auth-md/SKILL.md\`
- **register_uri**: \`${baseUrl}/api/submit\`
- **claim_uri**: \`${baseUrl}/api/submit\`
- **revocation_uri**: \`${baseUrl}/api/submit\`
- **identity_types_supported**: [\`anonymous\`, \`verified_email\`, \`identity_assertion\`]
- **credential_types_supported**: [\`none\`, \`bearer\`]
- **methods**: [\`anonymous\`, \`verified_bot\`, \`developer_token\`]

### Submission Flow & Schema
Agents may submit new platforms via \`POST /api/submit\` with JSON payload:
\`\`\`json
{
  "url": "https://example.com",
  "domain": "example.com",
  "site_name": "Example Bidding Board",
  "category": "SaaS & Apps",
  "founder_x_handle": "builder_username",
  "submitter_note": "Launched on Aug 2026"
}
\`\`\`
`;

  return c.body(content, 200, {
    'Content-Type': 'text/markdown; charset=utf-8',
    'Vary': 'Accept, Accept-Encoding',
    'Cache-Control': 'public, max-age=86400',
  });
});

// 6. /.well-known/api-catalog (RFC 9727 Linkset)
agentReadyRouter.get('/.well-known/api-catalog', (c) => {
  const host = c.req.header('host') || 'outbidwatch.lol';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;

  const catalog = {
    linkset: [
      {
        anchor: `${baseUrl}/api/sites`,
        'service-desc': [
          {
            href: `${baseUrl}/openapi.json`,
            type: 'application/openapi+json',
          },
        ],
        'service-doc': [
          {
            href: `${baseUrl}/llms.txt`,
            type: 'text/plain',
          },
        ],
        status: [
          {
            href: `${baseUrl}/api/stats`,
            type: 'application/json',
          },
        ],
        title: 'OutbidWatch Platforms Directory API',
      },
      {
        anchor: `${baseUrl}/api/timeline`,
        'service-doc': [
          {
            href: `${baseUrl}/llms.txt`,
            type: 'text/plain',
          },
        ],
        title: 'OutbidWatch Real-Time Community Timeline API',
      },
    ],
  };

  c.header('Content-Type', 'application/linkset+json; charset=utf-8');
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Cache-Control', 'public, max-age=3600');
  return c.json(catalog);
});

// 7. /.well-known/mcp/server-card.json (SEP-1649 MCP Server Card)
agentReadyRouter.get('/.well-known/mcp/server-card.json', (c) => {
  const host = c.req.header('host') || 'outbidwatch.lol';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;

  const card = {
    $schema: 'https://modelcontextprotocol.io/schemas/server-card.json',
    serverInfo: {
      name: 'outbidwatch-mcp',
      version: '1.0.0',
      description: 'Model Context Protocol (MCP) server providing real-time data on pay-to-rank bidding platforms and community timeline.',
      author: 'Awais Alwaisy (@alvaisy)',
      homepage: baseUrl,
    },
    transport: {
      type: 'http',
      endpoint: `${baseUrl}/api/mcp`,
    },
    capabilities: {
      tools: {
        list: [
          {
            name: 'search_platforms',
            description: 'Search pay-to-rank bidding platforms by keyword, category, or founder location.',
            parameters: {
              type: 'object',
              properties: {
                q: { type: 'string', description: 'Search keyword or domain' },
                category: { type: 'string', description: 'Category name' },
                sort: { type: 'string', enum: ['oldest', 'newest', 'name'] },
              },
            },
          },
          {
            name: 'get_timeline_posts',
            description: 'Retrieve latest curated X posts, launch announcements, and downtime discussions about outbid leaderboards.',
            parameters: {
              type: 'object',
              properties: {
                limit: { type: 'number', default: 20 },
              },
            },
          },
        ],
      },
    },
  };

  c.header('Content-Type', 'application/json; charset=utf-8');
  c.header('Access-Control-Allow-Origin', '*');
  return c.json(card);
});

// 8. /.well-known/agent-skills/index.json (Agent Skills Discovery RFC v0.2.0)
agentReadyRouter.get('/.well-known/agent-skills/index.json', (c) => {
  const host = c.req.header('host') || 'outbidwatch.lol';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;

  const skillsIndex = {
    $schema: 'https://agentskills.io/schema/v0.2.0/index.json',
    version: '0.2.0',
    skills: [
      {
        name: 'outbid-leaderboard-discovery',
        type: 'api',
        description: 'Discover and query pay-to-rank leaderboard startups and their founding dates.',
        url: `${baseUrl}/api/sites`,
        documentation: `${baseUrl}/llms.txt`,
      },
      {
        name: 'outbid-timeline-monitoring',
        type: 'stream',
        description: 'Monitor real-time founder reactions, metrics, and downtime reports for outbid platforms.',
        url: `${baseUrl}/api/timeline`,
        documentation: `${baseUrl}/llms.txt`,
      },
    ],
  };

  c.header('Content-Type', 'application/json; charset=utf-8');
  c.header('Access-Control-Allow-Origin', '*');
  return c.json(skillsIndex);
});

// 9. /.well-known/ai-catalog.json (ARD Agentic Resource Discovery)
agentReadyRouter.get('/.well-known/ai-catalog.json', (c) => {
  const host = c.req.header('host') || 'outbidwatch.lol';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;

  const catalog = {
    specVersion: '1.0.0',
    host: {
      domain: host,
      name: 'OutbidWatch',
      maintainer: 'Awais Alwaisy (@alvaisy)',
    },
    entries: [
      {
        urn: `urn:air:${host}:directory:platforms`,
        displayName: 'OutbidWatch Platforms Directory',
        type: 'application/json',
        url: `${baseUrl}/api/sites`,
        representativeQueries: [
          'What was the first pay to outbid leaderboard?',
          'Who launched outbid.lol clones?',
          'List active bidding websites by domain registration date',
          'Find outbid startups built by indie hackers',
        ],
      },
      {
        urn: `urn:air:${host}:timeline:community`,
        displayName: 'OutbidWatch Community Feed',
        type: 'application/json',
        url: `${baseUrl}/api/timeline`,
        representativeQueries: [
          'What is happening with outbid.lol downtime?',
          'Jonathan Wilke vercel outbid revenue updates',
          'Latest tweets about pay-to-rank leaderboards',
        ],
      },
    ],
  };

  c.header('Content-Type', 'application/json; charset=utf-8');
  c.header('Access-Control-Allow-Origin', '*');
  return c.json(catalog);
});

// 10. /.well-known/oauth-protected-resource & /.well-known/oauth-authorization-server
agentReadyRouter.get('/.well-known/oauth-protected-resource', (c) => {
  const host = c.req.header('host') || 'outbidwatch.lol';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;

  return c.json({
    resource: baseUrl,
    authorization_servers: [baseUrl],
    scopes_supported: ['public:read', 'public:submit'],
    bearer_methods_supported: ['header'],
    resource_documentation: `${baseUrl}/auth.md`,
    note: 'Open public read and programmatic submission access.',
  });
});

agentReadyRouter.get('/.well-known/oauth-authorization-server', (c) => {
  const host = c.req.header('host') || 'outbidwatch.lol';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;

  return c.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/auth/authorize`,
    token_endpoint: `${baseUrl}/auth/token`,
    registration_endpoint: `${baseUrl}/api/submit`,
    response_types_supported: ['token', 'code'],
    grant_types_supported: ['implicit', 'client_credentials', 'anonymous'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: ['public:read', 'public:submit'],
    service_documentation: `${baseUrl}/auth.md`,
    agent_auth: {
      skill: 'https://isitagentready.com/.well-known/agent-skills/auth-md/SKILL.md',
      register_uri: `${baseUrl}/api/submit`,
      claim_uri: `${baseUrl}/api/submit`,
      revocation_uri: `${baseUrl}/api/submit`,
      identity_types_supported: ['anonymous', 'verified_email', 'identity_assertion'],
      credential_types: ['none', 'bearer'],
      credential_types_supported: ['none', 'bearer'],
      anonymous: {
        credential_types_supported: ['none', 'bearer'],
        claim_uri: `${baseUrl}/api/submit`,
      },
      verified_email: {
        claim_uri: `${baseUrl}/api/submit`,
        credential_types_supported: ['none', 'bearer'],
      },
      identity_assertion: {
        assertion_types_supported: ['urn:ietf:params:oauth:token-type:id-jag', 'verified_email'],
        credential_types_supported: ['none', 'bearer'],
      },
    },
  });
});

agentReadyRouter.get('/.well-known/openid-configuration', (c) => {
  const host = c.req.header('host') || 'outbidwatch.lol';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;

  return c.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/auth/authorize`,
    token_endpoint: `${baseUrl}/auth/token`,
    userinfo_endpoint: `${baseUrl}/auth/userinfo`,
    jwks_uri: `${baseUrl}/auth/jwks.json`,
    response_types_supported: ['token', 'id_token'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256', 'none'],
    scopes_supported: ['openid', 'profile', 'public:read'],
    agent_auth: {
      skill: 'https://isitagentready.com/.well-known/agent-skills/auth-md/SKILL.md',
      register_uri: `${baseUrl}/api/submit`,
      claim_uri: `${baseUrl}/api/submit`,
      revocation_uri: `${baseUrl}/api/submit`,
      identity_types_supported: ['anonymous', 'verified_email', 'identity_assertion'],
      credential_types: ['none'],
    },
  });
});

// 11. /.well-known/acp.json & /.well-known/ucp (Agentic Commerce Protocols)
agentReadyRouter.get('/.well-known/acp.json', (c) => {
  const host = c.req.header('host') || 'outbidwatch.lol';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;

  return c.json({
    protocol: {
      name: 'acp',
      version: '1.0.0',
    },
    api_base_url: `${baseUrl}/api`,
    transports: ['http', 'https'],
    capabilities: {
      services: ['directory', 'timeline', 'submission'],
      pricing: 'free',
    },
  });
});

agentReadyRouter.get('/.well-known/ucp', (c) => {
  const host = c.req.header('host') || 'outbidwatch.lol';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;

  return c.json({
    ucp: {
      version: '1.0.0',
      name: 'OutbidWatch Commerce & Data Profile',
      capabilities: ['directory_query', 'feed_subscription'],
      services: ['directory', 'timeline'],
    },
    protocol_version: '1.0.0',
    endpoints: {
      directory: `${baseUrl}/api/sites`,
      timeline: `${baseUrl}/api/timeline`,
    },
  });
});

// 12. /openapi.json (OpenAPI 3.1.0 with 100% typed schemas & RFC 9457 Problem Details)
agentReadyRouter.get('/openapi.json', (c) => {
  const host = c.req.header('host') || 'outbidwatch.lol';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;

  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'OutbidWatch API & Workers Developer Resources',
      version: '1.2.0',
      description: 'Official API for querying outbid leaderboard startups, historical registration dates, and live X community discussions on Cloudflare Workers.',
      contact: {
        name: 'Awais Alwaisy',
        url: 'https://x.com/alvaisy',
      },
    },
    servers: [
      { url: baseUrl, description: 'Cloudflare Workers Production Server' },
      { url: `${baseUrl}/v1`, description: 'Version 1 API Alias' },
    ],
    paths: {
      '/api/sites': {
        get: {
          summary: 'List indexed outbid platforms',
          description: 'Returns a paginated list of verified pay-to-rank bidding platforms.',
          operationId: 'listSites',
          'x-payment-info': { intent: 'free', method: 'free', amount: 0, currency: 'USD' },
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: 'Page number' },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 25 }, description: 'Items per page' },
            { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Filter by category' },
            { name: 'sort', in: 'query', schema: { type: 'string', enum: ['oldest', 'newest', 'name'] }, description: 'Sort order' },
            { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Search query' },
          ],
          responses: {
            '200': {
              description: 'Successful site list response',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/SiteListResponse' } },
              },
            },
            '400': { $ref: '#/components/responses/BadRequestError' },
            '404': { $ref: '#/components/responses/NotFoundError' },
            '500': { $ref: '#/components/responses/InternalServerError' },
          },
        },
      },
      '/api/timeline': {
        get: {
          summary: 'Get curated real-time X posts about outbid platforms',
          description: 'Fetches latest community posts from Twitter/X discussing outbid leaderboards.',
          operationId: 'getTimeline',
          'x-payment-info': { intent: 'free', method: 'free', amount: 0, currency: 'USD' },
          responses: {
            '200': {
              description: 'Successful timeline response',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/TimelineResponse' } },
              },
            },
            '500': { $ref: '#/components/responses/InternalServerError' },
          },
        },
      },
      '/api/stats': {
        get: {
          summary: 'Get overall directory statistics',
          description: 'Returns aggregate numbers on total indexed platforms and oldest launches.',
          operationId: 'getStats',
          responses: {
            '200': {
              description: 'Successful stats response',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/StatsResponse' } },
              },
            },
            '500': { $ref: '#/components/responses/InternalServerError' },
          },
        },
      },
      '/api/submit': {
        post: {
          summary: 'Submit a new outbid platform',
          description: 'Enables AI agents and developers to submit newly discovered bidding websites for indexing.',
          operationId: 'submitPlatform',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SubmissionRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Platform submitted successfully',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/SubmissionResponse' } },
              },
            },
            '400': { $ref: '#/components/responses/BadRequestError' },
            '500': { $ref: '#/components/responses/InternalServerError' },
          },
        },
      },
    },
    components: {
      schemas: {
        SiteItem: {
          type: 'object',
          required: ['id', 'domain', 'status', 'category', 'url'],
          properties: {
            id: { type: 'string' },
            domain: { type: 'string' },
            site_name: { type: 'string' },
            category: { type: 'string' },
            status: { type: 'string', enum: ['live', 'dead', 'unclear'] },
            founder_x_handle: { type: 'string', nullable: true },
            founder_location: { type: 'string', nullable: true },
            domain_registration_date: { type: 'string', nullable: true },
            summary_256: { type: 'string', nullable: true },
            url: { type: 'string' },
            currency: { type: 'string' },
          },
        },
        SiteListResponse: {
          type: 'object',
          required: ['success', 'data', 'meta'],
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/SiteItem' },
            },
            meta: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total_pages: { type: 'integer' },
                has_next_page: { type: 'boolean' },
                has_prev_page: { type: 'boolean' },
              },
            },
            timestamp: { type: 'string' },
          },
        },
        TimelineTweet: {
          type: 'object',
          required: ['id', 'text', 'author_name', 'author_username', 'created_at', 'url'],
          properties: {
            id: { type: 'string' },
            text: { type: 'string' },
            author_name: { type: 'string' },
            author_username: { type: 'string' },
            author_verified: { type: 'boolean' },
            created_at: { type: 'string' },
            url: { type: 'string' },
            media_url: { type: 'string', nullable: true },
          },
        },
        TimelineResponse: {
          type: 'object',
          required: ['success', 'data'],
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/TimelineTweet' },
            },
            timestamp: { type: 'string' },
          },
        },
        StatsResponse: {
          type: 'object',
          required: ['success', 'data'],
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                total_sites: { type: 'integer' },
                live_sites: { type: 'integer' },
                dead_sites: { type: 'integer' },
              },
            },
            timestamp: { type: 'string' },
          },
        },
        SubmissionRequest: {
          type: 'object',
          required: ['url', 'domain', 'site_name', 'category'],
          properties: {
            url: { type: 'string', format: 'uri' },
            domain: { type: 'string' },
            site_name: { type: 'string' },
            category: { type: 'string' },
            founder_x_handle: { type: 'string' },
            submitter_note: { type: 'string' },
          },
        },
        SubmissionResponse: {
          type: 'object',
          required: ['success', 'message'],
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            site_id: { type: 'string' },
          },
        },
        ProblemDetails: {
          type: 'object',
          required: ['type', 'title', 'status', 'detail'],
          properties: {
            type: { type: 'string', example: 'https://outbidwatch.awaisalwaisy.workers.dev/errors/not-found' },
            title: { type: 'string', example: 'Resource Not Found' },
            status: { type: 'integer', example: 404 },
            detail: { type: 'string', example: 'The requested resource could not be found.' },
            instance: { type: 'string', example: '/api/sites' },
          },
        },
      },
      responses: {
        BadRequestError: {
          description: 'Bad Request - Invalid query parameters or body schema',
          content: {
            'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDetails' } },
            'application/json': { schema: { $ref: '#/components/schemas/ProblemDetails' } },
          },
        },
        NotFoundError: {
          description: 'Not Found - Requested board or resource does not exist',
          content: {
            'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDetails' } },
            'application/json': { schema: { $ref: '#/components/schemas/ProblemDetails' } },
          },
        },
        InternalServerError: {
          description: 'Internal Server Error - Unexpected processing fault',
          content: {
            'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDetails' } },
            'application/json': { schema: { $ref: '#/components/schemas/ProblemDetails' } },
          },
        },
      },
    },
  };

  c.header('Content-Type', 'application/json; charset=utf-8');
  c.header('Access-Control-Allow-Origin', '*');
  return c.json(spec);
});

// 13. Trust Anchor Pages: /about, /contact, /privacy
agentReadyRouter.get('/about', (c) => {
  const host = c.req.header('host') || 'outbidwatch.lol';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;

  const accept = c.req.header('Accept') || '';
  if (accept.includes('text/markdown')) {
    c.header('Content-Type', 'text/markdown; charset=utf-8');
    c.header('Vary', 'Accept, Accept-Encoding');
    return c.text(`# About OutbidWatch

OutbidWatch is the definitive historical directory and real-time observatory for the "pay-to-rank" bidding leaderboard mechanic started by outbid.lol.

## Mission
To catalog every verified outbid experiment, attribute early founders, record chronological domain registration dates, and provide open data to both humans and autonomous AI agents.

- **Founder & Maintainer**: Awais Alwaisy ([@alvaisy](https://x.com/alvaisy))
- **Live URL**: ${baseUrl}
- **Open Data API**: ${baseUrl}/api/sites
`);
  }

  const ogImage = `${baseUrl}/api/og?title=${encodeURIComponent('About OutbidWatch')}&tag=About&desc=${encodeURIComponent('Why I built OutbidWatch to document the pay-to-rank bidding platform trend.')}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>About OutbidWatch | Awais Alwaisy</title>
<meta name="description" content="Why I built OutbidWatch to document the pay-to-rank bidding platform trend.">
<link rel="canonical" href="${baseUrl}/about">
<meta property="og:title" content="About OutbidWatch">
<meta property="og:description" content="Why I built OutbidWatch to track pay-to-rank platforms chronologically by domain registration date.">
<meta property="og:type" content="website">
<meta property="og:image" content="${ogImage}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:creator" content="@alvaisy">
<meta name="twitter:image" content="${ogImage}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#BACB45">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css">
<script src="https://unpkg.com/@phosphor-icons/web@2.1.1" defer></script>
</head>
<body class="min-h-screen">

<div class="max-w-app mx-auto px-4 sm:px-6 min-h-screen flex flex-col justify-between">
  
  <!-- Header (Standard Site Width & Navigation) -->
  <header class="pt-6 pb-4 flex items-center justify-between sticky top-0 bg-[var(--paper)]/95 backdrop-blur z-30 border-b border-transparent">
    <a href="/" class="flex items-center gap-2.5">
      <div class="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm" style="background: var(--mosambi);">
        <i class="ph-fill ph-gavel text-[16px]" style="color:#1E2417;"></i>
      </div>
      <span class="display font-extrabold text-[18px] tracking-tight text-[var(--ink)]">outbidwatch</span>
    </a>
    <div class="flex items-center gap-2">
      <a href="/" class="pill px-3.5 py-1.5 text-[13px] font-semibold border border-[#E4E1D4] text-[#5B5A4E] hover:border-[#CCD99B] transition-colors">Directory</a>
      <a href="/timeline" class="pill px-3.5 py-1.5 text-[13px] font-semibold border border-[#E4E1D4] text-[#5B5A4E] hover:border-[#CCD99B] transition-colors">Timeline</a>
      <a href="/story" class="pill px-3.5 py-1.5 text-[13px] font-semibold border border-[#E4E1D4] text-[#5B5A4E] hover:border-[#CCD99B] transition-colors">Story</a>
      <a href="https://github.com/osspakistan/outbidwatch-lol" target="_blank" rel="noopener noreferrer" title="View Source on GitHub" class="pill px-3 py-1.5 text-[13px] font-semibold border border-[#E4E1D4] text-[#5B5A4E] hover:border-[#CCD99B] hover:text-[var(--ink)] transition-colors flex items-center gap-1.5">
        <i class="ph-bold ph-github-logo text-[15px]"></i>
        <span class="hidden sm:inline-block">GitHub</span>
      </a>
    </div>
  </header>

  <!-- Pure Plain Article Text -->
  <main class="py-8 flex-1">
    <h1 class="display font-extrabold text-[28px] sm:text-[34px] tracking-tight text-[var(--ink)] mb-6">
      About OutbidWatch
    </h1>

    <article class="space-y-5 text-[15.5px] sm:text-[16px] text-[#33372B] leading-relaxed max-w-2xl">
      <p>
        I built OutbidWatch to catalog and track the wave of "pay-to-rank" bidding leaderboards that exploded after Jonathan Wilke launched <code>outbid.lol</code> in August 2026.
      </p>

      <p>
        Within days, dozens of builders built regional, niche, and experimental clones. I wanted a permanent, clean place to track all of them.
      </p>

      <h2 class="display font-extrabold text-[20px] text-[var(--ink)] pt-4">
        How it works
      </h2>

      <p>
        Instead of ranking boards by volatile bid numbers that change every minute, I sort platforms strictly by their <strong>domain registration date (WHOIS date)</strong>. This gives an objective history showing who launched first and who copied later.
      </p>

      <p>
        I also maintain a live feed of builder launch tweets, downtime commentary, and community discussions from X.
      </p>

      <h2 class="display font-extrabold text-[20px] text-[var(--ink)] pt-4">
        How I built it
      </h2>

      <p>
        I originally spent 10 hours struggling to scrape and OCR every site with vision LLMs before getting completely cooked and pivoting to domain age sorting.
      </p>

      <p>
        👉 <a href="/story" class="font-bold text-[var(--ink)] underline hover:text-[var(--mosambi-dark)]">Read the story of how OutbidWatch started</a>
      </p>

      <h2 class="display font-extrabold text-[20px] text-[var(--ink)] pt-4">
        Maintainer
      </h2>

      <p>
        Built and maintained by <strong>Awais Alwaisy</strong>. Reach out to me on X at <a href="https://x.com/alvaisy" target="_blank" rel="noopener noreferrer" class="font-bold text-[var(--ink)] underline">@alvaisy</a>.
      </p>
    </article>
  </main>
  
  <!-- Footer (Standard Site Width & Style) -->
  <footer class="pb-10 pt-4 border-t border-[#ECEAE0] flex flex-col sm:flex-row items-center justify-between gap-3 text-[12.5px] text-[#8A8574]">
    <div class="flex items-center gap-2">
      <span class="font-bold text-[var(--ink)]">outbidwatch</span>
      <span>·</span>
      <span>Verified pay-to-rank platform directory</span>
    </div>
    <div class="flex items-center gap-3">
      <a href="/" class="hover:text-[var(--ink)] transition-colors">Directory</a>
      <span>·</span>
      <a href="/timeline" class="hover:text-[var(--ink)] transition-colors">Timeline</a>
      <span>·</span>
      <a href="/about" class="hover:text-[var(--ink)] transition-colors font-semibold text-[var(--ink)]">About</a>
      <span>·</span>
      <a href="/developers" class="hover:text-[var(--ink)] transition-colors">Developers</a>
      <span>·</span>
      <a href="/analytics" class="hover:text-[var(--ink)] transition-colors">Analytics</a>
      <span>·</span>
      <a href="https://github.com/osspakistan/outbidwatch-lol" target="_blank" rel="noopener noreferrer" class="hover:text-[var(--ink)] transition-colors flex items-center gap-1 font-medium">
        <i class="ph-bold ph-github-logo text-[13px]"></i> GitHub
      </a>
    </div>
  </footer>

</div>
</body>
</html>`;

  c.header('Content-Type', 'text/html; charset=utf-8');
  c.header('Vary', 'Accept, Accept-Encoding');
  return c.html(html);
});

agentReadyRouter.get('/contact', (c) => {
  return c.redirect('/about', 301);
});

agentReadyRouter.get('/privacy', (c) => {
  const host = c.req.header('host') || 'outbidwatch.lol';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;

  const accept = c.req.header('Accept') || '';
  if (accept.includes('text/markdown')) {
    c.header('Content-Type', 'text/markdown; charset=utf-8');
    c.header('Vary', 'Accept, Accept-Encoding');
    return c.text(`# Privacy Policy - OutbidWatch
OutbidWatch aggregates publicly available WHOIS domain registration dates, public X/Twitter posts, and web listings. I do not collect cookies, sell user tracking data, or require accounts.
`);
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Privacy Policy | OutbidWatch</title>
<link rel="canonical" href="${baseUrl}/privacy">
<link rel="stylesheet" href="/style.css">
</head>
<body class="min-h-screen">
<div class="max-w-app mx-auto px-4 sm:px-6 min-h-screen flex flex-col py-8">
  <h1 class="display text-[28px] font-extrabold text-[var(--ink)] mb-4">Privacy Policy</h1>
  <p class="text-[15px] text-[#5B5A4E] leading-relaxed mb-4">
    OutbidWatch respects your privacy. I index only public web platform information, public domain registration timestamps, and public social media discussions.
  </p>
  <div class="card p-6">
    <h2 class="display font-bold text-[18px] text-[var(--ink)] mb-2">No Tracking or Personal Data</h2>
    <p class="text-[14.5px] text-[#5B5A4E] leading-relaxed">
      I do not set analytics cookies, run ad trackers, or collect private user data. The directory is 100% open and readable by both humans and AI agents.
    </p>
  </div>
</div>
</body>
</html>`;

  c.header('Content-Type', 'text/html; charset=utf-8');
  c.header('Vary', 'Accept, Accept-Encoding');
  return c.html(html);
});

// Developer Portal & API Docs (/developers and /docs)
agentReadyRouter.get('/developers', (c) => renderDevPortal(c));
agentReadyRouter.get('/docs', (c) => renderDevPortal(c));

function renderDevPortal(c: any) {
  const host = c.req.header('host') || 'outbidwatch.lol';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;

  const accept = c.req.header('Accept') || '';
  if (accept.includes('text/markdown') || c.req.path.endsWith('.md')) {
    const md = `# OutbidWatch Developer & AI Agent Portal
> Developer documentation, OpenAPI 3.1 specifications, and Model Context Protocol (MCP) server integration.

## Base URLs
- **Production REST API**: \`${baseUrl}/api\`
- **API Version 1**: \`${baseUrl}/v1\`

## Machine & Agent Discovery Documents
- **LLM Context Guide**: [${baseUrl}/llms.txt](${baseUrl}/llms.txt)
- **Complete Plaintext Knowledge**: [${baseUrl}/llms-full.txt](${baseUrl}/llms-full.txt)
- **OpenAPI 3.1 Specification**: [${baseUrl}/openapi.json](${baseUrl}/openapi.json)
- **RFC 9727 API Catalog**: [${baseUrl}/.well-known/api-catalog](${baseUrl}/.well-known/api-catalog)
- **MCP Server Card (SEP-1649)**: [${baseUrl}/.well-known/mcp/server-card.json](${baseUrl}/.well-known/mcp/server-card.json)
- **Agent Skills Discovery**: [${baseUrl}/.well-known/agent-skills/index.json](${baseUrl}/.well-known/agent-skills/index.json)
- **Agent Registration & Auth**: [${baseUrl}/auth.md](${baseUrl}/auth.md)

## Core REST Endpoints
1. \`GET /api/sites?page=1&limit=25&category=all&sort=oldest\`: Paginated directory of bidding platforms.
2. \`GET /api/sites/:slug\`: Single platform profile lookup.
3. \`GET /api/timeline\`: Curated real-time builder discussions from X.
4. \`GET /api/stats\`: Platform metrics and oldest launch timeline.
5. \`POST /api/submit\`: Programmatic submission of new outbid platforms.

## Rate Limits
120 requests/minute per client IP. RateLimit headers (\`RateLimit-Limit\`, \`RateLimit-Remaining\`, \`RateLimit-Reset\`) are returned on all responses.
`;
    return c.body(md, 200, {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Vary': 'Accept, Accept-Encoding',
      'Cache-Control': 'public, max-age=3600',
    });
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Developer Portal & API Docs | OutbidWatch</title>
<meta name="description" content="Official developer documentation, OpenAPI 3.1 specification, MCP server integration, and REST endpoints for OutbidWatch.">
<link rel="canonical" href="${baseUrl}/developers">
<meta property="og:title" content="Developer Portal & API Docs | OutbidWatch">
<meta property="og:description" content="Official developer documentation, OpenAPI 3.1 specification, MCP server integration, and REST endpoints for OutbidWatch.">
<meta property="og:url" content="${baseUrl}/developers">
<meta property="og:type" content="website">
<meta property="og:image" content="${baseUrl}/api/logos/outbid.lol.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:creator" content="@alvaisy">
<meta name="twitter:image" content="${baseUrl}/api/logos/outbid.lol.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css">
<script src="https://unpkg.com/@phosphor-icons/web@2.1.1" defer></script>
</head>
<body class="min-h-screen">

<div class="max-w-app mx-auto px-4 sm:px-6 min-h-screen flex flex-col py-8">
  <header class="pb-6 flex items-center justify-between border-b border-[#E4E1D4]/60 mb-8">
    <a href="/" class="flex items-center gap-2.5">
      <div class="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm" style="background: var(--mosambi);">
        <i class="ph-fill ph-gavel text-[16px]" style="color:#1E2417;"></i>
      </div>
      <span class="display font-extrabold text-[18px] tracking-tight text-[var(--ink)]">outbidwatch</span>
    </a>
    <div class="flex items-center gap-2">
      <a href="/" class="pill px-3.5 py-1.5 text-[13px] font-semibold border border-[#E4E1D4] text-[#5B5A4E] hover:border-[#CCD99B]">Directory</a>
      <a href="/timeline" class="pill px-3.5 py-1.5 text-[13px] font-semibold border border-[#E4E1D4] text-[#5B5A4E] hover:border-[#CCD99B]">Timeline</a>
      <a href="/map" class="pill px-3.5 py-1.5 text-[13px] font-semibold border border-[#E4E1D4] text-[#5B5A4E] hover:border-[#CCD99B]">Map</a>
    </div>
  </header>

  <main class="space-y-8">
    <div>
      <h1 class="display font-extrabold text-[32px] text-[var(--ink)] mb-2">Developer & AI Agent Portal</h1>
      <p class="text-[15.5px] text-[#5B5A4E] max-w-2xl leading-relaxed">
        OutbidWatch provides 100% open, high-performance REST APIs, Model Context Protocol (MCP) toolkits, and machine-readable discovery specifications for human developers and autonomous AI agents.
      </p>
    </div>

    <!-- Quick Links Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      <a href="/openapi.json" target="_blank" class="card p-5 hover:border-[#CCD99B] transition-all group">
        <div class="w-10 h-10 rounded-xl bg-[#EBF0D2] flex items-center justify-center mb-3 text-[#556B2F]">
          <i class="ph-bold ph-code text-[20px]"></i>
        </div>
        <h3 class="font-bold text-[16px] text-[var(--ink)] group-hover:text-[#556B2F]">OpenAPI 3.1 Spec</h3>
        <p class="text-[13px] text-[#8A8574] mt-1">Full typed schemas & endpoints.</p>
      </a>

      <a href="/.well-known/mcp/server-card.json" target="_blank" class="card p-5 hover:border-[#CCD99B] transition-all group">
        <div class="w-10 h-10 rounded-xl bg-[#EBF0D2] flex items-center justify-center mb-3 text-[#556B2F]">
          <i class="ph-bold ph-cpu text-[20px]"></i>
        </div>
        <h3 class="font-bold text-[16px] text-[var(--ink)] group-hover:text-[#556B2F]">MCP Server Card</h3>
        <p class="text-[13px] text-[#8A8574] mt-1">Model Context Protocol for LLMs.</p>
      </a>

      <a href="/llms.txt" target="_blank" class="card p-5 hover:border-[#CCD99B] transition-all group">
        <div class="w-10 h-10 rounded-xl bg-[#EBF0D2] flex items-center justify-center mb-3 text-[#556B2F]">
          <i class="ph-bold ph-sparkle text-[20px]"></i>
        </div>
        <h3 class="font-bold text-[16px] text-[var(--ink)] group-hover:text-[#556B2F]">llms.txt Guide</h3>
        <p class="text-[13px] text-[#8A8574] mt-1">Agent instructions & data models.</p>
      </a>

      <a href="https://github.com/osspakistan/outbidwatch-lol" target="_blank" rel="noopener noreferrer" class="card p-5 hover:border-[#CCD99B] transition-all group">
        <div class="w-10 h-10 rounded-xl bg-[#EBF0D2] flex items-center justify-center mb-3 text-[#556B2F]">
          <i class="ph-bold ph-github-logo text-[20px]"></i>
        </div>
        <h3 class="font-bold text-[16px] text-[var(--ink)] group-hover:text-[#556B2F]">GitHub Source</h3>
        <p class="text-[13px] text-[#8A8574] mt-1">Open source & MIT licensed.</p>
      </a>
    </div>

    <!-- API Reference Cards -->
    <div class="card p-6 sm:p-8 space-y-6">
      <h2 class="display font-bold text-[20px] text-[var(--ink)]">REST API Quickstart</h2>

      <div>
        <div class="flex items-center gap-2 mb-2">
          <span class="pill px-2.5 py-0.5 text-[11px] font-bold bg-[#EBF0D2] text-[#556B2F]">GET</span>
          <code class="font-mono text-[14px] text-[var(--ink)] font-semibold">/api/sites</code>
        </div>
        <p class="text-[14px] text-[#5B5A4E] mb-2">Fetch paginated list of all 192 bidding platforms with categories and founder handles.</p>
        <pre class="bg-[#1E2417] text-[#D8E69E] p-4 rounded-xl text-[13px] font-mono overflow-x-auto"><code>curl -s "${baseUrl}/api/sites?page=1&limit=10&sort=oldest" | jq</code></pre>
      </div>

      <div>
        <div class="flex items-center gap-2 mb-2">
          <span class="pill px-2.5 py-0.5 text-[11px] font-bold bg-[#EBF0D2] text-[#556B2F]">GET</span>
          <code class="font-mono text-[14px] text-[var(--ink)] font-semibold">/api/timeline</code>
        </div>
        <p class="text-[14px] text-[#5B5A4E] mb-2">Fetch curated real-time X posts about outbid leaderboards.</p>
        <pre class="bg-[#1E2417] text-[#D8E69E] p-4 rounded-xl text-[13px] font-mono overflow-x-auto"><code>curl -s "${baseUrl}/api/timeline" | jq</code></pre>
      </div>
    </div>
  </main>
</div>
</body>
</html>`;

  c.header('Content-Type', 'text/html; charset=utf-8');
  c.header('Vary', 'Accept, Accept-Encoding');
  return c.html(html);
}
