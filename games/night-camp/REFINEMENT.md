<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: sheet. Round 1 of its check came back open with 20 findings (checker: B), on the sheet whose hash was `b9e2820a…` at commit `c4fd75a`. All 20 replacements are pasted as given; none is disputed.
- The sheet as it now stands is at commit `7fd5c2d`; the hash of its sheet part is `b38c713afa3daf1496f52f2ffa8c60807ad9ba5a7928c0ff6c8b96093d598038`.
- Open: sheet ready for check, round 2
- Rules: pure modules with tests beside them (`ratio.ts`, `world.ts`, `night.ts`, `tastes.ts`, `consequences.ts`, `grid.ts`, `camp.ts`), and `LADDER` and `FIRST_VISIT` in `config.ts`. They were first written against the sheet at `c4fd75a`, at the builder's own risk, and have been brought into line with the sheet at `7fd5c2d`: the sites, the saved state (`last`, `pins`, `cards`, `strips` as stamps, the marks of lights out), the judging, the cook's one want and the poses at dusk, the fetched neat way. A finding of round 2 under the representation, the mechanic questions, the error, the designed order or the records reopens them.
- Look in use: the first reserved row, survey map and field kit. The spike is in (`look.ts`, `terrain.ts`), shown by the Mount at load from a fixed seed, with nothing playable behind it. Adding `night=1` to the address shows the same scene under the night film, for whoever takes the stills. Its frame rate is the lead's to measure.
- For the round 2 checker: four places where the rules had to be more exact than the sheet now says. The sheet part was not edited beyond the 20 pastes. Each line is the sentence the sheet should carry, to rule on.
  1. "What is stored", the row `lanterns`: "| `lanterns` | For each lantern, the pin it stands on and its wick, low or high. |" In the rules a lantern is never put away: it always stands on a pin and burns in the night, so its oil can always run short and "or none" never happens.
  2. "What is stored", the row `strips`: after "each with" read "the card that made it (the setting of the dial it belongs to) and the side that card lay on (halved, single or doubled)". Without the card, two settings stamped under one another cannot be drawn again, and the sheet promises that comparison.
  3. "The designed order", the bullet on variants: "A position met for the first time opens on its first variant; after that a new site takes the next variant in turn, so a return visit is never the same sum." The `ford` row, as pasted, needs its first variant to be the first one met.
  4. "The designed order", the row `summit`: "| `summit` | Nothing new: everything together. | Up to five campers, two lanterns, the kettle and a sled with little room to spare, on a night of seven or eight hours. |" The sentence pasted for finding 9 holds every variant to what the rods can supply fully unfolded, and two lanterns on a rod of 12 flasks allow no night longer than eight hours, so "a long night" is no longer true of it.
- Open, requests to the lead: none that block. The registry row for the look is a request for the pull request.
- Not started: `symbols.ts` (waits for the commit the next message names), the toy, the voices module, the guidance, the scenes, the overlap tests and the frame-budget test.
- Answers handled: `docs/build/answers/night-camp-1.md` on the base branch.
- Base: branch `lane/night-camp` cut from `2a133cc` on `feat/learning-games-build`. This run covers the sheet, the look spike and the rules, and builds no toy.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

One entry a file copied from the template.

