import { expect, test } from 'bun:test';
import { repositoryPathIssue } from './repository_policy';

test('source paths and explicit synthetic fixtures stay eligible for review', () => {
  for (const path of ['desktop/macos/main.swift', 'desktop/release.json', 'runtime/src/workspace/store.ts',
    'e2e/fixtures/workspace-import/.hidden.txt', 'knowledge/practice-seed/profile.md', 'evals/sample-outputs/review.json',
    'docs/design.png', '.env.example']) expect(repositoryPathIssue(path)).toBeNull();
});
test('private/generated paths stay excluded even if force-added', () => {
  for (const path of ['.env', 'runtime/.env.local', 'data/workspace.sqlite3', 'data/workspace.sqlite3-wal', 'data/work.db',
    'data/work.sqlite-journal', 'client.counsel-backup', 'Counsel OS.dmg', 'Counsel OS.app/Contents/Info.plist', 'signing/key.p12',
    'key.pem', 'node_modules/x.ts', 'runtime/ui/dist/index.html', 'backups/a.md', 'knowledge/matters/a.md',
    'knowledge/practice/profile.md', 'knowledge/memory/a.md', 'evals/outputs/a.json', 'evals/benchmarks/a.json',
    '.counsel/settings.json', '../outside', 'bad\nname']) expect(repositoryPathIssue(path)).not.toBeNull();
  expect(repositoryPathIssue('looks-like-source.ts', '120000')).not.toBeNull();
  expect(repositoryPathIssue('submodule', '160000')).not.toBeNull();
});
