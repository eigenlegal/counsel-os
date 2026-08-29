/**
 * One place the app learns that its token is no good — whether that showed
 * up as a missing token before a request or a 401 after one.
 *
 * It is a tiny listener list rather than React state because the reporter is
 * `client.ts`, which is called from every surface and knows nothing about
 * components. The app subscribes once and renders the spec §5 message; a
 * component that also wants to handle the failure still gets the thrown
 * `ApiError`/`TokenMissingError` as usual.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

/** Subscribes; the returned function unsubscribes. */
export function onUnauthorized(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function reportUnauthorized(): void {
  // A copy: a listener that unsubscribes itself must not disturb this pass.
  for (const fn of [...listeners]) fn();
}
