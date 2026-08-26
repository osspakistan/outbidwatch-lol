import { Hono } from 'hono';
import type { Env, AppVariables } from '../types/env';
import type { Submission } from '../types/site';
import { getDb } from '../db/index';
import { renderHeader, renderMobileNavDrawer, renderFooter } from '../lib/nav';

export const submissionsViewRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

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
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return isoStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return isoStr;
  }
}

function statusPill(status: string): string {
  const cls = status === 'approved' ? 'status-live' : status === 'rejected' ? 'status-dead' : 'status-unclear';
  const label = status === 'approved' ? 'APPROVED' : status === 'rejected' ? 'REJECTED' : 'IN REVIEW';
  return `<span class="pill ${cls} px-2.5 py-1 text-[11px] font-bold tracking-wide shrink-0">${label}</span>`;
}

const handleSubmissions = async (c: any) => {
  const db = getDb(c.env.DB);
  const limit = Math.min(Math.max(Number(c.req.query('limit')) || 50, 1), 100);
  const submissions = await db.listRecentSubmissions(limit);

  const counts = {
    pending: submissions.filter((s: Submission) => s.status === 'pending').length,
    approved: submissions.filter((s: Submission) => s.status === 'approved').length,
    rejected: submissions.filter((s: Submission) => s.status === 'rejected').length,
  };

  const host = c.req.header('host') || 'outbidwatch.lol';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;
  const accept = c.req.header('Accept') || '';

  // Markdown content negotiation for AI agents
  if (accept.includes('text/markdown') || c.req.path.endsWith('.md')) {
    let md = `# OutbidWatch Submission Queue
> Recent community-submitted pay-to-rank platforms awaiting or having passed maintainer review.

- **Pending review**: ${counts.pending}
- **Approved (in this page)**: ${counts.approved}
- **Rejected (in this page)**: ${counts.rejected}
- **Showing**: ${submissions.length} most recent

`;
    for (const s of submissions) {
      md += `### ${s.domain} (${s.status.toUpperCase()})
- **Founder**: @${s.founder_x_handle}
- **Location**: ${s.founder_location}
- **Launch date claimed**: ${formatDate(s.launch_date)}
- **Submitted**: ${formatDate(s.created_at)}
- **URL**: ${s.url}
${s.rejection_reason ? `- **Rejection reason**: ${s.rejection_reason}\n` : ''}
`;
    }
    md += `\n---\n*Submit your own platform at \`${baseUrl}/\` via the "Submit a site" button.*\n`;
    return c.body(md, 200, {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Vary': 'Accept, Accept-Encoding',
      'x-markdown-tokens': String(Math.round(md.length / 4)),
      'Cache-Control': 'public, max-age=30, s-maxage=120, stale-while-revalidate=300',
    });
  }

  const rowsHtml = submissions.length
    ? submissions.map((s: Submission) => `
      <article class="card p-4 sm:p-5">
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer" class="font-extrabold text-[15.5px] text-[var(--ink)] hover:text-[var(--mosambi-dark)] transition-colors truncate">${escapeHtml(s.domain)}</a>
              ${statusPill(s.status)}
            </div>
            <p class="text-[12.5px] text-[#8A8574] mt-0.5 font-medium">
              🌐 ${escapeHtml(s.founder_location)} · launch claimed ${formatDate(s.launch_date)} · submitted ${formatDate(s.created_at)}
            </p>
          </div>
          <a href="https://x.com/${encodeURIComponent(s.founder_x_handle)}" target="_blank" rel="noopener noreferrer" class="shrink-0 font-bold text-[12.5px] text-[var(--ink)] hover:underline flex items-center gap-1">
            <i class="ph-bold ph-x-logo text-[11px]"></i>@${escapeHtml(s.founder_x_handle)}
          </a>
        </div>
        ${s.status === 'rejected' && s.rejection_reason ? `
          <p class="text-[12px] text-[#991B1B] bg-[#FEE2E2]/60 border border-[#FECACA] rounded-xl px-3 py-2 leading-relaxed"><strong>Rejected:</strong> ${escapeHtml(s.rejection_reason)}</p>
        ` : ''}
        ${s.status === 'pending' ? `
          <p class="text-[12px] text-[#92400E] bg-[#FEF3C7]/60 border border-[#FDE68A] rounded-xl px-3 py-2 leading-relaxed">Queued for manual review by the maintainer. No listing yet — approval is not guaranteed.</p>
        ` : ''}
      </article>
    `).join('')
    : `
      <div class="card p-10 text-center">
        <div class="w-12 h-12 rounded-full bg-[#F5F4EC] flex items-center justify-center mx-auto mb-3 text-[#8A8574]">
          <i class="ph-bold ph-inbox text-[20px]"></i>
        </div>
        <h3 class="display font-bold text-[17px] text-[var(--ink)] mb-1">No submissions yet</h3>
        <p class="text-[13px] text-[#8A8574] max-w-xs mx-auto">Be the first to submit a platform from the directory.</p>
      </div>
    `;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Submission Queue | OutbidWatch</title>
<meta name="description" content="Recent community-submitted pay-to-rank platforms pending or passing OutbidWatch review.">
<link rel="canonical" href="${baseUrl}/submissions">
<meta property="og:title" content="Submission Queue | OutbidWatch">
<meta property="og:description" content="See what pay-to-rank platforms the community has submitted for review.">
<meta property="og:url" content="${baseUrl}/submissions">
<meta property="og:type" content="website">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
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

  ${renderHeader({ active: 'directory' })}

  <main class="flex-1 pb-12 pt-2">
    <section class="pt-2 pb-5">
      <div class="pill inline-flex items-center gap-1.5 px-3 py-1 mb-3 status-live text-[12px] font-semibold">
        <span class="w-1.5 h-1.5 rounded-full" style="background: var(--mosambi-dark);"></span>
        ${counts.pending} in review · transparent pipeline
      </div>
      <h1 class="display text-[28px] sm:text-[32px] leading-[1.12] font-extrabold tracking-tight mb-2 text-[var(--ink)]">
        Submission queue.
      </h1>
      <p class="text-[14.5px] text-[#5B5A4E] leading-relaxed max-w-xl">
        Every platform submitted by the community lands here before it earns a spot in the directory. Each one is reviewed manually — I check the live site and its WHOIS record by hand before approving.
      </p>
      <a href="/" class="btn-primary pill px-5 py-2.5 text-[13px] font-bold inline-flex items-center gap-2 shadow-sm mt-4">
        <i class="ph-bold ph-plus"></i> Submit a site
      </a>
    </section>

    <!-- Status summary -->
    <section class="grid grid-cols-3 gap-2.5 sm:gap-3 mb-6">
      <div class="card p-3.5 text-center">
        <p class="text-[22px] font-extrabold display leading-none mb-1 text-[var(--ink)]">${counts.pending}</p>
        <p class="text-[11.5px] text-[#8A8574] font-medium">In review</p>
      </div>
      <div class="card p-3.5 text-center">
        <p class="text-[22px] font-extrabold display leading-none mb-1" style="color: var(--mosambi-dark);">${counts.approved}</p>
        <p class="text-[11.5px] text-[#8A8574] font-medium">Approved</p>
      </div>
      <div class="card p-3.5 text-center">
        <p class="text-[22px] font-extrabold display leading-none mb-1 text-[#991B1B]">${counts.rejected}</p>
        <p class="text-[11.5px] text-[#8A8574] font-medium">Rejected</p>
      </div>
    </section>

    <h2 class="text-[18px] font-extrabold display text-[var(--ink)] mb-3">Recent submissions</h2>
    <div class="flex flex-col gap-3.5">
      ${rowsHtml}
    </div>
  </main>

  ${renderFooter({ active: 'directory' })}

</div>

${renderMobileNavDrawer({ active: 'directory' })}

</body>
</html>`;

  c.header('Cache-Control', 'public, max-age=30, s-maxage=120, stale-while-revalidate=300');
  return c.html(html);
};

submissionsViewRouter.get('/', handleSubmissions);
submissionsViewRouter.get('/index.md', (c) => handleSubmissions(c));
