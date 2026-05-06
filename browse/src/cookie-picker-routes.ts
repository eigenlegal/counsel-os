/**
 * Cookie picker route handler — HTTP + Playwright glue
 *
 * Handles all /cookie-picker/* routes. Imports from cookie-import-browser.ts
 * (decryption) and cookie-picker-ui.ts (HTML generation).
 *
 * Routes (private token required):
 *   GET  /cookie-picker              → serves the picker HTML page
 *   GET  /cookie-picker/browsers     → list installed browsers
 *   GET  /cookie-picker/domains      → list domains + counts for a browser
 *   POST /cookie-picker/import       → decrypt + import cookies to Playwright
 *   POST /cookie-picker/remove       → clear cookies for domains
 *   GET  /cookie-picker/imported     → currently imported domains + counts
 */

import type { BrowserManager } from './browser-manager';
import { findInstalledBrowsers, listDomains, importCookies, CookieImportError } from './cookie-import-browser';
import { getCookiePickerHTML } from './cookie-picker-ui';

// ─── State ──────────────────────────────────────────────────────
// Tracks which domains were imported via the picker.
// /imported only returns cookies for domains in this Set.
// /remove clears from this Set.
const importedDomains = new Set<string>();
const importedCounts = new Map<string, number>();

// ─── JSON Helpers ───────────────────────────────────────────────

export function localOrigin(url: URL): string {
  return `${url.protocol}//${url.host}`;
}

export function isAllowedOrigin(url: URL, req: Request): boolean {
  const origin = req.headers.get('origin');
  return !origin || origin === localOrigin(url);
}

export function hasPickerAccess(url: URL, req: Request, pickerToken: string): boolean {
  if (!isAllowedOrigin(url, req)) return false;

  const secFetchSite = req.headers.get('sec-fetch-site');
  if (secFetchSite && !['same-origin', 'none'].includes(secFetchSite)) {
    return false;
  }

  const suppliedToken =
    url.searchParams.get('token') ||
    req.headers.get('x-browse-picker-token') ||
    '';

  return suppliedToken === pickerToken;
}

function corsHeaders(url: URL): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': localOrigin(url),
    'Vary': 'Origin',
  };
}

function jsonResponse(url: URL, data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(url),
    },
  });
}

function errorResponse(url: URL, message: string, code: string, status = 400, action?: string): Response {
  return jsonResponse(url, { error: message, code, ...(action ? { action } : {}) }, status);
}

// ─── Route Handler ──────────────────────────────────────────────

export async function handleCookiePickerRoute(
  url: URL,
  req: Request,
  bm: BrowserManager,
  pickerToken: string,
): Promise<Response> {
  const pathname = url.pathname;

  // GET /cookie-picker — serve the picker UI. The access token is delivered
  // in the URL fragment and then sent back as an API header; fragments are not
  // visible to the HTTP server.
  if (pathname === '/cookie-picker' && req.method === 'GET') {
    const port = parseInt(url.port, 10) || 9400;
    const html = getCookiePickerHTML(port);
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // CORS preflight
  if (req.method === 'OPTIONS') {
    if (!isAllowedOrigin(url, req)) {
      return errorResponse(url, 'Forbidden origin', 'forbidden_origin', 403);
    }
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders(url),
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Browse-Picker-Token',
      },
    });
  }

  if (!hasPickerAccess(url, req, pickerToken)) {
    return errorResponse(url, 'Unauthorized', 'unauthorized', 401);
  }

  try {
    // GET /cookie-picker/browsers — list installed browsers
    if (pathname === '/cookie-picker/browsers' && req.method === 'GET') {
      const browsers = findInstalledBrowsers();
      return jsonResponse(url, {
        browsers: browsers.map(b => ({
          name: b.name,
          aliases: b.aliases,
        })),
      });
    }

    // GET /cookie-picker/domains?browser=<name> — list domains + counts
    if (pathname === '/cookie-picker/domains' && req.method === 'GET') {
      const browserName = url.searchParams.get('browser');
      if (!browserName) {
        return errorResponse(url, "Missing 'browser' parameter", 'missing_param');
      }
      const result = listDomains(browserName);
      return jsonResponse(url, {
        browser: result.browser,
        domains: result.domains,
      });
    }

    // POST /cookie-picker/import — decrypt + import to Playwright session
    if (pathname === '/cookie-picker/import' && req.method === 'POST') {
      let body: any;
      try {
        body = await req.json();
      } catch {
        return errorResponse(url, 'Invalid JSON body', 'bad_request');
      }

      const { browser, domains } = body;
      if (!browser) return errorResponse(url, "Missing 'browser' field", 'missing_param');
      if (!domains || !Array.isArray(domains) || domains.length === 0) {
        return errorResponse(url, "Missing or empty 'domains' array", 'missing_param');
      }

      // Decrypt cookies from the browser DB
      const result = await importCookies(browser, domains);

      if (result.cookies.length === 0) {
        return jsonResponse(url, {
          imported: 0,
          failed: result.failed,
          domainCounts: {},
          message: result.failed > 0
            ? `All ${result.failed} cookies failed to decrypt`
            : 'No cookies found for the specified domains',
        });
      }

      // Add to Playwright context
      const page = bm.getPage();
      await page.context().addCookies(result.cookies);

      // Track what was imported
      for (const domain of Object.keys(result.domainCounts)) {
        importedDomains.add(domain);
        importedCounts.set(domain, (importedCounts.get(domain) || 0) + (result.domainCounts[domain] ?? 0));
      }

      console.log(`[cookie-picker] Imported ${result.count} cookies for ${Object.keys(result.domainCounts).length} domains`);

      return jsonResponse(url, {
        imported: result.count,
        failed: result.failed,
        domainCounts: result.domainCounts,
      });
    }

    // POST /cookie-picker/remove — clear cookies for domains
    if (pathname === '/cookie-picker/remove' && req.method === 'POST') {
      let body: any;
      try {
        body = await req.json();
      } catch {
        return errorResponse(url, 'Invalid JSON body', 'bad_request');
      }

      const { domains } = body;
      if (!domains || !Array.isArray(domains) || domains.length === 0) {
        return errorResponse(url, "Missing or empty 'domains' array", 'missing_param');
      }

      const page = bm.getPage();
      const context = page.context();
      for (const domain of domains) {
        await context.clearCookies({ domain });
        importedDomains.delete(domain);
        importedCounts.delete(domain);
      }

      console.log(`[cookie-picker] Removed cookies for ${domains.length} domains`);

      return jsonResponse(url, {
        removed: domains.length,
        domains,
      });
    }

    // GET /cookie-picker/imported — currently imported domains + counts
    if (pathname === '/cookie-picker/imported' && req.method === 'GET') {
      const entries: Array<{ domain: string; count: number }> = [];
      for (const domain of importedDomains) {
        entries.push({ domain, count: importedCounts.get(domain) || 0 });
      }
      entries.sort((a, b) => b.count - a.count);

      return jsonResponse(url, {
        domains: entries,
        totalDomains: entries.length,
        totalCookies: entries.reduce((sum, e) => sum + e.count, 0),
      });
    }

    return new Response('Not found', { status: 404 });
  } catch (err: any) {
    if (err instanceof CookieImportError) {
      return errorResponse(url, err.message, err.code, 400, err.action);
    }
    console.error(`[cookie-picker] Error: ${err.message}`);
    return errorResponse(url, err.message || 'Internal error', 'internal_error', 500);
  }
}
