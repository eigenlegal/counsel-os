import { systemGit, type GitRunner } from '../setup/run';
import { readVaultConfig } from '../vault/resolve-root';
import { ALL_CHECKS, type DoctorContext, type Finding, type Severity } from './checks';
import { loadLawPolicy, type LawPolicy } from './policy';

export type { Finding, Severity } from './checks';

export type Verdict = 'healthy' | 'warnings' | 'broken';

export interface DoctorReport {
  at: string;
  vault: string;
  findings: Finding[];
  verdict: Verdict;
  /** The verdict in words, the way the skill's table ends. */
  summary: string;
}

export interface DoctorDeps {
  vaultRoot: string;
  pluginRoot: string;
  policy?: LawPolicy;
  /** Default: real git, or `null` when there is none. */
  git?: GitRunner | null;
  now?: () => Date;
}

export function verdictOf(findings: Finding[]): { verdict: Verdict; summary: string } {
  const errors = findings.filter(f => f.severity === 'error');
  const warns = findings.filter(f => f.severity === 'warn');
  if (errors.length > 0) return { verdict: 'broken', summary: `broken: ${errors[0]!.message} — ${errors[0]!.fix ?? 'fix it before doing legal work'}` };
  if (warns.length > 0) return { verdict: 'warnings', summary: `${warns.length} warning${warns.length === 1 ? '' : 's'} — ${warns[0]!.check} first` };
  return { verdict: 'healthy', summary: 'healthy' };
}

/** Runs every check. Read-only. */
export function runDoctor(deps: DoctorDeps): DoctorReport {
  const now = deps.now?.() ?? new Date();
  const ctx: DoctorContext = {
    vaultRoot: deps.vaultRoot,
    cfg: readVaultConfig(deps.vaultRoot),
    policy: deps.policy ?? loadLawPolicy(deps.pluginRoot),
    now,
    git: deps.git === undefined ? systemGit() : deps.git,
  };
  const findings = ALL_CHECKS.map(check => check(ctx));
  return { at: now.toISOString(), vault: deps.vaultRoot, findings, ...verdictOf(findings) };
}

/** The report as the skill's table, for the CLI. */
export function renderReport(report: DoctorReport): string {
  const mark: Record<Severity, string> = { ok: 'ok   ', warn: 'warn ', error: 'error' };
  const lines = [`Counsel OS vault health — ${report.at.slice(0, 10)} — ${report.vault}`, ''];
  for (const f of report.findings) {
    lines.push(`${mark[f.severity]}  ${f.check.padEnd(14)} ${f.message}`);
    if (f.detail !== undefined) for (const d of f.detail.split('\n')) lines.push(`${' '.repeat(22)}${d}`);
    if (f.fix !== undefined && f.severity !== 'ok') lines.push(`${' '.repeat(22)}fix: ${f.fix}`);
  }
  lines.push('', `Verdict: ${report.summary}`);
  return lines.join('\n') + '\n';
}
