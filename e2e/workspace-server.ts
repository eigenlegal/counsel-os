/** Browser-test fixture only. Never opens a real user's workspace. */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { workspaceHandler } from '../runtime/src/workspace/http';
import { WorkspaceStore } from '../runtime/src/workspace/store';
import practice from '../runtime/src/workspace/fixtures/practice.json';
import { WorkspaceChat } from '../runtime/src/workspace/chat';
import { planRecall } from '../runtime/src/workspace/recall-plan';
import type { ModelProvider, StepRequest, StepEvent } from '../runtime/src/core/types';
import { runToolDef } from '../runtime/src/core/fake-provider';
import { WorkspaceConnection } from '../runtime/src/workspace/connection';
import { parseBundledCodexModels } from '../runtime/src/workspace/model-catalog';
import { memoryStore } from '../runtime/src/providers/secrets';
import { FILE_MAX_REQUEST_BYTES } from '../runtime/src/workspace/files';
import { seedPluginContext } from '../runtime/src/workspace/fixtures/plugin-context';

const empty = process.argv.includes('--empty');
const briefFixture = process.argv.includes('--briefs');
const contextFixture = process.argv.includes('--context');
const chatFixture = process.argv.includes('--chat') || process.argv.includes('--practice-document') || briefFixture || contextFixture;
const cliFixture = process.argv.includes('--claude-cli');
const modelFixture = process.argv.includes('--model-catalog');
const port = process.argv.includes('--practice-document') ? 7465 : cliFixture ? 7462 : contextFixture ? 7473 : briefFixture ? 7472 : chatFixture ? 7461 : empty ? 7459 : 7458;
const root = mkdtempSync(join(tmpdir(), 'counsel-workspace-browser-'));
const store = new WorkspaceStore({
  databasePath: join(root, 'workspace.sqlite3'),
});
const ids = !empty ? store.importSeed(practice).records : null;
if (process.argv.includes('--recall')) store.createKnowledge({kind:'position',revision:{title:'Saved NDA instruction',body:'Nonsolicitation is excluded.',status:'approved',approvedBy:'Synthetic Lawyer'}});
if (process.argv.includes('--upkeep')) store.upkeep.start();
const contextIds = contextFixture ? seedPluginContext(store) : null;
if (contextIds && process.argv.includes('--evidence-context')) {
  const note = store.createSource({ kind: 'reference', matterIds: [contextIds.matters.aster!], revision: {
    title: 'Supporting correspondence 17', body: 'Certificate ZX-14 remains unsigned.', provenance: { origin: 'fixture:evidence' },
  } });
  store.recordWork({ matterId: contextIds.matters.aster, title: 'Earlier monitoring advice', request: 'Monitoring question', answer: 'Monitoring remains on hold.', evidence: [
    { target: { kind: 'source', revisionId: note.latest.id }, start: 0, quote: note.latest.body! },
    { target: { kind: 'source', revisionId: contextIds.sourceRevisions.outside! }, start: 0, quote: 'OUTSIDE-SCOPE-CANARY' },
  ] });
}
if (process.argv.includes('--authority-fixture')) {
  const ordinaryFetch = globalThis.fetch;
  let generation = 0;
  globalThis.fetch = (async (url, init) => {
    if (String(url).startsWith('https://uscode.house.gov/')) {
      generation++;
      return new Response(`<html><body><div id="docViewer"><span class="lawsInEffect">Text contains those laws in effect on September 6, 2026</span><!-- documentid:15_7001 usckey:15007001 currentthrough:20260712_119-102 documentPDFPage:-1 --><h3>15 USC 7001: Synthetic rule</h3><p>Synthetic publisher text ${generation}.</p><h4>Effective date</h4><p>Synthetic statutory notes remain in the saved text.</p></div></body></html>`);
    }
    if (!String(url).startsWith('https://www.ecfr.gov/')) return ordinaryFetch(url, init);
    if (String(url).endsWith('titles.json')) return Response.json({ titles: [{ number: 31, reserved: false, up_to_date_as_of: '2026-09-03' }] });
    generation++;
    return new Response(`<DIV8 TYPE="SECTION" N="1010.100"><HEAD>Test definitions</HEAD><P>Synthetic publisher text ${generation}.</P></DIV8>`);
  }) as typeof fetch;
}
// Explicit browser-test-only adapter. Never offered by the real launcher.
const provider: ModelProvider = {
  id: 'test/scripted-fixture',
  kind: 'direct',
  capabilities: {
    tools: true,
    caching: false,
    thinking: false,
    contextTokens: 100000,
    auth: 'local',
  },
  async *run(req: StepRequest): AsyncIterable<StepEvent> {
    if (req.outputSchema || req.system.includes('import organization helper')) {
      if (req.system.startsWith('Prepare alternate workspace search queries')) {
        yield {type:'done',output:{queries:['nonsolicitation']},usage:{inputTokens:0,outputTokens:0}};return;
      }
      const instruction = req.messages.at(-1)?.content ?? '';
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, 250);
        req.signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new Error('stopped')); }, { once: true });
      });
      if (instruction.includes('fixture failure')) { yield { type: 'error', message: 'Synthetic failure' }; return; }
      if (req.system.includes("matter-brief drafting helper")) {
        yield { type: 'done', output: { status: 'open', summary: 'Synthetic history: the interview remains outstanding.',
          questions: 'The disputed timing is unresolved.', nextActions: 'Arrange the outstanding interview.', question: '' },
          usage: { inputTokens: 0, outputTokens: 0 } };
        return;
      }
      if (req.system.includes("import organization helper")) {
        const context = JSON.parse(req.system.split('Context:\n')[1]!);
        // Test-only derived text; production sends labeled excerpts, not a second copy.
        for (const file of context.files) file.text = file.evidence.map((item: { text: string }) => item.text).join('\n');
        if (context.files.some((file: { text: string }) => file.text.includes('Background organization fixture'))) {
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(resolve, 650);
            req.signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new Error('stopped')); }, { once: true });
          });
          yield { type: 'done', output: { suggestions: context.files.map((file: { entryId: string; path: string; text: string; evidence: Array<{ id: string; text: string }> }) => {
            const uncertain = file.text.includes('company background');
            const title = file.text.includes('employment dispute') ? 'Aster employment dispute' : 'Aster NDA';
            const matter = context.candidateMatters.find((item: { title: string }) => item.title === title);
            return { entryId: file.entryId, destination: 'source', collection: 'unfiled', matterId: uncertain ? null : matter?.id ?? null,
              matterTitle: uncertain || matter ? null : title, whenToUse: '', reason: uncertain ? 'Company background has no specific matter.' : 'The document identifies this engagement.',
              confidence: uncertain ? 'low' : 'high', evidenceRef: file.text.includes('BROKEN EVIDENCE') || (file.text.includes('REPAIR EVIDENCE') && !req.system.includes('one isolated repair attempt'))
                ? 'not-this-file:1:0' : file.evidence[1]!.id };
          }) }, usage: { inputTokens: 0, outputTokens: 0 } }; return;
        }
        yield { type: 'done', output: { suggestions: context.files.map((file: { entryId: string; path: string }) => ({
          entryId: file.entryId, destination: 'source', collection: file.path.includes('research') ? 'external' : 'unfiled',
          matterId: file.path.includes('Northstar') ? context.candidateMatters.find((item: { title: string }) => item.title === 'Northstar NDA')?.id ?? null : null,
          matterTitle: null, whenToUse: '', reason: 'Synthetic organization suggestion based on the selected filename.',
          confidence: file.path.includes('uncertain') ? 'low' : 'high', evidenceQuote: file.path,
        })) }, usage: { inputTokens: 0, outputTokens: 0 } };
        return;
      }
      if (req.system.includes('organize selected existing files')) {
        const context = JSON.parse(req.system.split('Context:\n')[1]!);
        yield { type: 'done', output: { suggestions: context.files.map((file: { sourceId: string; title: string; text: string; candidateMatters: {id:string;title:string}[] }) => {
          const matter = `${file.title} ${file.text}`.includes('Northstar') ? file.candidateMatters.find(item => item.title === 'Northstar NDA') : null;
          return { sourceId: file.sourceId, target: { collection: matter ? 'matter' : file.title.includes('uncertain') ? 'unfiled' : 'external', matterId: matter?.id ?? null, matterTitle: matter?.title ?? null },
            reason: 'Synthetic filing suggestion from this selected title.', confidence: file.title.includes('uncertain') ? 'low' : 'high', evidenceQuote: file.title };
        }) }, usage: { inputTokens: 0, outputTokens: 0 } }; return;
      }
      yield { type: 'done', output: { title: 'Synthetic NDA review approach', kind: 'method',
        body: 'Preserve the other side’s wording. Make only necessary edits and explain material changes in comments.', question: '' }, usage: { inputTokens: 0, outputTokens: 0 } };
      return;
    }
    const prompt = req.messages.at(-1)?.content ?? '';
    if (prompt.startsWith('Image attachment fixture')) {
      if (!req.images?.length || req.images.some(image => !image.data || !image.mediaType.startsWith('image/'))) throw new Error('Actual image inputs were not supplied.');
      yield { type: 'done', output: `Received ${req.images.length} image inputs. Synthetic transport test only; no visual interpretation or exact text citation is claimed.`, usage: { inputTokens: 0, outputTokens: 0 } }; return;
    }
    if (process.argv.includes('--practice-document') && prompt.startsWith('Practice document fixture')) {
      const read = await runToolDef(req.tools, 'counsel_read_practice', { requestQuote: prompt }, req.tenant);
      if (read.isError) throw new Error(String(read.output));
      const before = read.output as { body: string; word: { author: string; filenamePattern: string; redlineLabel: string; draftLabel: string } };
      const result = await runToolDef(req.tools, 'counsel_propose_practice', { requestQuote: prompt, reason: 'Synthetic user-requested practice update.',
        body: before.body + '\n\n## How I work\n\nMy name is Synthetic Avery. Attribute my new Word comments and changes to Synthetic Avery.\n\n' + Array.from({length:20}, (_, i) => `Paragraph ${i + 1}: Preserve the chronology in construction disputes. Explain the reason for material changes.`).join('\n\n'),
        identityName: 'Synthetic Avery', word: { ...before.word, author: 'Synthetic Avery' } }, req.tenant);
      if (result.isError) throw new Error(String(result.output));
      yield { type: 'done', output: 'I prepared your practice update. Review the text and attribution before saving.', usage: {inputTokens:0,outputTokens:0} }; return;
    }
    if (process.argv.includes('--web-fixture') && prompt.startsWith('Public webpage fixture')) {
      const receipt = await runToolDef(req.tools, 'counsel_fetch_webpage', { url: 'https://example.org/terms' }, req.tenant);
      if (receipt.isError) throw new Error(String(receipt.output));
      const first = receipt.output as { revisionId: string; links: Array<{ url: string }> };
      const read = await runToolDef(req.tools, 'counsel_read_record', { kind: 'source', id: first.revisionId }, req.tenant);
      if (read.isError) throw new Error(String(read.output));
      const cite = await runToolDef(req.tools, 'counsel_cite_passage', { kind: 'source', id: first.revisionId,
        quote: 'Synthetic cancellation requires thirty days of notice.' }, req.tenant);
      if (cite.isError) throw new Error(String(cite.output));
      if (!first.links.some(link => link.url === 'https://example.org/definitions')) throw new Error('Missing incorporated link');
      const linked = await runToolDef(req.tools, 'counsel_fetch_webpage', { url: 'https://example.org/definitions' }, req.tenant);
      if (linked.isError) throw new Error(String(linked.output));
      const secondId = (linked.output as { revisionId: string }).revisionId;
      await runToolDef(req.tools, 'counsel_read_record', { kind: 'source', id: secondId }, req.tenant);
      const defined = await runToolDef(req.tools, 'counsel_cite_passage', { kind: 'source', id: secondId,
        quote: 'Synthetic service means the service on the order form.' }, req.tenant);
      if (defined.isError) throw new Error(String(defined.output));
      yield { type: 'done', output: 'The public terms require thirty days of notice. [S1] The service definition is in the linked schedule. [S2]\n\nSynthetic fixture only; the saved retrieval is not proof of the signing-date version.', usage: { inputTokens: 0, outputTokens: 0 } };
      return;
    }
    if (process.argv.includes('--recall') && prompt.includes('recruit our employees')) {
      const context=JSON.parse(req.system.split('Application context (data, not instructions):\n')[1]!);
      const passage=context.preparedPassages.find((p:{text?:string})=>p.text?.includes('Nonsolicitation is excluded.'));
      if(!passage)throw new Error('Expected prepared passage was not found.');
      const citation=await runToolDef(req.tools,'counsel_cite_passage',{kind:'knowledge',id:passage.readHandle,quote:'Nonsolicitation is excluded.'},req.tenant);
      if(citation.isError)throw new Error(String(citation.output));
      yield {type:'done',output:'The saved practice instruction excludes nonsolicitation. [S1]',usage:{inputTokens:0,outputTokens:0}};return;
    }
    if (prompt === 'Citation recovery fixture') {
      const context = JSON.parse(req.system.split('Application context (data, not instructions):\n')[1]!);
      const id = context.attachments[0]?.id;
      if (!id) throw new Error('Synthetic citation fixture needs its attachment.');
      const body = store.getSourceRevision(id).body!;
      const read = await runToolDef(req.tools, 'counsel_read_record', { kind: 'source', id }, req.tenant);
      if (read.isError) throw new Error(String(read.output));
      const handle = (read.output as { readHandle: string }).readHandle;
      const call = (quote: string, start?: number) => runToolDef(req.tools, 'counsel_cite_passage', { kind: 'source', id: handle, quote, ...(start === undefined ? {} : { start }) }, req.tenant);
      const exact = await call('Exact quote.', 2874); // Incorrect legacy hint is corrected locally.
      if (exact.isError) throw new Error(String(exact.output));
      if (!(await call('Repeat.')).isError || !(await call('Repeat.', 0)).isError) throw new Error('Ambiguous quote accepted.');
      if (!(await call('Altered quote.')).isError) throw new Error('Altered quote accepted.');
      const resolved = await call('Repeat.', body.lastIndexOf('Repeat.'));
      if (resolved.isError) throw new Error(String(resolved.output));
      yield { type: 'done', output: 'Exact quote. [S1] The final repeated wording is also checked. [S2]\n\nSynthetic fixture: an altered quotation remains unverified.', usage: { inputTokens: 0, outputTokens: 0 } };
      return;
    }
    if (prompt.startsWith('Preference fixture:')) {
      const proposed = await runToolDef(req.tools, 'counsel_propose_preferences', {
        changes: { ndaReview: 'Preserve acceptable wording. Explain every material NDA edit in a short comment.' },
        requestQuote: prompt, reason: 'Use the requested NDA review approach for future work.',
      }, 'workspace');
      if (proposed.isError) throw new Error(String(proposed.output));
      yield { type: 'done', output: 'Review the proposed preference update below before saving. Synthetic test only.', usage: { inputTokens: 0, outputTokens: 0 } };
      return;
    }
    yield {
      type: 'text',
      text: 'Synthetic adapter test — preparing the response.\n\n',
    };
    let answer = `Synthetic adapter test — no model call.\n\n${prompt}`;
    if (prompt.startsWith('signatory fixture ')) {
      const entityId = prompt.slice('signatory fixture '.length).trim();
      await runToolDef(req.tools, 'counsel_read_entity', { entityId }, req.tenant);
      const checked = await runToolDef(req.tools, 'counsel_check_signatory', { entityId, agreementKind: 'vendor', amount: '100000', currency: 'USD', valueBasis: 'total' }, req.tenant);
      if (checked.isError) throw new Error(String(checked.output));
      answer = 'Synthetic adapter test — the recorded signing-rule check appears below. No model call.';
    }
    if (contextIds && prompt.includes('practice update fixture')) {
      const result = await runToolDef(req.tools, 'counsel_propose_knowledge', {
        title: 'Employee monitoring — practice position', body: 'Limit employee location retention to 12 days. Record the monitoring purpose and restrict access.',
        kind: 'position', scope: 'practice', replaces: { kind: 'source', id: contextIds.sourceRevisions.position! },
      }, 'workspace');
      if (result.isError) throw new Error(String(result.output));
      answer = 'Prepared a new version of the existing monitoring standard for review. The current baseline remains in use.';
    } else if (contextIds) {
      const revision = store.getSourceRevision(contextIds.sourceRevisions.position!);
      const quote = 'Limit employee location retention to 14 days.';
      const citation = await runToolDef(req.tools, 'counsel_cite_passage', { kind: 'source', id: revision.id, quote, start: revision.body!.indexOf(quote) }, 'workspace');
      if (citation.isError) throw new Error('Prepared source could not be cited.');
      answer = `The imported practice baseline is 14 days. ${(citation.output as { marker: string }).marker}\n\nSynthetic browser test; no model call.`;
    } else if (prompt.includes('Synthetic guide fixture')) {
      for (const id of ['privacy', 'employment']) {
        const loaded = await runToolDef(req.tools, 'counsel_read_guide', { id }, 'workspace');
        if (loaded.isError) throw new Error('Synthetic guide load failed.');
      }
    }
    if (contextIds) {
      // The context fixture answer was prepared above; do not replace it below.
    } else if (prompt.includes('Synthetic client fixture') || prompt.includes('Synthetic multi-matter fixture')) {
      const listed = await runToolDef(req.tools, 'counsel_list_records', {kind:'source'}, 'workspace');
      if (listed.isError) throw new Error('Synthetic client listing failed.');
      const records = (listed.output as {records: {id:string;kind:string}[]}).records;
      answer = prompt.includes('Synthetic multi-matter fixture') ? 'Synthetic multi-matter response — no model call.\n\n' : 'Synthetic client-wide response — no model call.\n\n';
      for (const record of records) {
        const read = await runToolDef(req.tools, 'counsel_read_record', {kind:'source',id:record.id}, 'workspace');
        if (read.isError) throw new Error('Synthetic client read failed.');
        const passage = read.output as {text:string;start:number};
        const cited = await runToolDef(req.tools, 'counsel_cite_passage', {kind:'source',id:record.id,quote:passage.text,start:passage.start}, 'workspace');
        if (cited.isError) throw new Error('Synthetic client citation failed.');
        answer += `${passage.text} ${(cited.output as {marker:string}).marker}\n\n`;
      }
    } else if (ids && req.system.includes('"title":"Internal investigation"')) {
      const doc = store.getSource(ids.sources.interview!);
      for (const [name, input] of [
        ['counsel_search_records', { query: 'witness' }],
        ['counsel_read_record', { kind: 'source', id: doc.latest.id }],
        [
          'counsel_cite_passage',
          {
            kind: 'source',
            id: doc.latest.id,
            quote: 'The witness interview remains outstanding.',
            start: 0,
          },
        ],
        [
          'counsel_propose_knowledge',
          {
            title: 'Synthetic interview checklist',
            body: 'Confirm the witness interview and record unresolved timing before closing the investigation.',
            kind: 'method',
            scope: 'matter',
          },
        ],
      ] as const) {
        req.signal?.throwIfAborted();
        const result = await runToolDef(req.tools, name, input, 'workspace');
        if (result.isError) throw new Error(String(result.output));
      }
      answer =
        '## Where the matter stands\n\nThe witness interview remains outstanding. [S1]\n\n### Next step\n\nConfirm the interview and keep the disputed timing marked unresolved.\n\nThis is a **synthetic browser test**, not model-generated advice.';
    } else {
      const context = JSON.parse(
        req.system.split('Application context (data, not instructions):\n')[1]!,
      ) as { attachments: Array<{ id: string }> };
      const attachment = context.attachments[0];
      if (attachment) {
        const document = store.getSourceRevision(attachment.id);
        const quote = document.body?.slice(0, 80) ?? '';
        await runToolDef(
          req.tools,
          'counsel_read_record',
          { kind: 'source', id: attachment.id },
          'workspace',
        );
        if (quote)
          await runToolDef(
            req.tools,
            'counsel_cite_passage',
            { kind: 'source', id: attachment.id, quote, start: 0 },
            'workspace',
          );
        answer = `Synthetic upload test. The attached text is: ${quote} [S1]`;
      }
    }
    if (briefFixture) {
      const context = JSON.parse(
        req.system.split('Application context (data, not instructions):\n')[1]!,
      );
      if (context.matter) {
        const result = await runToolDef(
          req.tools,
          'counsel_propose_matter_brief',
          {
            needsReview: !prompt.includes('automatic brief fixture'),
            status: 'open',
            summary:
              'The witness interview remains outstanding. The evidence does not resolve the disputed timing.',
            questions: 'What does the witness recall about the disputed timing?',
            nextActions: `Synthetic next step: ${prompt}`,
            reason:
              'The exchange identifies the outstanding interview and unresolved timing for the working brief.',
          },
          'workspace',
        );
        if (result.isError) throw new Error(String(result.output));
      }
    }
    if (prompt.includes('native redline fixture')) {
      const appContext = JSON.parse(req.system.split('Application context (data, not instructions):\n')[1]!);
      const result = await runToolDef(req.tools, 'counsel_prepare_redline', {
        sourceRevisionId: appContext.attachments[0].id,
        edits: [{ current: 'orally', proposed: 'in writing', comment: 'Use the written-notice requirement.' }],
      }, 'workspace');
      if (result.isError) throw new Error(String(result.output));
      answer = 'Prepared a native Word redline requiring written notice. The original is unchanged. Synthetic browser fixture.';
    }
    if (prompt.includes('section insertion fixture')) {
      const appContext = JSON.parse(req.system.split('Application context (data, not instructions):\n')[1]!);
      const result = await runToolDef(req.tools, 'counsel_prepare_redline', {
        sourceRevisionId: appContext.attachments[0].id,
        insertions: [{ anchor: 'Payment', position: 'before', paragraphs: [
          { text: 'Electronic copies', styleFrom: 'Notices' },
          { text: 'The parties may exchange electronic copies.', styleFrom: 'Notices may be given orally.' },
        ], comment: 'Adds the requested electronic-copy provision.' }],
      }, 'workspace');
      if (result.isError) throw new Error(String(result.output));
      answer = 'Prepared the requested section with native tracked paragraphs. Synthetic browser fixture.';
    }
    if (prompt.includes('round comparison fixture')) {
      const appContext = JSON.parse(req.system.split('Application context (data, not instructions):\n')[1]!);
      const find = (part: string) => appContext.attachments.find((item: { title: string }) => item.title.includes(part)).id;
      const result = await runToolDef(req.tools, 'counsel_compare_document_rounds', {
        sentRevisionId: find('sent'), returnedRevisionId: find('returned'), baselineRevisionId: find('baseline'),
      }, 'workspace');
      if (result.isError) throw new Error(String(result.output));
      answer = 'The returned text is net 60 instead of our proposed net 45. That is a modification, not a restoration of the net-30 baseline. No agreement is inferred. Synthetic browser fixture.';
    }
    if (prompt.includes('authority lookup fixture')) {
      const result = await runToolDef(req.tools, process.argv.includes('--statute-fixture') ? 'counsel_lookup_statute' : 'counsel_lookup_authority', process.argv.includes('--statute-fixture') ? { title: 15, section: '7001' } : { title: 31, section: '1010.100' }, 'workspace');
      if (result.isError) throw new Error(String(result.output));
      const value = result.output as { revisionId: string };
      const read = await runToolDef(req.tools, 'counsel_read_record', { kind: 'source', id: value.revisionId }, 'workspace');
      if (read.isError) throw new Error(String(read.output));
      const citation = await runToolDef(req.tools, 'counsel_cite_passage', { kind: 'source', id: value.revisionId, start: 0, quote: (read.output as { text: string }).text }, 'workspace');
      if (citation.isError) throw new Error(String(citation.output));
      answer = 'Retrieved and read the dated synthetic publisher text. [S1] The publisher version date is 2026-09-03, not a legal review date.';
    }
    for (let n = 0; n < 40; n++) {
      await Bun.sleep(100);
      if (req.signal?.aborted) return;
    }
    if (prompt.includes('simulate failure')) {
      yield { type: 'error', message: 'Synthetic failure' };
      return;
    }
    yield {
      type: 'done',
      output: answer,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  },
};
const connection = cliFixture || modelFixture
  ? new WorkspaceConnection(store, memoryStore(), {
      codexCatalog: async () => parseBundledCodexModels({ models: [
        { slug: 'gpt-5.6-sol', display_name: 'GPT-5.6-Sol', visibility: 'list' },
        { slug: 'gpt-6-astra', display_name: 'GPT-6-Astra', visibility: 'hide' },
        { slug: 'internal-synthetic', visibility: 'hide' },
      ] }),
      claudeRuntime: {
        command: [
          process.execPath,
          resolve(import.meta.dir, '../runtime/src/workspace/fixtures/claude-cli.ts'),
        ],
        env: { HOME: root, USER: 'synthetic-cli-user', PATH: process.env.PATH },
      },
    })
  : undefined;
