import { describe, expect, test } from 'bun:test';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { zipSync } from 'fflate';
import type { ContentSource } from '../../content/source';
import { loadBenchmarkFixtures, loadFixtures, parseFixture } from '../fixture';
import { selectFixtures } from '../select';
import { prepareFixtureVault } from '../vault-prep';
import { scoreClassification, scoreExtraction } from '../scorers/index';
import { biglawBench } from './biglaw-bench';
import { contractNli, CONTRACT_NLI_FILE, CONTRACT_NLI_URL } from './contract-nli';
import { parseCsv, parseTsv } from './csv';
import { anchorsOf, categoryOf, cuad, CUAD_FILE, CUAD_URL, detailsOf } from './cuad';
import { importBenchmark, importedSets, renderLicenses, writePracticeSeed } from './import';
import { BENCHMARKS, benchmarkById, isBenchmarkId } from './index';
import { fillPrompt, legalbench, LEGALBENCH_CONTRACT_TASKS, LEGALBENCH_DATA, LEGALBENCH_REPO, licenseLineOf } from './legalbench';
import { maud, MAUD_FILE, MAUD_URL } from './maud';
import { fixtureId, NotRedistributableError, slug, type BenchmarkFile } from './types';

const samples = join(import.meta.dir, '__fixtures__');
const read = (rel: string): Uint8Array => new Uint8Array(readFileSync(join(samples, rel)));
const file = (path: string, rel: string): BenchmarkFile => ({ path, bytes: read(rel) });

/** A `fetch` that answers from a map and records what was asked. */
function scriptedFetch(routes: Record<string, Uint8Array | string>): { fetchImpl: typeof fetch; calls: string[] } {
  const calls: string[] = [];
  const fetchImpl = (async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    calls.push(url);
    const hit = routes[url];
    if (hit === undefined) return new Response('not found', { status: 404 });
    return new Response(typeof hit === 'string' ? hit : new Uint8Array(hit), { status: 200 });
  }) as typeof fetch;
  return { fetchImpl, calls };
}

const seedFiles: Record<string, string> = {
  'knowledge/practice-seed/profile.md': '# Practice profile\n',
  'knowledge/practice-seed/standards/README.md': '# Standards\n',
  'knowledge/practice-seed/standards/nda.md': '# NDA standard\n',
  'knowledge/practice-seed/methods/README.md': '# Methods\n',
};
const fakeContent: ContentSource = {
  kind: 'repo',
  list: prefix => Object.keys(seedFiles).filter(p => p === prefix || p.startsWith(`${prefix}/`)).sort(),
  has: p => p in seedFiles,
  read: p => {
    const v = seedFiles[p];
    if (v === undefined) throw new Error(`not shipped: ${p}`);
    return v;
  },
  readBytes: p => new TextEncoder().encode(seedFiles[p] ?? ''),
};

describe('csv', () => {
  test('quoted fields keep commas, newlines and doubled quotes', () => {
    const rows = parseCsv('a,b\r\n"x, y","line1\nline2"\n"say ""hi""",plain\n');
    expect(rows).toEqual([
      { a: 'x, y', b: 'line1\nline2' },
      { a: 'say "hi"', b: 'plain' },
    ]);
  });
  test('tsv keys rows by the header in the file order', () => {
    const rows = parseTsv(new TextDecoder().decode(read('legalbench/cuad_governing_law/test.tsv')));
    expect(rows).toHaveLength(3);
    expect(rows[0]!.index).toBe('0');
    expect(rows[0]!.answer).toBe('Yes');
    expect(rows[0]!.text).toContain('laws of the State of California');
  });
  test('an empty file has no rows', () => {
    expect(parseCsv('')).toEqual([]);
    expect(parseCsv('a,b\n')).toEqual([]);
  });
});

