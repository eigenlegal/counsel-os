import { Codex } from '@openai/codex-sdk';
import { codexCancellation } from '../codex-cancellation';
import { resolve } from 'node:path';

const controller = new AbortController();
// Diagnostic only: this opt-in reproduces the SDK/Bun crash in a child process.
// Normal regression tests use the owned signal below, never this baseline.
const cancellation = process.argv.includes('--unsafe-baseline')
  ? { signal: controller.signal, release: () => {} }
  : codexCancellation(controller.signal);
const codex = new Codex({ codexPathOverride: resolve(import.meta.dir, 'codex-cancel.ts'), env: { PATH: process.env.PATH ?? '' } });
const cancelWhileRunning = process.argv.includes('--running');
let completed = false, aborted = false;
try {
  const { events } = await codex.startThread().runStreamed(cancelWhileRunning ? 'wait-for-cancellation' : 'synthetic-complete', { signal: cancellation.signal });
  for await (const event of events) {
    if (cancelWhileRunning && event.type === 'thread.started') controller.abort();
    if (event.type === 'turn.completed') { completed = true; break; }
  }
} catch { aborted = true; }
finally { cancellation.release(); }
// A finished chat's five-minute deadline may fire later. It must not reach the
// SDK child whose listeners were already removed. This wait is test-only.
controller.abort();
await Bun.sleep(100);
if (cancelWhileRunning ? !aborted : !completed || aborted) throw new Error('Unexpected SDK cancellation result.');
console.log(JSON.stringify({ alive: true, completed, aborted }));
