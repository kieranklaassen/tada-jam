# The depth and age pass: a builder's brief

The owner asked on 2026-10-10 that every game in the jam be worth playing for a long time and be adapted to the child's age. This page is the standing brief for the builder who takes one game through that pass. The plan behind it is `docs/plans/2026-10-10-2327-feat-one-jam-of-playable-games-plan.md` (R4 to R7, KTD7 to KTD9). It adds no rule of its own: the rules are in `AGENTS.md`, the guide `docs/solutions/conventions/building-a-jam-game.md` and the game-design pack.

Many games will pass the audit as they are. That is a good result. Do not change a game to have something to show.

## What you may touch and run

- You change only `games/<key>/` and, where the game has one, `scripts/intersections/games/<key>.ts`. Nothing else: not `harness/`, `templates/`, `docs/`, `README.md`, `package.json`, another game, or the four frozen files of a template game (`perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`).
- Other builders are working in this same working tree at the same time, each in another game's folder. Every game is loaded eagerly by `harness/games.ts`, so leave your folder compiling at every stop.
- Run only these: `npx vitest run games/<key>` and `npx tsc --noEmit` (read the errors under your own folder; an error in another game's folder is that builder's, leave it). You may also run `node scripts/wordless-check.ts` and `node scripts/egress-check.ts`, which only read.
- Never run: `npm run check`, `npm test`, any build, `serve:lan`, `perf:jam`, `check:intersections`, the dev server, an install, `new:game`, or any git command that writes or moves files (`add`, `commit`, `stash`, `checkout`, `restore`, `reset`, `clean`). `git log`, `git diff` and `git show` are fine. The lead commits your game, builds, and takes the stills.
- A production build is being served by the lead at `http://localhost:4173/` and it does not hold your changes. A still of your game from that build, as it was before the pass, is at the path your message names.
- Never write official California learning-standard wording anywhere, and never put a pack record id or an `education` path in a string that reaches the build (a comment or `ART.md` is the place for a citation).

## Read first

- `AGENTS.md`, then your game's whole folder: `manifest.ts`, the Mount, the rules modules and their tests, `ART.md`, `REFINEMENT.md`.
- In `compound-packs/game-design/`: `depth-from-combinations.md`, `many-short-visits.md`, `the-line-between-depth-and-manipulation.md`, `no-rewards-for-playing.md`, `hidden-never-counted.md`, `the-world-keeps-and-waits.md`, `ordered-challenges-high-success.md`, and the file for your band (`ages-2-to-4.md`, `ages-4-to-6.md`, `ages-9-to-12.md`; a band between or across them reads both neighbours).
- In the guide: "Found as left", "The hidden position", "How a cycle restarts", and the lines on `ctx.childAge` (what it sets as a default, never a gate; `null` takes the youngest default; the top and bottom defaults are open-ended).

## Step 1: the audit, before any change

Answer each of these from the code, with a `file:line` for each claim.

1. **Day 15.** In one line: what can a child do, find or make on day 15 that they could not on day 1? List the game's objects and the actions on them as they exist in the code, and count the cells that give a result that looks and sounds different. "More levels", "more items", "the same again" and random variety are not answers. For a band that starts at 2 or 3, day 15 may look almost like day 1 with the child surer and trying one new thing.
2. **Age.** For every whole year of the manifest band, for an age below it, an age above it and `null`: what does the game do differently on a first visit? Is anything unreachable at some age (a gate)? Does a stored position win over the age on a return visit?
3. **Found as left.** Put away at any instant and opened again: is anything lost, does any scene replay, does anything arrive or happen without the child's touch?
4. **No engagement mechanic.** Any score, count shown to the child, streak, timer that pushes, reward, praise word or sound, or anything that refers to the child leaving or returning.
5. **The home control.** The jam now draws one round 48 px home control over every game at the top centre (10 px from the top edge). Is anything of yours that a child must tap, drag or read under it, at 1180 by 820 and at a narrower window?

## Step 2: the smallest fix set

- **Age defaults: always fix.** Where the first-visit default does not differ across the band and the game has a position to set, set it from `ctx.childAge`, with `null` taking the youngest default and ages outside the band taking the nearest end. Never gate: everything stays reachable at every age.
- **Depth: only from combinations of pieces the game already has.** If the day-15 line has no honest answer, add interactions among the existing objects and characters (a cell of the grid that was empty, a combination that now does something of its own, a character's fixed taste that reacts to the exact thing made), each seen and heard differently, each true every time. Add no new look, no new set of scenes, no new art style, and nothing counted, scored, praised, timed or dangled.
- **If the game would need a redesign to answer day 15, stop.** Say so in your report with what the redesign would be. Do not half-build it. The owner decides.
- **Found-as-left, engagement and home-control findings:** fix them.
- Behaviour you change gets a test first: write or strengthen the test, see it fail, then change the code. Pure rules go in their own module with the test beside it; saved state stays small, versioned and read defensively, and an older save must still load.
- Keep the game's own documents true in the same change: where a rule in the `ART.md` sheet changes, change the sentence; add one row for this pass to the pass log in `REFINEMENT.md` (date 2026-10-10, what the audit found, what changed, what is still weak). Do not rewrite the status block's history.

**Build what was asked.** The plan's units and scope, or the request itself when there is no plan, define what gets built. Add a mechanism neither asked for, such as a guard, retry, fallback, validation layer, option, mode, abstraction, or support on another interface, only when an existing contract requires it or one of these holds:

- Leaving it out lets harm land before anyone catches it. Trace that the failure can actually happen here; something that notices the failure counts, while an instruction asking a person to avoid it, or to clean up by hand afterward, does not.
- Adding it later would be expensive, because it concerns stored data or its format, a public or shared interface, money, or security.

Give a mechanism that passes its smallest form. One that fails is not built: report it with the task's outcome as considered and not built, with one line on why. When you cannot tell, build it.

Tests prove the behaviour you build: make vague scenarios concrete, and add no scenarios or handling for failure paths, validation or edge cases you did not build.

## Your report

Your last message, under 60 lines, in this order. The lead writes the audit table from it, so keep each answer to what was asked.

1. **Verdict:** `holds` (no code change), `age` (age defaults fixed), `depth` (combinations added, with or without age), or `needs redesign`.
2. **Day 15:** the one line, and the count of distinct cells before and after.
3. **Age:** what `childAge` sets across the band, below it, above it and for `null`, after your change.
4. **Found as left, engagement, home control:** held, or what you found and fixed.
5. **Files changed**, every path.
6. **Evidence:** tests added or changed, the failure you saw before the change, and the exact result of `npx vitest run games/<key>`, `npx tsc --noEmit` (errors under your folder), the wordless check and the egress check.
7. **Still weak**, and anything the owner has to decide. Anything you considered and did not build, with one line on why.
