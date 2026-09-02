import { cleanup, render, screen, userEvent, waitFor } from '../../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { clearToken, TOKEN_KEY } from '../../api/token';
import type { RunRecord } from '../../api/types';
import { emptyAssistantTurn, type AssistantTurn } from '../../chat/turns';
import { pillFor, shortId, Strip, stripLine } from './Strip';

const turn: AssistantTurn = emptyAssistantTurn({
  runId: 'r-1',
  provider: 'fake/fake',
  status: 'done',
  text: 'Done.',
  tools: [
    { id: 'c-1', name: 'vault_read', input: { path: 'matters/acme.md' }, output: 'x', isError: false, hasResult: true },
    { id: 'c-2', name: 'vault_read', input: { path: 'matters/beta.md' }, output: 'x', isError: false, hasResult: true },
    { id: 'c-3', name: 'propose_update', input: { path: 'practice/x.md' }, output: 'ok', isError: false, hasResult: true },
  ],
  proposals: [{ id: 'p-1', path: 'practice/x.md', rationale: 'r', status: 'pending' }],
});

const run: RunRecord = {
  runId: 'r-1',
  threadId: 't-1',
  tenant: 'default',
  startedAt: '2026-08-29T10:00:00.000Z',
  status: 'done',
  message: 'q',
  provider: 'fake/fake',
  primitivesRead: ['evaluate'],
  toolCalls: [
    { name: 'vault_read', ms: 18, isError: false },
    { name: 'vault_read', ms: 9, isError: false },
    { name: 'propose_update', ms: 3, isError: false },
  ],
  proposals: ['p-1'],
  usage: { inputTokens: 120, outputTokens: 40 },
  costUsd: 0.0012,
  durationMs: 1640,
};

const realFetch = globalThis.fetch;
let posts: { url: string; method: string; body: unknown }[] = [];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function install(answer: (url: string, body: Record<string, unknown>) => Response): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = init?.body === undefined ? {} : (JSON.parse(String(init.body)) as Record<string, unknown>);
    posts.push({ url, method: init?.method ?? 'GET', body });
    return answer(url, body);
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  posts = [];
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  clearToken();
  sessionStorage.clear();
});

describe('pillFor', () => {
  test('the run record wins; a turn alone reads its own status', () => {
    expect(pillFor(turn, run)).toEqual({ kind: 'done', label: 'done' });
    expect(pillFor(turn, { ...run, status: 'timeout' })).toEqual({ kind: 'timeout', label: 'timed out' });
    expect(pillFor({ ...turn, status: 'error' })).toEqual({ kind: 'error', label: 'error' });
    expect(pillFor({ ...turn, status: 'streaming' })).toEqual({ kind: 'running', label: 'running' });
  });

  test('an abandoned run reads as disconnected, and says what that means', () => {
    // The record on disk stays `abandoned`. "Abandoned" reads as though
    // somebody gave up on the question; what happened is that the page went
    // away mid-step, and the answer may well be waiting on a reload.
    expect(pillFor(turn, { ...run, status: 'abandoned' })).toEqual({
      kind: 'abandoned',
      label: 'disconnected',
      title: 'the page disconnected mid-step; the answer may still have completed',
    });

    render(<Strip turn={turn} run={{ ...run, status: 'abandoned' }} ms={{}} />);
    const pill = document.querySelector('summary .v2-pill');
    // Set in small caps on the line, so the word itself is uppercase.
    expect(pill?.textContent).toBe('DISCONNECTED');
    expect(pill?.getAttribute('title')).toBe('the page disconnected mid-step; the answer may still have completed');
    // The class still carries the status the runtime recorded, so the
    // styling — and anything reading the DOM — sees the real thing.
    expect(pill?.className).toBe('v2-pill v2-pill-abandoned v2-strip-status');
  });
});

