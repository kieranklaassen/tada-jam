---
title: Build a jam game, a learning game included, from idea to a green PR by following the packs and the compounded conventions in order, and run the before-you-show-the-owner checklist
date: 2026-09-22
last_updated: 2026-10-02
category: conventions
module: game-creation
problem_type: convention
component: development_workflow
severity: high
related_components:
  - documentation
  - tooling
  - testing_framework
applies_when:
  - Adding a new game under games/ in tada-jam, turning a lab demo into a jam cartridge, or planning the order of work for a game
  - Designing a learning game for ages 2 to 4, 4 to 6 or 9 to 12, in canvas 2D or three.js, and writing its design sheet and learning claim
  - Checking a game's design sheet against the education pack before the game is built
  - Building several games at once, in git worktrees on the lead's machine or on remote machines, as the lead or as a builder
  - About to show a toy, a slice, a build, or a URL of a jam game to the owner or a playtester
symptoms:
  - The end-to-end new-game workflow lived only in the jam-game-creator agent skill, outside docs/solutions/
  - The owner asked to keep the build workflow as compounded knowledge instead of a repo skill
  - Lessons from Pebble Table were scattered across separate learnings with no single entry point for a new game
  - The guide predated both Compound Packs and had no step for a learning goal, for a canvas 2D game, or for building several games at once
  - Each game carried about 900 lines of helpers copied from another game, the copies drifted, and several quality governors shipped wrong
root_cause: inadequate_documentation
resolution_type: documentation_update
tags: [new-game-workflow, kids-games, jam-cartridge, learning-games, design-sheet, parallel-agents, pre-show-checklist, quality-bar]
---

# Build a jam game, a learning game included, from idea to a green PR by following the packs and the compounded conventions in order, and run the before-you-show-the-owner checklist

**A lab demo lends its idea, its verb and its feel, and never its code.**

## Context

This is the entry point for building a Tada Jam game. Read it first, then follow its links.

The order of work: read both packs; start the game from the template with `npm run new:game`; write the design sheet into `ART.md` before any game code, and have it checked by someone who did not write it; build the touch as a toy; then the game; then the gates. The numbered steps under Guidance follow that order. The sections after the steps hold the rules the steps point at.

The repo used to carry a `jam-game-creator` skill that walked an agent from idea to a green PR. It was removed in favour of compounded knowledge: the lessons from building Pebble Table and the games after it live as separate learnings under `docs/solutions/`, each with `applies_when` frontmatter that `compound find` can recall and `compound audit --strict` checks in CI (`.github/workflows/ci.yml`, config in `.compound-engineering/config.yaml`). A skill is a frozen copy that drifts from those docs. This page puts them in order. Each step names the concrete action and links the doc that holds the detail, so the detail lives in one place.

The order also changed from the old skill. The skill scaffolded gameplay before choosing a look and treated motion, performance, and sharing as end-of-build polish. Pebble Table showed that each of those costs a rewrite when it comes late, so they come early.

On 2026-10-02 the page was brought up to date for learning games. The owner asked for about twenty learning games for ages 2 to 4, 4 to 6 and 9 to 12, built in waves of several at a time, each designed from the education pack. Four things had changed under the old page:

- Two Compound Packs hold the design rules and the learning standards: `compound-packs/game-design/` and `education/`.
- The look menu in [`docs/art-direction.md`](../../art-direction.md) is a ledger with one writer.
- A new game is copied from a template (`templates/cartridge/`), not from another game.
- One shared probe measures every game (`npm run perf:jam -- <game>`).

The demos the owner rated "Build it" in the lab become real jam games with a school skill built in, under the cartridge rules. The lab is exempt from those rules, and its code is never copied into `games/` ([`AGENTS.md`](../../../AGENTS.md), "The mechanic prototype lab"). The game takes from the demo what the owner liked when he played it: the idea, the verb, and the feel in the hand. Every line is written new in `games/<key>/`. He rated the lively job demos "Build it" and most calm ones "No" as too slow or too quiet, so a game is lively and funny, and has no scores, coins, streaks or rewards (pack: game-design, liveliness-from-causing-and-comedy.md; pack: game-design, no-rewards-for-playing.md).

## Guidance

Paths are relative to this file (`docs/solutions/conventions/`). A pack rule is cited as `(pack: <id>, <file>)`: `game-design` is [`compound-packs/game-design/`](../../../compound-packs/game-design/README.md) and `education` is [`education/`](../../../education/README.md). Where a pack rule and [`AGENTS.md`](../../../AGENTS.md) disagree, `AGENTS.md` wins.

**0. Load what the jam already knows.** Four sources, in this order.

- **Both packs, in full.** The game-design pack is a README and 22 rule files, each short enough to read whole. The education pack is its README, eight rules, and six maps, of which you read the map for each jurisdiction at the game's age range. A rule the recall below does not return still applies.
- **The recall.** Run `compound find "<the activity, in a sentence>"` (needs `TYPESAFE_API_KEY`; see [agent delivery](../workflow-issues/agent-delivery-push-branches-and-keep-secrets-out.md) for loading it without printing it). It returns learnings and pack rules matched on their `applies_when`. Without the CLI or the key, grep the frontmatter instead: `rg -n -A6 '^applies_when:' docs/solutions`, and `rg -n -A6 '^applies_when:' --max-depth 1 compound-packs/game-design education` for the pack rules.
- **The jam's own rules and vocabulary.** [`AGENTS.md`](../../../AGENTS.md) for the contract rules and jam allowances, [`CONCEPTS.md`](../../../CONCEPTS.md) for the vocabulary, and one finished game of the kind you are building. For canvas 2D that is [`games/bad-neighbours/`](../../../games/bad-neighbours/) (`model.ts`, `renderer.ts`, `snapshot.ts`, `intersections.test.ts`, `frameBudget.test.ts`, `ART.md`, `REFINEMENT.md`). For three.js it is [`games/pebble-table/`](../../../games/pebble-table/) (`guidance.ts`, `motion.ts`, `controller.ts`, `REFINEMENT.md`) or `games/kite-tower/`. They are examples of craft: motion, performance, the overlap checks. None of the thirteen games is for a two-year-old or an eleven-year-old, and none has a designed cycle with an ending or a short scene built from the state of play, so those parts come from this page and the packs.
- **The lookup, for a learning game.** `npm run education:find` finds the records a game is designed from. Ask for an outline first, once per jurisdiction: `npm run education:find -- --jurisdiction us-ca --age <age> --subject <subject> --outline`, and the same with `nl`. An answer by age with its records is hundreds of kilobytes, and the outline is two. Then list one lane at a time with `--level <level> --subject <subject>`, and read one record again with `--id <pack id>`. Never pass `--wording`: for a California record it prints official wording, which may go into no file, and a design needs only the Summary or gloss and the Limits in the record file the answer names. `npm run -s education:find -- --help` prints every option.

**1. Shape the idea.** Write one paragraph: the one idea the child feels, the core verb (tip, deal, balance, sort), and how the world answers. In a learning game the verb is the school skill itself: what the finger does at the moment of decision is the skill, in the game's own objects (pack: game-design, the-mechanic-is-the-school-skill.md). Check the idea against "No engagement mechanics (Tada R15)" in [`AGENTS.md`](../../../AGENTS.md): no scores, streaks, timers, or counters dangled at the child, and no verdicts (wordless clarity item 7). If the fun needs one, reshape the idea. A demo whose decision is where or when to tap, or luck, keeps its fantasy and its feel and gets a new verb. Then pick four things: a kebab-case `key` (the folder name and the storage namespace), a name, an age band (whole years, 2 to 12, at most five wide; its youngest age governs the design), and a launcher emoji. In a wave the lead has already named all four, and the look ledger holds the game's reserved rows under that key: use them as given, because a builder that picks another key finds no reserved rows.

