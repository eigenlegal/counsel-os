import { cleanProposal } from '../docx/clean-proposal';
import { boundedWordPackage } from './word-package';
export async function runCleanWorker(): Promise<void> {
globalThis.fetch = Object.assign(async () => { throw new Error('External resources are not fetched.'); }, { preconnect: () => {} });
try {
  const input = JSON.parse(await Bun.stdin.text());
  const original = boundedWordPackage(Buffer.from(input.original, 'base64'));
  const redline = boundedWordPackage(Buffer.from(input.redline, 'base64'));
  const report = cleanProposal(original, redline, input.author);
  process.stdout.write(JSON.stringify({ bytes: Buffer.from(redline.save()).toString('base64'), report }));
} catch (error) { process.stdout.write(JSON.stringify({ error: (error as Error).message })); }
}
if (import.meta.main) await runCleanWorker();
