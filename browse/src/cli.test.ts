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
