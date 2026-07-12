import { describe, expect, test } from 'bun:test';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const repoRoot = path.resolve(import.meta.dir, '../..');
const script = path.join(repoRoot, 'scripts', 'docket_sweep.py');

function hasPython(): boolean {
  try {
    execFileSync('python3', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const docketTest = hasPython() ? test : test.skip;

function runJson(mattersDir: string, extra: string[] = []) {
  const out = execFileSync(
    'python3',
    [script, mattersDir, '--today', '2026-07-11', '--window', '60', '--format', 'json', ...extra],
    { encoding: 'utf8' },
  );
  return JSON.parse(out);
}

function withMatters(files: Record<string, string>, fn: (dir: string) => void) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'counsel-docket-'));
  try {
    for (const [name, body] of Object.entries(files)) {
      fs.writeFileSync(path.join(dir, name), body);
    }
    fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('docket_sweep.py', () => {
  docketTest('classifies overdue / due-soon / upcoming and hides done', () => {
    withMatters(
      {
        // 2-space indented list style
        'acme.md': `---
counsel-os-type: matter
matter-id: 2026-05-acme-msa
stage: working
counterparty: Acme Corp
deadlines:
  - date: 2026-06-01
    action: "auto-renewal notice deadline"
    type: renewal
    source: "MSA §9.2"
  - date: 2026-07-20
    action: "objection window closes"
  - date: 2026-12-01
    action: "annual review"
  - date: 2026-05-15
    action: "already handled"
    done: true
---
# Acme
`,
      },
      (dir) => {
        const result = runJson(dir);
        expect(result.counts).toEqual({
          overdue: 1,
          due_soon: 1,
          upcoming: 1,
          malformed: 0,
          done_hidden: 1,
        });
        const overdue = result.deadlines.find((d: any) => d.status === 'overdue');
        expect(overdue.action).toBe('auto-renewal notice deadline');
        expect(overdue.source).toBe('MSA §9.2');
        expect(overdue.days_until).toBe(-40);
      },
    );
  });

  docketTest('surfaces malformed dates instead of dropping them', () => {
    withMatters(
      {
        // column-0 list style, one broken date
        'globex.md': `---
counsel-os-type: matter
matter-id: 2026-04-globex-nda
stage: closed
counterparty: Globex
deadlines:
- date: not-a-date
  action: "broken entry"
- date: 2026-08-30
  action: "confidentiality survival check"
---
# Globex
`,
      },
      (dir) => {
        const result = runJson(dir);
        expect(result.counts.malformed).toBe(1);
        expect(result.malformed[0].matter_id).toBe('2026-04-globex-nda');
        expect(result.malformed[0].reason).toContain('not-a-date');
        // closed-matter future deadline still surfaces (renewal outlives the deal)
        const survival = result.deadlines.find((d: any) => d.action === 'confidentiality survival check');
        expect(survival.status).toBe('due_soon');
        expect(survival.stage).toBe('closed');
      },
    );
  });

  docketTest('ignores non-matter files and files without a deadlines block', () => {
    withMatters(
      {
        'note.md': `---
counsel-os-type: memory-patterns
---
not a matter
`,
        'bare.md': `---
counsel-os-type: matter
matter-id: 2026-01-bare
stage: intake
---
# no deadlines
`,
      },
      (dir) => {
        const result = runJson(dir);
        expect(result.deadlines).toHaveLength(0);
        expect(result.malformed).toHaveLength(0);
      },
    );
  });

  docketTest('--include-done reveals satisfied deadlines', () => {
    withMatters(
      {
        'm.md': `---
counsel-os-type: matter
matter-id: 2026-02-m
stage: working
deadlines:
  - date: 2026-05-15
    action: "handled"
    done: true
---
`,
      },
      (dir) => {
        expect(runJson(dir).deadlines).toHaveLength(0);
        expect(runJson(dir, ['--include-done']).deadlines).toHaveLength(1);
      },
    );
  });
});
