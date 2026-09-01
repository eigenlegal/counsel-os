import { useEffect, useRef, useState } from 'react';
import { ApiError, fetchJson, fetchJsonWithHeaders } from '../../api/client';
import type { DocketEntry, DocketView, Health, PendingProposal, ThreadHeader, VaultOverview } from '../../api/types';
import { ProviderNotice } from '../ProviderNotice';
import { Tree } from '../../vault/Tree';
import { railLabel } from '../Rail';
import { relTime } from '../time';
import {
  dueSlot,
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

/** `Sep 12`, or `Jan 5, 2027` once the year is not this one. The date is a
 * bare `YYYY-MM-DD`, read in UTC so it prints as written everywhere. */
export function docketDate(iso: string, now: Date = new Date()): string {
  const t = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(t)) return iso;
  const d = new Date(t);
  const sameYear = d.getUTCFullYear() === now.getFullYear();
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }), timeZone: 'UTC' });
}

/** The docket head's run-in: each non-zero part, joined. */
export function docketHeadParts(deadlines: number, proposals: number): string[] {
  const parts: string[] = [];
  if (deadlines > 0) parts.push(`${deadlines} deadline${deadlines === 1 ? '' : 's'}`);
  if (proposals > 0) parts.push(`${proposals} awaiting your decision`);
  return parts;
}

/** The docket body, or nothing usable. A read that came back in another
 * shape (an older runtime without the route answers with the HTML shell,
 * a mock answers with `[]`) is treated as no deadlines, not as a crash. */
function docketOf(value: unknown): DocketView {
  const view = value as Partial<DocketView> | null;
  if (typeof view !== 'object' || view === null || !Array.isArray(view.deadlines)) return { deadlines: [], skipped: 0 };
  return { deadlines: view.deadlines, skipped: typeof view.skipped === 'number' ? view.skipped : 0 };
}

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
  /** For the swap notice above the ask box (cou-95). Absent = no notice. */
  health?: Health | null;
  onOpenThread: (id: string) => void;
}

/**
 * Home (spec §3.2): the work itself behind one ask box. Serif greeting, an
 * honest subline, the docket (hidden entirely when empty), starter
 * prompt-fills, matters by deadline-then-recency, conversations. Data:
 * `/vault/overview` + `/proposals?status=pending`, fetched on mount — the
 * shell mounts this page per visit to Home, so the docket is always current.
 */
export function HomePage({ threads, onAsk, onOpenThread, health }: HomePageProps): JSX.Element {
  const [overview, setOverview] = useState<VaultOverview | null>(null);
  const [pending, setPending] = useState<PendingProposal[]>([]);
  /** The proposal scan was bounded — there may be proposals it never saw. */
  const [truncated, setTruncated] = useState(false);
  /** The deadline sweep (`GET /docket`): dated obligations off the matters. */
  const [docket, setDocket] = useState<DocketView>({ deadlines: [], skipped: 0 });
  /** The "later" group unfolds in place; it starts folded. */
  const [laterOpen, setLaterOpen] = useState(false);
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [docketError, setDocketError] = useState<string | null>(null);
  const [deadlinesError, setDeadlinesError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [attached, setAttached] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);
  const box = useRef<HTMLTextAreaElement | null>(null);

  /**
   * The three reads settle INDEPENDENTLY. They answer different questions
   * and one failing says nothing about the others: a docket that cannot be
   * read must not blank the matters column (which would then assert an
   * empty vault), a vault that cannot be read must not take a founder gate
   * off the page, and a deadline sweep that fails must not hide the
   * proposals that did load.
   */
  useEffect(() => {
    void (async () => {
      const [ov, proposals, sweep] = await Promise.allSettled([
        fetchJson<VaultOverview>('/vault/overview'),
        fetchJsonWithHeaders<PendingProposal[]>('/proposals?status=pending'),
        fetchJson<unknown>('/docket'),
      ]);
      if (ov.status === 'fulfilled') setOverview(ov.value);
      else setVaultError(failureNote(ov.reason, 'could not read the vault'));
      if (proposals.status === 'fulfilled') {
        setPending(proposals.value.body);
        setTruncated(proposals.value.headers.get(TRUNCATED_HEADER) !== null);
      } else {
        setDocketError(failureNote(proposals.reason, 'could not read the docket'));
      }
      if (sweep.status === 'fulfilled') setDocket(docketOf(sweep.value));
      else setDeadlinesError(failureNote(sweep.reason, 'could not read the deadlines'));
    })();
  }, []);

  const overdueOrSoon = docket.deadlines.filter(d => d.status !== 'later');
  const later = docket.deadlines.filter(d => d.status === 'later');
  const headParts = docketHeadParts(docket.deadlines.length, pending.length);
  const bothGroups = docket.deadlines.length > 0 && pending.length > 0;

  const deadlineRow = (entry: DocketEntry): JSX.Element => (
    <div className="v2-docket-row v2-dl" key={`${entry.matter.path}|${entry.date}|${entry.action}`}>
      <span className={entry.status === 'overdue' ? 'v2-dl-date v2-due-hot' : 'v2-dl-date'}>{docketDate(entry.date)}</span>
      <span className="v2-dl-action" title={entry.source === undefined ? undefined : entry.source}>
        {entry.action === '' ? 'deadline' : entry.action}
      </span>
      <span className="leader" aria-hidden="true" />
      <a className="v2-dl-matter" href={`#/vault?path=${encodeURIComponent(entry.matter.path)}`}>
        {entry.matter.title}
      </a>
    </div>
  );

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

        <ProviderNotice health={health} />
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
        {deadlinesError === null ? null : (
          <p className="v2-notice v2-notice-error v2-docket-error" role="alert">
            {deadlinesError}
          </p>
        )}

        {/* ONE docket: the dated obligations off the matter files, then the
            proposals awaiting the founder's decision. Hidden when both are
            empty. */}
        {headParts.length === 0 ? null : (
          <section className="v2-docket" aria-label="Docket">
            <div className="v2-docket-head runin">
              Docket
              {headParts.map(part => (
                <span key={part}>
                  {' · '}
                  <em>{part}</em>
                </span>
              ))}
            </div>

            {docket.deadlines.length === 0 ? null : (
              <div className="v2-dl-group">
                {bothGroups ? <div className="v2-docket-sub">Deadlines</div> : null}
                {overdueOrSoon.map(deadlineRow)}
                {later.length === 0 ? null : laterOpen ? (
                  later.map(deadlineRow)
                ) : (
                  <button type="button" className="v2-link v2-dl-later" aria-expanded={false} onClick={() => setLaterOpen(true)}>
                    {later.length} later →
                  </button>
                )}
                {docket.skipped === 0 ? null : (
                  <p className="v2-docket-note">
                    {docket.skipped} deadline{docket.skipped === 1 ? '' : 's'} could not be read — the date is not YYYY-MM-DD.
                  </p>
                )}
              </div>
            )}

            {bothGroups ? <div className="v2-docket-sub">Awaiting your decision</div> : null}
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
                  const slot = dueSlot(matter.frontmatter);
                  const next = nextActionOf(matter.frontmatter);
                  return (
                    <div className="v2-matter" key={matter.path}>
                      <div className="v2-matter-top">
                        <a className="v2-matter-name" href={`#/vault?path=${encodeURIComponent(matter.path)}`}>
                          {matter.title}
                        </a>
                        {slot === null ? null : (
                          <>
                            <span className="leader" aria-hidden="true" />
                            <span className={slot.hot ? 'v2-due v2-due-hot' : 'v2-due'}>{slot.text}</span>
                          </>
                        )}
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