**2. Start the game from the template.** Run `npm run new:game -- <key> "<Name>" <youngest>-<oldest> <emoji>`, for example `npm run new:game -- hedgehog-post "Hedgehog Post" 4-8 🦔`. It copies `templates/cartridge/` into `games/<key>/`, renames the Mount file to `<key>.tsx`, and fills `manifest.ts` and `index.ts` from what you gave it; `config.ts` reads the band from the manifest. It refuses a key that is not kebab-case, a key a game or a showcase already uses, a key that is the name of a template module (such as `state` or `config`), and a band wider than five years, and then writes nothing. The untouched copy passes `npm run check`. What the copy holds, and the rules for changing it, are under "The template" below. Then:

- Find the row for the band's youngest age in the age-band cue table of [wordless clarity](wordless-clarity-for-the-declared-age-band.md). Its "Avoid" column is a hard constraint.
- Decide what `ctx.childAge` changes as a default, never a gate, and what happens when it is `null`.
- The rules of the game, when they are written in step 5, go in pure modules with no renderer or physics imports and a `*.test.ts` beside each, in the same folder. A game imports nothing from elsewhere in the repo except `../types`.
- A 3D game with rigid bodies starts on Rapier, which is on Tada's tech menu, not cannon-es: load its WebAssembly behind a ready promise that the Mount awaits with the save, step it at a fixed rate on every tier, and set `mountsAfterLoading: true` in the game's audit config. Detail and the engine's gotchas: [use Rapier as the default physics engine](../tooling-decisions/use-rapier-as-the-default-physics-engine-for-jam-3d-games.md).

**3. Write the design sheet into `ART.md`, and have it checked.** The sheet comes before any game code: no rule, no view, no sound. Its headings, in order, are under "The design sheet" below, and the template's `ART.md` is the outline. Someone who did not write it then checks it against the packs, as "The check of the sheet" describes; that section also says how a builder asks for the check and how the findings come back. No rule of the game is written until the sheet has passed. The toy of step 4 has no goal and makes no claim, so it may be started while the check runs.

**4. Build the touch as a toy, in the game's look.** The first thing built is the one action the child's finger performs most, in an otherwise empty scene, with its sound and motion and no goal (pack: game-design, toy-first.md). It stays only if doing it again and again is a pleasure with nothing to achieve.

- The answer starts when the finger lands, in the same frame, and is bigger than the touch: one touch sets off a chain (pack: game-design, touch-answers-bigger-than-the-touch.md). Random tapping always produces something pleasing, and the simplest use always works.
- The toy is built in the game's look from its first screenshot, never in a placeholder renderer. The lead (the session that plans the wave and owns the shared files) has reserved two or three rows for the game in the look menu of [`docs/art-direction.md`](../../art-direction.md). Spike the first choice on the toy's real scene: a screenshot at 1180×820 and a measured frame rate at DPR 2. Spike the next reserved row only if the first fails on clarity or frame rate, or the owner rejects it at the toy checkpoint. The order of the reserved rows is the lead's pick, so a builder does not spike the others to compare them, and the contact sheet is the lead's, across the games of a wave. A builder never edits the menu.
- The pieces a child counts, fits, cuts or sorts stay plain on a plain surface of a contrasting hue. The look goes on the characters, the setting and the result (pack: game-design, working-objects-stay-plain.md).
- Write the look into `ART.md` below the sheet (palette, materials, lighting, motion rules), and have it registered in the claimed-styles registry in the same PR. In a wave the registry row is a request to the lead, like any shared file; a builder working alone adds the row.
- The toy stage ends at the owner checkpoint ("Building several games at once"). Detail: [distinct visual style per game](distinct-visual-style-per-game-shared-quality-bar.md).

**5. Build the game on the toy: one obvious want per scene, the guidance ladder, and the cycle.** From the first frame one thing visibly wants something from the child, and each step toward it resolves visibly (the Scene want in [`CONCEPTS.md`](../../../CONCEPTS.md)). The idle ladder comes with the template (`guidance.ts`): on attended time it shows what can be touched, then one move, and never a solution; the game supplies what to show from its own state. Want and ladder ship together in the first slice. Around them:

- A new idea is shown once by a character, inside the fiction and without words, before the child tries it; in a game for ages 9 to 12 the child may try first and is then shown a neat way to compare (pack: game-design, guided-discovery.md).
- An error shows as a consequence in the world that says where and why, the state stays, and nothing gives a verdict (pack: game-design, errors-show-as-consequences.md).
- Characters have fixed tastes, and their reactions to the exact thing the child made are the feedback (pack: game-design, characters-with-opinions.md).
- A short scene is a list of timed beats filled in from the state of play, built on the template's `scene.ts`. It is the consequence of what the child just did, a secret, or the ending, lasts 4 to 10 seconds, and gives way to any touch (pack: game-design, endings-and-short-scenes.md).
- The cycle ends and restarts by "How a cycle restarts". What is saved follows "Found as left". The order of challenges follows "The hidden position".
- No words, letters, numerals or symbols on the kid side except as "Symbols, and the defaults awaiting the owner" allows (`npm run wordless:check`).

Detail: checklist items 5 to 13 of [wordless clarity](wordless-clarity-for-the-declared-age-band.md).

**6. Give every character and object its own motion.** Before writing any curve, decide each character's tempo, weight, and funniest body part. Put motion in a pure module with a personality per kind of character and a director that picks variants without repeats (`Personality` and `MotionDirector` in `games/pebble-table/motion.ts`), give props their own springs, and add tests that fail on shared or near-copy actions (`motion.test.ts`). The same holds in canvas 2D: the module returns numbers and the view maps them onto sprites. In a learning game the personality belongs to the characters and the setting; a working piece moves only as the idea needs. Detail: [motion personality per character](../design-patterns/motion-personality-per-character.md).

**7. Build performance in from day one.** The template already carries adaptive quality (`quality.ts`, with the tier table and thresholds in `config.ts`) and the grown-up performance handle the probe reads (`perf.ts`), so no game writes a governor or a `window.__jamPerf` declaration again ([why the declaration must match](../build-errors/jam-perf-global-declaration-must-match-in-every-game.md)). What the game adds:

- Its tier table in `config.ts`: what each tier sheds for this look (pixel ratio, per-object detail, the post pass). Tiers are counted from 0 as full quality. A tier changes how the game is drawn, never what happens in it, and the lowest tier still looks like the game.
- A grown-up frame-rate overlay behind a triple tap. The template has no overlay yet, so each game writes its own, in a file named `overlay`. The wordless check accepts grown-up text only in a file named `overlay` or `perf`, and in a game made from the template `perf.ts` is frozen, which leaves `overlay`. Every game needs one, so a shared overlay is a candidate for the template after the pilot games.
- A frame-budget test that CI runs through `npm test`, counting the work where the code exposes it ([frame-budget tests](../test-failures/frame-budget-tests-that-hold-on-a-shared-ci-runner.md); `games/bad-neighbours/frameBudget.test.ts` is the counted form).
- Measurements with the shared probe on a production build: `npm run perf:jam -- <game> [webkit|chrome] [cpuThrottle] [auto|full|tierN] [base]`. Run WebKit, Chrome at 6x and 20x CPU throttle, and the fill test with four times the pixels (`SIZE=2 npm run perf:jam -- <game> webkit 1 full`). The probe pins a tier through the `tier` query, so the game reads that query, as `tierOverride` does in Bad Neighbours. No game needs a perf script of its own. On a machine with no graphics card the numbers are read as "Building several games at once" says for a remote builder.

