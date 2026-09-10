import { boundedWordPackage } from './word-package';
import { modelOf, textOf, descendants, isW } from '../docx/model';
import { diffRounds } from '../docx/rounds';
import { extractRedlines } from '../docx/extract';
import type { RoundDocument, DocumentRoundReport } from './document-rounds';

export async function runRoundsWorker(): Promise<void> {
globalThis.fetch = Object.assign(async () => { throw new Error('External resources are not fetched.'); }, { preconnect: () => {} });
try {
  const raw = JSON.parse(await new Response(Bun.stdin.stream()).text()) as Array<RoundDocument & { bytes: string }>;
  if (!Array.isArray(raw) || raw.length < 2 || raw.length > 3) throw new Error('Select two or three document versions.');
  const documents = raw.map(({ bytes, ...metadata }) => {
    const pkg = boundedWordPackage(Buffer.from(bytes, 'base64'));
    if ([...descendants(pkg.part('word/document.xml').documentElement!)].some(el => isW(el, 'moveFrom') || isW(el, 'moveTo')))
      throw new Error('This version contains tracked moves, which this comparison cannot classify reliably. Review the moves in Word first.');
    const paragraphs = modelOf(pkg).paragraphs;
    if (paragraphs.length > 600 || paragraphs.reduce((n, p) => n + textOf(p, 'accept').length + textOf(p, 'reject').length, 0) > 300_000)
      throw new Error('This comparison supports up to 600 paragraphs and 300,000 characters per document. Compare a smaller section.');
    return { metadata, pkg, extraction: extractRedlines(pkg, metadata.title) };
  });
  const sent = documents.find(d => d.metadata.role === 'sent'), returned = documents.find(d => d.metadata.role === 'returned'), baseline = documents.find(d => d.metadata.role === 'baseline');
  if (!sent || !returned || new Set(documents.map(d => d.metadata.role)).size !== documents.length) throw new Error('Choose distinct sent, returned and optional baseline versions.');
  const result = diffRounds({ ours: sent.pkg, theirs: returned.pkg, base: baseline?.pkg,
    names: { ours: sent.metadata.title, theirs: returned.metadata.title, base: baseline?.metadata.title } });
  const warnings = ['Text comparison of main-document paragraphs, including table text—not a layout, field, signature or legal-effect verification. “Retained” describes text, not agreement or approval.'];
  if (!baseline) warnings.push('No pre-edit baseline supplied. Some changes cannot be attributed and silent acceptance is not reliably detectable.');
  for (const doc of documents) {
    warnings.push(...doc.extraction.warnings.map(w => `${doc.metadata.role}: ${w}`));
    if (doc.extraction.summary.non_body_insertions || doc.extraction.summary.non_body_deletions)
      warnings.push(`${doc.metadata.role}: tracked changes outside the main document are not included in paragraph classifications.`);
  }
  const findings = result.findings.slice(0, 40).map(f => ({ ...f,
    our_text: f.our_text.slice(0, 3000), their_original: f.their_original.slice(0, 3000),
    their_revised: f.their_revised.slice(0, 3000), base_text: f.base_text?.slice(0, 3000) ?? null }));
  const limited = result.findings.length > 40 || result.comments.length > 40 || result.comments.some(c => 'text' in c && (c.text.length > 3000 || c.anchor_excerpt.length > 3000))
    || result.findings.some(f => [f.our_text, f.their_original, f.their_revised, f.base_text ?? ''].some(t => t.length > 3000));
  if (limited) warnings.push('The report is shortened to 40 findings/comments and 3,000 characters per passage. Summary counts cover all compared paragraphs; inspect the originals for omitted text.');
  const comments = result.comments.slice(0, 40).map(c => 'text' in c ? { ...c, text: c.text.slice(0, 3000), anchor_excerpt: c.anchor_excerpt.slice(0, 3000) } : c);
  const report: DocumentRoundReport = { documents: documents.map(d => d.metadata), summary: result.summary, findings, comments, limited, warnings: [...new Set(warnings)].slice(0, 30) };
  console.log(JSON.stringify(report));
} catch (error) { console.log(JSON.stringify({ error: error instanceof Error ? error.message : 'Word comparison failed.' })); }
}
if (import.meta.main) await runRoundsWorker();
