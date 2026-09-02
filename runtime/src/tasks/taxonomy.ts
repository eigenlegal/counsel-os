/**
 * The legal task taxonomy (routing-and-evals spec §3): the closed set every
 * step is tagged with. A task decides which route the router consults, which
 * scorer an eval uses, and how the scoreboard groups results — so it is a
 * vocabulary, not a free string. `chat` is the honest catch-all.
 */

export type TaskId =
  | 'review'
  | 'redline'
  | 'draft'
  | 'research'
  | 'extract'
  | 'summarize'
  | 'compare'
  | 'remember'
  | 'docket'
  | 'retro'
  | 'chat';

export type ScorerKind = 'findings' | 'redline' | 'rubric' | 'extraction' | 'classification' | 'none';

export interface TaskDefinition {
  id: TaskId;
  /** One line the prompt (and a picker) can quote. */
  definition: string;
  /** The scorer an eval of this task uses by default (spec §4). */
  scorer: ScorerKind;
}

export const TASKS: readonly TaskDefinition[] = [
  { id: 'review', definition: "evaluate a document against the practice's standards; findings with severity", scorer: 'findings' },
  { id: 'redline', definition: 'produce edits (tracked changes) to a document', scorer: 'redline' },
  { id: 'draft', definition: "write a new document or clause from the practice's positions", scorer: 'rubric' },
  { id: 'research', definition: "answer a legal question from the vault's law and reference layers", scorer: 'findings' },
  { id: 'extract', definition: 'pull structured facts: parties, terms, dates, defined terms, clauses', scorer: 'extraction' },
  { id: 'summarize', definition: "brief a document or a matter's state", scorer: 'rubric' },
  { id: 'compare', definition: 'two documents or rounds: what moved', scorer: 'extraction' },
  { id: 'remember', definition: 'promote a learning into memory or the standards (proposals)', scorer: 'rubric' },
  { id: 'docket', definition: 'deadlines and next actions', scorer: 'extraction' },
  { id: 'retro', definition: 'the periodic review of the practice', scorer: 'rubric' },
  { id: 'chat', definition: 'anything else', scorer: 'none' },
];

export const TASK_IDS: readonly TaskId[] = TASKS.map(t => t.id);

export function isTask(value: unknown): value is TaskId {
  return typeof value === 'string' && (TASK_IDS as readonly string[]).includes(value);
}

export function taskDefinition(id: TaskId): TaskDefinition {
  return TASKS.find(t => t.id === id)!;
}

/** Where a step's task came from (spec §3): stamped beside the task so a
 * scoreboard can weigh a guessed task differently from a stated one. */
export type TaskSource = 'caller' | 'rule' | 'model' | 'default' | 'corrected';
