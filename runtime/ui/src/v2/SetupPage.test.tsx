import { cleanup, render, screen, userEvent, waitFor } from '../test/dom';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { TOKEN_KEY } from '../api/token';
import type { SetupLocation, SetupPlanBody, SetupProvider } from '../api/types';
import { expandPath, homeFrom, kindLabel, reasonSentence, SetupPage, shortPath, stepsFor } from './SetupPage';

const realFetch = globalThis.fetch;

const locations: SetupLocation[] = [
  { path: '/Users/jack/Documents/Counsel OS', kind: 'new', exists: false, writable: true, suggested: true },
  { path: '/Users/jack/Library/Mobile Documents/iCloud~md~obsidian/Documents/Legal/Counsel OS', kind: 'obsidian-vault', within: '/Users/jack/Library/Mobile Documents/iCloud~md~obsidian/Documents/Legal', exists: false, writable: true, suggested: false },
  { path: '/Users/jack/legal', kind: 'existing-root', exists: true, writable: true, suggested: false },
];

const providers: SetupProvider[] = [
  { id: 'claude-sub/claude-opus-5', vendor: 'Claude', model: 'Opus 5', connection: 'subscription', installed: true, signedIn: true, usable: true, state: 'signed in' },
  { id: 'codex-sub/gpt-5.6-terra', vendor: 'ChatGPT', model: 'GPT-5.6 Terra', connection: 'subscription', installed: false, signedIn: null, usable: false, state: 'not installed' },
  { id: 'ollama/gemma4:e4b', vendor: 'Ollama', model: 'gemma4:e4b', connection: 'local', installed: true, signedIn: null, models: ['a', 'b', 'c'], usable: true, state: 'running · 3 models' },
];

let posts: SetupPlanBody[] = [];
let answer: () => Response = () => json({ vault: '/Users/jack/Documents/Counsel OS', result: {} });

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

beforeEach(() => {
  posts = [];
  answer = () => json({ vault: '/Users/jack/Documents/Counsel OS', result: {} });
  sessionStorage.setItem(TOKEN_KEY, 'test-token');
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith('/setup/detect')) return json({ locations });
    if (url.startsWith('/setup/providers')) return json({ providers });
    if (url === '/setup' && init?.method === 'POST') {
      posts.push(JSON.parse(String(init.body)) as SetupPlanBody);
      return answer();
    }
    throw new Error(`unexpected fetch: ${url}`);
  }) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  sessionStorage.clear();
});

async function mounted(onDone: () => void = () => {}): Promise<void> {
  render(<SetupPage onDone={onDone} />);
  await waitFor(() => expect(screen.getByRole('radio', { name: /Documents\/Counsel OS/ })).toBeTruthy());
}

describe('the pure bits', () => {
  test('home from the default row; ~ shown and expanded', () => {
    expect(homeFrom(locations)).toBe('/Users/jack');
    expect(shortPath('/Users/jack/legal', '/Users/jack')).toBe('~/legal');
    expect(shortPath('/Volumes/Firm', '/Users/jack')).toBe('/Volumes/Firm');
    expect(expandPath('~/Dropbox/Firm', '/Users/jack')).toBe('/Users/jack/Dropbox/Firm');
    expect(expandPath('  /abs  ', '/Users/jack')).toBe('/abs');
    expect(expandPath('~/x', null)).toBe('~/x');
  });

  test('kind labels and reason sentences', () => {
    expect(kindLabel(locations[0]!)).toBe('new folder');
    expect(kindLabel(locations[1]!)).toBe('Obsidian vault');
    expect(kindLabel(locations[2]!)).toBe('Counsel OS root · already set up');
    expect(reasonSentence('not-writable', '/Volumes/Firm/Legal', '')).toBe('Cannot write to /Volumes/Firm/Legal. Pick another folder, or make this one writable and choose Create again.');
    expect(reasonSentence('switch-failed', '/v', '--dist overlaps')).toContain('could not switch to it: --dist overlaps');
    expect(reasonSentence('mystery', '/v', 'raw')).toBe('raw');
  });

  test('the ledger: first step in flight, the rest waiting; all written when done; sample row only when asked', () => {
    expect(stepsFor(true, false).map(s => s.state)).toEqual(['now', 'wait', 'wait', 'wait', 'wait', 'wait']);
    expect(stepsFor(false, false).map(s => s.what)).not.toContain('Sample matter');
    expect(stepsFor(true, true).every(s => s.state === 'done')).toBe(true);
  });
});

