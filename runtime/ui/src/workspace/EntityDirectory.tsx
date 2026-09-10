import { useState, type FormEvent } from 'react';
import { ZodError } from 'zod';
import { request, href, type Snapshot } from './api';
import { Badge, ErrorNotice, Modal } from './components';
import { Entity, Signatory, SigningRule, EntityRegistryFields, registryFields,
  type EntityRegistry, type SignatoryCheck } from '../../../src/workspace/entities';
import { SigningCheckCard } from './SigningCheck';

type Edit = { kind: 'entity'; value: Entity } | { kind: 'person'; value: Signatory } | { kind: 'rule'; value: SigningRule };
const KIND_LABEL = { nda: 'NDAs', vendor: 'Vendor agreements', other: 'Other agreements' };
export function EntityDirectory({ data, changed }: { data: Snapshot; changed: () => void }): JSX.Element {
  const registry = data.entityRegistry ?? null, fields = registryFields(registry);
  const [edit, setEdit] = useState<Edit | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function availability() {
    if (busy) return; setBusy(true); setError('');
    try { await request('/entity-registry', { ...fields, availableToChats: !fields.availableToChats, expectedRevisionId: registry?.revisionId ?? null }); changed(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <section className="entity-directory" aria-label="Entities and signatories">
    <div className="section-heading"><div><h2>Entities &amp; signatories</h2><p>Your contracting details and who signs what.</p></div>
      <Badge tone={fields.availableToChats ? 'green' : 'neutral'}>{fields.availableToChats ? 'Available to chats' : 'Not shared with chats'}</Badge></div>
    <p className="field-help">For your practice’s signing entities, not a client database. When enabled, these details can be used across this workspace’s chats. Keep matter-only or another client’s information with that matter.</p>
    <div className="entity-availability"><span>{registry ? `Directory version ${registry.version}. ` : ''}Saving makes no model call. Missing addresses and titles stay unknown.</span>
      <button className="button" disabled={busy || !!edit} onClick={() => void availability()}>{fields.availableToChats ? 'Stop sharing with new chats' : 'Make available to chats'}</button></div>
    {error && <ErrorNotice message={error} />}
    <section className="entity-directory-group" aria-label="Signing entities">
      <div className="section-heading"><h3>Signing entities</h3><button className="button" onClick={() => setEdit({ kind: 'entity', value: { ...Entity.parse({ id: crypto.randomUUID(), name: 'New entity' }), name: '' } })}>Add entity</button></div>
      {!fields.entities.length && <p className="field-help">Add the legal names you use in agreements. An address is optional until a document needs it.</p>}
      {fields.entities.map(entity => <div className="entity-directory-row" key={entity.id}>
        <div><h4>{entity.name} {!entity.active && <Badge>Inactive</Badge>}</h4>
          <p>{entity.aliases.join(' · ') || entity.jurisdiction || 'No aliases recorded'}</p>
          <details><summary>Saved details</summary><dl className="entity-facts">
            {([['jurisdiction', 'Jurisdiction'], ['registeredAddress', 'Registered address'], ['noticeAddress', 'Notice address'], ['noticeEmail', 'Notice email'], ['sourceNote', 'Source or basis']] as const).map(([key,label]) =>
              <div key={key}><dt>{label}</dt><dd>{entity[key] || 'Not recorded'}</dd></div>)}
          </dl></details>
        </div><button className="text-button" aria-label={`Edit entity ${entity.name}`} onClick={() => setEdit({ kind: 'entity', value: entity })}>Edit</button>
      </div>)}
    </section>
    <section className="entity-directory-group" aria-label="Signatories">
      <div className="section-heading"><h3>Signatories</h3><button className="button" onClick={() => setEdit({ kind: 'person', value: { ...Signatory.parse({ id: crypto.randomUUID(), name: 'New signatory' }), name: '' } })}>Add signatory</button></div>
      {!fields.signatories.length && <p className="field-help">Record a name and, if known, the title to use in a signature block. Adding someone does not give them authority.</p>}
      {fields.signatories.map(person => <div className="entity-directory-row" key={person.id}>
        <div><h4>{person.name} {!person.active && <Badge>Inactive</Badge>}</h4><p>{person.title || 'Title not recorded'}</p></div>
        <button className="text-button" aria-label={`Edit signatory ${person.name}`} onClick={() => setEdit({ kind: 'person', value: person })}>Edit</button>
      </div>)}
    </section>
    <section className="entity-directory-group" aria-label="Signing rules">
      <div className="section-heading"><h3>Who signs what</h3><button className="button" disabled={!fields.entities.length || !fields.signatories.length}
        onClick={() => setEdit({ kind: 'rule', value: { id: crypto.randomUUID(), label: '', entityIds: [], agreementKinds: [], signatoryId: '', valueLimit: null, fallback: false, active: true, sourceNote: '' } })}>Add signing rule</button></div>
      {!fields.rules.length && <p className="field-help">After adding an entity and a signatory, define which agreements they can sign.</p>}
      {fields.rules.map(rule => <div className="entity-directory-row" key={rule.id}>
        <div><h4>{rule.label} {!rule.active && <Badge>Inactive</Badge>}</h4>
          <p>{fields.signatories.find(p => p.id === rule.signatoryId)?.name} · {rule.agreementKinds.map(kind => KIND_LABEL[kind]).join(', ')}</p>
          <p>{rule.entityIds.map(id => fields.entities.find(e => e.id === id)?.name).join(', ')}</p>
          <p>{rule.valueLimit ? `Up to and including ${rule.valueLimit.currency} ${rule.valueLimit.maximum} · ${rule.valueLimit.basis === 'total' ? 'Total committed value' : rule.valueLimit.basis === 'annual' ? 'Annual spend' : 'Value basis needs confirmation'}` : rule.fallback ? 'Fallback only when no primary rule applies; unresolved facts still require clarification.' : 'No value limit in this rule.'}</p>
          {rule.sourceNote && <details><summary>Source or basis</summary><p>{rule.sourceNote}</p></details>}
        </div><button className="text-button" aria-label={`Edit rule ${rule.label}`} onClick={() => setEdit({ kind: 'rule', value: rule })}>Edit</button>
      </div>)}
      <p className="fine-print">Rules calculate a routing suggestion. They do not verify corporate authority, approve an agreement or execute a signature. Conflicting rules require clarification. <a href={href('knowledge', { section: 'preferences', view: 'writing' })}>View additional writing and signing guidance</a>.</p>
    </section>
    {registry && fields.entities.some(e => e.active) && <RegistryCheck key={registry.revisionId} registry={registry} />}
    {edit && <RegistryEditor edit={edit} registry={registry} close={() => setEdit(null)} saved={() => { setEdit(null); changed(); }} />}
  </section>;
}

function RegistryEditor({ edit, registry, close, saved }: { edit: Edit; registry: EntityRegistry | null; close: () => void; saved: () => void }): JSX.Element {
  const [base] = useState(registry), [draft, setDraft] = useState(edit), [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const fields = registryFields(base);
  function update(value: Edit) { setDraft(value); setDirty(true); }
  const dismiss = () => { if (!busy && (!dirty || confirm('Discard these unsaved changes?'))) close(); };
  async function save(event: FormEvent) {
    event.preventDefault(); if (busy) return; setError('');
    try {
      const next = structuredClone(fields);
      if (draft.kind === 'entity') next.entities = [...next.entities.filter(e => e.id !== draft.value.id), Entity.parse({ ...draft.value, aliases: draft.value.aliases.map(a => a.trim()).filter(Boolean) })];
      else if (draft.kind === 'person') next.signatories = [...next.signatories.filter(p => p.id !== draft.value.id), Signatory.parse(draft.value)];
      else next.rules = [...next.rules.filter(r => r.id !== draft.value.id), SigningRule.parse(draft.value)];
      const valid = EntityRegistryFields.safeParse(next);
      if (!valid.success) throw new Error(valid.error.issues.map(i => i.message).join(' '));
      setBusy(true); await request('/entity-registry', { ...valid.data, expectedRevisionId: base?.revisionId ?? null }); saved();
    } catch (e) { setError(e instanceof ZodError ? e.issues.map(issue => issue.message).join(' ') : (e as Error).message); } finally { setBusy(false); }
  }
  return <Modal title={draft.kind === 'entity' ? 'Edit signing entity' : draft.kind === 'person' ? 'Edit signatory' : 'Edit signing rule'} busy={busy} onClose={dismiss}>
    <form className="record-form" onSubmit={save}>
      <p className="form-intro">Record only the details you know. These changes affect future responses, not earlier saved context.</p>
      {draft.kind === 'entity' && <>
        <label>Legal name<input required maxLength={200} value={draft.value.name} disabled={busy} onChange={e => update({ kind: 'entity', value: { ...draft.value, name: e.target.value } })} /></label>
        <label>Aliases, one per line<textarea rows={2} maxLength={2000} value={draft.value.aliases.join('\n')} disabled={busy} onChange={e => update({ kind: 'entity', value: { ...draft.value, aliases: e.target.value.split('\n') } })} /></label>
        <label>Jurisdiction<input maxLength={200} value={draft.value.jurisdiction} disabled={busy} onChange={e => update({ kind: 'entity', value: { ...draft.value, jurisdiction: e.target.value } })} /></label>
        <label>Registered address<textarea rows={3} maxLength={2000} value={draft.value.registeredAddress} disabled={busy} onChange={e => update({ kind: 'entity', value: { ...draft.value, registeredAddress: e.target.value } })} /></label>
        <label>Notice address<textarea rows={3} maxLength={2000} value={draft.value.noticeAddress} disabled={busy} onChange={e => update({ kind: 'entity', value: { ...draft.value, noticeAddress: e.target.value } })} /></label>
        <label>Notice email<input type="email" maxLength={300} value={draft.value.noticeEmail} disabled={busy} onChange={e => update({ kind: 'entity', value: { ...draft.value, noticeEmail: e.target.value } })} /></label>
      </>}
      {draft.kind === 'person' && <>
        <label>Name<input required maxLength={200} value={draft.value.name} disabled={busy} onChange={e => update({ kind: 'person', value: { ...draft.value, name: e.target.value } })} /></label>
        <label>Signature-block title<input maxLength={200} value={draft.value.title} disabled={busy} placeholder="Leave blank if not confirmed" onChange={e => update({ kind: 'person', value: { ...draft.value, title: e.target.value } })} /></label>
      </>}
      {draft.kind === 'rule' && <>
        <label>Rule name<input required maxLength={200} value={draft.value.label} disabled={busy} placeholder="e.g. Routine vendor agreements" onChange={e => update({ kind: 'rule', value: { ...draft.value, label: e.target.value } })} /></label>
        <label>Signatory<select aria-label="Signatory" required value={draft.value.signatoryId} disabled={busy} onChange={e => update({ kind: 'rule', value: { ...draft.value, signatoryId: e.target.value } })}>
          <option value="">Choose a signatory</option>{fields.signatories.map(p => <option key={p.id} value={p.id}>{p.name}{!p.active ? ' (inactive)' : ''}</option>)}
        </select></label>
        <fieldset className="entity-choice-list"><legend>For these entities</legend>{fields.entities.map(entity => <label key={entity.id}>
          <input type="checkbox" checked={draft.value.entityIds.includes(entity.id)} disabled={busy} onChange={e => update({ kind: 'rule', value: { ...draft.value,
            entityIds: e.target.checked ? [...draft.value.entityIds, entity.id] : draft.value.entityIds.filter(id => id !== entity.id) } })} />{entity.name}</label>)}</fieldset>
        <fieldset className="entity-choice-list"><legend>Agreement types</legend>{(['nda', 'vendor', 'other'] as const).map(kind => <label key={kind}>
          <input type="checkbox" checked={draft.value.agreementKinds.includes(kind)} disabled={busy} onChange={e => update({ kind: 'rule', value: { ...draft.value,
            agreementKinds: e.target.checked ? [...draft.value.agreementKinds, kind] : draft.value.agreementKinds.filter(k => k !== kind) } })} />{KIND_LABEL[kind]}</label>)}</fieldset>
        <label>Value condition<select aria-label="Value condition" value={draft.value.fallback ? 'fallback' : draft.value.valueLimit ? 'limited' : 'any'} disabled={busy} onChange={e => update({ kind: 'rule', value: { ...draft.value,
          fallback: e.target.value === 'fallback', valueLimit: e.target.value === 'limited' ? { maximum: '', currency: '', basis: null } : null } })}>
          <option value="any">No value condition</option><option value="limited">Up to and including a limit</option><option value="fallback">Fallback when no primary rule applies</option>
        </select></label>
        {draft.value.valueLimit && <>
          <div className="form-pair"><label>Maximum amount<input required inputMode="decimal" value={draft.value.valueLimit.maximum} disabled={busy} placeholder="100000.00" onChange={e => update({ kind: 'rule', value: { ...draft.value, valueLimit: { ...draft.value.valueLimit!, maximum: e.target.value } } })} /></label>
          <label>Currency<input required maxLength={3} value={draft.value.valueLimit.currency} disabled={busy} placeholder="USD" onChange={e => update({ kind: 'rule', value: { ...draft.value, valueLimit: { ...draft.value.valueLimit!, currency: e.target.value.toUpperCase() } } })} /></label></div>
          <label>What value counts?<select aria-label="What value counts?" value={draft.value.valueLimit.basis ?? ''} disabled={busy} onChange={e => update({ kind: 'rule', value: { ...draft.value, valueLimit: { ...draft.value.valueLimit!, basis: e.target.value as 'total' | 'annual' || null } } })}>
            <option value="">Not confirmed; ask before applying</option><option value="total">Total committed contract value</option><option value="annual">Annual spend</option>
          </select></label>
        </>}
      </>}
      <label>Source or basis<textarea rows={3} maxLength={2000} value={draft.value.sourceNote} disabled={busy} placeholder="Where these details or instructions came from; note anything still uncertain." onChange={e => update({ ...draft, value: { ...draft.value, sourceNote: e.target.value } } as Edit)} /></label>
      <label className="entity-active"><input type="checkbox" checked={draft.value.active} disabled={busy} onChange={e => update({ ...draft, value: { ...draft.value, active: e.target.checked } } as Edit)} />Active for new responses</label>
      {error && <ErrorNotice message={error} />}
      <div className="dialog-actions"><button type="button" className="button button-quiet" disabled={busy} onClick={dismiss}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></div>
    </form>
  </Modal>;
}

function RegistryCheck({ registry }: { registry: EntityRegistry }): JSX.Element {
  const [result, setResult] = useState<SignatoryCheck | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function check(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; const form = new FormData(event.currentTarget); setBusy(true); setError(''); setResult(null);
    try { setResult(await request('/entity-registry/check', { entityId: form.get('entityId'), agreementKind: form.get('agreementKind') || null,
      amount: form.get('amount') || null, currency: form.get('currency') || null, valueBasis: form.get('valueBasis') || null })); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <details className="entity-check"><summary>Check a signing scenario</summary>
    <p className="field-help">Try the recorded rules without making a model call or enabling chat access.</p>
    <form onSubmit={check} onChange={() => { setResult(null); setError(''); }}><label>Signing entity<select aria-label="Signing entity" name="entityId" required disabled={busy}><option value="">Choose the entity</option>{registry.entities.filter(e => e.active).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
      <label>Agreement type<select aria-label="Agreement type" name="agreementKind" disabled={busy}><option value="">Unknown</option>{Object.entries(KIND_LABEL).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <div className="form-pair"><label>Agreement value<input name="amount" inputMode="decimal" disabled={busy} placeholder="Leave blank if unknown" /></label><label>Agreement currency<input name="currency" maxLength={3} disabled={busy} placeholder="USD" /></label></div>
      <label>Value basis<select aria-label="Value basis" name="valueBasis" disabled={busy}><option value="">Unknown</option><option value="total">Total committed contract value</option><option value="annual">Annual spend</option></select></label>
      <button className="button" disabled={busy}>{busy ? 'Checking…' : 'Check signing rules'}</button>
    </form>{error && <ErrorNotice message={error} />}{result && <SigningCheckCard value={result} />}
  </details>;
}
