import { Hono } from 'hono';
import type { Env, AppVariables } from '../types/env';
import { getDb } from '../db/index';
import { enrichSiteLogo } from '../lib/utils';
import type { SiteFilters } from '../types/site';
import { renderHeader, renderMobileNavDrawer, renderFooter } from '../lib/nav';

export const directoryViewRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

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

function formatDateShort(isoStr: string | null | undefined): string {
  if (!isoStr) return 'Aug 2026';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return isoStr;
  }
}

// Convert domain without extension into clean Capitalized Title
function formatDomainTitle(domain: string, siteName?: string): string {
  if (siteName && !siteName.includes('.')) {
    return siteName.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  const base = (domain || '').replace(/^www\./, '').split('.')[0];
  return base
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Compact count formatter: 1234 -> "1.2k", 1_500_000 -> "1.5M"
function formatViewCount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '') + 'k';
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
}

// GET / and /index.md - Full Server-Side Rendered Directory with Edge D1 Database Query
const handleDirectory = async (c: any) => {
  const db = getDb(c.env.DB);
  const q = c.req.query('q') || '';
  const category = c.req.query('category') || '';
  const sort = c.req.query('sort') || 'oldest';
  const page = Math.max(Number(c.req.query('page')) || 1, 1);
  const limit = Math.min(Math.max(Number(c.req.query('limit')) || 25, 1), 100);

  const filters: SiteFilters = {
    page,
    limit,
    q: q || undefined,
    category: category && category !== 'all' ? category : undefined,
    order_by: sort === 'name' ? 'site_name' : 'registration_date',
    order_dir: sort === 'newest' ? 'desc' : 'asc',
  };

  const [stats, categories, { sites, meta }] = await Promise.all([
    db.getStats(),
    db.getCategories(),
    db.listSites(filters),
  ]);

  // Fetch per-board view counts in one bulk query (graceful no-op if table empty)
  const viewMap = await db.getBoardViews(sites.map((s) => s.slug));

  const enrichedSites = sites.map(enrichSiteLogo);

  let cardsHtml = '';
  enrichedSites.forEach((site, index) => {
    const isFirst = index === 0 && page === 1 && (!category || category === 'all') && !q && sort === 'oldest';
    const statusClass = site.status === 'live' ? 'status-live' : site.status === 'dead' ? 'status-dead' : 'status-unclear';
    const statusLabel = site.status === 'live' ? 'LIVE' : site.status === 'dead' ? 'DEAD' : 'UNCLEAR';
    const cardOpacity = site.status === 'dead' ? 'opacity-70' : '';
    const regDateFormatted = formatDate(site.domain_registration_date);
    const flagEmoji = site.country_flag || '🌐';
    const locationLabel = site.founder_location || site.country_name || 'Global';
    const cardTitle = formatDomainTitle(site.domain, site.site_name);
    const boardProfileUrl = `/boards/${encodeURIComponent(site.domain)}`;

    const views = viewMap.get(site.slug);
    const totalViews = views?.total_views || 0;
    const viewsBadgeHtml = totalViews > 0
      ? `<span class="pill px-2 py-1 text-[11px] font-bold tracking-wide inline-flex items-center gap-1 bg-[#F1EFE6] text-[#5B5A4E] border border-[#E4E1D4]" title="${totalViews.toLocaleString()} total views"><i class="ph-bold ph-eye text-[11px]"></i>${escapeHtml(formatViewCount(totalViews))}</span>`
      : '';

    cardsHtml += `
      <article 
        class="site-card card p-5 sm:p-6 cursor-pointer select-none transition-all hover:border-[#CCD99B] ${cardOpacity}"
        data-domain="${escapeHtml(site.domain)}"
        data-href="${boardProfileUrl}"
        onclick="if (!event.target.closest('a') && !event.target.closest('button') && !window.openBoardProfile) window.location.href='${boardProfileUrl}';"
      >
        <!-- Top Row: Logo, Capitalized Domain Title, Reg Date (left of status), Status Badge -->
        <div class="flex items-start justify-between gap-3 mb-8 sm:mb-12">
          <div class="flex items-center gap-3.5">
            <img 
              src="${site.logo_url || `/api/logos/${encodeURIComponent(site.domain)}.png`}" 
              alt="${escapeHtml(site.domain)} logo" 
              class="card-logo w-12 h-12 rounded-2xl object-cover bg-[var(--mosambi-light)] shrink-0 border border-[#EBE8DC]"
              loading="lazy"
              onerror="this.onerror=null; this.src='/api/logos/${encodeURIComponent(site.domain)}.png';"
            />
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-extrabold text-[16.5px] sm:text-[17.5px] leading-snug text-[var(--ink)] hover:text-[var(--mosambi-dark)] transition-colors">
                  ${escapeHtml(cardTitle)}
                </h3>
                ${isFirst ? '<span class="pill px-2 py-0.5 text-[10.5px] font-extrabold shrink-0" style="background: var(--mosambi); color:#1E2417;">#1 · FIRST</span>' : ''}
              </div>
              <p class="text-[12.5px] text-[#8A8574] mt-0.5 font-medium">
                ${escapeHtml(site.category)} · ${flagEmoji} ${escapeHtml(locationLabel)}
              </p>
            </div>
          </div>

          <!-- Registration Date to the Left of Status Badge -->
          <div class="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <span class="text-[12px] text-[#8A8574] font-medium hidden sm:inline-block">reg. ${regDateFormatted}</span>
            ${viewsBadgeHtml}
            <span class="pill ${statusClass} px-2.5 py-1 text-[11px] font-bold tracking-wide">
              ${statusLabel}
            </span>
          </div>
        </div>

        <!-- Footer Row: Founder Handle (Mobile) + Currency | Domain Link (Desktop) -->
        <div class="flex items-center justify-between pt-3.5 sm:pt-4 border-t border-[#F0EEE3] text-[13px] text-[#8A8574]">
          <div class="flex items-center gap-2 sm:gap-2.5">
            <a 
              href="https://x.com/${encodeURIComponent(site.founder_x_handle)}" 
              target="_blank" 
              rel="noopener noreferrer" 
              class="font-bold text-[var(--ink)] hover:underline flex items-center gap-1.5"
              onclick="event.stopPropagation();"
            >
              <i class="ph-bold ph-x-logo text-[13px] text-[#5B5A4E]"></i>
              <span>@${escapeHtml(site.founder_x_handle)}</span>
            </a>
            <span class="hidden sm:inline-block">·</span>
            <span class="pill px-2 py-0.5 bg-[#EAE8DD] text-[#33372B] font-bold text-[11.5px] hidden sm:inline-block">${escapeHtml(site.currency || 'USD')}</span>
          </div>

          <a 
            href="${escapeHtml(site.url)}" 
            target="_blank" 
            rel="noopener noreferrer" 
            class="hidden sm:flex items-center gap-1.5 text-[13px] font-bold hover:underline shrink-0" 
            style="color: var(--mosambi-dark);"
            onclick="event.stopPropagation();"
          >
            <span>${escapeHtml(site.domain)}</span>
            <i class="ph-bold ph-arrow-up-right text-[11px]"></i>
          </a>
        </div>
      </article>
    `;
  });

  let categoryPillsHtml = `
    <button data-cat-val="all" class="filter-tag pill px-3.5 py-1.5 text-[12.5px] font-bold border border-[#E4E1D4] ${!category || category === 'all' ? 'bg-[var(--ink)] text-white border-[var(--ink)]' : 'bg-white text-[#5B5A4E]'}">
      All Categories
    </button>
  `;
  categories.forEach((cat) => {
    const isCatActive = category === cat.category;
    categoryPillsHtml += `
      <button data-cat-val="${escapeHtml(cat.category)}" class="filter-tag pill px-3.5 py-1.5 text-[12.5px] font-semibold border border-[#E4E1D4] ${isCatActive ? 'bg-[var(--ink)] text-white border-[var(--ink)]' : 'bg-white text-[#5B5A4E] hover:border-[#CCD99B] hover:text-[var(--ink)]'} transition-all">
        ${escapeHtml(cat.category)} <span class="text-[11px] opacity-70">(${cat.count})</span>
      </button>
    `;
  });

  const host = c.req.header('host') || 'outbidwatch.lol';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;
  const accept = c.req.header('Accept') || '';

  // 1. Markdown Content Negotiation for AI Agents (acceptmarkdown.com) and .md URLs
  if (accept.includes('text/markdown') || c.req.path.endsWith('.md')) {
    let md = `# OutbidWatch Platforms Directory
> The definitive directory for pay-to-rank bidding platforms, ranked chronologically by domain registration date.

- **Total Platforms Listed**: ${stats.total_sites}
- **Active Live Boards**: ${stats.live_sites}
- **First Registered Domain**: ${stats.oldest_domain?.domain || 'netadz.com'} (${stats.oldest_domain?.registration_date || '2006-07-20'})
- **Filter Applied**: Category="${category || 'all'}", Sort="${sort}", Query="${q || 'none'}"
- **Page**: ${page} of ${meta.total_pages}

## Platforms (${enrichedSites.length} shown)

`;
    for (const site of enrichedSites) {
      const flag = site.country_flag || '🌐';
      const loc = site.founder_location || site.country_name || 'Global';
      md += `### ${formatDomainTitle(site.domain, site.site_name)} (${site.domain})
- **Status**: ${site.status.toUpperCase()}
- **Category**: ${site.category}
- **Founder**: @${site.founder_x_handle || 'anonymous'} (${flag} ${loc})
- **Domain Registered**: ${formatDate(site.domain_registration_date)}
- **Description**: ${site.summary_256 || site.raw_description || 'No description available'}
- **Official URL**: ${site.url}
- **Board Profile**: ${baseUrl}/boards/${encodeURIComponent(site.domain)}

`;
    }

    md += `---
*Page ${page} of ${meta.total_pages}. Next page: \`${baseUrl}/?page=${page + 1}\`*
`;

    return c.body(md, 200, {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Vary': 'Accept, Accept-Encoding',
      'x-markdown-tokens': String(Math.round(md.length / 4)),
      'Link': '</.well-known/api-catalog>; rel="api-catalog"',
      'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
    });
  }

  const oldestDateFormatted = formatDateShort(stats.oldest_domain?.registration_date) || 'Aug 2026';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': `${baseUrl}/#application`,
        name: 'OutbidWatch',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: `${baseUrl}/`,
        description: 'The definitive chronological directory and intelligence platform for pay-to-rank outbid leaderboard startups.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        author: {
          '@type': 'Person',
          name: 'Awais Alwaisy',
          url: 'https://x.com/alvaisy',
          sameAs: ['https://x.com/alvaisy', 'https://github.com/alvaisy'],
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        url: `${baseUrl}/`,
        name: 'OutbidWatch',
        description: 'The definitive directory for pay-to-rank bidding platforms, ranked chronologically by domain registration date.',
        inLanguage: 'en',
      },
      {
        '@type': 'Organization',
        '@id': `${baseUrl}/#organization`,
        name: 'OutbidWatch',
        url: `${baseUrl}/`,
        logo: `${baseUrl}/api/logos/outbid.lol.png`,
        sameAs: ['https://x.com/alvaisy', 'https://outbidwatch.lol'],
        founder: {
          '@type': 'Person',
          name: 'Awais Alwaisy',
          sameAs: 'https://x.com/alvaisy',
        },
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          url: 'https://x.com/alvaisy',
        },
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'US',
        },
      },
      {
        '@type': 'ItemList',
        name: 'Outbid Leaderboard Platforms',
        numberOfItems: meta.total,
        itemListElement: enrichedSites.slice(0, 15).map((s, idx) => ({
          '@type': 'ListItem',
          position: (page - 1) * limit + idx + 1,
          name: s.site_name || s.domain,
          url: `${baseUrl}/boards/${encodeURIComponent(s.domain)}`,
        })),
      },
    ],
  };

  const ogImage = `${baseUrl}/api/og?title=${encodeURIComponent('OutbidWatch')}&tag=${encodeURIComponent(meta.total + ' Platforms')}&desc=${encodeURIComponent('The definitive directory and timeline tracking pay-to-rank leaderboards chronologically by domain registration date.')}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OutbidWatch | The Definitive Directory for Pay-to-Rank Bidding Platforms</title>
<meta name="description" content="A directory of pay-to-rank leaderboards, sorted by domain registration date with verified founder handles.">
<link rel="canonical" href="${baseUrl}/">
<meta property="og:title" content="OutbidWatch | The Definitive Directory for Pay-to-Rank Bidding Platforms">
<meta property="og:description" content="A directory of pay-to-rank leaderboards, sorted by domain registration date with verified founder handles.">
<meta property="og:url" content="${baseUrl}/">
<meta property="og:type" content="website">
<meta property="og:image" content="${ogImage}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:creator" content="@alvaisy">
<meta name="twitter:image" content="${ogImage}">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<script>
if (typeof navigator !== 'undefined' && navigator.modelContext && typeof navigator.modelContext.provideContext === 'function') {
  try {
    navigator.modelContext.provideContext({
      tools: [
        {
          name: 'search_platforms',
          description: 'Search pay-to-rank bidding platforms by keyword, category, or founder.',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search term or domain' },
              category: { type: 'string', description: 'Filter by category' }
            }
          },
          execute: async ({ query, category }) => {
            const res = await fetch('/api/sites?q=' + encodeURIComponent(query || '') + '&category=' + encodeURIComponent(category || ''));
            return await res.json();
          }
        },
        {
          name: 'get_timeline_feed',
          description: 'Get latest curated builder tweets and launch milestones from X.',
          inputSchema: { type: 'object', properties: {} },
          execute: async () => {
            const res = await fetch('/api/timeline');
            return await res.json();
          }
        }
      ]
    });
  } catch (e) {}
}
</script>
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
<script src="https://unpkg.com/@phosphor-icons/web@2.1.1" defer></script>
<meta name="view-transition" content="same-origin">
</head>
<body class="min-h-screen">

<div class="max-w-app mx-auto px-4 sm:px-6 min-h-screen flex flex-col">

  ${renderHeader({ active: 'directory' })}

  <!-- DIRECTORY VIEW WRAPPER (Preserved in DOM at all times) -->
  <div id="directoryView" class="flex flex-col flex-1">
    
    <!-- Hero Section -->
    <section class="pt-4 pb-6">
      <div id="heroBadge" class="pill inline-flex items-center gap-1.5 px-3 py-1 mb-3 status-live text-[12px] font-semibold">
        <span class="w-1.5 h-1.5 rounded-full" style="background: var(--mosambi-dark);"></span>
        ${stats.total_sites} platforms cataloged · sorted by domain age
      </div>
      <h1 class="display text-[30px] sm:text-[34px] leading-[1.12] font-extrabold tracking-tight mb-2 text-[var(--ink)]">
        Every builder<br>chasing the outbid trend.
      </h1>
      <h2 class="text-[15px] sm:text-[16px] font-bold text-[var(--ink)] mb-2">
        Verified Pay-to-Rank Outbid Directory & Analytics
      </h2>
      <p class="text-[14.5px] sm:text-[15px] text-[#5B5A4E] leading-relaxed mb-5 max-w-xl">
        outbid.lol started the pay-to-rank leaderboard format. Over ${stats.total_sites} builders have shipped their own versions since. I sort them by domain registration date so you can see who launched first.
      </p>
      <div class="flex flex-wrap items-center gap-2.5">
        <button id="openSubmit" data-track="open_submit_modal" class="btn-primary pill px-5 py-3 text-[14px] font-bold flex items-center gap-2 shadow-sm">
          <i class="ph-bold ph-plus"></i>
          Submit a site
        </button>
      </div>
    </section>

    <!-- Sort explainer banner -->
    <section class="card p-5 mb-5 shadow-sm" style="background: var(--ink);">
      <h2 class="text-[12px] font-bold tracking-wide uppercase mb-1.5" style="color: var(--mosambi);">Ranked by domain registration date</h2>
      <p class="text-[12px] text-[#B9B6A4] flex items-center gap-1.5">
        <i class="ph-bold ph-calendar-check text-[13px]" style="color: var(--mosambi);"></i>
        Oldest domains sit at the top, regardless of current bid price or traffic.
      </p>
    </section>

    <!-- Stats Grid -->
    <section class="mb-6">
      <h2 class="sr-only">Directory Statistics & Chronology Insights</h2>
      <div class="grid grid-cols-3 gap-2.5 sm:gap-3">
        <div class="card p-3.5 sm:p-4 text-center sm:text-left">
          <p id="statsSitesCount" class="text-[22px] sm:text-[24px] font-extrabold display leading-none mb-1 text-[var(--ink)]">${stats.total_sites}</p>
          <p class="text-[11.5px] text-[#8A8574] leading-tight font-medium">Platforms listed</p>
        </div>
        <div class="card p-3.5 sm:p-4 text-center sm:text-left">
          <p id="statsLiveCount" class="text-[22px] sm:text-[24px] font-extrabold display leading-none mb-1" style="color: var(--mosambi-dark);">${stats.live_sites}</p>
          <p class="text-[11.5px] text-[#8A8574] leading-tight font-medium">Active boards</p>
        </div>
        <div class="card p-3.5 sm:p-4 text-center sm:text-left">
          <p id="statsOldestDate" class="text-[22px] sm:text-[24px] font-extrabold display leading-none mb-1 text-[var(--ink)]">${oldestDateFormatted}</p>
          <p class="text-[11.5px] text-[#8A8574] leading-tight font-medium">First registered</p>
        </div>
      </div>
    </section>

    <!-- Search and Filter Bar Row -->
    <section class="mb-5">
      <h2 class="sr-only">Search and Filter Directory Platforms</h2>
      <div class="flex items-center gap-2.5">
        <div class="relative flex-1">
          <i class="ph-bold ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-[16px] text-[#8A8574]"></i>
          <input
            id="searchInput"
            type="text"
            value="${escapeHtml(q)}"
            placeholder="Search platforms, founders, or countries..."
            class="w-full pl-11 pr-10 py-3 rounded-2xl border border-[#E4E1D4] bg-white text-[14px] text-[var(--ink)] outline-none focus:border-[var(--mosambi-dark)] focus:ring-2 focus:ring-[var(--mosambi-light)] transition-all shadow-sm"
          />
          <button id="searchClear" class="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center bg-[#F1EFE6] text-[#8A8574] hover:text-[var(--ink)] ${q ? '' : 'hidden'}">
            <i class="ph-bold ph-x text-[11px]"></i>
          </button>
        </div>

        <button id="openFilterBtn" class="pill px-4 py-3 rounded-2xl border border-[#E4E1D4] bg-white text-[var(--ink)] hover:bg-[#F5F4EC] hover:border-[#CCD99B] font-bold text-[13.5px] transition-all flex items-center gap-2 shrink-0 shadow-sm">
          <i class="ph-bold ph-faders text-[16px] text-[#5B5A4E]"></i>
          <span>Filter</span>
          <span id="activeFilterBadge" class="w-5 h-5 rounded-full text-[11px] font-extrabold flex items-center justify-center ${category && category !== 'all' ? '' : 'hidden'}" style="background: var(--mosambi); color:#1E2417;">1</span>
        </button>
      </div>

      <div id="activeFilterIndicator" class="mt-2.5 flex items-center justify-between text-[12.5px] text-[#5B5A4E] ${category && category !== 'all' ? '' : 'hidden'}">
        <span id="activeFilterText">Filtered by: <strong>${escapeHtml(category || 'All Sites')}</strong></span>
        <button id="clearAllFiltersBtn" class="text-[12px] font-bold text-[var(--mosambi-dark)] hover:underline flex items-center gap-1">
          <i class="ph-bold ph-x"></i> Clear filters
        </button>
      </div>
    </section>

    <!-- Live Directory Cards List (Server-Side Rendered!) -->
    <main class="flex-1 pb-12">
      <h2 class="text-[18px] sm:text-[20px] font-extrabold display text-[var(--ink)] mb-3 flex items-center justify-between">
        <span>Verified Platforms</span>
        <span class="text-[13px] font-normal text-[#8A8574]">${meta.total} total</span>
      </h2>
      <div id="loadingState" class="p-8 text-center text-[#8A8574] flex items-center justify-center gap-2 hidden">
        <i class="ph-bold ph-spinner animate-spin text-[20px] text-[var(--mosambi-dark)]"></i>
        <span class="text-[14px] font-medium">Updating directory...</span>
      </div>

      <div id="emptyState" class="card p-10 text-center ${meta.total === 0 ? '' : 'hidden'}">
        <div class="w-12 h-12 rounded-full bg-[#F5F4EC] flex items-center justify-center mx-auto mb-3 text-[#8A8574]">
          <i class="ph-bold ph-magnifying-glass text-[20px]"></i>
        </div>
        <h3 class="display font-bold text-[17px] text-[var(--ink)] mb-1">No matching platforms found</h3>
        <p class="text-[13px] text-[#8A8574] max-w-xs mx-auto">Try changing your search terms or clearing the active filters.</p>
      </div>

      <div id="sitesContainer" class="flex flex-col gap-3.5">
        ${cardsHtml}
      </div>

      <!-- Server-Side Pagination Controls -->
      <div id="paginationControls" class="mt-7 flex items-center justify-between pt-4 border-t border-[#ECEAE0] ${meta.total > 0 ? '' : 'hidden'}">
        <button id="prevPageBtn" ${meta.has_prev_page ? '' : 'disabled'} class="pill px-4 py-2 text-[13px] font-bold border border-[#E4E1D4] bg-white text-[var(--ink)] hover:bg-[#F5F4EC] disabled:opacity-35 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-sm">
          <i class="ph-bold ph-caret-left"></i> Prev
        </button>
        <div id="paginationPageDisplay" class="text-[13.5px] font-bold text-[var(--ink)] display">
          Page <span id="currentPageNum" class="text-[var(--mosambi-dark)]">${meta.page}</span> of <span id="totalPagesNum">${meta.total_pages}</span>
        </div>
        <button id="nextPageBtn" ${meta.has_next_page ? '' : 'disabled'} class="pill px-4 py-2 text-[13px] font-bold border border-[#E4E1D4] bg-white text-[var(--ink)] hover:bg-[#F5F4EC] disabled:opacity-35 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-sm">
          Next <i class="ph-bold ph-caret-right"></i>
        </button>
      </div>
    </main>
  </div>

  <!-- SINGLE BOARD PROFILE VIEW -->
  <div id="boardProfileView" class="hidden flex flex-col flex-1 pb-12"></div>

  ${renderFooter({ active: 'directory' })}

</div>

<!-- Filter Popover / Drawer -->
<div id="filterOverlay">
  <div id="filterSheet">
    <div class="sheet-handle"></div>

    <div class="flex items-center justify-between mb-2">
      <h2 class="display text-[20px] font-extrabold tracking-tight text-[var(--ink)]">Filter Directory</h2>
      <button id="closeFilterBtn" class="w-8 h-8 rounded-full flex items-center justify-center bg-[#F5F4EC] text-[#5B5A4E] hover:bg-[#EAE7DC] transition-colors">
        <i class="ph-bold ph-x text-[15px]"></i>
      </button>
    </div>
    <p class="text-[13px] text-[#8A8574] mb-5">Filter platforms by category, sort order, or page size.</p>

    <!-- Categories Section -->
    <div class="mb-5">
      <label class="text-[12.5px] font-extrabold text-[var(--ink)] uppercase tracking-wider block mb-2.5">Category</label>
      <div id="filterCategoryTags" class="flex flex-wrap gap-1.5">
        ${categoryPillsHtml}
      </div>
    </div>

    <!-- Chronology & Sort -->
    <div class="mb-5">
      <label class="text-[12.5px] font-extrabold text-[var(--ink)] uppercase tracking-wider block mb-2.5">Sort Order</label>
      <div class="grid grid-cols-3 gap-2">
        <button data-sort-val="oldest" class="sort-tag-btn pill py-2 px-3 text-[12.5px] font-bold border border-[var(--ink)] bg-[var(--ink)] text-white text-center transition-all">
          Oldest (First)
        </button>
        <button data-sort-val="newest" class="sort-tag-btn pill py-2 px-3 text-[12.5px] font-bold border border-[#E4E1D4] bg-white text-[var(--ink)] text-center transition-all hover:bg-[#F5F4EC]">
          Newest
        </button>
        <button data-sort-val="name" class="sort-tag-btn pill py-2 px-3 text-[12.5px] font-bold border border-[#E4E1D4] bg-white text-[var(--ink)] text-center transition-all hover:bg-[#F5F4EC]">
          Domain (A-Z)
        </button>
      </div>
    </div>

    <!-- Items Per Page -->
    <div class="mb-6">
      <label class="text-[12.5px] font-extrabold text-[var(--ink)] uppercase tracking-wider block mb-2.5">Items Per Page</label>
      <div class="grid grid-cols-4 gap-2">
        <button data-pagesize-val="25" class="pagesize-tag-btn pill py-2 text-[12.5px] font-bold border border-[var(--ink)] bg-[var(--ink)] text-white text-center transition-all">
          25
        </button>
        <button data-pagesize-val="50" class="pagesize-tag-btn pill py-2 text-[12.5px] font-bold border border-[#E4E1D4] bg-white text-[var(--ink)] text-center transition-all hover:bg-[#F5F4EC]">
          50
        </button>
        <button data-pagesize-val="100" class="pagesize-tag-btn pill py-2 text-[12.5px] font-bold border border-[#E4E1D4] bg-white text-[var(--ink)] text-center transition-all hover:bg-[#F5F4EC]">
          100
        </button>
        <button data-pagesize-val="250" class="pagesize-tag-btn pill py-2 text-[12.5px] font-bold border border-[#E4E1D4] bg-white text-[var(--ink)] text-center transition-all hover:bg-[#F5F4EC]">
          All
        </button>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex items-center gap-3 pt-3 border-t border-[#ECEAE0]">
      <button id="resetFiltersBtn" class="pill py-3 px-5 text-[13px] font-bold border border-[#E4E1D4] bg-white text-[#5B5A4E] hover:bg-[#F5F4EC] transition-colors">
        Reset
      </button>
      <button id="applyFiltersBtn" class="btn-primary pill py-3 px-6 text-[13.5px] font-bold flex-1 text-center shadow-sm">
        Apply Filters
      </button>
    </div>
  </div>
</div>

<!-- Submit Modal Dialog -->
<div id="submitOverlay">
  <div id="submitSheet">
    <div class="sheet-handle"></div>

    <div class="flex items-center justify-between mb-1">
      <h2 class="display text-[20px] font-extrabold tracking-tight text-[var(--ink)]">Submit a platform</h2>
      <button id="closeSubmit" class="w-8 h-8 rounded-full flex items-center justify-center bg-[#F5F4EC] text-[#5B5A4E] hover:bg-[#EAE7DC] transition-colors">
        <i class="ph-bold ph-x text-[15px]"></i>
      </button>
    </div>
    <p class="text-[13px] text-[#8A8574] mb-4 leading-relaxed">
      I review each submission against public WHOIS data and founder accounts before listing.
    </p>

    <div id="submitFeedback" class="mb-3 empty:hidden"></div>

    <form id="submitForm" class="flex flex-col gap-3.5">
      <div>
        <label class="text-[12.5px] font-bold text-[var(--ink)] mb-1 block">Platform URL <span class="text-red-500">*</span></label>
        <input id="submitUrl" type="url" required placeholder="https://example.lol" class="field-input">
      </div>

      <div>
        <label class="text-[12.5px] font-bold text-[var(--ink)] mb-1 block">Founder's X Handle <span class="text-red-500">*</span></label>
        <input id="submitHandle" type="text" required placeholder="@username" class="field-input">
      </div>

      <div class="grid grid-cols-2 gap-2.5">
        <div>
          <label class="text-[12.5px] font-bold text-[var(--ink)] mb-1 block">Location / Country <span class="text-red-500">*</span></label>
          <input id="submitLocation" type="text" required placeholder="e.g. Madrid, Spain" class="field-input">
        </div>
        <div>
          <label class="text-[12.5px] font-bold text-[var(--ink)] mb-1 block">Launch Date <span class="text-red-500">*</span></label>
          <input id="submitDate" type="date" required class="field-input">
        </div>
      </div>

      <div>
        <label class="text-[12.5px] font-bold text-[var(--ink)] mb-1 block">Platform Currency</label>
        <select id="submitCurrency" class="field-input cursor-pointer">
          <option value="USD">USD ($)</option>
          <option value="EUR">EUR (€)</option>
          <option value="INR">INR (₹)</option>
          <option value="SOL">SOL (◎)</option>
          <option value="USDC">USDC ($)</option>
          <option value="BRL">BRL (R$)</option>
          <option value="GBP">GBP (£)</option>
          <option value="CLICKS">CLICKS</option>
          <option value="LIKES">LIKES</option>
        </select>
      </div>

      <div>
        <label class="text-[12.5px] font-bold text-[var(--ink)] mb-1 block">Submitter Note <span class="text-[#8A8574] font-normal">(optional)</span></label>
        <input id="submitNote" type="text" placeholder="Launch tweet URL or context..." class="field-input">
      </div>

      <button id="submitBtn" type="submit" class="btn-primary pill py-3.5 text-[14px] font-bold mt-1.5 flex items-center justify-center gap-2 shadow-sm">
        <i class="ph-bold ph-paper-plane-tilt"></i>
        Send for review
      </button>
    </form>
  </div>
</div>

${renderMobileNavDrawer({ active: 'directory' })}

<script>
  window.__INITIAL_DATA__ = {
    page: ${meta.page},
    limit: ${meta.limit},
    total: ${meta.total},
    totalPages: ${meta.total_pages},
    category: ${JSON.stringify(category || 'all')},
    sort: ${JSON.stringify(sort || 'oldest')},
    q: ${JSON.stringify(q || '')}
  };
</script>
<script src="/app.js"></script>
</body>
</html>`;

  c.header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  return c.html(html);
};

directoryViewRouter.get('/', handleDirectory);
directoryViewRouter.get('/index.md', (c) => {
  // Enforce markdown output for direct .md URL
  return handleDirectory(c);
});
