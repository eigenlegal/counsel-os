# More providers and models — design

**Date:** 2026-09-01 · **Status:** draft for founder review · **Phase 1 of two.** Phase 2 (model routing for legal tasks, the eval scoreboard, outcome capture) gets its own spec once this lands; §8 says what this phase leaves in place for it.

## 1. Why

The runtime speaks to two subscriptions (Claude, ChatGPT) and three API shapes (Anthropic, OpenAI, Ollama, plus any OpenAI-compatible endpoint). Adding a vendor today means editing a hardcoded allowlist; keys come only from environment variables; model ids are typed by hand; the only data-handling signal is the credential type, which misreads a local OpenAI-compatible server as "remote". A lawyer choosing a model needs the opposite: pick a vendor, pick a model from a list, paste a key once into the app, see plainly whether the text leaves the machine, and be able to say "this matter never does."

## 2. Scope

**In**
1. A vendor catalog with these additions: Google Gemini, Mistral, Groq, xAI, OpenRouter, plus presets for LM Studio and other local OpenAI-compatible servers. Azure OpenAI and AWS Bedrock as the last step (their auth is not an API key).
2. Model discovery: list a vendor's models, with context size where the vendor reports it.
3. Keys entered in the app and kept in the macOS Keychain (Linux: libsecret when present, else a 0600 file). Never in `providers.yaml`, never in the vault, never echoed back.
4. Data-handling labels on every provider: local or cloud, which company receives the text, a link to that vendor's retention terms.
5. A per-matter privacy policy: `stays_local: true` on a matter (and a vault-wide default) that forces every step for that matter onto a local model, enforced before the first call.

**Out**
- Routing by measured quality, evals, cost tracking beyond what the strip already shows (phase 2).
- New subscription harnesses (Gemini CLI). Revisit when Google's agent CLI is stable.
- Fine-grained per-vendor privacy assessments; we show the vendor's own terms, we do not grade them.

## 3. The vendor catalog

`runtime/src/providers/vendors.ts` replaces the allowlist in `registry.ts`. One record per id prefix:

```ts
interface Vendor {
  prefix: string;                   // 'google', 'openrouter', …
  name: string;                     // 'Google', 'OpenRouter'
  kind: 'direct' | 'harness';
  auth: 'apikey' | 'local' | 'subscription' | 'azure' | 'sigv4';
  locality: 'local' | 'cloud';      // openai-compatible: derived from baseURL (loopback = local)
  handles: { company: string; termsUrl: string } | null;   // who receives the text
  keyLabel?: string;                // 'API key', 'Bearer token'
  help: { getKey?: string; install?: string };             // the vendor's own page / command
  models: 'list' | 'curated';       // discovery method
  curated?: Array<{ id: string; contextTokens: number }>;  // Anthropic
  capabilities: Capabilities;       // defaults; a listed model may refine contextTokens
  make(creds, entry): LanguageModel; // the AI SDK factory: createGoogleGenerativeAI({ apiKey }) …
  list?(creds, entry): Promise<Array<{ id: string; contextTokens?: number }>>;
}
```

- Packages: `@ai-sdk/google`, `@ai-sdk/mistral`, `@ai-sdk/groq`, `@ai-sdk/xai`, `@openrouter/ai-sdk-provider` (step 1); `@ai-sdk/azure`, `@ai-sdk/amazon-bedrock` (step 5). All compatible with the installed `ai` 7 line.
- `direct.ts` stops using the SDKs' module-level providers: every vendor is built through its `create…({ apiKey, baseURL })` with the key the runtime resolved (§5). `anthropic/*` and `openai/*` therefore honour app-entered keys, which they silently do not today.
- `Capabilities` gains `locality`. The router's "is this remote" test uses it, not `auth`. An OpenAI-compatible provider whose base URL is loopback is local.
- The plate humanizer (`plate.ts`) and the UI's vendor names come from the catalog, so the rail footer, the switcher, Settings, and the first-run screen agree on every name.

## 4. Discovery

- `GET /providers/:id/models` → `{ models: [{ id, contextTokens? }], source: 'list' | 'curated' }`. Vendor listers: OpenAI `/v1/models`, Google `models.list`, Mistral, Groq, xAI, OpenRouter `/models` (which reports context length and pricing), Ollama `/api/tags`, OpenAI-compatible `/v1/models`. Anthropic ships a curated list in the catalog (no list endpoint) plus a custom-id field.
- A 3-second timeout per call; a failure is a sentence on the row ("Could not list models: <reason>"), never an empty picker.
- UI: the provider row's model field becomes a picker fed by the list, custom id allowed, context size shown as set text beside each model. Same picker on the first-run screen once a key is present.

## 5. Keys

