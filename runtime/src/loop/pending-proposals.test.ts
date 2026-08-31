import { beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ThreadStore } from '../threads/store';
import { pendingProposals } from './pending-proposals';

let store: ThreadStore;

function proposal(id: string, at: string, status: 'pending' | 'approved' | 'rejected') {
  return {
    t: 'proposal' as const,
    at,
    id,
    path: `practice/standards/${id}.md`,
    content: 'CONTENT',
    rationale: `Rationale for ${id}.`,
    status,
    expectedVersion: null,
  };
}

beforeEach(() => {
  store = new ThreadStore(mkdtempSync(join(tmpdir(), 'pending-')), {
    codexHomeRoot: mkdtempSync(join(tmpdir(), 'pending-codex-')),
  });
});

describe('pendingProposals', () => {
  test('pending only, newest first, with the thread title', async () => {
    const a = await store.create('default', { title: 'NDA residuals fallback' });
    await store.append('default', a.id, proposal('p-old', '2026-08-30T09:00:00.000Z', 'pending'));
    await store.append('default', a.id, proposal('p-approved', '2026-08-30T09:30:00.000Z', 'approved'));
    const b = await store.create('default', {});
    await store.append('default', b.id, proposal('p-new', '2026-08-30T10:00:00.000Z', 'pending'));

    const listed = await pendingProposals(store, 'default');
    expect(listed.map(p => p.id)).toEqual(['p-new', 'p-old']);
    expect(listed[1]).toEqual({
      threadId: a.id,
      threadTitle: 'NDA residuals fallback',
      id: 'p-old',
      path: 'practice/standards/p-old.md',
      rationale: 'Rationale for p-old.',
      at: '2026-08-30T09:00:00.000Z',
    });
    // A titleless thread reads as Untitled, the same word the rail uses.
    expect(listed[0]!.threadTitle).toBe('Untitled');
  });

  test('the scan is bounded to the newest N threads', async () => {
    const older = await store.create('default', { title: 'older' });
    await store.append('default', older.id, proposal('p-buried', '2026-08-30T08:00:00.000Z', 'pending'));
    // Touching the newer thread LAST makes it the newest by updatedAt — but
    // only if the clock has actually moved. `updatedAt` is an ISO string at
    // millisecond resolution and these four writes finish inside one, so
    // wait for a distinct millisecond and test the bounding rule rather than
    // the clock's resolution.
    await Bun.sleep(2);
    const newer = await store.create('default', { title: 'newer' });
    await store.append('default', newer.id, proposal('p-seen', '2026-08-30T11:00:00.000Z', 'pending'));

    const listed = await pendingProposals(store, 'default', { limit: 1 });
    expect(listed.map(p => p.id)).toEqual(['p-seen']);
  });

  test('an empty store answers an empty list', async () => {
    expect(await pendingProposals(store, 'default')).toEqual([]);
  });
});
