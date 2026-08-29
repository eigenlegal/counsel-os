import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Tenant, ToolDef, VaultStore, Version } from '../core/types';
import { VaultConflictError } from '../core/types';
import type { ThreadEvent, ThreadStore } from '../threads/store';

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
      const proposalId = randomUUID();
      const expectedVersion = await vault.version(tenant, path);
      await store.append(tenant, threadId, {
        t: 'proposal',
        at: new Date().toISOString(),
        id: proposalId,
        path,
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
  | { status: 'conflict'; conflict: { expected: Version; actual: Version } };

/**
 * Applies a founder/user decision on a pending proposal. `reject` marks the
 * event rejected and writes nothing. `approve` writes `proposal.content` to
 * `proposal.path` with the proposal's recorded `expectedVersion` — if the
 * path changed since the proposal was made, the write conflicts and the
 * proposal is left `pending` so the model can re-propose against the current
 * content instead of silently clobbering the intervening edit.
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

  if (decision === 'reject') {
    await store.updateProposal(tenant, threadId, proposalId, 'rejected');
    return { status: 'rejected' };
  }

  try {
    const version = await vault.write(tenant, proposal.path, proposal.content, {
      expectedVersion: proposal.expectedVersion ?? undefined,
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
