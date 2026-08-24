import { Hono } from 'hono';
import type { Env, AppVariables } from '../types/env';
import type { SubmissionInput } from '../types/site';
import { getDb } from '../db/index';
import { originGuardMiddleware } from '../middleware/origin-guard';
import { rateLimiter } from '../middleware/rate-limit';

export const submitRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// GET /api/submit/check?domain=example.com - Live Duplicate Checker (Public)
submitRouter.get('/check', async (c) => {
  const domain = c.req.query('domain');

  if (!domain || !domain.trim()) {
    return c.json({ success: false, error: 'Query parameter "domain" is required' }, 400);
  }

  const db = getDb(c.env.DB);
  const result = await db.checkDomainStatus(domain.trim());

  return c.json({
    success: true,
    data: result,
    timestamp: new Date().toISOString(),
  });
});

// POST /api/submit - Submit a new platform (Origin-Guarded & Rate-Limited)
submitRouter.post(
  '/',
  originGuardMiddleware,
  rateLimiter({ maxRequests: 5, windowSeconds: 600 }), // Max 5 submissions per 10 mins per IP
  async (c) => {
    let body: SubmissionInput;

    try {
      body = await c.req.json();
    } catch {
      return c.json({ success: false, error: 'Invalid JSON payload' }, 400);
    }

    if (!body.url || !body.url.trim()) {
      return c.json({ success: false, error: 'Field "url" is required' }, 400);
    }

    if (!body.founder_x_handle || !body.founder_x_handle.trim()) {
      return c.json({ success: false, error: 'Field "founder_x_handle" is required' }, 400);
    }

    if (!body.location || !body.location.trim()) {
      return c.json({ success: false, error: 'Field "location" is required (City, Country)' }, 400);
    }

    if (!body.launch_date || !body.launch_date.trim()) {
      return c.json({ success: false, error: 'Field "launch_date" is required (YYYY-MM-DD)' }, 400);
    }

    const db = getDb(c.env.DB);

    try {
      const cleanUrl = body.url.trim().startsWith('http') ? body.url.trim() : `https://${body.url.trim()}`;
      const domain = new URL(cleanUrl).hostname.replace(/^www\./, '').toLowerCase();

      // Enforce duplicate check before creating submission
      const statusCheck = await db.checkDomainStatus(domain);
      if (statusCheck.exists) {
        return c.json({
          success: false,
          error: statusCheck.message,
          data: statusCheck.data,
        }, 409);
      }

      const submission = await db.createSubmission(body);

      return c.json({
        success: true,
        message: 'Platform submission successfully queued for maintainer review',
        data: submission,
        timestamp: new Date().toISOString(),
      }, 201);
    } catch (err: any) {
      return c.json({ success: false, error: err.message || 'Failed to process submission' }, 400);
    }
  }
);
