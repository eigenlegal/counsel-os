/**
 * CUAD (Hendrycks et al., 2021): 510 commercial contracts, each annotated
 * for 41 clause categories, published SQuAD-style — one paragraph per
 * contract, one question per category, the answers the annotated spans.
 * The import is one extraction fixture: a `documents[]` entry per contract
 * whose text lives in the vault, the task naming every category, `expected`
 * naming only those the contract has (the runner's precision term charges
 * for the rest).
 *
 * Data: `huggingface.co/datasets/theatticusproject/cuad` (CC BY 4.0),
 * `CUAD_v1/CUAD_v1.json`.
 */
import { download, fileNamed, slug, sourceOf, textOf, type BenchmarkFile, type BenchmarkFixtures, type BenchmarkLoader, type FetchOptions, type ToFixturesOptions } from './types';

export const CUAD_URL = 'https://huggingface.co/datasets/theatticusproject/cuad/resolve/main/CUAD_v1/CUAD_v1.json';
export const CUAD_FILE = 'CUAD_v1.json';

interface SquadQa {
  id: string;
  question: string;
  answers: Array<{ text: string; answer_start?: number }>;
  is_impossible?: boolean;
}
interface Squad {
  data: Array<{ title: string; paragraphs: Array<{ context: string; qas: SquadQa[] }> }>;
}

/** `<title>__<Category>` → the category. */
export function categoryOf(qa: SquadQa): string {
  const i = qa.id.lastIndexOf('__');
  return i === -1 ? qa.id : qa.id.slice(i + 2);
}

/** The `Details: …` tail of a CUAD question. */
export function detailsOf(question: string): string {
  const m = /Details:\s*(.+)$/s.exec(question);
  return m === null ? '' : m[1]!.trim();
}

/** The words a quoted span must carry to count: its first and last six
 * words, either one enough. A model that quotes the clause quotes one of
 * them; a whole-span match would fail on every wrapped line. */
export function anchorsOf(span: string): string[] {
  const words = span.replace(/\s+/g, ' ').trim().split(' ');
  if (words.length <= 6) return [words.join(' ')];
  return [...new Set([words.slice(0, 6).join(' '), words.slice(-6).join(' ')])];
}

export const cuad: BenchmarkLoader = {
  id: 'cuad',
  name: 'CUAD',
  url: 'https://huggingface.co/datasets/theatticusproject/cuad',
  license: 'CC BY 4.0',
  attribution: 'Hendrycks, Burns, Chen, Ball, "CUAD: An Expert-Annotated NLP Dataset for Legal Contract Review" (NeurIPS 2021 Datasets and Benchmarks). The Atticus Project.',
  redistributable: true,
  // CUAD imports whole: one extraction fixture over all 41 clause
  // categories. `--tasks` is refused rather than accepted and ignored.
  tasks: ['clauses'],
  tasksSelectable: false,

  async fetch(opts: FetchOptions = {}): Promise<BenchmarkFile[]> {
    return [{ path: CUAD_FILE, bytes: await download(CUAD_URL, opts) }];
  },

  toFixtures(files: BenchmarkFile[], opts: ToFixturesOptions = {}): BenchmarkFixtures {
    const file = fileNamed(files, CUAD_FILE);
    if (file === undefined) throw new Error(`cuad: ${CUAD_FILE} is missing`);
    const squad = JSON.parse(textOf(file.bytes)) as Squad;
    let contracts = squad.data;
    if (opts.subset !== undefined) contracts = contracts.slice(0, opts.subset);
    const documents: Record<string, string> = {};
    const entries = contracts.map(c => {
      const para = c.paragraphs[0];
      if (para === undefined) throw new Error(`cuad: contract ${c.title} has no paragraph`);
      const id = slug(c.title);
      const path = `matters/cuad/${id}.txt`;
      documents[path] = para.context;
      const categories = para.qas.map(q => ({ name: categoryOf(q), details: detailsOf(q.question), answers: q.answers.map(a => a.text).filter(t => t.trim() !== '') }));
      const fields: Record<string, { match_any: string[]; required: boolean }> = {};
      for (const cat of categories) {
        if (cat.answers.length === 0) continue;
        fields[cat.name] = { match_any: [...new Set(cat.answers.flatMap(anchorsOf))], required: true };
      }
      const list = categories.map(cat => `- ${cat.name}${cat.details === '' ? '' : `: ${cat.details}`}`).join('\n');
      return {
        id,
        task: [
          `Read the contract at \`${path}\`.`,
          'For each clause category below that the contract contains, quote the clause text (the sentence or provision itself, not a paraphrase) in `fields`, keyed by the category name exactly as written here. Omit every category the contract does not contain; do not add other keys.',
          '',
          'Categories:',
          list,
        ].join('\n'),
        expected: { fields },
      };
    });
    return {
      fixtures: [
        {
          id: 'cuad-clauses',
          title: 'CUAD · clause extraction',
          vault: 'cuad',
          scorer: 'extraction',
          source: sourceOf(this),
          documents: entries,
        },
      ],
      documents,
    };
  },
};
