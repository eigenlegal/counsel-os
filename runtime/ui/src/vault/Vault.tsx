import { FileView } from './FileView';
import { Tree } from './Tree';

export interface VaultProps {
  /** The file named by `#/vault?path=…`, or `null` for "nothing open yet".
   * The fragment owns it, not this component: a proposal card links straight
   * to a path, and that link has to open the file it names. */
  path: string | null;
  onOpen(path: string): void;
}

export function Vault({ path, onOpen }: VaultProps): JSX.Element {
  return (
    <div className="vault two-column">
      <Tree selected={path} onSelect={onOpen} />
      <main className="column-main vault-main">
        {path === null ? <p className="muted vault-empty">Pick a file to read it.</p> : <FileView key={path} path={path} />}
      </main>
    </div>
  );
}
