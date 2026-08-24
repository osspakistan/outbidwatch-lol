import { Hono } from 'hono';
import type { Env, AppVariables } from '../types/env';
import { fetchTimelineTweets } from '../lib/x-search';

export const timelineApiRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

timelineApiRouter.get('/', async (c) => {
  const result = await fetchTimelineTweets(c.env);
  return c.json({
    success: true,
    data: result.tweets,
    meta: {
      query: result.query,
      source: result.source,
      cached_at: result.cached_at,
      count: result.tweets.length,
    },
  });
});
