import { beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ThreadStore } from '../threads/store';
import { pendingProposals } from './pending-proposals';

let store: ThreadStore;
let storeRoot: string;

/** Rewrites a thread's header on disk, so a test can seed the exact
 * timestamps it means instead of racing a millisecond clock. */
function patchHeader(id: string, patch: { createdAt?: string; updatedAt?: string }): void {
  const file = join(storeRoot, '.counsel', 'threads', 'default', `${id}.json`);
  writeFileSync(file, JSON.stringify({ ...JSON.parse(readFileSync(file, 'utf8')), ...patch }, null, 2), 'utf8');
}

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
  storeRoot = mkdtempSync(join(tmpdir(), 'pending-'));
  store = new ThreadStore(storeRoot, {
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

    const { proposals: listed, scannedAll } = await pendingProposals(store, 'default');
    expect(scannedAll).toBe(true);
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

    const { proposals: listed, scannedAll } = await pendingProposals(store, 'default', { limit: 1 });
    expect(listed.map(p => p.id)).toEqual(['p-seen']);
    // Two threads, one scanned: the caller must be able to tell.
    expect(scannedAll).toBe(false);
  });

  // L2: the bounded-scan test above sleeps so `updatedAt` differs, which is
  // exactly the case the createdAt tiebreak does NOT cover. Seed the tie.
  test('threads tied on updatedAt fall back to createdAt, newest first', async () => {
    const older = await store.create('default', { title: 'older' });
    await store.append('default', older.id, proposal('p-older', '2026-08-30T08:00:00.000Z', 'pending'));
    const newer = await store.create('default', { title: 'newer' });
    await store.append('default', newer.id, proposal('p-newer', '2026-08-30T11:00:00.000Z', 'pending'));
    // Identical updatedAt; only createdAt separates them. Without the
    // tiebreak the stable sort keeps list()'s createdAt-ASCENDING order and
    // the bound would keep the OLDER thread.
    patchHeader(older.id, { createdAt: '2026-08-30T07:00:00.000Z', updatedAt: '2026-08-30T12:00:00.000Z' });
    patchHeader(newer.id, { createdAt: '2026-08-30T10:00:00.000Z', updatedAt: '2026-08-30T12:00:00.000Z' });

    const { proposals } = await pendingProposals(store, 'default', { limit: 1 });
    expect(proposals.map(p => p.id)).toEqual(['p-newer']);
  });

  test('an empty store answers an empty list, fully scanned', async () => {
    expect(await pendingProposals(store, 'default')).toEqual({ proposals: [], scannedAll: true });
  });
});
