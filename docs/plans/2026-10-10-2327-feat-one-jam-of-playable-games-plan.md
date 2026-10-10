---
title: One Jam of Playable Games - Plan
type: feat
date: 2026-10-10
topic: one-jam-of-playable-games
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-brainstorm
execution: code
---

# One Jam of Playable Games - Plan

## Goal Capsule

- **Objective:** A family opening the deployed jam finds one page of games in one design, every one opens full screen with no grown-up bar, and every real game is worth coming back to for weeks at the child's age.
- **Product authority:** The owner's request of 2026-10-10, then `AGENTS.md`, the guide `docs/solutions/conventions/building-a-jam-game.md` and the two packs. This plan covers the jam repo only. Bringing the learnings and the pack into Tada is separate work in `kieranklaassen/tada.computer`, running beside this and not in scope here.
- **Means:** The seven games come in by path from their lane branches; the two frames are changed in `harness/` and `lab/arcade/shell/`; the depth and age pass is a wave of builders, one per game, in the one working tree (KTD1, KTD5, KTD7).
- **Stop conditions:** A lane game that cannot pass `npm run check` on `main` without changing a file outside its folder is left out and named in the pull request; the others continue. The run stops if a change would need a file under `education/` or the wording store.
- **Execution profile:** Long-running. U1 comes first; U2 and U3 run beside U4, since they touch different folders.
- **Who finishes:** The lead opens one draft pull request on `claude/project-thread-hhe6of`. The owner merges and deploys.
- **Open blockers:** None. One owner choice is pending on a card (how many demos become real games in this run); the plan is written for its recommended answer and R15 names what the other answers add.

---

## Product Contract

### Summary

The seven games of the cloud wave that are finished on their own branches come into the jam, which makes every demo the owner rated "Build it" a real game. Every real game then gets a depth and age pass against the game-design pack. The home page becomes one page in one design: games and demos are both tiles, both open full screen in the same frame, and the grown-up strips are hidden until a grown-up asks for them. The result builds green and is ready for the owner to deploy.

### Problem Frame

The jam is shown to families as two different things. The 25 games are glossy tiles on a cream page and open under a grey strip of grown-up controls (age, language, park, reset). The 56 demos are folded away in lists under "Demos · not games yet", and open in a different, dark player under its own strip of stars and verdict buttons. A child or a visiting parent sees test equipment on every screen.

Seven finished games never arrived. Balloon Pop Parade, Bridge Crew, Claw Machine, Fire Truck Hero, Fruit Slicer, Hats for All and Wild Hair Salon each reached the gates stage on `lane/<key>` on 2026-10-04 and stayed there, now 136 commits behind `main`.

The games were built at different times under different rules. The thirteen made before the learning wave predate the game-design pack and were never asked the day-15 question. Most games read `ctx.childAge` in one or two places, and nothing has checked what each does with it.

### Key Decisions

- **The seven finished lane games come in now; no other demo is rebuilt as a game in this run.** Recommended on the pending card, not yet answered. Governs R1, R15.
- **A demo stays a demo, and says so quietly.** The lab's code is never copied into `games/` (guide, "A lab demo lends its idea, its verb and its feel, and never its code"), so a demo cannot become a cartridge by being moved. It is shown in the jam's design and marked as a demo. Governs R7, R9.
- **The grown-up controls are hidden, never removed.** They stand in for the Tada shell and builders need them; a deliberate grown-up gesture brings them back. Governs R8, R10.
- **Depth is added through combinations and characters, never through rewards.** (pack: game-design, depth-from-combinations.md; pack: game-design, the-line-between-depth-and-manipulation.md; pack: game-design, no-rewards-for-playing.md) Governs R4.
- **Deploying stays with the owner.** Carried from the cloud wave plan's R14 ("Deploying is the owner's"). Governs R13.

### Requirements

**The seven games**

