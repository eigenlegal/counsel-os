import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ModelProvider, StepEvent, StepRequest } from '../core/types';
import { locateCli } from '../providers/cli-locate';
import { transportEnv } from '../providers/env';
import { mapClaudeMessage } from '../providers/claude-messages';
import { openToolBridge } from './tool-bridge';

export type ClaudeBilling = 'subscription' | 'api';
export interface ClaudeSignIn {
  installed: boolean;
  loggedIn: boolean;
  billing: ClaudeBilling | 'unknown';
  message: string;
}
/** Test seams never accept command paths or environment from HTTP/model input. */
export interface ClaudeRuntime {
  command?: string[];
  env?: NodeJS.ProcessEnv;
}

export function claudeCodeEnv(base: NodeJS.ProcessEnv): Record<string, string> {
  // Authentication remains in the unmodified CLI and its own credential store.
  // Do not copy OAuth files, forward ambient keys/tokens, or inherit plugins/hooks.
  return {
    PATH: base.PATH ?? '',
    HOME: base.HOME ?? '',
    USER: base.USER ?? '',
    ...(base.CLAUDE_CONFIG_DIR ? { CLAUDE_CONFIG_DIR: base.CLAUDE_CONFIG_DIR } : {}),
    ...transportEnv(base),
    ENABLE_CLAUDEAI_MCP_SERVERS: 'false',
    CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1',
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
  };
}

function commandFor(runtime: ClaudeRuntime): string[] | null {
  if (runtime.command) return runtime.command;
  const path = locateCli('claude');
  return path ? [path] : null;
}

/** Bounded subprocess output: never persist raw CLI diagnostics or auth output. */
async function readBounded(stream: ReadableStream<Uint8Array>, limit: number): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > limit) throw new Error('CLI output exceeded its limit.');
      chunks.push(next.value);
    }
    return Buffer.concat(chunks).toString('utf8');
  } finally {
    reader.releaseLock();
  }
}

function stopProcess(child: Bun.Subprocess): void {
  if (child.exitCode === null) child.kill('SIGTERM');
}
async function reap(child: Bun.Subprocess): Promise<void> {
  stopProcess(child);
  const timer = setTimeout(() => {
    if (child.exitCode === null) child.kill('SIGKILL');
  }, 1_000);
  try {
    await child.exited;
  } finally {
    clearTimeout(timer);
  }
}

async function inspectSignIn(
  command: string[],
  env: Record<string, string>,
  cwd: string,
  signal: AbortSignal,
): Promise<ClaudeSignIn> {
  signal.throwIfAborted();
  const child = Bun.spawn([...command, '--setting-sources', '', 'auth', 'status'], {
    cwd,
    env,
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'ignore',
  });
  let abortKill: ReturnType<typeof setTimeout> | undefined;
  const abort = () => {
    stopProcess(child);
    abortKill = setTimeout(() => {
      if (child.exitCode === null) child.kill('SIGKILL');
    }, 1_000);
  };
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) abort();
  const kill = setTimeout(() => {
    if (child.exitCode === null) child.kill('SIGKILL');
  }, 8_000);
  try {
    const output = await readBounded(child.stdout, 32_000);
    const code = await child.exited;
    signal.throwIfAborted();
    const status = JSON.parse(output) as { loggedIn?: unknown; authMethod?: unknown };
    const loggedIn = code === 0 && status.loggedIn === true;
    const billing =
      status.authMethod === 'claude.ai'
        ? 'subscription'
        : status.authMethod === 'api_key'
          ? 'api'
          : 'unknown';
    return {
      installed: true,
      loggedIn,
      billing,
      message: !loggedIn
        ? 'Not signed in. Run claude auth login in your terminal.'
        : billing === 'subscription'
          ? 'Signed in through Claude Code · subscription usage.'
          : billing === 'api'
            ? 'Signed in through Claude Code · API-billed usage.'
            : 'Claude Code is signed in, but its billing method is not recognized. Check claude auth status in your terminal.',
    };
  } finally {
    clearTimeout(kill);
    if (abortKill) clearTimeout(abortKill);
    signal.removeEventListener('abort', abort);
    await reap(child);
  }
}

