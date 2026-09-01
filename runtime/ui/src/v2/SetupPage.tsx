import { useEffect, useMemo, useState } from 'react';
import { ApiError, fetchJson } from '../api/client';
import type { SetupLocation, SetupPlanBody, SetupProvider, SetupResponse } from '../api/types';

/** The terminal way in, for readers who prefer it. One place to change
 * when the `counsel-os` binary ships (roadmap §9). */
export const INIT_COMMAND = 'bun runtime/src/cli.ts init';

export type Role = SetupPlanBody['identity']['role'];

const ROLES: ReadonlyArray<{ value: Role; word: string }> = [
  { value: 'in-house', word: 'in-house' },
  { value: 'outside', word: 'outside counsel' },
  { value: 'solo', word: 'solo' },
];

/** The default new folder is `<home>/Documents/Counsel OS`; the row that
 * proposes it is how the page learns the home directory, which it needs to
 * show paths with `~` and to expand a typed `~`. */
const DEFAULT_TAIL = '/Documents/Counsel OS';

export function homeFrom(locations: SetupLocation[]): string | null {
  const fresh = locations.find(l => l.kind === 'new' && l.path.endsWith(DEFAULT_TAIL));
  return fresh === undefined ? null : fresh.path.slice(0, -DEFAULT_TAIL.length);
}

export function shortPath(path: string, home: string | null): string {
  if (home === null || home === '') return path;
  if (path === home) return '~';
  return path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path;
}

/** `~` and `~/x` expanded client-side; the schema insists on an absolute
 * path, so a relative one is left for the server to refuse with a sentence. */
export function expandPath(input: string, home: string | null): string {
  const trimmed = input.trim();
  if (home !== null && home !== '') {
    if (trimmed === '~') return home;
    if (trimmed.startsWith('~/')) return `${home}/${trimmed.slice(2)}`;
  }
  return trimmed;
}

export function kindLabel(location: SetupLocation): string {
  if (location.kind === 'existing-root') return 'Counsel OS root · already set up';
  if (location.kind === 'obsidian-vault') return 'Obsidian vault';
  return 'new folder';
}

/** The refusal reasons `POST /setup` answers with, as sentences under the
 * location row (mock-setup-progress.html). */
export function reasonSentence(reason: string, vault: string, error: string): string {
  if (reason === 'not-writable') return `Cannot write to ${vault}. Pick another folder, or make this one writable and choose Create again.`;
  if (reason === 'inside-plugin') return 'That folder is inside the counsel-os checkout itself. Pick one outside it.';
  if (reason === 'unmarked-config') return `${vault} already has a config.md that is not a Counsel OS config. Pick another folder, or move that file aside.`;
  if (reason === 'not-a-directory') return `${vault} is a file, not a folder. Pick a folder.`;
  if (reason === 'switch-failed') return `The vault was written, but the runtime could not switch to it: ${error}`;
  return error;
}

type StepState = 'done' | 'now' | 'wait';

interface Step {
  what: string;
  n?: string;
  state: StepState;
}

/** The progress ledger: set text, no bars (mock-setup-progress.html). One
 * request writes everything, so the ledger shows the first step in flight
 * and the rest waiting; on the answer every row reads `written`. */
export function stepsFor(sample: boolean, done: boolean): Step[] {
  const state = (i: number): StepState => (done ? 'done' : i === 0 ? 'now' : 'wait');
  const rows: Array<[string, string | undefined]> = [
    ['Folder and config', undefined],
    ['Law areas', '26'],
    ['Standards, methods, library', '83 files'],
    ['Your practice profile', undefined],
    ...(sample ? [['Sample matter', undefined] as [string, string | undefined]] : []),
    ['Git repository', undefined],
  ];
  return rows.map(([what, n], i) => ({ what, ...(n === undefined ? {} : { n }), state: state(i) }));
}

type Phase = { kind: 'form' } | { kind: 'creating'; vault: string; done: boolean } | { kind: 'failed'; vault: string; wrote: boolean };

interface FieldErrors {
  vault?: string;
  name?: string;
  role?: string;
  jurisdiction?: string;
  practice?: string;
  general?: string;
}

export interface SetupPageProps {
  /** The vault exists and the runtime switched to it; the shell reloads. */
  onDone(): void;
}

