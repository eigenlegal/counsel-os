import { useEffect, useRef, useState } from 'react';
import { ApiError, fetchJson, fetchJsonWithHeaders } from '../../api/client';
import type { PendingProposal, ThreadHeader, VaultOverview } from '../../api/types';
import { Tree } from '../../vault/Tree';
import { railLabel } from '../Rail';
import { relTime } from '../time';
import {
  dueLabel,
  greetingFor,
  nextActionOf,
  sortMatters,
  starterFill,
  STARTERS,
  sublineFor,
  withAttachments,
} from './home';

/** `runtime/src/server/routes.ts`'s `TRUNCATED_HEADER`: set when the docket
 * scan stopped short of the vault's threads (`DEFAULT_SCAN_LIMIT`). */
const TRUNCATED_HEADER = 'x-counsel-truncated';

/** How many matters home shows before handing off to the vault. The overview
 * itself caps at 200 ("a recent docket, not an archive"); a 200-row column
 * under the ask box is an archive. */
const MAX_MATTERS = 8;

/** A read that failed, said plainly. A 401 is the shell's message to give,
 * not this page's, so it is silent here. */
function failureNote(err: unknown, what: string): string | null {
  if (err instanceof ApiError && err.status === 401) return null;
  return `${what}: ${err instanceof Error ? err.message : String(err)}`;
}

export interface HomePageProps {
  /** The shell's thread list — home does not refetch what the rail has. */
  threads: ThreadHeader[];
  /**
   * The ask box: hand the message to the shell, which opens a draft chat and
   * sends it (the thread's title comes from the first line, as every send's
   * does).
   */
  onAsk: (message: string) => void;
  onOpenThread: (id: string) => void;
}

/**
 * Home (spec §3.2): the work itself behind one ask box. Serif greeting, an
 * honest subline, the docket (hidden entirely when empty), starter
 * prompt-fills, matters by deadline-then-recency, conversations. Data:
 * `/vault/overview` + `/proposals?status=pending`, fetched on mount — the
 * shell mounts this page per visit to Home, so the docket is always current.
 */