describe('ids', () => {
  test('slug and fixtureId make lowercase dashed ids that parse as fixture ids', () => {
    expect(slug('Accuracy of Target "General" R&W: Bringdown Timing Answer')).toBe('accuracy-of-target-general-r-w-bringdown-timing-answer');
    const id = fixtureId('maud', 'Deal Protection and Related Provisions — Fiduciary exception:  Board determination (no-shop) — Approval', 40);
    expect(id.length).toBeLessThanOrEqual(51);
    expect(id.startsWith('maud-deal-protection')).toBe(true);
    expect(() => parseFixture({ id, scorer: 'classification', expected: { answer: 'x' } })).not.toThrow();
  });

  test('two long names that share a prefix are two ids', () => {
    // Real MAUD questions. An id is a filename: one id would have written
    // one fixture over the other and reported a count that included both.
    const a = fixtureId('maud', 'Deal Protection and Related Provisions Fiduciary exception:  Board determination standard');
    const b = fixtureId('maud', 'Deal Protection and Related Provisions Fiduciary exception: Board determination trigger (No Shop)');
    expect(a).not.toBe(b);
    // And an id is stable for the same name.
    expect(fixtureId('maud', 'Deal Protection and Related Provisions Fiduciary exception:  Board determination standard')).toBe(a);
    for (const id of [a, b]) expect(() => parseFixture({ id, scorer: 'classification', expected: { answer: 'x' } })).not.toThrow();
  });
});

describe('registry', () => {
  test('knows the five sets and their licenses', () => {
    expect(BENCHMARKS.map(b => b.id)).toEqual(['legalbench', 'cuad', 'maud', 'contract-nli', 'biglaw-bench']);
    expect(isBenchmarkId('cuad')).toBe(true);
    expect(isBenchmarkId('harvey')).toBe(false);
    expect(benchmarkById('maud')?.license).toBe('CC BY 4.0');
    expect(benchmarkById('biglaw-bench')?.license).toBeNull();
    expect(benchmarkById('biglaw-bench')?.redistributable).toBe(false);
    for (const b of BENCHMARKS.filter(b => b.redistributable)) expect(b.license).toMatch(/CC BY 4\.0/);
  });
});

describe('legalbench', () => {
  const files = ['test.tsv', 'base_prompt.txt', 'README.md'].map(n => file(`cuad_governing_law/${n}`, `legalbench/cuad_governing_law/${n}`));

  test('reads the per-task license line', () => {
    expect(licenseLineOf('**License**: [CC By 4.0](https://creativecommons.org/licenses/by/4.0/)')).toBe('CC By 4.0 (https://creativecommons.org/licenses/by/4.0/)');
    expect(licenseLineOf('no line here')).toBeNull();
  });

  test('fills every {{column}} of the base prompt', () => {
    expect(fillPrompt('Q?\n\nClause: {{text}}\nLabel:', { text: 'X', answer: 'Yes' })).toBe('Q?\n\nClause: X\nLabel:');
  });

  test('one classification fixture per task, one document per row, the task license recorded', () => {
    const { fixtures, documents } = legalbench.toFixtures(files);
    expect(documents).toEqual({});
    expect(fixtures).toHaveLength(1);
    const f = parseFixture(fixtures[0]);
    expect(f.id).toBe('legalbench-cuad-governing-law');
    expect(f.vault).toBe('legalbench');
    expect(f.scorer).toBe('classification');
    expect(f.source).toMatchObject({ kind: 'benchmark', name: 'LegalBench', license: 'CC By 4.0 (https://creativecommons.org/licenses/by/4.0/)' });
    expect(f.documents).toHaveLength(3);
    const d = f.documents![0]!;
    expect(d.task).toContain("Does the clause specify which state/country's law governs the contract?");
    expect(d.task).toContain('Clause: This Agreement shall be construed in accordance with the laws of the State of California');
    expect(d.task).toMatch(/Label:\n\nAnswer with the label only\.$/);
    expect(d.task).not.toContain('{{');
    expect(scoreClassification(d.expected, { answer: 'yes' }).score).toBe(1);
    expect(scoreClassification(d.expected, { answer: 'No' }).score).toBe(0);
  });

  test('subset and tasks narrow the build; a missing prompt is an error', () => {
    expect(parseFixture(legalbench.toFixtures(files, { subset: 2 }).fixtures[0]).documents).toHaveLength(2);
    expect(legalbench.toFixtures(files, { tasks: ['cuad_insurance'] }).fixtures).toHaveLength(0);
    expect(() => legalbench.toFixtures([files[0]!])).toThrow(/missing test\.tsv or base_prompt\.txt/);
  });

  test('fetch asks for the tsv, the prompt and the README of each task', async () => {
    const task = 'cuad_governing_law';
    const { fetchImpl, calls } = scriptedFetch({
      [`${LEGALBENCH_DATA}/${task}/test.tsv`]: read(`legalbench/${task}/test.tsv`),
      [`${LEGALBENCH_REPO}/${task}/base_prompt.txt`]: read(`legalbench/${task}/base_prompt.txt`),
      [`${LEGALBENCH_REPO}/${task}/README.md`]: read(`legalbench/${task}/README.md`),
    });
    const got = await legalbench.fetch({ tasks: [task], fetchImpl });
    expect(got.map(f => f.path)).toEqual([`${task}/test.tsv`, `${task}/base_prompt.txt`, `${task}/README.md`]);
    expect(calls).toHaveLength(3);
    await expect(legalbench.fetch({ tasks: ['cuad_missing'], fetchImpl })).rejects.toThrow(/HTTP 404/);
  });

  test('the default task list is the three contract families', () => {
    expect(LEGALBENCH_CONTRACT_TASKS).toHaveLength(86);
    expect(legalbench.tasks.every(t => /^(contract_nli|cuad|maud)_/.test(t))).toBe(true);
  });
});

