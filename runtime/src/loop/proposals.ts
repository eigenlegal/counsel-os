import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Tenant, ToolDef, VaultStore, Version } from '../core/types';
import { VaultConflictError } from '../core/types';
import type { ThreadEvent, ThreadStore } from '../threads/store';
import { normalizeVaultPath } from '../vault/knowledge-paths';

export interface ProposeUpdateInput {
  path: string;
  content: string;
  rationale: string;
}

/**
 * `propose_update` — the only way a model writes a knowledge-system path
 * (see `guardedVaultTools`). It never writes the vault itself: it appends a
 * `proposal` event, carrying the path's version at proposal time, and hands
 * the model back the proposal id to reference when telling the user what it
 * proposed. `applyProposal` is what actually writes, on approval.
 *
 * The path is normalized before it is recorded. `isKnowledgePath` already
 * normalizes for its gate decision, so `matters/../practice/x.md` is
 * correctly treated as a knowledge path — but the raw spelling is what used
 * to land in the proposal event, and that is what a reviewer reads, what a
 * UI groups by, and what `applyProposal` writes to. Two spellings of one
 * file must not read as two different proposals. A path that normalizes out
 * of the vault throws, which `runToolDef` turns into an error result the
 * model can see, rather than recording an unapprovable proposal.
 */
export function proposeUpdateTool(
  store: ThreadStore,
  vault: VaultStore,
  threadId: string,
  tenant: Tenant,
): ToolDef<ProposeUpdateInput, { proposalId: string }> {
  return {
    name: 'propose_update',
    description:
      'Propose a write to a knowledge-system path (practice/, memory/, law/, or the entities directory). '
      + 'Does not write immediately — the user approves or rejects it. Matter paths use vault_write directly.',
    inputSchema: z.object({
      path: z.string().describe('Vault-relative path to write, e.g. practice/standards/indemnification.md.'),
      content: z.string().describe('The full new content of the file.'),
      rationale: z.string().describe('Why this update is proposed, for the user to review.'),
    }),
    execute: async ({ path, content, rationale }) => {
      const vaultPath = normalizeVaultPath(path);
      const proposalId = randomUUID();
      const expectedVersion = await vault.version(tenant, vaultPath);
      await store.append(tenant, threadId, {
        t: 'proposal',
        at: new Date().toISOString(),
        id: proposalId,
        path: vaultPath,
        content,
        rationale,
        status: 'pending',
        expectedVersion,
      });
      return { proposalId };
    },
  };
}

export type ApplyProposalResult =
  | { status: 'approved'; version: Version }
  | { status: 'rejected' }
  | { status: 'conflict'; conflict: { expected: Version; actual: Version } }
  // The proposal was already decided (by an earlier approve/reject) before
  // this call — no write happens, and the earlier decision is not disturbed.
  | { status: 'approved' | 'rejected'; error: string };

/**
 * Applies a founder/user decision on a pending proposal. A proposal that is
 * no longer `pending` (already approved or rejected) is a no-op: its past
 * status is returned with an error, and nothing is written — `decision` is
 * not consulted before that check, so `approve` can't re-run a write behind
 * an already-rejected proposal's back. Otherwise `reject` marks the event
 * rejected and writes nothing. `approve` writes `proposal.content` to
 * `proposal.path` with the proposal's recorded `expectedVersion` (`null`
 * when the path didn't exist at proposal time — that still conflicts if the
 * path was created in the meantime, see `FsVaultStore.write`) — if the path
 * changed since the proposal was made, the write conflicts and the proposal
 * is left `pending` so the model can re-propose against the current content
 * instead of silently clobbering the intervening edit.
 */
export async function applyProposal(
  store: ThreadStore,
  vault: VaultStore,
  tenant: Tenant,
  threadId: string,
  proposalId: string,
  decision: 'approve' | 'reject',
): Promise<ApplyProposalResult> {
  const { events } = await store.get(tenant, threadId);
  const proposal = events.find(
    (ev): ev is Extract<ThreadEvent, { t: 'proposal' }> => 't' in ev && ev.t === 'proposal' && ev.id === proposalId,
  );
  if (!proposal) throw new Error(`unknown proposal: ${proposalId}`);

  if (proposal.status !== 'pending') {
    return { status: proposal.status, error: 'proposal is not pending' };
  }

  if (decision === 'reject') {
    await store.updateProposal(tenant, threadId, proposalId, 'rejected');
    return { status: 'rejected' };
  }

  try {
    const version = await vault.write(tenant, proposal.path, proposal.content, {
      expectedVersion: proposal.expectedVersion,
    });
    await store.updateProposal(tenant, threadId, proposalId, 'approved');
    return { status: 'approved', version };
  } catch (err) {
    if (err instanceof VaultConflictError) {
      return { status: 'conflict', conflict: { expected: err.expected, actual: err.actual } };
    }
    throw err;
  }
}
