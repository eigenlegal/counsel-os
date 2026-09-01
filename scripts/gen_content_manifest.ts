#!/usr/bin/env bun
// Regenerates runtime/src/content/manifest.ts (and, with `--embedded <out.ts>`,
// the embedded-source module for the compiled binary). See
// runtime/src/content/generate.ts.
import { main } from '../runtime/src/content/generate';

await main(Bun.argv.slice(2));