describe('Strip', () => {
  test('collapsed: one hairline line — status, what it consulted, details', () => {
    render(<Strip turn={turn} run={run} ms={{}} />);
    expect(document.querySelector('summary .v2-pill')?.textContent).toBe('DONE');
    expect(screen.getByText('2 sources · 1 proposal pending')).toBeTruthy();
    // An SVG chevron from icons.tsx, not a `⌄` glyph (cou-82).
    expect(document.querySelector('summary .v2-chevron')?.textContent?.trim()).toBe('details');
    expect(document.querySelector('summary .v2-chevron svg.v2-chev-svg')).toBeTruthy();
    // The model, the duration and the tokens are NOT on the line any more —
    // they belong to the record, one click down.
    expect(document.querySelector('summary')?.textContent).not.toContain('fake/fake');
    expect(document.querySelector('summary')?.textContent).not.toContain('1.6 s');
    expect(document.querySelector('summary')?.textContent).not.toContain('120 in');
  });

  test('the record holds the model, the duration and the tokens', async () => {
    render(<Strip turn={turn} run={run} ms={{}} />);
    await userEvent.click(document.querySelector('summary') as HTMLElement);
    const record = document.querySelector('.v2-record') as HTMLElement;
    expect(record.textContent).toContain('fake/fake');
    expect(record.textContent).toContain('1.6 s');
    expect(record.textContent).toContain('120 in / 40 out');
  });

  test('a run with no provider still names the model row, and says there was none', async () => {
    render(<Strip turn={{ ...turn, provider: undefined }} run={{ ...run, provider: '' }} ms={{}} />);
    await userEvent.click(document.querySelector('summary') as HTMLElement);
    expect(screen.getByText('no provider')).toBeTruthy();
  });

  test('stripLine counts sources and pending proposals, and says nothing about nothing', () => {
    const counted = emptyAssistantTurn({
      status: 'done',
      tools: [{ id: 'r1', name: 'vault_read', input: { path: 'matters/acme.md' }, hasResult: true, output: { content: 'x' } }],
      proposals: [{ id: 'p-1', path: 'practice/x.md', rationale: 'r', status: 'pending' }],
    });
    expect(stripLine(counted)).toBe('1 source · 1 proposal pending');
    // A settled proposal is not pending work; nothing to say about it here.
    expect(stripLine({ ...counted, proposals: [{ ...counted.proposals[0]!, status: 'approved' }] })).toBe('1 source');
    expect(stripLine(emptyAssistantTurn({ status: 'done' }))).toBe('');
  });

  test('expanded: steps with their ms, primitives, proposals, cost, run id', async () => {
    render(<Strip turn={turn} run={run} ms={{ 'c-1': 18, 'c-2': 9, 'c-3': 3 }} />);
    await userEvent.click(document.querySelector('summary') as HTMLElement);
    expect(document.querySelectorAll('.v2-step')).toHaveLength(3);
    expect(screen.getByText(/18 ms/)).toBeTruthy();
    expect(screen.getByText('evaluate')).toBeTruthy();
    expect(screen.getByText('p-1')).toBeTruthy();
    expect(screen.getByText('$0.0012')).toBeTruthy();
    expect(screen.getByText('r-1')).toBeTruthy();
  });

  test('a failed tool is visible while the strip is still collapsed', () => {
    render(<Strip turn={{ ...turn, tools: [{ ...turn.tools[0]!, isError: true }] }} run={{ ...run, status: 'error' }} ms={{}} />);
    expect(screen.getByText('1 failed')).toBeTruthy();
    // The container carries the status too, so the strip itself reads as red.
    expect(document.querySelector('.v2-strip')?.getAttribute('data-status')).toBe('error');
  });

  test('a tool that found nothing is counted apart from the failures', () => {
    render(<Strip turn={{ ...turn, tools: [{ ...turn.tools[0]!, output: [] }] }} run={run} ms={{}} />);
    expect(screen.getByText('1 empty')).toBeTruthy();
    // Nothing failed, so the strip must not say anything did.
    expect(screen.queryByText('1 failed')).toBeNull();
    expect(document.querySelector('.v2-strip')?.getAttribute('data-status')).toBe('done');
  });

  test('the record shows ids short, with the whole value one hover away', async () => {
    const uuid = '7d83f020-6a2b-4f7e-9a1e-2b7c3d4e5f60';
    render(<Strip turn={turn} run={{ ...run, runId: uuid, proposals: [uuid] }} ms={{}} />);
    await userEvent.click(document.querySelector('summary') as HTMLElement);
    // The ids are the codes that carry the full value in a title; the
    // Model row's code is not one of them.
    const ids = Array.from(document.querySelectorAll('.v2-record code[title]'));
    expect(ids).toHaveLength(2);
    for (const id of ids) {
      expect(id.textContent).toBe('7d83f02');
      expect(id.getAttribute('title')).toBe(uuid);
    }
  });

  test('an error record shows the message and the raw text', async () => {
    render(<Strip turn={{ ...turn, status: 'error' }} run={{ ...run, status: 'error', error: 'schema', errorText: '{"a":1}' }} ms={{}} />);
    expect(document.querySelector('summary .v2-pill')?.textContent).toBe('ERROR');
    await userEvent.click(document.querySelector('summary') as HTMLElement);
    expect(screen.getByText('schema')).toBeTruthy();
    expect(screen.getByText('{"a":1}')).toBeTruthy();
  });

  test('an error the turn already shows is not repeated in the record', async () => {
    render(
      <Strip
        turn={{ ...turn, status: 'error', error: { message: 'schema', text: '{"a":1}' } }}
        run={{ ...run, status: 'error', error: 'schema', errorText: '{"a":1}' }}
        ms={{}}
      />,
    );
    await userEvent.click(document.querySelector('summary') as HTMLElement);
    expect(document.querySelector('.v2-strip-body .v2-notice-error')).toBeNull();
    expect(screen.queryByText('schema')).toBeNull();
  });
});


