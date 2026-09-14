import { afterEach, expect, test } from 'bun:test';
import { createRef } from 'react';
import { readFileSync } from 'node:fs';
import { cleanup, render, screen } from '../test/dom';
import { WorkspaceFrame } from './WorkspaceFrame';

afterEach(cleanup);

test('page frames share layout without inserting a wrapper around their content', () => {
  const ref = createRef<HTMLElement>();
  render(<WorkspaceFrame as="main" ref={ref} id="workspace-content" className="app-content" tabIndex={-1}>
    <h1>Workspace page</h1>
  </WorkspaceFrame>);
  const main = screen.getByRole('main');
  expect(ref.current).toBe(main);
  expect(main.classList.contains('workspace-frame-page')).toBe(true);
  expect(main.classList.contains('app-content')).toBe(true);
  expect(main.id).toBe('workspace-content');
  expect(screen.getByRole('heading').parentElement).toBe(main);
  main.focus();
  expect(document.activeElement).toBe(main);
});

test('only an explicit canvas opts out of the normal page layout', () => {
  const { rerender } = render(<WorkspaceFrame as="main" mode="canvas">Chat</WorkspaceFrame>);
  expect(screen.getByRole('main').classList.contains('workspace-frame-canvas')).toBe(true);
  rerender(<WorkspaceFrame as="main">Chats list</WorkspaceFrame>);
  expect(screen.getByRole('main').classList.contains('workspace-frame-canvas')).toBe(false);
  expect(screen.getByRole('main').classList.contains('workspace-frame-page')).toBe(true);
});

test('header frames do not introduce extra main landmarks', () => {
  const { container } = render(<WorkspaceFrame className="topbar-frame">Breadcrumb</WorkspaceFrame>);
  expect(container.firstElementChild?.tagName).toBe('DIV');
  expect(container.firstElementChild?.classList.contains('workspace-frame-page')).toBe(true);
  expect(screen.queryByRole('main')).toBeNull();
});

test('layout tokens own page gutters and checkboxes do not inherit search-only alignment', () => {
  const read = (name: string) => readFileSync(new URL(name, import.meta.url), 'utf8');
  const styles = read('./workspace.css');
  const layout = read('./layout.css');
  expect(read('./main.tsx')).toContain("import './layout.css'");
  expect(layout).toContain('padding-inline: var(--workspace-gutter)');
  expect(layout).toContain('max-width: var(--workspace-page-width)');
  expect(styles.match(/\n\.checkbox-label \{[^}]*\}/)?.[0]).not.toContain('margin-left: auto');
  expect(styles).toContain('.search-filters > .checkbox-label');
  expect(styles).not.toMatch(/\.conversation-history\s*\{[^}]*padding:/);
  expect(read('./chat.css')).not.toContain(':has(.page-home)');
});
