/** Private fake-CLI fixture; never reads the operator's login or calls a vendor. */
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { WorkspaceCodexProvider } from '../codex';

if (process.argv[2] === '--fake-cli') {
  const wrapper = process.env.PATH!.split(':')[0]!;
  const root = dirname(wrapper);
  if (!basename(root).startsWith('counsel-auth-test-')) throw new Error('Private fixture required.');
  // The SDK forwards workingDirectory as --cd; the real CLI applies it.
  const directoryIndex = process.argv.indexOf('--cd');
  if (directoryIndex === -1) throw new Error('Private CLI directory required.');
  process.chdir(process.argv[directoryIndex + 1]!);
  const home = process.env.CODEX_HOME!, cwd = process.cwd();
  const modelIndex = process.argv.indexOf('--model'), model = process.argv[modelIndex + 1]!;
  const auth = JSON.parse(readFileSync(join(home, 'auth.json'), 'utf8'));
  const audit = { home, cwd, model, authGeneration: auth.tokens.fixtureGeneration,
    mode: statSync(join(home, 'auth.json')).mode & 0o777,
    homeIsIsolated: process.env.HOME === home,
    noAmbientSecrets: !process.env.OPENAI_API_KEY && !process.env.UNRELATED_SECRET,
    noAmbientConfig: !existsSync(join(home, 'config.toml')) && !existsSync(join(home, 'AGENTS.md')),
    initialFiles: readdirSync(cwd), pid: process.pid };
  writeFileSync(join(root, `audit-${model}.json`), JSON.stringify(audit));
  // Simulate a vendor refreshing its private credential copy, not the source login.
  writeFileSync(join(home, 'auth.json'), JSON.stringify(model === 'renew' ? { auth_mode: 'chatgpt', tokens: { fixtureGeneration: 3 } }
    : model === 'wrong-account' ? { auth_mode: 'chatgpt', tokens: { fixtureGeneration: 999, account_id: 'different-account' } }
    : { fixture: 'child-only-refresh' }));
  console.log(JSON.stringify({ type: 'thread.started', thread_id: model }));
  if (model === 'cancel') await new Promise(() => {});
  else if (model === 'failure') console.log(JSON.stringify({ type: 'turn.failed', error: { message: 'Synthetic login expired' } }));
  else {
    console.log(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'Synthetic response.' } }));
    console.log(JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 1, output_tokens: 1 } }));
  }
} else {
  const root = mkdtempSync(join(tmpdir(), 'counsel-auth-test-'));
  const realHome = join(root, 'source-login'), bin = join(root, 'bin');
  mkdirSync(realHome); mkdirSync(bin);
  const cli = join(bin, 'codex');
  writeFileSync(cli, `#!${process.execPath}\nprocess.argv.splice(2, 0, '--fake-cli');\nawait import(${JSON.stringify(import.meta.path)});\n`, { mode: 0o700 });
  chmodSync(cli, 0o700);
  process.env.PATH = bin;
  process.env.CODEX_HOME = realHome;
  process.env.HOME = root;
  process.env.OPENAI_API_KEY = 'synthetic-do-not-forward';
  process.env.UNRELATED_SECRET = 'synthetic-do-not-forward';
  writeFileSync(join(realHome, 'config.toml'), 'synthetic ambient settings');
  writeFileSync(join(realHome, 'AGENTS.md'), 'synthetic ambient instructions');
  const login = (generation: number) => JSON.stringify({ auth_mode: 'chatgpt', tokens: { fixtureGeneration: generation } });
  const checks: Record<string, boolean> = {};
  async function run(model: string) {
    const abort = new AbortController(), types: string[] = [];
    for await (const event of new WorkspaceCodexProvider(model).run({ tenant: 'workspace', system: 'Synthetic only.',
      messages: [{ role: 'user', content: 'Synthetic request.' }], tools: [], maxTokens: 100, signal: abort.signal })) {
      types.push(event.type);
      if (model === 'cancel' && event.type === 'session') abort.abort();
    }
    abort.abort(); // Later caller deadlines must not reach a completed SDK child.
    return types;
  }
  try {
    writeFileSync(join(realHome, 'auth.json'), login(1), { mode: 0o644 });
    const concurrent = await Promise.all([run('first'), run('second')]);
    checks.concurrentComplete = concurrent.every(events => events.includes('done'));
    checks.sourceLoginUnchanged = readFileSync(join(realHome, 'auth.json'), 'utf8') === login(1);
    writeFileSync(join(realHome, 'auth.json'), login(2));
    checks.nextLoginComplete = (await run('new-login')).includes('done');
    checks.failureReported = (await run('failure')).includes('error');
    checks.cancelNoCompletion = !(await run('cancel')).includes('done');
    const audits = ['first', 'second', 'new-login', 'failure', 'cancel'].map(model =>
      JSON.parse(readFileSync(join(root, `audit-${model}.json`), 'utf8')));
    checks.separatePrivateHomes = new Set(audits.map(audit => audit.home)).size === audits.length;
    checks.copiesRemoved = audits.every(audit => !existsSync(audit.home) && !existsSync(audit.cwd));
    checks.privateMode = audits.every(audit => audit.mode === 0o600);
    checks.noInheritedContextOrSecrets = audits.every(audit => audit.homeIsIsolated && audit.noAmbientSecrets && audit.noAmbientConfig && audit.initialFiles.length === 0);
    checks.newLoginCopiedNextTime = audits[0].authGeneration === 1 && audits[1].authGeneration === 1 && audits[2].authGeneration === 2;
    const exited = () => audits.every(audit => { try { process.kill(audit.pid, 0); return false; } catch { return true; } });
    // The SDK signals its child in finally; let the OS deliver/reap that signal.
    for (let i = 0; i < 100 && !exited(); i++) await Bun.sleep(10);
    checks.noChildrenLeft = exited();
    await run('renew');
    await run('reuse-renewal');
    checks.renewedCredentialUsedNextTurn = JSON.parse(readFileSync(join(root, 'audit-reuse-renewal.json'), 'utf8')).authGeneration === 3;
    checks.renewalLeavesSourceLoginUnchanged = readFileSync(join(realHome, 'auth.json'), 'utf8') === login(2);
    const connections = join(root, '.counsel', 'connections');
    const cacheDir = join(connections, readdirSync(connections)[0]!);
    checks.renewalCachePrivate = (statSync(cacheDir).mode & 0o777) === 0o700 && (statSync(join(cacheDir, 'credentials.json')).mode & 0o777) === 0o600;
    await run('wrong-account'); await run('after-wrong-account');
    checks.crossAccountRenewalRejected = JSON.parse(readFileSync(join(root, 'audit-after-wrong-account.json'), 'utf8')).authGeneration === 3;
    writeFileSync(join(realHome, 'auth.json'), login(4)); await run('changed-source');
    checks.changedSourceInvalidatesCache = JSON.parse(readFileSync(join(root, 'audit-changed-source.json'), 'utf8')).authGeneration === 4;
    checks.staleCacheRemoved = !existsSync(join(cacheDir, 'credentials.json'));
    await run('renew');
    rmSync(join(realHome, 'auth.json'));
    checks.logoutFailsWithoutCli = (await run('logged-out')).includes('error') && !existsSync(join(root, 'audit-logged-out.json'));
    checks.logoutRemovesCachedCredential = !existsSync(join(cacheDir, 'credentials.json'));
    writeFileSync(join(realHome, 'auth.json'), JSON.stringify({ auth_mode: 'apikey', OPENAI_API_KEY: 'synthetic' }));
    checks.apiLoginNeverFallback = (await run('api-login')).includes('error') && !existsSync(join(root, 'audit-api-login.json'));
    console.log(JSON.stringify(checks));
    if (Object.values(checks).some(value => !value)) process.exitCode = 1;
  } finally { rmSync(root, { recursive: true, force: true }); }
}