Write the budgets down first: about 12 ms a frame, never below 45 fps in the heaviest moment, under about 80 draw calls, DPR capped at 2, at most one post pass. Detail: [measure on the target device](../performance-issues/measure-on-the-target-device-and-ship-adaptive-quality.md). With physics, keep colliders as drawn but few and cheap ([colliders](../ui-bugs/pieces-collide-as-drawn-and-rest-on-what-is-drawn.md)), wake only what a moving thing can reach ([wake scope](../performance-issues/wake-only-what-a-moving-body-can-reach-and-let-the-mover-stop.md)), and compare builds with a probe that drives every build by the same screen positions, never by object names ([build-comparison probes](../workflow-issues/drive-a-build-comparison-perf-probe-by-layout-screen-positions-not-object-names.md)).

**8. Refine in logged passes.** Seed one busy state, screenshot at 1180×820 DPR 2 at a fixed moment after load that has the glow and a demonstration in frame (Pebble Table used 6.4 s), critique in writing as the child, make one themed fix set, re-shoot, revert what hurts, and sample fps with no screenshots running. Log each pass as a row in `games/<key>/REFINEMENT.md` and end with "Still weak". For motion, review recorded video, not stills. The loop is the same for a canvas game. Detail: [refinement loop](../workflow-issues/refinement-loop-for-kid-3d-readability.md).

**9. Run the cold playtest proxy.** Load the production build with fresh state, touch nothing for 10 s and write down what the scene invites, then play the first 60 s as a newcomer and list every unclear moment, recording the screen. Fix, rerun, and diff the lists. Detail: "Run a cold playtest proxy" in [wordless clarity](wordless-clarity-for-the-declared-age-band.md).

**10. Share a production build.** Run `npm run serve:lan` (build plus `vite preview` on port 4173 with `--strictPort`) in its own tmux session, separate from `npm run dev`, and rebuild before every re-share. Send `http://<LAN IP>:4173/?chrome=0#/play/<key>` and say in the message which URL is the production build to judge and which is the dev server to ignore. In a wave the lead serves the build the owner judges, and each builder previews on its own port. Detail: [share a production build](../workflow-issues/share-a-production-build-not-the-dev-server.md).

**11. The gates, the push, the PR hand-off.** Run the gates in "The gates" below: `npm run check`, then `npm run build` with `npm run egress:built` and `npm run education:built`, then the intersection audit or the game's own overlap tests ("Canvas or three.js"), then `compound audit --strict` if you touched `docs/solutions/`. CI runs all of these (`.github/workflows/ci.yml`).

Which git rule applies depends on the kind of builder ("Building several games at once" has both wave rules in full):

- A builder working alone pushes with `git push -u origin <branch>` and reads status with `gh run list --branch <branch>`.
- A local builder in a wave, whose worktree the lead can read on disk, runs no git command that writes. The lead commits, merges and pushes.
- A remote builder in a wave, whose worktree the lead cannot read, commits and pushes its own game branch at each stage boundary and no other branch. The lead merges that branch into the wave's branch with a squash and pushes the wave.
- Write the PR body to the Project store's `internal/` for the coordinator. It says how each quality-bar line is met, gives the engine, throttle, DPR, and build for every fps number, says plainly whether a physical iPad was measured, repeats the learning claim in "designed from" words with each record's standing and its check state read again that day, and lists the defaults taken for the owner.
- Where `git push` returns 403 from a cloud machine, a builder that does its own git (alone, or remote in a wave) publishes the same branch by another route: [deliver from a cloud VM through the GitHub MCP](../workflow-issues/deliver-from-a-cloud-vm-through-the-github-mcp-when-git-push-is-refused.md).

Detail: [agent delivery](../workflow-issues/agent-delivery-push-branches-and-keep-secrets-out.md).

**12. Compound what you learned.** For each durable learning run `ce-compound`, one learning per run ([`AGENTS.md`](../../../AGENTS.md) "Documented knowledge"). Before writing a new doc, check it against the existing ones with `compound find --overlap --doc <draft>` and extend an existing doc when they overlap. Add new terms to [`CONCEPTS.md`](../../../CONCEPTS.md), then run `compound audit --strict` so the `applies_when` field required by `.compound-engineering/config.yaml` is present. A disagreement between checkers that came up more than once becomes a numbered ruling in "The check of the sheet", not a new doc.

### The template

`npm run new:game` copies these files. Nothing is imported from the template: the copy is the game's own code, and it holds no renderer and no game rule.

```text
games/<key>/
  manifest.ts      filled by the generator; no JSX, React imports, or Vite globals
  index.ts         jam registration, deleted at port time
  <key>.tsx        the Mount, showing a blank surface (game.tsx in the template)
  config.ts        the one module a game tunes: the tier table and its thresholds, the position ladder, the save throttle
  perf.ts          frozen: the performance handle and its global declaration
  quality.ts       frozen: the governor's stepping logic, tiers counted from 0 as full
  attention.ts     frozen: attended and not hidden
  saveCadence.ts   frozen
  state.ts         versioned state, a defensive deserialize, the hidden position rules
  audio.ts         unlocks on touch-down and again on lift; rebuilds an interrupted context
  input.ts         pointer tracking that forgives a lifted finger and extra fingers; every press has one ending
  guidance.ts      the idle guidance ladder, on attended time
  scene.ts         a cue list of timed beats over game time
  ART.md           the design sheet outline
  REFINEMENT.md    the status block and the pass log
  *.test.ts        beside each module
```

- The first line of each copied file names the template and its version. In a file that must stay identical in every game, that line also says the file is frozen.
- A frozen file is never edited in a game. What a game tunes is in `config.ts`, which the frozen files read.
- The frozen-copy test decides from the folder, not from the file. A game folder in which any file carries a template header must hold all four frozen files (`perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`), each with its frozen header, and each byte-equal to the template unless it is on an earlier version. A missing file, a stripped header or a version later than the template's fails the test. A builder that changed a frozen file by mistake copies `templates/cartridge/<file>` over it.
- A fault in a frozen file is a request to the lead, who fixes the template and raises its version. `npm run new:game -- --refresh <key>` rewrites the frozen files of an existing game from the template and nothing else, and the lead runs it for each game after raising the version. Until then a copy on the earlier version is not held byte-equal: it is waiting for the refresh.
- The other files are free: `state.ts`, `audio.ts`, `input.ts`, `guidance.ts`, `scene.ts` and the Mount are starting points that a game changes as it needs. Keep their tests passing or change the tests with them.
- The Mount already pauses when `ctx.attention.attended` is false or the document is hidden, and watches its own element with a `ResizeObserver` that ignores 0×0. Keep both when the renderer goes in.
- `input.ts` turns pointer events into gestures. Every `press` is followed by exactly one of `tap`, `dragStart` or `pressEnd`. `pressEnd` says the press is over and was not a tap, as when the browser takes the touch away or the game is parked under the finger. So whatever a game squashes or lights on `press`, it lets go on whichever of the three arrives.
- The template has no speech and no language pack. Both arrive with the first game that needs them, after a trial on the owner's iPad.
- `symbols.ts` is not in the template. Only a game whose band starts at 6 or above adds it ("Symbols, and the defaults awaiting the owner").
- A helper is never copied from another game any more. If two games need the same new helper, that is a request to the lead for the template.

