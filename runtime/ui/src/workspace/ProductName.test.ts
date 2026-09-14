import { expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { PRODUCT_NAME } from '../../../src/core/brand';

test('workspace product copy consistently uses Counsel OS, including accessible controls', () => {
  expect(PRODUCT_NAME).toBe('Counsel OS');
  for (const file of readdirSync(import.meta.dir)) {
    if (!/\.(?:tsx?|css)$/.test(file) || /\.test\./.test(file)) continue;
    const text = readFileSync(new URL(file, import.meta.url), 'utf8');
    expect(text, file).not.toContain('Counsel OS OS');
    expect(text.replaceAll('Counsel OS', '').replaceAll('Counsel-OS', ''), file).not.toMatch(/Counsel/);
  }
  const app = readFileSync(new URL('./WorkspaceApp.tsx', import.meta.url), 'utf8');
  expect(app).toContain('className="brand-name">Counsel OS</span>');
  expect(app).toContain('aria-label="Counsel OS chats"');
  const chat = readFileSync(new URL('./Chat.tsx', import.meta.url), 'utf8');
  expect(chat).toContain('aria-label="Message Counsel OS"');
  expect(readFileSync(new URL('../../workspace.html', import.meta.url), 'utf8')).toContain('<title>Counsel OS — Your workspace</title>');
});
