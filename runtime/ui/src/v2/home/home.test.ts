import { describe, expect, test } from 'bun:test';
import type { MatterOverview } from '../../api/types';
import {
  dueLabel,
  greetingFor,
  nextActionOf,
  parseDeadline,
  sortMatters,
  starterFill,
  STARTERS,
  sublineFor,
  withAttachments,
} from './home';

const NOW = new Date('2026-08-30T14:00:00');

function matter(path: string, fm: Record<string, string>, mtimeMs: number): MatterOverview {
  return { path, title: path, frontmatter: fm, mtimeMs };
}

describe('greetingFor', () => {
  test('time of day, as set text', () => {
    expect(greetingFor(new Date('2026-08-30T09:00:00'))).toBe('Good morning.');
    expect(greetingFor(new Date('2026-08-30T14:00:00'))).toBe('Good afternoon.');
    expect(greetingFor(new Date('2026-08-30T20:00:00'))).toBe('Good evening.');
  });
});

describe('sublineFor', () => {
  test('honest counts, omitting what is zero; nothing to say is null', () => {
    expect(sublineFor({ nextActions: 3, pending: 1 })).toBe(
      'Three matters have open next-actions, and one proposal is waiting on you below.',
    );
    expect(sublineFor({ nextActions: 1, pending: 0 })).toBe('One matter has open next-actions.');
    expect(sublineFor({ nextActions: 0, pending: 2 })).toBe('Two proposals are waiting on you below.');
    expect(sublineFor({ nextActions: 0, pending: 0 })).toBeNull();
  });

  test('past the count words, the numeral', () => {
    expect(sublineFor({ nextActions: 12, pending: 0 })).toBe('12 matters have open next-actions.');
  });
});

describe('deadlines and next actions', () => {
  test('parseDeadline reads deadline or due; garbage is null', () => {
    expect(parseDeadline({ deadline: '2026-09-12' })?.getUTCDate()).toBe(12);
    expect(parseDeadline({ due: '2026-10-01' })).not.toBeNull();
    expect(parseDeadline({ deadline: 'soonish' })).toBeNull();
    expect(parseDeadline({})).toBeNull();
  });

  test('nextActionOf tries the frontmatter spellings', () => {
    expect(nextActionOf({ next_action: 'send document list' })).toBe('send document list');
    expect(nextActionOf({ nextAction: 'draft cover email' })).toBe('draft cover email');
    expect(nextActionOf({})).toBeNull();
    // The server's frontmatter filter keeps an empty string; the row must not
    // print a dangling `next:` label for it.
    expect(nextActionOf({ next_action: '   ' })).toBeNull();
  });

  test('dueLabel: date text, hot inside 14 days, quiet otherwise', () => {
    expect(dueLabel({ deadline: '2026-09-12' }, NOW)).toEqual({ text: 'due Sep 12', hot: true });
    expect(dueLabel({ deadline: '2026-10-01' }, NOW)).toEqual({ text: 'due Oct 1', hot: false });
    expect(dueLabel({}, NOW)).toEqual({ text: 'no deadline', hot: false });
  });

  test('dueLabel: a date already gone by says overdue, not due', () => {
    expect(dueLabel({ deadline: '2026-08-01' }, NOW)).toEqual({ text: 'overdue Aug 1', hot: true });
  });

  test('dueLabel: the 14-day edge is calendar days, not the hour of the day', () => {
    // 14 days out, asked at one minute to midnight — still hot.
    expect(dueLabel({ deadline: '2026-09-13' }, new Date('2026-08-30T23:59:00'))).toEqual({ text: 'due Sep 13', hot: true });
    // 15 days out, asked at one minute past — still quiet.
    expect(dueLabel({ deadline: '2026-09-14' }, new Date('2026-08-30T00:01:00'))).toEqual({ text: 'due Sep 14', hot: false });
  });

  test('sortMatters: deadline first (soonest up), then recency', () => {
    const sorted = sortMatters([
      matter('c.md', {}, 300),
      matter('a.md', { deadline: '2026-10-01' }, 100),
      matter('b.md', { deadline: '2026-09-12' }, 200),
      matter('d.md', {}, 400),
    ]);
    expect(sorted.map(m => m.path)).toEqual(['b.md', 'a.md', 'd.md', 'c.md']);
  });
});

describe('the ask box', () => {
  test('withAttachments folds path chips into the message', () => {
    expect(withAttachments('Review this.', ['matters/acme.md'])).toBe('Review this.\n\n`matters/acme.md`');
    expect(withAttachments('Review this. ', [])).toBe('Review this.');
  });

  test('attachments alone are still a message', () => {
    expect(withAttachments('   ', ['matters/acme.md'])).toBe('`matters/acme.md`');
  });

  test('starters are prompt-fills — text for the box, never a send', () => {
    expect(STARTERS).toEqual(['Review a contract', "What's our position on…", 'Draft a response', 'What changed this week?']);
    expect(starterFill('Review a contract')).toBe('Review this contract: ');
    expect(starterFill("What's our position on…")).toBe("What's our position on ");
    expect(starterFill('Draft a response')).toBe('Draft a response to ');
    expect(starterFill('What changed this week?')).toBe('What changed in the vault this week?');
  });
});
