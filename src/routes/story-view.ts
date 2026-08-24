import { Hono } from 'hono';
import type { Env, AppVariables } from '../types/env';

export const storyViewRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

storyViewRouter.get('/', (c) => {
  const host = c.req.header('host') || 'outbidwatch.lol';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;
  const accept = c.req.header('Accept') || '';

  const rawStoryMarkdown = `# How OutbidWatch Started
*By Awais Alwaisy ([@alvaisy](https://x.com/alvaisy))*

In August 2026, Jonathan Wilke launched outbid.lol. Within two days, Twitter was full of clones. Every builder was shipping their own pay-to-rank bidding board.

I saw the craze and wanted to build a tracker for all of them.

### The scraping trap

My first plan was simple: take full page screenshots with Jina or a headless browser, run vision OCR with an LLM, and extract JSON with the current leader and total revenue.

I spent 10 hours straight trying to make it work.

It was a complete mess:
- The vision models kept hallucinating the schema.
- Total revenue was tucked into footers, and OCR missed it constantly.
- Token costs were insane. Running 5,000 output tokens on GPT or Claude across 70 sites multiple times an hour was going to burn my credits in days.

### "Bro, I am cooked"

Then I saw someone launched afford.bid.

He was already live, updating 70+ sites every few minutes.

I sat there thinking: *bro, I am cooked. How am I struggling for 10 hours on scraping when someone already shipped it? He outbidded me on my own idea.*

I almost gave up right there. I told myself I was done with scraping.

### The pivot

I took a break and asked myself: why am I even trying to scrape live bid prices that change every 10 seconds?

What do people actually care about?

Two simple things:

1. **Who was actually first?**
Everyone was copying everyone. Nobody knew the real timeline. So I decided to sort every platform by domain registration date (WHOIS date). That way, you see who launched first and who copied later. No fake volatile bids, just domain age.

2. **The community drama on X**
The fun part was never the database numbers. It was the maker launch tweets, revenue flexes, downtime drama, and banter happening live on X. So I built a live feed searching for "outbid.lol" OR "pay to outbid".

### What I shipped

I threw away all the heavy scraping code and kept the stack dead simple:
- Cloudflare Workers + D1 database (sub-10ms response)
- Clean HTML and Tailwind v4 with zero heavy JS bloat
- 192 platforms cataloged and sorted chronologically
- Live community feed from X
- Full support for AI agents (Markdown and MCP tools)

Getting cooked on the scraper was the best thing that happened. It forced me to stop overcomplicating and ship something useful.

---
*Awais Alwaisy — [@alvaisy](https://x.com/alvaisy)*
`;

  if (accept.includes('text/markdown') || c.req.path.endsWith('.md')) {
    return c.body(rawStoryMarkdown, 200, {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Vary': 'Accept, Accept-Encoding',
      'Cache-Control': 'public, max-age=3600',
    });
  }

  const ogImage = `${baseUrl}/api/og?title=${encodeURIComponent('How OutbidWatch Started')}&tag=Founder%20Story&desc=${encodeURIComponent('From 10 hours of failed scraping to domain registration date sorting and the live X timeline.')}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>How OutbidWatch Started | Awais Alwaisy</title>
<meta name="description" content="How I spent 10 hours struggling with OCR scrapers, got outbidded, and pivoted to building OutbidWatch.">
<link rel="canonical" href="${baseUrl}/story">
<meta property="og:title" content="How OutbidWatch Started">
<meta property="og:description" content="From 10 hours of failed scraping to domain registration sorting and the live X timeline.">
<meta property="og:type" content="article">
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
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css">
<script src="https://unpkg.com/@phosphor-icons/web@2.1.1" defer></script>
</head>
<body class="min-h-screen">

<div class="max-w-app mx-auto px-4 sm:px-6 min-h-screen flex flex-col justify-between">
  
  <!-- Header (Identical standard width & style) -->
  <header class="pt-6 pb-4 flex items-center justify-between sticky top-0 bg-[var(--paper)]/95 backdrop-blur z-30 border-b border-transparent">
    <a href="/" class="flex items-center gap-2.5">
      <div class="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm" style="background: var(--mosambi);">
        <i class="ph-fill ph-gavel text-[16px]" style="color:#1E2417;"></i>
      </div>
      <span class="display font-extrabold text-[18px] tracking-tight text-[var(--ink)]">outbidwatch</span>
    </a>
    <div class="flex items-center gap-2">
      <a href="/" class="pill px-3.5 py-1.5 text-[13px] font-semibold border border-[#E4E1D4] text-[#5B5A4E] hover:border-[#CCD99B] transition-colors">Directory</a>
      <a href="/timeline" class="pill px-3.5 py-1.5 text-[13px] font-semibold border border-[#E4E1D4] text-[#5B5A4E] hover:border-[#CCD99B] transition-colors">Timeline</a>
      <a href="/map" class="pill px-3.5 py-1.5 text-[13px] font-semibold border border-[#E4E1D4] text-[#5B5A4E] hover:border-[#CCD99B] transition-colors">Map</a>
      <a href="/about" class="pill px-3.5 py-1.5 text-[13px] font-semibold border border-[#E4E1D4] text-[#5B5A4E] hover:border-[#CCD99B] transition-colors">About</a>
    </div>
  </header>

  <!-- Plain Article Text -->
  <main class="py-8 flex-1">
    <h1 class="display font-extrabold text-[28px] sm:text-[34px] tracking-tight text-[var(--ink)] mb-2">
      How OutbidWatch Started
    </h1>
    <p class="text-[14px] text-[#8A8574] mb-8 pb-4 border-b border-[#ECEAE0]">
      By <a href="https://x.com/alvaisy" target="_blank" rel="noopener noreferrer" class="font-bold text-[var(--ink)] underline">Awais Alwaisy (@alvaisy)</a> · August 2026
    </p>

    <article class="space-y-5 text-[15.5px] sm:text-[16px] text-[#33372B] leading-relaxed max-w-2xl">
      <p>
        In August 2026, Jonathan Wilke launched <code>outbid.lol</code>. Within two days, Twitter was full of clones. Every builder was shipping their own pay-to-rank bidding board.
      </p>
      
      <p>
        I saw the craze and wanted to build a tracker for all of them.
      </p>

      <h2 class="display font-extrabold text-[20px] text-[var(--ink)] pt-4">
        The scraping trap
      </h2>

      <p>
        My first plan was simple: take full page screenshots with Jina or a headless browser, run vision OCR with an LLM, and extract JSON with the current leader and total revenue.
      </p>

      <p>
        I spent 10 hours straight trying to make it work.
      </p>

      <p>
        It was a complete mess:
      </p>

      <ul class="list-disc list-inside space-y-1.5 pl-2 text-[15px] text-[#44483B]">
        <li>The vision models kept hallucinating the JSON schema.</li>
        <li>Total revenue was tucked into footers, and OCR missed it constantly.</li>
        <li>Token costs were insane. Running 5,000 output tokens on GPT or Claude across 70 sites multiple times an hour was going to burn my credits in days.</li>
      </ul>

      <h2 class="display font-extrabold text-[20px] text-[var(--ink)] pt-4">
        "Bro, I am cooked"
      </h2>

      <p>
        Then I saw someone launched <code>afford.bid</code>.
      </p>

      <p>
        He was already live, updating 70+ sites every few minutes.
      </p>

      <p class="italic pl-4 border-l-2 border-[var(--ink)] text-[#4A483B] my-4">
        "Bro, I am cooked. Really cooked. How am I struggling for 10 hours when someone already shipped it? He outbidded me on my own idea."
      </p>

      <p>
        I sat there completely drained. I almost gave up right there. I told myself I was done with scraping.
      </p>

      <h2 class="display font-extrabold text-[20px] text-[var(--ink)] pt-4">
        The pivot
      </h2>

      <p>
        I took a break and asked myself: why am I even trying to scrape live bid prices that change every 10 seconds?
      </p>

      <p>
        What do people actually care about?
      </p>

      <p>
        Two simple things:
      </p>

      <p>
        <strong>1. Who was actually first?</strong><br>
        Everyone was copying everyone. Nobody knew the real timeline. So I decided to sort every platform by domain registration date (WHOIS date). That way, you see who launched first and who copied later. No fake volatile bids, just domain age.
      </p>

      <p>
        <strong>2. The community drama on X</strong><br>
        The fun part was never the database numbers. It was the maker launch tweets, revenue flexes, downtime drama, and banter happening live on X. So I built a live feed searching for <code>"outbid.lol" OR "pay to outbid"</code>.
      </p>

      <h2 class="display font-extrabold text-[20px] text-[var(--ink)] pt-4">
        What I shipped
      </h2>

      <p>
        I threw away all the heavy scraping code and kept the stack dead simple:
      </p>

      <ul class="list-disc list-inside space-y-1.5 pl-2 text-[15px] text-[#44483B]">
        <li>Cloudflare Workers + D1 database (sub-10ms response)</li>
        <li>Clean HTML and Tailwind v4 with zero heavy JS bloat</li>
        <li>192 platforms cataloged and sorted chronologically</li>
        <li>Live community feed from X</li>
        <li>Full support for AI agents (Markdown and MCP tools)</li>
      </ul>

      <p class="pt-2">
        Getting cooked on the scraper was the best thing that happened. It forced me to stop overcomplicating and ship something useful.
      </p>
    </article>

    <div class="mt-12 pt-6 border-t border-[#ECEAE0] flex items-center justify-between text-[13px] text-[#8A8574]">
      <span>Built by <a href="https://x.com/alvaisy" target="_blank" rel="noopener noreferrer" class="font-bold text-[var(--ink)] underline">@alvaisy</a></span>
      <a href="/" class="text-[var(--ink)] font-semibold hover:underline">← Back to directory</a>
    </div>
  </main>

  <!-- Footer (Identical standard width & style) -->
  <footer class="pb-10 pt-4 border-t border-[#ECEAE0] flex flex-col sm:flex-row items-center justify-between gap-3 text-[12.5px] text-[#8A8574]">
    <div class="flex items-center gap-2">
      <span class="font-bold text-[var(--ink)]">outbidwatch</span>
      <span>·</span>
      <span>Verified pay-to-rank platform directory</span>
    </div>
    <div class="flex items-center gap-3">
      <a href="/" class="hover:text-[var(--ink)] transition-colors">Directory</a>
      <span>·</span>
      <a href="/timeline" class="hover:text-[var(--ink)] transition-colors">Timeline</a>
      <span>·</span>
      <a href="/about" class="hover:text-[var(--ink)] transition-colors">About</a>
      <span>·</span>
      <a href="/developers" class="hover:text-[var(--ink)] transition-colors">Developers</a>
      <span>·</span>
      <a href="/analytics" class="hover:text-[var(--ink)] transition-colors">Analytics</a>
    </div>
  </footer>

</div>
</body>
</html>`;

  c.header('Content-Type', 'text/html; charset=utf-8');
  c.header('Vary', 'Accept, Accept-Encoding');
  c.header('Cache-Control', 'public, max-age=3600');
  return c.html(html);
});
