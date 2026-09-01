import { plateFor } from './plate';

/**
 * A step failure, said plainly (cou-95).
 *
 * The runtime's error events carry the provider's own words — `claude
 * harness: Not logged in · Please run /login`, `step timed out after 600s`,
 * `fetch failed` — which tell a lawyer nothing about what to do. The `line`
 * is what the turn shows; `detail` is the original text, kept one click away
 * whenever the line does not already contain it. Matching is by the strings
 * the runtime actually produces (`runtime/src/loop/counsel-loop.ts`,
 * `runtime/src/providers/*.ts`) and by what the SDKs and CLIs are known to
 * say; anything unmatched falls back to `<Vendor> did not answer: <text>`,
 * so nothing is ever hidden behind a guess.
 */
export interface HumanError {
  line: string;
  detail?: string;
}

/** The vendor a lawyer knows, or "Counsel" when the turn never named one
 * (a step that failed before its provider was recorded). */
function vendorOf(providerId: string): string {
  if (providerId === '') return 'Counsel';
  const plate = plateFor(providerId);
  return plate.known ? plate.vendor : providerId;
}

function prefixOf(providerId: string): string {
  const slash = providerId.indexOf('/');
  return slash === -1 ? providerId : providerId.slice(0, slash);
}

function modelOf(providerId: string): string {
  const slash = providerId.indexOf('/');
  return slash === -1 ? providerId : providerId.slice(slash + 1);
}

const TIMEOUT = /step timed out after (\d+)s/;
const CONTEXT = /exceeds the provider's context window/;
const UNKNOWN_PROVIDER = /unknown provider: (\S+)/;
const UNKNOWN_THREAD = /^unknown thread: /;
const NO_TERMINAL = /ended the step without a done or error event/;
const SHAPE = /structured output/;
const LOGIN = /not logged in|please run \/login|\/login|login expired|oauth|not authenticated/i;
const API_KEY = /invalid (x-)?api[ -]?key|incorrect api key|api key|authentication_error|\b401\b|unauthori[sz]ed|forbidden|\b403\b/i;
const NOT_INSTALLED = /ENOENT|spawn .* (ENOENT|failed)|command not found|not installed|no such file/i;
const BUSY = /rate[ _-]?limit|\b429\b|overloaded|\b529\b|too many requests|capacity/i;
const UNREACHABLE = /ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN|fetch failed|connection refused|network/i;
const MODEL_MISSING = /model ['"]?([^'" ]+)['"]? not found|pull (the )?model|no such model/i;
const MAX_TURNS = /error_max_turns/;
const MAX_BUDGET = /error_max_budget/;

function minutes(seconds: number): string {
  if (seconds < 60) return `${seconds}-second`;
  const m = Math.round(seconds / 60);
  return `${m}-minute`;
}

export function humanizeStepError(message: string, providerId: string): HumanError {
  const raw = message.trim();
  const vendor = vendorOf(providerId);
  const prefix = prefixOf(providerId);
  const withDetail = (line: string): HumanError => (line.includes(raw) ? { line } : { line, detail: raw });

  const timeout = TIMEOUT.exec(raw);
  if (timeout !== null) return withDetail(`The step ran past its ${minutes(Number(timeout[1]))} limit. Ask something smaller, or raise the step timeout in Settings.`);
  if (CONTEXT.test(raw)) return withDetail(`${vendor} could not take this much at once: the instructions and the document together exceed its context window.`);
  const unknown = UNKNOWN_PROVIDER.exec(raw);
  if (unknown !== null) return withDetail(`No provider called ${unknown[1]} is loaded. Pick one in Settings, then retry.`);
  if (UNKNOWN_THREAD.test(raw)) return withDetail('This conversation no longer exists on the runtime. Start a new one.');
  if (NO_TERMINAL.test(raw)) return withDetail(`${vendor} stopped without answering. Retry.`);
  if (SHAPE.test(raw)) return withDetail(`${vendor} answered in the wrong shape for this step. Retry, or try another model.`);
  if (MAX_TURNS.test(raw)) return withDetail(`${vendor} stopped after too many tool calls without finishing. Ask something narrower.`);
  if (MAX_BUDGET.test(raw)) return withDetail(`${vendor} stopped: the step's spending limit was reached.`);

  // Vendor-specific: the harnesses wrap their CLI's words; the direct
  // providers surface the SDK's.
  if (prefix === 'claude-sub') {
    if (NOT_INSTALLED.test(raw)) return withDetail('Claude did not answer: the Claude Code CLI is not installed on this machine.');
    if (LOGIN.test(raw) || API_KEY.test(raw)) return withDetail('Claude did not answer: your Claude login has expired. Run `claude login` in a terminal, then retry.');
    if (BUSY.test(raw)) return withDetail('Claude is busy right now. Retry in a moment.');
    if (UNREACHABLE.test(raw)) return withDetail('Claude could not be reached. Check your connection, then retry.');
  }
  if (prefix === 'codex-sub' || prefix === 'codex') {
    if (NOT_INSTALLED.test(raw)) return withDetail('ChatGPT did not answer: the Codex CLI is not installed on this machine.');
    if (LOGIN.test(raw) || API_KEY.test(raw)) return withDetail('ChatGPT did not answer: your ChatGPT login has expired. Run `codex login` in a terminal, then retry.');
    if (BUSY.test(raw)) return withDetail('ChatGPT is busy right now. Retry in a moment.');
    if (UNREACHABLE.test(raw)) return withDetail('ChatGPT could not be reached. Check your connection, then retry.');
  }
  if (prefix === 'ollama') {
    const missing = MODEL_MISSING.exec(raw);
    if (missing !== null) {
      const model = missing[1] ?? modelOf(providerId);
      return withDetail(`Ollama does not have the model ${model}. Run \`ollama pull ${model}\`, then retry.`);
    }
    if (UNREACHABLE.test(raw)) return withDetail('Ollama is not running on this machine. Start it, then retry.');
  }
  if (prefix === 'anthropic' || prefix === 'openai' || prefix === 'openai-compatible') {
    if (API_KEY.test(raw) || LOGIN.test(raw)) return withDetail(`${vendor} did not answer: the API key was rejected. Check the key in your environment, restart the runtime, then retry.`);
    if (BUSY.test(raw)) return withDetail(`${vendor} is busy right now. Retry in a moment.`);
    if (UNREACHABLE.test(raw)) return withDetail(`${vendor} could not be reached. Check your connection, then retry.`);
  }

  return { line: `${vendor} did not answer: ${raw}` };
}
