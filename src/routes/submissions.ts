import { Hono } from 'hono';
import type { Env, AppVariables } from '../types/env';
import type { SubmissionStatus, ApproveSubmissionPayload } from '../types/site';
import { getDb } from '../db/index';
import { adminAuthMiddleware } from '../middleware/auth';

export const submissionsRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// Protect ALL submissions routes with Admin Authentication
submissionsRouter.use('*', adminAuthMiddleware);

// GET /api/submissions - List submissions by status (pending, approved, rejected) [ADMIN ONLY]
submissionsRouter.get('/', async (c) => {
  const status = (c.req.query('status') || 'pending') as SubmissionStatus;
  const db = getDb(c.env.DB);
  const list = await db.listSubmissions(status);

  return c.json({
    success: true,
    data: list,
    total: list.length,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/submissions/:id - Get single submission details [ADMIN ONLY]
submissionsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb(c.env.DB);
  const item = await db.getSubmissionById(id);

  if (!item) {
    return c.json({ success: false, error: `Submission with id '${id}' not found` }, 404);
  }

  return c.json({
    success: true,
    data: item,
    timestamp: new Date().toISOString(),
  });
});

// POST /api/submissions/:id/approve - Maintainer approval & promotion to sites table [ADMIN ONLY]
submissionsRouter.post('/:id/approve', async (c) => {
  const id = c.req.param('id');
  let body: ApproveSubmissionPayload;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON payload' }, 400);
  }

  if (!body.category || typeof body.category !== 'string') {
    return c.json({ success: false, error: 'Field "category" is required for approval' }, 400);
  }

  if (!body.summary_256 || typeof body.summary_256 !== 'string') {
    return c.json({ success: false, error: 'Field "summary_256" is required for approval' }, 400);
  }

  const db = getDb(c.env.DB);

  try {
    const site = await db.approveSubmission(id, body);
    return c.json({
      success: true,
      message: `Submission '${id}' approved and promoted to live platform '${site.domain}'`,
      data: site,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to approve submission' }, 400);
  }
});

// POST /api/submissions/:id/reject - Maintainer rejection [ADMIN ONLY]
submissionsRouter.post('/:id/reject', async (c) => {
  const id = c.req.param('id');
  let body: { reason?: string } = {};

  try {
    body = await c.req.json();
  } catch {}

  const reason = body.reason?.trim() || 'Did not meet outbid leaderboard criteria';
  const db = getDb(c.env.DB);

  try {
    const updated = await db.rejectSubmission(id, reason);
    return c.json({
      success: true,
      message: `Submission '${id}' marked as rejected`,
      data: updated,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to reject submission' }, 400);
  }
});