### The design sheet

The sheet is the first part of `games/<key>/ART.md`, written before any game code, under these headings in this order. The game's art guide (the look) follows it in the same file after the spike of step 4.

1. **The band and its age rule.** The manifest band, and what governs its youngest age: the cue-table row for that age with its "Avoid" column ([wordless clarity](wordless-clarity-for-the-declared-age-band.md)), the pack's rule for the age range (pack: game-design, ages-2-to-4.md; pack: game-design, ages-4-to-6.md; pack: game-design, ages-9-to-12.md), and the symbol rule for the band's first age. Also what `ctx.childAge` sets as a default, and what `null` gives.
2. **The toy.** The one action the finger performs most, what it does in an empty scene with its sound and motion, and why repeating it is a pleasure with no goal (pack: game-design, toy-first.md).
3. **The object-by-action grid, and what is new on day 15.** A grid of objects by actions, six by five to start, where every cell gives a result that looks and sounds different and the wrong use of each object works and is funny. Then one line: on day 15, what can the child do, find or make that they could not on day 1 (pack: game-design, depth-from-combinations.md; pack: game-design, liveliness-from-causing-and-comedy.md).
4. **The representation.** How the school idea appears in the objects, chosen before the game and matching the idea in its physical shape; whether it has a trial behind it or is school practice without one; where the order of object, picture and symbol stops for this band (pack: game-design, representation-before-game.md; pack: game-design, fade-to-school-symbols.md).
5. **The four mechanic questions.** One sentence each (pack: game-design, the-mechanic-is-the-school-skill.md):
   - **Swap.** Could the content be replaced with another subject without changing how the game plays?
   - **Attention.** At the moment of decision, what must the child look at and think about?
   - **Fun.** Is the skill used in the most enjoyable moment of play, or does play stop for it?
   - **Guess.** Can the child succeed by tapping at random or by trying every option?
6. **The error as a consequence.** What a wrong attempt does in the world, where and why it shows, and that the state stays so the child changes one thing and tries again (pack: game-design, errors-show-as-consequences.md).
7. **The designed order, and what is stored.** The order of challenges, one new thing at a time and then combinations; how a harder option looks harder in the world and is chosen by the child; the positions and their stable ids, which name places in the game's own order and never a grade, a groep or a level; and every field of the saved state (pack: game-design, ordered-challenges-high-success.md; pack: game-design, many-short-visits.md; "The hidden position" and "Found as left" below).
8. **The characters and their fixed tastes.** Each character's one visible want and its likes and dislikes that never change, so a child can learn them and test them on purpose. A game with no character says what gives the feedback (pack: game-design, characters-with-opinions.md).
9. **The scenes.** Each short scene: what causes it, its beats, what from the state of play fills it in, and how it gives way to a touch. Then how a cycle ends and how the next one starts (pack: game-design, endings-and-short-scenes.md; "How a cycle restarts" below).
10. **The records.** One heading per jurisdiction, `us-ca` and `nl`, never one list or table that pairs them (pack: education, two-jurisdictions-are-never-equated.md). Under each heading:
    - every record the game is designed from, by pack id or by official code with its jurisdiction, with its standing (and the regime of a Dutch core goal) and its check state as the lookup prints them (pack: education, name-the-records-a-claim-rests-on.md);
    - the level the game is designed from, with the basis the lookup prints: `official`, `derived` or `convention` (pack: education, age-maps-to-levels-through-the-lookup.md);
    - any lane label (`cross-grade`, end-of-primary goals) and any gap, kept as printed;
    - the limits the game takes, each from that record's Limits and never from the examples under "In a child's hands", with anything Limits leaves open marked as the game's own choice (pack: education, limits-come-from-the-limits-section.md).

    After the two headings:
    - which jurisdiction the game follows at each point where the two differ;
    - the claim sentence, in the words of each record's standing: the game is "designed from" the records it names, a foundation is called a foundation, guidance is called guidance, a draft is called a draft not in force, and a claim that rests on a record that is not `confirmed` says so with the reason (pack: education, standing-is-part-of-the-claim.md). It is never an attainment claim: nothing says a child has reached, mastered or is working at a standard, a grade or a level, and no game is described as raising attainment (pack: education, no-attainment-claims.md).

What the records part may hold: pack ids and official codes, the record's standing and check state, and the game's own words for what a record asks. For a California record the record's Summary may be used, since it is the pack's own text. It never holds official California wording, official wording of either jurisdiction, or a web address (pack: education, california-wording-is-never-pasted.md; pack: education, cite-by-id-or-code-never-by-link.md). A game with no learning goal has no records part and claims no school skill; the rest of the sheet still applies.

A wave's plan is held to three of these points before any sheet exists, because a sheet is written from it. It names the records each game's skill rests on, with standing and check state, and names no school skill without one. Every number range in it comes from a record's Limits or is marked as the game's own choice. And no position id it proposes names a grade, a groep or a level: the ids go in `LADDER` in `config.ts`, a free file that no test reads for this, so the plan and the sheet's checker are what hold it.

### The check of the sheet

The sheet is checked once it is written and before the game is built on the toy.

- **The checker did not write the sheet and never builds the game.** A later round's checker is someone other than the writer and every earlier checker. The checker reads the sheet, the pack rules, and the records through the lookup, and never the builder's notes or reasoning. "Passed" is a claim the checker makes, not a default.
- **What is checked.** Every heading is there, in order. The four mechanic questions are answered for the game as designed, and the verb of the game is the skill the records carry. Each record exists, and its standing and check state are as the lookup prints them today. The level, the basis, the lane labels and the gaps are as printed. Each limit is in that record's Limits. No position id names a grade, a groep or a level. Nothing equates the two jurisdictions. The claim uses the words of each standing and makes no attainment claim. No California wording and no web address is in the file.
- **Every finding carries the exact replacement.** The checker writes the sentence that should stand there, the builder pastes it, and the closing check only confirms the paste. A finding that only describes a fault gets a rewrite with a new fault in it.
- **How the check is asked for and answered.** The builder asks by setting `Open: sheet ready for check, round N` in the status block and reporting it (a remote builder pushes, and the pushed block is its report). The lead starts each checker as a fresh agent whose brief is the path of the sheet and this section, and nothing from the builder. The checker writes no file: its findings are its report, which the lead passes to the builder. A builder working alone asks whoever started it for a checker, and may start one itself only as a fresh agent given the same two things.
- **The outcome goes into the status block** of `REFINEMENT.md`, written by the builder from the checker's report: the round, the checker's label, and passed or the findings still open.
- **A pass names the text it judged.** With a pass, the status block also records the commit at the sheet's stage boundary, which holds the sheet as the passing round read it, or a hash of the sheet part of `ART.md` (everything above the art guide). The lead names that commit when it passes the report on. The sheet is edited after its pass in the normal course of work: the look is written below it in the same file, and a limit or a record can change while the game is built. So the lead compares at the merge, and a sheet part that differs from the text that passed is checked again, as a new round.

The check has three outcomes beyond "passed", written as numbered rulings. Every later check starts from this list.

