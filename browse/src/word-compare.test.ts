import { describe, expect, test } from 'bun:test';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const SCRIPT = path.resolve(import.meta.dir, '../../scripts/word_compare.sh');

function hasWord(): boolean {
  return process.platform === 'darwin' && fs.existsSync('/Applications/Microsoft Word.app');
}

function wordIsRunning(): boolean {
  try {
    execFileSync('pgrep', ['-x', 'Microsoft Word'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Word can report an open document that cannot be addressed by name, and in
 * that state word_compare.sh refuses to run at all (by design — every guard in
 * it reasons about documents by name). The lock-file tests below would then see
 * that refusal instead of what they are asserting, so they skip.
 */
function wordModelHealthy(): boolean {
  if (!hasWord()) return false;
  if (!wordIsRunning()) return true;
  try {
    const out = execFileSync(
      'osascript',
      [
        '-e', 'tell application "Microsoft Word"',
        '-e', 'if (count of documents) is 0 then return "ok"',
        '-e', 'if (name of every document) is missing value then return "wedged"',
        '-e', 'return "ok"',
        '-e', 'end tell',
      ],
      { encoding: 'utf8' },
    ).trim();
    return out === 'ok';
  } catch {
    return false;
  }
}

const lockTest = hasWord() && wordModelHealthy() ? test : test.skip;
const macTest = process.platform === 'darwin' ? test : test.skip;

// Live tests drive the real Word app: they steal focus and take tens of
// seconds, so they are opt-in via COUNSEL_OS_WORD_LIVE=1.
const liveTest =
  process.env.COUNSEL_OS_WORD_LIVE === '1' && hasWord() && wordModelHealthy() ? test : test.skip;

// Launching Word, comparing, and saving comfortably exceeds bun's 5s default.
const LIVE_TIMEOUT_MS = 240_000;

function workspace(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'counsel-word-compare-'));
}

/** Write a Word owner-lock file: one length byte, then the owner name. */
function plantLock(dir: string, lockName: string, owner: string | null): string {
  const target = path.join(dir, lockName);
  if (owner === null) {
    fs.writeFileSync(target, '');
    return target;
  }
  const buf = Buffer.alloc(1 + owner.length);
  buf.writeUInt8(owner.length, 0);
  buf.write(owner, 1, 'latin1');
  fs.writeFileSync(target, buf);
  return target;
}

function run(args: string[], scriptPath = SCRIPT): { status: number; output: string } {
  try {
    const stdout = execFileSync('bash', [scriptPath, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, output: stdout };
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    if (e.status === undefined) throw err;
    return { status: e.status, output: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

describe('word_compare.sh stale owner-lock pre-flight', () => {
  lockTest('refuses a lock held by another user instead of deleting it', () => {
    const work = workspace();
    try {
      // A long name: Word drops the first two characters of the basename.
      const original = path.join(work, 'Master Services Agreement 2026 REV.docx');
      fs.writeFileSync(original, 'x');
      fs.writeFileSync(path.join(work, 'modified.docx'), 'x');
      const lock = plantLock(work, '~$ster Services Agreement 2026 REV.docx', 'Alex Petrova');

      const { status, output } = run([
        original,
        path.join(work, 'modified.docx'),
        'Counsel OS',
        path.join(work, 'out.docx'),
      ]);

      expect(status).not.toBe(0);
      expect(output).toContain("held by 'Alex Petrova'");
      // Never delete a lock that might belong to someone else's open document.
      expect(fs.existsSync(lock)).toBe(true);
    } finally {
      fs.rmSync(work, { recursive: true, force: true });
    }
  });

  lockTest('checks the un-stripped lock name too (short filenames)', () => {
    const work = workspace();
    try {
      // "orig.docx" is short enough that Word keeps the whole basename,
      // producing "~$orig.docx" rather than "~$ig.docx" (verified 16.111).
      const original = path.join(work, 'orig.docx');
      fs.writeFileSync(original, 'x');
      fs.writeFileSync(path.join(work, 'mod.docx'), 'x');
      const lock = plantLock(work, '~$orig.docx', 'Alex Petrova');

      const { status, output } = run([
        original,
        path.join(work, 'mod.docx'),
        'Counsel OS',
        path.join(work, 'out.docx'),
      ]);

      expect(status).not.toBe(0);
      expect(output).toContain("held by 'Alex Petrova'");
      expect(fs.existsSync(lock)).toBe(true);
    } finally {
      fs.rmSync(work, { recursive: true, force: true });
    }
  });

  lockTest('refuses a lock whose owner cannot be parsed', () => {
    const work = workspace();
    try {
      const original = path.join(work, 'orig.docx');
      fs.writeFileSync(original, 'x');
      fs.writeFileSync(path.join(work, 'mod.docx'), 'x');
      const lock = plantLock(work, '~$orig.docx', null);

      const { status, output } = run([
        original,
        path.join(work, 'mod.docx'),
        'Counsel OS',
        path.join(work, 'out.docx'),
      ]);

      expect(status).not.toBe(0);
      expect(output).toContain('not in');
      expect(output).toContain('expected format');
      expect(fs.existsSync(lock)).toBe(true);
    } finally {
      fs.rmSync(work, { recursive: true, force: true });
    }
  });

  lockTest('a lock beside the output path is checked, not just the inputs', () => {
    const work = workspace();
    try {
      fs.writeFileSync(path.join(work, 'orig.docx'), 'x');
      fs.writeFileSync(path.join(work, 'mod.docx'), 'x');
      const lock = plantLock(work, '~$redline.docx', 'Alex Petrova');

      const { status, output } = run([
        path.join(work, 'orig.docx'),
        path.join(work, 'mod.docx'),
        'Counsel OS',
        path.join(work, 'redline.docx'),
      ]);

      expect(status).not.toBe(0);
      expect(output).toContain("held by 'Alex Petrova'");
      expect(fs.existsSync(lock)).toBe(true);
    } finally {
      fs.rmSync(work, { recursive: true, force: true });
    }
  });
});

describe('word_compare.sh embedded AppleScript', () => {
  macTest('compiles', () => {
    const work = workspace();
    try {
      const source = fs.readFileSync(SCRIPT, 'utf8');
      const start = source.indexOf('\non run argv\n');
      const end = source.indexOf('\nENDSCRIPT\n');
      expect(start).toBeGreaterThan(-1);
      expect(end).toBeGreaterThan(start);
      const applescript = source.slice(start, end);

      // The error handler and its helpers are the part worth guarding: a
      // syntax slip there is invisible until a run fails and leaks documents.
      expect(applescript).toContain('on error errMsg number errNum');
      expect(applescript).toContain('on documentNames()');

      const scriptFile = path.join(work, 'compare.applescript');
      fs.writeFileSync(scriptFile, applescript);
      execFileSync('osacompile', ['-o', path.join(work, 'compare.scpt'), scriptFile], {
        stdio: 'pipe',
      });
    } finally {
      fs.rmSync(work, { recursive: true, force: true });
    }
  });
});

describe('word_compare.sh live Word runs (COUNSEL_OS_WORD_LIVE=1)', () => {
  // Word cannot read /tmp under sandboxing, so live runs need a real home dir.
  function liveWorkspace(): string {
    return fs.mkdtempSync(path.join(os.homedir(), 'Documents', 'counsel-word-live-'));
  }

  function makeDocx(target: string, text: string): void {
    execFileSync('python3', [
      '-c',
      'import sys\nfrom docx import Document\nd = Document()\nd.add_paragraph(sys.argv[2])\nd.save(sys.argv[1])',
      target,
      text,
    ]);
  }

  function openDocNames(): string[] {
    const out = execFileSync(
      'osascript',
      [
        '-e', 'tell application "Microsoft Word"',
        '-e', 'if (count of documents) is 0 then return ""',
        '-e', 'set n to name of every document',
        '-e', 'if n is missing value then return ""',
        '-e', 'if class of n is not list then set n to {n}',
        '-e', "set AppleScript's text item delimiters to linefeed",
        '-e', 'set out to n as text',
        '-e', 'return out',
        '-e', 'end tell',
      ],
      { encoding: 'utf8' },
    );
    return out.split('\n').map((s) => s.trim()).filter(Boolean);
  }

  liveTest('clears our own orphan lock, produces output, and leaves nothing open', () => {
    const work = liveWorkspace();
    const before = openDocNames();
    try {
      makeDocx(path.join(work, 'orig.docx'), 'Payment is due within 30 days.');
      makeDocx(path.join(work, 'mod.docx'), 'Payment is due within 45 days.');
      const owner = execFileSync('id', ['-F'], { encoding: 'utf8' }).trim();
      const lock = plantLock(work, '~$orig.docx', owner);

      const { status, output } = run([
        path.join(work, 'orig.docx'),
        path.join(work, 'mod.docx'),
        'Counsel OS',
        path.join(work, 'out.docx'),
      ]);

      expect(status).toBe(0);
      expect(output).toContain('Cleared orphaned Word lock file');
      expect(fs.existsSync(lock)).toBe(false);
      expect(fs.existsSync(path.join(work, 'out.docx'))).toBe(true);
      // No lock files left behind at all.
      expect(fs.readdirSync(work).filter((f) => f.startsWith('~$'))).toEqual([]);
      expect(openDocNames().sort()).toEqual(before.sort());
    } finally {
      fs.rmSync(work, { recursive: true, force: true });
    }
    // A real Word compare takes tens of seconds; the default 5s timeout would
    // kill the script mid-run and leave exactly the state under test.
  }, LIVE_TIMEOUT_MS);

  liveTest('closes the documents it opened when the run fails mid-way', () => {
    const work = liveWorkspace();
    const before = openDocNames();
    try {
      makeDocx(path.join(work, 'orig.docx'), 'Payment is due within 30 days.');
      makeDocx(path.join(work, 'mod.docx'), 'Payment is due within 45 days.');

      // Fail at the point a real save-as error strikes: the original is open
      // and the comparison document exists. Without on-error cleanup both are
      // left open, each holding a ~$ lock beside the user's file.
      const injected = path.join(work, 'word_compare_injected.sh');
      const source = fs.readFileSync(SCRIPT, 'utf8');
      const anchor = '            set compName to name of active document\n';
      expect(source).toContain(anchor);
      fs.writeFileSync(
        injected,
        source.replace(anchor, `${anchor}\n            error "INJECTED save-as failure" number -9999\n`),
      );

      const { status } = run(
        [
          path.join(work, 'orig.docx'),
          path.join(work, 'mod.docx'),
          'Counsel OS',
          path.join(work, 'out.docx'),
        ],
        injected,
      );

      expect(status).not.toBe(0);
      expect(openDocNames().sort()).toEqual(before.sort());
      expect(fs.readdirSync(work).filter((f) => f.startsWith('~$'))).toEqual([]);
    } finally {
      fs.rmSync(work, { recursive: true, force: true });
    }
  }, LIVE_TIMEOUT_MS);
});
