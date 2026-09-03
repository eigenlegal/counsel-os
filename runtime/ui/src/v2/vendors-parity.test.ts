import { describe, expect, test } from 'bun:test';
import { allVendors, vendorFor as runtimeVendor } from '../../../src/providers/vendors';
import { VENDORS, addableVendors, keyBelongsToRow, vendorFor } from './vendors';

/**
 * The UI catalog is a hand-kept COPY of the runtime's (its own header says
 * so: "a change there is a change here"). Two facts in it are load-bearing
 * for credentials, and a one-character drift in either would be silent:
 *
 * - the base URL, because whether a row's address matches the vendor's own
 *   decides whether its key is filed under the vendor or under the row;
 * - which vendors are row-filed at all, because the page uses its own copy
 *   of that rule to decide whether a key can be pasted yet.
 */
describe('the UI catalog agrees with the runtime', () => {
  test('every vendor the UI offers exists in the runtime, at the same address', () => {
    for (const v of VENDORS) {
      const real = runtimeVendor(v.prefix);
      if (real === undefined) {
        // A display-only alias for an id an older file might carry
        // (`codex`). It must not be offerable, or the runtime would refuse
        // the row it created.
        expect(addableVendors().map(a => a.prefix), `${v.prefix} is unknown to the runtime but can be added`).not.toContain(v.prefix);
        continue;
      }
      const uiURL = (v.baseURL ?? '').trim();
      if (uiURL === '') continue;
      expect(real.defaultBaseURL, `${v.prefix}: base URL drifted between the catalogs`).toBe(uiURL);
    }
  });

  test('the two catalogs agree on which vendors file their key against the row', () => {
    // `keyBelongsToRow` (UI) must match `keyIdFor`'s rule (runtime), or the
    // page offers a paste that cannot be filed where it will be read.
    for (const real of allVendors()) {
      const ui = vendorFor(real.prefix);
      if (ui === undefined) continue;
      const runtimeSaysRow = real.fields !== undefined || real.baseURLFields !== undefined || real.locality === 'by-baseURL';
      expect(keyBelongsToRow(ui), `${real.prefix}: the catalogs disagree about key scope`).toBe(runtimeSaysRow);
    }
  });
});
