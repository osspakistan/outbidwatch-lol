import type { MiddlewareHandler } from 'hono';
import type { Env, AppVariables } from '../types/env';

/**
 * Strict Admin Authentication Middleware
 * Protects administrative review, approval, and mutation endpoints.
 * Requires Bearer token or X-Admin-Secret header matching env.ADMIN_API_KEY.
 */
export const adminAuthMiddleware: MiddlewareHandler<{ Bindings: Env; Variables: AppVariables }> = async (c, next) => {
  const adminKey = c.env.ADMIN_API_KEY;

  // In production, if no key is configured, block all administrative requests by default
  if (!adminKey) {
    if (c.env.ENVIRONMENT === 'production') {
      return c.json({
        success: false,
        error: 'Forbidden: Admin authentication key is not configured on production',
      }, 403);
    }
    // In local dev mode without key, allow with next
    await next();
    return;
  }

  const authHeader = c.req.header('Authorization');
  const secretHeader = c.req.header('X-Admin-Secret');

  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (secretHeader) {
    token = secretHeader.trim();
  }

  if (!token || token !== adminKey) {
    return c.json({
      success: false,
      error: 'Unauthorized: Valid Admin API key is required to access maintainer backend',
    }, 401);
  }

  await next();
};
