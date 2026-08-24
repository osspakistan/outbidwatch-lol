import type { MiddlewareHandler } from 'hono';
import type { Env, AppVariables } from '../types/env';

/**
 * Strict Origin Guard Middleware
 * Prevents third-party websites or malicious scripts from forging submissions.
 * Verifies Sec-Fetch-Site, Origin, and Referer headers against allowed domains.
 */
export const originGuardMiddleware: MiddlewareHandler<{ Bindings: Env; Variables: AppVariables }> = async (c, next) => {
  // Allow all GET/HEAD requests
  if (c.req.method === 'GET' || c.req.method === 'HEAD' || c.req.method === 'OPTIONS') {
    await next();
    return;
  }

  const origin = c.req.header('Origin') || '';
  const referer = c.req.header('Referer') || '';
  const secFetchSite = c.req.header('Sec-Fetch-Site') || '';

  // In development, allow localhost/127.0.0.1
  const isDev = c.env.ENVIRONMENT !== 'production';
  if (isDev) {
    await next();
    return;
  }

  // Check allowed origins list from environment or default domain
  const allowed = (c.env.ALLOWED_ORIGINS || 'outbidwatch.lol,www.outbidwatch.lol,outbidwatch.awaisalwaisy.workers.dev')
    .split(',')
    .map((d) => d.trim().toLowerCase());

  let isAllowed = false;

  // Check origin
  if (origin) {
    try {
      const url = new URL(origin);
      if (allowed.some((dom) => url.hostname === dom || url.hostname.endsWith(`.${dom}`))) {
        isAllowed = true;
      }
    } catch {}
  }

  // Check referer if origin not present
  if (!isAllowed && referer) {
    try {
      const url = new URL(referer);
      if (allowed.some((dom) => url.hostname === dom || url.hostname.endsWith(`.${dom}`))) {
        isAllowed = true;
      }
    } catch {}
  }

  // Browser Sec-Fetch-Site check: same-origin or same-site allowed
  if (secFetchSite && (secFetchSite === 'same-origin' || secFetchSite === 'same-site')) {
    isAllowed = true;
  }

  if (!isAllowed) {
    return c.json({
      success: false,
      error: 'Forbidden: Request origin is not permitted to mutate OutbidWatch data',
    }, 403);
  }

  await next();
};
