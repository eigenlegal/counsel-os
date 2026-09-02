import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { GitRunner } from '../setup/run';
import { parseFrontmatter, splitFrontmatterBlock } from '../vault/overview';
import type { VaultConfig } from '../vault/resolve-root';
import { cadenceFor, type LawPolicy } from './policy';
import { detectEdits } from '../outcomes/edits';
import { outcomesEnabled } from '../outcomes/store';
import { readWritten } from '../outcomes/written';

/**
 * The vault checks of `skills/doctor/SKILL.md` (steps 1, 2, 4B, 8, 10, 11),
 * as pure functions over a vault root (spec 2026-09-01 §7). Read-only by
 * construction: nothing here takes a writer. The environment checks the
 * skill also runs (pandoc, python, the browse binary, qmd) are not ported —
 * the runtime is the environment now.
 */

export type Severity = 'ok' | 'warn' | 'error';

export interface Finding {
  check: string;
  severity: Severity;
  /** One line. */
  message: string;
  /** More lines, when the message needs them. */
  detail?: string;
  paths?: string[];
  /** The one-line fix the skill would print. */
  fix?: string;
}

export interface DoctorContext {
  vaultRoot: string;
  cfg: VaultConfig;
  policy: LawPolicy;
  now: Date;
  /** `null` when git is not on PATH. */
  git: GitRunner | null;
}

function realOrLexical(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    return resolve(p);
  }
}

function readText(path: string): string | null {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

function isDir(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/** Every `*.md` under `dir` (recursive), vault-relative, sorted. */
function walkMd(root: string, rel: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(join(root, rel)).sort();
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name.startsWith('.')) continue;
    const path = `${rel}/${name}`;
    if (isDir(join(root, path))) out.push(...walkMd(root, path));
    else if (name.endsWith('.md')) out.push(path);
  }
  return out;
}

// ── 1. Legal root and config ────────────────────────────────────────────