describe('SetupPage', () => {
  test('rows from the probes, with the suggested folder and the first usable model preselected, shown with ~', async () => {
    await mounted();
    const rows = screen.getAllByRole('radio') as HTMLElement[];
    expect(rows.map(r => r.textContent)).toEqual([
      '~/Documents/Counsel OSnew folderselected',
      '~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Legal/Counsel OSObsidian vaultuse this',
      '~/legalCounsel OS root · already set upuse this',
      'in-house',
      'outside counsel',
      'solo',
      'ClaudeOpus 5 · subscriptionsigned inselected',
      'ChatGPTGPT-5.6 Terra · subscriptionnot installedinstall',
      'Ollamagemma4:e4b · localrunning · 3 modelsuse this',
    ]);
    expect(screen.getByRole('radio', { name: /Documents\/Counsel OS/ }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: /^solo$/ }).getAttribute('aria-checked')).toBe('true');
    expect((screen.getByRole('radio', { name: /ChatGPT/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText(/Writes 26 law areas, 24 standards, 35 methods/)).toBeTruthy();
    expect(document.querySelector('.v2-rail')).toBeNull();
    expect(screen.getByText('bun runtime/src/cli.ts init')).toBeTruthy();
  });

  test('Create posts the plan: chosen row, identity, role word, practice, sample, default provider', async () => {
    await mounted();
    await userEvent.click(screen.getByRole('radio', { name: /legal/ }));
    await userEvent.type(screen.getByLabelText('Name'), 'Jack Wang');
    await userEvent.type(screen.getByLabelText('Organization'), 'Eigen Legal');
    await userEvent.click(screen.getByRole('radio', { name: 'outside counsel' }));
    await userEvent.type(screen.getByLabelText('Jurisdiction'), 'Massachusetts');
    await userEvent.type(screen.getByLabelText('Your practice'), 'Commercial contracts');
    await userEvent.click(screen.getByRole('radio', { name: /Ollama/ }));
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0]).toEqual({
      vault: '/Users/jack/legal',
      identity: { name: 'Jack Wang', organization: 'Eigen Legal', role: 'outside', jurisdiction: 'Massachusetts' },
      practice: 'Commercial contracts',
      sampleMatter: false,
      defaultProvider: 'ollama/gemma4:e4b',
      git: true,
    });
  });

  test('a typed folder expands ~, shows as another folder, and wins over the rows', async () => {
    await mounted();
    await userEvent.type(screen.getByLabelText('Or another folder'), '~/Dropbox/Firm');
    expect(screen.getByText('another folder')).toBeTruthy();
    expect(screen.getByRole('radio', { name: /Documents\/Counsel OS/ }).getAttribute('aria-checked')).toBe('false');
    await userEvent.type(screen.getByLabelText('Name'), 'J');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0]!.vault).toBe('/Users/jack/Dropbox/Firm');
  });

  test('a missing name never reaches the server', async () => {
    await mounted();
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(screen.getByRole('alert').textContent).toContain('needs a name');
    expect(posts).toEqual([]);
  });

  test('progress: the ledger while the request runs, then every row written, then onDone', async () => {
    let release: (() => void) | null = null;
    answer = () => {
      throw new Error('unused');
    };
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith('/setup/detect')) return json({ locations });
      if (url.startsWith('/setup/providers')) return json({ providers });
      if (url === '/setup' && init?.method === 'POST') {
        await new Promise<void>(resolve => {
          release = resolve;
        });
        return json({ vault: '/Users/jack/Documents/Counsel OS', result: {} });
      }
      throw new Error(`unexpected fetch: ${url}`);
    }) as unknown as typeof fetch;
    let done = 0;
    await mounted(() => (done += 1));
    await userEvent.type(screen.getByLabelText('Name'), 'J');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Setting up.'));
    expect(screen.getByRole('status').textContent).toContain('~/Documents/Counsel OS');
    const states = () => Array.from(document.querySelectorAll('.v2-setup-st'), el => el.textContent);
    expect(states()).toEqual(['writing…', 'waiting', 'waiting', 'waiting', 'waiting', 'waiting']);
    release!();
    await waitFor(() => expect(states().every(s => s === 'written')).toBe(true));
    await waitFor(() => expect(done).toBe(1), { timeout: 2000 });
  });

  test('400 issues land on their fields; a reason lands under the folder; values are kept; Nothing was written yet', async () => {
    answer = () => json({ error: 'invalid setup plan', issues: [{ path: ['identity', 'jurisdiction'], message: 'too long' }] }, 400);
    await mounted();
    await userEvent.type(screen.getByLabelText('Name'), 'Jack');
    await userEvent.type(screen.getByLabelText('Jurisdiction'), 'MA');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('too long'));
    expect((screen.getByLabelText('Jurisdiction') as HTMLInputElement).getAttribute('aria-invalid')).toBe('true');
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Jack');
    expect(screen.getByRole('status').textContent).toContain('Everything you typed is still here');
    expect(screen.getByText('Nothing was written yet.')).toBeTruthy();

    answer = () => json({ error: 'cannot write', reason: 'not-writable' }, 400);
    await userEvent.type(screen.getByLabelText('Or another folder'), '/Volumes/Firm/Legal');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Cannot write to /Volumes/Firm/Legal. Pick another folder, or make this one writable and choose Create again.'));
    expect((screen.getByLabelText('Or another folder') as HTMLInputElement).getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('button', { name: 'Choose another folder' })).toBeTruthy();
    expect(posts).toHaveLength(2);
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Jack');
  });

  test('switch-failed says the vault was written', async () => {
    answer = () => json({ error: '--dist overlaps the vault', reason: 'switch-failed' }, 400);
    await mounted();
    await userEvent.type(screen.getByLabelText('Name'), 'J');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('could not switch to it'));
    expect(screen.getByText('The vault was written.')).toBeTruthy();
  });

  test('a runtime that does not answer is one sentence, not a crash', async () => {
    answer = () => {
      throw new TypeError('Failed to fetch');
    };
    await mounted();
    await userEvent.type(screen.getByLabelText('Name'), 'J');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('counsel-os did not answer'));
  });
});
