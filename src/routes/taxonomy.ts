import { Hono } from 'hono';
import type { Env, AppVariables } from '../types/env';
import { getDb } from '../db/index';

export const taxonomyRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// GET /api/categories - 10 real category verticals with site counts
taxonomyRouter.get('/categories', async (c) => {
  const db = getDb(c.env.DB);
  const categories = await db.getCategories();
  return c.json({
    success: true,
    data: categories,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/countries - Geographic distribution with flags and counts
taxonomyRouter.get('/countries', async (c) => {
  const db = getDb(c.env.DB);
  const countries = await db.getCountries();
  return c.json({
    success: true,
    data: countries,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/currencies - Supported currencies with counts
taxonomyRouter.get('/currencies', async (c) => {
  const db = getDb(c.env.DB);
  const currencies = await db.getCurrencies();
  return c.json({
    success: true,
    data: currencies,
    timestamp: new Date().toISOString(),
  });
});
