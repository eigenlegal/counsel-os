import { beforeEach, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FsVaultStore } from './fs-store';
import { MAX_MATTERS, MAX_MATTER_BYTES, parseFrontmatter, prettifyName, titleOf, vaultOverview } from './overview';

const CFG = { entitiesPath: 'entities', mattersPath: 'matters' };

let root: string;
let store: FsVaultStore;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'overview-'));
  store = new FsVaultStore(root);
});

describe('parseFrontmatter', () => {
  test('reads the block and hands back the body', () => {
    const { frontmatter, body } = parseFrontmatter('---\ntitle: Acme NDA\ndeadline: 2026-09-12\n---\n# H1\nBody.\n');
    expect(frontmatter).toEqual({ title: 'Acme NDA', deadline: '2026-09-12' });
    expect(body).toBe('# H1\nBody.\n');
  });

  test('no frontmatter, unterminated frontmatter, and broken YAML are all just a body', () => {
    expect(parseFrontmatter('# H1\n').frontmatter).toEqual({});
    expect(parseFrontmatter('---\ntitle: x\n# never closed\n').frontmatter).toEqual({});
    const broken = parseFrontmatter('---\n: [unbalanced\n---\nBody.\n');
    expect(broken.frontmatter).toEqual({});
    expect(broken.body).toBe('Body.\n');
  });

  test('a byte-order mark does not hide the block', () => {
    const { frontmatter, body } = parseFrontmatter('\ufeff---\ntitle: Acme NDA\n---\nBody.\n');
    expect(frontmatter).toEqual({ title: 'Acme NDA' });
    expect(body).toBe('Body.\n');
  });

  test('the terminator must be a line of its own', () => {
    // `----` and `--- note` are not terminators, so the block never closes.
    expect(parseFrontmatter('---\ntitle: x\n----\nBody.\n').frontmatter).toEqual({});
    expect(parseFrontmatter('---\ntitle: x\n--- note\nBody.\n').frontmatter).toEqual({});
    // Trailing whitespace on the terminator is still a terminator.
    expect(parseFrontmatter('---\ntitle: x\n--- \nBody.\n').frontmatter).toEqual({ title: 'x' });
  });

  test('scalars come back as strings; nested structures are skipped', () => {
    const { frontmatter } = parseFrontmatter('---\ndeadline: 2026-09-12\ncount: 3\nnested:\n  a: 1\n---\nBody.\n');
    expect(frontmatter['count']).toBe('3');
    expect(frontmatter['nested']).toBeUndefined();
  });
});

describe('titleOf', () => {
  test('frontmatter title beats the H1 beats the prettified filename', () => {
    expect(titleOf('---\ntitle: From FM\n---\n# From H1\n', 'matters/x.md')).toBe('From FM');
    expect(titleOf('# From H1\nBody.\n', 'matters/x.md')).toBe('From H1');
    expect(titleOf('no headings\n', 'matters/2026-06-vendora-worldpay-documentation.md')).toBe(
      'Vendora worldpay documentation',
    );
  });
});

describe('prettifyName', () => {
  test('strips the date prefix and the extension, spaces the dashes', () => {
    expect(prettifyName('2026-06-vendora-worldpay.md')).toBe('Vendora worldpay');
    expect(prettifyName('acme_nda.md')).toBe('Acme nda');
    expect(prettifyName('notes.md')).toBe('Notes');
  });

  test('a date-only filename keeps its date instead of reducing to the day', () => {
    expect(prettifyName('2026-06-01.md')).toBe('2026 06 01');
    expect(prettifyName('2026-06.md')).toBe('2026 06');
  });
});