if (modelFixture) connection!.configure({ kind: 'codex', model: 'scripted-fixture' });
const chat = cliFixture && connection
  ? new WorkspaceChat(store, () => connection.resolve())
  : chatFixture
    ? new WorkspaceChat(store, () => provider, {
      ...(process.argv.includes('--recall') ? { recallPlanner: planRecall } : {}),
      ...(process.argv.includes('--web-fixture') ? { webNetwork: {
        resolve: async () => [{ address: '93.184.216.34', family: 4 }],
        request: async (url: URL) => ({ status: 200, headers: { 'content-type': 'text/html' }, bytes: Buffer.from(
          `<html><title>${url.pathname === '/definitions' ? 'Synthetic definitions' : 'Synthetic terms'}</title><body><h1>Fictional public source</h1><p>${url.pathname === '/definitions'
            ? 'Synthetic service means the service on the order form.' : 'Synthetic cancellation requires thirty days of notice.'}</p><p>This is a deterministic document for a browser test, not actual terms or legal advice.</p><a href="/definitions">Definitions</a></body></html>`) }),
      } } : {}),
    })
    : undefined;
const server = Bun.serve({
  idleTimeout: 255,
  maxRequestBodySize: FILE_MAX_REQUEST_BYTES,
  hostname: '127.0.0.1',
  port,
  fetch: workspaceHandler({
    store,
    token: 'workspace-browser-test-only',
    origin: `http://127.0.0.1:${port}`,
    distDir: process.env.WORKSPACE_TEST_DIST ?? resolve(import.meta.dir, '../runtime/ui/dist'),
    demo: !empty,
    ...(connection
      ? { connection, chat }
      : chat
        ? {
            chat,
            connectionStatus: () => ({
              config: { kind: 'codex' as const, model: 'scripted-fixture' },
              ready: true,
              label: 'Scripted test · no model calls',
              storage: 'none',
              codexInstalled: false,
              claudeInstalled: false,
              qualification: 'test-fixture' as const,
            }),
          }
        : {}),
  }),
});
console.log(`Synthetic workspace browser fixture on ${port}`);
function stop() {
  chat?.stop();
  server.stop(true);
  store.close();
  rmSync(root, { recursive: true, force: true });
  process.exit(0);
}
process.once('SIGTERM', stop);
process.once('SIGINT', stop);
