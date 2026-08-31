/**
 * Where an e2e run lives, and how its throwaway vault is built.
 *
 * Its own module because two different runtimes need these values: the
 * Playwright config and the spec run under Node, and `e2e/serve.ts` runs
 * under Bun. Importing them from `serve.ts` would run that file's top-level
 * work — seed, build, spawn a server — inside the test runner.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** The repo root — this file is `<root>/e2e/paths.ts`.
 *
 * `__dirname`, not `import.meta.url`: Playwright's config loader transforms
 * TypeScript to CommonJS, and an `import.meta` anywhere in a file makes that
 * transform emit a module Node then refuses to load. Bun defines `__dirname`
 * in ES modules too, so the one spelling works in both runtimes. */
export const ROOT = dirname(__dirname);

/** Everything one run writes, in a directory that is deleted and rebuilt on
 * every start. Under `e2e/`, not `/tmp`, so a failed run's vault and thread
 * log are still there to read afterwards. */
export const TMP = join(ROOT, 'e2e', '.tmp');

/** `COUNSEL_OS_HOME` for the run: `runtime.json` (with the bearer token) and
 * any `providers.yaml` land here, never in the developer's real
 * `~/.counsel-os`. */
export const HOME_DIR = join(TMP, 'home');

/** The vault `serve --vault` is pointed at. */
export const VAULT_DIR = join(TMP, 'vault');

/** Fixed, so the config, the spec and the server wrapper agree without a
 * handshake file. The token still is not predictable — that comes out of
 * `runtime.json`. */
export const PORT = 7499;

export const BASE_URL = `http://127.0.0.1:${PORT}`;

/** The file the runtime publishes for a client to find it by. */
export const RUNTIME_FILE = join(HOME_DIR, 'runtime.json');

/** The matter the fake script's `vault_read` asks for — WITH frontmatter,
 * so the home cards and the reader's fact rows have something honest to
 * draw (redesign spec §3.2/§3.4). */
const ACME = `---
title: Acme Corp — NDA
counterparty: Acme Corp
stage: working
next_action: send document list
deadline: 2026-09-12
---
# Acme Corp — NDA

Counterparty: Acme Corp
Term: 2 years
`;

/**
 * A marked Counsel OS legal root: `resolveLegalRoot` accepts a directory only
 * when its `config.md` carries BOTH `counsel-os-config: true` and a
 * `legal_root:` line. `serve --vault` skips discovery, but the vault tools
 * still read this file for `entities_path` / `matters_path`, so an unmarked
 * directory would be a vault that half works.
 */
export function seedVault(): void {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(HOME_DIR, { recursive: true, mode: 0o700 });
  mkdirSync(join(VAULT_DIR, 'matters'), { recursive: true });
  mkdirSync(join(VAULT_DIR, 'practice', 'standards'), { recursive: true });
  writeFileSync(join(VAULT_DIR, 'config.md'), `counsel-os-config: true\nlegal_root: ${VAULT_DIR}\n`);
  writeFileSync(join(VAULT_DIR, 'matters', 'acme.md'), ACME);
}
