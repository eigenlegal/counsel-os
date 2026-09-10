import { useEffect, useState } from 'react';
import {
  request,
  type EvidenceInput,
  type Knowledge,
  type Snapshot,
  type Source,
  type Work,
} from './api';
import { ErrorNotice } from './components';
import { Icon } from './icons';

export interface DraftCitation extends EvidenceInput {
  title: string;
}
interface Passage {
  title: string;
  body: string;
  target: EvidenceInput['target'];
}

export function CitationPicker({
  data,
  citations,
  onChange,
  onPending,
  disabled,
}: {
  data: Snapshot;
  citations: DraftCitation[];
  onChange: (next: DraftCitation[]) => void;
  onPending: (pending: boolean) => void;
  disabled: boolean;
}): JSX.Element {
  const [selection, setSelection] = useState('');
  const [passage, setPassage] = useState<Passage | null>(null);
  const [quote, setQuote] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    setPassage(null);
    setError('');
    if (!selection) return;
    const abort = new AbortController();
    async function load(): Promise<Passage> {
      const [kind, id] = selection.split(':');
      if (kind === 'source') {
        const source = await request<Source>(`/sources/${id}`, undefined, abort.signal);
        if (!source.latest.body) throw new Error('This source has no text to cite.');
        return {
          title: source.latest.title,
          body: source.latest.body,
          target: { kind: 'source', revisionId: source.latest.id },
        };
      }
      if (kind === 'knowledge') {
        const item = await request<Knowledge>(`/knowledge/${id}`, undefined, abort.signal);
        if (!item.active?.body) throw new Error('This practice item has no approved text to cite.');
        return {
          title: item.active.title,
          body: item.active.body,
          target: { kind: 'knowledge', revisionId: item.active.id },
        };
      }
      const work = await request<Work>(`/work/${id}`, undefined, abort.signal);
      if (!work.answer) throw new Error('This work has no saved text to cite.');
      return { title: work.title, body: work.answer, target: { kind: 'work', workId: work.id } };
    }
    load()
      .then((value) => {
        if (!abort.signal.aborted) {
          setPassage(value);
          setQuote(value.body.slice(0, 500));
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError((e as Error).message);
      });
    return () => abort.abort();
  }, [selection]);
  const choose = (value: string) => {
    setSelection(value);
    onPending(Boolean(value));
  };
  const start = passage && quote ? passage.body.indexOf(quote) : -1;
  function add() {
    if (!passage || start < 0 || citations.length >= 10) return;
    onChange([...citations, { title: passage.title, target: passage.target, quote, start }]);
    choose('');
  }
  return (
    <fieldset className="citation-picker" disabled={disabled}>
      <legend>Supporting references (optional)</legend>
      {citations.map((citation, index) => (
        <div className="draft-citation" key={index}>
          <Icon name="link" size={15} />
          <span>
            <strong>{citation.title}</strong>
            <small>
              {citation.quote.slice(0, 110)}
              {citation.quote.length > 110 ? '…' : ''}
            </small>
          </span>
          <button
            type="button"
            className="icon-button"
            aria-label={`Remove citation to ${citation.title}`}
            onClick={() => onChange(citations.filter((_, i) => i !== index))}
          >
            <Icon name="close" size={15} />
          </button>
        </div>
      ))}
      {citations.length < 10 && (
        <label>
          Cite saved text
          <select
            aria-label="Cite saved text"
            value={selection}
            onChange={(e) => choose(e.target.value)}
          >
            <option value="">Choose a reference, practice item, or prior work</option>
            <optgroup label="Sources">
              {data.sources.map((s) => (
                <option key={s.id} value={`source:${s.id}`}>
                  {s.title}
                </option>
              ))}
            </optgroup>
            <optgroup label="Approved practice">
              {data.knowledge
                .filter((k) => k.hasApprovedVersion)
                .map((k) => (
                  <option key={k.id} value={`knowledge:${k.id}`}>
                    {k.title}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Prior work">
              {data.work.map((w) => (
                <option key={w.id} value={`work:${w.id}`}>
                  {w.title}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
      )}
      {selection && (
        <div className="passage-picker">
          {error ? (
            <ErrorNotice message={error} />
          ) : passage ? (
            <>
              <details>
                <summary>Read the saved text</summary>
                <div className="passage-text">{passage.body}</div>
              </details>
              <label>
                Exact quote
                <textarea
                  aria-label="Exact quote"
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                  rows={3}
                  maxLength={100_000}
                />
              </label>
              <p className="field-help">
                {start >= 0
                  ? `Matches the saved text at character ${start}. The first matching passage is used.`
                  : 'Copy an exact passage from the saved text, including its punctuation and spacing.'}
              </p>
            </>
          ) : (
            <p className="field-help" role="status">
              Loading saved text…
            </p>
          )}
          <div className="citation-actions">
            <button type="button" className="button" onClick={() => choose('')}>
              Cancel citation
            </button>
            <button
              type="button"
              className="button button-primary"
              disabled={!passage || start < 0}
              onClick={add}
            >
              Add citation
            </button>
          </div>
        </div>
      )}
    </fieldset>
  );
}
