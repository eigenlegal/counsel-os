import type { EvidenceInput } from './types';
import type { ContextRecord } from './conversations';

type Ref = Pick<ContextRecord, 'kind' | 'id'>;
export interface EvidenceDiscovery {
  records: Array<Ref & Pick<ContextRecord, 'title' | 'version' | 'status'> & {
    relation: 'cited-version' | 'newer-version'; start: number; length: number;
  }>;
  unavailable: number;
  omitted: number;
  note: string;
}

/** Follow recorded relationships, not model-inferred similarities. Resolve EACH target
 * through the caller's ordinary read boundary before exposing even its title or ID.
 * Metadata is not a read, an access grant, or a claim that a newer version says the same thing.
 */
export function discoverEvidence(
  evidence: EvidenceInput[],
  resolve: (ref: Ref) => Pick<ContextRecord, 'title' | 'version' | 'status'>,
  current: (ref: Ref) => Ref | null,
): EvidenceDiscovery {
  const records: EvidenceDiscovery['records'] = [];
  const seen = new Set<string>();
  let unavailable = 0, omitted = Math.max(0, evidence.length - 100);
  for (const link of evidence.slice(0, 100)) {
    let ref: Ref = { kind: link.target.kind, id: link.target.kind === 'work' ? link.target.workId : link.target.revisionId };
    let relation: EvidenceDiscovery['records'][number]['relation'] = 'cited-version';
    let metadata: ReturnType<typeof resolve>;
    try { metadata = resolve(ref); }
    catch {
      unavailable++;
      try {
        const replacement = current(ref);
        if (!replacement || replacement.id === ref.id) continue;
        metadata = resolve(replacement);
        ref = replacement;
        relation = 'newer-version';
      } catch { continue; }
    }
    const start = relation === 'cited-version' ? link.start : 0;
    const key = `${ref.kind}:${ref.id}:${relation}:${start}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (records.length === 20) { omitted++; continue; }
    records.push({ ...ref, title: metadata.title, version: metadata.version, status: metadata.status, relation, start,
      length: relation === 'cited-version' ? Math.min(4000, link.quote.length) : 4000 });
  }
  return { records, unavailable, omitted,
    note: 'Recorded supporting links, not content reads. Read relevant passages before citing. Newer versions are separate checks, not the original supporting evidence; their offsets and conclusions may differ. Unavailable links disclose no identity and do not expand this chat’s access. At most 100 links examined and 20 returned.' };
}
