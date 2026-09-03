/**
 * Adding a provider.
 *
 * It was a search box with a placeholder and a greyed-out Add button, and
 * the founder's verdict was the right one: "it's unclear what to do." You
 * had to know to type something, then that a list would appear, then to
 * pick from it, then to press Add — four steps, none of them signposted,
 * to do the thing the page most wants you to do.
 *
 * So the common ones are named, and you click the one you want. The whole
 * catalog is still there, behind a link, for the practice that buys from
 * someone else.
 */
import { useState } from 'react';
import { ProviderCombo } from '../../settings/ProviderCombo';
import { makesLine, pickerLabel, searchVendors, vendorByPickerLabel, vendorFor, type VendorRow } from '../vendors';

/** The ones a practice actually starts with: the two big labs, Google, and
 * a model on your own machine. Everything else is a search away. */
const COMMON = ['anthropic', 'openai', 'google', 'ollama'] as const;

export interface AddProviderProps {
  /** Whether this vendor already has a row or a loaded model. */
  have(prefix: string): boolean;
  onAdd(vendor: VendorRow): void;
  /** The last resort: a row with nothing filled in, for an endpoint the
   * catalog has never heard of. */
  onAddBlank(): void;
}

export function AddProvider({ have, onAdd, onAddBlank }: AddProviderProps): JSX.Element {
  const [searching, setSearching] = useState(false);
  const [pick, setPick] = useState('');

  const offer = COMMON.map(prefix => vendorFor(prefix)).filter((v): v is VendorRow => v !== undefined && !have(v.prefix));
  const picked = vendorByPickerLabel(pick);

  return (
    <div className="v2-add">
      <h3 className="runin">Add a provider</h3>
      {offer.length === 0 ? null : (
        <ul className="v2-add-list">
          {offer.map(v => (
            <li key={v.prefix}>
              {/* One click, one provider. No second button to press. */}
              <button type="button" className="v2-add-one" onClick={() => onAdd(v)}>
                <span className="v2-add-name">{v.label ?? v.name}</span>
                <span className="v2-add-what">{blurb(v)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {searching ? (
        <div className="v2-add-search">
          <div className="v2-add-provider-row">
            <ProviderCombo
              id="v2-add-provider"
              label="Search by maker or vendor"
              value={pick}
              options={searchVendors(pick).map(pickerLabel)}
              placeholder="llama · gemini · a vendor's name"
              // The options ARE the search result; matching them against the
              // typed text again would hide every vendor found by a family
              // rather than by its own name, which is the point.
              filter={() => true}
              onChange={setPick}
            />
            <button
              type="button"
              disabled={picked === undefined}
              onClick={() => {
                if (picked === undefined) return;
                onAdd(picked);
                setPick('');
              }}
            >
              Add
            </button>
          </div>
          <SearchNote pick={pick} />
          <p className="muted v2-add-blank">
            Not there either?{' '}
            <button type="button" className="v2-link" onClick={onAddBlank}>
              or add a blank row
            </button>{' '}
            and give it a base URL of its own.
          </p>
        </div>
      ) : (
        <p className="muted v2-add-more">
          <button type="button" className="v2-link" onClick={() => setSearching(true)}>
            Someone else
          </button>{' '}
          — thirty more vendors, a model server on this machine, or any endpoint that speaks the OpenAI API.
        </p>
      )}
    </div>
  );
}

/** One line saying what this provider IS, in a lawyer's terms. */
function blurb(v: VendorRow): string {
  if (v.connection === 'local') return 'runs on this machine; nothing leaves it';
  if (v.connection === 'subscription') return 'your subscription';
  return `${v.company ?? v.name}, with an API key`;
}

function SearchNote({ pick }: { pick: string }): JSX.Element | null {
  const v = vendorByPickerLabel(pick);
  if (v === undefined) {
    if (pick.trim() === '') return null;
    const hits = searchVendors(pick).slice(0, 4);
    if (hits.length === 0) {
      return (
        <p className="muted v2-add-provider-note" role="note">
          Nothing matches <strong>{pick.trim()}</strong>. Try a maker or a family — <em>llama</em>, <em>gemini</em>, <em>qwen</em> — or the vendor you buy
          from.
        </p>
      );
    }
    return (
      <p className="muted v2-add-provider-note" role="note">
        {hits.map(h => `${h.label ?? h.name}${makesLine(h, pick) === null ? '' : ` (${makesLine(h, pick)})`}`).join(' · ')}
      </p>
    );
  }
  return (
    <p className="muted v2-add-provider-note" role="note">
      {v.note === undefined ? null : <>{v.note} </>}
      {v.getKey === undefined ? null : (
        <a href={v.getKey} target="_blank" rel="noreferrer">
          Get a key
        </a>
      )}
      {v.setup === undefined ? null : (
        <a href={v.setup} target="_blank" rel="noreferrer">
          How to set up {v.name}
        </a>
      )}
      {v.baseURLFields === undefined ? null : <> Fill in {v.baseURLFields.map(f => `{${f}}`).join(', ')} in the base URL.</>}
      {v.unverified === true ? <> The base URL was not verified against the vendor’s docs; check it.</> : null}
    </p>
  );
}
