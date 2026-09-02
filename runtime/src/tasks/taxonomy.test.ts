import { describe, expect, test } from 'bun:test';
import { isTask, TASK_IDS, TASKS, taskDefinition } from './taxonomy';

describe('the task taxonomy (routing-and-evals spec §3)', () => {
  test('is the closed set the spec names, chat last', () => {
    expect(TASK_IDS).toEqual(['review', 'redline', 'draft', 'research', 'extract', 'summarize', 'compare', 'remember', 'docket', 'retro', 'chat']);
  });

  test('every task has a one-line definition and a default scorer', () => {
    for (const t of TASKS) {
      expect(t.definition.length).toBeGreaterThan(10);
      expect(['findings', 'redline', 'rubric', 'extraction', 'classification', 'none']).toContain(t.scorer);
    }
    expect(taskDefinition('redline').scorer).toBe('redline');
    expect(taskDefinition('chat').scorer).toBe('none');
  });

  test('isTask accepts only the closed set', () => {
    expect(isTask('review')).toBe(true);
    expect(isTask('classify')).toBe(false);
    expect(isTask('')).toBe(false);
    expect(isTask(undefined)).toBe(false);
    expect(isTask(3)).toBe(false);
  });
});
