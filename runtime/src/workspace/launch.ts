import { randomBytes } from 'node:crypto';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { WorkspaceStore } from './store';
import { workspaceHandler } from './http';
import practice from './fixtures/practice.json';
import { openSecretStore } from '../providers/secrets';
import { WorkspaceConnection } from './connection';
import { WorkspaceChat } from './chat';
import { planRecall } from './recall-plan';
import { lockWorkspace } from './lock';
import { FILE_MAX_REQUEST_BYTES } from './files';
import { BACKUP_MAX_BYTES } from './backup-format';
import { inspectWorkspaceBackup, restoreWorkspaceBackup, stopWorkspaceBackups } from './backups';
import { workspaceDistribution } from './distribution';

export async function launchWorkspace(args = process.argv.slice(2)): Promise<void> {
  const distribution = workspaceDistribution();
  const invocation = distribution ? 'counsel-workspace' : 'bun run workspace';
  const { values } = parseArgs({
    args,
    options: {
      demo: { type: 'boolean', default: false },
      'no-open': { type: 'boolean', default: false },
      'skip-build': { type: 'boolean', default: false },
      desktop: { type: 'boolean', default: false }, // private shell/engine protocol
      database: { type: 'string' },
      restore: { type: 'string' },
      'restore-root': { type: 'string' },
      'check-backup': { type: 'string' },
      port: { type: 'string' },
      help: { type: 'boolean', default: false },
    },
    strict: true,
  });
  if (values.desktop && (!values.database || values.demo || values.restore || values['restore-root'] || values['check-backup'] || values.help))
    throw new Error('Desktop launch requires one explicit workspace database and no other workspace operation.');
  if (values.help) {
    console.log(
      `${invocation} [--demo] [--no-open] [--database /path/workspace.sqlite3] [--port 7432]${distribution ? '' : ' [--skip-build]'}`,
    );
    console.log(
      `${distribution ? 'Opens' : 'Builds and opens'} the standalone workspace. --demo uses a separate, persistent synthetic workspace.`,
    );
    console.log(
      'Restore: --restore /path/file.counsel-backup [--restore-root /parent/folder]. Always creates and opens a separate recovered workspace.',
    );
    console.log('Verify without restoring: --check-backup /path/file.counsel-backup');
    return;
  }
  if (values['restore-root'] && !values.restore)
    throw new Error('--restore-root is only used with --restore.');
  if (values['check-backup']) {
    if (values.restore || values.database || values.demo)
      throw new Error('Use --check-backup by itself; it does not open or change a workspace.');
    const manifest = await inspectWorkspaceBackup(resolve(values['check-backup']));
    console.log(
      `Backup verified: ${manifest.createdAt}\n${JSON.stringify(manifest.counts, null, 2)}\nOriginal files: ${manifest.originals.length}\nNo workspace was restored or changed.`,
    );
    return;
  }
  if (values.restore && (values.database || values.demo))
    throw new Error(
      '--restore creates a separate workspace; do not combine it with --database or --demo.',
    );
  const port = Number(values.port ?? (values.desktop ? '0' : '7432'));
  if (!Number.isInteger(port) || (port < 1024 && !(values.desktop && port === 0)) || port > 65535)
    throw new Error('Choose a port between 1024 and 65535.');
  const ui = resolve(import.meta.dir, '../../ui');
  if (!distribution && !values['skip-build']) {
    if (!values.desktop) console.log('Building the workspace interface…');
    const build = Bun.spawn([process.execPath, 'run', 'build'], {
      cwd: ui,
      stdout: 'inherit',
      stderr: 'inherit',
    });
    if ((await build.exited) !== 0)
      throw new Error(
        'UI build failed. Install the UI dependencies with: cd runtime/ui && bun install --frozen-lockfile',
      );
  }
  if (distribution ? !distribution.ui.files['workspace.html'] : !(await Bun.file(resolve(ui, 'dist/workspace.html')).exists()))
    throw new Error(distribution ? 'Packaged workspace UI is missing; use a complete build.' : 'The workspace UI is not built. Run bun run workspace without --skip-build.');
  const recovered = values.restore
    ? await restoreWorkspaceBackup(
        resolve(values.restore),
        values['restore-root']
          ? resolve(values['restore-root'])
          : resolve(homedir(), '.counsel/workspaces'),
      )
    : null;
  const databasePath =
    recovered?.databasePath ??
    (values.database
      ? resolve(values.database)
      : resolve(
          homedir(),
          '.counsel/workspaces',
          values.demo ? 'demo' : 'personal',
          'workspace.sqlite3',
        ));
  if (recovered)
    console.log(
      `Restored a separate workspace from ${recovered.manifest.createdAt}.\nDatabase: ${databasePath}\nYour existing workspaces are unchanged. Reconnect AI in Settings before sending messages.\nTo reopen later, run ${invocation} --database followed by the quoted database path above.`,
    );
  const unlock = lockWorkspace(databasePath);
  let store: WorkspaceStore;
  try {
    store = new WorkspaceStore({ databasePath });
  } catch (error) {
    unlock();
    throw error;
  }
  let chat: WorkspaceChat | undefined;
  let server: ReturnType<typeof Bun.serve>;
  try {
    const connection = new WorkspaceConnection(store, openSecretStore());
    chat = new WorkspaceChat(store, choice => connection.resolve(choice), { recallPlanner: planRecall });
    chat.importOrganizer.recover();
    if (values.demo) store.importSeed(practice);
    store.conversations.recover();
    store.upkeep.start();
    chat.autoOrganizer.start();
    const token = randomBytes(32).toString('hex');
    let handler: ReturnType<typeof workspaceHandler> | undefined;
    server = Bun.serve({
      hostname: '127.0.0.1',
      port,
      maxRequestBodySize: Math.max(FILE_MAX_REQUEST_BYTES, BACKUP_MAX_BYTES),
      idleTimeout: 255, // In-place drafting has its own cancellable 120-second deadline.
      fetch: req => handler ? handler(req) : new Response('Starting', { status: 503 }),
    });
    const origin = `http://127.0.0.1:${server.port}`;
    handler = workspaceHandler({
        store,
        token,
        origin,
        distDir: distribution?.ui ?? resolve(ui, 'dist'),
        demo: values.demo,
        desktop: values.desktop,
        chat,
        connection,
    });
    const url = `${origin}/#token=${token}`;
    if (values.desktop) {
      // Only the owning shell's private stdout pipe receives this capability.
      // It is never a file, log, process argument or externally opened URL.
      console.log(JSON.stringify({ protocol: 1, event: 'ready', pid: process.pid, origin, token,
        databasePath, buildId: distribution?.build.id ?? null }));
    } else console.log(
      `\nCounsel workspace${values.demo ? ' — synthetic examples' : ''}\nDatabase: ${databasePath}\nOpen: ${url}\n\nKeep this terminal open. Press Ctrl+C to stop.\n`,
    );
    if (!values.desktop && !values['no-open']) {
      try {
        const command =
          process.platform === 'darwin'
            ? ['open', url]
            : process.platform === 'win32'
              ? ['cmd', '/c', 'start', '', url]
              : ['xdg-open', url];
        const opener = Bun.spawn(command, {
          stdout: 'ignore',
          stderr: 'ignore',
        });
        if ((await opener.exited) !== 0) console.log('Open the link above in your browser.');
      } catch {
        console.log('Open the link above in your browser.');
      }
    }
  } catch (error) {
    store.close();
    unlock();
    throw error;
  }
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    chat!.stop();
    store.upkeep.stop();
    store.imports.stop();
    server.stop(true);
    // Let aborted SDK runs close their tool endpoints and remove temporary
    // authentication copies before exiting. A stuck adapter cannot block shutdown.
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const cleaned = await Promise.race([
      Promise.all([chat!.idle(), store.imports.idle(), stopWorkspaceBackups()]).then(() => true),
      new Promise<false>((done) => {
        timeout = setTimeout(() => done(false), 5_000);
      }),
    ]);
    if (timeout) clearTimeout(timeout);
    if (!cleaned)
      console.error(
        'A background operation did not stop within five seconds; temporary run cleanup may be incomplete.',
      );
    store.close();
    unlock();
    process.exit(0);
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  if (values.desktop) {
    // The shell holds stdin open without sending commands. EOF also catches
    // abrupt shell death, without unsafe PID polling or attaching to a port.
    process.stdin.once('end', stop);
    process.stdin.once('error', stop);
    process.stdin.resume();
  }
}

if (import.meta.main)
  launchWorkspace().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
