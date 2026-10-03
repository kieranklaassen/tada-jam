<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: sheet. The first run covered the design sheet, the look spike and the rules, and stopped there as its brief says. The second run did one thing: it took in the first check of the sheet. The toy is not built.
- Sheet check, round 1 (checker: B): open, 13 findings, judged on the sheet at commit `27bd83f` (hash `805e0241f142af9fd4b920cb98f590de8ee725438e7aaea8e11834f4d68acbbc`). All 13 replacements are pasted as given; none is disputed.
- Sheet now: commit `bb8808c`, hash of everything above `## The look` `d1f442700d62de7c2979cdd6ba5ee0432ab85b8aa8e86d0dc9f9abce65bc7a09`. Beside the 13 replacements it holds one sentence of the builder's own, under the grid: "Water over a full peel takes a scoop of flour with it, so what is left is wetter." It states a rule the rules already had (`tip` in `stuff.ts`), and round 2 should judge it with the rest.
- Rules brought into line with the checked text: a customer sent back from the hatch waits in the lane as it is, the lane holds three at most and the hatch can stand empty (`sendBack` in `bakery.ts`, the lane of three in `save.ts`); a secret ends as an ending does, with the peel back on the board, empty; the voices in `grid.ts` follow the sounds the grid now names. The two showings of a first visit at `shapes` were already so. The rules as they stand are written against the sheet at `bb8808c`, before its second check, at this builder's own risk.
- Look in use: Linocut print, the first and only row reserved. Spike done at commit `31ee2b3`: the Mount draws the game's real scene at load with a fixed seed, and nothing is playable behind it. It reads clearly in my own stills at 1180 by 820, 1024 by 768 and 820 by 1180 (software renderer, pixel ratio 2, production build). No frame rate was measured: that is the lead's, on a real graphics card. The spike does not yet draw the mole or its basket, which the sheet now describes.
- Open: sheet ready for check, round 2
- Open, request to the lead: a row for Bread Day in the claimed-styles registry of `docs/art-direction.md` (Linocut print, art guide `games/bread-day/ART.md`), once the owner has accepted the look.
- Open, request to the lead: the frame rate of the spike at pixel ratio 2, and how long the one-off printing takes on an iPad (see the template note on `bread-day.tsx`).
- Not yet made, by design of the first run: the toy, the sounds (no voice module yet), the idle guidance for this game, the scenes, motion per character, the model overlap tests and the frame-budget test.
- Next run: read the second checker's report and paste its replacements; take the template commit the lead names; then build the toy (the push into the dough) in this look.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