describe('shortId', () => {
  test('cuts a uuid to seven and leaves a short id alone', () => {
    expect(shortId('7d83f020-6a2b-4f7e-9a1e-2b7c3d4e5f60')).toBe('7d83f02');
    expect(shortId('r-1')).toBe('r-1');
  });
});

describe('stripLine with produced documents', () => {
  test('counts the documents the step produced', () => {
    const produced = emptyAssistantTurn({
      status: 'done',
      tools: [{ id: 'c-1', name: 'vault_read', input: { path: 'matters/acme.md' }, output: 'x', isError: false, hasResult: true }],
      artifacts: [{ id: 'a-1', kind: 'docx-redline', path: 'matters/acme/nda-redline.docx', summary: { changes: 1, comments: 0, applied: 1, skipped: 0, clauses: 1, bytes: 10 }, tracked: true }],
    });
    expect(stripLine(produced)).toBe('1 source · 1 document produced');
  });
});

describe('the task and the marks (routing-and-evals spec §3, §7)', () => {
  test('the record names the task and where it came from; outside a thread there is nothing to click', async () => {
    render(<Strip turn={turn} run={{ ...run, task: 'redline', taskSource: 'rule' }} ms={{}} />);
    await userEvent.click(document.querySelector('summary') as HTMLElement);
    const cell = document.querySelector('.v2-record-task') as HTMLElement;
    expect(cell.textContent).toBe('redline · by rule');
    expect(screen.queryByRole('button', { name: 'change' })).toBeNull();
    expect(document.querySelector('.v2-marks')).toBeNull();
  });

  test('inside a thread: `change` opens the closed taxonomy, a pick PATCHes the step and the line says corrected', async () => {
    install((url, body) => (url.endsWith('/task') ? json({ task: body.task, taskSource: 'corrected' }) : json({}, 404)));
    render(<Strip turn={turn} run={{ ...run, task: 'chat', taskSource: 'default' }} ms={{}} threadId="t-1" />);
    await userEvent.click(document.querySelector('summary') as HTMLElement);
    expect((document.querySelector('.v2-record-task') as HTMLElement).textContent).toBe('chat · by default · change');

    await userEvent.click(screen.getByRole('button', { name: 'change' }));
    const items = Array.from(document.querySelectorAll('.v2-task-pop .v2-switch-item'), el => el.textContent?.trim());
    expect(items).toEqual(['review', 'redline', 'draft', 'research', 'extract', 'summarize', 'compare', 'remember', 'docket', 'retro', 'chat']);

    await userEvent.click(screen.getByText('review'));
    await waitFor(() => expect((document.querySelector('.v2-record-task') as HTMLElement).textContent).toBe('review · corrected · change'));
    expect(posts).toEqual([{ url: '/threads/t-1/steps/r-1/task', method: 'PATCH', body: { task: 'review' } }]);
    expect(document.querySelector('.v2-task-pop')).toBeNull();
  });

  test('useful · not right under the strip: a click POSTs the mark and the chosen word is set', async () => {
    install((url, body) => (url.endsWith('/mark') ? json({ mark: { mark: body.mark, at: '2026-09-02T00:00:00.000Z' } }) : json({}, 404)));
    render(<Strip turn={turn} run={run} ms={{}} threadId="t-1" />);
    const useful = screen.getByRole('button', { name: 'useful' });
    const notRight = screen.getByRole('button', { name: 'not right' });
    expect(useful.getAttribute('aria-pressed')).toBe('false');

    await userEvent.click(notRight);
    await waitFor(() => expect(notRight.getAttribute('aria-pressed')).toBe('true'));
    expect(useful.getAttribute('aria-pressed')).toBe('false');
    expect(posts).toEqual([{ url: '/threads/t-1/turns/r-1/mark', method: 'POST', body: { mark: 'not-right' } }]);
  });

  test('a mark already on the record shows as chosen; a failed post says so and keeps the old answer', async () => {
    install(() => json({ error: 'vault is read-only' }, 500));
    render(<Strip turn={turn} run={{ ...run, mark: { mark: 'useful', at: '2026-09-02T00:00:00.000Z' } }} ms={{}} threadId="t-1" />);
    expect(screen.getByRole('button', { name: 'useful' }).getAttribute('aria-pressed')).toBe('true');

    await userEvent.click(screen.getByRole('button', { name: 'not right' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'useful' }).getAttribute('aria-pressed')).toBe('true');
  });

  test('a run that is not done cannot be marked', () => {
    render(<Strip turn={{ ...turn, status: 'error' }} run={{ ...run, status: 'error' }} ms={{}} threadId="t-1" />);
    expect(document.querySelector('.v2-marks')).toBeNull();
  });
});

