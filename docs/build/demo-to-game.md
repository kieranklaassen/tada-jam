# A demo becomes a game: a builder's brief

On 2026-10-10 the owner chose "Every demo": each demo under `lab/arcade/protos/` that has no game yet is rebuilt as a real jam game, except the five he rated No. The plan is `docs/plans/2026-10-10-2345-feat-every-demo-a-jam-game-plan.md`. This page is the standing brief for the builder of one of those games. It adds no rule of its own: the rules are in `AGENTS.md`, the guide `docs/solutions/conventions/building-a-jam-game.md` and the game-design pack, and where this page is shorter than they are, they decide.

You are a **local builder in a wave**, in the guide's words. Your message names your game's key, name, band, emoji, kind (canvas or three.js), its two reserved looks in order, the paragraph of the plan that is your game, your worktree, your scratch folder, your port and the run you are on.

## What a demo lends

The demo lends its idea, its fantasy and its feel in the hand. It never lends code: nothing is copied or adapted from `lab/` into `games/`, and a game imports nothing from it. Read the demo's folder to feel what the finger does, then close it.

Many demos lean on scores, coins, shops, speed or luck. Your paragraph of the plan says what was taken out and what the verb is now. Build that game. If the paragraph cannot be built as a game a child would choose again, say so in your report with what you would build instead; do not quietly build something else.

These games have no learning goal. The sheet has no records part and claims no school skill, and you do not open `education/`.

## Your worktree

- The lead made your worktree from one base commit and ran the generator in it, so `games/<key>/` holds the untouched template copy. Before anything else run `git rev-parse HEAD` and `git status --short`: the first equals the base commit your message names, and the second shows only `?? games/<key>/`. If either is otherwise, write nothing, say so and stop.
- You change only `games/<key>/` and, for a three.js game, `scripts/intersections/games/<key>.ts`. Everything else is frozen: `harness/`, `templates/`, `scripts/`, `test/`, `docs/`, `lab/`, `package.json`, the root configs, every other game, and the four frozen files of your own folder (`perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`). A change you need in a frozen file is a request to the lead: write it in your status block (the file, the change, the reason) and in your report.
- You run no git command that writes or moves files: no `add`, `commit`, `stash`, `checkout`, `restore`, `reset`, `clean`, `merge`, `rebase` or `push`. `git log`, `git diff`, `git show` and `git status` are fine. The lead commits your game.
- `node_modules` is a link to the lead's. Never install, update or remove a package. A library outside the allowed list in `scripts/egress-check.ts` is a request to the lead and not used.
- Stills, recordings and probe output go to your scratch folder, never into the repository.

## What you may run, in your worktree only

- `npx vitest run games/<key>` as often as you like, and `npx vitest run test/games.test.ts` for the manifest and frozen-file rules.
- `npx tsc --noEmit`, `node scripts/wordless-check.ts`, `node scripts/egress-check.ts`.
- The dev server for your own stills, on your own port and only while you take them: `npx vite --port <port> --strictPort`. Open `http://localhost:<port>/?chrome=0&seed=1#/play/<key>`. Stop it when the stills are taken and before your run ends. Port 4173 is the lead's.
- Stills with Playwright from `node_modules/playwright`, launched with `executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'`, at 1180 by 820. This machine has no graphics card, so three.js renders in software: take three.js stills on a paused clock with the random stream seeded ([record a deterministic walkthrough](../solutions/workflow-issues/record-a-deterministic-walkthrough-on-software-gl-with-a-paused-clock.md)), and never report a frame rate from here as a result ([measure on a GPU-less cloud VM](../solutions/workflow-issues/measure-jam-game-performance-on-a-gpu-less-cloud-vm.md)). Report draw calls and what the frame-budget test counts.
- In run 2 only, once: `npx vite build` and then `npx vite preview --port <port> --strictPort` for the cold playtest proxy, and for a three.js game `npm run check:intersections -- <key>`. Six other builders share this machine's four cores, so do not loop on builds.
- Never: `npm run check`, `npm test`, `npm run build`, `serve:lan`, `perf:jam`, `new:game`, an install. The lead runs the gates on the merged tree.

## Read first

- `AGENTS.md`, `CONCEPTS.md`, and the guide whole. For this brief the parts that matter most are steps 1 to 9, "The template", "The design sheet", "How a cycle restarts", "Found as left", "By age", "Canvas or three.js" and "Before you show the owner".
- `compound-packs/game-design/`: the README and every rule file. They are short.
- `docs/build/pilot-notes.md` and `docs/build/template-notes-v3.md`: what the first games learned about the Mount, scenes, state, canvas and three.js.
- `docs/art-direction.md`: the quality bar, and your reserved rows in the look menu.
- One finished game of your kind, as a worked example of craft and never as a source of code or a look: `games/bad-neighbours/` or `games/monster-pizza/` for canvas, `games/muddy-truck-wash/` or `games/kite-tower/` for three.js.
- The demo: `lab/arcade/protos/<demo>/`, and its entry in `lab/arcade/GENTLE-BRIEFS.md` or `lab/arcade/BRIEFS.md`. For a demo of the gentle set, `lab/arcade/GENTLE.md` is the owner's steer and still holds for the game: real work or real pretend, child-paced, the material shows the mistake, no outside rewards, a whole cycle with an ending, quiet feedback.

