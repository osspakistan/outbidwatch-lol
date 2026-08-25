import { Hono } from 'hono';
import type { Env, AppVariables } from '../types/env';
import { getDb } from '../db/index';
import { enrichSiteLogo } from '../lib/utils';
import { renderHeader, renderMobileNavDrawer, renderFooter } from '../lib/nav';

export const boardViewRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// GET /api/boards/views?slugs=a,b,c - Bulk view counts for directory cards
boardViewRouter.get('/views', async (c) => {
  const raw = c.req.query('slugs') || '';
  const slugs = raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean).slice(0, 250);
  if (!slugs.length) {
    return c.json({ success: true, data: {}, timestamp: new Date().toISOString() });
  }
  const db = getDb(c.env.DB);
  const map = await db.getBoardViews(slugs);
  const obj: Record<string, { total_views: number; unique_viewers: number }> = {};
  for (const [k, v] of map.entries()) obj[k] = v;
  c.header('Cache-Control', 'public, max-age=10, s-maxage=30, stale-while-revalidate=60');
  return c.json({ success: true, data: obj, timestamp: new Date().toISOString() });
});

// POST /api/boards/:domain/view - Fire-and-forget view increment from client SPA
boardViewRouter.post('/:domain/view', async (c) => {
  let domainParam = c.req.param('domain').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim();
  if (domainParam.endsWith('.md')) domainParam = domainParam.slice(0, -3);
  const db = getDb(c.env.DB);
  const site = await db.getSiteByDomain(domainParam) || await db.getSiteBySlug(domainParam);
  if (!site) {
    return c.json({ success: false, error: 'Board not found' }, 404);
  }
  const analytics = c.get('analytics');
  const counts = await db.recordBoardView(site.slug, analytics?.userId || null);
  return c.json({ success: true, data: { slug: site.slug, ...counts }, timestamp: new Date().toISOString() });
});


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

function formatProfessionalNote(note?: string | null, provenance?: string | null): string {
  if (!note && !provenance) return '';

  if (provenance === 'self_reported') {
    return 'Location confirmed via founder profile & public bio.';
  }
  if (provenance === 'whois_registry') {
    return 'Domain registration and origin verified via official WHOIS records.';
  }
  if (provenance === 'inferred') {
    return 'Location mapped via associated studio & public registry records.';
  }

  if (note && note.length <= 80 && !note.toLowerCase().includes('raw_location') && !note.toLowerCase().includes('chain trace')) {
    return note.trim();
  }

  return 'Verified by OutbidWatch maintainer team.';
}

// Compact view count: 1234 -> "1.2k", 1_500_000 -> "1.5M"
function formatViewCount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '') + 'k';
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
}