- R1. Balloon Pop Parade, Bridge Crew, Claw Machine, Fire Truck Hero, Fruit Slicer, Hats for All and Wild Hair Salon are games in the jam, each brought from its lane branch as it was handed over, and each passes the jam's checks on the current `main`.
- R2. Each of the seven has its look registered in the claimed-styles registry and a row in the README games table.
- R3. A lane game whose hand-over names work left for the lead (frame rate on a graphics card, the owner's yes on the look, ears on the voices) carries that list into the pull request as open, never as done.

**Worth playing for weeks, at the child's age**

- R4. Every real game is audited against the game-design pack's depth rules and answers in one line what a child can do, find or make on day 15 that they could not on day 1; a game with no honest answer gets one built from combinations of what it already has.
- R5. Every real game sets a first-visit default from `ctx.childAge` across its whole age band, with `null` taking the youngest default and the top and bottom buckets open-ended, and never gates content by age.
- R6. Every change of R4 and R5 keeps the game's own rules true: found as left, lossless exit, wordless for its band, no engagement mechanic, and its existing tests green.
- R7. The audit's result for each game (the day-15 line, what `childAge` sets, what was changed, what is still weak) is written where the next builder reads it: the game's `REFINEMENT.md` where it has one, otherwise one shared audit table.

**One page, one design**

- R8. A game opened from the home page fills the screen with no grown-up strip, in the deployed build and on the dev server alike.
- R9. Demos are on the home page as tiles in the same design as the games, grouped by what they test, each marked as a demo, and a demo opens full screen in the jam's frame with no rating strip.
- R10. From any game or demo a child can get back to the home page by one obvious wordless act, and a grown-up can bring the controls back by a deliberate gesture a child does not make by accident.
- R11. A demo that has become a real game is no longer listed as a demo, and the five demos the owner rated "No" are not on the home page.
- R12. The rating player stays reachable for the owner from one grown-up link on the home page, unchanged.

**Ready to deploy**

- R13. `npm run check`, the build and both built-asset checks pass on the branch, the lab's and the education pack's own checks pass, and the README says what the deployed jam now shows. Deploying is the owner's act.
- R14. The README games table lists every game in `games/`, including the ten it omits today.

**If the owner picks a larger answer on the card**

- R15. "Seven plus gentle" or "Every demo" adds a later wave under the guide's own path (sheet before code, a toy first, the gates), one builder per game; it changes nothing in R1 to R14 and is planned separately once chosen.

### Acceptance Examples

- AE1. Covers R8, R10. A parent opens the deployed jam on an iPad and taps Monster Pizza: the pizzeria fills the screen and no strip of controls is above it. The child gets home by one visible act.
- AE2. Covers R9, R11. On the home page a demo tile looks like a game tile with a quiet demo mark. Tapping Tiny Island opens it full screen without stars or verdict buttons. Tea Time appears once, as a game.
- AE3. Covers R5. Monster Hotel opened at age 9, at age 12 and with no age set starts at three sensible defaults, and every room of the game is reachable from each.
- AE4. Covers R4, R6. A game audited as having no day-15 answer gains combinations among its existing pieces; it shows no score, count, streak or praise afterwards, and put away mid-scene it is found as left.
- AE5. Covers R1, R3. Fruit Slicer is played from the home page; the pull request lists its frame rate on a real graphics card as not yet measured.

### Scope Boundaries

**In scope:** the seven lane games, the depth and age pass on all real games, the home page and the two frames, the README, a green build.

**Deferred for later**

- Rebuilding further demos as real games (R15).
- Mierennest: its plan and brief were written on 2026-10-10 on `feat/learning-games-build` and its lane is another session's work in progress.
- Frame rates on a real iPad and the owner's ears on the voices; a cloud machine has no graphics card or speakers.
- Deleting old remote branches.

**Outside this work**

- Porting any jam game into Tada as a cartridge.
- Changing the lab's rule that demos share no code with `games/` or `harness/`.

### Dependencies / Assumptions

- The seven lane branches hold the finished games as their status blocks say; this is read from each `REFINEMENT.md`, and the games have not been run on this machine yet.
- "Without the bars" means the grown-up strip above a game and the rating strip above a demo, as seen in screenshots of the production build taken on 2026-10-10.
- "I gave feedback" is read as the ratings in `lab/arcade/RATINGS.json`, the steer recorded in `lab/arcade/GENTLE.md`, and the owner's bar restated in the cloud briefs (lively and funny, deep enough for weeks, a full frame with large funny characters, no rewards).
- The owner's bar for the look (a full frame with large funny characters) is a judgement by eye; a pass here can fill a frame the audit calls bare, and the owner still decides.

### Sources / Research

- `lab/arcade/RATINGS.json`, `lab/arcade/GENTLE.md`, `lab/arcade/README.md`
- `docs/plans/2026-10-02-1842-feat-learning-games-cloud-wave-plan.md`, `docs/build/cloud-briefs/`
- `docs/solutions/conventions/building-a-jam-game.md`
- `harness/GameList.tsx`, `harness/DemoShelf.tsx`, `harness/JamShell.tsx`, `lab/arcade/shell/main.ts`
- (pack: game-design, depth-from-combinations.md), (pack: game-design, many-short-visits.md), (pack: game-design, the-line-between-depth-and-manipulation.md), (pack: game-design, no-rewards-for-playing.md), (pack: game-design, a-full-frame-with-large-funny-characters.md), (pack: game-design, ages-2-to-4.md), (pack: game-design, ages-4-to-6.md), (pack: game-design, ages-9-to-12.md)

---

## Planning Contract

### Key Technical Decisions

- KTD1. **A lane game comes in by path, as one commit.** `git checkout origin/lane/<key> -- games/<key>` and, where the lane has one, `scripts/intersections/games/<key>.ts`; nothing else of the lane is taken. The lanes are 136 commits behind `main` and carry merged base history, and by the wave's R1 a lane owns only those paths. This is how the twelve merged games arrived (`6444b82` for Tea Time). Rejected: merging or rebasing the lane, which drags in old copies of `templates/` and `test/`.
- KTD2. **Lane games stay on template version 2.** The twelve merged games are on version 2 and `test/games.test.ts` allows an earlier version; `--refresh` is not run in this work.
- KTD3. **The strip is off unless asked for.** The shell shows the grown-up strip only with `chrome=1` in the address or after the grown-up gesture of KTD4. `chrome=0` keeps working, so `scripts/jam-perf.mjs`, `scripts/jam-intersections.mjs` and shared links are unchanged.
- KTD4. **One corner control, two acts.** A wordless home control of at least 48 px sits over the surface: a tap goes home (the slot is flushed first), a hold of one second with the finger staying on it shows the grown-up strip. It replaces the corner dot. It is placed and tested so it covers neither grown-up gesture a game already owns: the template overlay's hold in the top right corner and Pebble Table's triple tap in the top left.
- KTD5. **A demo plays in the jam's frame through a frame element.** A route `#/demo/<key>` shows the lab player at `lab/arcade/index.html?chrome=0#/play/<key>` full bleed under the same corner control; the hold there leads to the rating player for that demo. No code is shared, so `lab/kit/isolation.test.ts` and the jam's own isolation hold. Rejected: importing demos into `harness/`, which breaks the boundary `AGENTS.md` sets.
- KTD6. **The lab's catalog says what a demo became and how it was rated.** `lab/arcade/catalog.ts` gains an optional `game` key on a demo (the jam game it became, for renamed ones such as `campfire-nights` to `night-camp`), and the catalog file the lab build writes carries each demo's verdict from `RATINGS.json`. The home page hides a demo whose key or `game` is a jam game, and one whose verdict is "no". The home page reads data only.
- KTD7. **The depth and age pass is a wave in one working tree.** One builder per game, at most six at once on this four-core machine. A builder changes only `games/<key>/` (and its `scripts/intersections/games/<key>.ts`), runs no git command that writes, and reports; the lead commits each game. This is the guide's rule for a builder whose worktree the lead can read.
- KTD8. **The pass is bounded.** A builder first writes the audit (day-15 line, what `childAge` sets across the band and for `null`, found-as-left held or not). It then makes the smallest fix set: age defaults always; depth only from combinations of pieces the game already has, with a model test for each new cell. It adds no new look, scene set, score, count or reward. A game that would need a redesign to answer day 15 is recorded as such for the owner and is not half-built.
- KTD9. **One audit table.** `docs/build/depth-and-age-audit.md` holds one row per game, written by the lead from the builders' reports. A game with a `REFINEMENT.md` also gets a pass row there, and a game whose rules change keeps its `ART.md` sheet true in the same change. A sheet edited after its last independent check is listed in the pull request.

### Assumptions

- The checks that need the education wording store (`education:gate`, `education:overlap`, `education:reuse-history`) cannot run here; this work changes nothing under `education/` and pastes no official wording, so the rule is kept by hand.
- Frame rates read on this machine come from software rendering and are reported as such, never as the iPad figure.

### Sequencing

U1, then U2, U3 and U4 together, then U5. U4 runs in batches; the lead builds and runs the whole check between batches.

---

## Implementation Units

### U1. Bring in the seven finished games

- **Goal:** R1, R2, R3.
- **Files:** `games/<key>/` and `scripts/intersections/games/<key>.ts` for `balloon-pop-parade`, `bridge-crew`, `claw-machine`, `fire-truck-hero`, `fruit-slicer`, `hats-for-all`, `wild-hair-salon`; `docs/art-direction.md`; `README.md`.
- **Approach:** KTD1 per game, one `feat(games)` commit each in the style of `6444b82`. Run that game's tests, the wordless and egress checks, and `test/games.test.ts`. Fix what `main` has changed under it inside the game's folder only. Then one docs commit: the reserved row of each look becomes claimed with a link to the game's `ART.md`, and each game gets a README row. Copy the "left for the lead" list from each status block for the pull request.
- **Test scenarios:** each game's own suite passes; `test/games.test.ts` passes with 32 games; the build opens each game from `#/play/<key>` without a console error.
- **Dependencies:** none.

### U2. Games open without the strip

- **Goal:** R8, R10. Covers AE1.
- **Files:** `harness/JamShell.tsx`, `harness/harness.css`, `harness/JamShell.test.tsx`, `README.md`.
- **Approach:** KTD3 and KTD4. The corner control is a small component the demo frame of U3 reuses.
- **Test scenarios:** no strip by default; strip with `chrome=1`; tap goes home and flushes storage; a hold of one second shows the strip and a shorter press does not; a finger that leaves the control during the hold cancels it; `chrome=0` behaves as before.
- **Dependencies:** none.

### U3. Demos as tiles, played in the jam's frame

- **Goal:** R9, R11, R12. Covers AE2.
- **Files:** `harness/DemoShelf.tsx`, `harness/demos.ts`, `harness/demos.test.ts`, `harness/GameList.tsx`, `harness/home.css`, `harness/main.tsx`, a new `harness/DemoFrame.tsx`, `lab/arcade/catalog.ts`, the lab's catalog writer, `lab/arcade/shell/main.ts` and `arcade.css`, `lab/arcade/README.md`.
- **Approach:** KTD5 and KTD6. Demo tiles use the game tile's markup and styles, with the catalog emoji, the ages and a quiet "demo" mark; groups are shown open under their titles, below the games. "Surprise me" still picks among games. With `chrome=0` the lab player fills its window on a letterbox colour that matches the jam frame and shows no list link. One grown-up link at the foot of the page leads to the rating player.
- **Test scenarios:** the catalog parser keeps `game` and verdict and still drops malformed entries; a demo whose key is a game is hidden; a demo with `game: 'night-camp'` is hidden; a "no" verdict is hidden; an unknown demo key on `#/demo/<key>` falls back to home; with no catalog file (the dev server) the page shows games only.
- **Dependencies:** U2 for the corner control.

### U4. Depth and age pass on every game

- **Goal:** R4, R5, R6, R7. Covers AE3, AE4.
- **Files:** `games/<key>/` for all 32 games; `docs/build/depth-and-age-audit.md`.
- **Approach:** KTD7, KTD8, KTD9. Each builder's brief names its game, the pack rules to read (depth-from-combinations.md, many-short-visits.md, the-line-between-depth-and-manipulation.md, no-rewards-for-playing.md and the file for its age range), the guide's "Found as left" and "The hidden position", and the bound of KTD8. Its report gives the audit, what changed, what it ran, and what is still weak.
- **Test scenarios:** per game, a test that the first-visit default differs across the band where the game has a position to set, that `null` gives the youngest default, and that no content is unreachable at any age; a model test per new combination; the game's existing suite, the wordless check and the egress check pass.
- **Dependencies:** U1.

### U5. Say what the jam is now, and prove it builds

- **Goal:** R13, R14.
- **Files:** `README.md`, `AGENTS.md` and `CLAUDE.md` where they describe the strip or the demo shelf, `lab/arcade/README.md`.
- **Approach:** The README table lists all 32 games; the "Run it" and "Deploy" sections describe the corner control and the demo tiles. Then the whole Verification Contract.
- **Dependencies:** U1 to U4.

---

## Verification Contract

- `npm run check` (TypeScript, vitest, source egress scan, wordless check).
- `npm run build`, then `npm run egress:built` and `npm run education:built`.
- `npm run lab:check`; `npm run education:check`; `npm run education:tree`.
- `npm run check:intersections -- <key>` for each three.js game that U1 brought in or U4 changed, when a browser can be launched here; otherwise CI's four shards decide.
- Stills of the production build at 1180 by 820: the home page, one game, one demo; and each game U4 changed, before and after.
- CI green on the pushed branch, the compound docs audit included.

## Definition of Done

- All 32 games are on the home page and open full screen with no strip; every demo still listed opens the same way.
- Every game has a row in `docs/build/depth-and-age-audit.md`, and every code change of the pass has a test.
- The Verification Contract passes, or each line that could not run here is named in the pull request with the reason.
- The pull request lists what stays open for the owner: the look of each lane game, frame rates on a real graphics card, the voices, sheets edited after their last check, and any game recorded as needing a redesign.