- `config.ts`: changed in two places only, as the file intends: `LADDER` holds the game's eight position ids, and `FIRST_VISIT` its two rows. **For the template:** the generated second row of `FIRST_VISIT` starts at the band's oldest age; a game whose second start is at another age has to rewrite the row and keep `OLDEST` in use, or the typecheck fails on an unused name. A comment saying so would save the next builder the round trip.
- `state.ts`: used as copied. `camp.ts` wraps it as its header describes: it calls `deserialize` for the position fields and reads the same raw record again for its own. Nothing was missing.
- `night-camp.tsx` (the Mount): changed in one place, five lines: it imports the look, makes it once, and `draw` paints it and reports its figure count as `drawCalls`. Everything else is as copied. **For the template**, four things the spike met: `draw` can be called while the width and the pixel ratio are still 0 (a surface parked at mount), so a renderer has to guard for it; the backing store is rounded and the scale is not, so a cached layer must round the same way or it blurs; a touch device starts one tier down, so a still taken with touch emulation is not tier 0; and the comments above `draw` still describe a blank surface once a game draws there.
- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`: frozen, untouched.
- `audio.ts`, `input.ts`, `guidance.ts`, `scene.ts`, `overlay.ts`: untouched and not yet used by the game; they come into use with the toy.
- `ART.md`: the outline was filled heading by heading. Nothing was missing.

### For the owner to decide

One line for each thing only the owner can settle.

- **The look**, at the toy checkpoint: survey map and field kit, the first reserved row.
- **The toy**, at the toy checkpoint: pulling a row of supply out along its rod. It is not built in this run.
- **Numerals on the pencilled strip and on the amount cards.** The sheet lays a running total beside each stamp of a card and a numeral beside the pieces and the span on a card. The builder read these as numerals on a quantity the child laid or is given, which the default allows, and not as a reading of how well the child's work did. Nothing reads out how a night went. If the owner reads the running total as a reading, the strip keeps its pieces and loses its numerals.
- **The night can be slid by hand, both ways.** The brief says the night runs only when the child starts it and on attended time. The sheet has the cursor glide on attended time once the child pushes it, and lets the child drag it forwards or back at any moment, since the night is a view of the plan. If the owner wants the night to run one way only, the cursor loses its backward drag.
- **A count the child never sees.** The game counts the nights slid to dawn at a site, and keeps how the judged night ended, to tell a plan worked out from one reached by many tries. Both are stored, never shown, and move only the hidden position. Once a night at a site has gone well, later nights there are not judged, so a night staged to go dark costs nothing.
- **The marshmallow tin** is a pretend object with no supply and no amount: it is there for the raccoons. If the owner finds it a side game, it goes and the grid takes the dog in its place.
- **No note for the grown-up** is written: whether a grown-up corner may hold one is among the defaults awaiting the owner.

## Pass log

One row per pass. The stills are kept outside the repository; none is committed.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1, the look spike | The camp at dusk and under the night film, at 1180 by 820 and a pixel ratio of 2, in headless Chromium on a software renderer; also at 1024 by 768, 1366 by 700 and 820 by 1180, and at a pixel ratio of 1. | "It is a real map with stuff lying on it. I can tell the red things are the ones to pick up. The people are funny from above: one is reading, one is a huge yellow bag. The trees looked like letters. I am not sure what the round thing by the brown tent is." | Five rounds on one theme, the kit must read as apart from the map: kit in red, white, black and steel with hard shadows; figures as flat inks with a key line and no shadow; rods and ruler banded; the night film flat with clean holes. Then the broadleaf symbols were redrawn as solid crowns, since an open ring with a tail read as a letter. Nothing was reverted. | Not measured: no graphics card. About 53 figure draws and about 1 ms of the game's own work a frame on the software renderer, which says only that the painter is cheap. | The unlit lantern from above reads as a burner. The mule and the sled are drawn from the side on a map seen from above. The spare section of the ruler, peeking out at an angle, may read as broken. The dial's notches, the frog and the pieces on the amount cards are small. The flap's edge shadow falls against the kit's light. Nothing moves yet. |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

So far the game is a design sheet, a still scene and its rules. Each line says what is in place and what is not.

- **Alive at idle.** Not yet: the spike is a still. Designed: the campers shift in their bags, the dog's tail, the stream, a moth round the lantern; all stop when unattended.
- **Motion and sound on every touch.** Not yet. Designed in the sheet's toy and grid: every one of the thirty cells has its own result and its own voice id (`grid.ts`, held by a test).
- **Weight, squash and follow-through.** Not yet. Designed: a row settles in a wave, each piece squashing in turn.
- **Kid-clear.** In the spike: five campers told apart from above by hat and bag, few objects, and a hue split that does the work: everything that can be touched is red, white, black or steel on a map that uses no red. The working pieces are single flat colours on plain rods. Not yet judged by the owner.
- **Wordless clarity for the declared age.** No word, letter or numeral is drawn in this run, and the wordless check passes. Where each numeral will lie is listed in the sheet; `symbols.ts` is not started.
- **Wordless guidance.** Not yet: the template's ladder is wired in the Mount and has nothing to show.
- **60 fps on a mid-range iPad.** Not measured. The builder's machine has no graphics card, and the frame rate of the spike is the lead's to take. As drawn: one cached map layer and about fifty figure draws a frame, the pixel ratio capped at 2, no post pass.
- **Procedural or committed assets only.** Everything is drawn at run time from a seeded generator; no asset is committed and the egress checks pass.
- **Its own art direction.** In the spike: a printed survey sheet with contours, hill shading and fold creases, the field kit lying on it, and the night as a flat film with holes of light. No other game in the jam is a map.

No physical iPad was measured, and no frame rate is claimed.

### The learning claim

As the sheet has it at commit `7fd5c2d`, after the pastes of round 1, with each record's standing and check state as the lookup printed them on 2026-10-03. They are to be read again on the day of the pull request.

Night Camp is designed from six California content standards adopted by the State Board of Education (`us-ca 4.OA.3` in part, `4.MD.2`, `5.OA.3` in part, `6.RP.2` in part, `6.RP.3.a` in part, `6.RP.3.b`; each state-board-adopted-standard, confirmed), and, separately, from five statements of guidance by the Dutch curriculum institute on what a school can offer in fase 2 and fase 3 (`nl rw/verh/2/03/fase2`, `rw/verh/2/02/fase2`, `rw/m/8/01/fase2`, `rw/m/8/03/fase3`, `rw/verh/2/07/fase3`; each curriculum-institute-guidance, confirmed), one item of a Dutch legal core goal of the 2026 regime (`nl 10 C e`; legal-core-goal, confirmed) and one statement of the Dutch legal reference level 1F (no printed code, cited by pack id in the sheet; legal-reference-level, confirmed), the last two being end-of-primary goals. What the game is designed for is working out whether a stock lasts. Its first part, whole-number reasoning in several steps with a remainder to interpret, is taken from the California records of grades 4 and 5 alone; no Dutch record is named for it. Its second part, ratio tables and reasoning about an amount for each hour, is taken from `tarn` on from the California grade 6 records and, separately and from the first position on, from the Dutch records named. It measures no child and claims nothing about what a child has reached.

One record was added to the twelve in the brief: `nl rw/verh/2/02/fase2`, because the child builds the ratio table stamp by stamp. None was dropped. Four California records are used in part and the sheet says which part under each.

### Defaults taken for the owner

Each default the game took in the owner's place.

- From the guide: no symbol stands alone; no letter and no written word, a unit abbreviation included; no reading on the object; no camera shake and no impact pause; no speech; the look is the lead's first reserved row.
- From the sheet: the numerals on the strip and the cards are read as quantities laid, not readings; the night can be slid both ways by hand; a hidden count of nights feeds the judgement; every number range is the game's own choice, since no record sets one.

### What the next builder should know

What this build taught that the guide and the template do not say.

- **A test that plays the ladder finds bad numbers before a child does.** `world.test.ts` holds, for every site, that a plan exists that is tight, fits the sled and lies on the rods, that a sled never holds everything at its highest, and that the numbers stay inside the sheet's ranges. The first draft of the sites broke the sheet's own range on the amount cards, and only the range test said so.
- **When rules are written before the check, keep a list of where they had to be more exact than the sheet.** Writing `camp.ts` showed sentences of the sheet that could be read two ways. They go in the status block as exact replacements for the next checker, and the sheet part is left alone while its check runs, so the hash the checker reads still matches.
- **What stays on screen after the plan changes has to be stored.** The first rules kept only the plan and worked the morning out again from it. The first check showed the hole: once the child changes the plan, the pins and the judgement belong to a night that is no longer in the save. Whatever outlives the thing it was computed from needs a field of its own.
- **A range the child can stretch has to be checked at its far end.** The ruler unfolds and the dials turn, so a test now supplies every site with the ruler fully unfolded and every dial at its highest. It cut the nights with two lanterns to eight hours.
- **A night that is a pure function of the plan needs no saved clock.** The cursor's place is the only time there is, so a put-away in the middle of a night loses nothing, the morning is worked out again on load, and the night plays backwards for free.
