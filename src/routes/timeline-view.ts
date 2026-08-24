import { Hono } from 'hono';
import type { Env, AppVariables } from '../types/env';
import { fetchTimelineTweets, type TimelineTweet } from '../lib/x-search';

export const timelineViewRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatRelativeTime(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    if (isNaN(diffMs)) return 'recently';
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'recently';
  }
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function formatRichTweetHtml(tweet: TimelineTweet): string {
  let text = decodeHtmlEntities(tweet.text || '').trim();

  // 1. Remove trailing media URLs if media_url is present
  if (tweet.media_url) {
    text = text.replace(/https?:\/\/(?:pic\.twitter\.com|pic\.x\.com|t\.co)\/[a-zA-Z0-9_]+\s*$/gi, '').trim();
  }

  const tokens: Array<{ id: string; html: string }> = [];
  function createToken(html: string): string {
    const id = `___TKN_${tokens.length}___`;
    tokens.push({ id, html });
    return id;
  }

  // 2. Replace entity URLs with clean display text and expanded links
  if (tweet.urls && Array.isArray(tweet.urls)) {
    for (const u of tweet.urls) {
      if (u.url && text.includes(u.url)) {
        const display = u.display_url || u.expanded_url || u.url;
        const target = u.expanded_url || u.url;
        const html = `<a href="${escapeHtml(target)}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-600 font-normal hover:underline transition-colors" onclick="event.stopPropagation();"><span>${escapeHtml(display)}</span></a>`;
        text = text.split(u.url).join(createToken(html));
      }
    }
  }

  // 3. Replace any remaining URLs
  text = text.replace(/https?:\/\/[^\s<]+/gi, (url) => {
    const html = `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-600 font-normal hover:underline transition-colors" onclick="event.stopPropagation();"><span>${escapeHtml(url)}</span></a>`;
    return createToken(html);
  });

  // 4. Replace @mentions
  text = text.replace(/@([a-zA-Z0-9_]{1,15})/g, (_m, handle) => {
    const html = `<a href="https://x.com/${encodeURIComponent(handle)}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-600 font-normal hover:underline transition-colors" onclick="event.stopPropagation();"><span>@${escapeHtml(handle)}</span></a>`;
    return createToken(html);
  });

  // 5. Replace #hashtags
  text = text.replace(/#([a-zA-Z0-9_]+)/g, (_m, tag) => {
    const html = `<a href="https://x.com/hashtag/${encodeURIComponent(tag)}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-600 font-normal hover:underline transition-colors" onclick="event.stopPropagation();"><span>#${escapeHtml(tag)}</span></a>`;
    return createToken(html);
  });

  // 6. Escape all remaining text
  let safeHtml = escapeHtml(text);

  // 7. Re-insert pristine tokens
  for (const { id, html } of tokens) {
    safeHtml = safeHtml.split(id).join(html);
  }

  return `<span class="text-[var(--ink)] text-[15px] font-normal leading-relaxed">${safeHtml}</span>`;
}

