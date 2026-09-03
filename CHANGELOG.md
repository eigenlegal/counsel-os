# Changelog

All notable changes to Counsel OS are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org/). Entries through 0.9.18 were
reconstructed from git history. New entries are prepended automatically by
`scripts/release.sh`.

## [Unreleased]

- **A short thread sits against the composer.** One question and its answer used to leave four hundred pixels of nothing between the last word and the box you type in. The conversation now grows upward from where you are working.
- **The reading size has a name.** Two places set 15.5px serif by hand — an answer, and a document in the reader. It is the one size that is for reading rather than for using, and it is a token now like the rest.
- **The Save button says what it saves.** The page has two rules: choosing a model or pasting a key writes at once, while a provider you just added, a task route and the timeout wait for Save. The caption claimed it saved your models, which by then are already on disk.

A design pass: a scale, a measure, and one control

- **Five type sizes instead of twelve.** The sheet had 9.5, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15 and 30px — and 12.5/13/13.5 alone accounted for a hundred uses while being indistinguishable on screen. Twelve sizes is not a scale, and it is most of why every page read flat: when everything is nearly the same size, nothing recedes and every paragraph shouts equally.
- **Prose stops at a measure.** Settings ran the full window — 120 characters a line at 1280px. That is the "wall of text" in one number: the eye loses the line it is on. Explanations now set at 68 characters and in the secondary size, because they are reference, not instruction.
- **One control.** `input` was styled by neither of the two rules that governed the others, so a text field got the browser's own chrome while the select beside it got ours. Inputs, selects and buttons now share a height, a padding, a ground, a border and a hover.
- **The provider rows sit on one grid.** Each row used to be its own flex line, so the columns landed wherever the text happened to end: "Claude model" and "ChatGPT model" are different widths, so no two selects began at the same x. The redundant per-row label is gone (kept for screen readers), and every control starts on the same axis.
- **The eval set is visible.** `GET /evals/fixtures` had existed the whole time with nothing calling it, so you could read a board of scores with no way to see what produced them — or learn that five of your thirteen fixtures cannot run at all. The Models page now lists them by set, says what each set is for, and names the ones that carry no documents, because a score you cannot trace back to a document is a number taken on faith.
- **Matter names are readable.** The vault list cut every one at about 28 characters — `Sinai × Lerner — K-12 AI Educatio…` — so it read as a column of ellipses with no way to tell two matters apart. They wrap to two lines now. File rows still do not: a path is short, and wrapping one would be worse.
- **Every kind of work has a routing rule you can see and set.** `GET /routing` answers only for tasks that already carry a policy or a score, so a practice that had scored nothing saw one row and could not set a rule for the other ten kinds of work it does. All eleven are listed now, each saying what actually answers it — an untouched row used to read "nothing scored yet", which sounds like the work does not route. It does: it goes to the default, which the row now names.
- **One primary button, and no pills.** The Ask button reimplemented the primary style with its own metrics, and four places used a 999px capsule — the house style of every AI product on the internet, in an app that has a ledger of its own to look like. Three variants now: primary, standard, quiet.
- **A score opens to what it is made of.** `GET /evals/results` had existed all along with nothing calling it, so a board cell was a number with nothing behind it: 0.82 on review, and no way to ask which documents it got right, which it missed, or what the scorer counted. Click the number and it says — fixture by fixture, with each term and any note.
- **A state that looks like a failure says what it means, on the page.** `DISCONNECTED` sat in alarm colour with its explanation in a `title`, and nobody hovers an alarming word to find out it is benign. It says on the line that the page dropped mid-step and the answer may well have finished.
- **A turn names three files, then counts.** A retro reads twenty, and twenty bordered monospace chips were the loudest thing on the page — for its least important content. All of them are still one click away, in the step detail the line already opens.

A simpler Settings page, and the model lists we never asked for

- **ChatGPT and Claude list their models.** The Codex CLI documents the models it answers to, and so does Claude's; we had never looked, and the page said "ChatGPT does not publish a model list". It does. Claude gained Fable too.
- **Adding a provider is clicking the one you want.** It was a search box with a placeholder and a greyed-out button — you had to know to type something, that a list would appear, to pick from it, and then to press Add. Four unsignposted steps to do the thing the page most wants you to do. The common providers are now named and clicked; the whole catalog is still there, behind *Someone else*.
- **A provider appears once.** Every provider used to be written twice — a block at the top you could use, and a row further down you had to understand. Its id, address and capability flags now fold away inside its own block, and the second list is gone. One block per provider **entry**: two rows of the same vendor are two blocks, each editable and removable, rather than one silently hiding the other.

Knowing what you are actually running

- **Settings › Runtime now says what the server process is running**: the version, the commit it read, and how long it has been up. A serve reads its code once, at startup, and then keeps answering from it while the checkout moves on — but it serves the UI from disk, which a rebuild replaces underneath. So the page in front of you can be hours newer than the runtime behind it, and nothing said so. A process up for more than an hour says plainly that a restart would pick up changes made since. A compiled binary never says it, because it cannot drift.
- **`serve --watch`** restarts the runtime when its own source changes, so the mismatch cannot open up in the first place. It needs a source checkout; a binary is told why it cannot.

Adding a provider actually works now

- A provider you add gets its **block straight away**, with its key and its model picker on it. Before this it appeared only as a stub down in "Rows you added", and the two things it needed were impossible to do in either order: the row would not save without a model, and the vendor would not list its models without a key.
- **The key moved onto the provider block**, above the model. It is the first thing a hosted provider needs and the reason its model list can answer, so it sits where the provider is rather than folded inside a row.
- A key can be pasted before anything is saved. It used to say "save the row, then paste the key here" — advice that could not be followed.
- Pasting a key re-asks that provider for its models, instead of leaving you to find the `refresh` link.
- **A key set up on a new provider is still there after you save it.** The catalog prefills every row with the vendor's own address, and that was being read as "this row points somewhere else" — so the key was filed one way while the provider was being set up and looked for another way the moment it saved. It was accepted and then unreadable, and the same key had to be pasted twice. Nine vendors were affected, Moonshot and Cloudflare and Hugging Face among them.
- The page can now see a key it stored for a provider that has no model yet, so it says so and offers to remove it, rather than reading "not set" and inviting a second paste.
- Adding a provider you already have says so, instead of making a second row that could not be filled in.
- Azure, Bedrock and Vertex get their block too, with their region or project on it — those fields are what tell the listing where to ask.

Providers, and the model each one runs

- Settings now shows one block per **provider** — Claude, ChatGPT, Ollama, anything you add — with the model as a picker on that block. You choose a provider, then you choose a model. The list comes from the provider itself, so it is what they offer today rather than a list we hard-coded.
- **One key per provider — where that is safe.** A key used to be filed under the vendor AND the model, so a second OpenAI model asked for the OpenAI key a second time, as if it were a different account. It is filed under the vendor now, but only where the catalog fixes the endpoint. Wherever the ROW decides where the key goes or whose account it is — the bare OpenAI-compatible shape, Cloudflare's account-scoped URL, Azure, Bedrock, Vertex, or any row with its own base URL — the key stays with that row, because sharing it would send one tenant's credential to another tenant's host. A key pasted before this change is still found, and removing a key removes every copy of it.
- **Claude lists every model your account can call.** Anthropic publishes a model list; we had never asked for it, so the app showed three names someone had typed into a file. It asks now. A model the listing does not give a context size for claims none, rather than inheriting the vendor's default — the router compares that number against a task's bar, and a model claiming a window it does not have would be handed work it cannot hold. Your Claude and ChatGPT *subscriptions* still show a known set: the CLIs publish no list.
- A key now opens a provider's model list even before any model is chosen, which is the order the work actually happens in: pick the vendor, paste the key, choose from what comes back.
- The Claude subscription lists its models like any other provider. Its harness always passed a model through — there was simply nothing to choose from. (The Codex CLI publishes no list, and says so rather than offering names we would be guessing at.)
- The model picker is gone from the raw provider row, where it was a second place to do the same thing.

Settings, reorganized around the models you have

- **Models you can use** replaces Providers and Default provider. One list of everything the runtime has loaded — your subscriptions, your local model, anything you added — saying what each one is, how it is reached, and which one answers. Switching is *use this one* on the row, rather than reading an id out of one group and typing it into another.
- **Add a model** is one search box over the whole catalog, and it searches by MAKER and model family as well as by vendor: "llama" finds Together AI, Groq, Ollama, Bedrock and the rest; "gemini" finds Google and Vertex; "qwen" finds Alibaba and the open hosts. Meta sells no API of its own, so without this the maker whose models half these vendors serve appeared nowhere in the app.
- Fixed on review, all in this area: a model server on your own machine could not be made the default (the row said "on this machine" and refused you in the same breath), while a Bedrock or Vertex row with no credentials at all could be — the two checks read different fields and disagreed, and are now one. A search that matched nothing answered with the whole catalog, as if every vendor served it; it now says nothing matches, and what to search for instead. Clicking *use this one* while another row was incomplete moved the default in the table, wrote nothing, and hid the reason inside a collapsed row.
- Corrections to the catalog itself: Ollama, Groq and Together AI were tagged as serving Google's models. They serve Gemma, not Gemini, and the tag would have sent you looking for a Gemini that was never there. Replicate is no longer offered as a way to run Llama — the runtime's own notes say it has no chat endpoint we could find.
- A row you added now leads with what it is — the vendor and the model — and folds its id, base URL, capability flags and auth into *the rest of this row*. Those are a config file rendered as a form, and they were the first thing you saw.