describe('why this model answered', () => {
  test('the record names the reason beside the model, and the policy when it bound the choice', async () => {
    render(
      <Strip
        turn={turn}
        threadId="t-1"
        run={{ ...run, provider: 'ollama/gemma4', routeReason: { kind: 'scored', text: 'review 0.82' }, policy: 'stays-local' }}
        ms={{}}
      />,
    );
    await userEvent.click(document.querySelector('summary') as HTMLElement);
    const model = document.querySelector('.v2-record-route')!;
    expect(model.textContent).toBe(' · review 0.82 · stays on this machine');
  });

  test('the stays-local reason is not repeated after itself', async () => {
    render(
      <Strip
        turn={turn}
        threadId="t-1"
        run={{ ...run, routeReason: { kind: 'stays-local', text: 'stays on this machine' }, policy: 'stays-local' }}
        ms={{}}
      />,
    );
    await userEvent.click(document.querySelector('summary') as HTMLElement);
    expect(document.querySelector('.v2-record-route')!.textContent).toBe(' · stays on this machine');
  });

  test('an older run with no reason recorded shows the model alone', async () => {
    render(<Strip turn={turn} threadId="t-1" run={run} ms={{}} />);
    await userEvent.click(document.querySelector('summary') as HTMLElement);
    expect(document.querySelector('.v2-record-route')).toBeNull();
  });
});