timelineViewRouter.get('/', async (c) => {
  const timelineResult = await fetchTimelineTweets(c.env);
  const tweets = timelineResult.tweets;

  const host = c.req.header('host') || 'outbidwatch.lol';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;
  const accept = c.req.header('Accept') || '';

  // 1. Markdown Content Negotiation for AI Agents (acceptmarkdown.com) and .md URLs
  if (accept.includes('text/markdown') || c.req.path.endsWith('.md')) {
    let md = `# OutbidWatch Community Timeline
> Real-time builder launch notes, commentary, and reactions from builders experimenting with outbid leaderboards.

- **Total Recent Posts**: ${tweets.length}
- **Source**: Curated real-time posts from X (merged queries for \`"outbid.lol" OR "pay to outbid"\` & \`@jonathan_wilke\`)
- **Updated**: ${new Date().toUTCString()}

## Recent Posts (${tweets.length})

`;
    for (const tweet of tweets) {
      md += `### ${tweet.author_name} (@${tweet.author_username}) ${tweet.author_verified ? '✓' : ''} · ${formatRelativeTime(tweet.created_at)}
- **Tweet**: ${tweet.text}
- **Likes**: ${tweet.metrics?.like_count || 0} | **Reposts**: ${tweet.metrics?.retweet_count || 0} | **Replies**: ${tweet.metrics?.reply_count || 0}
- **URL**: ${tweet.url}
${tweet.media_url ? `- **Media**: ${tweet.media_url}` : ''}

`;
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
    '@type': 'CollectionPage',
    name: 'OutbidWatch Community Timeline',
    description: 'Community discussions, launch posts, and reactions around the pay-to-rank leaderboard format.',
    url: `${baseUrl}/timeline`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: tweets.slice(0, 10).map((t, idx) => ({
        '@type': 'SocialMediaPosting',
        position: idx + 1,
        author: {
          '@type': 'Person',
          name: t.author_name,
          url: `https://x.com/${t.author_username}`,
        },
        datePublished: t.created_at,
        url: t.url,
        articleBody: t.text,
      })),
    },
  };

  const ogImage = `${baseUrl}/api/og?title=${encodeURIComponent("What's being said about the outbid trend")}&tag=Live%20Timeline&desc=${encodeURIComponent('Community discussions, launch posts, and reactions around the pay-to-rank leaderboard format.')}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OutbidWatch | Community Timeline</title>
<meta name="description" content="Community discussions, launch posts, and reactions around the pay-to-rank leaderboard format.">
<link rel="canonical" href="${baseUrl}/timeline">
<meta property="og:title" content="OutbidWatch | Community Timeline">
<meta property="og:description" content="Community discussions, launch posts, and reactions around the pay-to-rank leaderboard format.">
<meta property="og:url" content="${baseUrl}/timeline">
<meta property="og:type" content="website">
<meta property="og:image" content="${ogImage}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:creator" content="@alvaisy">
<meta name="twitter:image" content="${ogImage}">
<meta name="referrer" content="no-referrer">
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

  <!-- Header -->
  <header class="pt-6 pb-4 flex items-center justify-between sticky top-0 bg-[var(--paper)]/95 backdrop-blur z-30 border-b border-transparent">
    <a href="/" class="flex items-center gap-2.5">
      <div class="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm" style="background: var(--mosambi);">
        <i class="ph-fill ph-gavel text-[16px]" style="color:#1E2417;"></i>
      </div>
      <span class="display font-extrabold text-[18px] tracking-tight text-[var(--ink)] hidden sm:inline-block">outbidwatch</span>
    </a>
    <div class="flex items-center gap-2">
      <a href="/" class="pill px-3.5 py-1.5 text-[13px] font-semibold border border-[#E4E1D4] text-[#5B5A4E] hover:border-[#CCD99B] transition-colors">
        Directory
      </a>
      <a href="/timeline" class="pill px-3.5 py-1.5 text-[13px] font-bold transition-colors bg-[var(--ink)] text-white shadow-sm">
        Timeline
      </a>
      <a href="/map" class="pill px-3.5 py-1.5 text-[13px] font-semibold border border-[#E4E1D4] text-[#5B5A4E] hover:border-[#CCD99B] transition-colors">
        Map
      </a>
      <a href="https://github.com/osspakistan/outbidwatch-lol" target="_blank" rel="noopener noreferrer" title="View Source on GitHub" class="pill px-3 py-1.5 text-[13px] font-semibold border border-[#E4E1D4] text-[#5B5A4E] hover:border-[#CCD99B] hover:text-[var(--ink)] transition-colors flex items-center gap-1.5">
        <i class="ph-bold ph-github-logo text-[15px]"></i>
        <span class="hidden sm:inline-block">GitHub</span>
      </a>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="pt-4 pb-6">
    <div class="pill inline-flex items-center gap-1.5 px-3 py-1 mb-3 status-live text-[12px] font-semibold">
      <span class="w-1.5 h-1.5 rounded-full" style="background: var(--mosambi-dark);"></span>
      Public posts from X
    </div>
    <h1 class="display text-[30px] sm:text-[34px] leading-[1.12] font-extrabold tracking-tight mb-3 text-[var(--ink)]">
      What's being said<br>about the outbid trend.
    </h1>
    <p class="text-[14.5px] sm:text-[15px] text-[#5B5A4E] leading-relaxed mb-5 max-w-xl">
      Recent launch notes, commentary, and reactions from builders experimenting with outbid leaderboards.
    </p>
    <div class="flex flex-wrap items-center gap-2.5">
      <button id="openSubmit" class="btn-primary pill px-5 py-2.5 text-[13.5px] font-bold flex items-center gap-2 shadow-sm">
        <i class="ph-bold ph-plus"></i>
        Submit a site
      </button>
      <a href="https://x.com/search?q=${encodeURIComponent('("outbid.lol" OR "pay to outbid") -is:retweet')}&f=live" target="_blank" rel="noopener noreferrer" class="hidden pill px-4 py-2.5 text-[13px] font-bold border border-[#E4E1D4] bg-white text-[var(--ink)] hover:bg-[#F5F4EC] transition-colors items-center gap-1.5 shadow-sm">
        <i class="ph-bold ph-x-logo text-[13px]"></i>
        Search on X
      </a>
    </div>
  </section>

  <!-- Timeline Feed Content -->
  <main class="flex-1 pb-12">
    <div class="flex flex-col gap-4">
      ${tweets.map((tweet: TimelineTweet) => `
        <article 
          class="relative flex h-fit w-full flex-col gap-4 overflow-hidden rounded-2xl border border-[#ECEAE0] bg-white p-5 sm:p-6 shadow-sm hover:border-[#CCD99B] hover:shadow-md transition-all cursor-pointer"
          onclick="const sel = window.getSelection()?.toString(); if (!sel && !event.target.closest('a') && !event.target.closest('button') && !event.target.closest('video')) window.open('${escapeHtml(tweet.url)}', '_blank', 'noopener,noreferrer');"
        >
          <!-- Top Header Row -->
          <div class="flex flex-row items-start justify-between tracking-normal">
            <div class="flex items-center space-x-3 min-w-0">
              <a href="https://x.com/${encodeURIComponent(tweet.author_username)}" target="_blank" rel="noreferrer" class="shrink-0" onclick="event.stopPropagation();">
                ${tweet.author_profile_image ? `
                  <img title="Profile picture of ${escapeHtml(tweet.author_name)}" alt="${escapeHtml(tweet.author_username)}" height="48" width="48" class="w-12 h-12 rounded-full border border-[#ECEAE0] object-cover" src="${escapeHtml(tweet.author_profile_image)}" loading="lazy" onerror="this.style.display='none';" />
                ` : `
                  <div class="w-12 h-12 rounded-full bg-[#F5F4EC] border border-[#ECEAE0] flex items-center justify-center text-[var(--ink)] font-bold text-[15px]">
                    ${escapeHtml(tweet.author_name.slice(0, 1).toUpperCase())}
                  </div>
                `}
              </a>
              <div class="flex flex-col gap-0.5 min-w-0">
                <a href="https://x.com/${encodeURIComponent(tweet.author_username)}" target="_blank" rel="noreferrer" class="text-[var(--ink)] flex items-center font-bold text-[15.5px] whitespace-nowrap transition-opacity hover:opacity-80 leading-snug" onclick="event.stopPropagation();">
                  <span class="truncate">${escapeHtml(tweet.author_name)}</span>
                  ${tweet.author_verified ? `
                    <svg aria-label="Verified Account" viewBox="0 0 24 24" class="ml-1 inline size-4 text-[#1D9BF0] shrink-0 fill-current">
                      <g fill="currentColor">
                        <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z"></path>
                      </g>
                    </svg>
                  ` : ''}
                </a>
                <div class="flex items-center space-x-1.5 text-sm text-[#8A8574]">
                  <a href="https://x.com/${encodeURIComponent(tweet.author_username)}" target="_blank" rel="noreferrer" class="text-[#8A8574] hover:text-[var(--ink)] text-sm transition-colors truncate" onclick="event.stopPropagation();">
                    @${escapeHtml(tweet.author_username)}
                  </a>
                  <span>·</span>
                  <span class="shrink-0">${formatRelativeTime(tweet.created_at)}</span>
                </div>
              </div>
            </div>
            <a href="${escapeHtml(tweet.url)}" target="_blank" rel="noreferrer" class="text-[#8A8574] hover:text-[var(--ink)] p-1.5 transition-all ease-in-out hover:scale-105 shrink-0" onclick="event.stopPropagation();">
              <span class="sr-only">Link to tweet</span>
              <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="1.25em" width="1.25em" xmlns="http://www.w3.org/2000/svg" class="size-5 items-start">
                <g><path fill="none" d="M0 0h24v24H0z"></path><path d="M22.162 5.656a8.384 8.384 0 0 1-2.402.658A4.196 4.196 0 0 0 21.6 4c-.82.488-1.719.83-2.656 1.015a4.182 4.182 0 0 0-7.126 3.814 11.874 11.874 0 0 1-8.62-4.37 4.168 4.168 0 0 0-.566 2.103c0 1.45.738 2.731 1.86 3.481a4.168 4.168 0 0 1-1.894-.523v.052a4.185 4.185 0 0 0 3.355 4.101 4.21 4.21 0 0 1-1.89.072A4.185 4.185 0 0 0 7.97 16.65a8.394 8.394 0 0 1-6.191 1.732 11.83 11.83 0 0 0 6.41 1.88c7.693 0 11.9-6.373 11.9-11.9 0-.18-.005-.362-.013-.54a8.496 8.496 0 0 0 2.087-2.165z"></path></g>
              </svg>
            </a>
          </div>

          <!-- Tweet Body Content (Inline to eliminate template leading space) -->
          <div class="text-[15px] leading-relaxed tracking-normal wrap-break-word whitespace-pre-wrap font-normal text-[#23281C] select-text">${formatRichTweetHtml(tweet)}</div>

          <!-- Embedded Media Photo / Video Attachment -->
          ${tweet.media_url ? `
            <div class="flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-[#ECEAE0] bg-[#F5F4EC]/60 shadow-sm">
              ${tweet.video_url ? `
                <video poster="${escapeHtml(tweet.media_url)}" autoplay loop muted playsinline controls preload="metadata" referrerpolicy="no-referrer" class="w-full max-h-[480px] object-cover rounded-xl bg-black" onclick="event.stopPropagation();">
                  <source src="${escapeHtml(tweet.video_url)}" type="video/mp4" referrerpolicy="no-referrer">
                  Your browser does not support video playback.
                </video>
              ` : `
                <a href="${escapeHtml(tweet.media_url)}" target="_blank" rel="noopener noreferrer" class="block w-full cursor-zoom-in" onclick="event.stopPropagation();" title="View full image">
                  <img src="${escapeHtml(tweet.media_url)}" alt="Tweet media attachment" referrerpolicy="no-referrer" class="w-full h-auto max-h-[480px] object-cover rounded-xl hover:opacity-95 transition-opacity" loading="lazy" />
                </a>
              `}
            </div>
          ` : ''}

          <!-- Footer Metrics & X Link -->
          <div class="flex items-center justify-between pt-3 border-t border-[#F0EEE3] text-[13px] text-[#8A8574]">
            <div class="flex items-center gap-5">
              <span class="flex items-center gap-1.5 hover:text-[var(--ink)] transition-colors">
                <i class="ph-bold ph-heart text-[14px]"></i> ${tweet.metrics?.like_count || 0}
              </span>
              <span class="flex items-center gap-1.5 hover:text-[var(--ink)] transition-colors">
                <i class="ph-bold ph-repeat text-[14px]"></i> ${tweet.metrics?.retweet_count || 0}
              </span>
              <span class="flex items-center gap-1.5 hover:text-[var(--ink)] transition-colors">
                <i class="ph-bold ph-chat-circle text-[14px]"></i> ${tweet.metrics?.reply_count || 0}
              </span>
            </div>
            <a href="${escapeHtml(tweet.url)}" target="_blank" rel="noreferrer" class="font-bold flex items-center gap-1 text-[12.5px] hover:underline" style="color: var(--mosambi-dark);" onclick="event.stopPropagation();">
              View on X <i class="ph-bold ph-arrow-up-right text-[11px]"></i>
            </a>
          </div>
        </article>
      `).join('')}
    </div>
  </main>

  <!-- Footer -->
  <footer class="pb-10 pt-4 border-t border-[#ECEAE0] flex flex-col sm:flex-row items-center justify-between gap-3 text-[12.5px] text-[#8A8574]">
    <div class="flex items-center gap-2">
      <span class="font-bold text-[var(--ink)]">outbidwatch</span>
      <span>·</span>
      <span>Verified pay-to-rank platform directory</span>
    </div>
    <div class="flex items-center gap-3">
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
      <a href="/api/feed.json" target="_blank" class="hover:text-[var(--ink)] transition-colors flex items-center gap-1 font-medium">
        <i class="ph-bold ph-rss text-[13px]"></i> Feed
      </a>
    </div>
  </footer>

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

    <!-- Feedback banner -->
    <div id="submitBanner" class="hidden mb-4 p-3.5 rounded-xl text-[13px] leading-snug"></div>

    <form id="submitForm" class="flex flex-col gap-3.5">
      <div>
        <label class="text-[12.5px] font-bold text-[var(--ink)] mb-1 block">Platform URL <span class="text-rose-500">*</span></label>
        <input id="subUrl" type="url" required placeholder="https://example.lol" class="field-input" />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="text-[12.5px] font-bold text-[var(--ink)] mb-1 block">Founder X Handle <span class="text-rose-500">*</span></label>
          <div class="relative">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8574] font-medium text-[14px]">@</span>
            <input id="subFounder" type="text" required placeholder="username" class="field-input pl-8" />
          </div>
        </div>

        <div>
          <label class="text-[12.5px] font-bold text-[var(--ink)] mb-1 block">Founder Location <span class="text-rose-500">*</span></label>
          <input id="subLocation" type="text" required placeholder="City, Country (e.g. Paris, France)" class="field-input" />
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="text-[12.5px] font-bold text-[var(--ink)] mb-1 block">Domain Reg / Launch Date <span class="text-rose-500">*</span></label>
          <input id="subLaunchDate" type="date" required class="field-input" />
        </div>

        <div>
          <label class="text-[12.5px] font-bold text-[var(--ink)] mb-1 block">Bidding Currency</label>
          <select id="subCurrency" class="field-input">
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="SOL">SOL</option>
            <option value="ETH">ETH</option>
          </select>
        </div>
      </div>

      <div>
        <label class="text-[12.5px] font-bold text-[var(--ink)] mb-1 block">Submitter Note <span class="text-[#8A8574] font-normal">(optional)</span></label>
        <textarea id="subNote" rows="2" placeholder="Any context or verification details..." class="field-input resize-none"></textarea>
      </div>

      <button id="subSubmitBtn" type="submit" class="btn-primary pill py-3.5 text-[14px] font-bold mt-1 flex items-center justify-center gap-2 shadow-sm">
        <i class="ph-bold ph-paper-plane-tilt"></i>
        <span>Send for Review</span>
      </button>
    </form>
  </div>
</div>

<script>
  // Simple modal open/close
  const submitOverlay = document.getElementById('submitOverlay');
  const openSubmitBtn = document.getElementById('openSubmit');
  const closeSubmitBtn = document.getElementById('closeSubmit');
  const submitForm = document.getElementById('submitForm');
  const submitBanner = document.getElementById('submitBanner');
  const subSubmitBtn = document.getElementById('subSubmitBtn');

  function openModal() {
    if (submitOverlay) {
      submitOverlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal() {
    if (submitOverlay) {
      submitOverlay.classList.remove('open');
      document.body.style.overflow = '';
      if (submitBanner) {
        submitBanner.className = 'hidden mb-4 p-3.5 rounded-xl text-[13px] leading-snug';
        submitBanner.innerHTML = '';
      }
    }
  }

  if (openSubmitBtn) openSubmitBtn.addEventListener('click', openModal);
  if (closeSubmitBtn) closeSubmitBtn.addEventListener('click', closeModal);
  if (submitOverlay) {
    submitOverlay.addEventListener('click', (e) => {
      if (e.target === submitOverlay) closeModal();
    });
  }

  if (submitForm) {
    submitForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!subSubmitBtn) return;
      subSubmitBtn.disabled = true;
      subSubmitBtn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Submitting...';

      const payload = {
        url: document.getElementById('subUrl').value.trim(),
        founder_x_handle: document.getElementById('subFounder').value.trim().replace(/^@/, ''),
        founder_location: document.getElementById('subLocation').value.trim(),
        launch_date: document.getElementById('subLaunchDate').value,
        currency: document.getElementById('subCurrency').value,
        submitter_note: document.getElementById('subNote').value.trim() || undefined
      };

      try {
        const res = await fetch('/api/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (res.ok && data.success) {
          submitBanner.className = 'mb-4 p-3.5 rounded-xl text-[13px] leading-snug bg-[#EEF4D9] text-[#4A5D19] border border-[#CCD99B] block';
          submitBanner.innerHTML = '<strong>Submitted for verification:</strong> ' + data.message;
          submitForm.reset();
          setTimeout(closeModal, 2500);
        } else if (res.status === 409) {
          submitBanner.className = 'mb-4 p-3.5 rounded-xl text-[13px] leading-snug bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] block';
          submitBanner.innerHTML = '<strong>Notice:</strong> ' + (data.error || 'This platform is already in our directory.');
        } else {
          submitBanner.className = 'mb-4 p-3.5 rounded-xl text-[13px] leading-snug bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA] block';
          submitBanner.innerHTML = '<strong>Error:</strong> ' + (data.error || 'Submission failed.');
        }
      } catch (err) {
        submitBanner.className = 'mb-4 p-3.5 rounded-xl text-[13px] leading-snug bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA] block';
        submitBanner.innerHTML = '<strong>Network Error:</strong> Please try again later.';
      } finally {
        subSubmitBtn.disabled = false;
        subSubmitBtn.innerHTML = '<i class="ph-bold ph-paper-plane-tilt"></i> <span>Send for Review</span>';
      }
    });
  }
</script>

</body>
</html>`;

  c.header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  return c.html(html);
});
