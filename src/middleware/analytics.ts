import type { Context, MiddlewareHandler } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import type { Env, AppVariables } from '../types/env';
import { generateCodename } from '../lib/codename';
import { parseDevice, parseGeo } from '../lib/device-geo';
import { getDb } from '../db/index';

const USER_COOKIE = 'ob_uid';
const SESSION_COOKIE = 'ob_sid';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const THIRTY_MINUTES_SECONDS = 60 * 30;

// Extensions / paths to completely ignore for page analytics
const IGNORED_EXTENSIONS = /\.(css|js|map|png|jpg|jpeg|gif|svg|ico|webmanifest|txt|xml|woff|woff2|ttf|eot)$/i;

export const analyticsMiddleware: MiddlewareHandler<{ Bindings: Env; Variables: AppVariables }> = async (c, next) => {
  const path = c.req.path;
  const method = c.req.method;

  // Skip static assets, internal webhooks, or openapi specs
  if (
    IGNORED_EXTENSIONS.test(path) ||
    path.startsWith('/api/logos/') ||
    path.startsWith('/api/og') ||
    path.startsWith('/og.') ||
    path === '/favicon.ico'
  ) {
    return next();
  }

  // 1. Identify User ID & Session ID from HttpOnly cookies
  let uid = getCookie(c, USER_COOKIE);
  let isNewUser = false;

  if (!uid) {
    uid = crypto.randomUUID();
    isNewUser = true;
  }

  let sid = getCookie(c, SESSION_COOKIE);
  let isNewSession = false;

  if (!sid) {
    sid = crypto.randomUUID();
    isNewSession = true;
  }

  const { codename, emoji } = generateCodename(uid);

  // Attach to context variables so downstream handlers/templates know who this is
  c.set('analytics', {
    userId: uid,
    sessionId: sid,
    codename,
    emoji
  });

  const isSecure = !c.req.header('host')?.includes('localhost');

  // Set / Refresh HttpOnly Cookies on Response
  setCookie(c, USER_COOKIE, uid, {
    path: '/',
    httpOnly: true,
    secure: isSecure,
    sameSite: 'Lax',
    maxAge: ONE_YEAR_SECONDS,
  });

  setCookie(c, SESSION_COOKIE, sid, {
    path: '/',
    httpOnly: true,
    secure: isSecure,
    sameSite: 'Lax',
    maxAge: THIRTY_MINUTES_SECONDS,
  });

  // Execute request first so response is not delayed
  await next();

  // If this was an API collection request or analytics dashboard internal polling, don't record double
  if (path.startsWith('/api/analytics/')) {
    return;
  }

  // Only record GET requests for pageviews (non-API HTML / view routes or page routes)
  if (method === 'GET' && c.res.status === 200 && c.env.DB) {
    const userAgent = c.req.header('user-agent');
    const device = parseDevice(userAgent);

    // Filter aggressive automated crawlers from polluting analytics
    if (device.isBot) {
      return;
    }

    const geo = parseGeo((c.req.raw as any).cf, c.req.raw.headers);
    const referrer = c.req.header('referer') || c.req.header('referrer');
    const refTag = c.req.query('ref') || undefined;
    const utmSource = c.req.query('utm_source') || undefined;
    const utmCampaign = c.req.query('utm_campaign') || undefined;

    const db = getDb(c.env.DB);
    const recordPromise = db.analytics.recordHit({
      userId: uid,
      sessionId: sid,
      codename,
      path,
      referrer,
      refTag,
      utmSource,
      utmCampaign,
      geo,
      device,
      isNewSession,
      isNewUser,
      eventType: 'pageview',
      eventName: 'page_load'
    });

    if (c.executionCtx && typeof c.executionCtx.waitUntil === 'function') {
      c.executionCtx.waitUntil(recordPromise);
    } else {
      // Local or test environment
      await recordPromise.catch(err => console.error('[Analytics Middleware Error]:', err));
    }
  }
};
