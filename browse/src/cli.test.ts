import { describe, expect, test } from 'bun:test';
import * as path from 'path';
import { ensurePluginNodePath, resolveServerCommand } from './cli';

describe('browse server resolver', () => {
  test('environment override wins', () => {
    expect(resolveServerCommand({
      env: { BROWSE_SERVER_SCRIPT: '/tmp/custom-server.ts' },
      importMetaDir: '/repo/browse/src',
      execPath: '/repo/browse/dist/browse',
      existsSync: () => true,
    })).toEqual(['bun', 'run', '/tmp/custom-server.ts']);
  });

  test('development mode runs browse/src/server.ts', () => {
    const importMetaDir = '/repo/browse/src';
    expect(resolveServerCommand({
      env: {},
      importMetaDir,
      execPath: '/repo/browse/dist/browse',
      existsSync: file => file === path.resolve(importMetaDir, 'server.ts'),
    })).toEqual(['bun', 'run', '/repo/browse/src/server.ts']);
  });

  test('compiled mode starts the embedded server entrypoint', () => {
    expect(resolveServerCommand({
      env: {},
      importMetaDir: '$bunfs/root',
      execPath: '/repo/browse/dist/browse',
      existsSync: () => false,
    })).toEqual(['/repo/browse/dist/browse', '__server']);
  });

  test('ensurePluginNodePath no-ops when plugin node_modules is absent', () => {
    const env: NodeJS.ProcessEnv = { NODE_PATH: '/existing' };

    ensurePluginNodePath(env, '/repo/browse/dist/browse', () => false);

    expect(env.NODE_PATH).toBe('/existing');
  });

  test('ensurePluginNodePath prepends plugin node_modules once', () => {
    const env: NodeJS.ProcessEnv = { NODE_PATH: '/existing' };
    const execPath = '/repo/browse/dist/browse';
    const pluginNodeModules = path.join('/repo', 'node_modules');

    ensurePluginNodePath(env, execPath, file => file === pluginNodeModules);
    ensurePluginNodePath(env, execPath, file => file === pluginNodeModules);

    expect(env.NODE_PATH).toBe(`${pluginNodeModules}${path.delimiter}/existing`);
  });
});

describe('daemon reap PID-reuse guard', () => {
  const { isBrowseServerCmdline } = require('./cli');

  test('recognizes compiled server processes', () => {
    expect(isBrowseServerCmdline('/Users/x/.claude/plugins/cache/m/counsel-os/0.9.42/browse/dist/browse __server')).toBe(true);
  });

  test('recognizes dev-mode server processes', () => {
    expect(isBrowseServerCmdline('bun run /Users/x/counsel-os/browse/src/server.ts')).toBe(true);
  });

  test('refuses recycled PIDs belonging to other processes', () => {
    expect(isBrowseServerCmdline('/Applications/Safari.app/Contents/MacOS/Safari')).toBe(false);
    expect(isBrowseServerCmdline('node /some/other/server.ts')).toBe(false);
    expect(isBrowseServerCmdline('')).toBe(false);
    expect(isBrowseServerCmdline(null)).toBe(false);
    expect(isBrowseServerCmdline(undefined)).toBe(false);
  });
});
