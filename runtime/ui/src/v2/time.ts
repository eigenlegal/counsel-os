/** The quiet relative time every surface prints (mock copy: `2h ago`,
 * `yesterday`, `Aug 27`) — one implementation so home, chat and the vault
 * reader never disagree about what "recently" reads as. */
export function relTime(value: string | number, now: Date = new Date()): string {
  const then = new Date(value);
  const ms = now.getTime() - then.getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  if (ms < 2 * 86_400_000) return 'yesterday';
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
