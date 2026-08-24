import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import type { Env, AppVariables } from '../types/env';
import { getDb } from '../db/index';
import { generateCodename } from '../lib/codename';
import { parseDevice, parseGeo } from '../lib/device-geo';

const USER_COOKIE = 'ob_uid';
const SESSION_COOKIE = 'ob_sid';

export const analyticsApiRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

/**
 * POST /api/analytics/event - Ingest client-side button clicks & custom events
 * Receives data via navigator.sendBeacon or fetch()
 */
analyticsApiRouter.post('/event', async (c) => {
  try {
    let body: any = {};
    const contentType = c.req.header('content-type') || '';

    if (contentType.includes('application/json') || contentType.includes('text/plain')) {
      const text = await c.req.text();
      try {
        body = JSON.parse(text);
      } catch {
        body = {};
      }
    } else {
      body = await c.req.parseBody().catch(() => ({}));
    }

    const eventName = body.event || body.eventName || 'click';
    const eventType = body.type || 'click';
    const path = body.path || c.req.header('referer') || '/';
    const metadata = body.data || body.metadata || {};

    let uid = getCookie(c, USER_COOKIE);
    let sid = getCookie(c, SESSION_COOKIE);

    if (!uid) uid = crypto.randomUUID();
    if (!sid) sid = crypto.randomUUID();

    const { codename } = generateCodename(uid);
    const userAgent = c.req.header('user-agent');
    const device = parseDevice(userAgent);

    if (device.isBot) {
      return c.json({ ok: false, reason: 'bot_ignored' });
    }

    const geo = parseGeo((c.req.raw as any).cf, c.req.raw.headers);
    const db = getDb(c.env.DB);

    const recordPromise = db.analytics.recordHit({
      userId: uid,
      sessionId: sid,
      codename,
      path,
      geo,
      device,
      isNewSession: false,
      isNewUser: false,
      eventType: eventType === 'custom' ? 'custom' : 'click',
      eventName,
      metadata
    });

    if (c.executionCtx && typeof c.executionCtx.waitUntil === 'function') {
      c.executionCtx.waitUntil(recordPromise);
    } else {
      await recordPromise;
    }

    return c.json({ ok: true });
  } catch (err: any) {
    console.error('[Analytics Event API Error]:', err);
    return c.json({ ok: false, error: err.message }, 400);
  }
});

/**
 * GET /api/analytics/live - Real-time active users and pages
 */
analyticsApiRouter.get('/live', async (c) => {
  try {
    const minutes = Math.min(Math.max(Number(c.req.query('minutes')) || 3, 1), 30);
    const db = getDb(c.env.DB);
    const liveData = await db.analytics.getLiveTraffic(minutes);
    return c.json({
      status: 'ok',
      ...liveData,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return c.json({ status: 'error', message: err.message }, 500);
  }
});

/**
 * GET /api/analytics/stats - Overview metrics (top pages, referrers, locations)
 */
analyticsApiRouter.get('/stats', async (c) => {
  try {
    const hours = Math.min(Math.max(Number(c.req.query('hours')) || 24, 1), 168);
    const db = getDb(c.env.DB);
    const overview = await db.analytics.getOverview(hours);
    return c.json({
      status: 'ok',
      timeRangeHours: hours,
      ...overview,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return c.json({ status: 'error', message: err.message }, 500);
  }
});

/**
 * GET /api/analytics/campaigns - Outreach campaign & ref=x_{username} stats
 */
analyticsApiRouter.get('/campaigns', async (c) => {
  try {
    const db = getDb(c.env.DB);
    const campaigns = await db.analytics.getCampaigns();
    return c.json({
      status: 'ok',
      totalCampaigns: campaigns.length,
      campaigns
    });
  } catch (err: any) {
    return c.json({ status: 'error', message: err.message }, 500);
  }
});

/**
 * GET /api/analytics/user/:identifier - Detailed User Dossier & Userflow Journey
 */
analyticsApiRouter.get('/user/:identifier', async (c) => {
  try {
    const identifier = decodeURIComponent(c.req.param('identifier'));
    const db = getDb(c.env.DB);
    const dossier = await db.analytics.getUserDossier(identifier);

    if (!dossier) {
      return c.json({ status: 'not_found', message: `User '${identifier}' not found` }, 404);
    }

    return c.json({
      status: 'ok',
      dossier
    });
  } catch (err: any) {
    return c.json({ status: 'error', message: err.message }, 500);
  }
});
