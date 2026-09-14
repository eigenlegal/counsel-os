import { useState } from 'react';
import { downloadOriginal, type SourceRevision } from './api';
import { ErrorNotice } from './components';

export function ExtractionInfo({ revision }: { revision: SourceRevision }): JSX.Element | null {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  if (!revision.extraction && !revision.original) return null;
  async function download() {
    setBusy(true);
    setError('');
    try {
      await downloadOriginal(revision.id, revision.original!.name);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="extraction-info">
      {revision.original && (
        <button className="button" disabled={busy} onClick={() => void download()}>
          {busy ? 'Preparing…' : 'Download original'}
        </button>
      )}
      {revision.extraction && (
        <details open={revision.textStatus !== 'ready' && !revision.extraction.image}>
          <summary>
            {revision.extraction.image ? 'About this image' : 'About this extraction'}
            {revision.extraction.pages ? ` · ${revision.extraction.pages} pages` : ''}
          </summary>
          <ul>
            {revision.extraction.notes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
          <p className="fine-print">
            {revision.extraction.image ? 'Image bytes are retained unchanged. Visual interpretation is not exact-text verification.' : `Parser: ${revision.extraction.parser}. Citations point to this saved text version.`}
          </p>
        </details>
      )}
      {error && <ErrorNotice message={error} />}
    </section>
  );
}
