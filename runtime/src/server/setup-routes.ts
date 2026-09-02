import { z } from 'zod';
import type { ContentSource } from '../content/source';
import { DEFAULT_STEP_TIMEOUT_MS } from '../loop/counsel-loop';
import { detectLocations, probeProviders, type Location, type ProviderProbe } from '../setup/detect';
import { SetupPlan } from '../setup/plan';
import { runSetup, SetupError, type SetupResult } from '../setup/run';
import { authorize, CLEAR_SESSION_COOKIE, withSessionCookie } from './auth';
import { isApiPath, type App } from './routes';
import { serveStatic, type StaticSource } from './static';

/**
 * The HTTP surface while the runtime has NO vault (spec 2026-09-01 §4,
 * "Setup mode"): the page is served, `/health` says `setup: true`, the two
 * probes and `POST /setup` work, and every other API route is a
 * `409 setup-required` — never a 500, never a route that pretends there is
 * a vault. On a successful `POST /setup` the server swaps this handler for
 * the real one (`onSetup`), same process, same token.
 */

export interface SetupAppDeps {
  token: string;
  tenant: string;
  /** The built UI, served as it would be with a vault. */
  distDir?: string | StaticSource;
  content: ContentSource;
  /** The runtime's state dir (`counselHome(env)`): the pointer lands here. */
  home: string;
  pluginRoot: string;
  /** The user's real home, for the probes. */
  osHome?: string;
  env?: NodeJS.ProcessEnv;
  stepTimeoutMs?: number;
  /** Injected probes (tests); defaults are the real ones. */
  detect?: () => Location[];
  probe?: () => Promise<ProviderProbe[]>;
  /** The seeded vault. Throws to refuse (a `--dist` that overlaps it, say);
   * the response is then a 400 and this app keeps serving. */
  onSetup(vault: string, result: SetupResult): Promise<void> | void;
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

export const SETUP_REQUIRED = { error: 'setup-required' } as const;

/** A `SetupPlan` with the vault's `~` already expanded by the client; the
 * schema itself insists on an absolute path. */
const SetupBody = SetupPlan;

export function createSetupApp(deps: SetupAppDeps): App {
  const staticHandler = deps.distDir === undefined ? null : serveStatic(deps.distDir);
  const env = deps.env ?? process.env;
  const detect = deps.detect ?? (() => detectLocations({ env, ...(deps.osHome === undefined ? {} : { home: deps.osHome }) }));
  const probe = deps.probe ?? (() => probeProviders({ env, ...(deps.osHome === undefined ? {} : { home: deps.osHome }) }));

  const health = (): Response =>
    json({
      setup: true,
      vault: null,
      tenant: deps.tenant,
      providers: [],
      default: null,
      stepTimeoutMs: deps.stepTimeoutMs ?? DEFAULT_STEP_TIMEOUT_MS,
    });

  const setup = async (req: Request): Promise<Response> => {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return json({ error: 'body must be JSON' }, 400);
    }
    const parsed = SetupBody.safeParse(raw);
    if (!parsed.success) {
      return json({ error: 'invalid setup plan', issues: parsed.error.issues.map(i => ({ path: i.path, message: i.message })) }, 400);
    }
    let result: SetupResult;
    try {
      result = runSetup(parsed.data, { content: deps.content, home: deps.home, pluginRoot: deps.pluginRoot });
    } catch (err) {
      if (err instanceof SetupError) return json({ error: err.message, reason: err.reason }, 400);
      throw err;
    }
    try {
      await deps.onSetup(result.vault, result);
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : String(err), reason: 'switch-failed', result }, 400);
    }
    return json({ vault: result.vault, result });
  };

  return async function setupApp(req: Request): Promise<Response> {
    const url = new URL(req.url);
    try {
      if (!isApiPath(url.pathname)) {
        const page = staticHandler === null ? null : await staticHandler(req);
        return page ?? json({ error: `no route for ${req.method} ${url.pathname}` }, 404);
      }
      // The same two credentials as the real app (auth.ts): the bearer signs
      // the browser in with the cookie, so the first-run screen's own calls
      // and the app that takes over after `POST /setup` share one sign-in.
      const via = authorize(req, deps.token);
      if (via === null) return json({ error: 'unauthorized' }, 401);
      const res = await dispatch(req, url);
      return via === 'bearer' && !res.headers.has('set-cookie') ? withSessionCookie(res, deps.token) : res;
    } catch (err) {
      console.error(`counsel-os server (setup mode): ${req.method} ${req.url} failed:`, err);
      return json({ error: 'internal error' }, 500);
    }
  };

  async function dispatch(req: Request, url: URL): Promise<Response> {
    {
      const segments = url.pathname.split('/').filter(s => s !== '');
      const [first, second] = segments;
      const { method } = req;

      if (segments.length === 1 && first === 'health' && method === 'GET') return health();
      if (segments.length === 2 && first === 'session' && second === 'clear' && method === 'POST') {
        return new Response(null, { status: 204, headers: { 'set-cookie': CLEAR_SESSION_COOKIE } });
      }
      if (first === 'setup') {
        if (segments.length === 2 && second === 'detect' && method === 'GET') return json({ locations: detect() });
        if (segments.length === 2 && second === 'providers' && method === 'GET') return json({ providers: await probe() });
        if (segments.length === 1 && method === 'POST') return await setup(req);
        return json({ error: `no route for ${method} ${url.pathname}` }, 404);
      }
      // Everything else needs a vault this runtime does not have yet.
      return json(SETUP_REQUIRED, 409);
    }
  }
}
