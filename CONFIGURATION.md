# Counsel OS — Configuration Model

This file is documentation, not configuration. The plugin doesn't carry per-user
values; it describes how Counsel OS resolves paths and detects capabilities at
runtime.

This file is intentionally named `CONFIGURATION.md`, not `config.md`, so it can
never be mistaken for a user's Counsel OS configuration.

## Per-user config lives in the user's vault

After running `/counsel-os:setup`, the user's configuration lives in a marked
file at the top of their legal root:

```
{legal_root}/config.md
```

That file is created by setup, editable by the user, and travels with the vault
(via sync, git, machine swap). The plugin tree itself is never written to —
which keeps Counsel OS fully functional in runtimes where the plugin tree is
read-only (e.g. Cowork).

## Finding the legal root

Each session, the counsel skill discovers `legal_root` by looking for a
`config.md` file containing both `counsel-os-config: true` and a `legal_root:`
line. If no marked candidate is found, it asks the user. The full procedure is
in `skills/counsel/SKILL.md` ("Finding the Legal Root").

## What goes in `{legal_root}/config.md`

Required (these two markers are what discovery validates):

```markdown
counsel-os-config: true
legal_root: /full/path/to/legal/root
```

Recommended (informational — not checked by discovery):

```markdown
config_version: 1
```

Optional overrides (defaults shown):

```markdown
entities_path: entities
matters_path: matters
auto_apply_law_updates: false
law_management: plugin
default_locality: any
entity_properties:
  type_field: counsel-os-type
  values: [counterparty, vendor, customer, prospect, matter]
```

`auto_apply_law_updates: true` lets `/counsel-os:update` apply plugin-managed law
content without per-area approval (one-time consent instead of every-update
prompts). Practice content always requires approval regardless of this flag.

`law_management: user` makes the ENTIRE law library user-owned: update stops
syncing law content entirely, and `/counsel-os:law-refresh` maintains it instead.
For per-file ownership, set `managed-by: user` in an individual law file's
frontmatter — update skips marked files (even under auto-apply) and law-refresh
maintains them. Custom law areas the user creates are user-owned automatically.

