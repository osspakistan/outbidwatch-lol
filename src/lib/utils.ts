import type { Site } from '../types/site';

export function enrichSiteLogo(site: Site): Site {
  return {
    ...site,
    logo_url: `/api/logos/${encodeURIComponent(site.domain)}.png`,
  };
}
