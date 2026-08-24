import { cors } from 'hono/cors';
import type { MiddlewareHandler } from 'hono';
import type { Env, AppVariables } from '../types/env';

/**
 * Environment-Aware CORS Middleware
 * In production: Strictly restricts mutating requests to your configured domains.
 * In development: Permits local origins for rapid development.
 */
export const corsMiddleware: MiddlewareHandler<{ Bindings: Env; Variables: AppVariables }> = async (c, next) => {
  const isProd = c.env.ENVIRONMENT === 'production';
  const allowed = (c.env.ALLOWED_ORIGINS || 'outbidwatch.lol,www.outbidwatch.lol,outbidwatch.awaisalwaisy.workers.dev')
    .split(',')
    .map((d) => d.trim().toLowerCase());

  const originHandler = (reqOrigin: string) => {
    if (!isProd) return reqOrigin || '*';
    if (!reqOrigin) return 'https://outbidwatch.lol';

    try {
      const url = new URL(reqOrigin);
      if (allowed.some((dom) => url.hostname === dom || url.hostname.endsWith(`.${dom}`))) {
        return reqOrigin;
      }
    } catch {}

    // For public GET requests, allow standard caching, but for others restrict
    return 'https://outbidwatch.lol';
  };

  const handler = cors({
    origin: originHandler,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Admin-Secret', 'X-Requested-With'],
    exposeHeaders: ['Content-Length', 'X-Response-Time', 'X-Request-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    maxAge: 86400,
  });

  return handler(c, next);
};
