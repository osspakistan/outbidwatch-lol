import { Hono } from 'hono';
import type { Env, AppVariables } from '../types/env';
import { getDb } from '../db/index';
import { resolveCoordinates } from '../lib/geo';
import { enrichSiteLogo } from '../lib/utils';

export const mapApiRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

export interface MapSiteItem {
  id: string;
  domain: string;
  site_name: string;
  category: string;
  founder_x_handle: string;
  founder_location: string;
  country_name: string;
  country_code: string;
  country_flag: string;
  domain_registration_date: string;
  logo_url: string;
  status: string;
  summary_256: string;
  url: string;
  currency: string;
  lat: number | null;
  lng: number | null;
  is_city_match: boolean;
  is_global: boolean;
}

mapApiRouter.get('/', async (c) => {
  const db = getDb(c.env.DB);
  const { sites } = await db.listSites({ limit: 500, page: 1 });

  const enriched = sites.map(enrichSiteLogo);
  const countryCounts = new Set<string>();

  const localizedSites: MapSiteItem[] = [];
  const globalSites: MapSiteItem[] = [];

  for (const site of enriched) {
    const coords = resolveCoordinates(site.founder_location, site.country_name, site.domain);
    const isGlobal = !coords;

    const item: MapSiteItem = {
      id: site.id || site.slug,
      domain: site.domain,
      site_name: site.site_name || site.domain,
      category: site.category,
      founder_x_handle: site.founder_x_handle,
      founder_location: site.founder_location || 'Global',
      country_name: site.country_name || 'Global',
      country_code: site.country_code || 'GLOBAL',
      country_flag: site.country_flag || '🌐',
      domain_registration_date: site.domain_registration_date,
      logo_url: site.logo_url || `/api/logos/${encodeURIComponent(site.domain)}.png`,
      status: site.status,
      summary_256: site.summary_256,
      url: site.url,
      currency: site.currency || 'USD',
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      is_city_match: coords?.isCityMatch ?? false,
      is_global: isGlobal,
    };

    if (!isGlobal && coords) {
      if (item.country_code && item.country_code !== 'GLOBAL') {
        countryCounts.add(item.country_code);
      }
      localizedSites.push(item);
    } else {
      globalSites.push(item);
    }
  }

  const payload = {
    total: sites.length,
    geolocated_count: localizedSites.length,
    global_count: globalSites.length,
    countries_count: countryCounts.size,
    localized_sites: localizedSites,
    global_sites: globalSites,
  };

  c.header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  return c.json(payload);
});
