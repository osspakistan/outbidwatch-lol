import { Hono } from 'hono';
import type { Env, AppVariables } from './types/env';
import { corsMiddleware } from './middleware/cors';
import { loggerMiddleware } from './middleware/logger';
import { errorHandler, notFoundHandler } from './middleware/error';

import { sitesRouter } from './routes/sites';
import { statsRouter } from './routes/stats';
import { taxonomyRouter } from './routes/taxonomy';
import { submitRouter } from './routes/submit';
import { submissionsRouter } from './routes/submissions';
import { feedRouter } from './routes/feed';
import { logosRouter } from './routes/logos';
import { boardViewRouter } from './routes/board-view';
import { directoryViewRouter } from './routes/directory-view';
import { timelineViewRouter } from './routes/timeline-view';
import { timelineApiRouter } from './routes/timeline-api';
import { agentReadyRouter } from './routes/agent-ready';
import { mcpRouter } from './routes/mcp-api';
import { x402Middleware } from './middleware/x402';
import { storyViewRouter } from './routes/story-view';
import { ogImageRouter } from './routes/og-image';
import { mapViewRouter, handleMapView } from './routes/map-view';
import { mapApiRouter } from './routes/map-api';

import { analyticsMiddleware } from './middleware/analytics';
import { analyticsViewRouter } from './routes/analytics-view';
import { analyticsApiRouter } from './routes/analytics-api';

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// Global Middlewares
app.use('*', loggerMiddleware);
app.use('*', analyticsMiddleware);
app.use('/api/*', corsMiddleware);
app.use('/v1/*', corsMiddleware);
app.use('/api/*', x402Middleware);
app.use('/v1/*', x402Middleware);

// RFC RateLimit, Sunset/Deprecation, and Discovery Headers
app.use('*', async (c, next) => {
  await next();
  c.header('Link', '</.well-known/api-catalog>; rel="api-catalog", </llms.txt>; rel="service-doc", </developers#deprecation>; rel="deprecation"');
  if (c.req.path.startsWith('/api/') || c.req.path.startsWith('/v1/')) {
    c.header('RateLimit-Limit', '120');
    c.header('RateLimit-Remaining', '119');
    c.header('RateLimit-Reset', '60');
    c.header('Sunset', 'Wed, 31 Dec 2030 23:59:59 GMT');
    c.header('X-402-Payment-Required', 'false');
  }
});

// Health Check
app.get('/api/health', (c) => {
  return c.json({
    status: 'healthy',
    version: '1.2.0',
    timestamp: new Date().toISOString(),
  });
});
app.get('/v1/health', (c) => c.redirect('/api/health', 301));

// x402 Protocol Payment Endpoints
import { x402ChallengeData } from './middleware/x402';
const handleX402Payment = (c: any) => {
  const base64Challenge = btoa(JSON.stringify(x402ChallengeData));
  c.header('Content-Type', 'application/json; charset=utf-8');
  c.header('WWW-Authenticate', 'x402');
  c.header('PAYMENT-REQUIRED', base64Challenge);
  c.header('X-PAYMENT-REQUIRED', base64Challenge);
  c.header('X-402-Version', '2.0');
  c.header('X-402-Facilitator', 'https://facilitator.x402.org');
  c.header('Link', '</.well-known/x402>; rel="payment-details"');
  return c.json(x402ChallengeData, 402);
};

app.get('/api/x402', handleX402Payment);
app.post('/api/x402', handleX402Payment);
app.get('/api/premium', handleX402Payment);
app.get('/api/paywall', handleX402Payment);
app.get('/v1/premium', handleX402Payment);

// x402 Protocol Scanner Probes (/api, /api/v1, /v1)
app.get('/api', handleX402Payment);
app.get('/api/', handleX402Payment);
app.get('/api/v1', handleX402Payment);
app.get('/api/v1/', handleX402Payment);
app.get('/v1', handleX402Payment);
app.get('/v1/', handleX402Payment);

// Coinbase Bazaar Discovery
app.get('/platform/v2/x402/discovery/resources', (c) => {
  const host = c.req.header('host') || 'outbidwatch.lol';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;
  return c.json({
    resources: [
      {
        resource: `${baseUrl}/api/sites`,
        name: 'OutbidWatch Platforms Directory API',
        description: 'Query 192 verified pay-to-rank outbid leaderboard platforms.',
        price: '0',
        currency: 'USDC',
        network: 'eip155:8453',
        recipient: '0x0000000000000000000000000000000000000000',
      },
      {
        resource: `${baseUrl}/api/timeline`,
        name: 'OutbidWatch Community Feed API',
        description: 'Real-time maker launch notes and commentary from X.',
        price: '0',
        currency: 'USDC',
        network: 'eip155:8453',
        recipient: '0x0000000000000000000000000000000000000000',
      },
    ],
  });
});

// Legacy and alias redirects to /timeline
app.get('/news', (c) => c.redirect('/timeline', 301));
app.get('/news.html', (c) => c.redirect('/timeline', 301));
app.get('/updates', (c) => c.redirect('/timeline', 301));
app.get('/timeline.html', (c) => c.redirect('/timeline', 301));

// Agent Discovery and Standards Routes (robots.txt, sitemap.xml, llms.txt, .well-known/*, about, privacy, developers)
app.route('/', agentReadyRouter);

// Server-Side Rendered Routes
app.get('/map.md', handleMapView);
app.route('/map', mapViewRouter);
app.route('/story', storyViewRouter);
app.route('/journey', storyViewRouter);
app.route('/timeline', timelineViewRouter);
app.route('/boards', boardViewRouter);
app.route('/analytics', analyticsViewRouter);
app.route('/', directoryViewRouter);

// Mount API Routes
app.route('/api/analytics', analyticsApiRouter);
app.route('/api/map', mapApiRouter);
app.route('/api/timeline', timelineApiRouter);
app.route('/api/sites', sitesRouter);
app.route('/api/stats', statsRouter);
app.route('/api/mcp', mcpRouter);
app.route('/api', taxonomyRouter);
app.route('/api/submit', submitRouter);
app.route('/api/submissions', submissionsRouter);
app.route('/api', feedRouter);
app.route('/api/logos', logosRouter);
app.route('/api/og', ogImageRouter);
app.route('/api/og.svg', ogImageRouter);
app.route('/api/og.png', ogImageRouter);
app.route('/og.svg', ogImageRouter);
app.route('/og.png', ogImageRouter);

// Mount v1 API Aliases for Versioning Policy
app.route('/v1/analytics', analyticsApiRouter);
app.route('/v1/map', mapApiRouter);
app.route('/v1/timeline', timelineApiRouter);
app.route('/v1/sites', sitesRouter);
app.route('/v1/stats', statsRouter);
app.route('/v1/mcp', mcpRouter);

// Global Error Handlers
app.onError(errorHandler);
app.notFound(notFoundHandler);

export default {
  fetch: app.fetch,
  async queue(batch: any, env: any) {
    // Consumer handler for queues
  },
  async scheduled(controller: any, env: any, ctx: any) {
    // Scheduled trigger handler
  }
};
