import type { ErrorHandler, NotFoundHandler } from 'hono';
import type { Env, AppVariables } from '../types/env';

export const errorHandler: ErrorHandler<{ Bindings: Env; Variables: AppVariables }> = (err, c) => {
  console.error(`[ERROR] [${c.get('requestId') || 'no-id'}] ${c.req.method} ${c.req.url}:`, err);
  
  const status = 'status' in err && typeof err.status === 'number' ? err.status : 500;
  
  return c.json(
    {
      success: false,
      error: err.message || 'Internal Server Error',
      timestamp: new Date().toISOString(),
    },
    status as any
  );
};

export const notFoundHandler: NotFoundHandler<{ Bindings: Env; Variables: AppVariables }> = (c) => {
  const accept = c.req.header('Accept') || '';
  const host = c.req.header('host') || 'outbidwatch.com';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;

  if (accept.includes('text/markdown')) {
    c.header('Content-Type', 'text/markdown; charset=utf-8');
    c.header('Vary', 'Accept, Accept-Encoding');
    return c.text(`# 404 Not Found

The requested path \`${c.req.path}\` does not exist on OutbidWatch.

## Suggested Recovery Locations for Agents:
- **Directory**: [${baseUrl}/](${baseUrl}/)
- **Community Timeline**: [${baseUrl}/timeline](${baseUrl}/timeline)
- **XML Sitemap**: [${baseUrl}/sitemap.xml](${baseUrl}/sitemap.xml)
- **LLM Specification**: [${baseUrl}/llms.txt](${baseUrl}/llms.txt)
- **API Catalog**: [${baseUrl}/.well-known/api-catalog](${baseUrl}/.well-known/api-catalog)
- **OpenAPI Schema**: [${baseUrl}/openapi.json](${baseUrl}/openapi.json)
`, 404);
  }

  if (accept.includes('text/html') || !c.req.path.startsWith('/api/')) {
    c.header('Content-Type', 'text/html; charset=utf-8');
    c.header('Vary', 'Accept, Accept-Encoding');
    return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>404 Page Not Found | OutbidWatch</title>
<link rel="stylesheet" href="/style.css">
</head>
<body class="min-h-screen flex items-center justify-center p-6 text-center">
  <div class="max-w-md w-full card p-8">
    <div class="w-16 h-16 rounded-2xl bg-[#F5F4EC] flex items-center justify-center mx-auto mb-4 font-extrabold text-[24px] text-[#8A8574]">404</div>
    <h1 class="display font-extrabold text-[24px] text-[var(--ink)] mb-2">Page Not Found</h1>
    <p class="text-[14.5px] text-[#5B5A4E] mb-6">The page or platform at <code>${c.req.path}</code> could not be found.</p>
    <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
      <a href="/" class="btn-primary pill px-5 py-2.5 text-[13.5px] font-bold w-full sm:w-auto">Back to Directory</a>
      <a href="/timeline" class="pill px-5 py-2.5 text-[13.5px] font-semibold border border-[#E4E1D4] text-[#5B5A4E] hover:border-[#CCD99B] w-full sm:w-auto">View Timeline</a>
    </div>
  </div>
</body>
</html>`, 404);
  }

  return c.json(
    {
      success: false,
      error: `Endpoint not found: ${c.req.method} ${c.req.path}`,
      sitemap: `${baseUrl}/sitemap.xml`,
      llms_txt: `${baseUrl}/llms.txt`,
      api_catalog: `${baseUrl}/.well-known/api-catalog`,
      timestamp: new Date().toISOString(),
    },
    404
  );
};
