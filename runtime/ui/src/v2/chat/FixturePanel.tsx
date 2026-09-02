/**
 * "Make this a fixture" — the review screen (routing-and-evals spec §8).
 *
 * A review the lawyer just read becomes a fixture the scoreboard runs
 * forever. Two things have to be true before it is saved, and this screen is
 * where both become true: the identifying text is gone, and the lawyer has
 * said which findings counsel was RIGHT about.
 *
 * It opens under the step it came from, never as a modal — the answer it is
 * made from stays on screen. Set text and hairlines, like the rest of the
 * record.
 */
import { useEffect, useState } from 'react';
import { ApiError, draftFixture, saveFixture } from '../../api/client';
import type { FixtureDraft, SavedFixture } from '../../api/types';

export interface FixturePanelProps {
  threadId: string;
  runId: string;
  onClose(): void;
}

/** What the lawyer said about one finding. `drop` leaves it out entirely:
 * not something to expect, and not something to penalize. */
export type Verdict = 'keep' | 'wrong' | 'drop';

const VERDICTS: { value: Verdict; label: string; title: string }[] = [
  { value: 'keep', label: 'right', title: 'counsel was right — the fixture expects this catch' },
  { value: 'wrong', label: 'wrong', title: 'counsel should not have raised this — the fixture penalizes it' },
  { value: 'drop', label: 'leave out', title: 'neither expected nor penalized' },
];

