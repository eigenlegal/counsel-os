/**
 * ContractNLI (Koreeda & Manning, 2021): 607 NDAs, each read against 17
 * fixed hypotheses — entailed, contradicted, or not mentioned. The import
 * takes the test split: one classification fixture per hypothesis, a
 * `documents[]` entry per NDA whose text lives in the vault.
 *
 * Data: `stanfordnlp.github.io/contract-nli/resources/contract-nli.zip`
 * (CC BY 4.0); the loader keeps `test.json` and leaves the PDFs in the zip.
 */
import { unzipSync } from 'fflate';
import { download, fileNamed, fixtureId, slug, sourceOf, textOf, type BenchmarkFile, type BenchmarkFixtures, type BenchmarkLoader, type FetchOptions, type ToFixturesOptions } from './types';

export const CONTRACT_NLI_URL = 'https://stanfordnlp.github.io/contract-nli/resources/contract-nli.zip';
export const CONTRACT_NLI_FILE = 'test.json';

export const CONTRACT_NLI_CHOICES = ['Entailment', 'Contradiction', 'NotMentioned'] as const;
const ACCEPT: Record<string, string[]> = {
  Entailment: ['entailed', 'entails', 'entail'],
  Contradiction: ['contradicted', 'contradicts', 'contradict'],
  NotMentioned: ['not mentioned', 'not-mentioned', 'notmentioned'],
};

interface NliDocument {
  id: number | string;
  file_name: string;
  text: string;
  annotation_sets: Array<{ annotations: Record<string, { choice: string; spans: number[] }> }>;
}
interface NliSplit {
  documents: NliDocument[];
  labels: Record<string, { short_description: string; hypothesis: string }>;
}

export const contractNli: BenchmarkLoader = {
  id: 'contract-nli',
  name: 'ContractNLI',
  url: 'https://stanfordnlp.github.io/contract-nli/',
  license: 'CC BY 4.0',
  attribution: 'Koreeda & Manning, "ContractNLI: A Dataset for Document-level Natural Language Inference for Contracts" (Findings of EMNLP 2021).',
  redistributable: true,
  tasks: Array.from({ length: 17 }, (_, i) => `nda-${i + 1}`),

  async fetch(opts: FetchOptions = {}): Promise<BenchmarkFile[]> {
    const zip = await download(CONTRACT_NLI_URL, opts);
    const entries = unzipSync(zip, { filter: f => f.name.endsWith(`/${CONTRACT_NLI_FILE}`) || f.name === CONTRACT_NLI_FILE });
    const test = Object.entries(entries).find(([name]) => name.endsWith(CONTRACT_NLI_FILE));
    if (test === undefined) throw new Error(`contract-nli: ${CONTRACT_NLI_FILE} is not in the archive`);
    return [{ path: CONTRACT_NLI_FILE, bytes: test[1] }];
  },

  toFixtures(files: BenchmarkFile[], opts: ToFixturesOptions = {}): BenchmarkFixtures {
    const file = fileNamed(files, CONTRACT_NLI_FILE);
    if (file === undefined) throw new Error(`contract-nli: ${CONTRACT_NLI_FILE} is missing`);
    const split = JSON.parse(textOf(file.bytes)) as NliSplit;
    let docs = split.documents;
    if (opts.subset !== undefined) docs = docs.slice(0, opts.subset);
    const wanted = opts.tasks === undefined || opts.tasks.length === 0 ? Object.keys(split.labels) : opts.tasks.filter(t => t in split.labels);
    const documents: Record<string, string> = {};
    const pathOf = (d: NliDocument): string => `matters/contract-nli/${String(d.id)}-${slug(d.file_name.replace(/\.pdf$/i, ''))}.txt`;
    for (const d of docs) documents[pathOf(d)] = d.text;
    const fixtures = wanted.map(key => {
      const label = split.labels[key]!;
      const entries = docs.flatMap(d => {
        const ann = d.annotation_sets[0]?.annotations[key];
        if (ann === undefined) return [];
        const path = pathOf(d);
        return [
          {
            id: String(d.id),
            task: [
              `Read the non-disclosure agreement at \`${path}\`.`,
              '',
              `Hypothesis: ${label.hypothesis}`,
              '',
              `Does the agreement entail the hypothesis, contradict it, or not mention it? Answer with exactly one of: ${CONTRACT_NLI_CHOICES.join(' | ')}`,
            ].join('\n'),
            expected: { answer: ann.choice, accept: ACCEPT[ann.choice] ?? [] },
          },
        ];
      });
      return {
        id: fixtureId('contract-nli', `${key} ${label.short_description}`),
        title: `ContractNLI · ${key} · ${label.short_description}`,
        vault: 'contract-nli',
        scorer: 'classification',
        source: sourceOf(this),
        documents: entries,
      };
    });
    return { fixtures, documents };
  },
};
