import { describe, expect, test } from 'bun:test';
import { configFor, isSaasInHouse, profileFor, SetupPlan } from './plan';

const base = {
  vault: '/tmp/vault',
  identity: { name: 'Jack Wang', organization: 'Eigen Legal', role: 'solo' as const, jurisdiction: 'Massachusetts' },
  practice: 'Commercial contracts and data privacy for software companies',
};

describe('SetupPlan', () => {
  test('fills the defaults', () => {
    const plan = SetupPlan.parse(base);
    expect(plan.sampleMatter).toBe(true);
    expect(plan.git).toBe(true);
    expect(plan.defaultProvider).toBeUndefined();
  });

  test('rejects a relative vault, an unknown role, an empty name', () => {
    expect(() => SetupPlan.parse({ ...base, vault: 'Documents/Counsel OS' })).toThrow('absolute');
    expect(() => SetupPlan.parse({ ...base, identity: { ...base.identity, role: 'partner' } })).toThrow();
    expect(() => SetupPlan.parse({ ...base, identity: { ...base.identity, name: '  ' } })).toThrow('name is required');
  });
});

describe('isSaasInHouse', () => {
  test('in-house plus a SaaS or software answer, and nothing else', () => {
    expect(isSaasInHouse({ identity: { ...base.identity, role: 'in-house' }, practice: 'GC at a B2B SaaS company' })).toBe(true);
    expect(isSaasInHouse({ identity: { ...base.identity, role: 'in-house' }, practice: 'Head of legal, software' })).toBe(true);
    expect(isSaasInHouse({ identity: { ...base.identity, role: 'in-house' }, practice: 'in-house at a hospital' })).toBe(false);
    expect(isSaasInHouse({ identity: { ...base.identity, role: 'outside' }, practice: 'SaaS clients' })).toBe(false);
  });
});

describe('profileFor', () => {
  test('the tuned profile for a SaaS GC, identity filled', () => {
    const text = profileFor(SetupPlan.parse({ ...base, identity: { ...base.identity, role: 'in-house' }, practice: 'GC at a B2B SaaS company' }));
    expect(text.startsWith('---\ncounsel-os-type: practice\n---\n')).toBe(true);
    expect(text).toContain('Jack Wang, in-house counsel at Eigen Legal. In-house counsel for a SaaS / software company. GC at a B2B SaaS company. Primary jurisdiction: Massachusetts.');
    expect(text).toContain('**RED (senior review):**');
    expect(text).not.toContain('general starting-point defaults');
  });

  test('the general profile otherwise, labelled as defaults', () => {
    const text = profileFor(SetupPlan.parse(base));
    expect(text).toContain('> These are general starting-point defaults');
    expect(text).toContain('Jack Wang, solo practitioner at Eigen Legal. Commercial contracts and data privacy for software companies. Primary jurisdiction: Massachusetts.');
  });

  test('empty organization and jurisdiction leave no dangling words', () => {
    const text = profileFor(SetupPlan.parse({ ...base, identity: { name: 'A', role: 'outside' }, practice: '' }));
    expect(text).toContain('A, outside counsel. \n');
  });
});

describe('configFor', () => {
  test('carries the marker lines the resolver looks for and the commented overrides', () => {
    const text = configFor('/Users/x/Documents/Counsel OS');
    const lines = text.split('\n');
    expect(lines).toContain('counsel-os-config: true');
    expect(lines).toContain('legal_root: /Users/x/Documents/Counsel OS');
    expect(text).toContain('# entities_path: entities');
    expect(text).toContain("# law_management: plugin");
  });
});

describe('configFor and the vault-wide locality (providers spec §7)', () => {
  test('the default is a commented line; the first-run checkbox writes it live', () => {
    expect(configFor('/v')).toContain('# default_locality: any');
    expect(configFor('/v', { defaultLocality: 'local' })).toContain('\ndefault_locality: local');
    expect(configFor('/v', { defaultLocality: 'local' })).not.toContain('# default_locality');
  });

  test('the plan carries staysLocalDefault, off unless asked', () => {
    const plan = SetupPlan.parse({ vault: '/v', identity: { name: 'J', role: 'solo' } });
    expect(plan.staysLocalDefault).toBe(false);
    expect(SetupPlan.parse({ vault: '/v', identity: { name: 'J', role: 'solo' }, staysLocalDefault: true }).staysLocalDefault).toBe(true);
  });
});
