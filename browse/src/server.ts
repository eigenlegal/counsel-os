/**
 * Counsel OS browse server — persistent Chromium daemon
 *
 * Architecture:
 *   Bun.serve HTTP on localhost → routes commands to Playwright
 *   Console/network/dialog buffers: CircularBuffer in-memory + async disk flush
 *   Chromium crash → server EXITS with clear error (CLI auto-restarts)
 *   Auto-shutdown after BROWSE_IDLE_TIMEOUT (default 30 min)
 */

import { BrowserManager } from './browser-manager';
import { handleReadCommand } from './read-commands';
import { handleWriteCommand } from './write-commands';
import { handleMetaCommand } from './meta-commands';
import { handleCookiePickerRoute } from './cookie-picker-routes';
import { READ_COMMANDS, WRITE_COMMANDS, META_COMMANDS } from './commands';
import { redactUrl } from './url-redaction';
import { browsePort, ensureRuntimeDir, logFilePath, stateFilePath, writeFileExclusive } from './runtime-paths';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ─── Auth (inline) ─────────────────────────────────────────────
const AUTH_TOKEN = crypto.randomUUID();
const COOKIE_PICKER_TOKEN = crypto.randomUUID();
const BROWSE_PORT = browsePort();
const STATE_FILE = stateFilePath();
const IDLE_TIMEOUT_MS = parseInt(process.env.BROWSE_IDLE_TIMEOUT || '1800000', 10); // 30 min

export function validateBearerAuth(req: Request, token: string): boolean {
  const header = req.headers.get('authorization');
  return header === `Bearer ${token}`;
}

// ─── Buffer (from buffers.ts) ────────────────────────────────────
import { consoleBuffer, networkBuffer, dialogBuffer, addConsoleEntry, addNetworkEntry, addDialogEntry, type LogEntry, type NetworkEntry, type DialogEntry } from './buffers';
export { consoleBuffer, networkBuffer, dialogBuffer, addConsoleEntry, addNetworkEntry, addDialogEntry, type LogEntry, type NetworkEntry, type DialogEntry };

const CONSOLE_LOG_PATH = logFilePath('console');
const NETWORK_LOG_PATH = logFilePath('network');
const DIALOG_LOG_PATH = logFilePath('dialog');
let lastConsoleFlushed = 0;
let lastNetworkFlushed = 0;
let lastDialogFlushed = 0;
let flushInProgress = false;

async function flushBuffers() {
  if (flushInProgress) return; // Guard against concurrent flush
  flushInProgress = true;

  try {
    // Capture cursors BEFORE the awaits — entries added during an appendFile
    // must not be marked flushed without being written.
    const consoleTotal = consoleBuffer.totalAdded;
    const networkTotal = networkBuffer.totalAdded;
    const dialogTotal = dialogBuffer.totalAdded;

    // Console buffer
    const newConsoleCount = consoleTotal - lastConsoleFlushed;
    if (newConsoleCount > 0) {
      const entries = consoleBuffer.last(Math.min(newConsoleCount, consoleBuffer.length));
      const lines = entries.map(e =>
        `[${new Date(e.timestamp).toISOString()}] [${e.level}] ${e.text}`
      ).join('\n') + '\n';
      await fs.promises.appendFile(CONSOLE_LOG_PATH, lines, { mode: 0o600 });
      lastConsoleFlushed = consoleTotal;
    }

    // Network buffer
    const newNetworkCount = networkTotal - lastNetworkFlushed;
    if (newNetworkCount > 0) {
      const entries = networkBuffer.last(Math.min(newNetworkCount, networkBuffer.length));
      const lines = entries.map(e =>
        `[${new Date(e.timestamp).toISOString()}] ${e.method} ${redactUrl(e.url)} → ${e.status || 'pending'} (${e.duration || '?'}ms, ${e.size || '?'}B)`
      ).join('\n') + '\n';
      await fs.promises.appendFile(NETWORK_LOG_PATH, lines, { mode: 0o600 });
      lastNetworkFlushed = networkTotal;
    }

    // Dialog buffer
    const newDialogCount = dialogTotal - lastDialogFlushed;
    if (newDialogCount > 0) {
      const entries = dialogBuffer.last(Math.min(newDialogCount, dialogBuffer.length));
      const lines = entries.map(e =>
        `[${new Date(e.timestamp).toISOString()}] [${e.type}] "${e.message}" → ${e.action}${e.response ? ` "${e.response}"` : ''}`
      ).join('\n') + '\n';
      await fs.promises.appendFile(DIALOG_LOG_PATH, lines, { mode: 0o600 });
      lastDialogFlushed = dialogTotal;
    }
  } catch {
    // Flush failures are non-fatal — buffers are in memory
  } finally {
    flushInProgress = false;
  }
}