export function FixturePanel({ threadId, runId, onClose }: FixturePanelProps): JSX.Element {
  const [draft, setDraft] = useState<FixtureDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [text, setText] = useState('');
  // The prompt travels into the fixture as the step's message, so it is the
  // lawyer's to read and edit too: the anonymizer's mapping comes from the
  // document, and a name that appears only here would pass through it.
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  // Which cited practice files travel with the fixture. All of them, until
  // the lawyer says otherwise.
  const [drop, setDrop] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<SavedFixture | null>(null);
  const [clash, setClash] = useState(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const next = await draftFixture({ threadId, runId });
        if (!live) return;
        setDraft(next);
        setText(next.text);
        setMessage(next.message);
        setName(next.id);
        setDrop(new Set());
        // Every finding starts kept: counsel raised it and the lawyer read
        // it. Saying "wrong" is the deliberate act.
        setVerdicts(Object.fromEntries(next.catches.map(c => [c.id, 'keep' as Verdict])));
      } catch (err) {
        if (live) setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      live = false;
    };
  }, [threadId, runId]);

  const save = async (overwrite: boolean): Promise<void> => {
    if (draft === null) return;
    setBusy(true);
    setError(null);
    try {
      const result = await saveFixture({
        threadId,
        runId,
        keep: draft.catches.filter(c => verdicts[c.id] === 'keep').map(c => c.id),
        reject: draft.catches.filter(c => verdicts[c.id] === 'wrong').map(c => c.id),
        id: name,
        text,
        message,
        ...(drop.size === 0 ? {} : { dropKnowledge: [...drop] }),
        ...(overwrite ? { overwrite: true } : {}),
      });
      setSaved(result);
      setClash(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setClash(true);
      else setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (error !== null && draft === null) {
    return (
      <section className="v2-fixture" aria-label="Make this a fixture">
        <p className="v2-fixture-head">
          <span className="runin">make this a fixture</span>
          <button type="button" className="v2-link" onClick={onClose}>
            close
          </button>
        </p>
        <p role="alert">{error}</p>
      </section>
    );
  }

  if (draft === null) {
    return (
      <section className="v2-fixture" aria-label="Make this a fixture">
        <p className="v2-fixture-head">
          <span className="runin">make this a fixture</span>
        </p>
        <p className="v2-fixture-quiet">reading the document…</p>
      </section>
    );
  }

  if (saved !== null) {
    return (
      <section className="v2-fixture" aria-label="Make this a fixture">
        <p className="v2-fixture-head">
          <span className="runin">saved</span>
          <button type="button" className="v2-link" onClick={onClose}>
            close
          </button>
        </p>
        <p>
          {saved.path} · {saved.expected} expected · {saved.negative} penalized. It runs with the practice set from now on.
        </p>
        {saved.dropped.length === 0 ? null : (
          <p className="v2-fixture-note">
            Left out, because your edit removed what {saved.dropped.length === 1 ? 'it was' : 'they were'} about: {saved.dropped.join('; ')}.
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="v2-fixture" aria-label="Make this a fixture">
      <p className="v2-fixture-head">
        <span className="runin">make this a fixture</span>
        <button type="button" className="v2-link" onClick={onClose}>
          close
        </button>
      </p>
      <p className="v2-fixture-quiet">
        {draft.documentPath ?? 'this document'} · {draft.replacements.length} replaced · {draft.catches.length} finding
        {draft.catches.length === 1 ? '' : 's'}
        {draft.knowledge.length === 0
          ? null
          : ` · ${draft.knowledge.length} practice ${draft.knowledge.length === 1 ? 'file travels' : 'files travel'} with it`}
      </p>
      {draft.notes.map(n => (
        <p key={n} className="v2-fixture-note">
          {n}
        </p>
      ))}

      <h4 className="v2-fixture-sub">what was replaced</h4>
      {draft.replacements.length === 0 ? (
        <p className="v2-fixture-quiet">nothing — read the text below closely.</p>
      ) : (
        <table className="v2-fixture-table">
          <tbody>
            {draft.replacements.map(r => (
              <tr key={r.from}>
                <th scope="row">{r.from}</th>
                <td>{r.to}</td>
                <td className="v2-fixture-quiet">
                  {r.kind} · {r.count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h4 className="v2-fixture-sub">the document, as it will be saved</h4>
      <textarea
        className="v2-fixture-text"
        aria-label="The anonymized document"
        rows={10}
        value={text}
        onChange={e => setText(e.target.value)}
      />

      <h4 className="v2-fixture-sub">what counsel was asked</h4>
      <textarea
        className="v2-fixture-text v2-fixture-message"
        aria-label="The prompt the fixture runs"
        rows={3}
        value={message}
        onChange={e => setMessage(e.target.value)}
      />

      {draft.knowledge.length === 0 ? null : (
        <>
          <h4 className="v2-fixture-sub">practice files that travel with it</h4>
          <ul className="v2-fixture-files">
            {draft.knowledge.map(k => (
              <li key={k.path} className={drop.has(k.path) ? 'v2-fixture-dropped' : undefined}>
                {k.path}{' · '}
                <button
                  type="button"
                  className="v2-link"
                  disabled={busy}
                  onClick={() =>
                    setDrop(prev => {
                      const next = new Set(prev);
                      if (next.has(k.path)) next.delete(k.path);
                      else next.add(k.path);
                      return next;
                    })
                  }
                >
                  {drop.has(k.path) ? 'put it back' : 'remove'}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <h4 className="v2-fixture-sub">what counsel found</h4>
      {draft.catches.length === 0 ? (
        <p className="v2-fixture-quiet">nothing — this fixture would expect no findings at all.</p>
      ) : (
        <ul className="v2-fixture-catches">
          {draft.catches.map(c => (
            <li key={c.id}>
              <p className="v2-fixture-catch">
                <span className="v2-fixture-sev">{c.severity}</span> {c.title}
              </p>
              {c.clause === '' ? null : <p className="v2-fixture-quote">{c.clause}</p>}
              <p className="v2-fixture-verdicts" role="group" aria-label={`Verdict on ${c.title}`}>
                {VERDICTS.map(v => (
                  <button
                    key={v.value}
                    type="button"
                    className={verdicts[c.id] === v.value ? 'v2-link v2-fixture-on' : 'v2-link'}
                    aria-pressed={verdicts[c.id] === v.value}
                    title={v.title}
                    disabled={busy}
                    onClick={() => setVerdicts(prev => ({ ...prev, [c.id]: v.value }))}
                  >
                    {v.label}
                  </button>
                ))}
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="v2-fixture-save">
        <label htmlFor={`fixture-name-${runId}`}>name</label>{' '}
        <input
          id={`fixture-name-${runId}`}
          className="v2-fixture-name"
          value={name}
          disabled={busy}
          onChange={e => {
            // The clash was about the old name; keeping the banner up would
            // offer to replace a fixture that does not exist.
            setClash(false);
            setName(e.target.value);
          }}
        />{' '}
        <button type="button" className="v2-link" disabled={busy || name.trim() === ''} onClick={() => void save(false)}>
          {busy ? 'saving…' : 'save the fixture'}
        </button>
      </p>
      {clash ? (
        <p className="v2-fixture-note" role="alert">
          A fixture named {name} is already here.{' '}
          <button type="button" className="v2-link" disabled={busy} onClick={() => void save(true)}>
            replace it
          </button>
        </p>
      ) : null}
      {error === null ? null : (
        <p className="v2-fixture-note" role="alert">
          not saved: {error}
        </p>
      )}
    </section>
  );
}