`default_locality: local` keeps every matter on this machine: a step for any
matter runs only on a local model (Ollama, LM Studio, another loopback
server), never on a cloud provider. A matter opts out with `stays_local: false`
in its frontmatter, and any matter can opt in alone with `stays_local: true`
(a folder matter's `matter.md` governs everything in its folder). The policy is
decided before the first model call — from the conversation's linked matter,
else a matter document attached to the message, else this default — and is
never downgraded silently: with no local model loaded the step does not run
and the app says so.

## Documents in matters

A matter's documents live beside it. A matter that is its own folder
(`{matters_path}/acme/matter.md`) keeps its Word documents in that folder; a
flat matter file (`{matters_path}/acme.md`) gets a folder named after it
(`{matters_path}/acme/`) the first time a document is added.

A document added with no matter chosen — dropped on Home's ask box, say —
lands in **`{matters_path}/inbox/`**. The inbox is a holding folder, not a
matter: nothing reads it as one, and the runtime offers "move to a matter"
right after the drop. Uploaded files are never overwritten; a second
`nda.docx` in the same folder becomes `nda-2.docx`. Only Word documents
(`.docx`) can be added this way for now; the size limit is 25 MB.

## Path resolution

Legal framework (`law/`, `practice/`, `memory/`) reads from `{legal_root}`.

Knowledge-base search (entity files, matters, past memos, related precedent)
is runtime-detected:

- If a content-index MCP tool is connected (e.g. [QMD](https://github.com/tobi/qmd)
  exposing `query` / `get` / `multi_get`), it's used to search the entire vault by
  frontmatter and content.
- Otherwise, search falls back to filesystem grep within
  `{legal_root}/{entities_path}/` and `{legal_root}/{matters_path}/`.

The choice is per-session, not per-install. See `skills/counsel/SKILL.md`
("Knowledge Base Search") for the full procedure.

## Providers (`~/.counsel-os/providers.yaml`)

The runtime's model providers. The built-ins — your Claude subscription (`claude-sub/…`), your ChatGPT subscription (`codex-sub/…`) and a local Ollama model — load without a file; the file adds providers and picks a default.

```yaml
default: anthropic/claude-opus-5
providers:
  - id: anthropic/claude-opus-5        # apiKeyEnv defaults to ANTHROPIC_API_KEY
  - id: google/gemini-2.5-pro          # GOOGLE_GENERATIVE_AI_API_KEY
  - id: mistral/mistral-large-latest   # MISTRAL_API_KEY
  - id: groq/llama-3.3-70b-versatile   # GROQ_API_KEY
  - id: xai/grok-4                     # XAI_API_KEY
  - id: openrouter/anthropic/claude-sonnet-5   # OPENROUTER_API_KEY
  - id: openai/gpt-5.6
    apiKeyEnv: MY_OPENAI_KEY           # any variable name; the value is never in this file
  - id: lmstudio/qwen3                # a preset: base URL built in (http://127.0.0.1:1234/v1)
  - id: moonshot/kimi-k2               # MOONSHOT_API_KEY; base URL built in
  - id: openai-compatible/myserver
    baseURL: http://127.0.0.1:9000/v1  # loopback = local; anything else must be https://
  - id: azure/my-gpt-deployment        # enterprise: the model part is the DEPLOYMENT name
    extra: { resourceName: firm-openai }            # the key goes to the Keychain, never here
  - id: bedrock/us.anthropic.claude-sonnet-5-v1:0  # a Bedrock model id or inference profile
    extra: { region: us-east-1, profile: firm }     # profile: a name from ~/.aws/credentials (optional)
  - id: vertex/gemini-2.5-pro
    extra: { project: firm-project, location: us-central1 }
tasks:
  privacy: { prefer: ollama/gemma4:e4b, allow_remote: false }
```

Id prefixes the runtime knows — SDK-native: `claude-sub`, `codex-sub`, `anthropic`, `openai`, `google`, `mistral`, `groq`, `xai`, `deepseek`, `cohere`, `perplexity`, `togetherai`, `fireworks`, `deepinfra`, `cerebras`, `openrouter`, `ollama`, `openai-compatible`; enterprise (credentials that are not one key, see below): `azure`, `bedrock`, `vertex`; OpenAI-compatible presets with a built-in base URL: `moonshot`, `zhipu`, `dashscope`, `sambanova`, `baseten`, `huggingface`, `cloudflare` (fill `{account_id}` in `baseURL`), `replicate`, and the local runners `lmstudio`, `llamacpp`, `vllm`, `mlx`, `jan`, `gpt4all`. A preset entry may override `baseURL`. An unknown prefix is refused with that list. Keys are read from `apiKeyEnv`, else the vendor's usual variable; the file holds variable names, never keys. Each provider's `locality` (local or cloud) is derived from the vendor, or from the base URL for the OpenAI-compatible shape; `allow_remote: false` on a task route keeps that task on local providers.

### Keys (providers spec §5)

An API key is pasted once in Settings, on the provider's row, and kept in the platform's secret store — never in `providers.yaml`, never in the vault:

- **macOS:** the login Keychain (`security` CLI), items named `counsel-os/<provider id>` under the account `counsel-os`.
- **Linux:** the system keyring through `secret-tool` (libsecret) when it is installed.
- **Otherwise:** `~/.counsel-os/secrets.json`, mode 0600 — Settings says so.

`COUNSEL_OS_SECRETS=file` forces the file store (headless use, CI). A key from the environment still works: the runtime asks the store first, then the entry's `apiKeyEnv`, then the vendor's usual variable (`OPENAI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, …). An entry may carry `key: keychain` as a note to a reader; it is not read.

The runtime reports only whether a key is set (`keySet: true | false | 'env' | 'default-chain'` on `/settings` and `/health`), never the value. `PUT /providers/<id>/key` and `DELETE /providers/<id>/key` are the only routes that touch keys.

### Enterprise vendors — Azure OpenAI, Amazon Bedrock, Google Vertex AI (providers spec §3, step 5)

Three vendors take a set of fields instead of one key. The non-secret fields live on the entry as `extra`; the secret ones are pasted in Settings and kept as **one** Keychain item under `counsel-os/<provider id>` (never one item per field). Settings lists them under *Hosted API · enterprise*, and each row's second line names the company (Microsoft, Amazon Web Services, Google Cloud) with a link to its data terms.

| Prefix | `extra` (on the entry) | Secret fields (Settings → Keychain) | Environment fallback | Model part of the id |
|---|---|---|---|---|
| `azure` | `resourceName` (required), `apiVersion` (optional; empty = the v1 API) | `apiKey` | `AZURE_OPENAI_API_KEY` or `AZURE_API_KEY`; `AZURE_RESOURCE_NAME`, `AZURE_OPENAI_API_VERSION` | the **deployment** name |
| `bedrock` | `region` (required), `profile` (optional, a name in `~/.aws/credentials`) | `accessKeyId` + `secretAccessKey` (+ `sessionToken`), or `apiKey` (a Bedrock bearer key) | `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_SESSION_TOKEN`, `AWS_BEARER_TOKEN_BEDROCK`, `AWS_PROFILE`, `AWS_REGION` | a model id or inference profile, e.g. `us.anthropic.claude-sonnet-5-v1:0` |
| `vertex` | `project` (required), `location` (default `us-central1`) | `serviceAccountJson` (the key file's contents, as one value), or `apiKey` (express mode) | `GOOGLE_APPLICATION_CREDENTIALS` (read by the SDK, not the runtime), `GOOGLE_VERTEX_API_KEY`, `GOOGLE_VERTEX_PROJECT` / `GOOGLE_CLOUD_PROJECT`, `GOOGLE_VERTEX_LOCATION` | a Gemini model, or a Claude model (`claude-…@…`), which goes through the Anthropic-on-Vertex endpoint |

Resolution order at load: the store → the environment → the vendor SDK's own default chain. On a firm laptop with an AWS profile or `gcloud auth application-default login` already done, a `bedrock` or `vertex` row with only its `extra` just works, and `keySet` reads `default-chain`. Azure has no chain of its own: it needs the key.

`PUT /providers/<id>/key` takes `{ "fields": { … } }` for these vendors, validated per vendor (Azure needs the key; Bedrock the access key pair or a bearer key, a session token only beside the pair; Vertex a service account that parses or an express key). To use the machine's own credentials, save nothing there, or `DELETE` what was saved.

Listing models: Azure lists the resource's deployments (`GET …/openai/deployments`) once the key is set; Bedrock lists `ListFoundationModels` with a SigV4-signed request when it has keys, and answers from a curated list on the default chain; Vertex answers from a curated list (Gemini + Claude on Vertex). Any id can still be typed. Non-secret fields not yet saved ride in the query (`?region=…`), so the picker works before the first Save.

**Picking a model.** The model part of an id (`gpt-5.6` in `openai/gpt-5.6`) can be picked from the vendor's own list in Settings — the runtime asks the vendor (`GET /providers/<prefix>/models`) and shows each model's context size where the vendor reports it; vendors without a listing endpoint (Anthropic, xAI, Perplexity, DeepInfra) offer a curated list, and any id can still be typed. A local runner (Ollama, LM Studio, …) lists from the row's base URL; a keyed vendor is only asked once its key is set.

## Plugin-internal constants

These aren't user-configurable; they're baked into the plugin:

- `practice_seed: knowledge/practice-seed` (relative to plugin root) — used by
  setup to seed `{legal_root}/practice/` and by update to surface new content.
