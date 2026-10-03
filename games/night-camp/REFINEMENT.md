<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: sheet. The design sheet is whole at commit `c4fd75a`; the hash of its sheet part is `b9e2820a538bfaf614a2d92c2fa5db7e06270cb23f044466c5b687f59192f452`. It has not been checked yet.
- Open: sheet ready for check, round 1
- Rules: written while the check runs, at the builder's own risk, against the sheet at commit `c4fd75a`. They are pure modules with tests beside them (`ratio.ts`, `world.ts`, `night.ts`, `tastes.ts`, `consequences.ts`, `grid.ts`, `camp.ts`), and `LADDER` and `FIRST_VISIT` in `config.ts`. No toy, no sound and no symbol is built. A finding under the representation, the mechanic questions, the error, the designed order or the records reopens them.
- Look in use: the first reserved row, survey map and field kit. The spike is being built: its terrain module is in, its painter is not committed yet.
- Open, for the next round of the sheet: three places where the rules were written more exactly than the sheet says. Each is the sentence the sheet should carry, for the checker or the lead to rule on; the sheet part is not edited while its check runs.
  1. Under "What is stored", the row `lanterns` should read: "For each lantern, the pin it stands on and its wick, low or high." A lantern is never put away: it always stands on a pin and always burns in the night, so its oil can always run short.
  2. Under "How a cycle is judged", the opening should read: "When the child moves on, from the plan as it stands, if it has been slid to dawn:", and "Mixed" should end "or a plan that has not been slid to dawn since it was last changed." The last night's plan is not stored once the child changes it, so a changed plan is judged mixed and never badly.
  3. Under the grid, the sentence before the table should end: "A supply dropped straight on its own user at dusk is a right use too: it is laid in, one more piece on its rod." This is the log on the fire and the flask on the lantern.
- Open, requests to the lead: none that block. The registry row for the look is a request for the pull request, not for now.
- Not started: `symbols.ts` (waits for the commit the next message names), the toy, the voices module, the guidance, the scenes, the overlap tests and the frame-budget test.
- Base: branch `lane/night-camp` cut from `2a133cc` on `feat/learning-games-build`. This run covers the sheet, the look spike and the rules, and builds no toy.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

One entry a file copied from the template.