Models, its own page (routing-and-evals spec §6, §10)

- The scoreboard, the routing bar for each task, and the ledger of what ran have left the bottom of Settings for a **Models** page in the rail. None of them were settings: a scoreboard is a measurement, a bar is a standing decision about quality, and a ledger is a record. Settings is where you configure the runtime; this is where you see how it is doing.
- Two questions in the order you ask them: how the models score, and what actually ran. Task routes stays in Settings, where it saves with the providers form.
- Settings › Providers: the empty half-screen between "Add a provider" and the picker is gone. The guided-start rows lay a paragraph beside a button, and the paragraph's 24rem was being read as a HEIGHT in the one row that stacks — a 384px hole in the middle of the page.

Conversations that keep working (web-ui spec §3.1)

- A conversation no longer stops because you looked at something else. Switching to another conversation while counsel is still working used to abort the step — the answer thrown away and the run recorded `abandoned`, which is what two of the runs in this vault's own ledger are. The step now runs to the end whether or not you are watching, and its answer is there when you come back.
- Several conversations can be working at once. The rail marks each one that still is, so you can send a review, start something else, and come back to the answer.
- The runtime always allowed this: its step lock is per conversation, so only two steps in the SAME conversation queue. The limit was the screen.

The routing ledger (routing-and-evals spec §6)

- The Models page ends with **what ran**: the last hundred steps, newest first, with the conversation it belongs to, the task, the model it got, why it got it, what it took and cost, and your mark. The scoreboard says how models do on fixtures and the line under each task says how that task is meant to route; this is the only place that says what actually happened.
- `GET /routing/ledger?limit=` serves it, reading the run records the runtime already keeps. A run from before routing recorded a reason shows none rather than a guess.

## [0.14.0] — 2026-09-02

routing from your own scores

- The scoreboard now picks the model for each kind of legal work, you set the bar it has to clear, and a review you just read becomes a fixture that measures it. Public benchmarks import into the same format.

Routing knobs (routing-and-evals spec §6)

- Each task in Settings › Models carries a line of set text under its name: the score a model must clear, whether ties break on quality, cost or latency, and which model that picks today. `change` reveals the five bars and the three preferences in place, and unpins a task you pinned by hand. No slider, no dialog.
- The pick is computed by asking the router, so the line shows the model a step would actually get, not the setting alone.

Make this a fixture (routing-and-evals spec §8)