describe('cuad', () => {
  const files = [file(CUAD_FILE, 'cuad/CUAD_v1.json')];

  test('category, details and anchors', () => {
    expect(categoryOf({ id: 'X__Governing Law', question: '', answers: [] })).toBe('Governing Law');
    expect(detailsOf('Highlight the parts (if any) of this contract related to "Parties" that should be reviewed by a lawyer. Details: The two or more parties who signed the contract')).toBe('The two or more parties who signed the contract');
    expect(anchorsOf('short span')).toEqual(['short span']);
    expect(anchorsOf('one two three four five six seven eight nine')).toEqual(['one two three four five six', 'four five six seven eight nine']);
  });

  test('one extraction fixture, a document per contract in the vault, only present categories expected', () => {
    const { fixtures, documents } = cuad.toFixtures(files);
    expect(fixtures).toHaveLength(1);
    const f = parseFixture(fixtures[0]);
    expect(f.id).toBe('cuad-clauses');
    expect(f.scorer).toBe('extraction');
    expect(f.vault).toBe('cuad');
    expect(f.documents).toHaveLength(1);
    const d = f.documents![0]!;
    const path = 'matters/cuad/limeenergyco-09-09-1999-ex-10-distributor-agreement.txt';
    expect(Object.keys(documents)).toEqual([path]);
    expect(documents[path]).toContain('DISTRIBUTOR AGREEMENT');
    expect(d.task).toContain(`Read the contract at \`${path}\`.`);
    expect(d.task).toContain('- Document Name: The name of the contract');
    expect(d.task).toContain('- Notice Period To Terminate Renewal');
    const expected = d.expected as { fields: Record<string, { match_any: string[]; required: boolean }> };
    expect(Object.keys(expected.fields)).toEqual(['Document Name', 'Parties']);
    expect(expected.fields['Parties']!.match_any).toContain('Electric City Corp.');
    expect(scoreExtraction(d.expected, { fields: { 'Document Name': 'DISTRIBUTOR AGREEMENT', Parties: ['Electric City Corp.', 'Electric City of Illinois LLC'] } }).score).toBe(1);
    const padded = scoreExtraction(d.expected, { fields: { 'Document Name': 'DISTRIBUTOR AGREEMENT', Parties: 'Electric City Corp.', 'Governing Law': 'Illinois' } });
    expect(padded.terms.precision).toBeLessThan(1);
  });

  test('fetch takes the one JSON file', async () => {
    const { fetchImpl, calls } = scriptedFetch({ [CUAD_URL]: read('cuad/CUAD_v1.json') });
    const got = await cuad.fetch({ fetchImpl });
    expect(got.map(f => f.path)).toEqual([CUAD_FILE]);
    expect(calls).toEqual([CUAD_URL]);
  });
});

