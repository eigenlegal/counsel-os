import { z } from 'zod';

export const PracticeFiling = z.object({
  expectedVersion: z.string().length(64), confirm: z.literal(true),
  destination: z.enum(['matter', 'external', 'practice']), matterId: z.string().uuid().nullable(),
}).strict().refine(value => value.destination === 'matter' ? !!value.matterId : value.matterId === null,
  'Choose a matter only when filing as a matter document.');
