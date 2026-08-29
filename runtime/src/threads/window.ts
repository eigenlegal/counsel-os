import type { Message } from '../core/types';
import type { ThreadEvent } from './store';

const defaultEstimate = (s: string): number => Math.ceil(s.length / 4);

/** `user` events become user Messages; consecutive `text` step-events merge
 * into one assistant Message. Everything else (tool calls/results, session,
 * done, error, proposal, step) is replay/audit-only and skipped here. */
function toMessages(events: ThreadEvent[]): Message[] {
  const messages: Message[] = [];
  let textBuffer: string[] | null = null;

  const flush = (): void => {
    if (textBuffer && textBuffer.length > 0) {
      messages.push({ role: 'assistant', content: textBuffer.join('') });
    }
    textBuffer = null;
  };

  for (const ev of events) {
    if ('type' in ev && ev.type === 'text') {
      (textBuffer ??= []).push(ev.text);
      continue;
    }
    flush();
    if ('t' in ev && ev.t === 'user') {
      messages.push({ role: 'user', content: ev.content });
    }
  }
  flush();

  return messages;
}

/**
 * Builds the message window to send to a provider that has no session for
 * this thread: converts the event log to Messages, then drops the oldest
 * ones until the estimated token total fits `budgetTokens` — but never drops
 * the last user message (or anything after it), even if that alone puts the
 * window over budget.
 */
export function window(
  events: ThreadEvent[],
  budgetTokens: number,
  estimate: (s: string) => number = defaultEstimate
): Message[] {
  const messages = toMessages(events);

  let lastUserIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]!.role === 'user') {
      lastUserIndex = i;
      break;
    }
  }
  const minKeep = lastUserIndex === -1 ? messages.length + 1 : messages.length - lastUserIndex;

  const tokensOf = (msgs: Message[]): number => msgs.reduce((sum, m) => sum + estimate(m.content), 0);

  while (messages.length > minKeep && tokensOf(messages) > budgetTokens) {
    messages.shift();
  }

  return messages;
}