- `config.ts`: changed in two places only, `LADDER` (the eight position ids) and `FIRST_VISIT` (their two starting ids). The rest is as copied.
- `state.ts`: used as copied and wrapped by `save.ts`, as its header asks. **For the template:** `beginCycle` and `finishCycle` take and return the whole `GameState`, so a game whose world is one larger record has to project it and merge it back (`cycleOf` and `withCycle` in `bakery.ts`). A signature generic over `{ position, finished }` would spare every game that step.
- `bread-day.tsx` (the Mount): changed for the look spike only. It creates the look, calls `look.resize` after the backing store is sized, and `draw` lays the look down and sets `drawn.drawCalls`. The comment above `draw` still describes a blank surface. **For the template:** a canvas look that prints its sprites on resize does all that work inside `resize`, in one blocking step (about 0.65 s here on a software renderer). The Mount has no place to spread such work over frames or to show the first frame early; a canvas game would use one.
- `audio.ts`, `input.ts`, `guidance.ts`, `scene.ts`, `overlay.ts`: as copied, and not yet used by the game's own code.
- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts` (frozen): untouched.
- **For the template:** there is no seeded random stream. This game needed one twice already (the lane in `bakery.ts`, the print in `lookCut.ts`), and every game with a fixed-seed spike will write its own.
- **For the template:** the lower-tier path of the look (the same prints scaled down at a lower pixel ratio) was written but not exercised at run time.

### For the owner to decide

- The look, at the toy checkpoint: Linocut print, as the spike shows it.
- The jar of bubbly. The idea as briefed says warmth makes dough rise; flour and water alone do not rise, so the game adds a jar of live starter, shown and never explained. Without it the model would show a change that is not real.
- The cast: animals who each look like the bread they want, with a badger as the baker, in place of the demo's human family.
- A black, burnt bread is a wanted result (the crow's), reached only by the child's own act of baking again, never by waiting.
- None of the defaults awaiting the owner in the guide needs a different answer for this game.

## Pass log

No pass yet. One row per pass: what was looked at, the critique written as the child, the one themed fix set, what was reverted, the measured frame rate, and what is still weak.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

So far, from the sheet, the rules and the look spike. Nothing here is a measured frame rate, and no physical iPad was measured.

- **Alive at idle.** In the spike the fire flickers, the badger blinks and the dough breathes, on the attended clock only. Customers' routines come with the game.
- **Motion and sound on every touch.** Not built. `grid.ts` already names a motion and a voice for every act on every thing, and a test holds that none is missing.
- **Weight, squash and follow-through.** Not built. The toy is the push into the dough.
- **Kid-clear.** The spike shows few, large shapes: cream dough on a blue peel on a dark bench, two tools, one customer, the baker, the oven.
- **Wordless clarity for the declared age.** No word, letter, numeral or symbol anywhere; no recipe card and no thought bubble. A want is shown by the customer's body and basket. `npm run -s wordless:check` passes.
- **Wordless guidance.** The template's idle ladder is in place and not yet fed by the game.
- **60 fps on a mid-range iPad.** Not measured. The spike lays down twelve cached sprites a frame, with no post pass, and the pixel ratio is capped at 2 by the tier table.
- **Procedural or committed assets only.** Everything is drawn at run time from a fixed seed. `node scripts/egress-check.ts` and `npm run egress:built` pass.
- **Its own art direction.** Linocut print: see "The look" in `ART.md`.

### The learning claim

As the sheet has it. Standings and check states were read through the lookup on 2026-10-03 and must be read again on the day of the pull request.

Bread Day is designed from four of California's preschool and transitional kindergarten learning foundations (foundations published by a state department, not standards; each confirmed), which reach to age five and a half, and from four fase 1 goals of the Dutch curriculum institute (guidance, not law; each confirmed). What it takes from them is this and no more. From both, each in its own records: exploring what materials are like, and finding out what an act does by trying it. From the California foundations alone: seeing that a material has changed after something is done to it, and keeping up to three wants in mind through a task of several steps while the customer goes on showing them. From the Dutch guidance alone: that food is usually prepared before it is eaten, heat as something to discover and wonder about, and putting acts in an order of time by doing them. That dough rises, and why, is in no record of either jurisdiction, and neither are mixing and baking as such: the game shows them as changes a child can see. For a child older than five and a half the game is designed from the Dutch guidance alone, and the parts taken from California alone are then the game's own choice.

The records, by jurisdiction and printed code; their pack ids are in `ART.md` under "The records".

us-ca, each department-published-foundation, confirmed (a foundation's code restarts in every domain, so the scope is given):

- `us-ca 2.3`, Science, Strand 2.0, Physical Science
- `us-ca 2.1`, Science, Strand 2.0, Physical Science
- `us-ca 1.5`, Science, Strand 1.0, Science and Engineering Practices
- `us-ca 2.1`, Approaches to Learning, Strand 2.0, Executive Functioning

nl, each curriculum-institute-guidance, confirmed:

- `nl ojw/pdm/3/02/fase1`
- `nl ojw/nattech/1/01/fase1`
- `nl ojw/nattech/2/02/fase1`
- `nl rw/m/6/04/fase1`

One record the brief named is not used, and the sheet says why: the Dutch goal on working with a simple drawing or manual. The game makes no attainment claim of any kind.

### Defaults taken for the owner

From the guide, each kept as written:

- No symbol, numeral, letter or word on the kid side (the band starts at 4), and no `symbols.ts`.
- No reading on the object: how well a bread came out shows only in how it looks, lands and is eaten.
- No camera shake and no impact pause. A brick's thunk is carried by the peel jumping, the flour hopping and the sound.
- No speech. Every creature voice is invented and synthesized.
- The demo keeps its fantasy and its feel in the hand (kneading dough with a finger), and its verb is kept too, since it was already the skill.

From the game's own sheet:

- The cast is animals, with a badger as the baker. The demo had a human family with no tastes of their own.
- A jar of bubbly starter was added, because flour and water alone do not rise and the model has to be true.
- A bread darkens the moment it goes back into the oven, with no second wait.
- Rising takes 6 attended seconds in the nook and baking 3.5, both in `stuff.ts`. They are a first guess to be tuned on the toy.
- A first visit starts at `dough` under age 6 or with no age, and at `shapes` from 6.

### What the next builder should know

- The rules were written before the toy, as six pure modules: `stuff.ts` (the material), `tastes.ts` (the customers), `bakery.ts` (the world and the cycle), `save.ts` (the saved state), `grid.ts` (the cue for every thing and act) and `consequence.ts` (reactions, and where a mend lies). Each has its test beside it, and none imports a renderer, the DOM or a clock.
- Every act returns `{ bakery, happened }`. The view plays `happened`; it never needs to compare two states to know what to animate.
- Finding the breads the rules can make by running the rules (`reachableBreads`, `canStillBecome`) caught two design faults that reading did not: a full peel could never become batter, and a pair of customers could ask for a bread nothing can make. Both are now held by tests.
- A search over the rules is cheap here (a few milliseconds) only because every number in the model is coarse. Keep rise and bake out of any search key that must stay small.
- A test helper that picks "a bread the customer wants" must leave out the secrets, or the hen is served loose seeds for ever and the order never moves.