describe('vaultOverview', () => {
  test('a vault with no matters dir still answers, with empty matters', async () => {
    const overview = await vaultOverview(store, 'default', CFG);
    expect(overview.matters).toEqual([]);
    expect(overview.groups).toEqual({ practice: 0, knowledge: 0, other: 0 });
  });

  test('matters carry title, frontmatter and mtime, oldest first; junk never counts', async () => {
    mkdirSync(join(root, 'matters'));
    writeFileSync(join(root, 'matters', '.DS_Store'), 'junk');
    writeFileSync(
      join(root, 'matters', '2026-06-vendora.md'),
      '---\ntitle: Vendora × Worldpay\nstage: working\nnext_action: send document list\ndeadline: 2026-09-12\n---\nBody.\n',
    );
    writeFileSync(join(root, 'matters', 'acme.md'), '# Acme Corp — NDA\nTerm: 2 years\n');
    mkdirSync(join(root, 'practice'));
    writeFileSync(join(root, 'practice', 'nda.md'), '# NDA\n');
    mkdirSync(join(root, 'memory'));
    writeFileSync(join(root, 'memory', 'decisions.md'), '# Decisions\n');
    writeFileSync(join(root, 'config.md'), 'counsel-os-config: true\n');

    const overview = await vaultOverview(store, 'default', CFG);
    expect(overview.matters.map(m => m.title).sort()).toEqual(['Acme Corp — NDA', 'Vendora × Worldpay']);
    const vendora = overview.matters.find(m => m.path === 'matters/2026-06-vendora.md')!;
    expect(vendora.frontmatter['next_action']).toBe('send document list');
    expect(vendora.frontmatter['deadline']).toBe('2026-09-12');
    expect(vendora.mtimeMs).toBeGreaterThan(0);
    // Oldest first (the tree reads top-down through time).
    const times = overview.matters.map(m => m.mtimeMs);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    // practice: its 1 entry; knowledge: memory's 1 entry; other: config.md.
    expect(overview.groups).toEqual({ practice: 1, knowledge: 1, other: 1 });
  });

  test('a dangling symlink in matters does not empty the overview (M1)', async () => {
    mkdirSync(join(root, 'matters'));
    writeFileSync(join(root, 'matters', 'acme.md'), '# Acme Corp — NDA\n');
    symlinkSync(join(root, 'matters', 'gone.md'), join(root, 'matters', 'dangling.md'));
    const overview = await vaultOverview(store, 'default', CFG);
    expect(overview.matters.map(m => m.title)).toEqual(['Acme Corp — NDA']);
  });

  test('a matter over the size cap is listed but never read', async () => {
    mkdirSync(join(root, 'matters'));
    writeFileSync(
      join(root, 'matters', '2026-06-huge-transcript.md'),
      '---\ntitle: Should Not Be Read\n---\n' + 'x'.repeat(MAX_MATTER_BYTES + 1),
    );
    const overview = await vaultOverview(store, 'default', CFG);
    expect(overview.matters).toHaveLength(1);
    // The frontmatter title would have won had the file been read.
    expect(overview.matters[0]!.title).toBe('Huge transcript');
    expect(overview.matters[0]!.frontmatter).toEqual({});
  });

  test('the count cap keeps the NEWEST matters', async () => {
    mkdirSync(join(root, 'matters'));
    const total = MAX_MATTERS + 5;
    for (let i = 0; i < total; i++) {
      const file = join(root, 'matters', `m${String(i).padStart(3, '0')}.md`);
      writeFileSync(file, `# Matter ${i}\n`);
      // Explicit mtimes: index order is recency order, oldest first.
      utimesSync(file, new Date(1_700_000_000_000 + i * 1000), new Date(1_700_000_000_000 + i * 1000));
    }
    const overview = await vaultOverview(store, 'default', CFG);
    expect(overview.matters).toHaveLength(MAX_MATTERS);
    // The 5 oldest fell off; the newest survived. Output stays oldest-first.
    expect(overview.matters[0]!.title).toBe('Matter 5');
    expect(overview.matters.at(-1)!.title).toBe(`Matter ${total - 1}`);
  });

  test('a matters entry that is not markdown is skipped', async () => {
    mkdirSync(join(root, 'matters'));
    writeFileSync(join(root, 'matters', 'signed.pdf'), 'not text');
    const overview = await vaultOverview(store, 'default', CFG);
    expect(overview.matters).toEqual([]);
  });
});
