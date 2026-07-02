/**
 * Counsel OS browse CLI — thin wrapper that talks to the persistent server
 *
 * Flow:
 *   1. Read /tmp/browse-server.json for port + token
 *   2. If missing or stale PID → start server in background
 *   3. Health check
 *   4. Send command via HTTP POST
 *   5. Print response to stdout (or stderr for errors)
 */

import * as fs from 'fs';
import * as path from 'path';

const PORT_OFFSET = 45600;
const BROWSE_PORT = process.env.CONDUCTOR_PORT
  ? parseInt(process.env.CONDUCTOR_PORT, 10) - PORT_OFFSET
  : parseInt(process.env.BROWSE_PORT || '0', 10);
const INSTANCE_SUFFIX = BROWSE_PORT ? `-${BROWSE_PORT}` : '';
const STATE_FILE = process.env.BROWSE_STATE_FILE || `/tmp/browse-server${INSTANCE_SUFFIX}.json`;
const MAX_START_WAIT = 8000; // 8 seconds to start

interface ServerCommandOptions {
  env?: NodeJS.ProcessEnv;
  importMetaDir?: string;
  execPath?: string;
  existsSync?: (path: string) => boolean;
}

export function resolveServerCommand(options: ServerCommandOptions = {}): string[] {
  const env = options.env ?? process.env;
  const importMetaDir = options.importMetaDir ?? import.meta.dir;
  const execPath = options.execPath ?? process.execPath;
  const existsSync = options.existsSync ?? fs.existsSync;

  if (env.BROWSE_SERVER_SCRIPT) {
    return ['bun', 'run', env.BROWSE_SERVER_SCRIPT];
  }

  // Dev mode: cli.ts runs directly from browse/src.
  if (importMetaDir.startsWith('/') && !importMetaDir.includes('$bunfs')) {
    const direct = path.resolve(importMetaDir, 'server.ts');
    if (existsSync(direct)) {
      return ['bun', 'run', direct];
    }
  }

  // Compiled mode: the bundled binary includes the literal dynamic import used
  // by __server, so it can spawn itself with a private server argument.
  return [execPath, '__server'];
}

export function ensurePluginNodePath(
  env: NodeJS.ProcessEnv = process.env,
  execPath = process.execPath,
  existsSync: (path: string) => boolean = fs.existsSync,
): void {
  const pluginRoot = path.resolve(path.dirname(execPath), '..', '..');
  const nodeModules = path.join(pluginRoot, 'node_modules');
  if (!existsSync(nodeModules)) return;

  const existing = env.NODE_PATH;
  const parts = existing ? existing.split(path.delimiter) : [];
  if (!parts.includes(nodeModules)) {
    env.NODE_PATH = [nodeModules, ...parts].join(path.delimiter);
  }
}

// Bun's fetch throws TimeoutError (AbortSignal.timeout) and ConnectionRefused,
// not Node's AbortError/ECONNREFUSED — accept both shapes.
export function isTimeoutError(err: any): boolean {
  return err?.name === 'AbortError' || err?.name === 'TimeoutError';
}

export function isConnectionError(err: any): boolean {
  return (
    err?.code === 'ECONNREFUSED' ||
    err?.code === 'ECONNRESET' ||
    err?.code === 'ConnectionRefused' ||
    err?.code === 'ConnectionReset' ||
    !!err?.message?.includes('fetch failed') ||
    !!err?.message?.includes('Unable to connect')
  );
}

interface ServerState {
  pid: number;
  port: number;
  token: string;
  startedAt: string;
  serverPath: string;
}

