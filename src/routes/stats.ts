import { Hono } from 'hono';
import type { Env, AppVariables } from '../types/env';
import type { ApiResponse, DirectoryStats } from '../types/api';
import { getDb } from '../db/index';

export const statsRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// GET /api/stats - High level metrics, category/country distributions
statsRouter.get('/', async (c) => {
  const db = getDb(c.env.DB);
  const stats = await db.getStats();

  return c.json<ApiResponse<DirectoryStats>>({
    success: true,
    data: stats,
    timestamp: new Date().toISOString(),
  });
});
