<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: sheet. The design sheet is whole in `ART.md`, written on 2026-10-03 and not yet checked.
- Sheet hash (everything above `## The look`): `805e0241f142af9fd4b920cb98f590de8ee725438e7aaea8e11834f4d68acbbc`.
- Look in use: none yet. The first reserved look is Linocut print; its spike is the next piece of this run.
- Open: sheet ready for check, round 1

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

No entry yet. One entry a file copied from the template, written for the lead and for the games that come after: used as copied, or what was changed and why, and what is wrong or missing that any game would need. Mark a fault or a gap **for the template**. A frozen file is never changed here: a fault in one is a request to the lead.

### For the owner to decide

Nothing yet. One line for each thing only the owner can settle: the look and the toy at the toy checkpoint, a default the game would like changed, and anything the guide does not rule on.

## Pass log

No pass yet. One row per pass: what was looked at, the critique written as the child, the one themed fix set, what was reverted, the measured frame rate, and what is still weak.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

Nothing yet. One entry for each line of the quality bar, saying how the game meets it so far. Each frame rate comes with the engine, the throttle, the pixel ratio and the build it was measured on, and with whether a physical iPad was measured.

### The learning claim

As the sheet has it. Standings and check states were read through the lookup on 2026-10-03 and must be read again on the day of the pull request.

Bread Day is designed from four of California's preschool and transitional kindergarten learning foundations (foundations published by a state department, not standards; each confirmed), which reach to age five and a half, and from four fase 1 goals of the Dutch curriculum institute (guidance, not law; each confirmed). What it takes from them is this and no more: a child does something to a material and sees that it then looks and answers the hand differently; tries an act and finds out what it does; keeps up to three wants in mind through a task of several steps; and decides the order of those steps by doing them. That dough rises, and why, is in no record of either jurisdiction, and neither are mixing and baking as such: the game shows them as changes a child can see. For a child older than five and a half the game is designed from the Dutch guidance alone.

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
