import { useEffect } from 'react';
import { Tree } from '../vault/Tree';
import { Reader } from './vault/Reader';

export interface DrawerProps {
  /** The file open in the drawer, or `null` for the tree alone. */
  path: string | null;
  /** Bumped by the shell when something wrote the open path — an approved
   * proposal. The `Reader` reads once per key, so without this the drawer
   * would keep showing the file as it was before the decision. */
  revision?: number;
  onOpen(path: string): void;
  onClose(): void;
  /** The reader's ask bar, when the shell offers it. */
  onAsk?: (path: string) => void;
}

/**
 * The vault beside the thread: the same reading pane as the vault page,
 * minus the outline, at 420px (spec §3.4). Closable by its button or Esc.
 * Opened by the shell's `openDrawer` — from a step's path, or a proposal's
 * "open in vault".
 */
export function Drawer({ path, revision = 0, onOpen, onClose, onAsk }: DrawerProps): JSX.Element {
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <aside className="v2-drawer" aria-label="Vault drawer">
      <header className="v2-drawer-head">
        {path === null ? null : (
          <a className="v2-link v2-drawer-full" href={`#/vault?path=${encodeURIComponent(path)}`}>
            open page
          </a>
        )}
        <button type="button" className="v2-drawer-close" aria-label="Close vault" onClick={onClose}>
          ×
        </button>
      </header>
      <div className="v2-drawer-tree">
        <Tree selected={path} expandToSelected onSelect={onOpen} />
      </div>
      <div className="v2-drawer-file">
        {path === null ? (
          <p className="muted v2-empty">Pick a file to read it.</p>
        ) : (
          <Reader key={`${path}#${revision}`} path={path} onAsk={onAsk} />
        )}
      </div>
    </aside>
  );
}