export function checkRootConfig(ctx: DoctorContext): Finding {
  const check = 'root-config';
  const text = readText(join(ctx.vaultRoot, 'config.md'));
  if (text === null) {
    return { check, severity: 'error', message: 'no config.md — this folder is not a Counsel OS root', fix: 'bun runtime/src/cli.ts init --vault <this folder>' };
  }
  const lines = text.split('\n');
  const marked = lines.some(l => l.trim() === 'counsel-os-config: true');
  const rootLine = lines.find(l => l.startsWith('legal_root:'));
  if (!marked || rootLine === undefined) {
    return { check, severity: 'error', message: 'config.md is not a marked Counsel OS config (needs `counsel-os-config: true` and `legal_root:`)', fix: 'bun runtime/src/cli.ts init --vault <this folder>' };
  }
  const declared = rootLine.slice('legal_root:'.length).trim().replace(/^["']|["']$/g, '');
  if (realOrLexical(declared) !== realOrLexical(ctx.vaultRoot)) {
    return {
      check,
      severity: 'warn',
      message: `config.md says legal_root: ${declared}, but this vault is ${ctx.vaultRoot} (a copied config)`,
      fix: 'edit config.md so legal_root matches its own directory',
    };
  }
  return { check, severity: 'ok', message: `${ctx.vaultRoot} — marked config` };
}

// ── 2. Vault structure ──────────────────────────────────────────────────

function countMd(root: string, rel: string): number {
  return walkMd(root, rel).filter(p => !p.endsWith('/index.md')).length;
}

export function checkStructure(ctx: DoctorContext): Finding {
  const check = 'structure';
  const dirs: Array<{ rel: string; label: string; core: boolean; emptyOk: boolean }> = [
    { rel: 'law', label: 'law', core: true, emptyOk: false },
    { rel: 'practice/standards', label: 'standards', core: true, emptyOk: false },
    { rel: 'practice/methods', label: 'methods', core: false, emptyOk: false },
    { rel: 'practice/library', label: 'library', core: false, emptyOk: false },
    { rel: 'practice/reference', label: 'reference', core: false, emptyOk: true },
    { rel: ctx.cfg.mattersPath, label: ctx.cfg.mattersPath === 'matters' ? 'matters' : `matters@${ctx.cfg.mattersPath}`, core: false, emptyOk: true },
    { rel: 'memory', label: 'memory', core: false, emptyOk: true },
    { rel: ctx.cfg.entitiesPath, label: ctx.cfg.entitiesPath === 'entities' ? 'entities' : `entities@${ctx.cfg.entitiesPath}`, core: false, emptyOk: true },
  ];
  const parts: string[] = [];
  const missing: string[] = [];
  const emptyCore: string[] = [];
  const paths: string[] = [];
  for (const d of dirs) {
    if (!isDir(join(ctx.vaultRoot, d.rel))) {
      missing.push(d.rel);
      paths.push(d.rel);
      parts.push(`${d.label} MISSING`);
      continue;
    }
    const n = countMd(ctx.vaultRoot, d.rel);
    if (n === 0 && d.core) emptyCore.push(d.rel);
    parts.push(n === 0 && d.emptyOk ? `${d.label} empty` : `${d.label} ${n}`);
  }
  const profile = existsSync(join(ctx.vaultRoot, 'practice', 'profile.md'));
  if (!profile) {
    missing.push('practice/profile.md');
    paths.push('practice/profile.md');
  }
  const detail = parts.join(' · ') + (profile ? '' : ' · profile.md MISSING');
  const coreMissing = missing.filter(m => m === 'law' || m === 'practice/standards');
  if (coreMissing.length > 0 || emptyCore.length > 0) {
    return { check, severity: 'error', message: `core content missing: ${[...coreMissing, ...emptyCore].join(', ')}`, detail, paths, fix: 'bun runtime/src/cli.ts init --vault <this folder> (re-seeding is safe; it never overwrites)' };
  }
  if (missing.length > 0) {
    return { check, severity: 'warn', message: `missing: ${missing.join(', ')}`, detail, paths, fix: 'bun runtime/src/cli.ts init --vault <this folder>, or set matters_path / entities_path in config.md if they live elsewhere' };
  }
  return { check, severity: 'ok', message: detail };
}

// ── 4B. Law currency ────────────────────────────────────────────────────

/** The Python's `add_months`: the same day `months` later, clamped to the
 * target month's length. */
export function addMonths(value: Date, months: number): Date {
  const y = value.getUTCFullYear();
  const m0 = value.getUTCMonth() + months;
  const year = y + Math.floor(m0 / 12);
  const month = ((m0 % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(value.getUTCDate(), lastDay)));
}

export function parseIsoDate(raw: string | undefined): Date | null {
  if (raw === undefined) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim().replace(/^["']|["']$/g, ''));
  if (m === null) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}

function utcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

interface LawFile {
  path: string;
  area: string;
  lastReviewed: Date | null;
  userOwned: boolean;
}

function lawFiles(ctx: DoctorContext): LawFile[] {
  const out: LawFile[] = [];
  for (const path of walkMd(ctx.vaultRoot, 'law')) {
    if (path.endsWith('/FRONTMATTER.md')) continue;
    const text = readText(join(ctx.vaultRoot, path));
    if (text === null) continue;
    const { frontmatter } = parseFrontmatter(text);
    const segments = path.split('/');
    // `law/<area>/file.md` or a consolidated `law/<area>.md`.
    const area = segments.length >= 3 ? segments[1]! : segments[1]!.replace(/\.md$/, '');
    const managedByUser = (frontmatter['managed-by'] ?? '').trim().toLowerCase() === 'user';
    out.push({
      path,
      area,
      lastReviewed: parseIsoDate(frontmatter['last-reviewed']),
      userOwned: managedByUser || ctx.cfg.lawManagement === 'user' || !ctx.policy.areas.has(area),
    });
  }
  return out;
}

export function checkLawCurrency(ctx: DoctorContext): Finding {
  const check = 'law-currency';
  const files = lawFiles(ctx);
  if (files.length === 0) return { check, severity: 'warn', message: 'no law content in the vault', fix: 'bun runtime/src/cli.ts init --vault <this folder>' };
  const today = utcDay(ctx.now);
  const areas = new Set(files.map(f => f.area));
  let current = 0;
  const staleUser: string[] = [];
  const stalePlugin: string[] = [];
  const neverUser: string[] = [];
  const neverPlugin: string[] = [];
  for (const f of files) {
    if (f.lastReviewed === null) {
      (f.userOwned ? neverUser : neverPlugin).push(f.path);
      continue;
    }
    const staleAfter = addMonths(f.lastReviewed, cadenceFor(ctx.policy, f.area));
    if (today.getTime() > staleAfter.getTime()) (f.userOwned ? staleUser : stalePlugin).push(f.path);
    else current++;
  }
  const stale = staleUser.length + stalePlugin.length;
  const never = neverUser.length + neverPlugin.length;
  const summary = `${areas.size} areas · ${current} attested current · ${stale} stale · ${never} never attested`;
  if (stale === 0 && never === 0) return { check, severity: 'ok', message: summary };
  const bits: string[] = [];
  if (staleUser.length + neverUser.length > 0) bits.push(`${staleUser.length + neverUser.length} user-owned — refresh them (the plugin's /counsel-os:law-refresh)`);
  if (stalePlugin.length + neverPlugin.length > 0) bits.push(`${stalePlugin.length + neverPlugin.length} plugin-managed — refreshed upstream; apply content updates`);
  return {
    check,
    severity: 'warn',
    message: summary,
    detail: bits.join('; '),
    paths: [...staleUser, ...stalePlugin, ...neverUser, ...neverPlugin],
    fix: stalePlugin.length + neverPlugin.length > 0 ? 'bun runtime/src/cli.ts update-content' : '/counsel-os:law-refresh',
  };
}

// ── 8. Vault git ────────────────────────────────────────────────────────

export function checkGit(ctx: DoctorContext): Finding {
  const check = 'git';
  if (ctx.git === null) return { check, severity: 'warn', message: 'git is not installed — the vault has no version control', fix: 'install git, then: git -C <vault> init' };
  const inside = ctx.git(['rev-parse', '--is-inside-work-tree'], ctx.vaultRoot);
  if (!inside.ok || inside.out.trim() !== 'true') {
    return { check, severity: 'warn', message: 'not a git repository — no history of your vault', fix: `git -C ${ctx.vaultRoot} init` };
  }
  const status = ctx.git(['status', '--porcelain'], ctx.vaultRoot);
  const uncommitted = status.ok ? status.out.split('\n').filter(l => l.trim() !== '').length : 0;
  const remotes = ctx.git(['remote'], ctx.vaultRoot);
  const remote = remotes.ok ? remotes.out.split('\n').map(l => l.trim()).filter(l => l !== '')[0] : undefined;
  const last = ctx.git(['log', '-1', '--format=%ci %h'], ctx.vaultRoot);
  const lastCommit = last.ok ? last.out.trim() : '';
  const detail = `repo · ${remote === undefined ? 'no remote' : `remote ${remote}`} · ${uncommitted} uncommitted${lastCommit === '' ? '' : ` · last commit ${lastCommit}`}`;
  if (remote === undefined) {
    return { check, severity: 'warn', message: detail, detail: 'no remote — local-only history; a legal vault belongs in a PRIVATE repository', fix: 'gh repo create <name> --private && git -C <vault> remote add origin <url>' };
  }
  if (uncommitted >= 20) {
    return { check, severity: 'warn', message: detail, fix: `git -C <vault> add law/ practice/ ${ctx.cfg.mattersPath}/ memory/ ${ctx.cfg.entitiesPath}/ && git -C <vault> commit -m "Vault checkpoint"` };
  }
  return { check, severity: 'ok', message: detail };
}

// ── 10. Vault consistency (standards ↔ library) ─────────────────────────

/** Standards whose library file is not the same stem. */
const LIBRARY_FOR: Record<string, string> = {
  'ai-data-use': 'ai-and-data-use',
  'assignment-change-of-control': 'assignment-and-change-of-control',
  'termination-renewal': 'termination-and-renewal',
  'service-levels': 'sla-and-performance',
  indemnification: 'liability-and-indemnification',
  'limitation-of-liability': 'liability-and-indemnification',
  'ip-ownership': 'ip-and-confidentiality',
  confidentiality: 'ip-and-confidentiality',
  'compliance-certifications': 'compliance-regulatory',
};

/** Time units only. Percentages and multipliers name different things in
 * the same file (an uptime, a credit, a cap), and comparing them across a
 * standard and a library produced divergences that were not. */
const UNIT_RE = /(\d+(?:\.\d+)?)\)?\s*(hours?|hrs?|days?|months?|years?)\b/gi;

function normalizeUnit(raw: string): string {
  const u = raw.toLowerCase();
  if (u.startsWith('hour') || u.startsWith('hr')) return 'hours';
  if (u.startsWith('day')) return 'days';
  if (u.startsWith('month')) return 'months';
  return 'years';
}

/** `{ unit → numbers }` mentioned in `text`. */
export function unitNumbers(text: string): Map<string, number[]> {
  const out = new Map<string, number[]>();
  for (const m of text.matchAll(UNIT_RE)) {
    const unit = normalizeUnit(m[2]!);
    const list = out.get(unit) ?? [];
    list.push(Number(m[1]));
    out.set(unit, list);
  }
  return out;
}

/** The `## Our Position` block's `Our standard` and `We'll accept` lines. */
export function acceptBand(standard: string): string {
  const block = sectionOf(standard, /^## Our Position\s*$/m, /^## /m);
  return block
    .split('\n')
    .filter(l => /^\*\*(Our standard|We'll accept)/i.test(l.trim()))
    .join('\n');
}

/** The text of every `### <heading>` block named `heading` under any `##`. */
export function libraryBlocks(library: string, heading: string): string {
  const out: string[] = [];
  const lines = library.split('\n');
  let inBlock = false;
  for (const line of lines) {
    if (/^###\s/.test(line)) {
      inBlock = line.replace(/^###\s+/, '').trim().toLowerCase().startsWith(heading.toLowerCase());
      continue;
    }
    if (/^##\s/.test(line)) {
      inBlock = false;
      continue;
    }
    if (inBlock) out.push(line);
  }
  return out.join('\n');
}

function sectionOf(text: string, start: RegExp, end: RegExp): string {
  const s = start.exec(text);
  if (s === null) return '';
  const rest = text.slice(s.index + s[0].length);
  const e = end.exec(rest);
  return e === null ? rest : rest.slice(0, e.index);
}

export interface Divergence {
  topic: string;
  unit: string;
  standardMin: number;
  standardMax: number;
  library: number;
  standardPath: string;
  libraryPath: string;
}

/** A library Minimum Acceptable number outside everything the standard's
 * accept band names for the same unit — a POSSIBLE divergence, reported
 * with both numbers for a person to judge (the skill's Step 10 is
 * judgment; this is the mechanical part of it). */
export function divergences(topic: string, standard: string, library: string, standardPath: string, libraryPath: string): Divergence[] {
  const band = unitNumbers(acceptBand(standard));
  const minimum = unitNumbers(libraryBlocks(library, 'Minimum Acceptable'));
  const out: Divergence[] = [];
  for (const [unit, libNumbers] of minimum) {
    const accepted = band.get(unit);
    if (accepted === undefined || accepted.length === 0) continue;
    const lo = Math.min(...accepted);
    const hi = Math.max(...accepted);
    for (const n of libNumbers) {
      if (n < lo || n > hi) out.push({ topic, unit, standardMin: lo, standardMax: hi, library: n, standardPath, libraryPath });
    }
  }
  return out;
}

export function checkConsistency(ctx: DoctorContext): Finding {
  const check = 'consistency';
  const standardsDir = join(ctx.vaultRoot, 'practice', 'standards');
  const libraryDir = join(ctx.vaultRoot, 'practice', 'library');
  if (!isDir(standardsDir) || !isDir(libraryDir)) return { check, severity: 'ok', message: 'no standards/library pair to compare' };
  let pairs = 0;
  const found: Divergence[] = [];
  for (const name of readdirSync(standardsDir).sort()) {
    if (!name.endsWith('.md') || name === 'index.md') continue;
    const topic = name.replace(/\.md$/, '');
    const libName = `${LIBRARY_FOR[topic] ?? topic}.md`;
    const standard = readText(join(standardsDir, name));
    const library = readText(join(libraryDir, libName));
    if (standard === null || library === null) continue;
    pairs++;
    found.push(...divergences(topic, standard, library, `practice/standards/${name}`, `practice/library/${libName}`));
  }
  const floors = 'law floors are not compared mechanically — ask counsel to check a standard against its law area';
  if (found.length === 0) return { check, severity: 'ok', message: `${pairs} standard/library pairs checked, no numeric divergence`, detail: floors };
  const lines = found.map(d => `${d.topic}: standard accepts ${d.standardMin === d.standardMax ? d.standardMin : `${d.standardMin}–${d.standardMax}`} ${d.unit}, library Minimum Acceptable says ${d.library} ${d.unit} — align or document`);
  return {
    check,
    severity: 'warn',
    message: `${found.length} possible divergence${found.length === 1 ? '' : 's'} across ${pairs} standard/library pairs`,
    detail: [...lines, floors].join('\n'),
    paths: [...new Set(found.flatMap(d => [d.standardPath, d.libraryPath]))],
    fix: 'align the numbers, or note the deliberate split in the file',
  };
}

// ── 11. Matter-aware law impact ─────────────────────────────────────────

interface OpenMatter {
  path: string;
  title: string;
  updated: Date | null;
  areas: string[];
}

function lawAreasOf(raw: string, body: string): string[] {
  const areas: string[] = [];
  const push = (s: string): void => {
    for (const part of s.split(/[,;]/)) {
      const a = part.trim().replace(/^law\//, '').replace(/\/$/, '').toLowerCase();
      if (a !== '' && a !== 'none' && !a.startsWith('none ')) areas.push(a);
    }
  };
  // Frontmatter: `law_areas:` / `law-areas:` as a list or a string.
  const { block } = splitFrontmatterBlock(raw);
  if (block !== null) {
    try {
      const parsed = Bun.YAML.parse(block) as Record<string, unknown> | null;
      const value = parsed?.['law_areas'] ?? parsed?.['law-areas'] ?? parsed?.['law areas'];
      if (Array.isArray(value)) for (const v of value) push(String(v));
      else if (typeof value === 'string') push(value);
    } catch {
      /* odd frontmatter: fall through to the body line */
    }
  }
  // Body: `- **Law areas:** data-privacy, employment` (the remember primitive's line).
  const m = /\*\*Law areas:\*\*\s*(.+)/i.exec(body);
  if (m !== null) push(m[1]!);
  return [...new Set(areas)];
}

function openMatters(ctx: DoctorContext): OpenMatter[] {
  const dir = join(ctx.vaultRoot, ctx.cfg.mattersPath);
  if (!isDir(dir)) return [];
  const files: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith('.')) continue;
    const full = join(dir, name);
    if (name.endsWith('.md') && !isDir(full)) files.push(`${ctx.cfg.mattersPath}/${name}`);
    else if (isDir(full) && existsSync(join(full, 'matter.md'))) files.push(`${ctx.cfg.mattersPath}/${name}/matter.md`);
  }
  const out: OpenMatter[] = [];
  for (const path of files) {
    const text = readText(join(ctx.vaultRoot, path));
    if (text === null) continue;
    const { frontmatter, body } = parseFrontmatter(text);
    const stage = (frontmatter['stage'] ?? '').trim().toLowerCase();
    if (stage !== 'intake' && stage !== 'working') continue;
    const h1 = /^#\s+(.+)$/m.exec(body);
    out.push({ path, title: frontmatter['title']?.trim() || h1?.[1]?.trim() || path, updated: parseIsoDate(frontmatter['updated']), areas: lawAreasOf(text, body) });
  }
  return out;
}

export function checkLawImpact(ctx: DoctorContext): Finding {
  const check = 'law-impact';
  const matters = openMatters(ctx);
  if (matters.length === 0) return { check, severity: 'ok', message: 'no open matters' };
  const newestByArea = new Map<string, Date>();
  for (const f of lawFiles(ctx)) {
    if (f.lastReviewed === null) continue;
    const prev = newestByArea.get(f.area);
    if (prev === undefined || f.lastReviewed.getTime() > prev.getTime()) newestByArea.set(f.area, f.lastReviewed);
  }
  const behind: Array<{ matter: OpenMatter; area: string; reviewed: Date }> = [];
  for (const matter of matters) {
    if (matter.updated === null) continue;
    for (const area of matter.areas) {
      const reviewed = newestByArea.get(area);
      if (reviewed !== undefined && reviewed.getTime() > matter.updated.getTime()) behind.push({ matter, area, reviewed });
    }
  }
  if (behind.length === 0) return { check, severity: 'ok', message: `${matters.length} open matter${matters.length === 1 ? '' : 's'} — none behind a refreshed law area` };
  const iso = (d: Date): string => d.toISOString().slice(0, 10);
  const affected = new Set(behind.map(b => b.matter.path));
  return {
    check,
    severity: 'warn',
    message: `${affected.size} open matter${affected.size === 1 ? '' : 's'} behind refreshed law areas`,
    detail: behind.map(b => `${b.matter.title} (updated ${iso(b.matter.updated!)}) — law/${b.area} refreshed ${iso(b.reviewed)}: review the area's recent changes before the next action`).join('\n'),
    paths: [...affected],
    fix: 'review the listed areas before the next action on each matter',
  };
}

/**
 * Lawyer edits (routing-and-evals spec §7): the one check that writes —
 * it runs the edit scan, which appends to the outcomes record and moves
 * the written record forward, both under `.counsel/`. An edit is
 * information, never a problem, so the finding is always `ok`.
 */
export function checkEditsAfterCounsel(ctx: DoctorContext): Finding {
  const check = 'edits-after-counsel';
  if (!outcomesEnabled(ctx.cfg)) return { check, severity: 'ok', message: 'the local record is off (outcomes: off) — edits after counsel are not tracked' };
  const tracked = Object.keys(readWritten(ctx.vaultRoot).files).length;
  if (tracked === 0) return { check, severity: 'ok', message: 'no files written by counsel yet — nothing to compare' };
  const scan = detectEdits(ctx.vaultRoot, ctx.cfg, { now: ctx.now });
  const noun = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;
  if (scan.edited.length === 0) {
    return { check, severity: 'ok', message: `${noun(scan.checked, 'file')} written by counsel — none edited since the last look` };
  }
  return {
    check,
    severity: 'ok',
    message: `${noun(scan.edited.length, 'file')} edited after counsel since the last look — recorded`,
    detail: scan.edited.map(e => `${e.path}${e.stats === null ? '' : ` (+${e.stats.added} −${e.stats.removed})`}`).join('\n'),
    paths: scan.edited.map(e => e.path),
  };
}

export const ALL_CHECKS: ReadonlyArray<(ctx: DoctorContext) => Finding> = [checkRootConfig, checkStructure, checkLawCurrency, checkGit, checkConsistency, checkLawImpact, checkEditsAfterCounsel];
