<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates. The whole sheet is built.
- Look in use: School wall chart. The art guide is under "The look" in `ART.md`.
- Sheet check: one round by a fresh reader, not passed, 12 findings. All 12 were resolved in the sheet, some in the builder's own words; no second round was run.
- Cold playtest proxy: one fresh reader with nine stills and nothing else. They read the rule from the stills ("he guesses a rule from what I dropped"), named the joke, and listed 14 faults; pass 4 fixes the ones marked there. No child has played it, and the owner has not seen it.
- Open: nobody has heard a sound of the game. They are tested as numbers.
- Open: measured on a machine without a graphics card; no iPad.
- Weak: while the grandmother is in the soup or the bath her dream hangs over her empty chair. In a full pot the piglet is half behind the spotted hat. While he thinks, his bubble covers two things on the shelf for two seconds (a touch still reaches them).

### Template notes

Used as copied except `config.ts`, the Mount, and `scene.ts` and `state.ts`, which this game does not use and were removed: its one scene changes nothing after it starts, and its saved state is in `save.ts`.

### For the owner to decide

The look and the toy, at the first play.

## Pass log

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | first still, an errand | things stand on the soup and not in it; crayon comes in hard steps; the piglet looks sad; the king hides the window | a surface behind and before what floats; fourteen thin layers of grain; a glad mouth is flat on top; window moved | not measured | pets above the rim |
| 2 | eight stills of three ideas | animals perch on the rim; the quilt swallows hats; the dream is small | animals lowered, a higher place in bed, a larger dream | not measured | tidying throws people under the floor |
| 3 | everything, the bell, carrying, 1366×1024, 844×390, twice the pixels | a flight that has not begun goes below the floor; crown knobs cut; boards run out over the grass | flights held at their start; box of the crown; floor cut to the house | Chromium, production build, 1180×820 at DPR 2, tier 0, software GL: CPU p50 3.8 to 4.2 ms and p95 7.7 to 9.2 ms at 6x throttle, 49 sprites | first sight of a sprite costs its painting |
| 4 | cold playtest proxy | a bubble takes the queen's head; a colour is an egg; everything is a small heap; the dream sits on the grandmother's hair; the rope is never hinted; the hint has no end | bubble up by the attic; a splash of paint; a larger heap and plaque; the dream raised; the ghost hand pulls the rope by turns; a glow where the hand goes | not measured again: no cost was added per frame | as in Status |
| 5 | code review by a fresh reader: 15 findings, 1,500 random sessions (none stuck, nothing lost, every save round-trips) | the hand showed the wish; a wish told and met in one frame; what was pulled out came straight back; taking a thing from his hands said nothing; a tier change repainted everything; she laughed in her sleep | all of these fixed with tests, sheet sentences the game does not keep were cut from the sheet (worn poses, each thing's own float, dripping home) | not measured again | a resize repaints the chart at once; the search for the last wishes looks at 3,000 of the third moves |

## For the pull request

### How the game meets the quality bar

- Alive at idle: everyone breathes, blinks and looks about in their own tempo; mouse, pendulum, drips and foam.
- Motion and sound on every touch: squash, a voice for each kind, splash and tint, the butler's gloves and eyes; bare wall knocks.
- Weight and follow-through: springs per kind, swing under the finger, heavy people only tug.
- Clear tappables: flat silhouettes in three colours kept for them, hit targets at least 60 units.
- Wordless: no text; the rule is shown as a picture of the very things. Idle glow at 3 s, ghost hand at 5 s.
- 60 fps: see pass 3 and `frameBudget.test.ts` (nothing painted anew, under 130 sprites in the fullest house). No iPad measured.
- Nothing passes through anything: slots of their own for each thing in each place (`play.test.ts`), layers back to front.
- Procedural only.

### The learning claim

No learning goal.

### Defaults taken for the owner

The order he notices things in (colour, kind, spots, alive), the ten wishes, people too heavy for a child to lift from home.

### What the next builder should know

A round pool of a colour reads as an object. A splash with drops reads as the colour.
