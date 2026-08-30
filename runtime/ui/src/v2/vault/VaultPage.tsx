import { FileView } from '../../vault/FileView';
import { Tree } from '../../vault/Tree';

export interface VaultPageProps {
  /** The file named by `#/vault?path=…`, or `null` for the tree alone. */
  path: string | null;
  onOpen(path: string): void;
}

export function crumbs(path: string): string[] {
  return path.split('/').filter(segment => segment !== '');
}

/** Where the open file sits in the vault. Plain text — the tree beside it is
 * the navigation; this is orientation. */
export function Breadcrumb({ path }: { path: string }): JSX.Element {
  const parts = crumbs(path);
  return (
    <nav className="v2-crumbs" aria-label="Breadcrumb">
      {parts.map((part, i) => (
        <span key={`${i}-${part}`}>
          {i > 0 ? (
            <span className="v2-crumb-sep" aria-hidden="true">
              ›
            </span>
          ) : null}
          <span className={i === parts.length - 1 ? 'v2-crumb v2-crumb-last' : 'v2-crumb'}>{part}</span>
        </span>
      ))}
    </nav>
  );
}

/** The full vault page (spec §2, "Vault page + drawer"): the same `Tree`
 * and `FileView` as v1, with the v2 tokens, a breadcrumb, and the file
 * header `FileView` already draws (path + version). */
export function VaultPage({ path, onOpen }: VaultPageProps): JSX.Element {
  return (
    <div className="v2-vault">
      <Tree selected={path} onSelect={onOpen} />
      <main className="v2-vault-main">
        {path === null ? (
          <p className="muted v2-empty">Pick a file to read it.</p>
        ) : (
          <>
            <Breadcrumb path={path} />
            <FileView key={path} path={path} />
          </>
        )}
      </main>
    </div>
  );
}
