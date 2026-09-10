import { buildDocx } from '../runtime/src/docx/test/builder';
import { syntheticPdf } from '../runtime/src/workspace/fixtures/documents';
const documents = {
  'Round baseline.docx': buildDocx({ blocks: [{ runs: ['Payment net 30.'] }] }),
  'Round sent.docx': buildDocx({ blocks: [{ runs: ['Payment net 45.'] }] }),
  'Round returned.docx': buildDocx({ blocks: [{ runs: ['Payment net 60.'] }] }),
  'Synthetic notice.docx': buildDocx({
    blocks: [
      { runs: ['Written notice is required.'] },
      {
        runs: [
          { text: 'Oral notice', del: { author: 'Synthetic', date: '2026-09-04' } },
          { text: 'Written notice', ins: { author: 'Synthetic', date: '2026-09-04' } },
        ],
      },
    ],
  }),
  'Synthetic evidence.pdf': syntheticPdf([
    'Synthetic interview evidence.',
    '',
    'The timing remains unresolved.',
  ]),
  'No-text.pdf': syntheticPdf(['']),
};
console.log(
  JSON.stringify(
    Object.fromEntries(
      Object.entries(documents).map(([name, bytes]) => [
        name,
        Buffer.from(bytes).toString('base64'),
      ]),
    ),
  ),
);
