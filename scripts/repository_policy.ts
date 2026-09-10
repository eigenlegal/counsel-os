/** Read-only tracked/index-file guard. Secret scanning is a separate check. */
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

export function repositoryPathIssue(path: string, mode = '100644'): string | null {
  if (mode === '120000' || mode === '160000') return 'Symlinks and submodules need an explicit distribution review';
  if (/^(?:\/|\.\.\/)|\/\.\.\//.test(path) || /[\x00-\x1f\x7f]/.test(path)) return 'Unsafe repository path';
  if (/(^|\/)(?:node_modules|dist|backups|\.counsel|\.venv|playwright-report|test-results)(\/|$)/.test(path)
    || /^(?:knowledge\/(?:practice|matters|memory)|evals\/(?:outputs|benchmarks))(\/|$)/.test(path)) return 'Local/generated data must not be tracked';
  const name = path.split('/').at(-1)!;
  if (name !== '.env.example' && /^\.env(?:\.|$)/.test(name)) return 'Environment configuration must not be tracked';
  if (/\.(?:sqlite3?|db)(?:-(?:wal|shm|journal))?$|\.(?:counsel-backup|dmg|p12|pfx|key|pem|bun-build)$/i.test(name)
    || /\.app(?:\/|$)/i.test(path)) return 'Workspace, signing or build artifact must not be tracked';
  return null;
}

export function checkRepository(repo = resolve(import.meta.dir, '..')) {
  // Read the index: this also checks new files explicitly staged before commit.
  const rows = execFileSync('git', ['ls-files', '--stage', '-z'], { cwd: repo, encoding: 'utf8' }).split('\0').filter(Boolean);
  const issues = rows.flatMap(row => {
    const tab = row.indexOf('\t'), header = row.slice(0, tab).split(' '), path = row.slice(tab + 1);
    const reason = header[2] !== '0' ? 'Unresolved index conflict' : repositoryPathIssue(path, header[0]);
    return reason ? [{ path, reason }] : [];
  });
  return { files: rows.length, issues };
}

if (import.meta.main) {
  const result = checkRepository();
  for (const issue of result.issues) console.error(`${issue.path}: ${issue.reason}`);
  console.log(`Repository path policy: ${result.files} indexed files, ${result.issues.length} issues. This is not a private-content or secret scan.`);
  process.exitCode = result.issues.length ? 1 : 0;
}
