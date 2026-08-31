import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, fetchJson } from '../../api/client';
import type { VaultEntry, VaultOverview } from '../../api/types';
import { baseName, orderEntries } from '../../vault/Tree';
import { groupRoot, monthLabel } from './tree';

export interface VaultTreeProps {
  overview: VaultOverview;
  /** The root listing (`GET /vault/list`), for the non-matter groups. */
  root: VaultEntry[];
  selected: string | null;
  onOpen(path: string): void;
}

/**
 * The grouped tree pane (spec §3.4): Matters (humanized titles, quiet
 * months), Practice (the practice/ children), Knowledge (memory · law ·
 * entities), and "Other files (n)" collapsed over everything else the
 * server still lists. Directories stay lazy — a level is fetched when
 * somebody opens it, once.
 */
export function VaultTree({ overview, root, selected, onOpen }: VaultTreeProps): JSX.Element {
  // `orderEntries` on the ROOT too, not only the lazy levels: it is what
  // drops `.counsel` (the runtime's private directory) and puts dirs first.
  // A client that only hides what the server happens to hide is one server
  // bug away from listing thread logs under "Other files".
  const groups = useMemo(() => groupRoot(orderEntries(root), overview), [root, overview]);
  const [levels, setLevels] = useState<Record<string, VaultEntry[] | undefined>>({});
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const [otherOpen, setOtherOpen] = useState(false);
  const asked = useRef<Set<string>>(new Set());

  const ensure = useCallback((dir: string): void => {
    if (asked.current.has(dir)) return;
    asked.current.add(dir);
    void (async () => {
      try {
        const entries = await fetchJson<VaultEntry[]>(`/vault/list?dir=${encodeURIComponent(dir)}`);
        setLevels(prev => ({ ...prev, [dir]: orderEntries(entries) }));
      } catch (err) {
        // A 401 is the app's problem, not this folder's — the client has
        // already announced it.
        if (err instanceof ApiError && err.status === 401) return;
        setLevels(prev => ({ ...prev, [dir]: [] }));
      }
    })();
  }, []);

  // Practice shows its CHILDREN as the group's rows (the mock's
  // standards/playbooks), so those levels load eagerly.
  useEffect(() => {
    for (const entry of groups.practice) ensure(entry.path);
    // A new root listing can add a practice dir; `ensure` dedupes.
  }, [groups.practice, ensure]);

  const toggle = (dir: string): void => {
    setOpen(prev => {
      const next = new Set(prev);
      if (next.has(dir)) next.delete(dir);
      else next.add(dir);
      return next;
    });
    ensure(dir);
  };

  const fileRow = (path: string, name: string, indent: boolean): JSX.Element => (
    <button
      key={path}
      type="button"
      className={indent ? 'v2-vrow v2-vrow-ind' : 'v2-vrow'}
      aria-current={selected === path ? 'page' : undefined}
      onClick={() => onOpen(path)}
    >
      <span className="v2-vname">{name}</span>
    </button>
  );

  const dirNode = (entry: VaultEntry, indent: boolean): JSX.Element => (
    <div key={entry.path}>
      <button
        type="button"
        className={indent ? 'v2-vrow v2-vdir v2-vrow-ind' : 'v2-vrow v2-vdir'}
        aria-expanded={open.has(entry.path)}
        onClick={() => toggle(entry.path)}
      >
        <span className="v2-tri" aria-hidden="true">
          {open.has(entry.path) ? '▾' : '▸'}
        </span>
        <span className="v2-vname">{baseName(entry.path)}</span>
      </button>
      {open.has(entry.path)
        ? (levels[entry.path] ?? []).map(child =>
            child.kind === 'dir' ? dirNode(child, true) : fileRow(child.path, baseName(child.path), true),
          )
        : null}
    </div>
  );

  return (
    <div className="v2-tlist">
      {groups.matters.length === 0 ? null : (
        <>
          <div className="v2-vgroup">Matters</div>
          {groups.matters.map(matter => (
            <button
              key={matter.path}
              type="button"
              className="v2-vrow v2-vrow-ind"
              aria-current={selected === matter.path ? 'page' : undefined}
              onClick={() => onOpen(matter.path)}
            >
              <span className="v2-vname">{matter.title}</span>
              <span className="v2-vmonth">{monthLabel(matter)}</span>
            </button>
          ))}
        </>
      )}

      {groups.practice.length === 0 ? null : (
        <>
          <div className="v2-vgroup">Practice</div>
          {groups.practice.flatMap(practice =>
            (levels[practice.path] ?? []).map(child =>
              child.kind === 'dir' ? dirNode(child, false) : fileRow(child.path, baseName(child.path), false),
            ),
          )}
        </>
      )}

      {groups.knowledge.length === 0 ? null : (
        <>
          <div className="v2-vgroup">Knowledge</div>
          {groups.knowledge.map(entry => dirNode(entry, false))}
        </>
      )}

      {groups.other.length === 0 ? null : (
        <>
          <button type="button" className="v2-vrow v2-vdir v2-vother" aria-expanded={otherOpen} onClick={() => setOtherOpen(o => !o)}>
            <span className="v2-tri" aria-hidden="true">
              {otherOpen ? '▾' : '▸'}
            </span>
            <span className="v2-vname">Other files ({groups.other.length})</span>
          </button>
          {otherOpen
            ? groups.other.map(entry => (entry.kind === 'dir' ? dirNode(entry, true) : fileRow(entry.path, baseName(entry.path), true)))
            : null}
        </>
      )}
    </div>
  );
}
