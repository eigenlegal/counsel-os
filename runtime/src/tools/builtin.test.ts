import { describe, expect, test } from 'bun:test';
import { builtinTools } from './builtin';

describe('builtinTools', () => {
  test('returns docket_sweep, in TypeScript, available on all four platforms', () => {
    const tools = builtinTools({ vaultRoot: '/tmp/v', repoRoot: '/tmp/repo' });
    const sweep = tools.find(t => t.name === 'docket_sweep');
    expect(sweep).toBeDefined();
    expect([...sweep!.platforms].sort()).toEqual(['hosted', 'linux', 'macos', 'windows']);
    expect(sweep!.inputSchema.parse({})).toEqual({ days: 60 });
    expect(sweep!.description).toContain('deadlines');
  });

  test('the six TypeScript docx tools plus clean_format in a checkout; no clean_format in the binary', () => {
    const checkout = builtinTools({ vaultRoot: '/tmp/v', repoRoot: '/tmp/repo', compiled: false }).map(t => t.name).sort();
    expect(checkout).toEqual(['apply_redlines', 'check_document', 'clean_format', 'diff_rounds', 'docket_sweep', 'docx_compare', 'docx_read', 'extract_redlines']);
    const binary = builtinTools({ vaultRoot: '/tmp/v', repoRoot: '/tmp/repo', compiled: true }).map(t => t.name).sort();
    expect(binary).toEqual(['apply_redlines', 'check_document', 'diff_rounds', 'docket_sweep', 'docx_compare', 'docx_read', 'extract_redlines']);
  });

  test('apply_redlines is the TypeScript tool: vault-relative paths, items or edits, no subprocess', () => {
    const t = builtinTools({ vaultRoot: '/tmp/v', repoRoot: '/tmp/repo' }).find(x => x.name === 'apply_redlines')!;
    expect(t.inputSchema.parse({ original: 'a.docx', items: [{ current: 'x', proposed: 'y' }], track: true })).toMatchObject({ original: 'a.docx', track: true });
    expect(t.description).toContain('never overwriting');
    expect(t.description).not.toContain('local file paths');
  });

  test('docx_read, extract_redlines, check_document, clean_format, apply_redlines run on all four platforms', () => {
    const tools = builtinTools({ vaultRoot: '/tmp/v', repoRoot: '/tmp/repo' });
    for (const name of ['docx_read', 'extract_redlines', 'check_document', 'clean_format', 'apply_redlines']) {
      const t = tools.find(x => x.name === name)!;
      expect([...t.platforms].sort()).toEqual(['hosted', 'linux', 'macos', 'windows']);
    }
  });

  test('docx_compare and diff_rounds run everywhere — Word Compare is gone', () => {
    const tools = builtinTools({ vaultRoot: '/tmp/v', repoRoot: '/tmp/repo' });
    expect(tools.find(t => t.name === 'word_compare')).toBeUndefined();
    for (const name of ['docx_compare', 'diff_rounds']) expect([...tools.find(t => t.name === name)!.platforms].sort()).toEqual(['hosted', 'linux', 'macos', 'windows']);
    expect(tools.find(t => t.name === 'diff_rounds')!.inputSchema.parse({ ours: 'a.docx', theirs: 'b.docx' })).toEqual({ ours: 'a.docx', theirs: 'b.docx' });
  });

  test('check_document takes a `file` field and accepts non-docx', () => {
    const tools = builtinTools({ vaultRoot: '/tmp/v', repoRoot: '/tmp/repo' });
    const check = tools.find(t => t.name === 'check_document')!;
    expect(check.inputSchema.parse({ file: 'draft.md' })).toEqual({ file: 'draft.md' });
    expect(check.description).toContain('.md');
    expect(check.description).toContain('.txt');
  });

  test('extract_redlines keeps its `docx` field; docx_read takes `path`', () => {
    const tools = builtinTools({ vaultRoot: '/tmp/v', repoRoot: '/tmp/repo' });
    expect(tools.find(t => t.name === 'extract_redlines')!.inputSchema.parse({ docx: 'a.docx' })).toEqual({ docx: 'a.docx' });
    expect(tools.find(t => t.name === 'docx_read')!.inputSchema.parse({ path: 'a.docx' })).toEqual({ path: 'a.docx', changes: 'all' });
  });
});

describe('docket_sweep over a vault', () => {
  test('classifies the deadlines inside the window and counts the rest', async () => {
    const { mkdtempSync, mkdirSync, writeFileSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const vault = mkdtempSync(join(tmpdir(), 'docket-tool-'));
    mkdirSync(join(vault, 'matters'), { recursive: true });
    writeFileSync(join(vault, 'config.md'), 'counsel-os-config: true\nlegal_root: .\n', 'utf8');
    writeFileSync(
      join(vault, 'matters', 'acme.md'),
      '---\ncounsel-os-type: matter\ntitle: Acme\ndeadlines:\n  - date: 2020-01-01\n    action: overdue thing\n  - date: 2999-01-01\n    action: far away\n  - date: not-a-date\n    action: broken\n---\n# Acme\n',
      'utf8',
    );
    const sweep = builtinTools({ vaultRoot: vault, repoRoot: '/tmp/repo' }).find(t => t.name === 'docket_sweep')!;
    const out = (await sweep.execute({ days: 60 }, { tenant: 'default', platform: 'macos' } as never)) as { deadlines: Array<{ action: string; status: string; daysUntil: number }>; later: number; skipped: number };
    expect(out.deadlines.map(d => [d.action, d.status])).toEqual([['overdue thing', 'overdue']]);
    expect(out.deadlines[0]!.daysUntil).toBeLessThan(0);
    expect(out.later).toBe(1);
    expect(out.skipped).toBe(1);
  });
});