/**
 * The first-run screen (spec 2026-09-01 §5; mocks `img-standalone/
 * mock-setup*.html`): where the vault goes, who the reader is, what they
 * practice, which model answers, the sample matter, one Create. No rail
 * — there is nothing for it to point at yet. Values are never reset: a
 * failed step puts one sentence where it belongs and everything typed
 * stays.
 */
export function SetupPage({ onDone }: SetupPageProps): JSX.Element {
  const [locations, setLocations] = useState<SetupLocation[] | null>(null);
  const [providers, setProviders] = useState<SetupProvider[] | null>(null);
  const [probeNote, setProbeNote] = useState<string | null>(null);

  const [choice, setChoice] = useState<string | null>(null);
  const [custom, setCustom] = useState('');
  const [name, setName] = useState('');
  const [org, setOrg] = useState('');
  const [role, setRole] = useState<Role>('solo');
  const [jurisdiction, setJurisdiction] = useState('');
  const [practice, setPractice] = useState('');
  const [provider, setProvider] = useState<string | null>(null);
  const [sample, setSample] = useState(true);

  const [phase, setPhase] = useState<Phase>({ kind: 'form' });
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    void (async () => {
      try {
        const [detected, probed] = await Promise.all([
          fetchJson<{ locations: SetupLocation[] }>('/setup/detect'),
          fetchJson<{ providers: SetupProvider[] }>('/setup/providers'),
        ]);
        setLocations(detected.locations);
        setProviders(probed.providers);
        setChoice(current => current ?? detected.locations.find(l => l.suggested)?.path ?? detected.locations[0]?.path ?? 'custom');
        setProvider(current => current ?? probed.providers.find(p => p.usable)?.id ?? null);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return;
        setLocations([]);
        setProviders([]);
        setChoice(current => current ?? 'custom');
        setProbeNote(err instanceof Error ? err.message : String(err));
      }
    })();
  }, []);

  const home = useMemo(() => (locations === null ? null : homeFrom(locations)), [locations]);
  const vault = choice === 'custom' || choice === null ? expandPath(custom, home) : choice;
  const busy = phase.kind === 'creating';

  const create = async (): Promise<void> => {
    const next: FieldErrors = {};
    if (vault === '') next.vault = 'Pick a folder, or type one.';
    if (name.trim() === '') next.name = 'Counsel needs a name to sign with.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const body: SetupPlanBody = {
      vault,
      identity: { name: name.trim(), organization: org.trim(), role, jurisdiction: jurisdiction.trim() },
      practice: practice.trim(),
      sampleMatter: sample,
      ...(provider === null ? {} : { defaultProvider: provider }),
      git: true,
    };
    setPhase({ kind: 'creating', vault, done: false });
    try {
      await fetchJson<SetupResponse>('/setup', { method: 'POST', body: JSON.stringify(body) });
      setPhase({ kind: 'creating', vault, done: true });
      setTimeout(onDone, 500);
    } catch (err) {
      const failed: FieldErrors = {};
      let wrote = false;
      if (err instanceof ApiError && err.status === 400) {
        const detail = (err.body ?? {}) as { error?: string; reason?: string; issues?: Array<{ path: unknown[]; message: string }> };
        for (const issue of detail.issues ?? []) {
          const key = String(issue.path[issue.path.length - 1] ?? issue.path[0] ?? '');
          if (key === 'vault') failed.vault = 'That is not a folder path counsel can use. It has to be absolute, like /Users/you/Documents/Counsel OS.';
          else if (key === 'name') failed.name = 'Counsel needs a name to sign with.';
          else if (key === 'role') failed.role = issue.message;
          else if (key === 'jurisdiction') failed.jurisdiction = issue.message;
          else if (key === 'practice') failed.practice = issue.message;
          else failed.general = issue.message;
        }
        if (detail.reason !== undefined) {
          failed.vault = reasonSentence(detail.reason, vault, detail.error ?? '');
          wrote = detail.reason === 'switch-failed';
        } else if ((detail.issues ?? []).length === 0 && detail.error !== undefined) {
          failed.general = detail.error;
        }
      } else if (err instanceof ApiError && err.status === 401) {
        return;
      } else {
        failed.general = `counsel-os did not answer: ${err instanceof Error ? err.message : String(err)}`;
      }
      setErrors(failed);
      setPhase({ kind: 'failed', vault, wrote });
    }
  };

  if (phase.kind === 'creating') {
    return (
      <main className="v2-page v2-setup" aria-label="Setting up">
        <div className="v2-setup-wrap">
          <Brand />
          <h1 className="v2-setup-title">Setting up.</h1>
          <p className="v2-setup-lede" role="status">
            Writing your vault into <code>{shortPath(phase.vault, home)}</code>. This takes a few seconds.
          </p>
          <section className="v2-setup-group rule-double">
            <h2 className="runin">Progress</h2>
            <div className="v2-setup-steps">
              {stepsFor(sample, phase.done).map(step => (
                <div className="v2-setup-step" key={step.what}>
                  <span className="v2-setup-step-what">{step.what}</span>
                  {step.n === undefined ? null : <span className="v2-setup-step-n">{step.n}</span>}
                  <span className="leader" aria-hidden="true" />
                  <span className={`v2-setup-st v2-setup-st-${step.state}`}>{step.state === 'done' ? 'written' : step.state === 'now' ? 'writing…' : 'waiting'}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    );
  }

  const failed = phase.kind === 'failed';

  return (
    <main className="v2-page v2-setup" aria-label="Set up counsel-os">
      <div className="v2-setup-wrap">
        <Brand />
        <h1 className="v2-setup-title">Set up counsel-os.</h1>
        <p className="v2-setup-lede" role={failed ? 'status' : undefined}>
          {failed
            ? 'One thing needs your attention below. Everything you typed is still here.'
            : 'Four short questions. Your documents stay on this machine; what you type here only shapes the vault counsel works from.'}
        </p>

        <form
          onSubmit={event => {
            event.preventDefault();
            void create();
          }}
        >
          <section className="v2-setup-group rule-double">
            <h2 className="runin">Where your documents live</h2>
            <p className="v2-setup-why">counsel keeps everything as plain files in one folder — matters, your standards, the law it reads. Pick an existing vault or let it make a new folder.</p>
            {locations === null ? (
              <p className="muted v2-setup-why">Looking for folders…</p>
            ) : (
              <div role="radiogroup" aria-label="Where your documents live">
                {locations.map(location => {
                  const on = choice === location.path;
                  return (
                    <button
                      type="button"
                      key={location.path}
                      role="radio"
                      aria-checked={on}
                      className="v2-setup-loc"
                      onClick={() => setChoice(location.path)}
                    >
                      <span className="v2-setup-path">{shortPath(location.path, home)}</span>
                      <span className="v2-setup-kind">{kindLabel(location)}</span>
                      <span className={on ? 'v2-setup-pick v2-setup-pick-on' : 'v2-setup-pick'}>{on ? 'selected' : 'use this'}</span>
                    </button>
                  );
                })}
                {choice === 'custom' && custom.trim() !== '' ? (
                  <div className="v2-setup-loc" aria-current="true">
                    <span className="v2-setup-path">{shortPath(vault, home)}</span>
                    <span className="v2-setup-kind">another folder</span>
                    <span className="v2-setup-pick v2-setup-pick-on">selected</span>
                  </div>
                ) : null}
              </div>
            )}
            <div className="v2-setup-field v2-setup-field-gap">
              <label htmlFor="v2-setup-custom">Or another folder</label>
              <input
                id="v2-setup-custom"
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="Type a path, for example ~/Dropbox/Firm"
                value={custom}
                aria-invalid={errors.vault !== undefined && choice === 'custom' ? true : undefined}
                onChange={event => {
                  setCustom(event.target.value);
                  setChoice(event.target.value.trim() === '' ? (locations?.find(l => l.suggested)?.path ?? null) : 'custom');
                }}
              />
            </div>
            {errors.vault === undefined ? null : (
              <p className="v2-setup-err" role="alert">
                {errors.vault}
              </p>
            )}
          </section>

          <section className="v2-setup-group rule-double">
            <h2 className="runin">Who you are</h2>
            <p className="v2-setup-why">Counsel signs redlines and memos in your name and reads the law for your jurisdiction first.</p>
            <Field id="v2-setup-name" label="Name" value={name} onChange={setName} error={errors.name} />
            <Field id="v2-setup-org" label="Organization" value={org} onChange={setOrg} />
            <div className="v2-setup-field">
              <span className="v2-setup-label" id="v2-setup-role-label">
                Role
              </span>
              <div className="v2-setup-choice" role="radiogroup" aria-labelledby="v2-setup-role-label">
                {ROLES.map(r => (
                  <button type="button" key={r.value} role="radio" aria-checked={role === r.value} className={role === r.value ? 'on' : undefined} onClick={() => setRole(r.value)}>
                    {r.word}
                  </button>
                ))}
              </div>
            </div>
            {errors.role === undefined ? null : <p className="v2-setup-err" role="alert">{errors.role}</p>}
            <Field id="v2-setup-jurisdiction" label="Jurisdiction" value={jurisdiction} onChange={setJurisdiction} error={errors.jurisdiction} />
          </section>

          <section className="v2-setup-group rule-double">
            <h2 className="runin">What you practice</h2>
            <p className="v2-setup-why">One sentence. It tunes your practice profile — the positions counsel opens from and when it escalates to you. You can rewrite the profile later.</p>
            <Field id="v2-setup-practice" label="Your practice" value={practice} onChange={setPractice} error={errors.practice} placeholder="e.g. in-house GC at a B2B SaaS company" />
          </section>

          <section className="v2-setup-group rule-double">
            <h2 className="runin">Which model answers</h2>
            <p className="v2-setup-why">Counsel needs one model to talk to. These are the ones this machine can reach right now.</p>
            {providers === null ? (
              <p className="muted v2-setup-why">Checking…</p>
            ) : providers.length === 0 ? (
              <p className="muted v2-setup-why">{probeNote ?? 'Nothing answered. You can set a model up in Settings afterwards.'}</p>
            ) : (
              <div role="radiogroup" aria-label="Which model answers">
                {providers.map(p => {
                  const on = provider === p.id;
                  const pick = on ? 'selected' : p.usable ? 'use this' : p.installed ? 'sign in' : 'install';
                  return (
                    <button type="button" key={p.id} role="radio" aria-checked={on} className="v2-setup-prov" disabled={!p.usable} onClick={() => setProvider(p.id)}>
                      <span className="v2-setup-vendor">{p.vendor}</span>
                      <span className="v2-setup-model">
                        {p.model} · {p.connection}
                      </span>
                      <span className={p.usable ? 'v2-setup-state v2-setup-state-in' : 'v2-setup-state'}>{p.state}</span>
                      <span className={on ? 'v2-setup-pick v2-setup-pick-on' : 'v2-setup-pick'}>{pick}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <p className="v2-setup-why v2-setup-after">You can change this any time in Settings.</p>
          </section>

          <label className="v2-setup-sample">
            <input type="checkbox" checked={sample} onChange={event => setSample(event.target.checked)} />
            <span>Add a sample matter — a synthetic NDA — so you can try a review right away.</span>
          </label>

          {errors.general === undefined ? null : (
            <p className="v2-setup-err v2-setup-err-general" role="alert">
              {errors.general}
            </p>
          )}

          <div className="v2-setup-create">
            <button type="submit" className="v2-ask-go" disabled={busy}>
              Create
            </button>
            {failed ? (
              <>
                <button
                  type="button"
                  className="v2-setup-quiet"
                  onClick={() => {
                    setChoice('custom');
                    setErrors({});
                    document.getElementById('v2-setup-custom')?.focus();
                  }}
                >
                  Choose another folder
                </button>
                <span className="v2-setup-note">{phase.kind === 'failed' && phase.wrote ? 'The vault was written.' : 'Nothing was written yet.'}</span>
              </>
            ) : (
              <span className="v2-setup-note">Writes 26 law areas, 24 standards, 35 methods, and your profile into the folder above.</span>
            )}
          </div>
        </form>

        <p className="v2-setup-cli muted">
          Prefer a terminal? <code>{INIT_COMMAND}</code> asks the same questions, then reload this page.
        </p>
      </div>
    </main>
  );
}

function Brand(): JSX.Element {
  return (
    <div className="v2-brand v2-setup-brand">
      <span className="v2-mark" aria-hidden="true" />
      counsel-os
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange(next: string): void;
  error?: string;
  placeholder?: string;
}): JSX.Element {
  return (
    <>
      <div className="v2-setup-field">
        <label htmlFor={id}>{label}</label>
        <input id={id} type="text" autoComplete="off" value={value} placeholder={placeholder} aria-invalid={error === undefined ? undefined : true} onChange={event => onChange(event.target.value)} />
      </div>
      {error === undefined ? null : (
        <p className="v2-setup-err" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