describe('maud', () => {
  const files = [file(MAUD_FILE, 'maud/MAUD_test.csv')];

  test('one classification fixture per question with the split’s choices as the answer set', () => {
    const { fixtures, documents } = maud.toFixtures(files);
    expect(documents).toEqual({});
    const parsed = fixtures.map(f => parseFixture(f));
    expect(parsed.length).toBeGreaterThanOrEqual(1);
    const consideration = parsed.find(f => f.id.startsWith('maud-general-information-type-of-consideration'));
    expect(consideration).toBeDefined();
    expect(consideration!.scorer).toBe('classification');
    expect(consideration!.vault).toBe('maud');
    const d = consideration!.documents![0]!;
    // The contract, not MAUD's question index: the scoreboard keys a cell on
    // `<fixture>#<document>`, so one id for every row would collapse a
    // whole benchmark fixture into a single cell.
    expect(consideration!.documents!.map(x => x.id)).toEqual(['contract-141', 'contract-57', 'contract-9']);
    expect(d.task).toContain('Question: Type of Consideration-Answer');
    expect(d.task).toContain('Answer with exactly one of: All Cash');
    expect(d.task).toContain('Conversion of Company Common Stock');
    expect(scoreClassification(d.expected, { answer: 'All Cash' }).score).toBe(1);
  });

  test('tasks filters by category and subset caps rows per question', () => {
    expect(maud.toFixtures(files, { tasks: ['Remedies'] }).fixtures).toHaveLength(0);
    const one = maud.toFixtures(files, { tasks: ['General Information'], subset: 1 }).fixtures.map(f => parseFixture(f));
    expect(one.length).toBeGreaterThanOrEqual(1);
    for (const f of one) expect(f.documents!.length).toBeLessThanOrEqual(1);
  });

  test('fetch takes the test csv', async () => {
    const { fetchImpl } = scriptedFetch({ [MAUD_URL]: read('maud/MAUD_test.csv') });
    expect((await maud.fetch({ fetchImpl })).map(f => f.path)).toEqual([MAUD_FILE]);
  });
});

