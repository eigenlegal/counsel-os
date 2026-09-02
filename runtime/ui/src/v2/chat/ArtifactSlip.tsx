import { useState } from 'react';
import { fetchBlob, saveBlob } from '../../api/client';
import type { ArtifactView } from '../../chat/turns';

export interface ArtifactSlipProps {
  artifact: ArtifactView;
  /** Opens a vault path in the drawer beside the chat. */
  onOpenFile?: (path: string) => void;
}

export function baseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/** `42 KB` / `1.2 MB`, the way the intake line sizes a file. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** `Sep 1, 2026`, from the event's timestamp; empty when there is none. */
export function slipDate(at: string | undefined): string {
  if (at === undefined) return '';
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** The one sentence under the head (spec §6): what kind of document this is. */
export function slipSentence(a: ArtifactView): string {
  if (!a.tracked) return 'An edited copy with the replacements applied silently — no revision marks.';
  return a.summary.comments > 0
    ? 'Native Word tracked changes against the source; each change carries a comment with the reason.'
    : 'Native Word tracked changes against the source.';
}

/**
 * The redlined-document slip (spec §6, mock-artifact-slip.html): the same
 * family as the proposal slip — double rule top, hairline bottom, content on
 * the page, never a card. Under the answer, above the strip.
 */
export function ArtifactSlip({ artifact, onOpenFile }: ArtifactSlipProps): JSX.Element {
  const [note, setNote] = useState<string | null>(null);
  const name = baseName(artifact.path);
  const s = artifact.summary;

  const download = async (): Promise<void> => {
    setNote(null);
    try {
      const blob = await fetchBlob(`/vault/download?path=${encodeURIComponent(artifact.path)}`);
      if (!saveBlob(blob, name)) setNote('This browser could not start the download.');
    } catch (err) {
      setNote(err instanceof Error ? err.message : String(err));
    }
  };

  const facts: JSX.Element[] = [
    <b key="changes">{plural(s.changes, 'change')}</b>,
    <b key="comments">{plural(s.comments, 'comment')}</b>,
    <span key="clauses">{plural(s.clauses, 'clause')} touched</span>,
    <span key="bytes">{formatBytes(s.bytes)}</span>,
  ];
  if (s.skipped > 0) facts.push(<span key="skipped" className="v2-artifact-skipped">{plural(s.skipped, 'edit')} skipped</span>);

  return (
    <section className="v2-artifact" data-testid={`artifact-${artifact.id}`}>
      <header className="v2-artifact-head">
        <span className="v2-tag">{artifact.tracked ? 'Redlined document' : 'Edited document'}</span>
        <code className="v2-artifact-name" title={artifact.path}>
          {name}
        </code>
        <span className="v2-status v2-status-done v2-artifact-state">ready</span>
      </header>
      <p className="v2-artifact-body">{slipSentence(artifact)}</p>
      <p className="v2-artifact-facts">
        {facts.map((fact, i) => (
          <span key={fact.key ?? i}>
            {i === 0 ? null : <span className="v2-artifact-dot">·</span>}
            {fact}
          </span>
        ))}
      </p>
      <div className="v2-artifact-acts">
        <button type="button" className="v2-artifact-download" onClick={() => void download()}>
          Download
        </button>
        {onOpenFile === undefined ? null : (
          <>
            <button type="button" className="v2-link v2-artifact-quiet" onClick={() => onOpenFile(artifact.path)}>
              Open in reader
            </button>
            {artifact.tracked ? (
              <button type="button" className="v2-link v2-artifact-quiet" onClick={() => onOpenFile(artifact.path)}>
                Show the changes
              </button>
            ) : null}
          </>
        )}
        {artifact.author === undefined ? null : (
          <span className="v2-artifact-by">
            {artifact.tracked ? 'revision marks by' : 'edited by'} {artifact.author}
            {slipDate(artifact.at) === '' ? '' : ` · ${slipDate(artifact.at)}`}
          </span>
        )}
      </div>
      {note === null ? null : (
        <p className="v2-notice v2-notice-error" role="alert">
          {note}
        </p>
      )}
    </section>
  );
}