1. **The claim says more than the records carry.** The claim is reworded to what the records carry, with the replacement sentence in the finding. A claim that says less than the records is not a fault.
2. **One jurisdiction has no supporting record.** The sheet says so in one sentence under that jurisdiction's heading and names nothing in its place. The game may rest on the other jurisdiction, and its claim then names that one only.
3. **No supporting record in either jurisdiction.** The game is held: nothing more is built, it keeps its branch and its reserved looks, and the lead lists it first in the next wave's plan, with a changed design or a different skill.

When the same disagreement shows in more than one sheet, the lead decides it once and adds a numbered ruling here: the case, the outcome, the form of the fix, and the near case that is not a fault. A ruling can flag too much, so expect a later ruling that narrows an earlier one. How this converged for the education pack is in [converge a parallel-agent corpus](../workflow-issues/converge-a-parallel-agent-corpus-with-independent-checkers-exact-fixes-lead-rulings-and-hash-bound-verdicts.md).

### How a cycle restarts

One rule for every game with a cycle: **the next customer, patient or vehicle is visible and waiting, and comes in on the child's touch.**

- A finished scene stays as long as the child likes. If the child does nothing, nothing new starts: no automatic next round and no countdown to one.
- The one who waits never complains of being ignored, hurries the child, or refers to the child leaving or coming back.
- On load no scene replays. The world is in the state the last scene ended in, with the next one waiting.
- Open pretend play has no ending and has a calm way to tidy up.

(pack: game-design, endings-and-short-scenes.md; pack: game-design, characters-with-opinions.md; pack: game-design, the-line-between-depth-and-manipulation.md)

### Found as left

Put-away can happen at any instant, and the world is found exactly as it was left (pack: game-design, the-world-keeps-and-waits.md). For the cases that are not obvious:

- **A piece in the hand** is saved where it came from or where it lies. Nothing is saved in the air.
- **A running test** is a view of the saved design and is not saved. A truck crossing a bridge is not in the save; the bridge is.
- **A continuous surface**, such as mud on a truck or lines in sand, is saved as a coarse grid.
- **A scene's outcome** is saved when the scene starts, so a put-away in the middle loses nothing and the scene does not play again on load (`games/kite-tower/controller.ts` is the pattern).
- **Timers inside a cycle** run on attended game time only. Dough does not rise while the game is parked, and no wall clock is read.
- **Size.** A largest legal state serializes under half the 64 KB cap, and a test says so.
- **A first showing of a new idea** is shown once: a stored mark, or derived from the position.

The rest is in [`AGENTS.md`](../../../AGENTS.md): `save()` on every meaningful change, plain versioned JSON, a defensive `deserialize`. The template's `deserialize` repairs field by field and treats a version higher than it knows as unreadable. Nothing wilts, gets dirty or goes hungry while the child is away, and the first thing on return is never a chore, a loss or a remark about the absence.

### The hidden position

A learning game has a designed order, and the game keeps the child's place in it. The rules live in the template's `state.ts`.

- A visit starts at the stored position. A first visit starts at a default set from `ctx.childAge`, with `null` taking the youngest default and the top and bottom defaults open-ended.
- The position moves between cycles only, never inside one, and one step at a time: up after a cycle that goes well, down after one that goes badly, and not at all after one that is mixed. What counts as each is the game's own call, written in the design sheet. A visit put away with no finished cycle leaves it where it was. A next cycle chosen from how the last one went, never the current one, is not a harder round that arrives unasked (pack: game-design, ordered-challenges-high-success.md; pack: game-design, the-line-between-depth-and-manipulation.md).
- A saved position wins over the child's age.
- Nothing shows it: no level number, no label, no map of stages, no sign that the game made things easier. That includes a grown-up corner.
- No clock is read. A long break is handled by the same rule as any miss.
- Positions are stored as stable ids that name a place in the game's own order, never a grade, a groep or a level. An id the game does not know falls back to the default.

A harder option the child can see and pick in the world is a separate thing, and the child may always pick it (pack: game-design, ordered-challenges-high-success.md; pack: education, no-attainment-claims.md).

### Symbols, and the defaults awaiting the owner

The rule is keyed on the first age of the manifest band. The same rule is stated in [`AGENTS.md`](../../../AGENTS.md), [`docs/art-direction.md`](../../art-direction.md) and [wordless clarity](wordless-clarity-for-the-declared-age-band.md):

- A game whose age band starts below 6 shows no word, letter, numeral or symbol on the kid side, optional or not.
- A game whose band starts at 6 or above may show numerals and mathematics symbols, each laid on or beside the quantity it stands for. The symbols are the digits, the signs for plus, minus, times, divide, equals, less than and greater than, the fraction bar, the decimal mark and the percent sign.
- No game shows a letter or a written word at any age.
- The rule follows the manifest band, never the child's age at run time.

Symbols live in one module per game, `games/<key>/symbols.ts`, directly in the game folder. Its drawing functions take numbers or a small typed value (a fraction as two integers) and never a string from the caller. The check holds this: under the numeral exception a text call in `symbols.ts` may draw only numbers it formats itself, number literals, and literals without a letter (inside a template or a sum it may also name a value the file types as a number), and a bare variable, a string parameter, a member access or another call as the text is the finding `numeral-exception-value`. Each text call in the module carries the comment `wordless-ok: numeral <reason>` on the same or the previous line. A game whose band starts below 6 has no `symbols.ts`: the check fails the numeral exception there and names the band. Grown-up text goes in a file named `overlay`, or `perf` in a game whose `perf.ts` is not the template's frozen one, behind the plain `wordless-ok: <reason>` comment. What the check cannot see stays on the reviewer's list in wordless clarity.

The owner has not yet decided the questions below. Each line is the default a builder works under until he answers. They are defaults awaiting his answer, not rules he made, and the PR lists them for him.

- No symbol stands alone, so play never depends on reading one.
- The optional numeral the cue table once allowed at 5 to 6 is withdrawn.
- No letters, including a single letter that says its sound for ages 4 to 6.
- No written words, ages 9 to 12 included. The reading, writing, spelling and word-study records for that age need written words. The spoken-language records (52 of the 107 in the Dutch fase 3 lane) need speech, which waits for the trial on his iPad. So the oldest band has no reading and language game until he decides one of the two.
- No reading on the object (a height, a part count). Better is shown by how the thing looks and behaves.
- No camera shake and no impact pause in the first wave. The response is carried by chains of consequences, sound and squash.
- No game depends on on-device speech until it has been tried on his iPad. Until then creature voices are invented and synthesized.
- The lead picks each game's look by the order in which it reserves the rows, and the owner sees the looks at the toy checkpoint.
- A demo that gets a new verb is built with it, keeping its fantasy and its feel in the hand.

When he answers, the rule files and this list change first, and the games after them.

### Canvas or three.js

The intersection audit reads a live three.js scene and nothing else, so the last check before the owner differs by kind.

**A canvas game** (canvas 2D, SVG, DOM or pixi.js) writes its own model overlap tests. The audit reports it as not audited and exits 0.

- The test plays the real model at 60 fps with seeded input and measures what a child would see cross: every pair of pieces or colliders, each sprite against the shape the model holds for it, and anything thrown or dropped against what it lands on. `games/bad-neighbours/intersections.test.ts` is the model, with a recording 2D context that keeps where each fill lands, and budgets in pixels and milliseconds.
- The scenarios reach every state a child can reach, as an audit's moments do.
- The game's own tests stay inside a time budget: about 30 seconds for `npx vitest run games/<key>` on the builder's machine. A test that plays a long scenario carries an explicit timeout, so a busy machine does not fail it at the default.