describe('contract-nli', () => {
  const files = [file(CONTRACT_NLI_FILE, 'contract-nli/test.json')];

  test('one classification fixture per hypothesis; the NDA text lives in the vault', () => {
    const { fixtures, documents } = contractNli.toFixtures(files);
    const parsed = fixtures.map(f => parseFixture(f));
    expect(parsed.map(f => f.id)).toEqual(['contract-nli-nda-1-explicit-identification', 'contract-nli-nda-11-no-reverse-engineering']);
    const paths = Object.keys(documents);
    expect(paths).toHaveLength(1);
    expect(paths[0]).toMatch(/^matters\/contract-nli\/\d+-064-19-non-disclosure-agreement-2019\.txt$/);
    const d = parsed[0]!.documents![0]!;
    expect(d.task).toContain(`Read the non-disclosure agreement at \`${paths[0]}\`.`);
    expect(d.task).toContain('Hypothesis: All Confidential Information shall be expressly identified by the Disclosing Party.');
    expect(d.task).toContain('Entailment | Contradiction | NotMentioned');
    expect(d.expected).toEqual({ answer: 'Contradiction', accept: ['contradicted', 'contradicts', 'contradict'] });
    expect(scoreClassification(d.expected, { answer: 'contradiction' }).score).toBe(1);
    expect(scoreClassification(parsed[1]!.documents![0]!.expected, { answer: 'Not mentioned' }).score).toBe(1);
  });

  test('tasks names hypotheses; unknown ones are dropped', () => {
    expect(contractNli.toFixtures(files, { tasks: ['nda-11', 'nda-99'] }).fixtures.map(f => (f as { id: string }).id)).toEqual(['contract-nli-nda-11-no-reverse-engineering']);
  });

  test('fetch unzips only test.json out of the archive', async () => {
    const zip = zipSync({
      'contract-nli/test.json': read('contract-nli/test.json'),
      'contract-nli/train.json': new TextEncoder().encode('{"documents":[],"labels":{}}'),
      'contract-nli/raw/x.pdf': new Uint8Array([1, 2, 3]),
    });
    const { fetchImpl } = scriptedFetch({ [CONTRACT_NLI_URL]: zip });
    const got = await contractNli.fetch({ fetchImpl });
    expect(got.map(f => f.path)).toEqual([CONTRACT_NLI_FILE]);
    expect(JSON.parse(new TextDecoder().decode(got[0]!.bytes)).documents).toHaveLength(1);
  });
});

