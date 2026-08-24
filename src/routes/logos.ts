import { Hono } from 'hono';
import type { Env, AppVariables } from '../types/env';

export const logosRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

function generateFallbackSvg(domain: string): Response {
  const clean = domain.replace(/^www\./, '').split('.')[0] || 'OB';
  const initials = clean.slice(0, 2).toUpperCase();
  
  // Consistent color hash from domain string
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = domain.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  const bgColor = `hsl(${hue}, 65%, 45%)`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${bgColor}" />
  <text x="32" y="39" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">${initials}</text>
</svg>`;

  return new Response(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=604800, s-maxage=2592000, immutable',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// GET /api/logos/:domain - Secure Edge Proxy with 30-day CDN cache
logosRouter.get('/:domain', async (c) => {
  let rawDomain = c.req.param('domain').replace(/\.(png|jpg|jpeg|webp|svg)$/i, '');
  const domain = rawDomain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim();

  if (!domain) {
    return generateFallbackSvg('OB');
  }

  const publicId = c.env.CONTEXT_PUBLIC_ID;

  // 1. Try context.dev if publicId is configured
  if (publicId && publicId !== 'CONTEXT_PUBLIC_ID') {
    try {
      const targetUrl = `https://logos.context.dev/?publicClientId=${encodeURIComponent(publicId)}&domain=${encodeURIComponent(domain)}&theme=light`;
      const upstreamRes = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OutbidWatch/1.0; +https://outbidwatch.lol)',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
        cf: {
          cacheEverything: true,
          cacheTtl: 2592000,
          cacheKey: `outbidwatch-logo-${domain}`,
        },
      });

      if (upstreamRes.ok) {
        const contentType = upstreamRes.headers.get('content-type') || 'image/png';
        return new Response(upstreamRes.body, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=604800, s-maxage=2592000, immutable',
            'X-Proxied-By': 'OutbidWatch-Context',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    } catch {}
  }

  // 2. High-Resolution Google Favicon & App Icon Proxy
  try {
    const googleUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
    const googleRes = await fetch(googleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OutbidWatch/1.0)',
      },
      cf: {
        cacheEverything: true,
        cacheTtl: 2592000,
        cacheKey: `outbidwatch-google-logo-${domain}`,
      },
    });

    if (googleRes.ok) {
      const contentType = googleRes.headers.get('content-type') || 'image/png';
      return new Response(googleRes.body, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=604800, s-maxage=2592000, immutable',
          'X-Proxied-By': 'OutbidWatch-Google',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  } catch {}

  // 3. DuckDuckGo Icon Proxy Fallback
  try {
    const ddgUrl = `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`;
    const ddgRes = await fetch(ddgUrl, {
      cf: {
        cacheEverything: true,
        cacheTtl: 2592000,
        cacheKey: `outbidwatch-ddg-logo-${domain}`,
      },
    });

    if (ddgRes.ok) {
      return new Response(ddgRes.body, {
        status: 200,
        headers: {
          'Content-Type': 'image/x-icon',
          'Cache-Control': 'public, max-age=604800, s-maxage=2592000, immutable',
          'X-Proxied-By': 'OutbidWatch-DDG',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  } catch {}

  // 4. Clean Vector SVG fallback
  return generateFallbackSvg(domain);
});