- A review you just read becomes a fixture the scoreboard runs forever. On any finished review, "make this a fixture" opens a review screen under the answer: what the anonymizer replaced, the document as it will be saved (editable), and every finding counsel raised.
- You say which findings counsel was right about. The ones you keep become the fixture's expected catches; the ones you mark wrong become negative checks, so a model that raises them again loses points; the rest are left out.
- Nothing identifying is saved. Organizations, people you name, emails, money, dates and phone numbers are replaced consistently through the document, the quotes, and the practice files that travel with it — the same original always becomes the same replacement, and the same document anonymizes the same way every time. Nothing is written until you have read the result.
- What else travels is yours to read: the prompt the fixture will run is shown and editable (the anonymizer's mapping comes from the document, so a name that appears only in your question would pass through it), and each practice file the review cited is listed by name and can be removed. A matter marked `stays_local` cannot become a fixture at all, because a fixture runs on whatever model scores best.
- The fixture is runnable, not just readable: the save writes its own mini-vault with the anonymized document and an anonymized copy of every practice file the review cited, so the fixture keeps measuring against the standards that review used even after you edit them.

Public benchmarks (routing-and-evals spec §8)

- `counsel-os eval import <set>` pulls a public legal benchmark — LegalBench, CUAD, MAUD, ContractNLI — into the same fixture format the runner already uses, and `counsel-os eval --set benchmark --all` runs it like anything else. `eval import` with no set lists what is available and each one's license.
- Nothing is committed: imports land in a git-ignored folder, with the raw downloads cached beside them and every set's license written into `LICENSES.md`. BigLaw Bench publishes no license, so its loader refuses with the reason and where to ask.
- The tab is the set: scoring from Settings › Models runs the fixtures of the set you are looking at, and the cost line counts the model calls a run makes rather than the files it reads — one imported benchmark fixture holds hundreds of contracts.
- Benchmarks score under their own set. The scoreboard never averages them with the practice's own fixtures, and routing never chooses a model on them: a public set says how a model does at the benchmark's task, not at yours.

Your edits to what counsel wrote (routing-and-evals spec §7)

- When counsel writes a file — an approved proposal, a redline or comparison it produced, a note into a matter — the runtime keeps that version. When you later change the file yourself, that difference is recorded once a day as `file.edited-after-counsel`, with the line counts and the diff, in the same local `.counsel/outcomes.jsonl` as your other decisions. Word files compare their text with the changes accepted.
- Where it shows: `counsel-os doctor` counts the files you have edited since counsel wrote them, and the retro's evidence carries them into the review. `outcomes: off` in `config.md` stops the whole record, as before.
- Nothing leaves the machine, and nothing is sent to a model: the record is the practice's own history of what it did with counsel's work.

Routing from the scoreboard (routing-and-evals spec §6)

- The scoreboard picks the model for a task: candidates clear the task's bar on the practice's own fixtures, or the shipped suite until the practice has its own; a pin wins among them; `cost` and `latency` choose only among peers within 0.05 of the best score, so a cheaper model never displaces a materially better answer.
- Two things routing will not do: send a matter that stays on this machine to the cloud, however well a cloud model scores; or refuse to answer for want of a measurement — an unscored task falls to the configured route and the default, as before.
- Every run records why its model answered — the scoreboard, a pin, the route, the default, or the matter's policy — and the record shows it beside the model.
- `practice/routing.yaml` holds the bar, the preference and the pin for each task; a typo in one task costs that task, not the file.

Routing and evals, step 1 — every step has a task, and the vault keeps what you did with the answer (routing-and-evals spec §3, §7)

- A closed legal task taxonomy — `review`, `redline`, `draft`, `research`, `extract`, `summarize`, `compare`, `remember`, `docket`, `retro`, `chat` — and where a step's task came from: named on the request, set on the conversation, a rule over the message and its attachments, an optional model call (`classify: model` in `config.md`, off by default), else `chat`. The task and its source sit on the step event and the run record; the turn's record shows `task · by rule · change`, and the picker corrects it (`PATCH /threads/:id/steps/:runId/task`).
- The outcomes record: `.counsel/outcomes.jsonl`, one line per thing you did — a proposal approved or rejected (with an optional reason from the slip's new *add a reason*), an answer marked *useful* or *not right* (two words under the turn's strip; `POST /threads/:id/turns/:runId/mark`), a task corrected, a document produced by a redline or a compare, a conversation deleted. Local only, never sent to a model. `GET /outcomes?since=` reads it; `outcomes: off` in `config.md` (or Settings → Runtime → *Decisions and marks* → `turn off`, which writes it) stops every write; `/health` reports the switch.
- The retro's evidence gains a *Decisions and marks* section with the period's counts.
- Settings: a task route's Task field offers the taxonomy (a custom name still goes through).

Routing and evals, step 2 — the eval runner moves into the runtime (routing-and-evals spec §4, §5, §9, §11)

- `counsel-os eval (--fixture <id> | --task <task> | --all) [--provider <id>] [--save] [--yes] [--json]` runs eval fixtures through the real loop in a temp copy of each fixture's mini-vault on any provider the runtime knows, scores the typed answer, and prints one line per fixture with the score, its terms, the duration and the cost. `--save` appends the lines to `<vault>/.counsel/evals/results.jsonl` — the record the scoreboard (step 3) reads; a step that errors is `score: null` with the message, never averaged in. `--yes` accepts a run estimated over $1.
- Fixture v2: a `scorer` per fixture — `findings` (the v1 shape, unchanged), `extraction`, `classification`, `redline` (the model's edits are applied to the fixture's Word document through the runtime's own redline engine before scoring), `rubric` (criteria judged by a model; on a practice set the judge never grades its own vendor) — plus `source` (provenance and license), `weights`, `task_kind`, and `documents[]` for a benchmark of many documents in one vault. The practice's own fixtures live under `<vault>/practice/evals/` and never ship.
- The `findings` scorer gains the severity band rule: an expected catch counts only when the finding's severity is within one band of the catch's, unless the catch says `severity: any`. Every shipped sample output still scores 1.0.
- The app: `POST /evals/run` (an SSE stream of `plan · progress · result · done`; `409 confirm-cost` over $1 without `confirm: true`; `409 eval-busy` while one runs), `GET /evals/fixtures`, `GET /evals/results?since=`.
- The Python eval harness (`scripts/run_evals.py`, `scripts/eval_runtime_runner.py`, its test) is retired; `evals/baselines/claude-fable-5.json` stays as the parity anchor the TypeScript scorer is tested against. `bun run evals:self-test` and `bun run evals:runner-test` are the CI steps. `evals/README.md` documents the v2 schema and the provenance rule for anything not written here.

Routing and evals, step 3 — the scoreboard (routing-and-evals spec §5, §9, §10, §12)

- The scoreboard: the results record folded per task × provider × model version × fixture set. The latest line per fixture wins (a re-run replaces, never accumulates); `practice`, `shipped` and `benchmark` are never averaged together; a `score: null` line is a failed cell with its reason, never a zero in the mean. Each row carries the fixtures it scored, the sample size, the median latency, the mean cost per run and how many days old it is. `GET /evals/scoreboard` serves it; `counsel-os eval --scoreboard [--json]` prints the ledger without running anything.
- Settings › Models, between Default provider and Task routes: a task × provider ledger with the three sets as small-caps tabs, scores set as text, a failed cell as `failed · <reason>` with *retry*, staleness as `3d ago`. Each cell's *score* asks once on the same line — `Score <provider> on <task> · 8 fixtures · about $0.60` (or `· cost unknown`) — then runs `POST /evals/run` with the progress in place. `GET /evals/estimate?task=&providerId=` is the line's source.
- The shipped fixtures and their mini-vaults (`evals/fixtures`, `evals/vaults`) ship through the content source, so the compiled binary lists and runs the same suite as a checkout. Setup and content updates never seed a vault from them.

## [0.13.0] — 2026-09-02

Providers phase 1, retro, the binary — any model, keys in the Keychain, matters that stay local

- A two-layer vendor catalog: fifteen SDK-native vendors (Anthropic, OpenAI, Google, Mistral, Groq, xAI, DeepSeek, Cohere, Perplexity, Together, Fireworks, DeepInfra, Cerebras, OpenRouter, Ollama), OpenAI-compatible presets for hosted services and the local runners (LM Studio, llama.cpp, vLLM, MLX, Jan, GPT4All), and the enterprise trio (Azure OpenAI, Amazon Bedrock, Google Vertex) with their own credential shapes. API keys are pasted once in Settings and kept in the macOS Keychain (libsecret or a 0600 file elsewhere), never in a config file or the vault. Every provider row says whether text leaves the machine and to whom. Model lists come from the vendor, with context sizes. A matter marked stays_local: true is answered only by a local model, decided before the first call and never silently downgraded. Retro runs inside the app as a thread seeded with the period's evidence, its outputs landing as proposals. A compiled counsel-os binary embeds the UI and the content (packaging step 1). Plus the design-review fixes on the new theme. Details in the bullets below.

Enterprise providers — Azure OpenAI, Amazon Bedrock, Google Vertex AI (providers spec §3, step 5)

- Three vendors whose credentials are not one API key join the catalog: `azure/<deployment>` (`@ai-sdk/azure`), `bedrock/<model id or inference profile>` (`@ai-sdk/amazon-bedrock`), `vertex/<model>` (`@ai-sdk/google-vertex`; a `claude-…` id goes through the Anthropic-on-Vertex endpoint). Each carries a field set instead of a key: the non-secret fields (resource, region, project, location, an AWS profile name) sit on the `providers.yaml` entry as `extra`; the secret ones (a key, an access key pair, a service account JSON) are pasted in Settings and kept as ONE Keychain item under the provider id.
- Resolution at load: the store, then the environment (`AZURE_OPENAI_API_KEY`, `AWS_*` / `AWS_PROFILE` with `~/.aws/credentials`, `GOOGLE_APPLICATION_CREDENTIALS`), then the SDK's own default chain — a firm laptop with an AWS profile or gcloud ADC needs nothing pasted, and `keySet` reads `default-chain`.
- `PUT /providers/:id/key` takes `{ fields }` for these vendors, validated per vendor with `issues` on a 400; a required non-secret field missing on a row is refused in the row's words. Discovery: Azure lists the resource's deployments, Bedrock lists foundation models over a SigV4-signed request (curated on the default chain), Vertex is curated.
- Settings: the picker's new group *Hosted API · enterprise*; a field set under the row (secret fields masked, sent once, never echoed; `credentials · set · replace · remove`, or *default credentials on this machine*), the company on the row's second line, and the vendor's setup page.

Model discovery (providers spec §4, step 3)

- `GET /providers/:id/models` lists what a vendor can answer with — from the vendor's own list where one exists (OpenAI, Google, Mistral, Groq, DeepSeek, Cohere, Together AI, Fireworks, Cerebras, OpenRouter, Ollama, and every OpenAI-compatible preset and local runner), from a curated list where none does (Anthropic, xAI, Perplexity, DeepInfra) — with context sizes where the vendor reports them and OpenRouter's per-million prices kept for the scoreboard. A keyed vendor is never called without a key; a failure is one sentence, never an empty picker; listings are remembered for ten minutes (`?refresh=1` asks again).
- Settings: each provider row gains a Model picker over that list (context size beside each model, custom ids still typed) with the runtime's sentence and a `refresh` link under it; a local runner lists from the row's base URL.
- First run: a usable Ollama row lists its models in the same picker; picking one is the model counsel starts on.

More providers and models, step 1 — the vendor catalog (providers spec §3, §6)

- One vendor catalog (`runtime/src/providers/vendors.ts`) in two layers replaces the hand-kept allowlist. SDK-native: Google Gemini, Mistral, Groq, xAI, DeepSeek, Cohere, Perplexity, Together AI, Fireworks, DeepInfra, Cerebras and OpenRouter join Anthropic, OpenAI, Ollama and the OpenAI-compatible shape. Presets (data rows over the OpenAI-compatible shape, base URL built in): Kimi/Moonshot, GLM/Z.ai, Qwen/Alibaba Model Studio, SambaNova, Baseten, Hugging Face, Cloudflare Workers AI, Replicate, and the local runners LM Studio, llama.cpp, vLLM, MLX, Jan, GPT4All. An unknown prefix in `providers.yaml` now names the known ones. Settings adds a provider through one grouped picker (Subscriptions · Local runners · Hosted API); the first-run screen names the hosted vendors a key unlocks and open models worth starting with on Ollama.
- Every direct provider is built through its SDK factory with an explicit key — the entry's `apiKeyEnv`, else the vendor's usual variable — so `anthropic/…` and `openai/…` honour a configured key (they silently used only the process environment before). Entering the key in the app comes next.
- Capabilities carry a `locality`: an OpenAI-compatible server on a loopback address is local, and the router's "never remote" routes go by that, not by the credential type.
- `/health` and `GET /settings` say where each provider's text goes (`locality`) and who receives it (`handles`); the rail footer's switcher, each provider row in Settings, and the Runtime table show it as one line — `local · nothing leaves this machine` or `cloud · text goes to <Company>` with the vendor's terms. The first-run screen names the vendors a key unlocks.

Retro in the runtime — the practice's feedback loop without the plugin

- A retro is a thread: `POST /retro` (Home's "run a retro" line when one is due; Settings › Runtime › Run a retro) and `bun runtime/src/cli.ts retro [--since <date>]` open a `Retro · <period>` thread whose header carries `task: retro`. Every step of that thread runs with the retro method (`skills/retro/SKILL.md`, now shipped content) and the runtime's own evidence for the period in its system prompt — conversations and steps by task and provider, runs with cost and errors, proposals by decision, documents produced, matters touched, memory, and the doctor's findings — and every knowledge change the retro suggests comes back as a proposal for the docket.
- `GET /retro` says when the last retro ran and whether one is due: `retro_cadence_days` in `config.md` (default 90), or for a first retro, a vault with at least 3 matters or 10 conversations. `.counsel/retro.json` records the last retro.
- A thread header can carry a `task`; the loop runs every step of such a thread as that task when the caller names none.

The `counsel-os` binary (packaging spec §3, step 1)

- `bun run build:runtime` compiles the runtime into one `counsel-os` binary with the built UI and the shipped content embedded (generated modules under `runtime/src/generated/`, never imported by the checkout); `release-binaries.yml` publishes `counsel-os-darwin-arm64` and `counsel-os-linux-x64` with `.sha256` files and smokes each build (version, setup mode, `init`, serve, `docx read`).
- The vendor CLIs are located (PATH, then `~/.claude/local`, Homebrew, `/usr/local/bin`, `~/.local/bin`, npm's global bin) and handed to the SDKs (`pathToClaudeCodeExecutable`, `codexPathOverride`); the first-run probe reports the path. Nothing is bundled.
- The Codex bridge re-execs the binary as `counsel-os mcp-stdio`; `counsel-os version` prints the runtime and content versions.
- `docket_sweep` is the TypeScript sweep Home's docket uses; `clean_format` (still Python) is registered only from a checkout.
- Guard: `init` and `update-content` refuse a content source that ships zero (or fewer than the manifest's) files instead of seeding an empty vault.

More providers and models, step 2 — keys in the app (providers spec §5)

- Paste an API key on a provider's row in Settings; it is kept in the macOS Keychain (`security`), the Linux keyring (`secret-tool`) when present, or `~/.counsel-os/secrets.json` at 0600 — never in `providers.yaml`, the vault, a log, or a response. The registry asks the store before the environment, so a key from the environment still works for headless use (`COUNSEL_OS_SECRETS=file` forces the file store).
- `PUT`/`DELETE /providers/<id>/key`; `/settings` and `/health` report `keySet` (`true`, `false`, or `env`) per provider and where keys live. Anthropic and OpenAI providers now honour an app-entered key (they read only the environment before).
- Settings: a `key · set · replace · remove` line under each keyed row with the vendor's "get a key" link; the Runtime ledger's Keys fact; the Providers copy stops sending a lawyer to set environment variables.

## [0.12.0] — 2026-09-01

Standalone foundations — Word documents in TypeScript, runtime-owned setup, drag-in intake, stay signed in, new theme

- The runtime now does everything the Word pipeline did in Python: read and convert .docx, extract and check, apply native tracked changes with comments, compare two documents, and diff rounds; the redline appears in the thread as a document slip with Download. Drag a Word file onto the ask box or the composer. The runtime carries the knowledge content and owns first-run setup (counsel-os init, setup mode with the first-run screen, the sample matter, content updates and doctor in Settings). One printed link signs the browser in; after that http://127.0.0.1:7431 just works. Palette and type revised (system-sans chrome, warm grey and teal, Charter reading surface); the reader's head and facts block stack on a narrow pane; folder matters list their documents; hero-flow polish from an end-to-end test on a fresh vault. Details in the bullets below.

Word documents in TypeScript, stage 2 — compare and rounds (spec §4.9, §9 step 5)

- `docx_compare` replaces Word Compare: two independently edited documents, aligned paragraph by paragraph (whitespace-normalized similarity, fuzzy pairing), written into a copy of the original as native tracked changes — changed paragraphs at word granularity, inserted and deleted paragraphs with their paragraph marks — as `<original>-compare-<date>.docx` beside the original; the slip in the conversation says what was compared against what. Table rows compare in place and are never inserted or deleted (reported as skipped). `scripts/word_compare.sh` and its AppleScript are gone; nothing needs Microsoft Word.
- `diff_rounds` runs inside the runtime (`runtime/src/docx/rounds.ts`): the same alignment, thresholds, classifications, JSON and markdown as `scripts/diff_rounds.py`, cross-checked identical on generated fixtures; the script is gone. `bun runtime/src/cli.ts docx compare|rounds` for the plugin path.

Word documents in TypeScript, stage 2 — the write path (spec `docs/superpowers/specs/2026-09-01-docx-in-typescript-design.md` §4.7–4.8, §5, §6)

- `apply_redlines` runs inside the runtime (`runtime/src/docx/redline.ts`): the same selectors, two-phase back-to-front apply, plain and native tracked-changes modes, Word comments, result JSON and refusal strings as `scripts/apply_redlines.py` — cross-checked identical on the demo NDA — with no Python. The script and its Python-gated tests are gone.
- The redlined document is written beside its source as `<original>-redline-<date>.docx` (never overwriting; `-2`, `-3` … when the name is taken) and recorded on the thread as an `artifact` event; the web UI shows it as a slip under the answer — filename, changes · comments · clauses touched · size, Download, Open in reader, Show the changes, the author and date of the revision marks — and the strip counts documents produced.
- `bun runtime/src/cli.ts docx apply <file.docx> <redlines.json> [--out] [--track] [--author]` for the plugin path; `primitives/draft.md` and `primitives/redline-output.md` describe one tier (the runtime always writes native redlines; attribution comes from `profile.md`).
- Table cell locations count grid columns the way python-docx did (`gridSpan`), so a `match.location` written for the Python script still resolves.

Runtime-owned setup, stage 1 (spec `docs/superpowers/specs/2026-09-01-runtime-owned-setup-design.md`)

- The runtime carries the shipped content behind one content source (`runtime/src/content/`): the law areas, the practice seed, the memory template, the primitives, and the counsel skill, with a generated manifest of per-file hashes (`bun run content:manifest`). The prompt and `read_primitive` read through it.
- `bun runtime/src/cli.ts init` creates and seeds a Counsel OS vault the way `/counsel-os:setup` does (default `~/Documents/Counsel OS`), from flags or four questions; idempotent, adopts an existing vault, never overwrites a file.
- `serve` no longer exits when no legal root exists: it starts in setup mode, serves the page, and offers `GET /setup/detect`, `GET /setup/providers`, and `POST /setup`; every other API route answers 409 until a vault is set up, then the same server switches to it in place. `/health` reports `setup`.
- The web UI shows a setup-required page in setup mode (the first-run screen lands next).
- **Stay signed in.** The runtime's bearer token is now per install, kept in `~/.counsel-os/token` (owner-only) across restarts (`serve --new-token` mints a fresh one and signs every browser out). The first visit through the printed `#token=` address sets an `HttpOnly`, `SameSite=Strict` cookie carrying the same secret, and the server accepts it only for requests the browser marks as same-origin (or typed into the address bar), so another local tool's page on a different port cannot ride on it. After that first visit, `http://127.0.0.1:7431` just opens — new tabs and restarts included. Settings › Runtime gains "Sign out of this browser" (`POST /session/clear`). The session-lost screen says so.


Runtime-owned setup, stage 2 — content updates and doctor (spec §6–§7)

- `bun runtime/src/cli.ts update-content`, `GET /content/status` and `POST /content/apply`, and a **Content** group in Settings: the shipped law and practice content compared with the vault by body hash and by what the vault last received. Law updates apply (never a file you changed — `managed-by: user`, `law_management: user`, or an edited copy); a practice seed that changed upstream shows its diff against the seed as received (`.counsel/received/`) for a merge by hand; missing files can be added. `auto_apply_law_updates: true` in `config.md` applies law updates at serve start.
- `bun runtime/src/cli.ts doctor`, `GET /doctor`, and **Check the vault** under Settings › Runtime: the read-only vault checks of `/counsel-os:doctor` — config marker, structure and counts, law currency against the policy cadences, git, a standards ↔ library numeric divergence check (time units), and open matters behind a refreshed law area. No environment checks.

## [0.11.3] — 2026-09-01

UI review batch — readable search, unified docket, session-lost screen, provider notice, conversation rename and matter link

- Eight founder-review fixes (heading glue after tool calls, tool-trace verbs and named tool results, settings default field, search hits as documents, matters newest-first, stage in the Home due slot, MATTER line in the thread header, clickable vault paths). One docket on Home: deadlines swept from matter frontmatter in TypeScript plus pending proposals. Session-lost screen with a paste field. Plain-language notice when the saved model is not available; humanized step failures with Retry. Conversations: rename in place, explicit matter link, in-row delete confirm. Specs and mockups for the standalone tracks (Word documents in TypeScript; runtime-owned setup).

Word documents in TypeScript — stage 1, the read path (spec: docs/superpowers/specs/2026-09-01-docx-in-typescript-design.md). Folded into the next release entry by the releaser.

- `runtime/src/docx/`: a `.docx` is opened, walked and converted inside the runtime — no Python, no pandoc. DOCTYPE parts are refused before parsing (the XXE / billion-laughs guard moved from `xml_safety.py`). Word numbering is rendered as text; tracked changes and comments come through as CriticMarkup.
- Tools: `docx_read` (new), `extract_redlines` and `check_document` now run in TypeScript with identical JSON (cross-checked against the Python on the demo NDA). `apply_redlines`, `clean_format` and `word_compare` stay on Python until stage 2.
- CLI: `bun runtime/src/cli.ts docx read|extract|check <file>` for the plugin path and the shell; the `read` primitive no longer prescribes pandoc.
- API: `GET /vault/read` converts a `.docx` (`kind: "docx"`, markdown, warnings) instead of returning bytes as text; `GET /vault/download` streams any vault file with the right headers.
- Reader: a Word document renders as a document — converted body, its own tracked changes in the redline tints, comments as quiet notes, a WORD DOCUMENT line with download.
- Intake: drop a Word document on Home's ask box or the chat composer — it uploads (`POST /vault/upload`) into the linked matter's folder or `matters/inbox/`, never overwriting (`nda-2.docx`), and lands in the message as a path chip; the result line offers "move to a matter" (`POST /vault/move`). Only `.docx`, 25 MB cap, hostile packages refused before they are stored. `matters/inbox/` is now a documented convention (CONFIGURATION.md).


## [0.11.2] — 2026-08-31

UI polish round 2

- Draft conversations survive navigation (rail row + Chat nav return to the live draft); CONVERSATIONS + and row × share one aligned hit target; two-tier type scale — documents stay at reading size, chrome and lists tightened for density.

## [0.11.1] — 2026-08-31

UI polish + Settings rethink

- Aligned chevrons, styled provider combobox (native datalist gone), config.md hidden from listings, anchored askbar, single empty-state copy, humanized deadlines; Settings reorganized into task-oriented groups with purpose lines, structured task routes, guided add-provider flow.

## [0.11.0] — 2026-08-31

Comprehensive UI redesign — brief/ledger workbench

- Home dashboard (ask box, docket, matters), Word-style tracked-changes proposal redlines, real vault reading environment (grouped tree, cmd-K search, outline), brief/ledger design language in both themes, new read-only endpoints (/vault/overview, /proposals, /vault/search).

## [0.10.0] — 2026-08-30

runtime: multi-model counsel runtime + local web UI (preview)

- NEW (preview, runs from source): a local counsel runtime (runtime/, Bun) that runs the five primitives on Claude (Pro/Max subscription login), Codex (ChatGPT login), OpenAI/Anthropic API keys, or local Ollama — configured in ~/.counsel-os/providers.yaml or in the UI; no API key required
- NEW (preview): a local web UI — chat with streamed answers, tool activity and per-request run records, proposals as redlines you approve in place, a vault browser, and settings; start with: bun runtime/src/cli.ts serve --vault <vault> --open
- the new design (v2: workbench shell, answer-first turns, redline proposal cards) is the default; the classic design stays one switch away (Settings -> New design off, or ui=v1)
- vault_search is real (AND-first with OR fallback, idf ranking, filename hits for any file type); it previously returned nothing in every entry point
- step timeout, run records (.counsel/runs), typed answers on demand, and evals through the runtime (scripts/run_evals.py --runner runtime)
- plugin adapter: the counsel skill hands off to a running local runtime via scripts/runtime_step.sh and falls back to the plugin flow when none is running
- plugin users are unaffected: skills, primitives, and scripts behave as before; an installer for the runtime is on the roadmap (docs/roadmap.md §9)

## [0.9.43] — 2026-08-14

draft.md: --edit mode for in-place .docx revisions

- new --edit section: revising an existing .docx defaults to apply_redlines.py silent mode (formatting-aware word-level replacement); direct python-docx surgery is for structure only and requires reading redline-output.md's bold-leading-paragraph rules first
- run-formatting rules: never stuff replacement text into a paragraph's first run (bold lead-in inherits onto the whole paragraph); mirror source run structure; new runs get explicit bold=False and font name/size
- mandatory post-edit lint: fully-bolded-paragraph check, em/en-dash + NBSP + straight-quote scan, stale party/number/date grep, single-font check

## [0.9.42] — 2026-08-04

browse: fix daemon leak on restart

- server shutdown now has a 3s force-exit deadline: a wedged Chromium hanging browserManager.close() no longer keeps the old daemon alive holding its port (this also makes plain SIGTERM effective again); the state file is unlinked before the deadline so a force-exit never leaves a stale record
- the CLI reaps the tracked server (SIGTERM, then SIGKILL after 4s) before spawning a replacement, with a PID-reuse guard that only ever kills processes whose command line is a browse server — never a port-range sweep, so sibling Conductor-worktree instances are untouched
- restart/stop with no live tracked server no longer spawn a server just to tell it to exit (the double-spawn that leaked a daemon pair per plugin version and eventually exhausted ports 9400-9409)

## [0.9.41] — 2026-08-04

--document naming: drafter initials from practice profile

- output naming now carries the drafter's initials (from practice/profile.md ## Identity) on authored statuses — DRAFT, REDLINE, comments — so your markup is distinguishable from the counterparty's in an exchange; initials are omitted on Final/signed, and dropped entirely when the profile has no name

## [0.9.40] — 2026-08-04

--document mode: default output naming convention

- generated documents default to '{Client} - {Document Title} - {Person} ({STATUS} {YYYY-MM-DD}).docx' with STATUS in DRAFT/REDLINE/Final/signed — stable stem across the document's life so draft and signed copies sort together; existing client-folder conventions take precedence

## [0.9.39] — 2026-08-04

--document mode: mixed-numbering and signature-block caveats

- draft.md --document: clean_format.py's mirror-numbering pass folds recital lettering (A., B.) into the section number sequence and promotes bold signature-block labels to Heading style — recital-style agreements now route around the normalize pass (pandoc + direct python-docx fonts, literal numbers kept in text)
- draft.md --document: address and signature blocks must be blank-line-separated paragraphs in the markdown source; pandoc merges single-newline lines into one flowing paragraph

## [0.9.38] — 2026-07-30

net-new .docx generation pipeline + fully pinned legal template

- draft.md gains a --document mode: pandoc + clean_format.py is the prescribed pipeline for generating net-new .docx drafts — never macOS textutil (ignores CSS point sizes, ships oversized text), never legal-template.docx as a pandoc --reference-doc
- the new mode documents what the normalize pass flattens (hyperlinks collapse to anchor text, footnotes drop, images/fields lost, heading auto-numbering) and routes documents needing those features to a direct python-docx build instead
- legal-template.docx: every rFonts in BOTH style parts (styles.xml and the Word-2010 compat stylesWithEffects.xml) now pins Times New Roman with all theme font attributes stripped — OOXML theme aliases supersede explicit fonts, so leftover asciiTheme attributes rendered headings in Cambria/Calibri
- new guard test (browse/src/legal-template-fonts.test.ts) asserts both style parts stay pinned and Normal stays 11pt

## [0.9.37] — 2026-07-29

minimal multi-region redlines in --track

- apply_redlines.py --track now diffs each edit pair at word granularity into independent minimal change regions: a pair changing two numbers in one sentence produces two small strikes, never one strike across the unchanged text between them (the whole-paragraph-strike failure mode that originally motivated Word Compare)
- merged no-whitespace gaps keep money amounts readable ($1,500,000 -> $2,000,000 is one strike); word-boundary widening and punctuation-preserving insertions carry over from 0.9.36

## [0.9.36] — 2026-07-29

native tracked changes — redlines without Word

- apply_redlines.py --track writes edits as native Word revision markup (w:ins/w:del with author, timestamp, per-run formatting preserved, word-boundary minimal cores) — the Full redline tier no longer needs Microsoft Word, a GUI session, or AppleScript (cou-20)
- word_compare.sh becomes the alternative engine for comparing two independently existing documents, with guidance for the AppleScript compare verb failing (-1708) on some Word installations
- redline methodology: accept-all baseline for documents carrying pending tracked changes; XML-audit gotchas (w:t regex, lxml proxy-id dedupe)

## [0.9.35] — 2026-07-27

word_compare cleans up after failed runs

- word_compare.sh closes the documents a failed run opened instead of leaving them open in a background Word, each holding a ~$ owner-lock file beside the user's document (cou-19)
- orphaned lock files beside the original, modified and output paths are cleared before the compare, breaking the stale-lock -> modal dialog -> timeout -> more leaks cycle; a lock owned by another user, or one that will not parse, aborts with the path to fix by hand
- runs refuse to start when Word's scripting model cannot address open documents by name, a state in which every safety check here would be working blind

## [0.9.34] — 2026-07-21

clean_format mirrors existing legal numbering

- clean_format no longer renumbers a contract that already numbers itself: section level now comes from the number's own depth, counters normalise duplicate/backwards/skipped numbers and report each correction, and exhibits restart at 1 via startOverride (cou-18)
- number glyphs render in Times New Roman instead of the template's theme font
- draft legends, privilege banners, centered text and recital prose are styled but never numbered
- documents numbered ARTICLE I / Section 1.1 are left alone rather than double-numbered

## [0.9.33] — 2026-07-11

Mechanical document QA and operative-agreement stack design

- mechanical document QA: check_document.py flags dangling cross-references, unattached exhibits, defined-but-unused terms, and party-name drift, wired into read (cou-50)
- operative-agreement stack: design doc for an effective-terms view per deal family (cou-49)

## [0.9.32] — 2026-07-11

Batch review and deadline docketing

- evaluate --batch: run one position set across a folder of documents and get a single consolidated report (cou-47)
- deadline docketing: deadlines: frontmatter convention plus a read-only /counsel-os:docket sweep across matters (cou-48)

## [0.9.31] — 2026-07-11

Security hardening, redline fidelity, and release/doctor fixes

- browse daemon: token state file moved out of world-readable /tmp; idle timer only resets on authenticated commands (cou-28)
- docx XML parsing hardened against XXE and entity-expansion attacks (cou-43)
- docx pipeline surfaces tracked changes outside the document body and no longer drops hyperlink text or nested tables (cou-32)
- doctor: Step 11 matter-aware law-impact check no longer silently no-ops (matters_path now expands); browse-binary guidance reflects the auto-download path (cou-30)
- qmd embed: the ~940MB model download is gated behind prior opt-in at every reindex call site (cou-31)
- release.sh: guards for main-branch, fetch freshness, tag-push failure, and untracked-file sweep (cou-33)
- release binaries: dropped the un-runnable darwin-x64 job; Intel-Mac guidance is now honest (cou-42)
- docs consistency sweep and eval CI honesty (cou-34)

## [0.9.30] — 2026-07-11

Redline and backup safety: original-document target resolution, Word close safety, atomic backups

- apply_redlines: all occurrence targets now resolve against the original document before any edit is applied, so occurrence numbers can no longer silently land on the wrong match after earlier edits mutate the text (cou-26, #2)
- word_compare: never touches Word documents this run didn't open — a user's own open document with the same name is no longer closed with 'saving no', which could discard unsaved edits (cou-27, #3)
- backup/restore: backups are staged atomically so a partially written backup can never become the newest restore candidate, and symlinked vault subdirectories are dereferenced so their contents are actually saved (cou-29, #1)

## [0.9.29] — 2026-07-02

Word redline robustness: deterministic output size + stable document handles

- word_compare: force font embedding OFF on the comparison-doc save (embed truetype fonts save-as parameter), so redline output size no longer depends on the user's Word preferences (cou-22, #30)
- word_compare: bind the compare/original documents to stable name handles instead of re-resolving 'active document' specifiers, so close can't hit the wrong window mid-run (cou-23, #31)

## [0.9.28] — 2026-07-02

Adoption push: /counsel-os:demo, Express setup, README overhaul, robustness fixes

- demo: new /counsel-os:demo skill — capability guide + live NDA showpiece run against your own positions; guarded by a matched eval fixture (cou-19)
- setup: Express near-zero-decision onboarding (Express default vs Custom fork) + 'Starting point, not legal advice' banners on all 24 seeded position files (cou-18)
- README: install → setup → demo above the fold, honest data-flow, platform matrix, FAQ, eigenlegal.com/docs link (cou-20)
- robustness: browse CLI/server hardening + eval scorer + backup/restore guards (4 findings from founder code review) (cou-17)

## [0.9.27] — 2026-06-14

Setup: proactive Obsidian detection (read-only, offer-not-install); README consultation link

- Setup skill now detects an installed Obsidian app and existing vaults (filesystem scan — more reliable than obsidian.json, which can report zero vaults) before asking, and leads with 'use your vault at X?'. Detection is read-only and never blocks; install is offered as a host one-liner for the user to run, never automatic. README: add a 'book a free consultation' callout up top (Eigen Legal custom builds) and the install-section reframe + skill-count fix from the prior commit.
- Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>

## [0.9.26] — 2026-06-12

Doctor consistency + matter-aware law-impact checks; evaluate flags stale law at point of use

- doctor Step 10: vault consistency - numeric positions compared across practice/standards <-> practice/library variants and against law/ Key Constraints floors; undocumented contradictions reported with both numbers and paths (the 30/90 deletion-window divergence class); deliberate ask-vs-accept splits documented in Notes are respected
- doctor Step 11: matter-aware law impact - open matters whose Law areas were refreshed after the matter's updated: date are flagged with the specific areas (dogfooded live: caught 2 real matters behind the 2026-06-11 law refresh)
- /counsel-os:doctor --consistency runs only those two checks - cheap pre-deal spot-check, fully Cowork-capable
- evaluate: findings that rely on a law file past its review cadence carry an inline staleness warning - protection at the moment of reliance, complementing doctor's monthly inventory

## [0.9.25] — 2026-06-12

Zero-toolchain browse actually works: lazy playwright import + runtime-before-smoke-test

- Two bugs found by end-to-end testing of the v0.9.24 assets:
- 1. The bundler hoists external imports to bundle load time, so even --help failed unless invoked from a cwd that could resolve node_modules. Fix: browser-manager now imports playwright lazily at launch(), resolved after NODE_PATH is seeded into the daemon's spawn env. Verified cwd-independent: client from /tmp, repo node_modules hidden, daemon healthy with live Chromium.
- 2. find-browse smoke-tested the downloaded binary BEFORE installing the playwright runtime, rejecting every good binary. Fix: install to destination, provision runtime, then smoke-test.
- Also: release.sh resume tolerance - an aborted run (behind-origin guard after the manifest bump) no longer blocks the re-run.

## [0.9.24] — 2026-06-12

Fix prebuilt browse binaries: playwright external + runtime tarball (binaries were baking build-host paths)

- The compiled binary bundled playwright, which resolves its own package.json and assets from disk at runtime via paths baked at BUILD time - so runner-built binaries pointed at /Users/runner/... and failed on every other machine (caught by the first true end-to-end install test; the earlier bare-directory test was a false positive because the local repo's node_modules existed at the baked path)
- Fix: playwright/playwright-core are now externals (matching the chromium-bidi pattern); releases ship counsel-browse-runtime.tar.gz (~5MB, pure JS, platform-independent) that find-browse extracts as node_modules two directories above the binary, mirroring the dev layout
- find-browse: downloads binary + runtime + browsers; home fallback moved to ~/.counsel-os/browse/dist/browse so the runtime geometry is uniform
- Verified by true isolation test: fake tree + only the runtime packages + repo node_modules renamed away -> daemon boots healthy
- release-binaries.yml: glob-expansion fix (cd into the cache before tar), workflow_dispatch repair path for existing tags, runtime tarball packaging

## [0.9.23] — 2026-06-11

Zero-toolchain browse: find-browse downloads prebuilt binary + matching Chromium builds

- find-browse self-heals on machines without bun/node: downloads the prebuilt counsel-browse-{platform} from the release matching the plugin VERSION (fallback: latest), smoke-tests before installing, falls back to ~/.counsel-os/bin when the plugin tree is read-only, then fetches counsel-browse-{platform}-browsers.tar.gz into the ms-playwright cache when Chromium is absent. COUNSEL_OS_NO_DOWNLOAD=1 opts out
- release-binaries workflow now packages the exact chromium + headless-shell + ffmpeg builds each binary's playwright version expects and attaches them alongside the binaries
- Verified: the compiled daemon boots healthy from a bare directory with no node_modules - browser builds were the only missing runtime piece
- Docs: browse SKILL auto-download setup, README bun-now-optional, setup/update skills degrade to the download path when bun is missing

## [0.9.22] — 2026-06-11

Doctor + update-skill fixes from 0.9.20/0.9.21 dogfooding

- Doctor: exclude law/FRONTMATTER.md from Part B attestation/ownership greps — its documentation snippets contain managed-by: user and last-reviewed: lines, producing a false 'user-owned law file' (observed on a real vault).
- Update skill: practice-merge step now requires patch --no-backup-if-mismatch plus .orig/.rej cleanup before the Step 9 commit — patch backup litter inside the law/ practice/ pathspec was swept into a vault commit and had to be amended out. Failed hunks (.rej) mean hand-merge, never commit.
- Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>

## [0.9.21] — 2026-06-11

Attestations to zero: Montana WDEA fix, Oklahoma + Alabama privacy laws, doctor override fix, auto-tagged releases

- Law library reaches ZERO attestations due (was 390): final 5 never-reviewed files verified and attested
- at-will.md: Montana WDEA probation corrected (2021 amendments - 12-month default/18-month max, file said 6 months); good-cause policy-violation prong added
- us-state-privacy.md: Oklahoma SB 546 (signed 3/20/2026, eff. 1/1/2027) and Alabama APDPA HB 351 (signed 4/16/2026, eff. 5/1/2027) added - 22 comprehensive state privacy laws
- doctor: vault-structure check now honors matters_path/entities_path config overrides before flagging directories missing
- release.sh: tags vX.Y.Z by default and pushes the tag, firing the release-binaries workflow (--no-tag to skip); the old --tag created counsel-os--vX.Y.Z which never matched the workflow trigger

## [0.9.20] — 2026-06-11

Law library fully attested (26 areas + 3 state tables), behavioral eval suite + per-model baselines

- Law refresh tranches 2-3 + dedicated state-table passes: every area source-verified against primary records and stamped; attestations due 390 -> 11
- Headline law now encoded: Learning Resources v. Trump (IEEPA tariffs invalidated, CBP refunds); OBBBA across tax/nonprofit/securities (NCTI/FDDEI, BEAT 10.5%, QSBS tiers, 4960 expansion, 1% remittance excise tax); GENIUS Act stablecoin exclusion; FinCEN RRE rule vacated (on appeal); 2025 HSR form vacated (pre-2025 form operative); SEC climate rescission proposed; NY FAIR Business Practices Act; DOJ Title II web deadlines extended to 2027/2028
- Errors killed at the gate: stale $50,120 FTC penalty x2 and false 'Congress restored 13(b)' claim; a fabricated $54,540 HSR penalty (no FTC 2026 adjustment exists - OMB M-26-11); 7 fabricated credit-monitoring mandates in the breach table; Utah missing from the MTL table; franchise $615 threshold misread; Cumis citation, Lloyd's LMA clause numbers, notice-prejudice split (insurance)
- Key Constraints sections added to 12 thin area overviews; authorities blocks now on every attested file
- Eval suite: 4 new behavioral fixtures (law-area trigger detection, redline round-trip, missing-provision coverage, GREEN/YELLOW/RED calibration) - all 1.0 on live generation; run_evals.py --save-baseline/--compare-baseline with regression gating; release.sh eval-freshness warning; first baseline claude-fable-5 @ 2026-06-11 mean 1.0

## [0.9.19] — 2026-06-11

Doctor skill, 7 new methods, cross-round redline diffing, durable backups, ops + confidentiality docs

- /counsel-os:doctor read-only health check skill; docs/operations.md cadence guide
- 7 new seed methods: security-incident-response, consumer-facing-terms, marketing-ad-review, financing-round, trade-compliance-screening, open-source-compliance, equity-compensation (methods index 28 -> 35)
- scripts/diff_rounds.py: round-over-round redline comparison (ACCEPTED/REVERTED/MODIFIED/NEW) + read --redline round-comparison instructions
- Backups relocated to ~/.counsel-os/backups/ (survive plugin updates); full-root backup honors matters_path/entities_path overrides; restore rewrites legal_root + pointer on relocation; root ./update ff-merge guarded (branch/dirty/ancestor checks)
- Matter-close auto-commit implemented in remember --matter (pathspec-scoped, never add -A); setup promise corrected to match
- README: new Confidentiality & Data Flow section; backup paths corrected; doctor documented. CONNECTORS.md rewritten to describe real integrations. direction.md refreshed to current architecture
- browse: SKILL.md command reference now generated from commands.ts (51 commands, was 26; diff semantics fixed) via scripts/gen_browse_reference.py + CI drift check; update skill gains browse rebuild step
- Prebuilt browse binaries: release-binaries.yml builds darwin-arm64/darwin-x64/linux-x64 on v* tags
- CHANGELOG.md added (0.9.0-0.9.18 reconstructed from git history); release.sh now auto-inserts each release's entry
- Deletion-timeline position aligned across standards + library: 30 days production / 90 days backups, with certification

## [0.9.18] — 2026-06-11

Update-skill hardening + docs refresh.

- Update skill: commit by pathspec instead of `git add -A` (a pre-loaded index could sweep unrelated vault work into an update commit); detect practice-seed changes by diffing against the previously installed version's seed; reindex the content index (QMD) after applying content.
- import_reference.sh: per-file source attribution; gfm table-loss comment made precise.
- lint_knowledge.py: lint git-tracked files only — gitignored leftovers under knowledge/ were failing the release gate on older checkouts.
- README: 6 skills incl. law-refresh; retro section rewritten for volume-calibrated analysis + knowledge harvest; usage examples for reference import and read --redline; marketplace update flow modernized. CLAUDE.md layout refreshed.
- Documented the safety-rule eval suite in both READMEs (main README trust story; evals/README fixture-authoring lessons).

## [0.9.17] — 2026-06-10

Complete the safety-rule eval suite: all four invariants tested, all green.

- Three new vault fixtures join the law-beats-practice pilot: reference-never-governs, entity-override-scoping, escalation-trigger — each scored 1.0 on live headless runs against the working tree.
- Harness fixes: `--strict-mcp-config` on generation runs (prevents a connected content index from hijacking Knowledge Base Search and leaking real vault entities into fixtures); alias lists must allow vault-internal paths and canonical real-world authorities so correct lawyering isn't punished as fabrication.
- Sample outputs added for all three fixtures so CI's self-test covers the full 8-fixture suite.

## [0.9.16] — 2026-06-10

Safety-rule eval harness: vault fixtures + headless generation; law-beats-practice pilot green.

- New fixture shape: a `vault` field names a mini legal root under evals/vaults/ (config.md placeholder, law/, practice/, matters/, memory/) plus a `task` prompt.
- run_evals.py `--generate`: copies the mini-vault to a temp dir and runs `claude -p` with `--plugin-dir <repo>` and `COUNSEL_OS_LEGAL_ROOT` pointed at the temp vault, so the entire knowledge system reads the fixture; `--model` and `--only` flags added.
- Pilot fixture law-beats-practice scored 1.0 on first live run (RED on the clause citing GDPR Art. 33 and flagged the practice standard itself as conflicting with law).
- evals/README.md documents vault fixtures, generation, and the flakiness policy.

## [0.9.15] — 2026-06-10

Inbound redline ingestion (read --redline + extract_redlines.py); matter lifecycle nudges.

- scripts/extract_redlines.py: walks a returned .docx for tracked changes and comments; emits per-paragraph original vs revised text, inserted/deleted fragments, author, date, section context, and anchored comments — JSON for the agent, `--format markdown` for humans. Handles moves, tables, and content controls; validated against synthetic fixtures and two real negotiation documents.
- primitives/read.md gains `--redline` mode: extract → classify every change against the effective position (ACCEPT/COUNTER/ESCALATE/CLARIFY) → hunt silent movers → delta report ordered Tier 1 first → log the round to the matter → feed counters into the outbound pipeline. New intent-routing row in counsel/SKILL.md.
- Matter lifecycle nudges: counsel proposes closing or refreshing matters that look finished or stale (>30 days or Next Action done) — bundled, at most once per session, never blocking. remember --matter now always sets `updated:` on every write.

## [0.9.14] — 2026-06-10

Law ownership model + /counsel-os:law-refresh + maintainer runbook; fix same-day law-sync blindness.

- Law content ownership becomes a dial: default stays plugin-managed; `managed-by: user` frontmatter marks permanent per-file ownership; `law_management: user` config flag stops law sync entirely; custom areas remain user-owned automatically.
- New /counsel-os:law-refresh skill maintains user-owned law content via the verify-and-patch pipeline (perishable-claim extraction, primary-source verification, minimal patches, flag-don't-guess, supervised attestation gate).
- Maintainer procedure for plugin-managed areas documented at docs/law-refresh-runbook.md.
- Fix: update compared law by content-version date, so same-day releases with different content were silently skipped — comparison is now by content (`diff -rq`), date method only as no-shell fallback.
- README gains a "Law Content: Who Maintains What" section; setup/update config templates document the new flag.

## [0.9.13] — 2026-06-10

remember --reference mode + import_reference.sh: first-class reference imports.

- primitives/remember.md gains `--reference` mode: confirm scope/attribution, run the deterministic helper (or manual file-tool path in Cowork), reindex, offer distillation as a follow-up; includes the copyright rule (imports stay vault-private; distillations must be clean-room re-expressions).
- scripts/import_reference.sh: .docx via pandoc, legacy .doc via textutil→pandoc (markdown flavor, never gfm — gfm silently drops complex tables), .md/.txt pass-through; provenance frontmatter + reference-only banner; per-collection and area-index registration; idempotent (`--force` to overwrite); bash-3.2 safe.
- Deliberately not a new skill: importing is an intent counsel already catches; the procedure lives in the remember primitive.

## [0.9.12] — 2026-06-10

Retro skill: calibrate to practice shape, volume-gate statistics, add knowledge-harvest step.

- Retro opens by calibrating to the practice's shape and states which mode it's running.
- Statistical steps (acceptance/fallback/exception rates) volume-gated at ~10+ comparable matters; deviations below that are case notes, not statistics.
- New Step 6 "Harvest Promotable Knowledge": sweeps matters/entities for deal-archetype and corridor playbooks (→ practice/methods/), proven negotiated language (→ practice/library/), regulatory-posture notes (→ entity files), and process rules (→ memory/patterns.md), always with approval before writing.
- Archetype Playbooks recommendation template and Harvest table added to the report format.

## [0.9.11] — 2026-06-10

Law refresh tranche 1: data-privacy, AI, corporate, consumer-protection, employment verified current as of 2026-06-10.

- Five areas through the verify-and-patch pipeline: ~190 substantive changes across 48 files, every load-bearing change source-verified; boldest post-cutoff claims independently confirmed against primary records.
- Headlines: removed a fabricated CT SB 2 enactment; CO AI Act repealed/replaced (SB 26-189); DGCL SB 21 Section 144 safe harbors integrated; 2026 HSR thresholds + form-vacatur note; Click-to-Cancel consistently stated as vacated; FTC non-compete rule confirmed dead; WA 2027 near-total non-compete ban; amended COPPA Rule binding; UK adequacy renewed to 2031; CPPA ADMT/audit regs final; VA cure-sunset and CUBI private-right errors fixed.
- 46 files stamped `last-reviewed: 2026-06-10` with authorities blocks; files not source-reviewed deliberately left unstamped. Known gaps flagged: 47-state MTL table, state-consumer-laws.md, advertising-media.

## [0.9.10] — 2026-06-10

Law refresh: financial-services verified current as of 2026-06-10.

- First area through the verify-and-patch pipeline: 37 source-verified changes across 11 files.
- Headlines: GENIUS Act stablecoin regime replaces the "no federal stablecoin law" section; CTA BOI reporting corrected to foreign-reporting-companies-only; SEC crypto enforcement posture updated; Section 1071 final rule; BNPL interpretive rule withdrawal; CFPB larger-participant test corrected; VAMP replaces VDMP/VFMP; RTP/FedNow $10M limits; Nacha 2026 fraud-monitoring phases; PCI DSS v4.0.1; TX money-transmission recodification; indexed-penalty hedges throughout.
- All 11 files carry authorities blocks and `last-reviewed` stamps; the ~47 unverified state-MTL entries flagged for a dedicated pass.

## [0.9.9] — 2026-06-10

Scripts reference in README; fix restore rollback data-loss path; align library with positions.

- README: new Scripts Reference section covering the document pipeline, diagnostics, and maintainer tooling with exact CLIs.
- restore: the ERR-trap rollback crashed on bash 3.2 via unguarded empty-array expansion under `set -u`, after which EXIT cleanup could delete the only copy of pre-restore vault data. The work directory is now preserved fail-safe-first; all three array expansions carry the bash-3.2 guard.
- practice-seed library aligned with position files: Excluded Claims now leaves fraud/willful misconduct expressly uncapped (was inside the 2x super-cap); Term and Auto-Renewal renews in one-year terms.
- CI: root helpers (backup/restore/setup/update) added to shell syntax checks.
- word_compare.sh save format live-verified against real Word 16.109.3 (tracked insertions/deletions correctly attributed).

## [0.9.8] — 2026-06-10

Browse daemon + docx script fixes; release/CI automation.

- browse daemon: classify Bun error shapes so timeout and crash auto-restart actually fire; stop/restart respond before exiting; adopt popup/window.open pages into the tab map; fix @ref nth() misalignment under -d/-c filters; per-request cwd for path resolution; fix the flush-cursor log race; viewport restore, output-path validation, scroll-offset annotate overlays, and misc hardening.
- docx scripts: separate numbering definitions for headings vs lists; unwrap w:sdt content controls with warnings; tighter list-prefix matching; style-inherited bold recognized for headings; merged-cell dedupe; run-boundary-aware smart quotes; find/replace sees text inside hyperlinks and w:ins; word_compare wraps Word in a 600s AppleScript timeout.
- Release/CI: scripts/release.sh (one-command four-manifest bump + lint + commit + push, bash-3.2 safe); scripts/lint_knowledge.py wired into CI alongside python/shell syntax checks; /counsel-os:update honors `auto_apply_law_updates: true` in config.md.

## [0.9.7] — 2026-06-10

Hygiene release: fix legal-root discovery on stock macOS bash, seed reference/, strip 240 bogus slug headings.

- resolve_legal_root.sh: guard the empty-array expansion that crashed bash 3.2 under `set -u` — fresh-install discovery was dead on every stock Mac.
- setup: seed practice/reference/ and verify it; remove the ghost templates/practice/ reference.
- knowledge: strip the H2-slug-before-H1 heading from the remaining 240 law/standards/library files; regenerate methods/index.md (28 methods); normalize seed index types; bump content-versions; drop empty knowledge/defaults/.
- counsel skill: trim description to fit the 1,024-char cap (was 1,844, truncated in listings); move trigger phrases to when_to_use; honor matters_path; add reference scope and knowledge-map entries.
- retro rebuilt on the current data model (matter-file gathering, exceptions defined as matter Decisions deviations).
- run_evals.py anchors default paths to the repo root and exits 2 when nothing was scored (was a silent false-green from any other cwd).

## [0.9.6] — 2026-06-05

Automate plugin self-update in /counsel-os:update via the claude plugin CLI.

- The marketplace-cache branch previously did a raw git pull (which never refreshes Claude Code's catalog) and pointed users at a no-op /plugin install. It now runs `claude plugin marketplace update` and `claude plugin update`; the only manual step left is /reload-plugins. Manual command fallback when the CLI or shell is unavailable.

## [0.9.5] — 2026-06-05

Add practice/reference/ as a first-class, out-of-precedence source.

- Recognize `counsel-os-type: reference` for curated third-party material (example agreements, checklists, treatise excerpts). It lives under practice/ for ownership but sits outside the 4-layer precedence — it informs issue-spotting and sample language, never governs; always cite-checked, never lifted verbatim.
- Wired into research.md and counsel/SKILL.md (path model, search types, effective-position carve-out, knowledge map).

## [0.9.4] — 2026-05-20

Manifest-only bump releasing the work since v0.9.3.

- Replace `{plugin_root}` placeholders with `${CLAUDE_PLUGIN_ROOT}` in all executable shell commands (8 invocations across 4 files) — some sessions resolved the placeholder relative to skills/counsel/ and got a wrong path to resolve_legal_root.sh.
- Consolidate the effective-position algorithm into counsel/SKILL.md as the single canonical statement (was duplicated with wording drift across evaluate.md and research.md); memory is explicitly step 4, "informs but does not override".
- Fix the H2-before-H1 heading anomaly in 11 method files (corrupted section-boundary inference during coverage checks).
- Move redline-output methodology from practice seed into plugin core (core methodology tied to apply_redlines.py, not a per-vault position).
- Repo docs: upgrade-UX design spec (on hold), field-test plan, gbrain search guidance in CLAUDE.md.

## [0.9.3] — 2026-05-15

Upstream redline-output method to practice seed.

- Adds practice/methods/redline-output.md covering section-numbering integrity, run-level formatting inheritance, character-set matching, and post-replacement cleanup; draft --redline points at it so the methodology loads before redline JSON is drafted.
- Also since 0.9.2: source-backed US/EU privacy law map.

## [0.9.2] — 2026-05-06

Use HTTPS source in marketplace.json.

- The github source type defaults to SSH cloning, which fails for users without GitHub SSH keys. Switched to the url source type with an explicit HTTPS clone URL so /plugin update works for all installs.

## [0.9.1] — 2026-05-06

Improve marketplace update guidance.

- Expanded the marketplace update instructions in skills/update/SKILL.md.

## [0.9.0] — 2026-05-06

Hardening and test-infrastructure batch (manifest-only bump releasing the work since v0.8.9).

- Add law frontmatter schema validator.
- Add golden matter eval harness.
- Add browse server tests, typecheck, and CI.
- Make the legal root resolver canonical.
- Refuse ambiguous redline matches in apply_redlines.
- Harden restore rollback handling.
- Repo cleanup fixes.

## [0.8.x and earlier]

Pre-0.9.0 history, collapsed. Highlights:

- 0.8.0–0.8.9 (2026-04-28 – 2026-05-02): migrate to the eigenlegal org and invert install order; drop the zip-export install path (marketplace install becomes the single supported method); vault-side config, runtime QMD detection, bootstrap pointer; skill-first setup; browse server packaging fixes.
- 0.7.x (2026-04-14 – 2026-04-24): primitives architecture (read, research, evaluate, draft, remember) replaces the pipeline skills; /counsel-os:counsel auto-invoked entry point; methods rewritten as reference guides; repo made self-installable as a marketplace; entity discovery abstracted.
- 0.6.x (2026-04-08 – 2026-04-14): eliminate the defaults layer, consolidate practice/; plugin cache sync in /update; document formatting (Times New Roman 11pt, smart quotes).
- 0.5.0 (2026-04-08): persistent matter state across all pipeline skills.
- 0.4.x (2026-04-05 – 2026-04-08): Word tracked-changes redline pipeline; knowledge-base version control and per-area content versioning; payments and data-privacy expansion for law/financial-services.
- 0.3.x (2026-03-24): vault integration and structure-agnostic discovery; law/ standardized to 26 areas as directories.
- 0.2.x (2026-03-21 – 2026-03-23): expanded knowledge base; user data moved to the Obsidian vault.
- 0.1.0 (2026-03-13): initial skeleton.