export function HomePage({ threads, onAsk, onOpenThread }: HomePageProps): JSX.Element {
  const [overview, setOverview] = useState<VaultOverview | null>(null);
  const [pending, setPending] = useState<PendingProposal[]>([]);
  /** The docket scan was bounded — there may be proposals it never saw. */
  const [truncated, setTruncated] = useState(false);
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [docketError, setDocketError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [attached, setAttached] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);
  const box = useRef<HTMLTextAreaElement | null>(null);

  /**
   * The two reads settle INDEPENDENTLY. They answer different questions and
   * one failing says nothing about the other: a docket that cannot be read
   * must not blank the matters column (which would then assert an empty
   * vault), and a vault that cannot be read must not take a founder gate off
   * the page.
   */
  useEffect(() => {
    void (async () => {
      const [ov, docket] = await Promise.allSettled([
        fetchJson<VaultOverview>('/vault/overview'),
        fetchJsonWithHeaders<PendingProposal[]>('/proposals?status=pending'),
      ]);
      if (ov.status === 'fulfilled') setOverview(ov.value);
      else setVaultError(failureNote(ov.reason, 'could not read the vault'));
      if (docket.status === 'fulfilled') {
        setPending(docket.value.body);
        setTruncated(docket.value.headers.get(TRUNCATED_HEADER) !== null);
      } else {
        setDocketError(failureNote(docket.reason, 'could not read the docket'));
      }
    })();
  }, []);

  const matters = overview === null ? [] : sortMatters(overview.matters);
  const nextActions = matters.filter(m => nextActionOf(m.frontmatter) !== null).length;
  const subline = sublineFor({ nextActions, pending: pending.length });
  const message = withAttachments(text, attached);
  /** A vault with nothing in it AND nothing asked of it yet — the one state
   * that gets the getting-started block instead of the grid. A reader who
   * has conversations keeps them, whatever the vault holds. */
  const fresh = overview !== null && vaultError === null && matters.length === 0 && threads.length === 0;
  /** The vault read has answered, one way or the other. Until then the
   * lower region stays empty: painting the grid first would flash its
   * "No matters yet." / "No conversations yet." placeholders over a fresh
   * vault that is about to get the single getting-started block. */
  const settled = overview !== null || vaultError !== null;

  const ask = (): void => {
    if (message === '') return;
    onAsk(message);
    setText('');
    setAttached([]);
    setPicking(false);
  };

  return (
    <main className="v2-page v2-home" aria-label="Home">
      <div className="v2-home-wrap">
        <div className="v2-hi">{greetingFor()}</div>
        {subline === null ? null : <div className="v2-sub">{subline}</div>}

        <div className="v2-ask">
          <textarea
            ref={box}
            aria-label="Ask counsel"
            rows={2}
            placeholder="Ask counsel — review a contract, research a position, draft a response…"
            value={text}
            onChange={event => setText(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                ask();
              }
            }}
          />
          <div className="v2-ask-row">
            <button type="button" className="v2-ask-chip" aria-expanded={picking} onClick={() => setPicking(p => !p)}>
              ＋ attach from vault
            </button>
            {attached.map(path => (
              <button
                type="button"
                key={path}
                className="v2-ask-chip v2-ask-attached"
                aria-label={`Remove ${path}`}
                onClick={() => setAttached(current => current.filter(p => p !== path))}
              >
                {path}
              </button>
            ))}
            <button type="button" className="v2-ask-go" onClick={ask} disabled={message === ''}>
              Ask
            </button>
          </div>
          {picking ? (
            <div className="v2-ask-picker">
              <Tree
                selected={null}
                onSelect={path => {
                  setAttached(current => (current.includes(path) ? current : [...current, path]));
                  setPicking(false);
                }}
              />
            </div>
          ) : null}
        </div>

        {docketError === null ? null : (
          <p className="v2-notice v2-notice-error v2-docket-error" role="alert">
            {docketError}
          </p>
        )}

        {pending.length === 0 ? null : (
          <section className="v2-docket" aria-label="Docket">
            <div className="v2-docket-head runin">
              Docket · <em>{pending.length} awaiting your decision</em>
            </div>
            {pending.map(proposal => (
              <div className="v2-docket-row" key={proposal.id}>
                <div>
                  <div className="v2-docket-what">{proposal.rationale.split('\n')[0]}</div>
                  <div className="v2-docket-path">
                    {proposal.path} · proposed {relTime(proposal.at)} in “{proposal.threadTitle}”
                  </div>
                </div>
                <button
                  type="button"
                  className="v2-docket-go"
                  onClick={() => {
                    globalThis.location.hash = `#/chat?thread=${encodeURIComponent(proposal.threadId)}&proposal=${encodeURIComponent(proposal.id)}`;
                  }}
                >
                  Review
                </button>
              </div>
            ))}
            {truncated ? (
              <p className="v2-docket-note">
                Older conversations were not scanned — some proposals may not be shown.
              </p>
            ) : null}
          </section>
        )}

        <div className="v2-starters">
          {STARTERS.map(label => (
            <button
              key={label}
              type="button"
              onClick={() => {
                setText(starterFill(label));
                box.current?.focus();
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {!settled ? null : fresh ? (
          <div className="v2-getting-started rule-double">
            <p>Your vault has no matters yet — counsel files what it learns as you work.</p>
            <p>Ask a question above, or attach a contract from the vault to review.</p>
            <p>
              <a href="https://github.com/eigenlegal/counsel-os#readme">Getting-started docs →</a>
            </p>
          </div>
        ) : (
          <div className="v2-home-cols">
            <section className="v2-home-card" aria-label="Matters">
              <h3 className="runin">
                Matters
                <a href="#/vault">open vault →</a>
              </h3>
              {vaultError !== null ? (
                <p className="v2-notice v2-notice-error" role="alert">
                  {vaultError}
                </p>
              ) : matters.length === 0 ? (
                <p className="muted">No matters yet.</p>
              ) : (
                matters.slice(0, MAX_MATTERS).map(matter => {
                  const due = dueLabel(matter.frontmatter);
                  const next = nextActionOf(matter.frontmatter);
                  return (
                    <div className="v2-matter" key={matter.path}>
                      <div className="v2-matter-top">
                        <a className="v2-matter-name" href={`#/vault?path=${encodeURIComponent(matter.path)}`}>
                          {matter.title}
                        </a>
                        <span className="leader" aria-hidden="true" />
                        <span className={due.hot ? 'v2-due v2-due-hot' : 'v2-due'}>{due.text}</span>
                      </div>
                      <div className="v2-na">
                        {next === null ? null : (
                          <>
                            next: <b>{next}</b> ·{' '}
                          </>
                        )}
                        touched {relTime(matter.mtimeMs)}
                      </div>
                    </div>
                  );
                })
              )}
              {matters.length > MAX_MATTERS ? (
                <p className="muted">
                  <a href="#/vault">{matters.length - MAX_MATTERS} more in the vault →</a>
                </p>
              ) : null}
            </section>
            <section className="v2-home-card" aria-label="Conversations">
              <h3 className="runin">Conversations</h3>
              {threads.length === 0 ? (
                <p className="muted">No conversations yet.</p>
              ) : (
                threads.map(thread => (
                  <button type="button" className="v2-convo" key={thread.id} onClick={() => onOpenThread(thread.id)}>
                    <span className="v2-convo-title">{railLabel(thread)}</span>
                    <span className="leader" aria-hidden="true" />
                    <span className="v2-convo-when">{relTime(thread.updatedAt)}</span>
                  </button>
                ))
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
