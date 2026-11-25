<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates. The whole sheet is built.
- Look in use: Stained glass and lead. The art guide is under "The look" in `ART.md`.
- Sheet check: one round by a fresh reader, not passed, 12 findings. All 12 were resolved in the sheet, some in the builder's own words; no second round was run.
- Open: nobody has heard a sound of the game. The notes are tested as numbers.
- Open: measured on a machine without a graphics card; no iPad. No child has played it, and the owner has not seen it.
- Weak: on a small phone held sideways those who wait are about 34 px wide. A game is played sideways: upright the shell asks to turn the device.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

Used as copied except `config.ts`, the Mount, `guidance.ts` (glow at 1.5 s and hand at 3 s), and `scene.ts` and `state.ts`, which this game does not use and were removed: its scenes are in `play.ts` and its saved state in `save.ts`.

### For the owner to decide

The look and the toy, at the first play.

## Pass log

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | first stills, a whole round | light of one place leaks into its neighbour; a hole in the middle; the dens are dim | dens stamped live, panes wound one way, petals follow the path | not measured | no reader but the builder |
| 2 | the garden full, the puff, 844×390, twice the pixels | a green wedge at the gate post; who waits looks like a second asker | gate panes; only the one in front glows; glow 1.5 s, hand 3 s | not measured | - |
| 3 | cold playtest proxy: a fresh reader with thirteen stills and nothing else. They read the loop ("move the big figure to the candle, light the apple, carry it out, the neighbour wakes and the window colours") and could not tell whether to drag or to tap (both work) | the ring of carried light looks like a bubble; the white goose is bleached by the flame; target stars hardly seen; the last corner stays navy | soft edge and no ring; the flame's light lies under people; paler stars; the gate's corner turns violet at the end | Chromium, production build, 1180×820, no throttle, software GL, before pass 4: 50.8 fps on average at the lowest tier, CPU p95 13.3 ms | the hand covers the star it points at; the inner snail hides its apple |
| 4 | code review by a fresh reader: 19 findings | a quick pull in and out lit nothing; a light left at the flame came back at the gate; touches in the grown-ups' corner played; sleepers shut their eyes before the breath; all four set an apple the same way | all nineteen answered: fixed with tests, or the sheet corrected (the half second of setting, the first place) | Chromium, production build, 1180×820, no throttle, software GL, scripted play of 42 s: 58.9 fps on average and 52 in the worst second with the quality tiers free (they settle on the lowest, pixel ratio 1), CPU p95 9.6 ms; held at the full tier at pixel ratio 2, 43.7 fps and CPU p95 10.7 ms. About 330 fills a frame and no canvas made anew. No iPad, no WebKit and no graphics card | a small violet sliver at the left edge shows early |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

- Alive at idle: the flame, the crumbs of light on the path, breath and blinks in four tempos, sleepers who breathe in the dark.
- Motion and sound on every touch: a cry and a squash, a murmur and a roll under the glass, a ring and a joke, the flame ducks.
- Weight and follow-through: gaits, catching a candle, setting an apple and the way home are different for each of the four (`motion.test.ts`).
- Clear tappables: people in saturated glass on a blue night; targets held apart in `garden.test.ts`.
- Wordless: no text, numeral or sign. Glow at 1.5 s, ghost hand at 3 s, and one round shown once on a first visit.
- 60 fps: Chromium, production build, 1180×820, no throttle, software GL, scripted play of 42 s: 58.9 fps on average and 52 in the worst second with the quality tiers free (they settle on the lowest, pixel ratio 1), CPU p95 9.6 ms; held at the full tier at pixel ratio 2, 43.7 fps and CPU p95 10.7 ms. About 330 fills a frame and no canvas made anew. No iPad, no WebKit and no graphics card.
- Nothing passes through anything: places, targets and turns of the path are held apart by tests; layers back to front.
- Procedural only.

### The learning claim

No learning goal.

### Defaults taken for the owner

Four carriers, ten places, sixteen sleepers; whoever has set a light goes to the end of the line and the child may call up another; blowing the garden dark is asked for by full cheeks and never happens by itself; nothing follows the calendar.

### What the next builder should know

A pull that has to reach two points in one stroke must remember that the finger was at the first: whoever follows the finger lags, and a test that waits at each point hides it.
