import { useEffect, useState } from 'react';
import { ApiError, fetchJson } from '../../api/client';
import type { ContentApplyResult, ContentItem, ContentStatus } from '../../api/types';

/**
 * Settings › Content (spec 2026-09-01 §6): what the vault received against
 * what this runtime ships. Law updates apply from here; a file the user
 * changed is named and left alone; a practice seed that moved upstream
 * shows its diff for a merge by hand. Set text and ledger rows, no pills.
 */

function detail(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** The status word a row shows, and the tone it is set in. */
export function stateOf(item: ContentItem): { word: string; tone: 'update' | 'new' | 'merge' | 'quiet' } {
  switch (item.status) {
    case 'update-available':
      return { word: 'update available', tone: 'update' };
    case 'missing':
      return { word: 'new — can be added', tone: 'new' };
    case 'upstream-changed':
      return { word: item.baseline === 'vault' ? 'changed — compare with your copy' : 'changed upstream — merge by hand', tone: 'merge' };
    case 'user-modified':
      return {
        word:
          item.reason === 'managed-by'
            ? 'yours (managed-by: user) — left alone'
            : item.reason === 'law-management'
              ? 'yours (law_management: user) — left alone'
              : item.reason === 'no-baseline'
                ? 'differs from shipped — no record of what you received, left alone'
                : 'yours — edited, left alone',
        tone: 'quiet',
      };
    case 'vault-only':
      return { word: 'yours — not shipped', tone: 'quiet' };
    default:
      return { word: 'current', tone: 'quiet' };
  }
}

/** The one-line summary under the versions. */
export function summaryOf(status: ContentStatus): string {
  const updates = status.counts['update-available'];
  const adds = status.counts.missing;
  const merges = status.counts['upstream-changed'];
  const parts: string[] = [];
  if (updates > 0) parts.push(`${updates} law file${updates === 1 ? '' : 's'} ${updates === 1 ? 'has' : 'have'} updates`);
  if (adds > 0) parts.push(`${adds} new file${adds === 1 ? '' : 's'} can be added`);
  if (merges > 0) parts.push(`${merges} practice seed${merges === 1 ? '' : 's'} changed upstream`);
  return parts.length === 0 ? 'Everything is current.' : parts.join(' · ');
}

export function ContentGroup(): JSX.Element {
  const [status, setStatus] = useState<ContentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [shown, setShown] = useState<ReadonlySet<string>>(new Set());
  const [note, setNote] = useState<string | null>(null);

  const load = async (): Promise<void> => {
    try {
      setStatus(await fetchJson<ContentStatus>('/content/status'));
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setError(detail(err));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const apply = async (paths: string[], label: string): Promise<void> => {
    setBusy(label);
    setNote(null);
    setError(null);
    try {
      const result = await fetchJson<ContentApplyResult>('/content/apply', { method: 'POST', body: JSON.stringify({ paths }) });
      setNote(`Applied ${result.applied.length} file${result.applied.length === 1 ? '' : 's'}.`);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setError(detail(err));
    } finally {
      setBusy(null);
    }
  };

  const toggleDiff = (path: string): void => {
    setShown(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const interesting = status === null ? [] : status.items.filter(item => item.status !== 'current');
  const applicable = status === null ? [] : status.items.filter(item => item.applicable).map(item => item.path);

  return (
    <section className="v2-group" aria-label="Content">
      <h2>Content</h2>
      <p className="muted">
        The law areas and practice seed this runtime ships, against what your vault has. Law is kept current for you unless you changed a file; your practice files are never overwritten — an upstream change shows its diff for you to merge.
      </p>
      {error !== null ? (
        <p className="v2-notice v2-notice-error" role="alert">
          {error}
        </p>
      ) : null}
      {status === null && error === null ? (
        <p className="muted">Loading…</p>
      ) : status === null ? null : (
        <>
          <div className="v2-content-summary">
            <span className="v2-content-line">
              Shipped <b>{status.shippedVersion}</b> · vault received <b>{status.vaultVersion ?? 'unknown'}</b>
              {status.lawManagement === 'user' ? ' · law_management: user — law is yours' : ''}
              {status.autoApplyLawUpdates ? ' · law updates apply at start' : ''}
            </span>
          </div>
          <div className="v2-content-summary">
            <span className="v2-content-line" role="status">
              {summaryOf(status)}
            </span>
            {interesting.length === 0 ? null : (
              <button type="button" className="v2-link" aria-expanded={open} onClick={() => setOpen(o => !o)}>
                {open ? 'hide' : 'review'}
              </button>
            )}
            {applicable.length > 0 ? (
              <button type="button" className="v2-link" disabled={busy !== null} onClick={() => void apply(applicable, 'all')}>
                {busy === 'all' ? 'applying…' : `apply all updates (${applicable.length})`}
              </button>
            ) : null}
          </div>
          {note === null ? null : (
            <p className="v2-notice v2-notice-ok" role="note">
              {note}
            </p>
          )}
          {open && interesting.length > 0 ? (
            <div role="list" aria-label="Content changes">
              {interesting.map(item => {
                const state = stateOf(item);
                return (
                  <div key={item.path} role="listitem">
                    <div className="v2-content-row">
                      <span className="v2-content-path" title={item.shipped ?? item.path}>
                        {item.path}
                      </span>
                      <span className="leader" aria-hidden="true" />
                      <span className={`v2-content-state v2-content-state-${state.tone}`}>{state.word}</span>
                      <span className="v2-content-acts">
                        {item.applicable ? (
                          <button type="button" className="v2-link" disabled={busy !== null} onClick={() => void apply([item.path], item.path)}>
                            {busy === item.path ? 'applying…' : item.status === 'missing' ? 'add' : 'apply'}
                          </button>
                        ) : null}
                        {item.diff !== undefined ? (
                          <button type="button" className="v2-link" aria-expanded={shown.has(item.path)} onClick={() => toggleDiff(item.path)}>
                            {shown.has(item.path) ? 'hide diff' : 'show diff'}
                          </button>
                        ) : null}
                      </span>
                    </div>
                    {item.diff !== undefined && shown.has(item.path) ? <pre className="v2-content-diff">{item.diff}</pre> : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
