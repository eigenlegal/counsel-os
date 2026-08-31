import { cleanup, render, screen, userEvent } from '../../test/dom';

import { afterEach, describe, expect, test } from 'bun:test';
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

afterEach(cleanup);

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
    expect(document.querySelector('summary .v2-chevron')?.textContent).toBe('details ⌄');
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
