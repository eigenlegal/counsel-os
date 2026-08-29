import { useEffect, useState } from 'react';
import { ApiError, fetchJson } from '../api/client';
import type { VaultFile } from '../api/types';
import { isMarkdown, renderMarkdown } from './markdown';

export interface FileViewProps {
  path: string;
}

/**
 * One vault file, read-only.
 *
 * Read-only is the whole design (spec §2): the only write path in the UI is
 * approving a proposal, so this surface has no editor and no save. What it
 * shows besides the content is the `version` — the hash a proposal's
 * `expectedVersion` is checked against, and therefore the number that
 * explains a 409 on the chat surface.
 */
export function FileView({ path }: FileViewProps): JSX.Element {
  const [file, setFile] = useState<VaultFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setFile(null);
    setError(null);
    void (async () => {
      try {
        const read = await fetchJson<VaultFile>(`/vault/read?path=${encodeURIComponent(path)}`);
        // A click on a second file while the first is in flight must not
        // paint the first one's contents under the second one's name.
        if (live) setFile(read);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return;
        if (live) setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      live = false;
    };
  }, [path]);

  return (
    <article className="vault-file-view">
      <header className="vault-file-head">
        <code className="vault-file-path">{path}</code>
        {file === null ? null : <span className="vault-version">version {file.version}</span>}
      </header>

      {error !== null ? (
        <p className="notice notice-error" role="alert">
          {error}
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
