/**
 * A fixture's mini-vault, copied fresh for one run (a port of
 * `run_evals.py`'s `prepare_fixture_vault`): the copy lands in a temp
 * directory and `config.md`'s `__VAULT_PATH__` placeholder is rewritten to
 * the copy's real path, so the resolver treats it as a marked legal root.
 * The caller owns the temp directory and removes it when the run ends.
 */
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { LoadedFixture } from './fixture';

export interface PreparedVault {
  tmp: string;
  vault: string;
  remove(): void;
}

export function prepareFixtureVault(loaded: LoadedFixture, opts: { tmpDir?: string } = {}): PreparedVault {
  const name = loaded.fixture.vault;
  if (name === undefined) throw new Error(`fixture ${loaded.fixture.id} has no vault — a legacy fixture cannot be run, only scored from a saved output`);
  const src = join(loaded.vaultsDir, name);
  if (!existsSync(src) || !statSync(src).isDirectory()) throw new Error(`vault not found for fixture ${loaded.fixture.id}: ${src}`);

  const tmp = mkdtempSync(join(opts.tmpDir ?? tmpdir(), 'counsel-eval-'));
  const vault = join(tmp, 'vault');
  cpSync(src, vault, { recursive: true });
  const cfg = join(vault, 'config.md');
  if (existsSync(cfg)) writeFileSync(cfg, readFileSync(cfg, 'utf8').replaceAll('__VAULT_PATH__', vault), 'utf8');
  return { tmp, vault, remove: () => rmSync(tmp, { recursive: true, force: true }) };
}
