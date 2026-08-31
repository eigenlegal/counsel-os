import type { Tenant } from '../core/types';
import type { ThreadEvent, ThreadStore } from '../threads/store';

/**
 * `GET /proposals?status=pending` (redesign spec §4): every proposal still
 * waiting on the founder, across threads, for the home docket. Read-only —
 * it scans thread logs and writes nothing.
 *
 * Bounded on purpose: only the newest `limit` threads (by `updatedAt`) are
 * read. A vault with years of threads must not pay a full-log scan to draw
 * the home page, and a proposal in a thread nobody has touched in that long
 * is not "awaiting your decision" in any sense the docket should press.
 *
 * The bound is REPORTED, not silent. A founder gate that falls off the end
 * of the scan would otherwise vanish from the docket with nothing anywhere
 * saying the list was partial, so `scannedAll` tells the caller whether it
 * is looking at the whole queue.
 */
export const DEFAULT_SCAN_LIMIT = 20;

export interface PendingProposal {
  threadId: string;
  threadTitle: string;
  id: string;
  path: string;
  rationale: string;
  at: string;
}

export interface PendingProposalsResult {
  proposals: PendingProposal[];
  /** False when threads were left unscanned — the docket is showing only
   * the proposals from the newest `limit` threads. */
  scannedAll: boolean;
}

export async function pendingProposals(
  store: ThreadStore,
  tenant: Tenant,
  opts: { limit?: number } = {},
): Promise<PendingProposalsResult> {
  const limit = opts.limit ?? DEFAULT_SCAN_LIMIT;
  const headers = await store.list(tenant);
  // `createdAt` breaks a tie, because `updatedAt` is an ISO string at
  // millisecond resolution and two threads touched inside the same
  // millisecond compare equal. A stable sort would then leave them in
  // `list`'s order, which is createdAt ASCENDING — exactly backwards from
  // "newest first", so a bounded scan could drop the newest thread.
  const newest = [...headers]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);

  const out: PendingProposal[] = [];
  for (const header of newest) {
    let events: ThreadEvent[];
    try {
      ({ events } = await store.get(tenant, header.id));
    } catch {
      continue; // a thread deleted mid-scan is not the docket's problem
    }
    for (const ev of events) {
      if (!('t' in ev) || ev.t !== 'proposal' || ev.status !== 'pending') continue;
      out.push({
        threadId: header.id,
        threadTitle: header.title?.trim() || 'Untitled',
        id: ev.id,
        path: ev.path,
        rationale: ev.rationale,
        at: ev.at,
      });
    }
  }
  out.sort((a, b) => b.at.localeCompare(a.at));
  return { proposals: out, scannedAll: headers.length <= limit };
}
