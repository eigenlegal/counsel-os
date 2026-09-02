/**
 * MAUD (Wang et al., 2023): 152 public merger agreements read against the
 * ABA's deal-points questions — 144 questions in seven categories, each a
 * clause plus a multiple-choice answer. The import is one classification
 * fixture per question, a `documents[]` entry per clause, the choices the
 * distinct answers the split holds for that question. Only the `main`
 * rows (the full clause) are kept; `abridged` repeats them shortened.
 *
 * Data: `huggingface.co/datasets/theatticusproject/maud` (CC BY 4.0),
 * `MAUD_v1/MAUD_test.csv`. `--tasks` names categories.
 */
import { parseCsv } from './csv';
import { download, fileNamed, fixtureId, slug, sourceOf, textOf, type BenchmarkFile, type BenchmarkFixtures, type BenchmarkLoader, type FetchOptions, type ToFixturesOptions } from './types';

export const MAUD_URL = 'https://huggingface.co/datasets/theatticusproject/maud/resolve/main/MAUD_v1/MAUD_test.csv';
export const MAUD_FILE = 'MAUD_test.csv';

export const MAUD_CATEGORIES: readonly string[] = [
  'General Information',
  'Conditions to Closing',
  'Material Adverse Effect',
  'Knowledge',
  'Deal Protection and Related Provisions',
  'Operating and Efforts Covenant',
  'Remedies',
];

export interface MaudRow {
  data_type: string;
  contract_name: string;
  text: string;
  answer: string;
  question: string;
  subquestion: string;
  text_type: string;
  id: string;
  category: string;
}

function questionKey(r: MaudRow): string {
  return r.subquestion === '' || r.subquestion === '<NONE>' ? r.question : `${r.question} — ${r.subquestion}`;
}

/** `id`, or `id-2`, `id-3`… — one document id, whatever the split repeats. */
function unique(id: string, seen: Set<string>): string {
  let out = id;
  for (let n = 2; seen.has(out); n++) out = `${id}-${n}`;
  seen.add(out);
  return out;
}

export const maud: BenchmarkLoader = {
  id: 'maud',
  name: 'MAUD',
  url: 'https://huggingface.co/datasets/theatticusproject/maud',
  license: 'CC BY 4.0',
  attribution: 'Wang, Hendrycks, et al., "MAUD: An Expert-Annotated Legal NLP Dataset for Merger Agreement Understanding" (EMNLP 2023). The Atticus Project.',
  redistributable: true,
  // One file, whatever `--tasks` asks for: the cache covers everything.
  downloadsWholeSet: true,
  tasks: [...MAUD_CATEGORIES],

  async fetch(opts: FetchOptions = {}): Promise<BenchmarkFile[]> {
    return [{ path: MAUD_FILE, bytes: await download(MAUD_URL, opts) }];
  },

  toFixtures(files: BenchmarkFile[], opts: ToFixturesOptions = {}): BenchmarkFixtures {
    const file = fileNamed(files, MAUD_FILE);
    if (file === undefined) throw new Error(`maud: ${MAUD_FILE} is missing`);
    const wanted = opts.tasks === undefined || opts.tasks.length === 0 ? null : new Set(opts.tasks);
    const rows = (parseCsv(textOf(file.bytes)) as unknown as MaudRow[]).filter(r => r.data_type === 'main' && (wanted === null || wanted.has(r.category)));
    const byQuestion = new Map<string, MaudRow[]>();
    for (const r of rows) {
      const k = questionKey(r);
      const list = byQuestion.get(k);
      if (list === undefined) byQuestion.set(k, [r]);
      else list.push(r);
    }
    const fixtures: Record<string, unknown>[] = [];
    for (const [question, all] of byQuestion) {
      const choices = [...new Set(all.map(r => r.answer))].sort();
      const items = opts.subset === undefined ? all : all.slice(0, opts.subset);
      const first = all[0]!;
      // Per fixture: a document id only has to be unique inside its own.
      const seen = new Set<string>();
      fixtures.push({
        id: fixtureId('maud', `${first.category} ${question}`),
        title: `MAUD · ${first.category} · ${question}`,
        vault: 'maud',
        scorer: 'classification',
        source: sourceOf(this),
        documents: items.map((r, i) => ({
          // The contract, not MAUD's `id` column — that is the question's
          // index, the same value on every row of this fixture. The
          // scoreboard keys a cell on `<fixture>#<document>`, so identical
          // ids would collapse a 20-contract fixture into one cell. Two
          // rows of one contract (a second annotated span) keep their
          // order as the tie-break.
          id: unique(slug(r.contract_name) === '' ? `row-${i + 1}` : slug(r.contract_name), seen),
          task: [
            'The following provision is from a public company merger agreement.',
            '',
            r.text,
            '',
            `Question: ${question}`,
            `Answer with exactly one of: ${choices.join(' | ')}`,
          ].join('\n'),
          expected: { answer: r.answer },
        })),
      });
    }
    return { fixtures, documents: {} };
  },
};
