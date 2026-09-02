/**
 * Which task a step is (routing-and-evals spec §3): the caller's word wins,
 * then the thread's, then a rule pass over the message and its attachments,
 * then one small structured model call, else `chat`.
 *
 * The rules are deliberately narrow and literal — a lawyer who types
 * "redline it" means redline — and the model call is an injected
 * dependency, so the loop's tests never spend a scripted provider turn on
 * classification and a runtime with no provider still classifies by rule.
 */
import { z } from 'zod';
import type { ModelProvider, StepEvent } from '../core/types';
import { isLocal } from '../router/router';
import type { Router } from '../router/router';
import { attachmentPaths } from '../vault/policy';
import { isTask, TASK_IDS, TASKS, type TaskId, type TaskSource } from './taxonomy';

export interface ClassifyInput {
  message: string;
  /** The caller's task (the step body). */
  callerTask?: string | undefined;
  /** The thread header's task (a retro thread). */
  threadTask?: string | undefined;
}

export interface Classification {
  task: TaskId;
  source: TaskSource;
}

/** One structured call: the message → a task id, or `null` when it cannot say. */
export type ModelClassifier = (message: string, opts?: { localOnly?: boolean }) => Promise<TaskId | null>;

const DOCUMENT_EXT = /\.(docx|md|txt|pdf)$/i;

interface Rule {
  task: TaskId;
  /** Every pattern is tried against the lower-cased message. */
  any: RegExp[];
  /** When set, the rule also needs a document attached. */
  needsDocument?: boolean;
}

/** Order matters: the first rule whose pattern hits wins, so the more
 * specific verbs (redline, compare) sit above the broader ones (review). */
const RULES: readonly Rule[] = [
  { task: 'redline', any: [/\bredline/, /tracked changes/, /\bmark(?:ed)? up\b/, /\bmarkup\b/] },
  { task: 'compare', any: [/\bcompare\b/, /what moved/, /\bround(?:s)?\b.*\b(?:vs|versus|against)\b/, /\bdiff(?:erence)?s?\b.*\b(?:between|against)\b/] },
  { task: 'extract', any: [/\bextract\b/, /list (?:the )?(?:parties|defined terms|definitions|dates|deadlines|obligations)/, /\bdefined terms\b/, /who are the parties/] },
  { task: 'summarize', any: [/\bsummari[sz]e\b/, /\bsummary\b/, /\bbrief me\b/, /\bbrief (?:the|this)\b/, /\btl;?dr\b/, /where (?:are we|do we stand|does this stand)/] },
  { task: 'docket', any: [/\bdeadline/, /\bdocket\b/, /what(?:'s| is) due/, /next actions?\b/, /\bcalendar\b/] },
  { task: 'remember', any: [/\bremember (?:this|that)\b/, /\bsave this\b/, /\bupdate (?:our|the) standard/, /\badd (?:this )?to (?:our )?(?:standards|memory|playbook)/, /\bfrom now on\b/] },
  { task: 'research', any: [/\bresearch\b/, /what does the law/, /\bcase law\b/, /\bstatute\b/, /\bcite\b/, /is it (?:legal|lawful|permitted)/, /what(?:'s| is) the law/, /\bjurisdiction\b.*\brequire/] },
  { task: 'draft', any: [/\bdraft\b/, /\bwrite (?:a|an|the|me)\b/, /\bprepare (?:a|an|the)\b/] },
  { task: 'review', any: [/\breview\b/, /\bevaluate\b/, /\bflag\b/, /would we (?:not )?sign/, /\bissues? with\b/, /\bred ?flags?\b/, /\bassess\b/, /\bgo through\b/], needsDocument: true },
  // A bare "review" with nothing attached still reads as a review request
  // (the document may already be in the thread); kept below the attached
  // form so the attachment case matches first and reads the same.
  { task: 'review', any: [/\breview\b/, /\bevaluate\b/, /would we (?:not )?sign/] },
];

export function classifyByRules(message: string): TaskId | null {
  const lower = message.toLowerCase();
  const hasDocument = attachmentPaths(message).some(p => DOCUMENT_EXT.test(p));
  for (const rule of RULES) {
    if (rule.needsDocument === true && !hasDocument) continue;
    if (rule.any.some(re => re.test(lower))) return rule.task;
  }
  return null;
}

/**
 * The step's task and where it came from. A caller's or a thread's task is
 * taken as given even when it is not in the taxonomy (a custom route name
 * from Settings) — the taxonomy is the vocabulary the runtime SPEAKS, not a
 * gate on what it accepts.
 */
export async function classifyTask(input: ClassifyInput, model?: ModelClassifier, opts: { localOnly?: boolean } = {}): Promise<{ task: string; source: TaskSource }> {
  if (input.callerTask !== undefined && input.callerTask !== '') return { task: input.callerTask, source: 'caller' };
  if (input.threadTask !== undefined && input.threadTask !== '') return { task: input.threadTask, source: 'caller' };
  const rule = classifyByRules(input.message);
  if (rule !== null) return { task: rule, source: 'rule' };
  if (model !== undefined) {
    try {
      const guessed = await model(input.message, opts);
      if (guessed !== null && isTask(guessed)) return { task: guessed, source: 'model' };
    } catch {
      // A classifier that fails is a `chat` step, never a failed step.
    }
  }
  return { task: 'chat', source: 'default' };
}

const CLASSIFY_TIMEOUT_MS = 10_000;

const TaskAnswer = z.object({ task: z.enum(TASK_IDS as [TaskId, ...TaskId[]]) });

/**
 * The model-backed classifier (spec §3): the cheapest LOCAL provider when one
 * is loaded, else the router's default; one structured turn with the
 * taxonomy quoted; ten seconds, then `null`. The message is the only content
 * sent — no vault, no tools — so a cloud classifier sees one sentence; under
 * a matter that stays local (`localOnly`) only a local model may see it.
 */
export function modelClassifier(providers: readonly ModelProvider[], router: Router, tenant = 'default'): ModelClassifier {
  return async (message: string, opts: { localOnly?: boolean } = {}): Promise<TaskId | null> => {
    const local = providers.filter(p => isLocal(p.capabilities)).sort((a, b) => a.capabilities.contextTokens - b.capabilities.contextTokens);
    let provider: ModelProvider | undefined;
    try {
      // A matter that stays on this machine classifies on a local model or
      // not at all (providers spec §7): the message never reaches the cloud,
      // not even for one word back.
      provider = opts.localOnly === true ? local[0] : (local[0] ?? router.resolve());
    } catch {
      return null;
    }
    if (provider === undefined) return null;
    const cancel = new AbortController();
    const timer = setTimeout(() => cancel.abort(), CLASSIFY_TIMEOUT_MS);
    try {
      const system = [
        'Classify a lawyer\'s request into exactly one task id. Answer with the id only.',
        ...TASKS.map(t => `- ${t.id}: ${t.definition}`),
      ].join('\n');
      let output: unknown = null;
      for await (const ev of provider.run({
        tenant,
        system,
        messages: [{ role: 'user', content: message }],
        tools: [],
        outputSchema: TaskAnswer,
        maxTokens: 30,
        maxToolCalls: 0,
        signal: cancel.signal,
      })) {
        const e = ev as StepEvent;
        if (e.type === 'done') output = e.output;
        if (e.type === 'error') return null;
      }
      const parsed = TaskAnswer.safeParse(output);
      return parsed.success ? parsed.data.task : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };
}
