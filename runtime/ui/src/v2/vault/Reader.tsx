import { useEffect, useMemo, useState } from 'react';
import { ApiError, fetchJson } from '../../api/client';
import type { VaultFile } from '../../api/types';
import { isMarkdown, renderMarkdown } from '../../vault/markdown';
import { relTime } from '../time';
import { readerModel } from './frontmatter';
import { outlineOf } from './outline';

/** Moved from FileView (which this component supersedes): a missing file is
 * a state, not a failure — "open in vault" on an unapproved proposal is the
 * likeliest click on the page. */
export const MISSING_FILE_NOTE = 'This file does not exist yet — approving a proposal that names it creates it.';

/**
 * Moved verbatim from FileView: the same message with no absolute host path
 * in it.
 *
 * `GET /vault/read` fails with Node's own `ENOENT: … open '/Users/…/nda.md'`,
 * which tells the reader where the server's disk is and nothing they can act
 * on. Only a path that STARTS with `/` (at the message start or after a space
 * or a quote/bracket) is a host path; a vault-relative
 * `practice/standards/nda.md` has slashes inside it and comes through
 * untouched.
 */
export function withoutHostPaths(message: string): string {
  return message.replace(/(^|[\s'"(\[])(\/(?:[^\s'"()\[\]]+\/)+[^\s'"()\[\]]*)/g, (_m, lead: string, path: string) =>
    lead +
    path
      .split('/')
      .filter(segment => segment !== '')
      .slice(-2)
      .join('/'),
  );
}

export interface ReaderProps {
  path: string;
  /** The H2 outline column — on for the vault page's wide pane, off in the
   * 420px drawer (spec §3.4). */
  outline?: boolean;
  /** Renders the sticky "Ask counsel about this file ↵" bar. */
  onAsk?: (path: string) => void;
}

/**
 * The reading pane (spec §3.4): mono crumbs, serif H1 (the doc's title, not
 * the filename), `updated <ago> · version <7>`, frontmatter as dotted-leader
 * rows, markdown at a ~68ch serif measure, an H2 outline on wide viewports,
 * and the sticky ask bar. Read-only, like the FileView it replaces; the
 * markdown still flows through `renderMarkdown` — the one HTML sink.
 */
export function Reader({ path, outline = false, onAsk }: ReaderProps): JSX.Element {
  const [file, setFile] = useState<VaultFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [current, setCurrent] = useState(0);

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
        if (err instanceof ApiError && err.status === 404) setMissing(true);
        else setError(withoutHostPaths(err instanceof Error ? err.message : String(err)));
      }
    })();
    return () => {
      live = false;
    };
  }, [path]);

  const model = useMemo(() => (file === null ? null : readerModel(file.content, path)), [file, path]);
  const sections = useMemo(() => (model === null || !outline ? [] : outlineOf(model.body)), [model, outline]);
  const html = useMemo(() => (model === null || !isMarkdown(path) ? null : renderMarkdown(model.body)), [model, path]);

  // Which H2 the reader is at, for the outline highlight. Guarded: happy-dom
  // has no IntersectionObserver, and the highlight is a nicety, not layout.
  useEffect(() => {
    setCurrent(0);
    if (sections.length === 0 || typeof IntersectionObserver === 'undefined') return;
    const headings = Array.from(document.querySelectorAll('.v2-doc-md h2'));
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) setCurrent(headings.indexOf(entry.target));
        }
      },
      { rootMargin: '0px 0px -70% 0px' },
    );
    for (const heading of headings) observer.observe(heading);
    return () => observer.disconnect();
  }, [sections, html]);

  const crumbs = path.split('/').filter(s => s !== '');

  return (
    <article className="v2-doc">
      <nav className="v2-doc-crumbs" aria-label="Breadcrumb">
        {crumbs.map((part, i) => (
          <span key={`${i}-${part}`}>
            {i > 0 ? ' / ' : ''}
            {i === crumbs.length - 1 ? <b>{part}</b> : part}
          </span>
        ))}
      </nav>

      {error !== null ? (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      ) : missing ? (
        <p className="muted v2-doc-missing" role="status">
          {MISSING_FILE_NOTE}
        </p>
      ) : file === null || model === null ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          <header className="v2-doc-head">
            <h1>{model.title}</h1>
            <span className="v2-doc-meta">
              {[
                file.mtimeMs === undefined || file.mtimeMs === null ? null : `updated ${relTime(file.mtimeMs)}`,
                file.version === null ? null : `version ${file.version.slice(0, 7)}`,
              ]
                .filter(part => part !== null)
                .join(' · ')}
            </span>
          </header>

          {model.rows.length === 0 ? null : (
            <dl className="v2-fm">
              {model.rows.map(row => (
                <div className="v2-fm-row" key={row.key}>
                  <dt>{row.key}</dt>
                  <span className="leader" aria-hidden="true" />
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {/* Before the body on purpose: the outline is a right float, and a
              float only sits beside the text that FOLLOWS it. */}
          {sections.length === 0 ? null : (
            <aside className="v2-outline" aria-label="Outline">
              {sections.map((section, i) => (
                <div key={section} className={i === current ? 'on' : undefined}>
                  {section}
                </div>
              ))}
            </aside>
          )}

          {html !== null ? (
            // Sanitized by `renderMarkdown` — the app's only HTML sink.
            <div className="markdown v2-doc-md" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <pre className="vault-raw">{file.content}</pre>
          )}

          {onAsk === undefined ? null : (
            <div className="v2-askbar">
              <button type="button" onClick={() => onAsk(path)}>
                Ask counsel about this file <b>↵</b>
              </button>
            </div>
          )}
        </>
      )}
    </article>
  );
}
