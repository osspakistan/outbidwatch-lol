import { Hono } from 'hono';
import type { Env, AppVariables } from '../types/env';
import type { SiteFilters } from '../types/site';
import type { ApiResponse } from '../types/api';
import { getDb } from '../db/index';
import { enrichSiteLogo } from '../lib/utils';

export const sitesRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// GET /api/sites - List, filter, search, and paginate
sitesRouter.get('/', async (c) => {
  const query = c.req.query();
  const db = getDb(c.env.DB);

  const filters: SiteFilters = {
    q: query.q,
    category: query.category,
    country_code: query.country_code,
    status: query.status,
    currency: query.currency,
    provenance: query.provenance,
    order_by: query.order_by as any,
    order_dir: query.order_dir as any,
    limit: query.limit ? Number(query.limit) : undefined,
    offset: query.offset ? Number(query.offset) : undefined,
    page: query.page ? Number(query.page) : undefined,
  };

  const { sites, meta } = await db.listSites(filters);
  const enrichedSites = sites.map((s) => enrichSiteLogo(s));

  return c.json<ApiResponse<typeof enrichedSites>>({
    success: true,
    data: enrichedSites,
    meta,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/sites/domain/:domain - Get single site by exact domain
sitesRouter.get('/domain/:domain', async (c) => {
  const domain = c.req.param('domain');
  const db = getDb(c.env.DB);
  const site = await db.getSiteByDomain(domain);

  if (!site) {
    return c.json({ success: false, error: `Site with domain '${domain}' not found`, timestamp: new Date().toISOString() }, 404);
  }

  return c.json({
    success: true,
    data: enrichSiteLogo(site),
    timestamp: new Date().toISOString(),
  });
});

// GET /api/sites/:slug - Get single site by slug
sitesRouter.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const db = getDb(c.env.DB);
  const site = await db.getSiteBySlug(slug);

  if (!site) {
    return c.json({ success: false, error: `Site with slug '${slug}' not found`, timestamp: new Date().toISOString() }, 404);
  }

  return c.json({
    success: true,
    data: enrichSiteLogo(site),
    timestamp: new Date().toISOString(),
  });
});