- `runtime/src/providers/secrets.ts`: `SecretStore { get(id), set(id, value), delete(id), where(): 'keychain' | 'libsecret' | 'file' }`. macOS: the `security` CLI (`add-generic-password -U -a counsel-os -s counsel-os/<providerId> -w …`, `find-generic-password -w`, `delete-generic-password`), which stores in the login keychain and prompts nothing when the same user runs the runtime. Linux: `secret-tool` when present; otherwise `~/.counsel-os/secrets.json` at 0600 with a plain note in Settings that it is a file. Windows later.
- Resolution order at load: the store, then `apiKeyEnv` (kept for the plugin and for headless use). `providers.yaml` gains no key material; an entry may carry `key: keychain` as a hint that one exists.
- API: `PUT /providers/:id/key` `{ value }` writes the store and reloads the registry; `DELETE` removes it; `GET /settings` reports `keySet: true | false | 'env'` per provider and never the value. The request body is the only place a key travels, over loopback, once.
- UI: on each API-key provider row, a "key" field that shows `set · replace · remove` or `not set · paste a key` with the vendor's "get a key" link. A newly added vendor row asks for the key first, then lists models.
- Logs and error messages never include a key; the existing test that greps the serve log for the bearer extends to keys.

## 6. Data-handling labels

- Every provider row (Settings, first-run, the switcher) carries a second line in set text: `local · nothing leaves this machine` or `cloud · text goes to <Company> · their terms`. The subscription tiers say the same for Anthropic / OpenAI.
- `/health` and `GET /settings` carry `locality` and `handles` per provider so the UI never invents the label.
- The composer and Home ask box show the label of the provider that will answer, only when it is cloud and the thread has a matter with a policy (§7), or when the reader asks (hover on the plate). Not a banner.

## 7. Matter privacy policy

- **Declaration:** `stays_local: true` in a matter's frontmatter (the same flat frontmatter Home already reads). Vault-wide default in `config.md`: `default_locality: local | any` (default `any`). A folder matter's `matter.md` governs its folder.
- **Evaluation happens before the first model call**, from what is known at send time, never from what the model later reads: the thread's explicit matter link (PR #42), else a matter path attached to the message (the chips `withAttachments` produces), else the vault default. An inferred matter (the `matterPathOf` courtesy) does not set policy: if the reader wants the guarantee, they link the matter, and the UI offers to when it infers one on a `stays_local` matter.
- **Enforcement** in the runtime: `router.resolve(task, { localOnly })` ignores `prefer` and `default` that are cloud and picks the best local provider by capabilities (tools first, then context size); an explicit `providerId` that is cloud is refused with 409 `{ error: 'matter-stays-local' }`; if no local provider is loaded the step does not run and the UI says "This matter stays on this machine, and no local model is loaded." The counsel loop reads the thread header before resolving the provider (today it reads it after).
- **UI:** the matter's facts block shows `stays local · yes`; the thread header's MATTER line adds `· stays local`; the composer's notice reads "This matter stays on this machine · answering on Ollama (gemma4)"; the switcher greys cloud rows for that thread with the reason on hover; the first-run practice question gains one checkbox: "Keep every matter on this machine unless I say otherwise" (sets the vault default).
- **Never silently downgraded:** a `stays_local` matter with only cloud providers loaded is an error the lawyer sees, not a quiet fallback to cloud.

## 8. What this leaves for phase 2

The catalog's capability and locality records, the discovery endpoint, and the policy hook in `router.resolve` are the inputs the routing-and-evals scoreboard needs; the task taxonomy and the outcome-capture schema come with that spec.

## 9. Error handling

- Unknown prefix in `providers.yaml`: 422 with the catalog's known prefixes listed (as today, with a better sentence).
- Key rejected by the vendor (401/403): the row says "The key was refused by <Company>" and offers replace; the step failure humanizer already maps these.
- Keychain unavailable (headless, no login keychain): fall back to the file store and say so in Settings.
- Discovery failure: sentence on the row; the picker still accepts a custom id.

## 10. Testing

- Catalog: every vendor builds a model from a fake key and base URL; locality derivation for loopback vs remote base URLs; the plate humanizer reads names from the catalog.
- Secrets: a fake store in tests; the `security` CLI wrapper tested against a temporary keychain (`security create-keychain` in a temp dir, deleted after) on macOS CI runners; the file store's mode and shape.
- Discovery: each lister against recorded fixtures; timeout and error shapes.
- Policy: router tests for `localOnly` (best local chosen; refusal of an explicit cloud provider; no-local error); loop test that the header is read before resolution; UI tests for the facts line, the header, the composer notice, the greyed switcher rows, the first-run checkbox.
- Settings UI: key set/replace/remove flows never render the value; the model picker.
- Routes: `PUT/DELETE /providers/:id/key`, `GET /providers/:id/models`, `/health` carrying locality.

## 11. Staging and order
1. Catalog + the five new vendors + `create…` factories with resolved keys + `locality` + labels in `/health`, Settings rows, switcher, first-run.
2. Secrets store + key entry in Settings + the key routes.
3. Discovery + the model picker (Settings and first-run).
4. Matter privacy policy end to end.
5. Azure OpenAI and AWS Bedrock (auth shapes: resource + deployment + api version; region + SigV4 credentials or a named profile).

Each step is its own PR with QA.

## 12. Open questions for the founder
- Ship OpenRouter as the recommended "one key, many models" path for API users on the first-run screen? Default here: yes, listed after the subscriptions and Ollama.
- Is a 0600 file acceptable as the Linux fallback when libsecret is absent? Default here: yes, labelled in Settings.
- Azure and Bedrock in this phase (step 5) or deferred until a firm asks? Default here: step 5, last.