// ─── State File ────────────────────────────────────────────────
function readState(): ServerState | null {
  try {
    const data = fs.readFileSync(STATE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// ─── Server Lifecycle ──────────────────────────────────────────
async function startServer(): Promise<ServerState> {
  // Clean up stale state file
  try { fs.unlinkSync(STATE_FILE); } catch {}
  ensurePluginNodePath();

  // Start server as detached background process
  const proc = Bun.spawn(resolveServerCommand(), {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  // Don't hold the CLI open
  proc.unref();

  // Wait for state file to appear
  const start = Date.now();
  while (Date.now() - start < MAX_START_WAIT) {
    const state = readState();
    if (state && isProcessAlive(state.pid)) {
      return state;
    }
    await Bun.sleep(100);
  }

  // If we get here, server didn't start in time.
  // Drain stderr (bounded) so multi-chunk startup errors surface in full
  // rather than being truncated to the first chunk. The drain is time-boxed
  // because the process may still be alive (slow start, not a crash), in which
  // case stderr never closes and an unbounded read would hang the CLI.
  const stderr = proc.stderr;
  if (stderr && typeof stderr !== 'number') {
    const reader = stderr.getReader();
    const decoder = new TextDecoder();
    const deadline = Date.now() + 1000;
    let errText = '';
    try {
      while (Date.now() < deadline) {
        const remaining = deadline - Date.now();
        const chunk = await Promise.race([
          reader.read(),
          Bun.sleep(remaining).then(() => 'timeout' as const),
        ]);
        if (chunk === 'timeout') break;
        if (chunk.done) break;
        if (chunk.value) errText += decoder.decode(chunk.value, { stream: true });
      }
      errText += decoder.decode();
    } catch {
      // Ignore drain errors — fall through to the generic timeout message.
    } finally {
      reader.cancel().catch(() => {});
    }
    if (errText.trim()) {
      throw new Error(`Server failed to start:\n${errText.trim()}`);
    }
  }
  throw new Error(`Server failed to start within ${MAX_START_WAIT / 1000}s`);
}

async function ensureServer(): Promise<ServerState> {
  const state = readState();

  if (state && isProcessAlive(state.pid)) {
    // Server appears alive — do a health check
    try {
      const resp = await fetch(`http://127.0.0.1:${state.port}/health`, {
        signal: AbortSignal.timeout(2000),
      });
      if (resp.ok) {
        const health = await resp.json() as any;
        if (health.status === 'healthy') {
          return state;
        }
      }
    } catch {
      // Health check failed — server is dead or unhealthy
    }
  }

  // Need to (re)start
  console.error('[browse] Starting server...');
  return startServer();
}

// ─── Command Dispatch ──────────────────────────────────────────
async function sendCommand(state: ServerState, command: string, args: string[], retries = 0): Promise<void> {
  // chain runs multiple steps server-side (each with its own Playwright timeout),
  // so give it a larger budget than single commands.
  const timeoutMs = command === 'chain' ? 120_000 : 30_000;
  const body = JSON.stringify({ command, args, cwd: process.cwd() });

  try {
    const resp = await fetch(`http://127.0.0.1:${state.port}/command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`,
      },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (resp.status === 401) {
      // Token mismatch — server may have restarted
      console.error('[browse] Auth failed — server may have restarted. Retrying...');
      const newState = readState();
      if (newState && newState.token !== state.token) {
        return sendCommand(newState, command, args);
      }
      throw new Error('Authentication failed');
    }

    const text = await resp.text();

    if (resp.ok) {
      process.stdout.write(text);
      if (!text.endsWith('\n')) process.stdout.write('\n');
    } else {
      // Try to parse as JSON error
      try {
        const err = JSON.parse(text);
        console.error(err.error || text);
        if (err.hint) console.error(err.hint);
      } catch {
        console.error(text);
      }
      process.exit(1);
    }
  } catch (err: any) {
    if (isTimeoutError(err)) {
      console.error(`[browse] Command timed out after ${timeoutMs / 1000}s`);
      process.exit(1);
    }
    // Connection error — server may have crashed
    if (isConnectionError(err)) {
      if (retries >= 1) throw new Error('[browse] Server crashed twice in a row — aborting');
      console.error('[browse] Server connection lost. Restarting...');
      const newState = await startServer();
      return sendCommand(newState, command, args, retries + 1);
    }
    throw err;
  }
}

// ─── Main ──────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);

  if (args[0] === '__server') {
    ensurePluginNodePath();
    const { start: startBrowseServer } = await import('./server');
    await startBrowseServer();
    return;
  }

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`Counsel OS browse — headless browser for legal document extraction

Usage: browse <command> [args...]

Navigation:     goto <url> | back | forward | reload | url
Content:        text | html [sel] | links | forms | accessibility
Interaction:    click <sel> | fill <sel> <val> | select <sel> <val>
                hover <sel> | type <text> | press <key>
                scroll [sel] | wait <sel|--networkidle|--load|--domcontentloaded> | viewport <WxH>
                upload <sel> <file1> [file2...]
                cookie-import <json-file>
                cookie-import-browser [browser] [--domain <d>]
Inspection:     js <expr> | eval <file> | css <sel> <prop> | attrs <sel>
                console [--clear|--errors] | network [--clear] | dialog [--clear]
                cookies | storage [set <k> <v>] | perf
                is <prop> <sel> (visible|hidden|enabled|disabled|checked|editable|focused)
Visual:         screenshot [path] | pdf [path] | responsive [prefix]
Snapshot:       snapshot [-i] [-c] [-d N] [-s sel] [-D] [-a] [-o path] [-C]
                -D/--diff: diff against previous snapshot
                -a/--annotate: annotated screenshot with ref labels
                -C/--cursor-interactive: find non-ARIA clickable elements
Compare:        diff <url1> <url2>
Multi-step:     chain (reads JSON from stdin)
Tabs:           tabs | tab <id> | newtab [url] | closetab [id]
Server:         status | cookie <n>=<v> | header <n>:<v>
                useragent <str> | stop | restart
Dialogs:        dialog-accept [text] | dialog-dismiss

Refs:           After 'snapshot', use @e1, @e2... as selectors:
                click @e3 | fill @e4 "value" | hover @e1
                @c refs from -C: click @c1`);
    process.exit(0);
  }

  const command = args[0];
  if (!command) throw new Error('Usage: browse <command> [args...]');
  const commandArgs = args.slice(1);

  // Special case: chain reads from stdin
  if (command === 'chain' && commandArgs.length === 0) {
    const stdin = await Bun.stdin.text();
    commandArgs.push(stdin.trim());
  }

  const state = await ensureServer();
  await sendCommand(state, command, commandArgs);

  // restart: the server responds, then exits ~250ms later. Wait for the old
  // process to die, then bring up a fresh server so "restart" means restart.
  if (command === 'restart') {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline && isProcessAlive(state.pid)) {
      await Bun.sleep(100);
    }
    const newState = await startServer();
    console.error(`[browse] Server restarted (PID: ${newState.pid})`);
  }
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(`[browse] ${err.message}`);
    process.exit(1);
  });
}
