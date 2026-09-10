import type { SignatoryCheck } from '../../../src/workspace/entities';
import { href } from './api';

export function SigningCheckCard({ value }: { value: SignatoryCheck }): JSX.Element {
  const title = value.outcome === 'suggested' ? `Suggested signatory: ${value.signatory!.name}`
    : value.outcome === 'conflict' ? 'Signing rules conflict' : value.outcome === 'needs-information' ? 'Signing details need clarification'
    : value.outcome === 'no-rule' ? 'No matching signing rule' : 'Signing entity unavailable';
  return <section className="signing-check-card" aria-label="Recorded signing-rule check">
    <h4>{title}</h4>
    <p>{value.entity?.name ?? 'Entity not available'}{value.input.agreementKind ? ` · ${value.input.agreementKind === 'nda' ? 'NDA' : value.input.agreementKind === 'vendor' ? 'Vendor agreement' : 'Other agreement'}` : ''}</p>
    {value.reasons.map(reason => <p key={reason}>{reason}</p>)}
    <details><summary>Rule and input details</summary>
      <p>Directory version {value.registryVersion ?? 'not available'}. This is the saved version used for this check.</p>
      <p>Supplied value: {value.input.currency ?? ''} {value.input.amount ?? 'Not supplied'}; basis: {value.input.valueBasis === 'total' ? 'total committed value' : value.input.valueBasis === 'annual' ? 'annual spend' : 'not supplied'}.</p>
      {value.rules.map(rule => <p key={rule.id}>{rule.label}</p>)}
      <p>{value.note}</p>
      <a href={href('knowledge', { section: 'preferences', view: 'entities' })}>View current entities and rules</a>
    </details>
    <p className="fine-print">A routing suggestion, not verified authority or agreement approval.</p>
  </section>;
}