## Run 1: the sheet, the look and the toy

1. **The design sheet**, in `games/<key>/ART.md` under the guide's headings, before any game code. Heading 3 is the heart of it for these games: the object-by-action grid in which every cell looks and sounds different and the wrong use of each thing works and is funny, and the honest line for day 15. Headings 4 and 5 (the representation, the four mechanic questions) and heading 10 (the records) each say in one sentence that the game has no learning goal. Every other heading is written in full, including every field of the saved state and what each scene saves when it starts.
2. **The look spike and the toy**, as step 4 of the guide and `docs/build/runs/toy.md` under "What the run covers" have it: the one action the finger performs most, in your first reserved look at the quality bar from the first still, answered when the finger lands, with sound, alive at idle, found as left, paused while unattended. Move to your second look only if the first fails on clarity or on the frame budget, and say why.
3. **A full frame.** The owner turned down four looks of the last wave as too minimal. The frame is a place filled from edge to edge with large characters who are already funny, and the pieces the child works with are the plainest things in it (`docs/build/runs/look.md`, steps 2 to 5). Write down for your still what share of the frame is empty, what in it is funny and what is alive.
4. **Stop.** Set the status block of `REFINEMENT.md` to `Stage: toy` with `Open: sheet ready for check, round 1`, the look in use and where your stills are. Your report is under 40 lines: what the toy is, the stills' paths, the test and typecheck results, your requests to the lead, and what you are unsure of.

## Run 2: the game, the passes and the gates

Your message brings the sheet checker's findings, each with its exact replacement. Paste them, change nothing else above the art guide unless a finding asks, and record the round in the status block.

Then steps 5 to 9 of the guide, as `docs/build/runs/game.md` lists them under "What the run covers": the cycle and how it restarts, every cell of the grid with its own motion and sound, the scenes, found as left, the characters and their fixed tastes, the whole idle ladder, the first-visit default from `ctx.childAge` (never a gate; `null` takes the youngest; both ends open), the frame-budget test, and overlap covered by the intersection audit at `enforce: true` for three.js or by your own model tests for canvas. Then:

- At least three logged passes in `REFINEMENT.md`: still, critique in the child's words, one fix set, still again.
- The cold playtest proxy on your own production build, with the unclear moments listed and fixed.
- One reading by a fresh reader, if you can start a subagent: hand it `docs/build/runs/reader.md` and the path of your folder and nothing else, and fix what comes back. If you cannot start one, say so; the lead has it read.
- The jam draws one round 48 px home control over every game at the top centre, 10 px from the top edge. Nothing a child must tap, drag or read sits under it, and the top right 72 by 72 stays the grown-up corner.
- `ART.md` below the sheet holds the art guide and ends with the text of your registry row for `docs/art-direction.md`, as a request to the lead. `REFINEMENT.md` keeps "For the pull request" current: how each line of the quality bar is met, what was measured and on what, and the defaults awaiting the owner.

**Build what was asked.** The plan's paragraph and your passed sheet define what gets built. Add a mechanism neither asked for, such as a guard, retry, fallback, validation layer, option, mode, abstraction, or support on another interface, only when an existing contract requires it or one of these holds:

- Leaving it out lets harm land before anyone catches it. Trace that the failure can actually happen here; something that notices the failure counts, while an instruction asking a person to avoid it, or to clean up by hand afterward, does not.
- Adding it later would be expensive, because it concerns stored data or its format, a public or shared interface, money, or security.

Give a mechanism that passes its smallest form. One that fails is not built: report it with the task's outcome as considered and not built, with one line on why. When you cannot tell, build it.

Tests prove the behaviour you build: make vague scenarios concrete, and add no scenarios or handling for failure paths, validation or edge cases you did not build.

Your run 2 report is under 60 lines: the stage reached (`gates`, or where you stopped and why); the files of your folder; the results of every check you ran, word for word; the stills' paths; the reader's last line; draw calls or the frame-budget count; your requests to the lead; what is still weak; and one line for each thing only the owner can settle.

## Rules kept by hand

- No web address anywhere under `games/`, `ART.md` included.
- No name of a model, a vendor or a coding tool, no person's name and no key value in any file.
- No word, letter, numeral or sign on the kid side of a game whose band starts below 6. From 6, numerals and mathematics signs only through the game's `symbols.ts`, on or beside the quantity they stand for.
- No official learning-standard wording anywhere.
