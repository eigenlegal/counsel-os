import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';

describe('shared form-control contract', () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
  const controls = read('./controls.css');

  test('both applications load the automatic native select and file-input treatment', () => {
    expect(read('./main.tsx')).toContain("import './controls.css'");
    expect(read('./workspace/main.tsx')).toContain("import '../controls.css'");
    expect(controls).toContain('select:not([multiple]):not([size])');
    expect(controls).toContain("select:not([multiple])[size='1']");
    expect(controls).toContain('--select-caret-inset: 14px');
    expect(controls).toContain('--select-caret-half: 5px');
    expect(controls).toContain('padding-inline-end: calc(');
    expect(controls).toContain("input[type='file']::file-selector-button");
    expect(controls).toContain('forced-colors: active');
    expect(controls).toContain(':dir(rtl)');
  });

  test('chat and settings use the same button variants as all other workspace screens', () => {
    for (const name of readdirSync(new URL('./workspace/', import.meta.url))) {
      if (!name.endsWith('.tsx')) continue;
      expect(read(`./workspace/${name}`)).not.toMatch(/className="button (primary|secondary)"/);
    }
    expect(read('./workspace/chat.css')).not.toContain('.button.primary');
    expect(read('./workspace/workspace.css')).toContain('--button-hover-background');
    expect(read('./workspace/workspace.css')).toContain('--button-ink');
  });

  test('generic form defaults have no specificity advantage over composed controls', () => {
    expect(read('./workspace/workspace.css').replaceAll('"', "'").replace(/\s+/g, ' ')).toContain(
      ":where(label > input:not([type='checkbox']), label > textarea, label > select)",
    );
  });
});
