import { describe, expect, test } from 'bun:test';
import { daysUntil, parseDeadlineEntries, parseIsoDate, statusFor, sweepDocket, type DocketMatter } from './docket';

const NOW = new Date('2026-09-01T14:00:00');

function matter(path: string, frontmatter: string, title = path): DocketMatter {
  return { path, title, source: `---\n${frontmatter}\n---\n\n# ${title}\n\nBody.\n` };
}

describe('parseDeadlineEntries', () => {
  test('a block sequence of mappings, first field on the dash line or not', () => {
    const entries = parseDeadlineEntries(
      [
        'counsel-os-type: matter',
        'deadlines:',
        '  - date: 2026-09-10',
        '    action: "renewal notice due"',
        '    type: renewal',
        "    source: 'MSA §9.2'",
        '  -',
        '    date: 2026-10-01',
        '    action: objection window closes',
        '',
        '  - date: 2026-12-31',
        '    action: done one',
        '    done: true',
        'stage: working',
      ].join('\n'),
    );
    expect(entries).toEqual([
      { date: '2026-09-10', action: 'renewal notice due', type: 'renewal', source: 'MSA §9.2' },
      { date: '2026-10-01', action: 'objection window closes' },
      { date: '2026-12-31', action: 'done one', done: 'true' },
    ]);
  });

  test('the next top-level key ends the block; unknown fields are dropped; no block is no entries', () => {
    expect(parseDeadlineEntries('deadlines:\n  - date: 2026-09-10\n    notes: x\nstage: working\n  - date: 2027-01-01\n')).toEqual([
      { date: '2026-09-10' },
    ]);
    expect(parseDeadlineEntries('stage: working\n')).toEqual([]);
  });
});

describe('parseIsoDate / daysUntil / statusFor', () => {
  test('only a real YYYY-MM-DD parses', () => {
    expect(parseIsoDate('2026-09-15')?.toISOString()).toBe('2026-09-15T00:00:00.000Z');
    expect(parseIsoDate('2026-02-30')).toBeNull();
    expect(parseIsoDate('Sept 15 2026')).toBeNull();
    expect(parseIsoDate('2026-09-15T10:00:00Z')).toBeNull();
    expect(parseIsoDate('')).toBeNull();
  });

  test('overdue below zero, soon through the 14th day, later after', () => {
    expect(statusFor(-1)).toBe('overdue');
    expect(statusFor(0)).toBe('soon');
    expect(statusFor(14)).toBe('soon');
    expect(statusFor(15)).toBe('later');
    expect(daysUntil(parseIsoDate('2026-09-15')!, NOW)).toBe(14);
    expect(daysUntil(parseIsoDate('2026-09-16')!, NOW)).toBe(15);
    expect(daysUntil(parseIsoDate('2026-08-31')!, NOW)).toBe(-1);
  });
});

describe('sweepDocket', () => {
  test('sorted by date across matters, classified against now, done hidden, optional fields only when set', () => {
    const view = sweepDocket(
      [
        matter(
          'matters/acme.md',
          'deadlines:\n  - date: 2026-10-01\n    action: objection window\n  - date: 2026-08-30\n    action: file response\n    source: "Order ¶3"\n  - date: 2026-09-20\n    action: closed\n    done: yes',
          'Acme — NDA',
        ),
        matter('matters/vendora.md', 'deadlines:\n  - date: 2026-09-10\n    action: renewal notice\n    type: renewal', 'Vendora'),
      ],
      NOW,
    );
    expect(view.skipped).toBe(0);
    expect(view.deadlines).toEqual([
      { date: '2026-08-30', action: 'file response', source: 'Order ¶3', matter: { path: 'matters/acme.md', title: 'Acme — NDA' }, status: 'overdue' },
      { date: '2026-09-10', action: 'renewal notice', type: 'renewal', matter: { path: 'matters/vendora.md', title: 'Vendora' }, status: 'soon' },
      { date: '2026-10-01', action: 'objection window', matter: { path: 'matters/acme.md', title: 'Acme — NDA' }, status: 'later' },
    ]);
  });

  test('a bad or missing date is counted, never dropped silently', () => {
    const view = sweepDocket(
      [matter('matters/a.md', 'deadlines:\n  - date: soon\n    action: x\n  - action: no date at all\n  - date: 2026-09-05\n    action: real')],
      NOW,
    );
    expect(view.skipped).toBe(2);
    expect(view.deadlines.map(d => d.action)).toEqual(['real']);
  });

  test('the scalar deadline key is one entry, the next action as its action', () => {
    const view = sweepDocket(
      [
        matter('matters/a.md', 'deadline: 2026-09-12\nnext_action: send document list', 'A'),
        matter('matters/b.md', 'due: 2026-09-13', 'B'),
        matter('matters/c.md', 'deadline: TBD\nnext_action: x', 'C'),
      ],
      NOW,
    );
    expect(view.deadlines).toEqual([
      { date: '2026-09-12', action: 'send document list', matter: { path: 'matters/a.md', title: 'A' }, status: 'soon' },
      { date: '2026-09-13', action: 'deadline', matter: { path: 'matters/b.md', title: 'B' }, status: 'soon' },
    ]);
    expect(view.skipped).toBe(1);
  });

  test('a note with no frontmatter, or none of the keys, contributes nothing', () => {
    const view = sweepDocket(
      [{ path: 'matters/x.md', title: 'X', source: '# X\n\nno frontmatter\n' }, matter('matters/y.md', 'stage: working')],
      NOW,
    );
    expect(view).toEqual({ deadlines: [], skipped: 0 });
  });

  test('same date sorts by matter title', () => {
    const view = sweepDocket(
      [matter('matters/z.md', 'deadline: 2026-09-12', 'Zeta'), matter('matters/a.md', 'deadline: 2026-09-12', 'Alpha')],
      NOW,
    );
    expect(view.deadlines.map(d => d.matter.title)).toEqual(['Alpha', 'Zeta']);
  });
});
