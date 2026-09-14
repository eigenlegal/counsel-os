/** Exercise a relocated executable. All workspaces/files are newly generated.
 * macOS adds an OS read-denial rule for the checkout and build-staging folders.
 * This test sandbox is not represented as the shipping app's security model. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { createServer } from 'node:net';
import { buildDocx } from '../runtime/src/docx/test/builder';
import { openDocx, DOCUMENT_PART } from '../runtime/src/docx/package';
import { modelOf, textOf } from '../runtime/src/docx/model';
import { syntheticPdf, syntheticCjkPdf } from '../runtime/src/workspace/fixtures/documents';

const args = process.argv.slice(2);
assert.ok(args[0] && !args[0].startsWith('--'), 'Usage: bun e2e/workspace-package-check.ts /package/folder [--browser-python /path/python] [--native-word]');
let browserPython: string | undefined, nativeWord = false;
for (let i = 1; i < args.length; i++) {
  if (args[i] === '--native-word' && !nativeWord) nativeWord = true;
  else if (args[i] === '--browser-python' && !browserPython && args[i + 1] && !args[i + 1]!.startsWith('--')) browserPython = args[++i];
  else throw new Error(`Unknown, repeated or incomplete option: ${args[i]}`);
}
assert.ok(!nativeWord || process.platform === 'darwin', '--native-word requires Microsoft Word for macOS.');
const bundle = resolve(args[0]!), isApp = bundle.endsWith('.app');
const engineFile = join(bundle, isApp ? 'Contents/MacOS/counsel-workspace' : 'counsel-workspace');
const manifest = JSON.parse(readFileSync(join(bundle, isApp ? 'Contents/Resources/engine-manifest.json' : 'manifest.json'), 'utf8'));
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
assert.equal(manifest.application, 'Counsel workspace');
const binary = readFileSync(engineFile);
assert.equal(sha(binary), manifest.executable.sha256, 'Package manifest matches executable');
const root = realpathSync(mkdtempSync(join(tmpdir(), 'counsel-packaged-qualification-'))); chmodSync(root, 0o700);
const moved = join(root, 'Relocated Counsel OS'), home = join(root, 'synthetic-home'), cwd = join(root, 'unrelated-working-folder');
for (const directory of [moved, home, cwd]) mkdirSync(directory, { mode: 0o700 });
const executable = join(moved, 'counsel-workspace'); copyFileSync(engineFile, executable); chmodSync(executable, 0o700);
const repo = realpathSync(resolve(import.meta.dir, '..'));
const guarded = process.platform === 'darwin' && existsSync('/usr/bin/sandbox-exec');
const sandboxProfile = `(version 1)(allow default)(deny file-read* (subpath ${JSON.stringify(repo)})(regex #".*/counsel-workspace-build-[^/]+(/.*)?"))`;
const command = (...argv: string[]) => guarded ? ['/usr/bin/sandbox-exec', '-p', sandboxProfile, executable, ...argv] : [executable, ...argv];
const env = { HOME: home, PATH: '', TMPDIR: root, NODE_ENV: 'production' };
const results: string[] = [];
function pass(label: string) { results.push(label); console.log(`PASS ${label}`); }
// Neither launch-folder config may redirect storage or run a preload script.
const canary = join(root, 'configuration-was-loaded');
writeFileSync(join(cwd, '.env'), `HOME=${join(root, 'wrong-home')}\n`);
writeFileSync(join(cwd, 'bunfig.toml'), 'preload = ["./must-not-run.ts"]\n');
writeFileSync(join(cwd, 'must-not-run.ts'), `require('fs').writeFileSync(${JSON.stringify(canary)}, 'bad');\n`);

