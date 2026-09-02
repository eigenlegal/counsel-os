import type { Health, ThreadPolicy } from '../api/types';
import { localPlate, swapPlates } from './plate';

/**
 * The swap, said where the lawyer is about to act (cou-95): the saved
 * default is not loaded, so the next send goes elsewhere. Set text, faint,
 * no box, no pill, no icon — and nothing at all when everything is fine.
 * Sits above the composer and above Home's ask box.
 */
export function ProviderNotice({ health }: { health: Health | null | undefined }): JSX.Element | null {
  const swap = swapPlates(health ?? null);
  if (swap === null) return null;
  const saved = swap.saved.vendor;
  return (
    <p className="v2-swap-notice" role="status">
      {swap.effective === null
        ? `${saved} is not available, and no other model is loaded.`
        : `${saved} is not available. Counsel will answer on ${swap.effective.vendor} (${swap.effective.model}).`}
      <a href="#/settings">change</a>
    </p>
  );
}

/**
 * The matter's privacy policy, said where the lawyer is about to send
 * (providers spec §7): which local model answers, or that none is loaded —
 * the runtime refuses the step in that case, and this line says so first.
 * Set text, no box, no pill; nothing at all when the matter is not local.
 */
export function PolicyNotice({ health, policy }: { health: Health | null | undefined; policy: ThreadPolicy | null | undefined }): JSX.Element | null {
  if (policy === null || policy === undefined || !policy.localOnly) return null;
  const local = localPlate(health ?? null);
  return (
    <p className="v2-swap-notice v2-policy-notice" role="status">
      {local === null
        ? 'This matter stays on this machine, and no local model is loaded.'
        : `This matter stays on this machine · answering on ${local.vendor} (${local.model})`}
      {local === null ? <a href="#/settings">add one</a> : null}
    </p>
  );
}
