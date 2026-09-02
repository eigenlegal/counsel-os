/**
 * The legal task taxonomy the runtime speaks (routing-and-evals spec §3).
 * COPIED from `runtime/src/tasks/taxonomy.ts`; a change there is a change
 * here. The page uses it for the task picker on a turn's record and for the
 * Task field of a route — as suggestions there, never a constraint.
 */
export const TASK_IDS: readonly string[] = ['review', 'redline', 'draft', 'research', 'extract', 'summarize', 'compare', 'remember', 'docket', 'retro', 'chat'];

export type TaskSource = 'caller' | 'rule' | 'model' | 'default' | 'corrected';

/** Where a step's task came from, in the words a reader of the record sees. */
export function sourceWord(source: TaskSource | undefined): string {
  switch (source) {
    case 'caller':
      return 'stated';
    case 'rule':
      return 'by rule';
    case 'model':
      return 'guessed';
    case 'corrected':
      return 'corrected';
    case 'default':
      return 'by default';
    default:
      return '';
  }
}
