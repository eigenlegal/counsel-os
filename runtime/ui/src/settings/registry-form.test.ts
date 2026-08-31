import { describe, expect, test } from 'bun:test';
import type { RegistryFileData } from '../api/types';
import {
  formFromRegistry,
  humanDuration,
  mapIssues,
  registryFromForm,
  unplacedTaskMessages,
} from './registry-form';

describe('task routes as rows', () => {
  const registry: RegistryFileData = {
    default: 'fake/fake',
    tasks: {
      review: { prefer: 'claude-sub/claude-opus-5', require: { contextTokens: 200000, thinking: true } },
      privacy: { prefer: 'ollama/gemma4:e4b', allow_remote: false },
    },
  };

  test('round-trips exactly: file → rows → file', () => {
    const built = registryFromForm(formFromRegistry(registry));
    if (!built.ok) throw new Error(JSON.stringify(built.errors));
    expect(built.registry).toEqual(registry);
  });

  test('an untouched empty form writes no tasks key', () => {
    const built = registryFromForm(formFromRegistry({}));
    if (!built.ok) throw new Error(JSON.stringify(built.errors));
    expect('tasks' in built.registry).toBe(false);
  });

  test('a nameless route is an error on ITS row, keyed by row key', () => {
    const form = formFromRegistry({ tasks: { review: { prefer: 'fake/fake' } } });
    form.routes.push({ ...form.routes[0]!, key: 'row-test', task: '  ', prefer: 'fake/fake' });
    const built = registryFromForm(form);
    expect(built.ok).toBe(false);
    if (built.ok) return;
    expect(built.errors['route.row-test.task']).toBe('name the kind of work this route matches');
  });

  test('two routes with one name: the second row carries the error', () => {
    const form = formFromRegistry({ tasks: { review: { prefer: 'fake/fake' } } });
    form.routes.push({ ...form.routes[0]!, key: 'row-dup' });
    const built = registryFromForm(form);
    expect(built.ok).toBe(false);
    if (built.ok) return;
    expect(built.errors['route.row-dup.task']).toBe('there is already a route for "review"');
    expect(built.errors[`route.${form.routes[0]!.key}.task`]).toBeUndefined();
  });

  test('a route with no provider is an error, not a half-route', () => {
    const form = formFromRegistry({ tasks: { review: { prefer: 'fake/fake' } } });
    form.routes[0]!.prefer = ' ';
    const built = registryFromForm(form);
    expect(built.ok).toBe(false);
    if (built.ok) return;
    expect(built.errors[`route.${form.routes[0]!.key}.prefer`]).toBe('pick the provider this work should go to');
  });

  test('min context must be a positive whole number', () => {
    const form = formFromRegistry({ tasks: { review: { prefer: 'fake/fake' } } });
    form.routes[0]!.contextTokens = '-3';
    const built = registryFromForm(form);
    expect(built.ok).toBe(false);
    if (built.ok) return;
    expect(built.errors[`route.${form.routes[0]!.key}.contextTokens`]).toBe('must be a whole number above zero');
  });
});

describe('humanDuration', () => {
  test('speaks minutes, seconds, and their mix', () => {
    expect(humanDuration(120000)).toBe('2 minutes');
    expect(humanDuration(60000)).toBe('1 minute');
    expect(humanDuration(90000)).toBe('1 minute 30 seconds');
    expect(humanDuration(1000)).toBe('1 second');
    expect(humanDuration(1500)).toBe('1.5 seconds');
    expect(humanDuration(500)).toBe('500 ms');
  });

  test('says nothing for a value it cannot speak', () => {
    expect(humanDuration(0)).toBe('');
    expect(humanDuration(-5)).toBe('');
    expect(humanDuration(Number.NaN)).toBe('');
    expect(humanDuration(Number.POSITIVE_INFINITY)).toBe('');
  });
});

describe('server issues on routes', () => {
  test('a tasks issue keeps its full path as the field key', () => {
    const mapped = mapIssues([{ path: ['tasks', 'review', 'prefer'], message: 'expected string' }]);
    expect(mapped.fields['tasks.review.prefer']).toBe('expected string');
    expect(mapped.general).toEqual([]);
  });

  test('unplacedTaskMessages surfaces what no rendered row will claim', () => {
    const form = formFromRegistry({ tasks: { review: { prefer: 'fake/fake' } } });
    const fields = {
      'tasks.review.prefer': 'shown on the row',
      'tasks.renamed.prefer': 'orphaned by a rename',
      tasks: 'a tasks-level issue',
      default: 'not a tasks issue',
    };
    expect(unplacedTaskMessages(fields, form.routes)).toEqual([
      'tasks.renamed.prefer: orphaned by a rename',
      'tasks: a tasks-level issue',
    ]);
  });
});
