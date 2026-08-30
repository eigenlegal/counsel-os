import { useEffect, useState } from 'react';
import { ApiError, fetchJson } from '../api/client';
import type { VaultFile } from '../api/types';
import { isMarkdown, renderMarkdown } from './markdown';

export interface FileViewProps {
  path: string;
  /**
   * What to say when the file is not there. Given one, a 404 stops being an
   * error: a proposal that has not been approved yet names a path nothing
   * has written, and "open in vault" on that card is the likeliest click on
   * the page. Without it the read error reads as it always has, so v1 is
   * unchanged.
   */
  missingNote?: string;
}

/**
 * The same message with no absolute host path in it.
 *
 * `GET /vault/read` fails with Node's own `ENOENT: … open '/Users/…/nda.md'`,
 * which tells the reader where the server's disk is and nothing they can
 * act on. Trimming it at the source is a runtime job; until then the page
 * keeps the last two segments — enough to recognize the file — and drops
 * the rest.
 */
export function withoutHostPaths(message: string): string {
  return message.replace(/\/(?:[^\s'"()]+\/)+[^\s'"()]*/g, match =>
    match
      .split('/')
      .filter(segment => segment !== '')
      .slice(-2)
      .join('/'),
  );
}

/**
 * One vault file, read-only.
 *
 * Read-only is the whole design (spec §2): the only write path in the UI is
 * approving a proposal, so this surface has no editor and no save. What it
 * shows besides the content is the `version` — the hash a proposal's
 * `expectedVersion` is checked against, and therefore the number that
 * explains a 409 on the chat surface. The server sends `null` for it if the
 * file vanished between the read and the hash, and then there is no hash to
 * show.
 */
export function FileView({ path, missingNote }: FileViewProps): JSX.Element {
  const [file, setFile] = useState<VaultFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let live = true;
    setFile(null);
    setError(null);
    setMissing(false);
    void (async () => {
      try {
        const read = await fetchJson<VaultFile>(`/vault/read?path=${encodeURIComponent(path)}`);
        // A click on a second file while the first is in flight must not
        // paint the first one's contents under the second one's name.
        if (live) setFile(read);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return;
        if (!live) return;
        if (missingNote !== undefined && err instanceof ApiError && err.status === 404) setMissing(true);
        else setError(withoutHostPaths(err instanceof Error ? err.message : String(err)));
      }
    })();
    return () => {
      live = false;
    };
  }, [path, missingNote]);

  return (
    <article className="vault-file-view">
      <header className="vault-file-head">
        <code className="vault-file-path">{path}</code>
        {file === null || file.version === null ? null : <span className="vault-version">version {file.version}</span>}
      </header>

      {error !== null ? (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      ) : missing ? (
        // Not an error: nothing has written this path yet. Muted, and a
        // `status` rather than an `alert`, because there is nothing wrong.
        <p className="muted vault-file-missing" role="status">
          {missingNote}
        </p>
      ) : file === null ? (
        <p className="muted">Loading…</p>
      ) : isMarkdown(path) ? (
        // Sanitized by `renderMarkdown`, which is the only caller of
        // `marked` in the app — see `vault/sanitize.ts` for what survives.
        <div className="markdown" dangerouslySetInnerHTML={{ __html: renderMarkdown(file.content) }} />
      ) : (
        <pre className="vault-raw">{file.content}</pre>
      )}
    </article>
  );
}
