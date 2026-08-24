import type { MiddlewareHandler } from 'hono';
import type { Env, AppVariables } from '../types/env';

export const loggerMiddleware: MiddlewareHandler<{ Bindings: Env; Variables: AppVariables }> = async (c, next) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  const startTime = Date.now();

  c.set('requestId', requestId);
  c.set('startTime', startTime);

  await next();

  const duration = Date.now() - startTime;
  c.res.headers.set('X-Response-Time', `${duration}ms`);
  c.res.headers.set('X-Request-Id', requestId);
};
