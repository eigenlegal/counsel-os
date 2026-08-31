import { useEffect, useRef, useState } from 'react';
import { ApiError, fetchJson } from '../../api/client';
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
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [attached, setAttached] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);
  const box = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [ov, docket] = await Promise.all([
          fetchJson<VaultOverview>('/vault/overview'),
          fetchJson<PendingProposal[]>('/proposals?status=pending'),
        ]);
        setOverview(ov);
        setPending(docket);
      } catch (err) {
        // A 401 is the shell's message to give, not this page's.
        if (!(err instanceof ApiError && err.status === 401)) setError(err instanceof Error ? err.message : String(err));
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
  const fresh = overview !== null && error === null && matters.length === 0 && threads.length === 0;

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

        {error === null ? null : (
          <p className="v2-notice v2-notice-error" role="alert">
            {error}
          </p>
        )}

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

        {fresh ? (
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
              {matters.length === 0 ? (
                <p className="muted">No matters yet.</p>
              ) : (
                matters.map(matter => {
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
