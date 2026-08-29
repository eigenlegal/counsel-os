import { describe, expect, test, beforeEach } from 'bun:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyProposal, proposeUpdateTool } from './proposals';
import { FsVaultStore } from '../vault/fs-store';
import { ThreadStore } from '../threads/store';
import { runToolDef } from '../core/fake-provider';

let vault: FsVaultStore;
let store: ThreadStore;
let threadId: string;

beforeEach(async () => {
  vault = new FsVaultStore(mkdtempSync(join(tmpdir(), 'proposals-vault-')));
  store = new ThreadStore(mkdtempSync(join(tmpdir(), 'proposals-threads-')), {
    codexHomeRoot: mkdtempSync(join(tmpdir(), 'proposals-codex-')),
  });
  const header = await store.create('default', { title: 'test thread' });
  threadId = header.id;
});

describe('proposeUpdateTool', () => {
  test('appends a proposal event carrying the path\'s current version', async () => {
    await vault.write('default', 'practice/standards/indemnification.md', 'old content');
    const expectedVersion = await vault.version('default', 'practice/standards/indemnification.md');

    const tool = proposeUpdateTool(store, vault, threadId, 'default');
    const r = await runToolDef(
      [tool],
      'propose_update',
      { path: 'practice/standards/indemnification.md', content: 'new content', rationale: 'tighten the cap' },
      'default',
    );
    expect(r.isError).toBe(false);
    const proposalId = (r.output as { proposalId: string }).proposalId;
    expect(proposalId).toBeTruthy();

    const { events } = await store.get('default', threadId);
    const proposal = events.find(ev => 't' in ev && ev.t === 'proposal') as any;
    expect(proposal).toBeDefined();
    expect(proposal.id).toBe(proposalId);
    expect(proposal.path).toBe('practice/standards/indemnification.md');
    expect(proposal.content).toBe('new content');
    expect(proposal.rationale).toBe('tighten the cap');
    expect(proposal.status).toBe('pending');
    expect(proposal.expectedVersion).toBe(expectedVersion);

    // The vault itself is untouched — propose_update never writes.
    expect(await vault.read('default', 'practice/standards/indemnification.md')).toBe('old content');
  });

  test('a proposal for a path that does not exist yet records a null expectedVersion', async () => {
    const tool = proposeUpdateTool(store, vault, threadId, 'default');
    await runToolDef(
      [tool],
      'propose_update',
      { path: 'practice/standards/new.md', content: 'brand new', rationale: 'new standard' },
      'default',
    );
    const { events } = await store.get('default', threadId);
    const proposal = events.find(ev => 't' in ev && ev.t === 'proposal') as any;
    expect(proposal.expectedVersion).toBeNull();
  });
});

describe('applyProposal', () => {
  test('approve writes the content at the recorded version and returns the new version', async () => {
    const tool = proposeUpdateTool(store, vault, threadId, 'default');
    const propose = await runToolDef(
      [tool],
      'propose_update',
      { path: 'practice/standards/x.md', content: 'proposed content', rationale: 'r' },
      'default',
    );
    const proposalId = (propose.output as { proposalId: string }).proposalId;

    const result = await applyProposal(store, vault, 'default', threadId, proposalId, 'approve');
    expect(result.status).toBe('approved');
    expect((result as any).version).toBe(await vault.version('default', 'practice/standards/x.md'));
    expect(await vault.read('default', 'practice/standards/x.md')).toBe('proposed content');

    const { events } = await store.get('default', threadId);
    const proposal = events.find(ev => 't' in ev && ev.t === 'proposal') as any;
    expect(proposal.status).toBe('approved');
  });

  test('approve after an external edit conflicts and leaves the proposal pending', async () => {
    const originalVersion = await vault.write('default', 'practice/standards/x.md', 'original');
    const tool = proposeUpdateTool(store, vault, threadId, 'default');
    const propose = await runToolDef(
      [tool],
      'propose_update',
      { path: 'practice/standards/x.md', content: 'proposed content', rationale: 'r' },
      'default',
    );
    const proposalId = (propose.output as { proposalId: string }).proposalId;

    // Someone else edits the file after the proposal was made, before approval.
    const editedVersion = await vault.write('default', 'practice/standards/x.md', 'edited out from under the proposal');

    const result = await applyProposal(store, vault, 'default', threadId, proposalId, 'approve');
    expect(result.status).toBe('conflict');
    const conflict = (result as any).conflict;
    expect(conflict.expected).toBe(originalVersion);
    expect(conflict.actual).toBe(editedVersion);

    // Nothing further was written, and the proposal is still pending.
    expect(await vault.read('default', 'practice/standards/x.md')).toBe('edited out from under the proposal');
    const { events } = await store.get('default', threadId);
    const proposal = events.find(ev => 't' in ev && ev.t === 'proposal') as any;
    expect(proposal.status).toBe('pending');
  });

  test('reject marks the proposal rejected and writes nothing', async () => {
    const tool = proposeUpdateTool(store, vault, threadId, 'default');
    const propose = await runToolDef(
      [tool],
      'propose_update',
      { path: 'practice/standards/y.md', content: 'proposed content', rationale: 'r' },
      'default',
    );
    const proposalId = (propose.output as { proposalId: string }).proposalId;

    const result = await applyProposal(store, vault, 'default', threadId, proposalId, 'reject');
    expect(result.status).toBe('rejected');
    expect(await vault.version('default', 'practice/standards/y.md')).toBeNull();

    const { events } = await store.get('default', threadId);
    const proposal = events.find(ev => 't' in ev && ev.t === 'proposal') as any;
    expect(proposal.status).toBe('rejected');
  });

  test('an unknown proposal id throws', async () => {
    await expect(applyProposal(store, vault, 'default', threadId, 'nonexistent', 'approve')).rejects.toThrow(/unknown proposal/);
  });
});
