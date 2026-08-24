import { Hono } from 'hono';
import type { Env, AppVariables } from '../types/env';
import { getDb } from '../db/index';
import { getEmojiForCodename } from '../lib/codename';
import { countryCodeToFlag } from '../lib/device-geo';

export const analyticsViewRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function timeAgo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSec < 10) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  } catch {
    return dateStr;
  }
}

// GET /analytics - Live & Historical Dashboard
analyticsViewRouter.get('/', async (c) => {
  const db = getDb(c.env.DB);
  const hours = Math.min(Math.max(Number(c.req.query('hours')) || 24, 1), 168);

  const [liveData, overview, campaigns, quickLinks] = await Promise.all([
    db.analytics.getLiveTraffic(3),
    db.analytics.getOverview(hours),
    db.analytics.getCampaigns(),
    db.analytics.getFounderOutreachLinks()
  ]);

  const userContext = c.get('analytics');
  const currentVisitorCodename = userContext?.codename || 'You';
  const currentVisitorEmoji = userContext?.emoji || '👤';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Live Traffic & Userflow Analytics | OutbidWatch</title>
<meta name="description" content="Real-time live traffic, individual userflows, and returning visitor analytics.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css">
<script src="https://unpkg.com/@phosphor-icons/web@2.1.1" defer></script>
<style>
  .live-pulse-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #10B981;
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
    animation: livePulse 2s infinite;
  }
  @keyframes livePulse {
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
    70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
  }
  .ticker-item {
    animation: fadeIn 0.3s ease-out;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
</head>
<body class="min-h-screen bg-[var(--paper)]">

<div class="max-w-[1280px] mx-auto px-4 sm:px-6 min-h-screen flex flex-col">

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
      <a href="/timeline" class="pill px-3.5 py-1.5 text-[13px] font-semibold border border-[#E4E1D4] text-[#5B5A4E] hover:border-[#CCD99B] transition-colors">
        Timeline
      </a>
      <a href="/map" class="pill px-3.5 py-1.5 text-[13px] font-semibold border border-[#E4E1D4] text-[#5B5A4E] hover:border-[#CCD99B] transition-colors">
        Map
      </a>
    </div>
  </header>

  <!-- Main Analytics Area -->
  <main class="flex-1 pb-16">
    
    <!-- Top Hero Bar -->
    <div class="pt-4 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div class="pill inline-flex items-center gap-2 px-3 py-1 mb-2.5 bg-white border border-[#E4E1D4] text-[12.5px] font-bold text-[var(--ink)] shadow-sm">
          <span class="live-pulse-dot"></span>
          <span id="liveBadgeText">${liveData.activeCount} visitor${liveData.activeCount === 1 ? '' : 's'} online right now</span>
        </div>
        <h1 class="display text-[28px] sm:text-[32px] font-extrabold tracking-tight text-[var(--ink)] leading-tight">
          Real-Time Pulse & Userflows
        </h1>
        <p class="text-[14px] text-[#5B5A4E]">
          Zero-JS server-side tracking via secure HttpOnly cookies. You are viewing as <span class="font-bold text-[var(--ink)]">${currentVisitorEmoji} ${escapeHtml(currentVisitorCodename)}</span>.
        </p>
      </div>

      <!-- Time Range Switcher -->
      <div class="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-[#E4E1D4] shadow-sm self-start md:self-auto">
        <a href="/analytics?hours=24" class="pill px-3 py-1.5 text-[12px] font-bold ${hours === 24 ? 'bg-[var(--ink)] text-white' : 'text-[#5B5A4E] hover:bg-[#F5F4EE]'} transition-colors">24 Hours</a>
        <a href="/analytics?hours=72" class="pill px-3 py-1.5 text-[12px] font-bold ${hours === 72 ? 'bg-[var(--ink)] text-white' : 'text-[#5B5A4E] hover:bg-[#F5F4EE]'} transition-colors">3 Days</a>
        <a href="/analytics?hours=168" class="pill px-3 py-1.5 text-[12px] font-bold ${hours === 168 ? 'bg-[var(--ink)] text-white' : 'text-[#5B5A4E] hover:bg-[#F5F4EE]'} transition-colors">7 Days</a>
      </div>
    </div>

    <!-- Quick Stats Grid -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div class="card p-4">
        <p class="text-[12px] font-bold uppercase tracking-wider text-[#8A8574] mb-1">Active Now</p>
        <div class="flex items-baseline gap-2">
          <span id="statActiveCount" class="display text-[28px] font-extrabold text-[#10B981] leading-none">${liveData.activeCount}</span>
          <span class="text-[11px] font-medium text-[#8A8574]">last 3 mins</span>
        </div>
      </div>
      <div class="card p-4">
        <p class="text-[12px] font-bold uppercase tracking-wider text-[#8A8574] mb-1">Total Visitors (${hours}h)</p>
        <div class="flex items-baseline gap-2">
          <span class="display text-[28px] font-extrabold text-[var(--ink)] leading-none">${overview.totalVisitors}</span>
          <span class="text-[11px] font-semibold text-[#10B981]">${overview.newVisitors} new · ${overview.returningVisitors} ret</span>
        </div>
      </div>
      <div class="card p-4">
        <p class="text-[12px] font-bold uppercase tracking-wider text-[#8A8574] mb-1">Journeys (Sessions)</p>
        <div class="flex items-baseline gap-2">
          <span class="display text-[28px] font-extrabold text-[var(--ink)] leading-none">${overview.totalSessions}</span>
          <span class="text-[11px] font-medium text-[#8A8574]">${overview.totalVisitors ? (overview.totalSessions / overview.totalVisitors).toFixed(1) : '1.0'} per user</span>
        </div>
      </div>
      <div class="card p-4">
        <p class="text-[12px] font-bold uppercase tracking-wider text-[#8A8574] mb-1">Pageviews</p>
        <div class="flex items-baseline gap-2">
          <span class="display text-[28px] font-extrabold text-[var(--ink)] leading-none">${overview.totalPageviews}</span>
          <span class="text-[11px] font-medium text-[#8A8574]">${overview.totalSessions ? (overview.totalPageviews / overview.totalSessions).toFixed(1) : '1.0'} / journey</span>
        </div>
      </div>
    </div>

    <!-- 🟢 SECTION 1: LIVE WHO IS ON WHAT PAGE RIGHT NOW -->
    <section class="card p-5 sm:p-6 mb-6 shadow-sm">
      <div class="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-[#E4E1D4]">
        <div class="flex items-center gap-2">
          <span class="live-pulse-dot"></span>
          <h2 class="display text-[17px] font-extrabold text-[var(--ink)]">
            Who is visiting what right now?
          </h2>
        </div>
        <span class="text-[12px] text-[#8A8574] font-medium">Live page rosters</span>
      </div>

      <div id="livePagesContainer" class="space-y-3">
        ${liveData.activePages.length === 0 ? `
          <div class="text-center py-6 text-[13.5px] text-[#8A8574]">
            No other active visitors in the last 3 minutes. Refreshing automatically...
          </div>
        ` : liveData.activePages.map(page => `
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-[#E4E1D4] hover:border-[#CCD99B] transition-all">
            <div class="flex items-center gap-3">
              <span class="font-mono text-[13px] font-bold px-2.5 py-1 rounded-lg bg-[#F5F4EE] text-[var(--ink)]">
                ${escapeHtml(page.path)}
              </span>
              <span class="text-[12.5px] font-semibold text-[#8A8574]">
                ${page.count} active ${page.count === 1 ? 'user' : 'users'}
              </span>
            </div>
            <!-- Avatars Roster -->
            <div class="flex flex-wrap items-center gap-2">
              ${page.users.map(u => `
                <button 
                  onclick="openUserDossier('${escapeHtml(u.codename)}')"
                  class="pill px-2.5 py-1 bg-[#F5F4EE] hover:bg-[#E8F0CD] border border-[#E4E1D4] hover:border-[#CCD99B] text-[12px] font-bold text-[var(--ink)] flex items-center gap-1.5 transition-all shadow-2xs"
                  title="Click to view full journey of ${escapeHtml(u.codename)}"
                >
                  <span>${u.countryFlag}</span>
                  <span>${u.emoji}</span>
                  <span>${escapeHtml(u.codename)}</span>
                </button>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </section>

    <!-- 🔴 SECTION 2: LIVE ACTIVITY TICKER & RECENT USERFLOWS -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      
      <!-- Live Activity Stream (1 Column) -->
      <section class="card p-5 sm:p-6 lg:col-span-1 shadow-sm flex flex-col h-[460px]">
        <div class="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-[#E4E1D4]">
          <div class="flex items-center gap-2">
            <i class="ph-bold ph-broadcast text-[16px]" style="color: var(--mosambi-dark);"></i>
            <h3 class="display text-[16px] font-extrabold text-[var(--ink)]">Live Stream</h3>
          </div>
          <span class="text-[11px] font-semibold text-[#8A8574]">auto-updating</span>
        </div>

        <div id="liveStreamContainer" class="flex-1 overflow-y-auto space-y-2.5 pr-1">
          ${liveData.recentEvents.slice(0, 15).map(ev => `
            <div class="ticker-item p-2.5 rounded-xl bg-white border border-[#E4E1D4] text-[12.5px]">
              <div class="flex items-center justify-between gap-2 mb-1">
                <button onclick="openUserDossier('${escapeHtml(ev.codename)}')" class="font-bold text-[var(--ink)] hover:text-[#5B7512] flex items-center gap-1">
                  <span>${ev.emoji}</span>
                  <span>${escapeHtml(ev.codename)}</span>
                </button>
                <span class="text-[10.5px] text-[#8A8574]">${timeAgo(ev.createdAt)}</span>
              </div>
              <p class="text-[#5B5A4E] text-[12px] flex items-center gap-1.5 truncate">
                <span class="px-1.5 py-0.5 rounded text-[10.5px] font-bold ${ev.eventType === 'pageview' ? 'bg-[#F0FDF4] text-[#166534]' : 'bg-[#FEF3C7] text-[#92400E]'}">
                  ${escapeHtml(ev.eventName)}
                </span>
                <span class="font-mono text-[11.5px] text-[var(--ink)] truncate">${escapeHtml(ev.path)}</span>
              </p>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- Active & Recent Visitors Roster (2 Columns) -->
      <section class="card p-5 sm:p-6 lg:col-span-2 shadow-sm flex flex-col h-[460px]">
        <div class="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-[#E4E1D4]">
          <div class="flex items-center gap-2">
            <i class="ph-bold ph-users-three text-[16px]" style="color: var(--mosambi-dark);"></i>
            <h3 class="display text-[16px] font-extrabold text-[var(--ink)]">Active & Recent Journeys</h3>
          </div>
          <span class="text-[12px] text-[#8A8574]">${liveData.activeUsers.length} in session</span>
        </div>

        <div id="activeUsersTable" class="flex-1 overflow-y-auto pr-1">
          <table class="w-full text-left text-[13px]">
            <thead class="sticky top-0 bg-[#F5F4EE] text-[11px] font-bold uppercase tracking-wider text-[#8A8574]">
              <tr>
                <th class="py-2 px-3 rounded-l-lg">User</th>
                <th class="py-2 px-2">Status</th>
                <th class="py-2 px-2">Location</th>
                <th class="py-2 px-2">Current Page</th>
                <th class="py-2 px-3 rounded-r-lg text-right">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#E4E1D4]">
              ${liveData.activeUsers.length === 0 ? `
                <tr><td colspan="5" class="py-8 text-center text-[#8A8574]">No active visitors right now.</td></tr>
              ` : liveData.activeUsers.map(u => `
                <tr class="hover:bg-white/60 transition-colors">
                  <td class="py-3 px-3">
                    <button onclick="openUserDossier('${escapeHtml(u.codename)}')" class="font-bold text-[var(--ink)] hover:text-[#5B7512] flex items-center gap-1.5">
                      <span>${u.emoji}</span>
                      <span>${escapeHtml(u.codename)}</span>
                    </button>
                    <span class="text-[11px] text-[#8A8574] block">${u.os} · ${u.browser}</span>
                  </td>
                  <td class="py-3 px-2">
                    ${u.isReturning ? `
                      <span class="pill px-2 py-0.5 text-[11px] font-bold bg-[#FAF5FF] text-[#6B21A8] border border-[#E9D5FF]">
                        Returner (${u.totalVisits}x)
                      </span>
                    ` : `
                      <span class="pill px-2 py-0.5 text-[11px] font-bold bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]">
                        New Visitor
                      </span>
                    `}
                  </td>
                  <td class="py-3 px-2">
                    <span class="flex items-center gap-1 text-[12.5px] font-medium text-[var(--ink)]">
                      <span>${u.countryFlag}</span>
                      <span>${escapeHtml(u.city)}</span>
                    </span>
                  </td>
                  <td class="py-3 px-2 font-mono text-[12px] text-[#5B5A4E] max-w-[150px] truncate">
                    ${escapeHtml(u.currentPath)}
                  </td>
                  <td class="py-3 px-3 text-right">
                    <button 
                      onclick="openUserDossier('${escapeHtml(u.codename)}')"
                      class="pill px-2.5 py-1 text-[11.5px] font-bold bg-white border border-[#E4E1D4] hover:border-[#CCD99B] text-[var(--ink)] transition-all"
                    >
                      Inspect Flow →
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- 📊 SECTION 3: TOP PAGES, REFERRERS, GEOGRAPHY & TECH -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      
      <!-- Top Pages -->
      <div class="card p-4">
        <h4 class="text-[13px] font-extrabold display text-[var(--ink)] mb-3 pb-2 border-b border-[#E4E1D4] flex items-center justify-between">
          <span>Top Pages</span>
          <i class="ph-bold ph-file-text text-[#8A8574]"></i>
        </h4>
        <div class="space-y-2">
          ${overview.topPages.length === 0 ? '<p class="text-[12px] text-[#8A8574]">No pageviews recorded yet.</p>' : overview.topPages.map(p => `
            <div class="flex items-center justify-between gap-2 text-[12.5px]">
              <span class="font-mono text-[12px] text-[var(--ink)] truncate">${escapeHtml(p.path)}</span>
              <span class="font-bold text-[var(--ink)] px-2 py-0.5 rounded bg-[#F5F4EE] text-[11px]">${p.views}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Top Referrers -->
      <div class="card p-4">
        <h4 class="text-[13px] font-extrabold display text-[var(--ink)] mb-3 pb-2 border-b border-[#E4E1D4] flex items-center justify-between">
          <span>Traffic Sources</span>
          <i class="ph-bold ph-arrow-up-right text-[#8A8574]"></i>
        </h4>
        <div class="space-y-2">
          ${overview.topReferrers.length === 0 ? '<p class="text-[12px] text-[#8A8574]">No referrers logged.</p>' : overview.topReferrers.map(r => `
            <div class="flex items-center justify-between gap-2 text-[12.5px]">
              <span class="text-[#5B5A4E] truncate">${escapeHtml(r.referrer)}</span>
              <span class="font-bold text-[var(--ink)] px-2 py-0.5 rounded bg-[#F5F4EE] text-[11px]">${r.count}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Top Countries -->
      <div class="card p-4">
        <h4 class="text-[13px] font-extrabold display text-[var(--ink)] mb-3 pb-2 border-b border-[#E4E1D4] flex items-center justify-between">
          <span>Top Countries</span>
          <i class="ph-bold ph-globe text-[#8A8574]"></i>
        </h4>
        <div class="space-y-2">
          ${overview.topCountries.length === 0 ? '<p class="text-[12px] text-[#8A8574]">No country data yet.</p>' : overview.topCountries.map(c => `
            <div class="flex items-center justify-between gap-2 text-[12.5px]">
              <span class="flex items-center gap-1.5 text-[#5B5A4E] truncate">
                <span>${c.flag}</span>
                <span>${escapeHtml(c.countryName)}</span>
              </span>
              <span class="font-bold text-[var(--ink)] px-2 py-0.5 rounded bg-[#F5F4EE] text-[11px]">${c.count}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Devices & OS -->
      <div class="card p-4">
        <h4 class="text-[13px] font-extrabold display text-[var(--ink)] mb-3 pb-2 border-b border-[#E4E1D4] flex items-center justify-between">
          <span>Devices & OS</span>
          <i class="ph-bold ph-devices text-[#8A8574]"></i>
        </h4>
        <div class="space-y-2">
          ${overview.deviceBreakdown.map(d => `
            <div class="flex items-center justify-between gap-2 text-[12.5px]">
              <span class="text-[#5B5A4E]">${escapeHtml(d.deviceType)}</span>
              <span class="font-bold text-[var(--ink)] text-[11px]">${d.percentage}% (${d.count})</span>
            </div>
          `).join('')}
          <div class="pt-2 border-t border-[#E4E1D4]/60 space-y-1">
            ${overview.osBreakdown.slice(0, 3).map(o => `
              <div class="flex items-center justify-between text-[11.5px] text-[#8A8574]">
                <span>${escapeHtml(o.os)}</span>
                <span class="font-semibold">${o.count}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

    </div>

    <!-- 🎯 SECTION 4: X FOUNDER OUTREACH & CAMPAIGN LINK TRACKER -->
    <section class="card p-5 sm:p-6 mt-6 shadow-sm">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#E4E1D4]">
        <div>
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-[#1DA1F2]"></span>
            <h2 class="display text-[18px] font-extrabold text-[var(--ink)]">
              X Founder Outreach & Campaign Tracker
            </h2>
          </div>
          <p class="text-[12.5px] text-[#8A8574] mt-0.5">
            Track clicks and journeys when replying to founders on X using <code class="font-mono bg-[#F5F4EE] px-1.5 py-0.5 rounded text-[var(--ink)] font-bold">?ref=x_{username}</code>.
          </p>
        </div>
        <div class="pill inline-flex items-center gap-1.5 px-3 py-1 bg-[#F5F4EE] text-[12px] font-bold text-[var(--ink)]">
          <i class="ph-bold ph-link text-[13px]" style="color: var(--mosambi-dark);"></i>
          <span>${campaigns.length} active campaign${campaigns.length === 1 ? '' : 's'} tracked</span>
        </div>
      </div>

      <!-- Active Campaigns Table -->
      <div class="mb-6">
        <h3 class="text-[13px] font-bold uppercase tracking-wider text-[#8A8574] mb-2.5">
          Live Outreach Performance
        </h3>
        
        <div class="overflow-x-auto">
          <table class="w-full text-left text-[13px]">
            <thead class="bg-[#F5F4EE] text-[11px] font-bold uppercase tracking-wider text-[#8A8574]">
              <tr>
                <th class="py-2.5 px-3 rounded-l-lg">Campaign / Ref Tag</th>
                <th class="py-2.5 px-2">Founder Handle</th>
                <th class="py-2.5 px-2">Total Clicks</th>
                <th class="py-2.5 px-2">Unique Visitors</th>
                <th class="py-2.5 px-2">Visitor Identities</th>
                <th class="py-2.5 px-2">Location</th>
                <th class="py-2.5 px-2">Landing Path</th>
                <th class="py-2.5 px-3 rounded-r-lg text-right">Last Seen</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#E4E1D4]">
              ${campaigns.length === 0 ? `
                <tr>
                  <td colspan="8" class="py-8 text-center text-[#8A8574]">
                    <div class="max-w-md mx-auto">
                      <p class="font-bold text-[var(--ink)] mb-1">No outreach clicks recorded yet</p>
                      <p class="text-[12px] text-[#8A8574]">
                        Copy any founder link below and reply to them on X with <span class="font-mono text-[var(--ink)] font-semibold">?ref=x_username</span>. When they click, their location and complete journey will appear here!
                      </p>
                    </div>
                  </td>
                </tr>
              ` : campaigns.map(c => `
                <tr class="hover:bg-white/60 transition-colors">
                  <td class="py-3 px-3">
                    <span class="font-mono text-[12.5px] font-bold text-[var(--ink)] px-2 py-0.5 rounded bg-[#F5F4EE]">
                      ${escapeHtml(c.refTag)}
                    </span>
                  </td>
                  <td class="py-3 px-2">
                    ${c.founderHandle ? `
                      <a href="https://x.com/${escapeHtml(c.founderHandle.replace('@', ''))}" target="_blank" rel="noopener noreferrer" class="font-bold text-[#1DA1F2] hover:underline flex items-center gap-1">
                        <i class="ph-bold ph-x-logo text-[12px]"></i>
                        ${escapeHtml(c.founderHandle)}
                      </a>
                    ` : '<span class="text-[#8A8574]">—</span>'}
                  </td>
                  <td class="py-3 px-2 font-bold text-[var(--ink)]">
                    ${c.totalVisits}
                  </td>
                  <td class="py-3 px-2 font-semibold text-[#10B981]">
                    ${c.uniqueVisitors} unique
                  </td>
                  <td class="py-3 px-2">
                    <div class="flex flex-wrap gap-1.5 max-w-[180px]">
                      ${c.visitors.map((v: any) => `
                        <button 
                          onclick="openUserDossier('${escapeHtml(v.codename)}')"
                          class="pill px-2 py-0.5 bg-[#F5F4EE] hover:bg-[#E8F0CD] border border-[#E4E1D4] text-[11px] font-bold text-[var(--ink)] flex items-center gap-1 transition-all"
                          title="${escapeHtml(v.codename)} · ${v.countryFlag} ${escapeHtml(v.city)}, ${escapeHtml(v.countryName || '')}"
                        >
                          <span>${v.countryFlag}</span>
                          <span>${v.emoji}</span>
                          <span>${escapeHtml(v.codename)}</span>
                        </button>
                      `).join('')}
                    </div>
                  </td>
                  <td class="py-3 px-2">
                    <span class="flex items-center gap-1.5 text-[12px] font-medium text-[var(--ink)]">
                      <span class="text-[14px]">${c.countryFlag}</span>
                      <span class="truncate max-w-[140px]">${escapeHtml(c.city !== 'Global' ? c.city + ', ' + (c.countryName || c.countryCode || '') : (c.countryName || 'Global'))}</span>
                    </span>
                  </td>
                  <td class="py-3 px-2 font-mono text-[11.5px] text-[#5B5A4E] max-w-[130px] truncate">
                    ${escapeHtml(c.initialPath)}
                  </td>
                  <td class="py-3 px-3 text-right text-[11.5px] text-[#8A8574]">
                    ${timeAgo(c.lastActiveAt)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- 1-Click Tracked Link Generator (All 192 Platforms) -->
      <div class="pt-5 border-t border-[#E4E1D4]">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 class="text-[13px] font-bold uppercase tracking-wider text-[var(--ink)] flex items-center gap-1.5">
              <i class="ph-bold ph-paper-plane-tilt text-[14px]" style="color: var(--mosambi-dark);"></i>
              <span>1-Click Founder Link Generator (192 Platforms)</span>
            </h3>
            <p class="text-[12px] text-[#8A8574]">
              Search any founder or startup below to copy their pre-tagged link and reply on X.
            </p>
          </div>
          
          <!-- Search input for quick links -->
          <div class="relative min-w-[240px]">
            <i class="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-[#8A8574]"></i>
            <input 
              id="founderSearchInput" 
              type="text" 
              placeholder="Search founder or domain..." 
              oninput="filterFounderLinks()"
              class="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#E4E1D4] bg-white text-[12.5px] outline-none focus:border-[var(--mosambi-dark)] focus:ring-1 focus:ring-[var(--mosambi-light)] transition-all"
            />
          </div>
        </div>

        <div class="max-h-[300px] overflow-y-auto rounded-2xl border border-[#E4E1D4] bg-white">
          <table class="w-full text-left text-[12.5px]">
            <thead class="sticky top-0 bg-[#F5F4EE] text-[11px] font-bold uppercase tracking-wider text-[#8A8574]">
              <tr>
                <th class="py-2 px-3">Platform</th>
                <th class="py-2 px-2">Founder Handle</th>
                <th class="py-2 px-2">Tracked URL (?ref=x_...)</th>
                <th class="py-2 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody id="founderLinksBody" class="divide-y divide-[#E4E1D4]">
              ${quickLinks.map(s => `
                <tr class="founder-row hover:bg-[#FDFCF7] transition-colors" data-search="${escapeHtml((s.domain + ' ' + s.siteName + ' ' + s.founderX).toLowerCase())}">
                  <td class="py-2.5 px-3">
                    <span class="font-bold text-[var(--ink)]">${escapeHtml(s.domain)}</span>
                    <span class="text-[11px] text-[#8A8574] block">${escapeHtml(s.category)}</span>
                  </td>
                  <td class="py-2.5 px-2">
                    <span class="font-semibold text-[var(--ink)]">@${escapeHtml(s.founderX.replace('@', ''))}</span>
                  </td>
                  <td class="py-2.5 px-2 font-mono text-[11px] text-[#5B5A4E] max-w-[260px] truncate">
                    ${escapeHtml(s.targetUrl)}
                  </td>
                  <td class="py-2.5 px-3 text-right">
                    <div class="flex items-center justify-end gap-1.5">
                      <button 
                        onclick="copyTrackedLink('${escapeHtml(s.targetUrl)}', this)"
                        class="pill px-2.5 py-1 text-[11.5px] font-bold bg-[#F5F4EE] hover:bg-[#E8F0CD] border border-[#E4E1D4] hover:border-[#CCD99B] text-[var(--ink)] flex items-center gap-1 transition-all"
                        title="Copy tracked link to clipboard"
                      >
                        <i class="ph-bold ph-copy text-[12px]"></i>
                        <span>Copy</span>
                      </button>
                      <a 
                        href="https://x.com/${escapeHtml(s.founderX.replace('@', ''))}" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        class="pill px-2.5 py-1 text-[11.5px] font-bold bg-[#F5F4EE] hover:bg-[#E1F2FE] border border-[#E4E1D4] hover:border-[#90CDF4] text-[#1DA1F2] flex items-center gap-1 transition-all"
                        title="Open founder on X"
                      >
                        <i class="ph-bold ph-x-logo text-[12px]"></i>
                        <span>X Profile</span>
                      </a>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </section>

  </main>

  <!-- Footer -->
  <footer class="pb-10 pt-6 border-t border-[#ECEAE0] flex flex-col sm:flex-row items-center justify-between gap-3 text-[12.5px] text-[#8A8574]">
    <div class="flex items-center gap-2">
      <span class="font-bold text-[var(--ink)]">outbidwatch</span>
      <span>·</span>
      <span>Live Server-Side Traffic & Userflows</span>
    </div>
    <div class="flex items-center gap-3">
      <a href="/" class="hover:text-[var(--ink)] transition-colors font-medium">Directory</a>
      <span>·</span>
      <a href="/timeline" class="hover:text-[var(--ink)] transition-colors font-medium">Timeline</a>
      <span>·</span>
      <a href="/map" class="hover:text-[var(--ink)] transition-colors font-medium">Map</a>
      <span>·</span>
      <a href="/story" class="hover:text-[var(--ink)] transition-colors flex items-center gap-1 font-semibold text-[var(--ink)]">
        <i class="ph-bold ph-book-open text-[13px]"></i> Story
      </a>
      <span>·</span>
      <a href="/about" class="hover:text-[var(--ink)] transition-colors font-medium">About</a>
      <span>·</span>
      <a href="/developers" class="hover:text-[var(--ink)] transition-colors font-medium">Developers</a>
      <span>·</span>
      <a href="/analytics" class="hover:text-[var(--ink)] transition-colors font-semibold text-[var(--ink)]">Analytics</a>
    </div>
  </footer>

</div>

<!-- USER DOSSIER MODAL / DRAWER -->
<div id="dossierModal" class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs hidden items-center justify-center p-4">
  <div class="bg-[var(--paper)] rounded-3xl border border-[#E4E1D4] w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
    
    <!-- Modal Header -->
    <div class="p-5 sm:p-6 bg-white border-b border-[#E4E1D4] flex items-start justify-between gap-4">
      <div class="flex items-center gap-3.5">
        <div id="dossierAvatar" class="w-12 h-12 rounded-2xl bg-[#F5F4EE] border border-[#E4E1D4] flex items-center justify-center text-[24px]">
          🦊
        </div>
        <div>
          <h3 id="dossierCodename" class="display text-[20px] font-extrabold text-[var(--ink)] leading-tight">
            Loading...
          </h3>
          <p id="dossierMeta" class="text-[12.5px] text-[#8A8574]">
            Fetching user journey history...
          </p>
        </div>
      </div>
      <button onclick="closeUserDossier()" class="w-8 h-8 rounded-full bg-[#F5F4EE] hover:bg-[#E4E1D4] text-[var(--ink)] flex items-center justify-center transition-colors">
        <i class="ph-bold ph-x text-[14px]"></i>
      </button>
    </div>

    <!-- Modal Timeline Content -->
    <div id="dossierContent" class="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
      <!-- Injected dynamically via JS -->
    </div>

    <div class="p-4 bg-[#F5F4EE] border-t border-[#E4E1D4] flex justify-end">
      <button onclick="closeUserDossier()" class="btn-primary pill px-5 py-2 text-[13px] font-bold">
        Close Dossier
      </button>
    </div>

  </div>
</div>

<!-- Auto-poll live updates script -->
<script>
let isDossierOpen = false;

async function refreshLive() {
  if (isDossierOpen) return;
  try {
    const res = await fetch('/api/analytics/live?minutes=3');
    if (!res.ok) return;
    const data = await res.json();
    if (data.status !== 'ok') return;

    // Update Top Badge & Stats
    const badge = document.getElementById('liveBadgeText');
    const statActive = document.getElementById('statActiveCount');
    if (badge) badge.innerText = \`\${data.activeCount} visitor\${data.activeCount === 1 ? '' : 's'} online right now\`;
    if (statActive) statActive.innerText = data.activeCount;

    // Update Live Pages Container
    const pagesContainer = document.getElementById('livePagesContainer');
    if (pagesContainer) {
      if (data.activePages.length === 0) {
        pagesContainer.innerHTML = '<div class="text-center py-6 text-[13.5px] text-[#8A8574]">No other active visitors in the last 3 minutes.</div>';
      } else {
        pagesContainer.innerHTML = data.activePages.map(page => \`
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-[#E4E1D4] hover:border-[#CCD99B] transition-all">
            <div class="flex items-center gap-3">
              <span class="font-mono text-[13px] font-bold px-2.5 py-1 rounded-lg bg-[#F5F4EE] text-[var(--ink)]">
                \${page.path}
              </span>
              <span class="text-[12.5px] font-semibold text-[#8A8574]">
                \${page.count} active \${page.count === 1 ? 'user' : 'users'}
              </span>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              \${page.users.map(u => \`
                <button 
                  onclick="openUserDossier('\${u.codename}')"
                  class="pill px-2.5 py-1 bg-[#F5F4EE] hover:bg-[#E8F0CD] border border-[#E4E1D4] hover:border-[#CCD99B] text-[12px] font-bold text-[var(--ink)] flex items-center gap-1.5 transition-all shadow-2xs"
                >
                  <span>\${u.countryFlag}</span>
                  <span>\${u.emoji}</span>
                  <span>\${u.codename}</span>
                </button>
              \`).join('')}
            </div>
          </div>
        \`).join('');
      }
    }

    // Update Live Stream Feed
    const streamContainer = document.getElementById('liveStreamContainer');
    if (streamContainer && data.recentEvents) {
      streamContainer.innerHTML = data.recentEvents.slice(0, 15).map(ev => \`
        <div class="ticker-item p-2.5 rounded-xl bg-white border border-[#E4E1D4] text-[12.5px]">
          <div class="flex items-center justify-between gap-2 mb-1">
            <button onclick="openUserDossier('\${ev.codename}')" class="font-bold text-[var(--ink)] hover:text-[#5B7512] flex items-center gap-1">
              <span>\${ev.emoji}</span>
              <span>\${ev.codename}</span>
            </button>
            <span class="text-[10.5px] text-[#8A8574]">\${ev.createdAt.split('T')[1]?.slice(0, 8) || ''}</span>
          </div>
          <p class="text-[#5B5A4E] text-[12px] flex items-center gap-1.5 truncate">
            <span class="px-1.5 py-0.5 rounded text-[10.5px] font-bold \${ev.eventType === 'pageview' ? 'bg-[#F0FDF4] text-[#166534]' : 'bg-[#FEF3C7] text-[#92400E]'}">
              \${ev.eventName}
            </span>
            <span class="font-mono text-[11.5px] text-[var(--ink)] truncate">\${ev.path}</span>
          </p>
        </div>
      \`).join('');
    }

  } catch (err) {
    console.error('Failed to poll live data', err);
  }
}

// Poll every 4.5 seconds
setInterval(refreshLive, 4500);

async function openUserDossier(codename) {
  isDossierOpen = true;
  const modal = document.getElementById('dossierModal');
  const avatar = document.getElementById('dossierAvatar');
  const nameEl = document.getElementById('dossierCodename');
  const metaEl = document.getElementById('dossierMeta');
  const contentEl = document.getElementById('dossierContent');

  modal.classList.remove('hidden');
  modal.classList.add('flex');

  avatar.innerText = '⏳';
  nameEl.innerText = codename;
  metaEl.innerText = 'Loading history...';
  contentEl.innerHTML = '<div class="text-center py-12 text-[#8A8574]">Loading journey timeline...</div>';

  try {
    const res = await fetch('/api/analytics/user/' + encodeURIComponent(codename));
    if (!res.ok) throw new Error('User not found');
    const json = await res.json();
    const dossier = json.dossier;

    avatar.innerText = dossier.user.emoji || '👤';
    nameEl.innerText = dossier.user.codename;
    metaEl.innerText = \`\${dossier.user.countryFlag} \${dossier.user.city || 'Global'}, \${dossier.user.country_name || ''} · \${dossier.user.os || ''} / \${dossier.user.browser || ''} · Total Visits: \${dossier.user.total_visits}\`;

    let html = '';
    if (!dossier.sessions || dossier.sessions.length === 0) {
      html = '<p class="text-center py-8 text-[#8A8574]">No session journeys found for this user.</p>';
    } else {
      dossier.sessions.forEach((s, idx) => {
        const sessionDate = new Date(s.started_at).toLocaleString();
        html += \`
          <div class="card p-4 bg-white border border-[#E4E1D4]">
            <div class="flex items-center justify-between gap-2 pb-2 mb-3 border-b border-[#E4E1D4]">
              <span class="text-[12px] font-bold text-[var(--ink)]">
                Journey #\${dossier.sessions.length - idx} · \${sessionDate}
              </span>
              <span class="pill px-2 py-0.5 bg-[#F5F4EE] text-[11px] font-semibold text-[#8A8574]">
                \${s.durationSeconds}s duration · \${s.events.length} step\${s.events.length === 1 ? '' : 's'}
              </span>
            </div>

            <!-- Step by step timeline -->
            <div class="relative pl-6 space-y-3 border-l-2 border-[#E4E1D4] ml-2">
              \${s.events.map(e => \`
                <div class="relative">
                  <span class="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white \${e.event_type === 'pageview' ? 'bg-[#10B981]' : 'bg-[#F59E0B]'}"></span>
                  <div class="text-[12px]">
                    <span class="font-mono text-[11px] text-[#8A8574]">\${e.created_at.split('T')[1]?.slice(0, 8) || ''}</span>
                    <span class="font-bold text-[var(--ink)] ml-1">\${e.event_name}</span>
                    <span class="font-mono text-[#5B5A4E] ml-1 bg-[#F5F4EE] px-1.5 py-0.5 rounded">\${e.path}</span>
                    \${e.metadata_json ? \`<pre class="mt-1 text-[10.5px] bg-[#FAF9F5] p-1.5 rounded text-[#5B5A4E] overflow-x-auto">\${e.metadata_json}</pre>\` : ''}
                  </div>
                </div>
              \`).join('')}
            </div>
          </div>
        \`;
      });
    }

    contentEl.innerHTML = html;
  } catch (err) {
    contentEl.innerHTML = '<p class="text-center py-8 text-red-500">Failed to load user journey dossier.</p>';
  }
}

function closeUserDossier() {
  isDossierOpen = false;
  const modal = document.getElementById('dossierModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function copyTrackedLink(url, btn) {
  navigator.clipboard.writeText(url).then(() => {
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="ph-bold ph-check text-[12px]" style="color: #10B981;"></i><span style="color: #10B981;">Copied!</span>';
    setTimeout(() => {
      btn.innerHTML = originalHtml;
    }, 2000);
  }).catch(() => {
    prompt('Copy your tracked link:', url);
  });
}

function filterFounderLinks() {
  const query = (document.getElementById('founderSearchInput')?.value || '').toLowerCase().trim();
  const rows = document.querySelectorAll('.founder-row');
  rows.forEach(row => {
    const searchData = row.getAttribute('data-search') || '';
    if (!query || searchData.includes(query)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}
</script>

</body>
</html>`;

  return c.html(html);
});

// GET /analytics/user/:identifier - Direct deep link to dossier
analyticsViewRouter.get('/user/:identifier', async (c) => {
  const identifier = c.req.param('identifier');
  return c.redirect(`/analytics?user=${encodeURIComponent(identifier)}`);
});
