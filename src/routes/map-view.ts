import { Hono } from 'hono';
import type { Env, AppVariables } from '../types/env';
import { getDb } from '../db/index';
import { resolveCoordinates } from '../lib/geo';
import { enrichSiteLogo } from '../lib/utils';
import type { MapSiteItem } from './map-api';

export const mapViewRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(isoStr: string | null | undefined): string {
  if (!isoStr) return 'Aug 2026';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return isoStr;
  }
}

function formatDomainTitle(domain: string, siteName?: string): string {
  if (siteName && !siteName.includes('.')) {
    return siteName.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  const base = (domain || '').replace(/^www\./, '').split('.')[0];
  return base
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const handleMapView = async (c: any) => {
  const db = getDb(c.env.DB);
  const { sites } = await db.listSites({ limit: 500, page: 1 });
  const categories = await db.getCategories();

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

  const host = c.req.header('host') || 'outbidwatch.com';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;
  const accept = c.req.header('Accept') || '';

  // 1. Markdown Content Negotiation for AI Agents (acceptmarkdown.com) and /map.md
  if (accept.includes('text/markdown') || c.req.path.endsWith('.md')) {
    let md = `# OutbidWatch World Map
> Geographic distribution of verified pay-to-rank outbid leaderboard platforms.

- **Total Platforms Cataloged**: ${sites.length}
- **Geolocated Makers on Map**: ${localizedSites.length}
- **Countries Represented**: ${countryCounts.size}
- **Global / Distributed Platforms**: ${globalSites.length}

## Pinned Regional Makers (${localizedSites.length})

`;
    // Group localized sites by country
    const groupedByCountry = new Map<string, MapSiteItem[]>();
    for (const site of localizedSites) {
      const cName = site.country_name || 'Other';
      if (!groupedByCountry.has(cName)) groupedByCountry.set(cName, []);
      groupedByCountry.get(cName)!.push(site);
    }

    for (const [country, list] of groupedByCountry.entries()) {
      const flag = list[0]?.country_flag || '📍';
      md += `### ${flag} ${country} (${list.length} platforms)\n\n`;
      for (const s of list) {
        md += `- **${formatDomainTitle(s.domain, s.site_name)}** (\`${s.domain}\`)\n`;
        md += `  - Location: ${s.founder_location}\n`;
        md += `  - Category: ${s.category} | Status: ${s.status.toUpperCase()}\n`;
        md += `  - Founder: @${s.founder_x_handle}\n`;
        md += `  - Registered: ${formatDate(s.domain_registration_date)}\n`;
        md += `  - Board Profile: ${baseUrl}/boards/${encodeURIComponent(s.domain)}\n\n`;
      }
    }

    md += `## Global / Remote Platforms (${globalSites.length})\n\n`;
    for (const s of globalSites) {
      md += `- **${formatDomainTitle(s.domain, s.site_name)}** (\`${s.domain}\`): Founder @${s.founder_x_handle} (Global/Remote) · [Profile](${baseUrl}/boards/${encodeURIComponent(s.domain)})\n`;
    }

    return c.body(md, 200, {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Vary': 'Accept, Accept-Encoding',
      'x-markdown-tokens': String(Math.round(md.length / 4)),
      'Link': '</.well-known/api-catalog>; rel="api-catalog"',
      'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
    });
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${baseUrl}/map#webpage`,
        url: `${baseUrl}/map`,
        name: 'OutbidWatch World Map | Global Maker Distribution',
        description: 'Interactive world map tracking the geographic distribution of pay-to-rank leaderboard founders and platforms.',
        isPartOf: {
          '@type': 'WebSite',
          '@id': `${baseUrl}/#website`,
          name: 'OutbidWatch',
          url: `${baseUrl}/`,
        },
      },
    ],
  };

  const ogImage = `${baseUrl}/api/og?title=${encodeURIComponent('Outbid World Map')}&tag=${encodeURIComponent(localizedSites.length + ' Pinned Makers')}&desc=${encodeURIComponent('Interactive world map tracking where builders are launching pay-to-rank leaderboards across ' + countryCounts.size + ' countries.')}`;

  // Pre-render Category filter buttons
  let categoryFilterButtons = `
    <button data-cat="all" class="cat-pill active pill px-3 py-1 text-[12px] font-bold border border-[var(--ink)] bg-[var(--ink)] text-white shrink-0 transition-all">
      All (${sites.length})
    </button>
  `;
  categories.forEach((cat) => {
    categoryFilterButtons += `
      <button data-cat="${escapeHtml(cat.category)}" class="cat-pill pill px-3 py-1 text-[12px] font-medium border border-[#E4E1D4] bg-white text-[#5B5A4E] hover:border-[#CCD99B] hover:text-[var(--ink)] shrink-0 transition-all">
        ${escapeHtml(cat.category)} <span class="text-[11px] opacity-70">(${cat.count})</span>
      </button>
    `;
  });

  // Pre-render Global cards drawer HTML
  let globalCardsHtml = '';
  globalSites.forEach((site) => {
    const cardTitle = formatDomainTitle(site.domain, site.site_name);
    const statusClass = site.status === 'live' ? 'status-live' : 'status-dead';
    const boardUrl = `/boards/${encodeURIComponent(site.domain)}`;

    globalCardsHtml += `
      <a 
        href="${boardUrl}" 
        class="global-card block p-3.5 rounded-2xl bg-white border border-[#ECEAE0] hover:border-[#CCD99B] transition-all shadow-xs shrink-0 w-[240px]"
      >
        <div class="flex items-center gap-2.5 mb-2">
          <img 
            src="${site.logo_url}" 
            alt="${escapeHtml(site.domain)} logo" 
            class="w-8 h-8 rounded-xl object-cover bg-[var(--mosambi-light)] shrink-0 border border-[#EBE8DC]"
            onerror="this.onerror=null; this.src='/api/logos/${encodeURIComponent(site.domain)}.png';"
          />
          <div class="min-w-0 flex-1">
            <h4 class="font-extrabold text-[13.5px] text-[var(--ink)] truncate">${escapeHtml(cardTitle)}</h4>
            <p class="text-[11.5px] text-[#8A8574] truncate">${escapeHtml(site.category)}</p>
          </div>
        </div>
        <div class="flex items-center justify-between text-[11.5px] text-[#8A8574] pt-2 border-t border-[#F5F4EC]">
          <span class="font-bold text-[var(--ink)] truncate">@${escapeHtml(site.founder_x_handle)}</span>
          <span class="pill ${statusClass} px-2 py-0.5 text-[10px] font-bold">${site.status.toUpperCase()}</span>
        </div>
      </a>
    `;
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Outbid World Map | Verified Maker Distribution Across ${countryCounts.size} Countries</title>
<meta name="description" content="Explore where founders and creators are shipping pay-to-rank bidding platforms across the globe.">
<link rel="canonical" href="${baseUrl}/map">
<meta property="og:title" content="Outbid World Map | Verified Maker Distribution">
<meta property="og:description" content="Explore where founders are shipping pay-to-rank bidding platforms across ${countryCounts.size} countries.">
<meta property="og:url" content="${baseUrl}/map">
<meta property="og:type" content="website">
<meta property="og:image" content="${ogImage}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:creator" content="@alvaisy">
<meta name="twitter:image" content="${ogImage}">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>

<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#BACB45">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css">

<!-- Free CDN Leaflet CSS & MarkerCluster CSS -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />

<!-- Phosphor Icons & Leaflet CDN JS with defer -->
<script src="https://unpkg.com/@phosphor-icons/web@2.1.1" defer></script>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" defer></script>
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js" defer></script>
<meta name="view-transition" content="same-origin">

<style>
  /* Custom Outbid Leaflet & Marker Styling */
  #mapContainer {
    width: 100%;
    height: 580px;
    border-radius: 20px;
    z-index: 10;
    background: #FDFCFA;
  }
  @media (max-width: 640px) {
    #mapContainer {
      height: 460px;
    }
  }
  .leaflet-popup-content-wrapper {
    background: #ffffff !important;
    border-radius: 18px !important;
    padding: 4px !important;
    border: 1px solid #ECEAE0 !important;
    box-shadow: 0 12px 30px -8px rgba(35, 40, 28, 0.18) !important;
  }
  .leaflet-popup-tip {
    background: #ffffff !important;
    border: 1px solid #ECEAE0 !important;
  }
  .leaflet-container {
    font-family: 'DM Sans', sans-serif !important;
  }
  .outbid-pin-marker {
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .outbid-pin-marker:hover {
    transform: scale(1.22);
    z-index: 1000 !important;
  }
  /* Exact Match Glowing Animation */
  @keyframes exact-pin-glow {
    0% {
      box-shadow: 0 0 0 0 rgba(180, 204, 90, 0.85), 0 8px 24px rgba(35, 40, 28, 0.25);
      transform: scale(1.18);
    }
    50% {
      box-shadow: 0 0 0 14px rgba(180, 204, 90, 0), 0 14px 36px rgba(35, 40, 28, 0.35);
      transform: scale(1.32);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(180, 204, 90, 0), 0 8px 24px rgba(35, 40, 28, 0.25);
      transform: scale(1.18);
    }
  }
  .exact-matched-pin {
    animation: exact-pin-glow 1.8s infinite cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 99999 !important;
  }
  /* Cluster Custom Style */
  .marker-cluster-outbid {
    background: rgba(180, 204, 90, 0.5) !important;
    border-radius: 9999px;
  }
  .marker-cluster-outbid div {
    background: #BACB45 !important;
    color: #1E2417 !important;
    font-family: 'Manrope', sans-serif !important;
    font-weight: 800 !important;
    font-size: 13px !important;
    border-radius: 9999px;
    width: 34px !important;
    height: 34px !important;
    margin-left: 3px !important;
    margin-top: 3px !important;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  }
</style>
</head>
<body class="min-h-screen flex flex-col">

<div class="max-w-app mx-auto px-4 sm:px-6 min-h-screen flex flex-col flex-1 w-full">

  <!-- Header Navigation -->
  <header class="pt-6 pb-4 flex items-center justify-between sticky top-0 bg-[var(--paper)]/95 backdrop-blur z-30 border-b border-transparent">
    <a href="/" id="headerLogoLink" class="flex items-center gap-2.5">
      <div class="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm" style="background: var(--mosambi);">
        <i class="ph-fill ph-gavel text-[16px]" style="color:#1E2417;"></i>
      </div>
      <span class="display font-extrabold text-[18px] tracking-tight text-[var(--ink)] hidden sm:inline-block">outbidwatch</span>
    </a>
    <div class="flex items-center gap-2">
      <a href="/" class="pill px-3.5 py-1.5 text-[13px] font-semibold border border-[#E4E1D4] text-[#5B5A4E] hover:border-[#CCD99B] transition-colors">
        Directory
      </a>
      <a href="/timeline" class="pill px-3.5 py-1.5 text-[13px] font-semibold border border-[#E4E1D4] text-[#5B5A4E] hover:border-[#CCD99B] transition-colors">
        Timeline
      </a>
      <a href="/map" class="pill px-3.5 py-1.5 text-[13px] font-bold transition-colors bg-[var(--ink)] text-white shadow-sm">
        Map
      </a>
      <a href="https://github.com/osspakistan/outbidwatch-lol" target="_blank" rel="noopener noreferrer" title="View Source on GitHub" class="pill px-3 py-1.5 text-[13px] font-semibold border border-[#E4E1D4] text-[#5B5A4E] hover:border-[#CCD99B] hover:text-[var(--ink)] transition-colors flex items-center gap-1.5">
        <i class="ph-bold ph-github-logo text-[15px]"></i>
        <span class="hidden sm:inline-block">GitHub</span>
      </a>
    </div>
  </header>

  <!-- Compact Stats Bar (Stripped 80% text, focused on map) -->
  <section class="pt-2 pb-3">
    <div class="grid grid-cols-3 gap-2 sm:gap-3">
      <div class="card p-3 text-center sm:text-left">
        <p id="statsLocalizedCount" class="text-[20px] sm:text-[22px] font-extrabold display leading-none mb-1 text-[var(--ink)]">${localizedSites.length}</p>
        <p class="text-[11.5px] text-[#8A8574] leading-tight font-medium">Pinned makers</p>
      </div>
      <div class="card p-3 text-center sm:text-left">
        <p id="statsCountriesCount" class="text-[20px] sm:text-[22px] font-extrabold display leading-none mb-1" style="color: var(--mosambi-dark);">${countryCounts.size}</p>
        <p class="text-[11.5px] text-[#8A8574] leading-tight font-medium">Countries</p>
      </div>
      <div class="card p-3 text-center sm:text-left">
        <p id="statsGlobalCount" class="text-[20px] sm:text-[22px] font-extrabold display leading-none mb-1 text-[var(--ink)]">${globalSites.length}</p>
        <p class="text-[11.5px] text-[#8A8574] leading-tight font-medium">Global / Remote</p>
      </div>
    </div>
  </section>

  <!-- Interactive Controls Bar -->
  <section class="mb-3">
    <div class="flex items-center gap-2 mb-2.5">
      <div class="relative flex-1">
        <i class="ph-bold ph-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-[#8A8574]"></i>
        <input
          id="mapSearchInput"
          type="text"
          placeholder="Search city, country, maker, or domain (e.g. outbid.lol)..."
          class="w-full pl-10 pr-9 py-2.5 rounded-xl border border-[#E4E1D4] bg-white text-[13.5px] text-[var(--ink)] outline-none focus:border-[var(--mosambi-dark)] focus:ring-2 focus:ring-[var(--mosambi-light)] transition-all shadow-xs"
        />
        <button id="mapSearchClear" class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center bg-[#F1EFE6] text-[#8A8574] hover:text-[var(--ink)] hidden">
          <i class="ph-bold ph-x text-[10px]"></i>
        </button>
      </div>

      <button id="resetMapBtn" title="Reset View" class="pill p-2.5 rounded-xl border border-[#E4E1D4] bg-white text-[var(--ink)] hover:bg-[#F5F4EC] transition-all flex items-center justify-center shrink-0 shadow-xs">
        <i class="ph-bold ph-arrows-out-cardinal text-[16px] text-[#5B5A4E]"></i>
      </button>

      <button id="liveOnlyBtn" class="pill px-3 py-2.5 rounded-xl border border-[#E4E1D4] bg-white text-[var(--ink)] hover:bg-[#F5F4EC] text-[12.5px] font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-xs">
        <span class="w-2 h-2 rounded-full bg-[#BACB45]"></span>
        <span>Live Only</span>
      </button>
    </div>

    <!-- Category Pills Filter Slider -->
    <div id="categoryBar" class="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
      ${categoryFilterButtons}
    </div>
  </section>

  <!-- MAP WRAPPER CARD -->
  <div class="card p-1.5 sm:p-2 mb-6 shadow-sm border border-[#E4E1D4] relative">
    <div id="mapContainer"></div>

    <!-- Map Loading Overlay (Removed once Leaflet initializes) -->
    <div id="mapLoader" class="absolute inset-0 bg-white/90 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center gap-2 z-20 transition-opacity">
      <i class="ph-bold ph-spinner animate-spin text-[28px] text-[var(--mosambi-dark)]"></i>
      <p class="text-[13px] font-bold text-[var(--ink)]">Plotting builder coordinates...</p>
    </div>
  </div>

  <!-- GLOBAL / REMOTE BUILDERS SECTION -->
  <section class="mb-10">
    <div class="flex items-center justify-between mb-3">
      <div>
        <h2 class="display text-[18px] sm:text-[20px] font-extrabold text-[var(--ink)] flex items-center gap-2">
          <span>🌐 Global & Remote Builders</span>
          <span class="pill px-2 py-0.5 bg-[#EAE8DD] text-[#33372B] font-bold text-[11px]">${globalSites.length}</span>
        </h2>
        <p class="text-[12.5px] text-[#8A8574]">Distributed or anonymous builders without a single physical city</p>
      </div>
    </div>

    <div class="flex gap-3 overflow-x-auto pb-3 pt-1 scrollbar-none">
      ${globalCardsHtml}
    </div>
  </section>

  <!-- Footer -->
  <footer class="pb-10 pt-4 border-t border-[#ECEAE0] flex flex-col sm:flex-row items-center justify-between gap-3 text-[12.5px] text-[#8A8574] mt-auto">
    <div class="flex items-center gap-2">
      <span class="font-bold text-[var(--ink)]">outbidwatch</span>
      <span>·</span>
      <span>Verified pay-to-rank platform directory</span>
    </div>
    <div class="flex items-center gap-3">
      <a href="/" class="hover:text-[var(--ink)] transition-colors font-medium">Directory</a>
      <span>·</span>
      <a href="/timeline" class="hover:text-[var(--ink)] transition-colors font-medium">Timeline</a>
      <span>·</span>
      <a href="/story" class="hover:text-[var(--ink)] transition-colors flex items-center gap-1 font-semibold text-[var(--ink)]">
        <i class="ph-bold ph-book-open text-[13px]"></i> Story
      </a>
      <span>·</span>
      <a href="/about" class="hover:text-[var(--ink)] transition-colors font-medium">About</a>
      <span>·</span>
      <a href="/developers" class="hover:text-[var(--ink)] transition-colors font-medium">Developers</a>
      <span>·</span>
      <a href="/analytics" class="hover:text-[var(--ink)] transition-colors font-medium">Analytics</a>
      <span>·</span>
      <a href="https://github.com/osspakistan/outbidwatch-lol" target="_blank" rel="noopener noreferrer" class="hover:text-[var(--ink)] transition-colors flex items-center gap-1 font-medium">
        <i class="ph-bold ph-github-logo text-[13px]"></i> GitHub
      </a>
      <span>·</span>
      <a href="/api/map" target="_blank" class="hover:text-[var(--ink)] transition-colors flex items-center gap-1 font-medium">
        <i class="ph-bold ph-map-pin text-[13px]"></i> Map API
      </a>
    </div>
  </footer>

</div>

<!-- Pass Pre-Computed Sites to Client for Instant Zero-Latency Render -->
<script>
  window.__MAP_DATA__ = {
    total: ${sites.length},
    localized: ${JSON.stringify(localizedSites)},
    global: ${JSON.stringify(globalSites)},
    baseUrl: ${JSON.stringify(baseUrl)}
  };
</script>

<!-- Interactive Map Client Script -->
<script>
document.addEventListener('DOMContentLoaded', () => {
  const initMap = () => {
    if (typeof L === 'undefined' || typeof L.markerClusterGroup === 'undefined') {
      setTimeout(initMap, 80);
      return;
    }

    const loader = document.getElementById('mapLoader');
    if (loader) {
      loader.classList.add('opacity-0', 'pointer-events-none');
      setTimeout(() => loader.remove(), 250);
    }

    const data = window.__MAP_DATA__ || { localized: [], global: [] };
    const localized = data.localized || [];

    // 1. Initialize Map with CartoDB Positron paper-toned OpenStreetMap tiles (Free CDN)
    const map = L.map('mapContainer', {
      zoomControl: true,
      minZoom: 2,
      maxZoom: 18,
      attributionControl: true
    }).setView([28, 10], 2.2);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/" target="_blank">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    // 2. Setup Marker Clustering with Custom Outbid Mosambi Badges
    const markersCluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 45,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: function(cluster) {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: '<div><span>' + count + '</span></div>',
          className: 'marker-cluster-outbid',
          iconSize: L.point(40, 40)
        });
      }
    });

    let currentFilterCat = 'all';
    let liveOnly = false;
    let currentSearchTerm = '';
    const activeMarkers = [];

    // Helper: Create HTML Icon for Pin with Logo & Exact Match Highlighting
    const createCustomPinIcon = (site, isExactMatch = false) => {
      const isLive = site.status === 'live';
      const statusBg = isLive ? '#BACB45' : '#8A8574';
      const logoUrl = site.logo_url || ('/api/logos/' + encodeURIComponent(site.domain) + '.png');
      const googleFallback = 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(site.domain) + '&sz=128';
      const extraClass = isExactMatch ? 'exact-matched-pin' : '';
      const pinSize = isExactMatch ? 42 : 32;
      const ringStyle = isExactMatch ? 'border-2 border-[#1E2417] ring-4 ring-[#BACB45]' : 'border border-[#E4E1D4] shadow-md';

      return L.divIcon({
        className: 'outbid-pin-marker ' + extraClass,
        html: \`
          <div class="relative w-full h-full rounded-xl bg-white \${ringStyle} flex items-center justify-center p-1 group">
            <img 
              src="\${logoUrl}" 
              class="w-full h-full object-contain rounded-lg" 
              onerror="this.onerror=null; this.src='\${googleFallback}';" 
              alt="\${site.domain}"
            />
            <span class="w-2.5 h-2.5 rounded-full absolute -top-1 -right-1 border-2 border-white" style="background: \${statusBg}"></span>
          </div>
        \`,
        iconSize: [pinSize, pinSize],
        iconAnchor: [pinSize / 2, pinSize / 2],
        popupAnchor: [0, -(pinSize / 2 + 4)]
      });
    };

    // Helper: Popup Card HTML with Logo
    const createPopupContent = (site) => {
      const flag = site.country_flag || '🌐';
      const statusClass = site.status === 'live' ? 'status-live' : 'status-dead';
      const statusLabel = site.status === 'live' ? 'LIVE' : 'DEAD';
      const boardUrl = '/boards/' + encodeURIComponent(site.domain);
      const logoUrl = site.logo_url || ('/api/logos/' + encodeURIComponent(site.domain) + '.png');
      const googleFallback = 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(site.domain) + '&sz=128';

      return \`
        <div class="p-3 w-[230px]">
          <div class="flex items-center gap-2.5 mb-2">
            <img 
              src="\${logoUrl}" 
              class="w-8 h-8 rounded-xl object-contain bg-[#EEF4D9] border border-[#EBE8DC] shrink-0" 
              onerror="this.onerror=null; this.src='\${googleFallback}';"
              alt="\${site.domain}"
            />
            <div class="min-w-0 flex-1">
              <h4 class="font-extrabold text-[14px] text-[#23281C] leading-snug truncate">\${site.site_name}</h4>
              <p class="text-[11px] text-[#8A8574] truncate">\${flag} \${site.founder_location}</p>
            </div>
          </div>
          <div class="flex items-center justify-between text-[11px] mb-2.5 pt-1.5 border-t border-[#F5F4EC]">
            <a href="https://x.com/\${encodeURIComponent(site.founder_x_handle)}" target="_blank" rel="noopener noreferrer" class="font-bold text-[#23281C] hover:underline flex items-center gap-1 truncate">
              <i class="ph-bold ph-x-logo text-[10px]"></i>
              <span>@\${site.founder_x_handle}</span>
            </a>
            <span class="pill \${statusClass} px-2 py-0.5 font-bold text-[9.5px]">\${statusLabel}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <a 
              href="\${boardUrl}" 
              class="btn-primary pill w-full py-1.5 text-center text-[11.5px] font-bold block shadow-xs"
            >
              View Board Profile &rarr;
            </a>
          </div>
        </div>
      \`;
    };

    // Render Markers with active filters and exact match zooming
    const renderMarkers = () => {
      markersCluster.clearLayers();
      activeMarkers.length = 0;

      const q = (currentSearchTerm || '').toLowerCase().trim();

      // Find exact or closest match (e.g. outbid.lol, netadz.com, or exact name)
      let exactMatch = null;
      if (q) {
        exactMatch = localized.find(s => 
          s.domain.toLowerCase() === q ||
          s.domain.toLowerCase().replace(/^www\./, '') === q ||
          s.domain.toLowerCase().replace(/\.[a-z]+$/, '') === q ||
          s.site_name.toLowerCase() === q ||
          s.founder_x_handle.toLowerCase() === q.replace(/^@/, '')
        ) || null;
      }

      const bounds = [];

      localized.forEach((site) => {
        if (!site.lat || !site.lng) return;

        // Check Category Filter
        if (currentFilterCat !== 'all' && site.category !== currentFilterCat) return;

        // Check Live Only
        if (liveOnly && site.status !== 'live') return;

        // Check Search Filter
        if (q) {
          const match = 
            site.domain.toLowerCase().includes(q) ||
            site.site_name.toLowerCase().includes(q) ||
            site.founder_x_handle.toLowerCase().includes(q) ||
            site.founder_location.toLowerCase().includes(q) ||
            site.country_name.toLowerCase().includes(q);
          if (!match) return;
        }

        const isExact = exactMatch ? (site.domain === exactMatch.domain) : false;

        const marker = L.marker([site.lat, site.lng], {
          icon: createCustomPinIcon(site, isExact),
          title: site.site_name + ' (@' + site.founder_x_handle + ')',
          zIndexOffset: isExact ? 1000 : 0
        });

        marker.bindPopup(createPopupContent(site));
        markersCluster.addLayer(marker);
        activeMarkers.push({ marker, site, isExact });
        bounds.push([site.lat, site.lng]);
      });

      map.addLayer(markersCluster);

      // Smooth Auto-Zoom to exact point or bounds
      if (exactMatch && exactMatch.lat && exactMatch.lng) {
        const matchEntry = activeMarkers.find(m => m.site.domain === exactMatch.domain);
        if (matchEntry) {
          markersCluster.zoomToShowLayer(matchEntry.marker, () => {
            map.setView([exactMatch.lat, exactMatch.lng], 10, { animate: true });
            setTimeout(() => {
              matchEntry.marker.openPopup();
            }, 250);
          });
        }
      } else if (q && bounds.length > 0) {
        if (bounds.length === 1) {
          const single = activeMarkers[0];
          if (single) {
            markersCluster.zoomToShowLayer(single.marker, () => {
              map.setView([single.site.lat, single.site.lng], 9, { animate: true });
              setTimeout(() => {
                single.marker.openPopup();
              }, 250);
            });
          }
        } else {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 8, animate: true });
        }
      }
    };

    renderMarkers();

    // Check for query parameter (e.g. /map?q=outbid.lol)
    const urlParams = new URLSearchParams(window.location.search);
    const initialQuery = urlParams.get('q') || urlParams.get('domain') || urlParams.get('search');
    if (initialQuery) {
      const searchInput = document.getElementById('mapSearchInput');
      const searchClear = document.getElementById('mapSearchClear');
      if (searchInput) searchInput.value = initialQuery;
      if (searchClear) searchClear.classList.remove('hidden');
      currentSearchTerm = initialQuery;
      renderMarkers();
    }

    // Reset View Button
    const resetBtn = document.getElementById('resetMapBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        currentFilterCat = 'all';
        liveOnly = false;
        currentSearchTerm = '';
        const searchInput = document.getElementById('mapSearchInput');
        if (searchInput) searchInput.value = '';
        const clearBtn = document.getElementById('mapSearchClear');
        if (clearBtn) clearBtn.classList.add('hidden');

        document.querySelectorAll('.cat-pill').forEach((btn) => {
          if (btn.getAttribute('data-cat') === 'all') {
            btn.className = 'cat-pill active pill px-3 py-1 text-[12px] font-bold border border-[var(--ink)] bg-[var(--ink)] text-white shrink-0 transition-all';
          } else {
            btn.className = 'cat-pill pill px-3 py-1 text-[12px] font-medium border border-[#E4E1D4] bg-white text-[#5B5A4E] hover:border-[#CCD99B] hover:text-[var(--ink)] shrink-0 transition-all';
          }
        });

        const liveBtn = document.getElementById('liveOnlyBtn');
        if (liveBtn) {
          liveBtn.className = 'pill px-3 py-2.5 rounded-xl border border-[#E4E1D4] bg-white text-[var(--ink)] hover:bg-[#F5F4EC] text-[12.5px] font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-xs';
        }

        renderMarkers();
        map.setView([28, 10], 2.2, { animate: true });
      });
    }

    // Category Filter Buttons Click
    document.querySelectorAll('.cat-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cat-pill').forEach(b => {
          b.className = 'cat-pill pill px-3 py-1 text-[12px] font-medium border border-[#E4E1D4] bg-white text-[#5B5A4E] hover:border-[#CCD99B] hover:text-[var(--ink)] shrink-0 transition-all';
        });
        btn.className = 'cat-pill active pill px-3 py-1 text-[12px] font-bold border border-[var(--ink)] bg-[var(--ink)] text-white shrink-0 transition-all';
        currentFilterCat = btn.getAttribute('data-cat') || 'all';
        renderMarkers();
      });
    });

    // Live Only Toggle
    const liveBtn = document.getElementById('liveOnlyBtn');
    if (liveBtn) {
      liveBtn.addEventListener('click', () => {
        liveOnly = !liveOnly;
        if (liveOnly) {
          liveBtn.className = 'pill px-3 py-2.5 rounded-xl border border-[var(--ink)] bg-[var(--ink)] text-white text-[12.5px] font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-xs';
        } else {
          liveBtn.className = 'pill px-3 py-2.5 rounded-xl border border-[#E4E1D4] bg-white text-[var(--ink)] hover:bg-[#F5F4EC] text-[12.5px] font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-xs';
        }
        renderMarkers();
      });
    }

    // Search Input with Debounce
    const searchInput = document.getElementById('mapSearchInput');
    const searchClear = document.getElementById('mapSearchClear');
    let searchDebounce;

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchDebounce);
        const val = e.target.value.trim();
        if (searchClear) {
          if (val) searchClear.classList.remove('hidden');
          else searchClear.classList.add('hidden');
        }
        searchDebounce = setTimeout(() => {
          currentSearchTerm = val;
          renderMarkers();
        }, 180);
      });
    }

    if (searchClear) {
      searchClear.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        searchClear.classList.add('hidden');
        currentSearchTerm = '';
        renderMarkers();
      });
    }
  };

  initMap();
});
</script>
</body>
</html>`;

  c.header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  return c.html(html);
};

mapViewRouter.get('/', handleMapView);
mapViewRouter.get('/index.md', handleMapView);
mapViewRouter.get('/map.md', handleMapView);
