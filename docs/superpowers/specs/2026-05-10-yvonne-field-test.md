# Yvonne Field Test — Monday 2026-05-11

**Status:** Field observation scheduled. Diagnostic paused until data lands.
**Context:** Counsel OS has zero non-builder users to date. Yvonne (senior in-house counsel at Everlaw, near-GC level, tech-fluent for a lawyer but does not use the terminal) was installed Friday 2026-05-08. First real attempt: Monday 2026-05-11.

## Why this exists

Mid-`/office-hours` diagnostic on 2026-05-10, the conversation produced two important admissions:

1. There are no non-builder users of Counsel OS. Yvonne is the first.
2. The instinct to "improve onboarding" before Monday was a desk-fix reflex, not a data-driven decision.

We agreed to ship nothing this weekend, observe Yvonne raw, and resume the diagnostic Tuesday with real data.

## Pre-call (Sunday → Monday morning)

- [ ] Text Yvonne tonight or first thing Monday: "Can we do a 45-min screenshare while you try it? I won't help. I just want to watch."
- [ ] Do NOT ship any changes to install scripts, setup skill, README, or onboarding copy between now and the call.
- [ ] Do NOT pre-explain anything on the call. If she asks "what should I try first?", answer "whatever you'd actually use it for this week."

## During the call — watch protocol

Three things to capture, nothing else:

1. **Facial / verbal moments.** Every time her expression changes — confusion, frustration, "huh, that's clever," a sigh, a long pause before clicking. Timestamp each one.
2. **Her vocabulary.** Every word she uses that does not appear in your README, primitives, skills, or knowledge files. Her words are the product's eventual words. Yours are wrong by default.
3. **The first thing she tries to do that you did not anticipate.** Especially if she tries to use it for something it was not designed for. The skill calls this "the real product trying to emerge."

Discipline rules:

- Count to ten before speaking when she hesitates.
- When she goes down a wrong path, let her. Even if you know the shortcut.
- Do NOT narrate, demo, or explain.
- Do NOT promise to fix anything during the call.
- Do NOT pitch.

## Post-call — one question

At the end, ask exactly this:

> "What did you think this was supposed to do, before you opened it?"

Compare her answer to the README headline. The gap between the two is your repositioning brief.

## What NOT to do after the call

- Do not immediately start fixing things. Sit on the notes overnight.
- Do not summarize the call as "Yvonne loved it" or "Yvonne hated it." The truth is almost always in specific moments, not overall valence.
- Do not text her later that day asking "any more thoughts?" — let her use it on her own terms for the rest of the week.

## Tuesday — resume the diagnostic

Bring the raw notes back. We re-enter the office-hours flow at Q2 (status quo — what is Yvonne doing today without Counsel OS) and Q5 (observation & surprise — what specifically did she try, where did it break, what did you not expect). Everything downstream — wedge, business model, distribution strategy — depends on what those notes contain.

## Related work currently on hold

- `docs/superpowers/specs/2026-05-10-proactive-upgrade-ux-design.md` — designed in the morning before this conversation. Solves a problem that does not yet exist (out-of-date plugin nags for a user base of zero). On hold until there is a user base to nag. Do not implement.