- `config.ts`: changed in two places only, as the file intends: `LADDER` holds the game's eight position ids, and `FIRST_VISIT` its two rows. **For the template:** the generated second row of `FIRST_VISIT` starts at the band's oldest age; a game whose second start is at another age has to rewrite the row and keep `OLDEST` in use, or the typecheck fails on an unused name. A comment saying so would save the next builder the round trip.
- `state.ts`: used as copied. `camp.ts` wraps it as its header describes: it calls `deserialize` for the position fields and reads the same raw record again for its own. Nothing was missing.
- `night-camp.tsx` (the Mount): untouched so far. The spike will change it in one place, where the frame is drawn.
- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`: frozen, untouched.
- `audio.ts`, `input.ts`, `guidance.ts`, `scene.ts`, `overlay.ts`: untouched and not yet used by the game; they come into use with the toy.
- `ART.md`: the outline was filled heading by heading. Nothing was missing.

### For the owner to decide

One line for each thing only the owner can settle.

- **The look**, at the toy checkpoint: survey map and field kit, the first reserved row.
- **The toy**, at the toy checkpoint: pulling a row of supply out along its rod. It is not built in this run.
- **Numerals on the pencilled strip and on the amount cards.** The sheet lays a running total beside each stamp of a card and a numeral beside the pieces and the span on a card. The builder read these as numerals on a quantity the child laid or is given, which the default allows, and not as a reading of how well the child's work did. Nothing reads out how a night went. If the owner reads the running total as a reading, the strip keeps its pieces and loses its numerals.
- **The night can be slid by hand, both ways.** The brief says the night runs only when the child starts it and on attended time. The sheet has the cursor glide on attended time once the child pushes it, and lets the child drag it forwards or back at any moment, since the night is a view of the plan. If the owner wants the night to run one way only, the cursor loses its backward drag.
- **A count the child never sees.** The game counts the nights slid to dawn at a site, to tell a plan worked out from one reached by many tries. It is stored, never shown, and moves only the hidden position.
- **The marshmallow tin** is a pretend object with no supply and no amount: it is there for the raccoons. If the owner finds it a side game, it goes and the grid takes the dog in its place.
- **No note for the grown-up** is written: whether a grown-up corner may hold one is among the defaults awaiting the owner.

## Pass log

No pass yet. One row per pass: what was looked at, the critique written as the child, the one themed fix set, what was reverted, the measured frame rate, and what is still weak.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

So far the game is a design sheet, a still scene and its rules. Each line says what is in place and what is not.

- **Alive at idle.** Not yet: the spike is a still. Designed: the campers shift in their bags, the dog's tail, the stream, a moth round the lantern; all stop when unattended.
- **Motion and sound on every touch.** Not yet. Designed in the sheet's toy and grid: every one of the thirty cells has its own result and its own voice id (`grid.ts`, held by a test).
- **Weight, squash and follow-through.** Not yet. Designed: a row settles in a wave, each piece squashing in turn.
- **Kid-clear.** To be said when the spike's still exists.
- **Wordless clarity for the declared age.** No word, letter or numeral is drawn in this run, and the wordless check passes. Where each numeral will lie is listed in the sheet; `symbols.ts` is not started.
- **Wordless guidance.** Not yet: the template's ladder is wired in the Mount and has nothing to show.
- **60 fps on a mid-range iPad.** Not measured. The builder's machine has no graphics card, and the frame rate of the spike is the lead's to take.
- **Procedural or committed assets only.** Everything is drawn at run time from a seeded generator; no asset is committed and the egress checks pass.
- **Its own art direction.** To be said when the spike's still exists.

No physical iPad was measured, and no frame rate is claimed.

### The learning claim

As the sheet has it at commit `c4fd75a`, with each record's standing and check state as the lookup printed them on 2026-10-03. They are to be read again on the day of the pull request.

Night Camp is designed from six California content standards adopted by the State Board of Education (`us-ca 4.OA.3`, `4.MD.2`, `5.OA.3` in part, `6.RP.2`, `6.RP.3.a` in part, `6.RP.3.b`; each state-board-adopted-standard, confirmed), and, separately, from five statements of guidance by the Dutch curriculum institute on what a school can offer in fase 2 and fase 3 (`nl rw/verh/2/03/fase2`, `rw/verh/2/02/fase2`, `rw/m/8/01/fase2`, `rw/m/8/03/fase3`, `rw/verh/2/07/fase3`; each curriculum-institute-guidance, confirmed), one item of a Dutch legal core goal of the 2026 regime (`nl 10 C e`; legal-core-goal, confirmed) and one statement of the Dutch legal reference level 1F (no printed code, cited by pack id in the sheet; legal-reference-level, confirmed), the last two being end-of-primary goals. What the game is designed for is working out whether a stock lasts: whole-number reasoning in several steps first, then ratio tables and reasoning about the amount for one hour. It measures no child and claims nothing about what a child has reached.

One record was added to the twelve in the brief: `nl rw/verh/2/02/fase2`, because the child builds the ratio table stamp by stamp. None was dropped. Two are used in part and the sheet says which part: the game pairs no terms as points and draws no coordinate plane.

### Defaults taken for the owner

Each default the game took in the owner's place.

- From the guide: no symbol stands alone; no letter and no written word, a unit abbreviation included; no reading on the object; no camera shake and no impact pause; no speech; the look is the lead's first reserved row.
- From the sheet: the numerals on the strip and the cards are read as quantities laid, not readings; the night can be slid both ways by hand; a hidden count of nights feeds the judgement; every number range is the game's own choice, since no record sets one.

### What the next builder should know

What this build taught that the guide and the template do not say.

- **A test that plays the ladder finds bad numbers before a child does.** `world.test.ts` holds, for every site, that a plan exists that is tight, fits the sled and lies on the rods, that a sled never holds everything at its highest, and that the numbers stay inside the sheet's ranges. The first draft of the sites broke the sheet's own range on the amount cards, and only the range test said so.
- **When rules are written before the check, keep a list of where they had to be more exact than the sheet.** Writing `camp.ts` showed three sentences of the sheet that could be read two ways. They are in the status block as exact replacements, and the sheet part was left alone while its check ran, so the hash the checker reads still matches.
- **A night that is a pure function of the plan needs no saved clock.** The cursor's place is the only time there is, so a put-away in the middle of a night loses nothing, the morning is worked out again on load, and the night plays backwards for free.