// ─── Idle Timer ────────────────────────────────────────────────
let lastActivity = Date.now();

function resetIdleTimer() {
  lastActivity = Date.now();
}

let flushInterval: ReturnType<typeof setInterval> | null = null;
let idleCheckInterval: ReturnType<typeof setInterval> | null = null;
let signalsRegistered = false;

// ─── Server ────────────────────────────────────────────────────
const browserManager = new BrowserManager();
let isShuttingDown = false;
let commandQueue: Promise<void> = Promise.resolve();
let activeCommands = 0;

async function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const previous = commandQueue;
  let release!: () => void;
  commandQueue = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous.catch(() => {});
  activeCommands++;
  try {
    return await fn();
  } finally {
    activeCommands--;
    resetIdleTimer();
    release();
  }
}

// Bind the real HTTP server to an available port, claiming it atomically.
// Deterministic from CONDUCTOR_PORT, else scan a range. Binding the actual
// server (rather than test-binding, stopping, and re-binding later) closes the
// TOCTOU window in which a concurrent CLI invocation could grab the same port
// between the probe and the real serve. The kept port is read off `.port`.
function serveOnAvailablePort(fetch: (req: Request) => Response | Promise<Response>) {
  // Deterministic port from CONDUCTOR_PORT (e.g., 55040 - 45600 = 9440)
  if (BROWSE_PORT) {
    try {
      return Bun.serve({ port: BROWSE_PORT, hostname: '127.0.0.1', fetch });
    } catch {
      throw new Error(`[browse] Port ${BROWSE_PORT} (from CONDUCTOR_PORT ${process.env.CONDUCTOR_PORT}) is in use`);
    }
  }

  // Fallback: scan range, keeping the first port we can actually bind.
  const start = parseInt(process.env.BROWSE_PORT_START || '9400', 10);
  let lastErr: unknown;
  for (let port = start; port < start + 10; port++) {
    try {
      return Bun.serve({ port, hostname: '127.0.0.1', fetch });
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(`[browse] No available port in range ${start}-${start + 9}: ${lastErr}`);
}

/**
 * Translate Playwright errors into actionable messages for AI agents.
 */
function wrapError(err: any): string {
  const msg = err.message || String(err);
  // Timeout errors
  if (err.name === 'TimeoutError' || msg.includes('Timeout') || msg.includes('timeout')) {
    if (msg.includes('locator.click') || msg.includes('locator.fill') || msg.includes('locator.hover')) {
      return `Element not found or not interactable within timeout. Check your selector or run 'snapshot' for fresh refs.`;
    }
    if (msg.includes('page.goto') || msg.includes('Navigation')) {
      return `Page navigation timed out. The URL may be unreachable or the page may be loading slowly.`;
    }
    return `Operation timed out: ${msg.split('\n')[0]}`;
  }
  // Multiple elements matched
  if (msg.includes('resolved to') && msg.includes('elements')) {
    return `Selector matched multiple elements. Be more specific or use @refs from 'snapshot'.`;
  }
  // Pass through other errors
  return msg;
}

export async function dispatchCommand(
  body: any,
  bm: BrowserManager,
  shutdownFn: () => Promise<void> = shutdown,
): Promise<Response> {
  const { command, args = [] } = body;

  if (!command || typeof command !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing "command" field' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!Array.isArray(args)) {
    return new Response(JSON.stringify({ error: '"args" must be an array' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    let result: string;

    if (READ_COMMANDS.has(command)) {
      result = await handleReadCommand(command, args, bm);
    } else if (WRITE_COMMANDS.has(command)) {
      result = await handleWriteCommand(command, args, bm);
    } else if (META_COMMANDS.has(command)) {
      result = await handleMetaCommand(command, args, bm, shutdownFn);
    } else {
      return new Response(JSON.stringify({
        error: `Unknown command: ${command}`,
        hint: `Available commands: ${[...READ_COMMANDS, ...WRITE_COMMANDS, ...META_COMMANDS].sort().join(', ')}`,
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(result, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: wrapError(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function handleCommand(body: any): Promise<Response> {
  // Adopt the caller's cwd so relative paths (screenshots, eval files) and the
  // safe-directory checks resolve against where the CLI ran, not where the
  // daemon happened to be spawned. Commands run exclusively, so this is safe.
  if (typeof body?.cwd === 'string' && body.cwd) {
    try { process.chdir(body.cwd); } catch {}
  }
  return dispatchCommand(body, browserManager, shutdown);
}

export interface RequestHandlerDeps {
  bm: BrowserManager;
  authToken: string;
  cookiePickerToken: string;
  startTime: number;
  runCommand: (body: any) => Promise<Response>;
}

// The idle timer is deliberately NOT reset here: only /command activity counts
// (runExclusive resets it on completion). If unauthenticated requests counted,
// any local poller — or a DNS-rebound page — hitting /health could keep the
// daemon alive indefinitely, defeating the idle shutdown that purges imported
// session cookies.
export function createRequestHandler(deps: RequestHandlerDeps): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const url = new URL(req.url);

    // Cookie picker routes use a separate URL token so they can be opened
    // in the user's browser without exposing the command bearer token.
    if (url.pathname.startsWith('/cookie-picker')) {
      return handleCookiePickerRoute(url, req, deps.bm, deps.cookiePickerToken);
    }

    // Health check — no auth required (now async)
    if (url.pathname === '/health') {
      const healthy = await deps.bm.isHealthy();
      return new Response(JSON.stringify({
        status: healthy ? 'healthy' : 'unhealthy',
        uptime: Math.floor((Date.now() - deps.startTime) / 1000),
        tabs: deps.bm.getTabCount(),
        currentUrl: redactUrl(deps.bm.getCurrentUrl()),
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // All other endpoints require auth
    if (!validateBearerAuth(req, deps.authToken)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/command' && req.method === 'POST') {
      const body = await req.json();
      return deps.runCommand(body);
    }

    return new Response('Not found', { status: 404 });
  };
}

async function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('[browse] Shutting down...');
  if (flushInterval) clearInterval(flushInterval);
  if (idleCheckInterval) clearInterval(idleCheckInterval);
  await flushBuffers(); // Final flush (async now)

  await browserManager.close();

  // Clean up state file
  try { fs.unlinkSync(STATE_FILE); } catch {}

  process.exit(0);
}

// ─── Start ─────────────────────────────────────────────────────
export async function start() {
  // State file + logs live in a per-user 0700 dir, never world-writable /tmp
  ensureRuntimeDir();

  // Clear old log files
  try { fs.unlinkSync(CONSOLE_LOG_PATH); } catch {}
  try { fs.unlinkSync(NETWORK_LOG_PATH); } catch {}
  try { fs.unlinkSync(DIALOG_LOG_PATH); } catch {}

  if (!signalsRegistered) {
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    signalsRegistered = true;
  }

  lastActivity = Date.now();
  flushInterval = setInterval(flushBuffers, 1000);
  idleCheckInterval = setInterval(() => {
    if (activeCommands === 0 && Date.now() - lastActivity > IDLE_TIMEOUT_MS) {
      console.log(`[browse] Idle for ${IDLE_TIMEOUT_MS / 1000}s, shutting down`);
      shutdown();
    }
  }, 60_000);

  // Launch browser
  await browserManager.launch();

  const startTime = Date.now();
  const server = serveOnAvailablePort(createRequestHandler({
    bm: browserManager,
    authToken: AUTH_TOKEN,
    cookiePickerToken: COOKIE_PICKER_TOKEN,
    startTime,
    runCommand: (body) => runExclusive(() => handleCommand(body)),
  }));
  const port = server.port;
  if (port == null) {
    throw new Error('[browse] Server bound without a TCP port');
  }

  // Write state file
  const state = {
    pid: process.pid,
    port,
    token: AUTH_TOKEN,
    startedAt: new Date().toISOString(),
    serverPath: path.resolve(import.meta.dir, 'server.ts'),
  };
  // The state file carries the bearer token — exclusive-create it 0600 so the
  // token never lands in a file (or through a symlink) something else made.
  writeFileExclusive(STATE_FILE, JSON.stringify(state, null, 2));

  browserManager.serverPort = port;
  browserManager.cookiePickerToken = COOKIE_PICKER_TOKEN;
  console.log(`[browse] Server running on http://127.0.0.1:${port} (PID: ${process.pid})`);
  console.log(`[browse] State file: ${STATE_FILE}`);
  console.log(`[browse] Idle timeout: ${IDLE_TIMEOUT_MS / 1000}s`);
}

if (import.meta.main) {
  start().catch((err) => {
    console.error(`[browse] Failed to start: ${err.message}`);
    process.exit(1);
  });
}