**A three.js game** takes the intersection audit to `enforce: true`:

- Name meshes and tag objects before the first run.
- Script moments in `scripts/intersections/games/<key>.ts` that reach every state. That file is the game's own, the one a builder writes outside its folder.
- Fix what is real, and allow what is meant with a reason and an `upTo` cap.
- Replay before and after on the same moments.
- Run `--ci` at least five times, some under CPU load, with the same samples, pieces and findings every time. Then set `enforce: true`.
- Cover what the audit cannot read (shader motion, anything between two samples) with tests on the game's own model.

Both kinds keep the simulation on game time alone, with a fixed step, a seeded random stream nothing else draws from, and a first frame that plays no time. Detail: [run the intersection audit](../workflow-issues/run-the-intersection-audit-before-showing-the-owner.md).

### By age

The cue table in [wordless clarity](wordless-clarity-for-the-declared-age-band.md) has no row below 3, and its row for 7 and up is mostly a default. The pack fills in both ends.

**Ages 2 to 4** (pack: game-design, ages-2-to-4.md).

- Every touch is answered, and there is no dead end: random tapping always produces something, and the simplest use always works.
- Essential targets are about 100 logical pixels across, above the jam's 48 px floor, and well apart. None sits in the bottom strip, where wrists rest.
- Everything essential works with a tap. A drag survives a lifted finger and counts when partly done. No pinch, tilt, shake or double tap.
- One action a toddler already loves, offered again and again. A whole cycle fits in one to three minutes, and quantities stay at about five or fewer.
- No symbol of any kind, and no instruction by voice alone.
- The cue table has no research for two-year-olds: take its 3 to 4 row as the ceiling and cut further.

**Ages 4 to 6** (pack: game-design, ages-4-to-6.md). Pretend play with characters who react; tap, drag and tracing; no reading required. The cue table's rows cover this range.

**Ages 9 to 12** (pack: game-design, ages-9-to-12.md).

- A real system that behaves truly: a kit of physical parts, a small rule language, a model that is true wherever it claims to be science.
- More than one solution. Any working one stands, and a better one is visibly better in the world.
- Help is something the child fetches. The idle ladder shows what can be touched or one possible move, never a solution.
- Failure is large, funny and free, and difficulty comes with a way back in.
- Nothing babyish, no competition, and no stored best.
- Numerals and mathematics symbols may be laid on or beside their quantity when the game's band starts at 6 or above. The child may try a problem first and is then shown a neat way to compare (pack: game-design, guided-discovery.md).

### Building several games at once

The games are built in waves: several games built at the same time by one builder each, merged as one pull request stacked on the one before. The lead is the session that plans the wave, owns every shared file, and makes every commit on the wave's branch.

On 2026-10-02 the owner asked for the games to be built on remote machines, as many in parallel as possible. So a wave has two kinds of builder, and each rule below says which kind it binds.

- **A local builder** works in a worktree on the lead's machine, which the lead can read on disk. It runs no git command that writes, and the lead commits for it.
- **A remote builder** works on another machine or in a cloud environment, where the lead cannot read its worktree. It does its own git, on its own branch only, and the lead sees nothing of its work but what it pushes.

Local builders share one machine, one repository and one stash, so seven is the ceiling for the local builders of a wave. Remote builders are not counted against it. A wave with remote builders is as large as the lead can check, merge and measure, and the owner still plays one wave before the next is built on the same assumptions.

**Setting up.**

- **Both kinds.** Before a builder starts, the lead names the game's key, name, band and emoji, and reserves two or three looks for it in the ledger. The brief carries all of them.
- **Both kinds.** The first wave is cut in two steps, whatever machines it runs on. One canvas game and one three.js game go first, and are built until each has used every copied helper in a running game. The lead folds what they had to change back into the template and raises its version. Then the other builders start from that commit.
- **Local.** The lead makes each worktree, at a path outside the repo, from an explicit base commit: `git worktree add -b <branch> <path> <BASE_SHA>`. The base is never whatever the harness cuts from. The lead then confirms that `git rev-parse HEAD` equals the base and `git status --short` is clean, resets a fresh worktree to the base if it is not, and links `node_modules` from the main checkout. The builder repeats the two read-only checks before anything else and stops if either fails. The lead also gives each local builder a private scratch folder outside the repo and a preview port of its own. Port 4173 stays the lead's.
- **Remote.** The lead pushes the base branch and names one commit on it. The builder works from that commit on its own branch, named for the game as its brief says. Its first act, before any file is written, is the base-commit guard: `git merge --ff-only <BASE_SHA>`, then `git reset --hard <BASE_SHA>` if the fast-forward is refused, then the same two checks (`git rev-parse HEAD` equals the base, `git status --short` is clean). If either check still fails it writes nothing, says so in its report, and stops.
- **The guard is the one exception** to the rule that a builder runs no `reset` and no `merge`. It is run once, at the very start, before any file is written, and only by a builder that does its own git, which in a wave is a remote builder. A local builder never runs it: the lead made its worktree, so it repeats the two read-only checks and stops. The guard and why it is safe on a fresh worktree: [fan out from an explicit base SHA](../workflow-issues/fan-out-parallel-agents-in-worktrees-from-an-explicit-base-sha.md).
- **Remote: the brief is the whole contract.** A remote builder cannot be reached while it runs. Its brief holds this guide; the design sheet's inputs (the idea and its verb, the school skill, the records the wave's plan names, and the demo the game comes from); the key, name, band and emoji; the reserved looks in order; the base commit and the guard; the name of its branch; and what to do when it is blocked, which is to write the block in its status block, push, and stop.

**While building.**