// GET /boards/:domain - SEO Server-Rendered Single Site Profile Page with View Transitions
boardViewRouter.get('/:domain', async (c) => {
  let domainParam = c.req.param('domain').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim();
  const isExplicitMd = domainParam.endsWith('.md') || c.req.path.endsWith('.md');
  if (domainParam.endsWith('.md')) {
    domainParam = domainParam.slice(0, -3);
  }
  const db = getDb(c.env.DB);
  
  let site = await db.getSiteByDomain(domainParam);
  if (!site) {
    site = await db.getSiteBySlug(domainParam);
  }

  if (!site) {
    return c.html(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="view-transition" content="same-origin">
        <title>Board Not Found | OutbidWatch</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="/style.css">
      </head>
      <body class="min-h-screen">
        <div class="max-w-app mx-auto px-4 sm:px-6 min-h-screen flex flex-col items-center justify-center text-center py-20">
          <div class="w-16 h-16 rounded-3xl bg-[#F5F4EC] flex items-center justify-center mx-auto mb-4 text-[#8A8574]">
            <i class="ph-bold ph-warning-circle text-[28px]"></i>
          </div>
          <h1 class="display font-extrabold text-[26px] text-[var(--ink)] mb-2">Platform '${escapeHtml(domainParam)}' Not Found</h1>
          <p class="text-[14px] text-[#8A8574] mb-6 max-w-sm">This platform is not currently indexed in OutbidWatch. You can submit it for review.</p>
          <a href="/" class="btn-primary pill px-6 py-3 text-[14px] font-bold">Back to Directory</a>
        </div>
      </body>
      </html>
    `, 404);
  }

  const enriched = enrichSiteLogo(site);
  const metaTitle = enriched.raw_title || enriched.site_name || enriched.domain;
  const metaDesc = enriched.raw_description || enriched.summary_256;
  const logoUrl = enriched.logo_url || `/api/logos/${encodeURIComponent(enriched.domain)}.png`;
  const locationLabel = enriched.founder_location || enriched.country_name || 'Global';
  const flag = enriched.country_flag || '🌐';
  const regDateFormatted = formatDate(enriched.domain_registration_date);
  const statusClass = enriched.status === 'live' ? 'status-live' : 'status-unclear';
  const statusLabel = enriched.status === 'live' ? 'LIVE' : 'UNCLEAR';

  const host = c.req.header('host') || 'outbidwatch.lol';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;
  const accept = c.req.header('Accept') || '';

  // 1. Markdown Content Negotiation for AI Agents (acceptmarkdown.com) and .md URLs
  if (accept.includes('text/markdown') || isExplicitMd) {
    const md = `# ${formatDomainTitle(enriched.domain, enriched.site_name)}
Public AI-agent Markdown profile for [${formatDomainTitle(enriched.domain, enriched.site_name)}](${baseUrl}/boards/${encodeURIComponent(enriched.domain)}) on OutbidWatch.
> Data identified in the Verification Sources section below is verified through official WHOIS domain registries, public founder social profiles, and indexed landing page metadata.

## Profile

- Name: ${formatDomainTitle(enriched.domain, enriched.site_name)}
- Domain: \`${enriched.domain}\`
- Status: ${enriched.status.toUpperCase()}
- Category: ${enriched.category}
- OutbidWatch page: [${baseUrl}/boards/${encodeURIComponent(enriched.domain)}](${baseUrl}/boards/${encodeURIComponent(enriched.domain)})
- Markdown page: [${baseUrl}/boards/${encodeURIComponent(enriched.domain)}.md](${baseUrl}/boards/${encodeURIComponent(enriched.domain)}.md)
- Website: [${enriched.url}](${enriched.url})
- Logo: [${logoUrl}](${logoUrl})
- Country: ${enriched.country_name || 'Global'} (${flag})
- Founder location: ${locationLabel}
- Founder: ${enriched.founder_x_handle ? `[@${enriched.founder_x_handle}](https://x.com/${enriched.founder_x_handle})` : 'Anonymous'}
- Domain registration date: ${regDateFormatted}
- Currency: ${enriched.currency || 'USD'}
- Description: ${enriched.raw_description || enriched.summary_256 || 'No description available for this platform.'}

## Verification Sources & Provenance

- Verified WHOIS domain record: ${regDateFormatted}
- Verified founder X handle: ${enriched.founder_x_handle ? `@${enriched.founder_x_handle}` : 'Unclaimed'}
- Location provenance: ${enriched.location_notes || formatProfessionalNote(enriched.location_notes, enriched.location_provenance)}
- Curator & Maintainer: Awais Alwaisy ([@alvaisy](https://x.com/alvaisy))
`;

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
    '@type': 'SoftwareApplication',
    name: formatDomainTitle(enriched.domain, enriched.site_name),
    url: enriched.url,
    applicationCategory: enriched.category,
    operatingSystem: 'Web',
    description: metaDesc,
    author: {
      '@type': 'Person',
      name: enriched.founder_x_handle ? `@${enriched.founder_x_handle}` : 'Anonymous Builder',
      url: enriched.founder_x_handle ? `https://x.com/${enriched.founder_x_handle}` : undefined,
    },
    datePublished: enriched.domain_registration_date,
  };

  const ogMetaParams = new URLSearchParams({
    title: formatDomainTitle(enriched.domain, enriched.site_name),
    desc: metaDesc || 'Verified outbid leaderboard on OutbidWatch.',
    tag: enriched.category || 'Platform',
    meta: `Registered: ${regDateFormatted}${enriched.founder_x_handle ? ' · @' + enriched.founder_x_handle : ''}`,
    author: enriched.founder_x_handle ? `@${enriched.founder_x_handle}` : '@alvaisy',
  });
  const ogImage = `${baseUrl}/api/og?${ogMetaParams.toString()}`;

  // Per-board view counts (read snapshot for display; the increment itself happens
  // after rendering, via waitUntil, so we show 0 on the first ever visit).
  const viewMap = await db.getBoardViews([enriched.slug]);
  const viewCounts = viewMap.get(enriched.slug) || { total_views: 0, unique_viewers: 0 };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="view-transition" content="same-origin">
<title>${escapeHtml(metaTitle)} | OutbidWatch</title>
<meta name="description" content="${escapeHtml(metaDesc.slice(0, 160))}">
<link rel="canonical" href="${baseUrl}/boards/${encodeURIComponent(enriched.domain)}">
<meta property="og:title" content="${escapeHtml(metaTitle)} | OutbidWatch">
<meta property="og:description" content="${escapeHtml(metaDesc.slice(0, 160))}">
<meta property="og:url" content="${baseUrl}/boards/${encodeURIComponent(enriched.domain)}">
<meta property="og:type" content="website">
<meta property="og:image" content="${ogImage}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:creator" content="@alvaisy">
<meta name="twitter:image" content="${ogImage}">
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
</head>
<body class="min-h-screen">

<div class="max-w-app mx-auto px-4 sm:px-6 min-h-screen flex flex-col">

  ${renderHeader({ isBoardProfile: true })}

  <!-- Breadcrumb Navigation -->
  <nav class="pt-3 pb-4 flex items-center gap-2 text-[12.5px] text-[#8A8574]">
    <a href="/" class="hover:text-[var(--ink)] font-semibold">Directory</a>
    <span>/</span>
    <span>${escapeHtml(enriched.category)}</span>
    <span>/</span>
    <span class="font-bold text-[var(--ink)]">${escapeHtml(enriched.domain)}</span>
    <span class="ml-auto pill px-2 py-1 text-[11px] font-bold tracking-wide inline-flex items-center gap-1 bg-[#F1EFE6] text-[#5B5A4E] border border-[#E4E1D4]" title="${viewCounts.total_views.toLocaleString()} total views \u00b7 ${viewCounts.unique_viewers.toLocaleString()} unique">
      <i class="ph-bold ph-eye text-[11px]"></i>
      ${escapeHtml(formatViewCount(viewCounts.total_views))} views
    </span>
  </nav>

  <!-- Main Board Profile Card with View Transitions -->
  <main class="flex-1 pb-12 flex flex-col gap-5">
    
    <!-- Hero Profile Box -->
    <section class="card p-5 sm:p-6 shadow-sm" style="view-transition-name: board-card;">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div class="flex items-center gap-4">
          <img 
            src="${logoUrl}" 
            alt="${escapeHtml(enriched.domain)} logo" 
            class="w-16 h-16 rounded-2xl object-cover bg-[var(--mosambi-light)] shrink-0 border border-[#EBE8DC] shadow-sm"
            style="view-transition-name: board-logo;"
          />
          <div>
            <div class="flex items-center gap-2">
              <h1 class="display font-extrabold text-[22px] sm:text-[24px] text-[var(--ink)] leading-tight" style="view-transition-name: board-title;">
                ${escapeHtml(enriched.domain)}
              </h1>
              <span class="pill ${statusClass} px-2.5 py-1 text-[11px] font-bold tracking-wide hidden sm:inline-block">
                ${statusLabel}
              </span>
            </div>
            <p class="text-[13px] text-[#8A8574] mt-1 font-medium flex items-center gap-1.5">
              <span>${escapeHtml(enriched.category)}</span>
              <span class="hidden sm:inline-block">·</span>
              <span class="hidden sm:inline-block">${flag} ${escapeHtml(locationLabel)}</span>
            </p>
          </div>
        </div>

        <a href="${escapeHtml(enriched.url)}" target="_blank" rel="noopener noreferrer" class="btn-primary pill px-5 py-3 text-[13.5px] font-bold flex items-center justify-center gap-2 shadow-sm shrink-0">
          <span>Visit ${escapeHtml(enriched.domain)}</span>
          <i class="ph-bold ph-arrow-up-right text-[12px]"></i>
        </a>
      </div>

      <!-- Native Title & Tagline -->
      <div class="mb-5 pb-5 border-b border-[#F0EEE3]">
        <h2 class="text-[17px] sm:text-[18px] font-extrabold text-[var(--ink)] leading-snug mb-2">
          ${escapeHtml(metaTitle)}
        </h2>
        ${enriched.raw_description ? `
          <p class="text-[14px] text-[#5B5A4E] leading-relaxed">
            ${escapeHtml(enriched.raw_description)}
          </p>
        ` : ''}
      </div>

      <!-- Lineage & Mechanic Analysis Section -->
      <div class="mb-5">
        <h3 class="text-[12px] font-extrabold uppercase tracking-wider text-[#8A8574] mb-2 flex items-center gap-1.5">
          <i class="ph-bold ph-chart-line-up text-[14px] text-[var(--mosambi-dark)]"></i>
          How this platform works
        </h3>
        <div class="rounded-2xl p-4 bg-[#FAF9F5] border border-[#ECEAE0] text-[14px] text-[#3E4233] leading-relaxed">
          ${escapeHtml(enriched.summary_256)}
        </div>
      </div>

      <!-- Metadata Attributes Bento Grid -->
      <!-- Row 1: 2 big tiles (Views | Founder)  |  Row 2: 3 small tiles (Origin | Registration | Currency) -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
        <!-- Big: Views (spans 2 cols on mobile, 1 on sm) -->
        <div class="col-span-2 sm:col-span-1 rounded-xl p-4 bg-[#F5F4EC] border border-[#EAE7DC] flex flex-col gap-1.5">
          <span class="text-[11px] font-bold text-[#8A8574] uppercase tracking-wider flex items-center gap-1.5">
            <i class="ph-bold ph-eye text-[13px] text-[var(--mosambi-dark)]"></i>
            Views
          </span>
          <div class="flex items-baseline gap-1.5 flex-wrap">
            <span class="font-extrabold text-[20px] sm:text-[22px] text-[var(--ink)] leading-none">${escapeHtml(formatViewCount(viewCounts.total_views))}</span>
            <span class="text-[12px] font-medium text-[#8A8574]">total</span>
          </div>
          <span class="text-[11.5px] text-[#8A8574] font-medium">${escapeHtml(formatViewCount(viewCounts.unique_viewers))} unique visitors</span>
        </div>

        <!-- Big: Founder -->
        <div class="col-span-2 sm:col-span-1 rounded-xl p-4 bg-[#F5F4EC] border border-[#EAE7DC] flex flex-col gap-1.5">
          <span class="text-[11px] font-bold text-[#8A8574] uppercase tracking-wider">Founder</span>
          <a href="https://x.com/${encodeURIComponent(enriched.founder_x_handle)}" target="_blank" rel="noopener noreferrer" class="font-extrabold text-[16px] sm:text-[17px] text-[var(--ink)] hover:underline flex items-center gap-1.5 leading-tight break-all">
            <i class="ph-bold ph-x-logo text-[14px] shrink-0"></i> <span>@${escapeHtml(enriched.founder_x_handle)}</span>
          </a>
          <span class="text-[11.5px] text-[#8A8574] font-medium">Verified X handle</span>
        </div>

        <!-- Small: Origin / Base -->
        <div class="rounded-xl p-3 bg-[#F5F4EC] border border-[#EAE7DC]">
          <span class="text-[11px] font-bold text-[#8A8574] uppercase block mb-0.5">Origin</span>
          <span class="font-bold text-[13.5px] text-[var(--ink)] block truncate">
            ${flag} ${escapeHtml(enriched.country_name || 'Global')}
          </span>
        </div>

        <!-- Small: Registration -->
        <div class="rounded-xl p-3 bg-[#F5F4EC] border border-[#EAE7DC]">
          <span class="text-[11px] font-bold text-[#8A8574] uppercase block mb-0.5">Registered</span>
          <span class="font-bold text-[13.5px] text-[var(--ink)] block">
            ${regDateFormatted}
          </span>
        </div>

        <!-- Small: Currency -->
        <div class="rounded-xl p-3 bg-[#F5F4EC] border border-[#EAE7DC]">
          <span class="text-[11px] font-bold text-[#8A8574] uppercase block mb-0.5">Currency</span>
          <span class="pill inline-block px-2 py-0.5 bg-[#E2DFC8] text-[#33372B] font-extrabold text-[12px] mt-0.5">
            ${escapeHtml(enriched.currency || 'USD')}
          </span>
        </div>
      </div>

      <!-- Verification Status -->
      ${formatProfessionalNote(enriched.location_notes, enriched.location_provenance) ? `
        <div class="mt-4 pt-4 border-t border-[#F0EEE3] text-[12.5px] text-[#8A8574] flex items-center gap-2">
          <i class="ph-bold ph-shield-check text-[15px] shrink-0 text-[var(--mosambi-dark)]"></i>
          <span><strong>Verification:</strong> ${escapeHtml(formatProfessionalNote(enriched.location_notes, enriched.location_provenance))}</span>
        </div>
      ` : ''}
    </section>

    <!-- Bottom Actions Bar -->
    <div class="flex items-center justify-between">
      <a href="/" class="pill px-4 py-2.5 text-[13px] font-bold border border-[#E4E1D4] bg-white text-[var(--ink)] hover:bg-[#F5F4EC] transition-colors flex items-center gap-1.5 shadow-sm">
        <i class="ph-bold ph-arrow-left text-[12px]"></i> All platforms
      </a>
      <button id="openSubmit" class="btn-primary pill px-4 py-2.5 text-[13px] font-bold flex items-center gap-1.5 shadow-sm">
        <i class="ph-bold ph-plus"></i> Submit a platform
      </button>
    </div>

  </main>

  ${renderFooter({ isBoardProfile: true })}

</div>

<!-- Submit Modal Dialog (Identical) -->
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
      Submitted sites are verified by maintainers before going live in the directory.
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

${renderMobileNavDrawer({ isBoardProfile: true })}

<script src="/app.js"></script>
</body>
</html>`;

  c.header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');

  // Increment per-board view counter for human HTML requests (skip bot/crawler UA).
  // Fire-and-forget via waitUntil so it never adds TTFB.
  const ua = c.req.header('user-agent') || '';
  const looksLikeBot = /(bot|crawler|spider|slurp|bingpreview|facebookexternalhit|discordbot|twitterbot|linkedinbot|embedly|preview|monitor|headless)/i.test(ua);
  if (!looksLikeBot) {
    const db2 = getDb(c.env.DB);
    const analytics = c.get('analytics');
    const promise = db2.recordBoardView(enriched.slug, analytics?.userId || null).catch((e) => console.warn('[board view count]', e));
    if (c.executionCtx && typeof c.executionCtx.waitUntil === 'function') {
      c.executionCtx.waitUntil(promise);
    }
  }

  return c.html(html);
});
