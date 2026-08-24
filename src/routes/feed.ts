import { Hono } from 'hono';
import type { Env, AppVariables } from '../types/env';
import { getDb } from '../db/index';

export const feedRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// GET /api/feed.json - Standard JSON Feed v1.1 for aggregators and readers
feedRouter.get('/feed.json', async (c) => {
  const db = getDb(c.env.DB);
  const { sites } = await db.listSites({ limit: 50, order_by: 'created_at', order_dir: 'desc' });

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'OutbidWatch Feed',
    home_page_url: 'https://outbidwatch.lol',
    feed_url: `${c.req.url}`,
    description: 'The definitive directory and lineage tracker for pay-to-rank outbid platforms.',
    items: sites.map((s) => ({
      id: s.id,
      url: s.url,
      title: `${s.site_name} (${s.country_flag} ${s.country_name})`,
      content_text: s.summary_256,
      date_published: s.domain_registration_date,
      date_modified: s.updated_at,
      authors: [
        {
          name: `@${s.founder_x_handle}`,
          url: `https://x.com/${s.founder_x_handle}`,
        },
      ],
      tags: [s.category, s.currency, s.status],
    })),
  };

  return c.json(feed);
});
