import { lockWorkspace } from '../lock';
const path = process.argv[2];
if (!path?.includes('counsel-lock-test-') || !path.endsWith('/workspace.sqlite3')) throw new Error('Only isolated lock fixtures are allowed.');
await Bun.stdin.text();
try {
  const release = lockWorkspace(path);
  process.stdout.write(JSON.stringify({ acquired: true, pid: process.pid }) + '\n');
  process.on('SIGTERM', () => { release(); process.exit(0); });
  setInterval(() => {}, 1000);
} catch (error) {
  process.stdout.write(JSON.stringify({ acquired: false, error: (error as Error).message }) + '\n');
  process.exit(1);
}
