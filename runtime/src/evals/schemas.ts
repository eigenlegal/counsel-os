/**
 * The typed-answer schema each scorer asks the step for (spec §4.2). The
 * findings shape is `evals/findings.schema.json` written as zod so the
 * compiled binary needs no file on disk; the JSON stays as the documented
 * contract for anyone producing outputs by hand.
 */
import { z, type ZodType } from 'zod';
import type { ScorerKind } from './fixture';

export const FindingsAnswer = z.object({
  findings: z.array(
    z.object({
      title: z.string(),
      severity: z.enum(['red', 'yellow', 'green']),
      clause: z.string(),
      rationale: z.string(),
      citations: z.array(z.string()),
    }),
  ),
  citations: z.array(z.string()),
});

export const ExtractionAnswer = z.object({
  fields: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
});

export const ClassificationAnswer = z.object({ answer: z.string() });

export const RedlineAnswer = z.object({
  items: z.array(
    z.object({
      current: z.string(),
      proposed: z.string(),
      comment: z.string().nullable().optional(),
      match: z
        .object({
          location: z.string().optional(),
          occurrence: z.number().int().optional(),
          before: z.string().optional(),
          after: z.string().optional(),
          context: z.string().optional(),
        })
        .nullable()
        .optional(),
    }),
  ),
});

/** `undefined` for the rubric scorer: it grades prose, so the step runs
 * untyped and the answer is the model's text. */
export function outputSchemaFor(scorer: ScorerKind): ZodType<unknown> | undefined {
  switch (scorer) {
    case 'findings':
      return FindingsAnswer;
    case 'extraction':
      return ExtractionAnswer;
    case 'classification':
      return ClassificationAnswer;
    case 'redline':
      return RedlineAnswer;
    case 'rubric':
      return undefined;
  }
}