async function run(argv: string[], input?: Uint8Array | object) {
  const proc = Bun.spawn(command(...argv), { cwd, env, stdin: input instanceof Uint8Array ? new Blob([new Uint8Array(input)])
    : input ? new Blob([JSON.stringify(input)]) : 'ignore', stdout: 'pipe', stderr: 'pipe' });
  const timer = setTimeout(() => proc.kill('SIGKILL'), 25_000);
  try {
    const [out, err, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
    assert.ok(out.length < 10_000_000 && err.length < 100_000);
    return { out, err, code };
  } finally { clearTimeout(timer); if (proc.exitCode === null) proc.kill('SIGKILL'); await proc.exited; }
}
async function worker(kind: string, input: Uint8Array | object, extra: string[] = []) {
  const result = await run(['--internal-worker', kind, ...extra], input);
  assert.equal(result.code, 0, result.err);
  const parsed = JSON.parse(result.out); assert.ok(!parsed.error, parsed.error); return parsed;
}
let active: Awaited<ReturnType<typeof start>> | undefined;
async function freePort(): Promise<number> {
  const server = createServer(); await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;
  await new Promise<void>(resolve => server.close(() => resolve())); return port;
}
async function start(database: string) {
  const port = await freePort(), origin = `http://127.0.0.1:${port}`;
  const proc = Bun.spawn(command('--no-open', '--database', database, '--port', String(port)), { cwd, env, stdin: 'ignore', stdout: 'pipe', stderr: 'pipe' });
  let output = '', errors = '';
  const stdout = (async () => { for await (const chunk of proc.stdout) output = (output + new TextDecoder().decode(chunk)).slice(-20_000); })();
  const stderr = (async () => { for await (const chunk of proc.stderr) errors = (errors + new TextDecoder().decode(chunk)).slice(-20_000); })();
  async function stop() {
    if (proc.exitCode === null) proc.kill('SIGTERM');
    const timer = setTimeout(() => proc.kill('SIGKILL'), 7000);
    try { await proc.exited; await Promise.all([stdout, stderr]); }
    finally { clearTimeout(timer); }
    assert.equal(proc.exitCode, 0, 'Packaged app must stop gracefully');
  }
  try {
    const deadline = Date.now() + 20_000;
    let token: string | undefined;
    while (Date.now() < deadline) {
      token = output.match(/Open: http:\/\/127\.0\.0\.1:\d+\/#token=([a-f0-9]{64})/)?.[1];
      if (token) break;
      assert.equal(proc.exitCode, null, `Packaged launcher exited: ${errors}`);
      await Bun.sleep(25);
    }
    assert.ok(token, `Packaged app did not become ready: ${errors}`);
    const api = async (path = '', data?: object) => {
      const response = await fetch(origin + '/api/workspace' + path, { method: data ? 'POST' : 'GET',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: data ? JSON.stringify(data) : undefined });
      assert.ok(response.ok, `API ${path}: ${response.status} ${await response.clone().text()}`); return response.json() as Promise<any>;
    };
    const original = async (id: string) => {
      const response = await fetch(origin + `/api/workspace/source-revisions/${id}/original`, { headers: { Authorization: `Bearer ${token}` } });
      assert.equal(response.status, 200); return new Uint8Array(await response.arrayBuffer());
    };
    return { origin, token, api, original, stop };
  } catch (error) { try { await stop(); } catch {} throw error; }
}

/** QA only: opens exact new synthetic copies in Word's own temporary folder.
 * No global Word settings, active-document references, or application quit. */
async function renderNativeWord(): Promise<string> {
  const destination = realpathSync(mkdtempSync(join(realpathSync(join(homedir(), 'Library/Containers/com.microsoft.Word/Data/tmp')), 'counsel-packaged-word-')));
  for (const name of ['original', 'redline', 'clean']) {
    const input = join(destination, `${basename(destination)}-${name}.docx`), pdf = join(destination, `${name}.pdf`);
    const bytes = readFileSync(join(root, `${name}.docx`)); writeFileSync(input, bytes, { flag: 'wx', mode: 0o600 });
    const quote = JSON.stringify;
    const script = `with timeout of 25 seconds
tell application "Microsoft Word"
open file name ((POSIX file ${quote(input)}) as text) add to recent files false
set qaDoc to document ${quote(basename(input))}
if posix full name of qaDoc is not ${quote(input)} then error "Wrong synthetic document"
save as qaDoc file name ((POSIX file ${quote(pdf)}) as text) file format format PDF add to recent files false
if posix full name of qaDoc is not ${quote(input)} then error "Wrong synthetic document after export"
close window 1 of qaDoc saving no
end tell
end timeout`;
    const child = Bun.spawn(['/usr/bin/osascript', '-e', script], { stdout: 'pipe', stderr: 'pipe' });
    const timer = setTimeout(() => child.kill('SIGKILL'), 35_000);
    try {
      const [error, code] = await Promise.all([new Response(child.stderr).text(), child.exited]);
      assert.equal(code, 0, `Native ${name} export stopped: ${error}. Only the generated test file may remain open.`);
    } finally { clearTimeout(timer); }
    assert.deepEqual(readFileSync(input), bytes, 'PDF export did not change the generated Word copy');
    assert.ok(readFileSync(pdf).subarray(0, 5).equals(Buffer.from('%PDF-')));
    console.log(`PASS native Word export: ${name}`);
  }
  console.log(`Native Word PDFs for visual inspection: ${destination}`); return destination;
}

console.log(`Synthetic packaged qualification: ${root}`);
try {
  const identity = await run(['--version']); assert.equal(identity.code, 0, identity.err);
  assert.deepEqual(JSON.parse(identity.out).build, manifest.build);
  const help = await run(['--help']); assert.equal(help.code, 0, help.err); assert.ok(help.out.includes('workspace'));
  for (const argv of [['--internal-worker', 'unknown'], ['--internal-worker', 'extract'], ['--internal-worker', 'backup', '--demo']])
    assert.notEqual((await run(argv)).code, 0);
  assert.deepEqual(readdirSync(home), []); assert.ok(!existsSync(canary));
  pass('relocated identity/help, disabled configuration autoload and fail-closed worker dispatch without a workspace');

  const original = openDocx(buildDocx({ blocks: [
    { runs: [{ text: 'SYNTHETIC PACKAGED AGREEMENT', bold: true }] },
    { runs: ['Notices'] }, { runs: ['Notices may be ', { text: 'given orally', italic: true }, '.'] },
    { numId: '1', runs: ['Keep this numbered provision.'] },
    { runs: ['The ', { text: 'online terms', hyperlink: 'rId9' }, ' apply.'] },
    { numId: '2', runs: ['Uptime: 99.9%'] },
    { runs: ['Signatures'] },
  ], numbering: { '1': [{ lvlText: '%1.', numFmt: 'decimal' }], '2': [{ lvlText: '•', numFmt: 'bullet' }] } }));
  original.setPart(DOCUMENT_PART, original.partText(DOCUMENT_PART).replace('<w:sectPr/>', '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>'));
  const bytes = original.save(); writeFileSync(join(root, 'original.docx'), bytes, { mode: 0o600 });
  const extracted = await worker('extract', bytes, ['docx']); assert.ok(extracted.body.includes('given orally'));
  const pdfBytes = syntheticPdf(['Packaged PDF evidence.', '', 'Page three remains unresolved.']);
  const extractedPdf = await worker('extract', pdfBytes, ['pdf']); assert.equal(extractedPdf.extraction.pages, 3);
  assert.ok(extractedPdf.body.includes('Page three remains unresolved.')); assert.equal(extractedPdf.textStatus, 'partial');
  writeFileSync(join(root, 'evidence.pdf'), pdfBytes, { mode: 0o600 });
  const cjk = syntheticCjkPdf(), extractedCjk = await worker('extract', cjk, ['pdf']);
  assert.ok(extractedCjk.body.includes('あ'), 'Japanese text requires embedded CMaps, not a developer node_modules path');
  writeFileSync(join(root, 'cjk-evidence.pdf'), cjk, { mode: 0o600 });
  pass('compiled Word/PDF extraction and Japanese CMaps without node_modules');

  const sourceRevisionId = crypto.randomUUID(), author = 'Synthetic Avery';
  const redline = await worker('redline', { bytes: Buffer.from(bytes).toString('base64'), author, input: { sourceRevisionId,
    edits: [{ current: 'given orally', proposed: 'given in writing', comment: 'Use written notice.' },
      { current: 'The online terms apply.', proposed: 'The signed schedule applies.', comment: 'Use the negotiated version.' },
      { current: '- Uptime: 99.9%', proposed: '- Uptime: 99.95% each month.' }],
    insertions: [{ anchor: 'Signatures', position: 'before', paragraphs: [{ text: 'Electronic copies are permitted.', styleFrom: 'Notices may be given orally.' }], comment: 'Explain the addition.' }],
  } });
  const redlineBytes = Buffer.from(redline.bytes, 'base64'); writeFileSync(join(root, 'redline.docx'), redlineBytes, { mode: 0o600 });
  const redlined = openDocx(redlineBytes), paragraphs = (data: Uint8Array, mode: 'accept' | 'reject') => modelOf(openDocx(data)).paragraphs.map(p => textOf(p, mode)).filter(Boolean);
  assert.deepEqual(paragraphs(redlineBytes, 'reject'), paragraphs(bytes, 'accept'));
  assert.ok(redlined.partText(DOCUMENT_PART).includes('w:author="Synthetic Avery"'));
  assert.ok(redlined.partText('word/comments.xml').includes('Use written notice.'));
  assert.equal(redline.report.applied.length, 4);
  assert.ok(paragraphs(redlineBytes, 'accept').includes('The signed schedule applies.'));
  assert.ok(paragraphs(redlineBytes, 'accept').includes('Uptime: 99.95% each month.'));
  const clean = await worker('clean', { original: Buffer.from(bytes).toString('base64'), redline: redline.bytes, author });
  const cleanBytes = Buffer.from(clean.bytes, 'base64'); writeFileSync(join(root, 'clean.docx'), cleanBytes, { mode: 0o600 });
  assert.deepEqual(paragraphs(cleanBytes, 'accept'), paragraphs(redlineBytes, 'accept'));
  assert.ok(!/<w:(ins|del)\b/.test(openDocx(cleanBytes).partText(DOCUMENT_PART)));
  pass('compiled native tracked replacements, section insertion, comments/attribution and clean proposals');
  // A compressed original with a large embedded asset must not inflate past
  // the output cap just because the package is re-saved. Keep this synthetic
  // asset separate from the native rendering corpus (it is not a real font).
  const assetOriginal = openDocx(bytes), asset = new Uint8Array(5_500_000).map((_, i) => i % 251);
  assetOriginal.setPart('word/fonts/synthetic.odttf', asset);
  const assetRedline = await worker('redline', { bytes: Buffer.from(assetOriginal.save()).toString('base64'), author,
    input: { sourceRevisionId, edits: [{ current: 'given orally', proposed: 'given in writing' }] } });
  const assetBytes = Buffer.from(assetRedline.bytes, 'base64');
  assert.ok(assetBytes.length < 100_000);
  assert.deepEqual(openDocx(assetBytes).partBytes('word/fonts/synthetic.odttf'), asset);
  pass('compiled embedded-font compression regression preserves exact asset bytes');
  const rounds = await worker('rounds', [
    { role: 'baseline', title: 'Original', bytes: Buffer.from(bytes).toString('base64') },
    { role: 'sent', title: 'Sent', bytes: redline.bytes }, { role: 'returned', title: 'Returned', bytes: clean.bytes },
  ].map(doc => ({ ...doc, version: 1, revisionId: crypto.randomUUID(), contentHash: sha(Buffer.from(doc.bytes, 'base64')) })));
  assert.equal(rounds.documents.length, 3); assert.ok(rounds.findings.length > 0);
  assert.equal(sha(bytes), sha(readFileSync(join(root, 'original.docx'))));
  assert.deepEqual(readdirSync(home), []); pass('compiled three-way comparison; worker-only operations never opened a workspace');

  // The parent executable must also start its worker modes correctly; direct
  // worker commands alone would miss accidental source-path subprocess calls.
  const database = join(root, 'workspace.sqlite3'); active = await start(database);
  const shell = await fetch(active.origin), html = await shell.text(); assert.equal(shell.status, 200); assert.ok(html.includes('workspace-'));
  for (const resource of [...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map(match => match[1]!)) {
    assert.equal((await fetch(active.origin + resource)).status, 200);
    assert.equal((await fetch(active.origin + resource, { method: 'HEAD' })).status, 200);
  }
  assert.equal((await fetch(active.origin + '/api/workspace')).status, 401);
  assert.equal((await fetch(active.origin + '/api/workspace', { headers: { Authorization: `Bearer ${active.token}`, Origin: 'https://untrusted.invalid' } })).status, 403);
  assert.equal((await active.api()).totals.matters, 0);
  assert.equal((await active.api()).interfaceVersion, 33, 'Packaged engine includes the current chat-first and image interfaces');
  if (browserPython) {
    const config = join(root, 'onboarding-browser.json');
    writeFileSync(config, JSON.stringify({ url: `${active.origin}/#token=${active.token}`, root }), { mode: 0o600 });
    const browser = Bun.spawn([browserPython, join(repo, 'e2e/workspace-onboarding-scroll-smoke.py'), config], { cwd: repo, stdout: 'pipe', stderr: 'pipe' });
    const timer = setTimeout(() => browser.kill('SIGKILL'), 90_000);
    try {
      const [out, err, exit] = await Promise.all([new Response(browser.stdout).text(), new Response(browser.stderr).text(), browser.exited]);
      assert.equal(exit, 0, err); assert.ok(out.includes('PASS')); pass('first-run AI setup scrolling in the packaged UI');
    } finally { clearTimeout(timer); }
  }
  const emptyPractice = await active.api('/practice-document');
  assert.equal(emptyPractice.body, ''); assert.equal(emptyPractice.saved, null);
  const practiceText = '# Packaged practice\n\nFor construction disputes, preserve chronology.\n\nFor tax audits, identify missing records.\n\nKeep useful detail — あ 🧭';
  const practiceDraft = await active.api('/practice-document', { body: practiceText, useInChats: true, expectedBasis: emptyPractice.basis });
  const practice = await active.api('/practice-document/identity', { name: 'Synthetic Avery', expectedBasis: practiceDraft.basis });
  assert.equal(practice.body, practiceText + '\n\nMy name is Synthetic Avery.');
  assert.equal(practice.word.author, 'Counsel OS', 'Identity-only confirmation must not silently change the Word author');
  assert.equal((await active.api()).practiceDocument.basis, practice.basis);
  pass('compiled free-form practice document, exact identity confirmation and unified snapshot');
  const matter = await active.api('/matters', { title: 'Packaged matter' });
  const word = await active.api('/files', { name: 'Packaged original.docx', matterId: matter.id, base64: Buffer.from(bytes).toString('base64') });
  const pdf = await active.api('/files', { name: 'Packaged evidence.pdf', matterId: matter.id, base64: Buffer.from(pdfBytes).toString('base64') });
  assert.ok(word.latest.body.includes('given orally')); assert.equal(pdf.latest.extraction.pages, 3);
  assert.deepEqual(await active.original(word.latest.id), new Uint8Array(bytes));
  assert.deepEqual(await active.original(pdf.latest.id), new Uint8Array(pdfBytes));
  const screenshotBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5ioAAAAASUVORK5CYII=', 'base64');
  const screenshot = await active.api('/files', { name: 'Packaged screenshot.png', base64: screenshotBytes.toString('base64') });
  assert.equal(screenshot.latest.body, null, 'Image intake must not invent OCR text');
  assert.deepEqual(screenshot.latest.extraction.image, { mediaType: 'image/png', width: 1, height: 1 });
  const previewPath = active.origin + `/api/workspace/source-revisions/${screenshot.latest.id}/image`;
  assert.equal((await fetch(previewPath)).status, 401);
  const preview = await fetch(previewPath, { headers: { Authorization: `Bearer ${active.token}` } });
  assert.equal(preview.status, 200); assert.equal(preview.headers.get('content-type'), 'image/png');
  assert.deepEqual(Buffer.from(await preview.arrayBuffer()), screenshotBytes);
  const instructions = await active.api('/files', { name: 'notes-839.txt', base64: Buffer.from('I prefer complete, direct answers. My writing style is plain and specific.').toString('base64') });
  const candidates = await active.api('/practice-document/sources');
  assert.ok(candidates.items.some((item: any) => item.revisionId === instructions.latest.id));
  assert.equal((await active.api('/practice-document')).basis, practice.basis, 'Discovering instructions cannot apply them');
  pass('compiled screenshot intake/authenticated previews and content-based instruction discovery without activation');
  const backup = await active.api('/backups/prepare', {});
  const download = await fetch(active.origin + backup.downloadUrl); assert.equal(download.status, 200);
  const archive = join(root, 'synthetic.counsel-backup'); writeFileSync(archive, new Uint8Array(await download.arrayBuffer()), { mode: 0o600 });
  pass('embedded UI GET/HEAD, authenticated API, uploads and backup through packaged parent processes');
  if (browserPython) {
    const config = join(root, 'browser.json'); writeFileSync(config, JSON.stringify({ url: `${active.origin}/#token=${active.token}`, root }), { mode: 0o600 });
    for (const script of ['workspace-package-smoke.py', 'workspace-recovery-smoke.py']) {
    const browser = Bun.spawn([browserPython, join(repo, 'e2e', script), config], { cwd: repo, stdout: 'pipe', stderr: 'pipe' });
    const timer = setTimeout(() => browser.kill('SIGKILL'), 90_000);
    let out: string, err: string, exit: number;
    try { [out, err, exit] = await Promise.all([new Response(browser.stdout).text(), new Response(browser.stderr).text(), browser.exited]); }
    finally { clearTimeout(timer); }
    assert.equal(exit, 0, err); assert.ok(out.includes('PASS')); pass(`relocated executable browser: ${script}`);
    }
  }
  await active.stop(); active = undefined;
  const inspect = await run(['--check-backup', archive]); assert.equal(inspect.code, 0, inspect.err); assert.ok(inspect.out.includes('Backup verified'));
  const restored = await worker('backup', { action: 'restore', path: archive, staging: mkdtempSync(join(root, 'restore-stage-')), parent: join(root, 'restored') });
  assert.ok(restored.databasePath.startsWith(join(root, 'restored') + '/'));
  for (const path of [database, restored.databasePath]) {
    active = await start(path);
    assert.equal((await active.api()).totals.matters, 1);
    assert.equal((await active.api('/matters/' + matter.id)).title, 'Packaged matter');
    assert.deepEqual(await active.original(word.latest.id), new Uint8Array(bytes));
    assert.deepEqual(await active.original(pdf.latest.id), new Uint8Array(pdfBytes));
    assert.deepEqual(await active.original(screenshot.latest.id), new Uint8Array(screenshotBytes));
    const recoveredPractice = await active.api('/practice-document');
    assert.equal(recoveredPractice.body, practice.body);
    assert.equal(recoveredPractice.identityName, 'Synthetic Avery');
    assert.equal(recoveredPractice.word.author, 'Counsel OS');
    assert.equal(recoveredPractice.basis, practice.basis);
    await active.stop(); active = undefined;
  }
  assert.ok(!existsSync(canary)); assert.ok(!existsSync(join(home, '.counsel/workspaces')));
  pass('compiled backup inspection/restoration and repeated reopen retain exact originals without duplicating state');
  const wordPdfDirectory = nativeWord ? await renderNativeWord() : null;
  if (wordPdfDirectory) pass('compiled original/redline/clean files open and export in native Word without changing originals');
  writeFileSync(join(root, 'result.json'), JSON.stringify({ status: 'passed', build: manifest.build, executableSha256: sha(binary), checks: results,
    checkoutReadDenied: guarded, developmentToolsInPath: false, liveModelCalls: 0,
    wordPdfDirectory, visualInspectionRequired: wordPdfDirectory !== null,
    limits: ['Synthetic corpus on this host only; not a clean-machine installation or signed/notarized app.', 'Live providers, credentials and native desktop file dialogs were not exercised.'] }, null, 2), { mode: 0o600 });
  console.log(`PASS packaged workspace qualification; retained synthetic files/report: ${root}`);
} finally { if (active) await active.stop(); }
