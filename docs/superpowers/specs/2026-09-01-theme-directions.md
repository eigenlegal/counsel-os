# Theme directions — 2026-09-01

The founder's note on the live dark UI: "I don't really like the brownish color and the thick font that looks bold. I want something that looks sleeker and more modern, but also geared towards text work." Three directions, each a real screenshot of the running app on the founder's vault (light and dark, Home / a thread / the reader) in `img-theme/`. The brief/ledger motif (double rules, dotted leaders, small-caps run-ins, set-text statuses, no pills, no left-accent panels) is unchanged in all three; only palette, type, and weight move. Every direction passes `tokens.test.ts` (each ink ≥ 4.5:1 on its ground). Dark mode gets `-webkit-font-smoothing: antialiased` in all three, which alone removes most of the "bold" look. Each direction is its own commit on `theme-directions`; the branch ends on C.

## A — Ink & paper (`A-*.png`, commit 1)

Cool graphite neutrals in place of the brown, an ink-blue accent, and Charter at 400/500 for prose and titles. Light: paper `#f7f7f5`, ink `#1c1c1e` / `#55555a` / `#6e6e74`, hairlines `#e3e3df` / `#cfcfca`, accent `#2f5b9e`. Dark: `#141517` / raised `#1b1c1f` / hover `#232428`, ink `#e6e6e3` / `#adadaa` / `#8f8f8c`, accent `#8fb3ec`. Serif stack `Charter, "Iowan Old Style", Georgia`; prose 16px/1.68; document and thread titles at weight 500 instead of 600; matter names at 400. Good at: long-document reading, the closest to a book page, keeps the serif identity. Risk: the least "modern" of the three; blue can read as a generic app accent.

## B — Editorial sans (`B-*.png`, commit 2)

Everything in the system sans; serif only for document titles, thread titles, and the greeting. Warm-grey ground, one deep-teal accent used for links and the primary button. Light: `#f6f5f2`, ink `#1f1f1d` / `#5b5b57` / `#6f6f6a`, accent `#1f6b6b`. Dark: `#161615` / `#1d1d1b` / `#262624`, ink `#e8e7e2` / `#b0afa9` / `#8f8e88`, accent `#6fc2bd`. Prose and documents 15.5px/1.65 sans; document h2 in sans 600 15px; titles serif 500. Good at: the sleekest and most modern; dark mode reads lightest because system sans hints better than serif on a dark ground; dense answers and tables scan fast. Risk: a document in sans reads less like a document; lawyers reading contracts may miss the serif measure.

## C — Quiet legal (`C-*.png`, commit 3)

Monochrome graphite with one muted accent, oxblood, used only for the Ask/Send button and the live dot; links are ink with a hairline underline; the pending status and run-in emphasis fall back to ink. Serif body kept (Charter) but lighter and smaller: 15.5px/1.65, titles at 400, the greeting at 300, section headings at 500 with a hairline beneath them and h3 as small caps, so hierarchy comes from rules and caps rather than weight. Light: `#f8f8f7`, ink `#1a1a1a` / `#545454` / `#6d6d6b`, accent `#7a2e2e`. Dark: `#151515` / `#1c1c1c` / `#252525`, ink `#e4e4e1` / `#acaca8` / `#8e8e8a`, accent `#cf8585`. Radius tightened to 8/12. Good at: the most "legal", closest to a printed brief, the quietest; the single accent makes the one action on each screen obvious. Risk: the least colour to steer the eye; oxblood on dark needs the lighter `#cf8585` and reads slightly pink there.

## Recommendation

B for the chrome, C's type rules for the reading surfaces: the system sans everywhere the app frames the work, Charter at 400 with hairline-ruled headings inside documents and answers, on B's warm-grey palette with the teal accent. That combination is the sleek, modern chrome the founder asked for while keeping the reading surfaces built for text.
