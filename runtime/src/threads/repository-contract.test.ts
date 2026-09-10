import { describe, expect, test } from 'bun:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SqliteThreadStore } from './sqlite-store';
import { ThreadStore, type ThreadEvent, type ThreadRepository } from './store';

interface Fixture {
  store: ThreadRepository;
  close(): void;
}

const implementations: Array<[string, () => Fixture]> = [
  [
    'filesystem',
    () => ({
      store: new ThreadStore(mkdtempSync(join(tmpdir(), 'thread-contract-fs-')), {
        codexHomeRoot: mkdtempSync(join(tmpdir(), 'thread-contract-fs-codex-')),
      }),
      close: () => {},
    }),
  ],
  [
    'sqlite',
    () => {
      const store = new SqliteThreadStore(mkdtempSync(join(tmpdir(), 'thread-contract-sqlite-')), {
        codexHomeRoot: mkdtempSync(join(tmpdir(), 'thread-contract-sqlite-codex-')),
      });
      return { store, close: () => store.close() };
    },
  ],
];

for (const [name, make] of implementations) {
  describe(`${name} ThreadRepository contract`, () => {
    test('creates, lists, updates, and removes a thread', async () => {
      const fixture = make();
      try {
        const created = await fixture.store.create('default', { title: 'Acme NDA', matter: 'matters/acme.md', task: 'review' });
        expect(await fixture.store.list('default')).toEqual([created]);

        const updated = await fixture.store.update('default', created.id, { title: 'Acme MSA', matter: null });
        expect(updated).toMatchObject({ id: created.id, title: 'Acme MSA', task: 'review' });
        expect(updated.matter).toBeUndefined();
        expect(updated.updatedAt).toBe(created.updatedAt);

        await fixture.store.remove('default', created.id);
        expect(await fixture.store.list('default')).toEqual([]);
      } finally {
        fixture.close();
      }
    });

    test('round-trips ordered events and applies event updates', async () => {
      const fixture = make();
      try {
        const thread = await fixture.store.create('default');
        const events: ThreadEvent[] = [
          { t: 'user', at: '2026-09-04T12:00:00.000Z', content: 'Review this' },
          { t: 'step', at: '2026-09-04T12:00:01.000Z', runId: 'run-1', provider: 'openai/gpt-6', task: 'chat', taskSource: 'default' },
          {
            t: 'proposal', at: '2026-09-04T12:00:02.000Z', id: 'proposal-1', path: 'matters/acme.md', content: 'new',
            rationale: 'record it', status: 'pending', expectedVersion: null,
          },
        ];
        for (const event of events) await fixture.store.append('default', thread.id, event);

        expect(await fixture.store.updateStep('default', thread.id, 'run-1', { task: 'review', taskSource: 'corrected' })).toBe(true);
        await fixture.store.updateProposal('default', thread.id, 'proposal-1', 'approved');

        const got = await fixture.store.get('default', thread.id);
        expect(got.header.title).toBe('Review this');
        expect(got.events.map(event => ('t' in event ? event.t : event.type))).toEqual(['user', 'step', 'proposal']);
        expect(got.events[1]).toMatchObject({ task: 'review', taskSource: 'corrected' });
        expect(got.events[2]).toMatchObject({ status: 'approved' });
      } finally {
        fixture.close();
      }
    });

    test('scopes sessions and validates externally supplied path segments', async () => {
      const fixture = make();
      try {
        const thread = await fixture.store.create('default');
        await fixture.store.setSession('default', thread.id, 'anthropic/claude-opus-5', 'a');
        await fixture.store.setSession('default', thread.id, 'openai/gpt-6', 'b');
        await fixture.store.clearSession('default', thread.id, 'anthropic/claude-opus-5');
        expect((await fixture.store.header('default', thread.id)).sessions).toEqual({ 'openai/gpt-6': 'b' });

        await expect(fixture.store.get('../other', thread.id)).rejects.toThrow('invalid tenant');
        await expect(fixture.store.get('default', '../../other')).rejects.toThrow('invalid thread id');
      } finally {
        fixture.close();
      }
    });
  });
}
