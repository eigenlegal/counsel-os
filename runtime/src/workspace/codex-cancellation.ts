/** Detach the caller's deadline when an SDK stream closes. SDK 0.150.1 removes
 * child-process error listeners on iterator return; Bun can still deliver a
 * later AbortError through the original signal even after that child has exited. */
export function codexCancellation(parent: AbortSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort(parent.reason);
  if (parent.aborted) abort();
  else parent.addEventListener('abort', abort, { once: true });
  return { signal: controller.signal, release: () => parent.removeEventListener('abort', abort) };
}
