/**
 * The findings scorer — a port of `scripts/run_evals.py` (`score_fixture`,
 * lines 141-173) plus the severity band rule from the spec (§4.1).
 *
 * Matching is the Python's: every finding is flattened to one lowercase,
 * whitespace-collapsed string over `id, title, severity, clause, rationale,
 * why, citations`, and an expected catch is hit when any `match_any` term is
 * a substring of any finding's text. New here: the hit must also land on a
 * finding whose severity is within one band of the catch's (red↔yellow,
 * yellow↔green) unless the catch says `severity: any` or names none.
 *
 * Aggregate: recall 0.45 · precision guard 0.25 · citation coverage 0.20 ·
 * hallucination 0.10. The guard and the hallucination term are cliffs, as
 * before: one negative-check hit or one citation outside the allowed aliases
 * zeroes the term.
 */
import type { Fixture, FixtureDocument } from '../fixture';
import { containsAny, normalize, weighted, type ScoreContext, type ScoreResult } from './types';

export const FINDINGS_WEIGHTS = { recall: 0.45, precision_guard: 0.25, citation_coverage: 0.2, hallucination_score: 0.1 } as const;

const BAND: Record<string, number> = { red: 0, yellow: 1, green: 2 };

export interface Finding {
  id?: string;
  title?: string;
  severity?: string;
  clause?: string;
  rationale?: string;
  why?: string;
  citations?: unknown[];
}

export interface FindingsOutput {
  findings?: Finding[];
  citations?: unknown[];
}

function findingText(f: Finding): string {
  return normalize(
    [f.id ?? '', f.title ?? '', f.severity ?? '', f.clause ?? '', f.rationale ?? '', f.why ?? '', (f.citations ?? []).map(String).join(' ')].join(' '),
  );
}

function outputCitations(out: FindingsOutput): string[] {
  const list = (out.citations ?? []).map(String);
  for (const f of out.findings ?? []) list.push(...(f.citations ?? []).map(String));
  return list;
}

function withinBand(expected: string | undefined, actual: string | undefined): boolean {
  if (expected === undefined || expected === 'any') return true;
  const e = BAND[expected];
  const a = BAND[normalize(actual)];
  if (e === undefined) return true;
  if (a === undefined) return false;
  return Math.abs(e - a) <= 1;
}

export interface FindingsDetail {
  matched_catches: string[];
  missed_catches: string[];
  /** Hit on the words but on a finding whose severity was too far off. */
  wrong_band: string[];
  false_positives: string[];
  matched_citations: string[];
  missed_citations: string[];
  unknown_citations: string[];
}

type Block = Pick<Fixture, 'expected_catches' | 'negative_checks' | 'expected_citations' | 'allowed_citation_aliases'>;

export function scoreFindings(block: Block | Fixture | FixtureDocument, raw: unknown, ctx: ScoreContext = {}): ScoreResult & { detail: FindingsDetail } {
  const out = (typeof raw === 'object' && raw !== null ? raw : {}) as FindingsOutput;
  const findings = Array.isArray(out.findings) ? out.findings : [];
  const texts = findings.map(f => ({ text: findingText(f), severity: f.severity }));

  const matched: string[] = [];
  const missed: string[] = [];
  const wrongBand: string[] = [];
  for (const expected of block.expected_catches ?? []) {
    const hits = texts.filter(t => containsAny(t.text, expected.match_any));
    if (hits.length === 0) {
      missed.push(expected.id);
      continue;
    }
    if (hits.some(t => withinBand(expected.severity, t.severity))) matched.push(expected.id);
    else {
      missed.push(expected.id);
      wrongBand.push(expected.id);
    }
  }

  const falsePositives = (block.negative_checks ?? [])
    .filter(n => n.match_any.length > 0 && texts.some(t => containsAny(t.text, n.match_any)))
    .map(n => n.id);

  const citations = outputCitations(out);
  const citationText = normalize(citations.join(' '));
  const matchedCitations: string[] = [];
  const missedCitations: string[] = [];
  for (const expected of block.expected_citations ?? []) {
    if (containsAny(citationText, expected.aliases)) matchedCitations.push(expected.id);
    else missedCitations.push(expected.id);
  }
  const allowed = (block.allowed_citation_aliases ?? []).map(normalize);
  const unknown = citations.filter(c => {
    const n = normalize(c);
    return n !== '' && !allowed.some(alias => n.includes(alias));
  });

  const expectedCount = (block.expected_catches ?? []).length;
  const citationCount = (block.expected_citations ?? []).length;
  const terms = {
    recall: expectedCount === 0 ? 1 : matched.length / expectedCount,
    precision_guard: falsePositives.length === 0 ? 1 : 0,
    citation_coverage: citationCount === 0 ? 1 : matchedCitations.length / citationCount,
    hallucination_score: unknown.length === 0 ? 1 : 0,
  };
  const notes: string[] = [];
  if (missed.length > 0) notes.push(`Missed: ${missed.join(', ')}.`);
  if (wrongBand.length > 0) notes.push(`Found but at the wrong severity: ${wrongBand.join(', ')}.`);
  if (falsePositives.length > 0) notes.push(`Flagged what it should not have: ${falsePositives.join(', ')}.`);
  if (missedCitations.length > 0) notes.push(`Did not cite: ${missedCitations.join(', ')}.`);
  if (unknown.length > 0) notes.push(`Cited outside the allowed set: ${unknown.slice(0, 5).join('; ')}${unknown.length > 5 ? '…' : ''}.`);

  const weights = ctx.weights ?? ('weights' in block ? (block as Fixture).weights : undefined);
  return {
    score: weighted(terms, FINDINGS_WEIGHTS, weights),
    terms,
    notes,
    detail: {
      matched_catches: matched,
      missed_catches: missed,
      wrong_band: wrongBand,
      false_positives: falsePositives,
      matched_citations: matchedCitations,
      missed_citations: missedCitations,
      unknown_citations: unknown,
    },
  };
}