- **Both kinds: every file has one writer.** A builder changes only `games/<key>/` and, for a three.js game, its audit config `scripts/intersections/games/<key>.ts`.
- **Both kinds: shared files are frozen during a wave.** They are `package.json` and the lockfile, `templates/`, `scripts/` other than a game's own audit config, `harness/`, `test/`, the root configs, `AGENTS.md`, `CONCEPTS.md`, `docs/`, and every other game. A builder who needs one changed writes the request in its status block (the file, the change, the reason) and reports it. For a remote builder the pushed status block is the report. The lead makes the change once and brings it to the worktrees that need it. A remote game that needs it gets it between that builder's runs: the lead merges the wave's branch into the game branch and names the new tip in the next brief.
- **Local: no git that writes.** A local builder runs no add, commit, stash, checkout, reset, restore, rebase, merge, clean or push. Read-only git is fine. The lead commits at each stage boundary: the sheet, the toy, the game, the gates. Before each commit the lead reads the game's `ART.md`, and the lead writes every commit message. Those are the two places where California wording could enter with nothing to catch it.
- **Remote: its own git, on its own branch.** A remote builder commits and pushes at each stage boundary: the sheet, the toy, the game, the gates. After the guard its git is add, commit and push on that branch, and a later run starts by checking out that branch at the commit its brief names. It never stashes, rebases, force-pushes, merges, or touches another branch. Its commit messages say what changed and name no tool, no model and no official wording. The pushed branch is public from the first push, so on that branch the rule on California wording is kept by the builder, by hand, in its files and its messages.
- **Remote: a run ends where it must wait.** A remote builder that has written its sheet may build the toy while the check runs (step 3). When the next thing it could do needs an answer it does not have (the sheet's pass, a shared-file change it cannot work without), it is blocked: it writes that in the status block, pushes, and stops. The checker's report, the lead's answers and the owner's come in the brief of its next run, which resumes from the status block.
- **The lead starts the checkers of the sheets** ("The check of the sheet") and passes each checker's report to the builder: in a message to a local builder, in the next brief to a remote one.
- **Both kinds: the status block.** Each `REFINEMENT.md` opens with a status block: the stage reached and what is open (the sheet's check, requests to the lead, findings not yet fixed, the look in use). A fresh agent resumes from that block and the files, with no session to read.
- **Local: never a shared stash.** The stash is shared by every worktree, so one builder's pop takes another's work. Work is set aside with a commit by the lead.
- **Where output goes.** A local builder's screenshots, probe output and audit output go to its scratch folder, and its previews run on its own port with `--strictPort`. A remote builder keeps them in a folder outside the repository and commits none of them.
- **Remote: measuring with no graphics card.** A cloud machine usually renders in software. What a builder measures there follows [measure on a GPU-less cloud VM](../workflow-issues/measure-jam-game-performance-on-a-gpu-less-cloud-vm.md): frame CPU in Chromium under throttle with the top tier pinned, WebKit only as a ratio within one session, the renderer named beside every number, and never an absolute frame rate as a result. Stills and walkthroughs follow [record a deterministic walkthrough on software GL](../workflow-issues/record-a-deterministic-walkthrough-on-software-gl-with-a-paused-clock.md): a clock paused before load and stepped from the first drawn frame, with randomness seeded.

**The owner checkpoint.** There is one per wave, at the end of the toy stage. The lead serves every game's toy on one production build, a remote game's from its pushed branch, puts the looks on one contact sheet beside the claimed looks, and sends both to the owner. Builders whose sheet has passed carry on with the rules meanwhile, which have no renderer, without waiting. A look he rejects is replaced by that game's next reserved candidate before refinement continues. A toy he rejects holds the game.

**Finishing.**

- Frame rates for the pull request are taken by the lead on the merged production build, one game at a time, for local and remote games alike. A number taken while six other builders run is noise, and a frame rate from a machine with no graphics card measures the software renderer; a builder's own numbers only show that a pass did not make things worse.
- The lead merges the branches one by one and runs the gates on the merged tree. A branch that passes alone can still break the merged tree.
- A remote builder's branch is merged into the wave's branch with a squash, under a message the lead writes, so the builder's commit messages never enter the history. Before that merge the lead reads the game's `ART.md`, its comments and its status block for official wording.
- The lead counts what came back. A builder that stopped on a setup fault reports politely and builds nothing.
- A game below the bar at the end of its wave is not merged. It keeps its branch and its reserved look, and it is listed first in the next wave.
- After the merge the lead marks each merged game's look claimed in the ledger and sets its other rows back to open.

A builder working alone follows the same steps and does its own git: it pushes its own branch, and it adds its registry row itself. The check of the sheet still needs someone else, whom it asks for as "The check of the sheet" says.

### The gates

As they stand on 2026-10-02:

- `npm run check`: TypeScript, vitest, the source egress scan, and the wordless check. While iterating, `npx vitest run games/<key>` runs the game's own tests. When another game's test times out locally on a busy machine, run it alone before calling it a failure.
- `npm run build`, then `npm run egress:built` and `npm run education:built`. The last of these fails when a pack record id or an `education` path is in `dist/`.
- The intersection audit at `enforce: true` for a three.js game (`npm run check:intersections -- <key>`), or the game's own overlap tests for a canvas game.
- `compound audit --strict` when `docs/solutions/` changed.

Four rules sit beside the commands:

- A pack id appears only in `ART.md` or in a source comment, never in a string, the manifest or an asset.
- No web address anywhere under `games/`, `ART.md` included. The egress scan reads markdown too.
- No official wording of either jurisdiction under `games/`.
- California wording is never pasted anywhere. The pack's checks read only `education/`, so nothing checks a game's `ART.md`, a source comment, a pull request or a commit message. There the rule is kept by hand: use the record's Summary or your own words.

## Before you show the owner

The first thirteen items are each a mistake that reached the owner: twelve from building Pebble Table, and the intersection-audit item, which the audit passes on the games after it paid for. The five after them are what learning games add.

- [ ] The first screenshot is already in the chosen style at the quality bar, not a placeholder renderer. The 2D first slice was called "ugly" and its renderer was deleted. ([distinct visual style](distinct-visual-style-per-game-shared-quality-bar.md))
- [ ] Style details live in `games/<key>/ART.md`, not in jam-wide docs. The first art-direction doc made claymation the jam's look. ([distinct visual style](distinct-visual-style-per-game-shared-quality-bar.md))
- [ ] With no touch, one thing visibly wants something and faces the child. The owner said "not clear" a second time even with the ladder in place. ([wordless clarity](wordless-clarity-for-the-declared-age-band.md), item 13)
- [ ] The idle guidance ladder is in: glow, then one demonstrated move, backing off. The first slice had none. ([wordless clarity](wordless-clarity-for-the-declared-age-band.md), item 8)
- [ ] The "touch here" cue reads on every surface in the scene. The first glow vanished on the cream rug. ([refinement loop](../workflow-issues/refinement-loop-for-kid-3d-readability.md))
- [ ] The cold playtest proxy has run and its unclear-moment list is short or empty. ([wordless clarity](wordless-clarity-for-the-declared-age-band.md), item 14)
- [ ] No two characters share an animation, and a poke has its own reaction and sound. The first guests differed only by phase offset. ([motion personality](../design-patterns/motion-personality-per-character.md))
- [ ] Every visual change went through a logged pass. Grading before tone mapping turned highlights pink and was caught only by the re-shot. ([refinement loop](../workflow-issues/refinement-loop-for-kid-3d-readability.md))
- [ ] Fps numbers come from a production build through the shared probe, in WebKit, in throttled Chrome, and at four times the pixels, and the lowest tier still looks like the game. Headless Chrome on an M4 said 60 fps while the device lagged. ([measure on the target device](../performance-issues/measure-on-the-target-device-and-ship-adaptive-quality.md))
- [ ] The report says plainly whether a physical iPad was measured. ([measure on the target device](../performance-issues/measure-on-the-target-device-and-ship-adaptive-quality.md))
- [ ] Nothing passes through anything. For a three.js game the [intersection audit](../workflow-issues/run-the-intersection-audit-before-showing-the-owner.md) (`npm run check:intersections -- <key>`) is clean and enforced on moments that reach every state, every allowed contact has a reason and a cap, and what it cannot read has model tests. For a canvas game its own overlap tests do that job. The owner saw pieces going through each other in many games, and Moon Phases' audit was clean while its child could stand inside Earth.
- [ ] The URL you send is `npm run serve:lan` on port 4173, rebuilt after the last change, and the message says which URL is which. The owner judged smoothness on the dev server. ([share a production build](../workflow-issues/share-a-production-build-not-the-dev-server.md))
- [ ] The branch is pushed, CI is green on it, and the PR body is in the Project store, with no key value anywhere. ([agent delivery](../workflow-issues/agent-delivery-push-branches-and-keep-secrets-out.md))
- [ ] The design sheet is complete under its headings in `ART.md`, someone who did not write it has passed it, and its sheet part is still the text that passed. ("The design sheet", "The check of the sheet")
- [ ] The touch is a pleasure with no goal, and it is answered when the finger lands. (pack: game-design, toy-first.md)
- [ ] Put away at any instant and opened again, the game is found as left: no scene replays, and the next customer waits for a touch. ("Found as left", "How a cycle restarts")
- [ ] Every kid-side symbol is in `symbols.ts`, there is none in a band that starts below 6, and none of the defaults awaiting the owner is broken. ("Symbols, and the defaults awaiting the owner")
- [ ] The claim says "designed from", names its records with standing and with check states read again today, and no California wording or web address is in the game, the PR or a commit message. ("The gates")

## Why This Matters

- **One entry point, no duplicate.** The removed skill restated rules the docs also held, so the two could disagree. This page holds the order, the links, and the few rules that had no other home; a fix to a learning reaches every future game without editing a second copy.
- **The order is what the sessions paid for.** Each step sits where its absence caused a rewrite or a second owner complaint: the look before gameplay (the 2D renderer was deleted), the want and the ladder in the first slice ("not clear" twice), motion personalities from the first build (a new module, split geometry, and five passes to retrofit), and adaptive quality from day one (lag hidden by desktop numbers).
- **A toy that is dull stays dull.** The lab's first thirty prototypes were built goal-first and the owner liked none of them. A goal, a story or a look does not make up for a dull action, so the touch is judged alone before anything is built on it.
- **A claim can be checked only when its records are named.** A sheet that names records, standings and check states lets someone who did not write it say whether the claim holds, before weeks of building rest on it.
- **Rules kept in a session are lost with it.** In the education pack's build the checker's brief and the lead's rulings were session notes and had to be reconstructed afterwards. Here they are in the repository, and each wave's checkers start from them.
- **A copied helper drifts.** Each of the thirteen games carried its own copy of the same helpers; several governors shipped wrong, and one differing declaration broke the merged tree. A template with frozen files and one tuning module makes a fix land once.
- **The owner's time is the scarce resource.** Every mistake in "Before you show the owner" reached the owner before it was caught. Checking them first turns owner feedback into taste calls instead of bug reports.
- **Recall scales past memory.** As games and learnings accumulate, `compound find` surfaces the ones that apply to the activity at hand, including learnings this page does not link yet.

## When to Apply

- Starting any new game under `games/`, or turning a lab demo into a jam cartridge.
- Asked to "make a new jam game" or given a game idea by the owner.
- Planning a wave of games, or joining one as a builder or as the checker of a sheet.
- Picking up a half-built game and deciding what to do next: read its status block, then find the first step it has not done.
- Before sending the owner any build of any game: run "Before you show the owner".
- Not for polishing an existing game's look in isolation (go straight to the [refinement loop](../workflow-issues/refinement-loop-for-kid-3d-readability.md)), for porting a finished game into Tada (README "Port a game into Tada"), or for a lab demo, which has its own recipe in `lab/arcade/BUILD.md`.

## Examples

**Step 0, using the recall.** For a fractions game, `compound find "build a new learning game for the jam: a canvas 2D fractions game for ages 9 to 12, turned from a lab demo, designed from the education pack"` returned this on 2026-10-02 (abridged to the first line of each hit, with the middle cut):

```text
compound find: 38 hits (threshold 0.6) over 23 learnings, 36 pack rules, 12 pack candidates
1.00  docs/solutions/conventions/building-a-jam-game.md
1.00  game-design/ages-9-to-12.md  [pack_rule]
1.00  game-design/depth-from-combinations.md  [pack_rule]
1.00  game-design/the-mechanic-is-the-school-skill.md  [pack_rule]
1.00  game-design/fade-to-school-symbols.md  [pack_rule]
1.00  game-design/toy-first.md  [pack_rule]
1.00  game-design/representation-before-game.md  [pack_rule]
1.00  docs/solutions/conventions/wordless-clarity-for-the-declared-age-band.md
1.00  education/name-the-records-a-claim-rests-on.md  [pack_rule]
...
0.97  education/age-maps-to-levels-through-the-lookup.md  [pack_rule]
0.96  docs/solutions/conventions/distinct-visual-style-per-game-shared-quality-bar.md
0.96  education/map-nl-ages-9-to-12.md  [pack_rule]
0.92  education/map-us-ca-ages-9-to-12.md  [pack_rule]
0.84  docs/solutions/workflow-issues/run-the-intersection-audit-before-showing-the-owner.md
0.71  docs/solutions/build-errors/jam-perf-global-declaration-must-match-in-every-game.md
0.67  docs/solutions/test-failures/frame-budget-tests-that-hold-on-a-shared-ci-runner.md
```

Use it by mapping each hit to its step and reading the cited passage there: the mechanic and representation rules feed the design sheet, the two maps say where the lookup starts, the style convention feeds step 4. A learning that maps to no step is one this page has not absorbed yet; read it now and link it here in a later compound run. The recall is not the reading list: this run did not return `two-jurisdictions-are-never-equated.md`, which governs the records part of every sheet, so the packs are still read in full.

**Step 0, the lookup's outline.** `npm run -s education:find -- --jurisdiction nl --age 10 --subject mathematics --outline` prints (the age-mapping paragraph cut short):

```text
# nl, age 10, mathematics
Age mapping: convention. The mapping from groep to age is convention, not law. ...

## fase-2
Sub-band: groep 6: a child turns ten during it.
- fase-2 / mathematics: Fase 2 mathematics, 118 records

## fase-3
Sub-band: groep 7.
- fase-3 / mathematics: Fase 3 mathematics, 187 records

## einde-po (returned beside the levels of this age, labelled end-of-primary goals)
...
- einde-po / mathematics: End of primary school mathematics, 276 records

Outline only. The records of one lane: npm run education:find -- --jurisdiction nl --level <level> --subject <subject>
```

The sheet copies from this answer the basis (`convention`), the levels with their sub-bands, and the label on the `einde-po` lane. The same command with `us-ca` is run on its own, and its answer goes under its own heading.

**The records part of a design sheet, as a skeleton.** Everything in angle brackets is filled from the lookup's answer on the day the sheet is written.

```markdown
## The records

### us-ca

Level: <level>, <sub-band if printed>. Age mapping: <official | derived | convention>, as the lookup prints.
Gap: <the gap line as printed, or "none printed">.

- `<pack id>` (`us-ca <code>`): <standing>, <check state>. <What it asks, in the game's own words or the record's Summary.>
  Limits taken: <range, units, boundary from the record's Limits>. Left open by Limits: <what, and the game's own choice>.
- `<pack id>` [cross-grade]: <standing>, <check state>. <...>

### nl

Level: <level>, <sub-band>. Age mapping: convention.

- `<pack id>` (`nl <code>`): <standing>, <regime if a core goal>, <check state>. <What it asks, in the game's own words.>
  Limits taken: <...>.
- `<pack id>` [end-of-primary goals]: <standing>, <regime>, <check state>. <...>

### Where the two differ

<The difference, written as a difference, and which jurisdiction the game follows at that point.>

### The claim

<Key> is designed from <the us-ca records, in the words of their standing> and from <the nl records, in the words of
their standing>. <For any record that is not confirmed: its state and the reason.>
```

**A status block at the top of `REFINEMENT.md`,** for a game in the middle of its toy stage:

```markdown
## Status

- Stage: toy. Sheet passed in round 2 (checker: wave-1 sheets B), as it stands at commit <sha of the sheet's stage boundary>.
- Look in use: first reserved choice. Spike: screenshot taken, frame rate measured at DPR 2.
- Open: one request to the lead (a registry row for the look); the wrong use of two objects still gives no sound.
```

While the sheet waits for its check, the first line reads `Stage: sheet.` and the last `Open: sheet ready for check, round 1`.
