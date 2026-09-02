/**
 * The component tests' DOM, and the only place that sets one up.
 *
 * Every `*.test.tsx` imports this FIRST, rather than the repo using a bun
 * preload: `bun test` at the repo root runs the runtime's server tests in
 * the same process, and a preload would hand every one of them a browser
 * `window`/`document` they never asked for. Importing it per file keeps the
 * DOM scoped to the files that need it and keeps `bun run ui:test` working
 * standalone with no config of its own.
 *
 * Registration happens once per process — `register()` twice would replace
 * the globals out from under an already-rendered tree.
 */
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { within } from '@testing-library/react';

declare global {
  var __counselOsDomRegistered: boolean | undefined;
}

if (globalThis.__counselOsDomRegistered !== true) {
  // A real origin, not `about:blank`: the token bootstrap rewrites the
  // fragment with `history.replaceState`, and a relative rewrite against
  // `about:blank` resolves to nothing at all.
  GlobalRegistrator.register({ url: 'http://127.0.0.1:7431/' });
  globalThis.__counselOsDomRegistered = true;

  // A click on `<a download href="blob:…">` (the reader's and the slip's
  // Download) is a NAVIGATION to happy-dom, which then parks the one window
  // every test file shares on a blob URL: `history.replaceState` and
  // `location.hash` stop working for whichever files run after it. Real
  // browsers do not navigate on a download click, and the runner's file
  // order is not macOS's, so this bit CI and not laptops (the docket-anchor
  // tests in Chat.test.tsx). Download clicks record and stop here; a test
  // that wants the record installs its own stub on top.
  const anchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function click(this: HTMLAnchorElement): void {
    if (this.download !== '') return;
    anchorClick.call(this);
  };
}

/**
 * `screen`, bound late.
 *
 * Testing Library's own `screen` binds to `document.body` when its module is
 * evaluated, and bun pulls that CommonJS module in ahead of this file's
 * body — so the real `screen` is built before happy-dom exists and every
 * query on it throws. This one resolves `document.body` per access, which is
 * also what makes it survive `cleanup()` between tests.
 */
type Queries = ReturnType<typeof within>;

export const screen: Queries = new Proxy({} as Queries, {
  get(_target, prop: string | symbol): unknown {
    return (within(document.body) as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
