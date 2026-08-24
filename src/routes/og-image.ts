import { Hono } from 'hono';
import type { Env, AppVariables } from '../types/env';

export const ogImageRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncate(str: string, max: number): string {
  if (!str) return '';
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + '...';
}

// Split text into lines for SVG rendering
function wrapText(text: string, maxCharsPerLine: number = 38, maxLines: number = 3): string[] {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
      if (lines.length >= maxLines) break;
    }
  }
  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }
  return lines;
}

ogImageRouter.get('/', (c) => {
  const url = new URL(c.req.url);
  const title = url.searchParams.get('title') || 'OutbidWatch';
  const desc = url.searchParams.get('desc') || url.searchParams.get('description') || 'The definitive directory and timeline for pay-to-rank outbid leaderboards.';
  const tag = url.searchParams.get('tag') || url.searchParams.get('category') || 'Directory';
  const meta = url.searchParams.get('meta') || url.searchParams.get('date') || '';
  const author = url.searchParams.get('author') || '@alvaisy';

  const titleLines = wrapText(title, 32, 2);
  const descLines = wrapText(desc, 56, 3);

  const titleSvg = titleLines
    .map((line, i) => `<tspan x="80" dy="${i === 0 ? 0 : 64}">${escapeXml(line)}</tspan>`)
    .join('');

  const descStartY = 160 + titleLines.length * 64 + 20;
  const descSvg = descLines
    .map((line, i) => `<tspan x="80" dy="${i === 0 ? 0 : 36}">${escapeXml(line)}</tspan>`)
    .join('');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <!-- Background Gradient matching Mosambi Theme -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FBF9F2" />
      <stop offset="50%" stop-color="#F5F2E7" />
      <stop offset="100%" stop-color="#ECE7D5" />
    </linearGradient>

    <!-- Subtle Drop Shadow -->
    <filter id="cardShadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#161612" flood-opacity="0.08" />
    </filter>

    <style>
      .display-title {
        font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        font-weight: 800;
        font-size: 56px;
        letter-spacing: -0.03em;
        fill: #161612;
      }
      .display-desc {
        font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        font-weight: 500;
        font-size: 25px;
        line-height: 1.5;
        fill: #5A574A;
      }
      .tag-text {
        font-family: system-ui, -apple-system, sans-serif;
        font-weight: 700;
        font-size: 18px;
        letter-spacing: -0.01em;
        fill: #1E2417;
      }
      .brand-text {
        font-family: system-ui, -apple-system, sans-serif;
        font-weight: 800;
        font-size: 26px;
        letter-spacing: -0.02em;
        fill: #161612;
      }
      .meta-text {
        font-family: system-ui, -apple-system, sans-serif;
        font-weight: 600;
        font-size: 18px;
        fill: #7D7969;
      }
    </style>
  </defs>

  <!-- Background Base -->
  <rect width="1200" height="630" fill="url(#bgGrad)" />

  <!-- Inner Subtle Border -->
  <rect x="24" y="24" width="1152" height="582" rx="32" fill="none" stroke="#E2DEC8" stroke-width="2" />

  <!-- TOP BAR: Brand Logo & Pill Tag -->
  <g transform="translate(80, 68)">
    <!-- Squircle Gavel Logo -->
    <rect width="52" height="52" rx="16" fill="#BACB45" />
    <g transform="translate(6.5, 6.5) scale(0.152)" fill="#1E2417">
      <path d="M52.69,99.31a16,16,0,0,1,0-22.63l64-64a16,16,0,0,1,22.63,22.63l-64,64a16,16,0,0,1-22.63,0Zm190.63,17.37a16,16,0,0,0-22.63,0l-64,64a16,16,0,0,0,0,22.63h0a16,16,0,0,0,22.63,0l64-64A16,16,0,0,0,243.32,116.68Zm-35.11-15.8L155.12,47.79a4,4,0,0,0-5.66,0L87.8,109.45a4,4,0,0,0,0,5.66L103,130.34,28.69,204.69a16,16,0,0,0,22.62,22.62L125.66,153l15.23,15.23a4,4,0,0,0,5.66,0l61.66-61.66A4,4,0,0,0,208.21,100.88Z"/>
    </g>
    <text x="68" y="36" class="brand-text">outbidwatch</text>
  </g>

  <!-- Tag / Badge Pill (Top Right) -->
  <g transform="translate(${1120 - (escapeXml(tag).length * 11 + 44)}, 72)">
    <rect width="${escapeXml(tag).length * 11 + 44}" height="42" rx="21" fill="#BACB45" fill-opacity="0.3" stroke="#BACB45" stroke-width="1.5" />
    <text x="${(escapeXml(tag).length * 11 + 44) / 2}" y="27" text-anchor="middle" class="tag-text">${escapeXml(tag)}</text>
  </g>

  <!-- MAIN TITLE (Dynamic Multi-line) -->
  <text x="80" y="210" class="display-title">
    ${titleSvg}
  </text>

  <!-- DESCRIPTION (Dynamic Multi-line) -->
  <text x="80" y="${descStartY}" class="display-desc">
    ${descSvg}
  </text>

  <!-- FOOTER BAR: Metadata & Author attribution -->
  <line x1="80" y1="520" x2="1120" y2="520" stroke="#E2DEC8" stroke-width="1.5" />

  <g transform="translate(80, 562)">
    <!-- Metadata (Date / Stats) -->
    <text x="0" y="0" class="meta-text">${escapeXml(meta ? meta : '192+ Verified Outbid Platforms')}</text>
  </g>

  <g transform="translate(1120, 562)">
    <!-- X Logo Icon + Author + outbidwatch -->
    <g transform="translate(-${Math.round((escapeXml(author).length + 15) * 10 + 20)}, -12)">
      <!-- Official 𝕏 Vector Icon -->
      <svg x="0" y="-1" width="16" height="16" viewBox="0 0 24 24" fill="#161612">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
      <text x="24" y="12" class="meta-text">${escapeXml(author.startsWith('@') ? author : '@' + author)} · outbidwatch</text>
    </g>
  </g>
</svg>
`;

  c.header('Content-Type', 'image/svg+xml; charset=utf-8');
  c.header('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');
  c.header('Access-Control-Allow-Origin', '*');
  return c.body(svg);
});