export async function checkClaudeSignIn(runtime: ClaudeRuntime = {}): Promise<ClaudeSignIn> {
  const command = commandFor(runtime);
  if (!command)
    return {
      installed: false,
      loggedIn: false,
      billing: 'unknown',
      message: 'Install Claude Code, then run claude auth login in your terminal.',
    };
  const cwd = mkdtempSync(join(tmpdir(), 'counsel-claude-check-'));
  try {
    return await inspectSignIn(
      command,
      claudeCodeEnv(runtime.env ?? process.env),
      cwd,
      AbortSignal.timeout(10_000),
    );
  } catch {
    return {
      installed: true,
      loggedIn: false,
      billing: 'unknown',
      message:
        'Could not verify the local sign-in. Update Claude Code and run claude auth status in your terminal.',
    };
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

export function claudeCodeArgs(
  model: string,
  tools: string[],
  systemPath: string,
  mcpPath: string,
  maxTurns: number,
): string[] {
  return [
    '--print',
    '--verbose',
    '--output-format',
    'stream-json',
    '--include-partial-messages',
    '--no-session-persistence',
    '--restricted',
    '--setting-sources',
    '',
    '--disable-slash-commands',
    '--no-chrome',
    '--tools',
    '',
    '--permission-mode',
    'dontAsk',
    '--allowedTools',
    tools.map((name) => `mcp__counsel__${name}`).join(','),
    '--strict-mcp-config',
    '--mcp-config',
    mcpPath,
    '--settings',
    JSON.stringify({ disableAllHooks: true }),
    '--system-prompt-file',
    systemPath,
    '--model',
    model,
    '--max-turns',
    String(maxTurns),
  ];
}

/** Track individual message IDs so partial deltas and full assistant messages
 * don't duplicate text. Reasoning, auth metadata and arbitrary CLI errors stay private. */
export class ClaudeOutput {
  private partial = new Set<string>();
  private current: string | undefined;
  map(raw: unknown): StepEvent[] {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid CLI event.');
    const msg = raw as {
      type?: string;
      message?: { id?: string };
      event?: {
        type?: string;
        message?: { id?: string };
        delta?: { type?: string; text?: string };
      };
    };
    if (msg.type === 'stream_event') {
      const event = msg.event;
      if (event?.type === 'message_start') this.current = event.message?.id;
      if (
        event?.type === 'content_block_delta' &&
        event.delta?.type === 'text_delta' &&
        typeof event.delta.text === 'string'
      ) {
        if (this.current) this.partial.add(this.current);
        return [{ type: 'text', text: event.delta.text }];
      }
      if (event?.type === 'message_stop') this.current = undefined;
      return [];
    }
    if (msg.type === 'assistant') {
      const id = msg.message?.id;
      if (typeof id === 'string' && this.partial.delete(id)) return [];
      return mapClaudeMessage(raw).filter((event) => event.type === 'text');
    }
    if (msg.type === 'result')
      return mapClaudeMessage(raw).map((event) =>
        event.type === 'error'
          ? { type: 'error', message: 'Claude Code did not complete the response.' }
          : event,
      );
    return [];
  }
}

export class WorkspaceClaudeCodeProvider implements ModelProvider {
  readonly kind = 'harness' as const;
  readonly id: string;
  readonly capabilities;
  constructor(
    private model: string,
    private billing: ClaudeBilling = 'subscription',
    private runtime: ClaudeRuntime = {},
  ) {
    this.id = `claude-code/${billing}/${model}`;
    this.capabilities = {
      tools: true,
      caching: true,
      thinking: true,
      contextTokens: 200_000,
      auth: billing === 'subscription' ? ('subscription' as const) : ('apikey' as const),
    };
  }
  async *run(req: StepRequest): AsyncIterable<StepEvent> {
    const command = commandFor(this.runtime);
    if (!command) {
      yield { type: 'error', message: 'Install Claude Code and sign in first.' };
      return;
    }
    const signal = req.signal ?? AbortSignal.timeout(5 * 60_000);
    let cwd: string | undefined;
    let bridge: ReturnType<typeof openToolBridge> | undefined;
    let child: Bun.Subprocess<'pipe', 'pipe', 'ignore'> | undefined;
    let abort: (() => void) | undefined;
    let abortKill: ReturnType<typeof setTimeout> | undefined;
    try {
      signal.throwIfAborted();
      cwd = mkdtempSync(join(tmpdir(), 'counsel-claude-run-'));
      const env = claudeCodeEnv(this.runtime.env ?? process.env);
      const auth = await inspectSignIn(command, env, cwd, signal);
      if (!auth.loggedIn || auth.billing !== this.billing) {
        yield {
          type: 'error',
          message:
            'Claude Code sign-in does not match the selected billing method. Check the local sign-in in Settings.',
        };
        return;
      }
      signal.throwIfAborted();
      bridge = openToolBridge(req.tools, signal);
      const systemPath = join(cwd, 'instructions.txt');
      const mcpPath = join(cwd, 'tools.json');
      // Private run files, not argv: neither the system context nor MCP bearer
      // capability is exposed in process listings. Subscription credentials are never copied.
      // The unmodified subscription CLI may add account identity independently
      // of our prompt. This constrains its use, not its presence; disclose the
      // limitation in connection setup instead of promising profile isolation.
      writeFileSync(systemPath, `${req.system}\n\nCounsel identity boundary: Use only identity, author, organization and contact details explicitly supplied in Counsel's workspace context or the user's request. Provider login metadata, userEmail reminders, machine usernames and account identifiers are not the lawyer's Practice profile and must not be used for attribution, letterheads, signature blocks, filenames, recipients or contact details. If Counsel has not supplied the relevant identity, omit it or ask. Do not infer it from your authentication context.`, { mode: 0o600 });
      writeFileSync(
        mcpPath,
        JSON.stringify({
          mcpServers: {
            counsel: {
              type: 'http',
              url: bridge.url,
              headers: { Authorization: `Bearer ${bridge.token}` },
            },
          },
        }),
        { mode: 0o600 },
      );
      child = Bun.spawn(
        [
          ...command,
          ...claudeCodeArgs(
            this.model,
            req.tools.map((tool) => tool.name),
            systemPath,
            mcpPath,
            req.maxToolCalls ?? 20,
          ),
        ],
        {
          cwd,
          env,
          stdin: 'pipe',
          stdout: 'pipe',
          stderr: 'ignore',
        },
      );
      const proc = child;
      abort = () => {
        stopProcess(proc);
        abortKill = setTimeout(() => {
          if (proc.exitCode === null) proc.kill('SIGKILL');
        }, 1_000);
      };
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) abort();
      const prompt = `Conversation messages (JSON data):\n${JSON.stringify(req.messages)}`;
      proc.stdin.write(prompt);
      await proc.stdin.end();
      const reader = proc.stdout.getReader();
      const decoder = new TextDecoder('utf-8', { fatal: true });
      const mapper = new ClaudeOutput();
      let buffer = '';
      let size = 0;
      let terminal: StepEvent | undefined;
      try {
        for (;;) {
          const next = await reader.read();
          signal.throwIfAborted();
          if (next.done) {
            buffer += decoder.decode();
            break;
          }
          size += next.value.byteLength;
          if (size > 4_000_000) throw new Error('CLI response too large.');
          buffer += decoder.decode(next.value, { stream: true });
          if (buffer.length > 1_000_000) throw new Error('CLI event too large.');
          let end: number;
          while ((end = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, end).trim();
            buffer = buffer.slice(end + 1);
            if (!line) continue;
            if (terminal) throw new Error('Unexpected output after result.');
            for (const event of mapper.map(JSON.parse(line))) {
              if (event.type === 'done' || event.type === 'error') terminal = event;
              else yield event;
            }
          }
        }
        if (buffer.trim()) {
          if (terminal) throw new Error('Unexpected output after result.');
          for (const event of mapper.map(JSON.parse(buffer))) {
            if (event.type === 'done' || event.type === 'error') terminal = event;
            else yield event;
          }
        }
      } finally {
        reader.releaseLock();
      }
      const code = await proc.exited;
      signal.throwIfAborted();
      // No completed work is saved until the CLI itself exits successfully.
      if (code !== 0 || !terminal) throw new Error('Incomplete CLI response.');
      if (
        terminal.type === 'done' &&
        (typeof terminal.output !== 'string' || !terminal.output.trim())
      )
        throw new Error('No final answer received.');
      yield terminal;
    } catch {
      if (!signal.aborted)
        yield {
          type: 'error',
          message:
            'Claude Code could not finish. Check the CLI version, sign-in, model access and selected billing method in Settings.',
        };
    } finally {
      if (abortKill) clearTimeout(abortKill);
      if (abort) signal.removeEventListener('abort', abort);
      if (child) await reap(child);
      bridge?.close();
      if (cwd) rmSync(cwd, { recursive: true, force: true });
    }
  }
}
