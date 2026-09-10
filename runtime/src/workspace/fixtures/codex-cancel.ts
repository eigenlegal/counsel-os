#!/usr/bin/env bun
/** Synthetic executable for the actual Codex SDK. No credentials or model calls. */
export {};
const input = await Bun.stdin.text();
if (input.includes('wait-for-cancellation')) {
  console.log(JSON.stringify({ type: 'thread.started', thread_id: 'synthetic-waiting' }));
  await Bun.sleep(30_000);
} else {
  console.log(JSON.stringify({ type: 'thread.started', thread_id: 'synthetic-complete' }));
  console.log(JSON.stringify({ type: 'item.completed', item: { id: 'synthetic-answer', type: 'agent_message', text: 'Synthetic only.' } }));
  console.log(JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 0, output_tokens: 0 } }));
}