describe('biglaw-bench', () => {
  test('imports nothing and says why', async () => {
    expect(biglawBench.redistributable).toBe(false);
    await expect(biglawBench.fetch()).rejects.toBeInstanceOf(NotRedistributableError);
    let message = '';
    try {
      biglawBench.toFixtures([]);
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain('BigLaw Bench cannot be imported');
    expect(message).toContain('no license');
    expect(message).toContain('https://github.com/harveyai/biglaw-bench');
  });
});

describe('import', () => {
  const tmp = (): string => mkdtempSync(join(tmpdir(), 'counsel-bench-'));

  test('writes fixtures, the vault with the seed and documents, the raw cache, and LICENSES.md', async () => {
    const dest = tmp();
    try {
      const { fetchImpl, calls } = scriptedFetch({ [CUAD_URL]: read('cuad/CUAD_v1.json') });
      const log: string[] = [];
      const report = await importBenchmark({ loader: cuad, dest, content: fakeContent, fetchImpl, log: l => log.push(l) });
      expect(report).toMatchObject({ set: 'cuad', fixtures: 1, items: 1, vaultDocuments: 1, fromCache: false });
      expect(readdirSync(report.fixturesDir)).toEqual(['cuad-clauses.json']);
      expect(existsSync(join(dest, 'cuad', 'raw', CUAD_FILE))).toBe(true);
      expect(readFileSync(join(report.vaultDir, 'config.md'), 'utf8')).toContain('legal_root: __VAULT_PATH__');
      expect(readFileSync(join(report.vaultDir, 'practice', 'standards', 'nda.md'), 'utf8')).toBe('# NDA standard\n');
      expect(readFileSync(join(report.vaultDir, 'practice', 'profile.md'), 'utf8')).toBe('# Practice profile\n');
      expect(readdirSync(join(report.vaultDir, 'matters', 'cuad'))).toHaveLength(1);
      const licenses = readFileSync(report.licensesPath, 'utf8');
      expect(licenses).toContain('## CUAD (`cuad`)');
      expect(licenses).toContain('- License: CC BY 4.0');
      expect(licenses).toContain('Hendrycks');
      expect(calls).toEqual([CUAD_URL]);

      // The second import reuses the cache and touches the network not at all.
      const again = await importBenchmark({ loader: cuad, dest, content: fakeContent, fetchImpl, subset: 1 });
      expect(again.fromCache).toBe(true);
      expect(calls).toHaveLength(1);
      // --refresh fetches again.
      await importBenchmark({ loader: cuad, dest, content: fakeContent, fetchImpl, refresh: true });
      expect(calls).toHaveLength(2);
    } finally {
      rmSync(dest, { recursive: true, force: true });
    }
  });

  test('the imported set loads, selects by set, and its vault prepares for a run', async () => {
    const dest = tmp();
    try {
      const { fetchImpl } = scriptedFetch({ [CONTRACT_NLI_URL]: zipSync({ 'contract-nli/test.json': read('contract-nli/test.json') }) });
      await importBenchmark({ loader: contractNli, dest, content: fakeContent, fetchImpl });
      const loaded = loadBenchmarkFixtures(dest);
      expect(loaded.map(l => l.fixture.id)).toEqual(['contract-nli-nda-1-explicit-identification', 'contract-nli-nda-11-no-reverse-engineering']);
      expect(loaded[0]!.set).toBe('benchmark');
      expect(loaded[0]!.vaults).toEqual({ kind: 'dir', dir: join(dest, 'contract-nli', 'vaults') });

      const everything = loadFixtures({ content: join(dest, 'no-such-repo'), benchmarksDir: dest });
      expect(everything).toHaveLength(2);
      const sel = selectFixtures(everything, { set: 'benchmark' });
      expect(sel.error).toBeUndefined();
      expect(sel.fixtures).toHaveLength(2);
      expect(selectFixtures(everything, { set: 'shipped' }).error).toBe('no shipped fixtures');
      expect(selectFixtures([], { set: 'benchmark' }).error).toMatch(/no benchmark is imported/);
      expect(selectFixtures(everything, { set: 'benchmark', fixtures: ['contract-nli-nda-11-no-reverse-engineering'] }).fixtures).toHaveLength(1);

      const prepared = prepareFixtureVault(loaded[0]!);
      try {
        expect(readFileSync(join(prepared.vault, 'config.md'), 'utf8')).toContain(`legal_root: ${prepared.vault}`);
        const doc = Object.keys(loaded[0]!.fixture.documents![0]!).length;
        expect(doc).toBeGreaterThan(0);
        const path = /`(matters\/contract-nli\/[^`]+)`/.exec(loaded[0]!.fixture.documents![0]!.task!)![1]!;
        expect(existsSync(join(prepared.vault, path))).toBe(true);
      } finally {
        prepared.remove();
      }
    } finally {
      rmSync(dest, { recursive: true, force: true });
    }
  });

  test('a non-redistributable set is refused before any fetch', async () => {
    const dest = tmp();
    try {
      const { fetchImpl, calls } = scriptedFetch({});
      await expect(importBenchmark({ loader: biglawBench, dest, content: fakeContent, fetchImpl })).rejects.toBeInstanceOf(NotRedistributableError);
      expect(calls).toEqual([]);
      expect(existsSync(join(dest, 'biglaw-bench'))).toBe(false);
    } finally {
      rmSync(dest, { recursive: true, force: true });
    }
  });

  test('tasks that match nothing is an error, not an empty set', async () => {
    const dest = tmp();
    try {
      const { fetchImpl } = scriptedFetch({ [MAUD_URL]: read('maud/MAUD_test.csv') });
      await expect(importBenchmark({ loader: maud, dest, content: fakeContent, fetchImpl, tasks: ['Remedies'] })).rejects.toThrow(/nothing to import for tasks Remedies/);
    } finally {
      rmSync(dest, { recursive: true, force: true });
    }
  });

  test('LICENSES.md reflects what is on disk and lists the per-task licenses', () => {
    const dest = tmp();
    try {
      expect(renderLicenses([])).toContain('No benchmark is imported.');
      const { fixtures } = legalbench.toFixtures(['test.tsv', 'base_prompt.txt', 'README.md'].map(n => file(`cuad_governing_law/${n}`, `legalbench/cuad_governing_law/${n}`)));
      const dir = join(dest, 'legalbench', 'fixtures');
      require('node:fs').mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'a.json'), JSON.stringify(fixtures[0]));
      const sets = importedSets(dest);
      expect(sets).toHaveLength(1);
      expect(sets[0]).toMatchObject({ set: 'legalbench', fixtures: 1, items: 3, licenses: ['CC By 4.0 (https://creativecommons.org/licenses/by/4.0/)'] });
      const text = renderLicenses(sets, new Date('2026-09-02T00:00:00Z'));
      expect(text).toContain('on 2026-09-02');
      expect(text).toContain('## LegalBench (`legalbench`)');
      expect(text).toContain('Guha et al.');
    } finally {
      rmSync(dest, { recursive: true, force: true });
    }
  });

  test('writePracticeSeed lays the seed out the way init does', () => {
    const dest = tmp();
    try {
      expect(writePracticeSeed(dest, fakeContent)).toBe(4);
      expect(readdirSync(join(dest, 'practice')).sort()).toEqual(['methods', 'profile.md', 'standards']);
    } finally {
      rmSync(dest, { recursive: true, force: true });
    }
  });
});

describe('what an import refuses and what it caches', () => {
  const scratch = (): string => mkdtempSync(join(tmpdir(), 'counsel-bench-'));

  test('an unknown --tasks value is refused before anything is fetched or written', async () => {
    const dest = join(scratch(), 'benchmarks');
    try {
      let fetched = 0;
      const fetchImpl = (async () => {
        fetched += 1;
        return new Response(new Uint8Array());
      }) as unknown as typeof fetch;
      // The value reaches a path in the raw cache, so it is checked first.
      await expect(importBenchmark({ loader: legalbench, dest, content: fakeContent, fetchImpl, tasks: ['../../../../pwned'] })).rejects.toThrow(/no such task/);
      await expect(importBenchmark({ loader: cuad, dest, content: fakeContent, fetchImpl, tasks: ['governing_law'] })).rejects.toThrow(/imports as one set/);
      expect(fetched).toBe(0);
      expect(existsSync(dest)).toBe(false);
    } finally {
      rmSync(dest, { recursive: true, force: true });
    }
  });

  test('a wider import does not reuse a narrower download', async () => {
    const dest = scratch();
    try {
      const answer = {
        [`${LEGALBENCH_DATA}/cuad_governing_law/test.tsv`]: read('legalbench/cuad_governing_law/test.tsv'),
        [`${LEGALBENCH_REPO}/cuad_governing_law/base_prompt.txt`]: read('legalbench/cuad_governing_law/base_prompt.txt'),
        [`${LEGALBENCH_REPO}/cuad_governing_law/README.md`]: read('legalbench/cuad_governing_law/README.md'),
        [`${LEGALBENCH_DATA}/cuad_effective_date/test.tsv`]: read('legalbench/cuad_governing_law/test.tsv'),
        [`${LEGALBENCH_REPO}/cuad_effective_date/base_prompt.txt`]: read('legalbench/cuad_governing_law/base_prompt.txt'),
        [`${LEGALBENCH_REPO}/cuad_effective_date/README.md`]: read('legalbench/cuad_governing_law/README.md'),
      };
      const { fetchImpl } = scriptedFetch(answer);
      const first = await importBenchmark({ loader: legalbench, dest, content: fakeContent, fetchImpl, tasks: ['cuad_governing_law'] });
      expect(first.fixtures).toBe(1);
      const second = await importBenchmark({ loader: legalbench, dest, content: fakeContent, fetchImpl, tasks: ['cuad_governing_law', 'cuad_effective_date'] });
      // The narrower cache held one task; asking for two has to fetch again.
      expect(second.fromCache).toBe(false);
      expect(second.fixtures).toBe(2);
      // And asking for the same one again is served from the cache.
      expect((await importBenchmark({ loader: legalbench, dest, content: fakeContent, fetchImpl, tasks: ['cuad_governing_law'] })).fromCache).toBe(true);
    } finally {
      rmSync(dest, { recursive: true, force: true });
    }
  });
});

