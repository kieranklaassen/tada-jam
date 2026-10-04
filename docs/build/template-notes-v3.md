# What nineteen games said about the template

Nineteen learning games were built from version 2 of `templates/cartridge/`. Each kept template notes in its `REFINEMENT.md`, and many changed their own copies of the helpers and the Mount. This page collects those notes, counts the games behind each, and says what became of it. [`pilot-notes.md`](pilot-notes.md) holds what the two pilots found before version 2.

The count is the games that reported the thing or fixed it in their own copy. A note is a **template change** when three or more games made the same fix or when it is a plain fault, a **per-game matter** when the answer belongs to the game, and **nothing** when the template already says it or no change would help. The changes are made in `templates/cartridge/`; the games keep their own copies as they are.

The games: balloon-pop-parade, boo-boo-vet, bread-day, bridge-crew, chalk-train, claw-machine, fire-truck-hero, fix-it-stall, fruit-slicer, hats-for-all, monster-hotel, monster-pizza, muddy-truck-wash, night-camp, princess-playground, seed-lab, tea-time, who-made-that-sound, wild-hair-salon.

## Template changes, made

| # | The fault or wish | Games | What the template does now |
| --- | --- | --- | --- |
| 1 | The grown-up overlay opened on three quick taps in the corner, which a drumming child makes. | 13 | `overlay.ts`: a finger held a second in the corner and lifted there, then three taps there within three seconds. The hold stays in the corner: a finger that leaves it and comes back has held nothing. `move`, `lift` and `forget` beside `press`. `fps=1` in the address as before. |
| 2 | Every pointer counted towards the overlay, so a palm or three fingers landing together opened it. | 9 | The Mount passes the overlay the working finger alone, which it asks of the tracker (`holds` in `input.ts`). |
| 3 | The corner is in surface pixels and a fitted stage is not, so on a small surface it lies over things that answer. Games tested the corner by hand in the Mount. | 11 | `overlay.ts` exports `inCorner`, and its comment says the gesture keeps a child out, not the scenery. |
| 4 | A game parked in the middle of a drag got a `dragEnd` and took it for a drop: a move the child did not make. | 12 | `input.ts`: `clear()` gives `dragCancel` for a finger still down, and the game puts the thing back. A drag the finger had already let go still ends as `dragEnd`. The Mount's `act` has a case for every gesture, so a game that leaves `dragCancel` out does not compile. |
| 5 | A finger the browser takes away was treated as a lift, and after the grace as a drop. | 10 | `cancel()` gives `dragCancel` at once. |
| 6 | A lifted drag waits 300 ms, and a touch landing near it in that time joins it with no `press`. Quick taps on targets close together were swallowed, and the drop came late. | 11 | `letGo()` ends a lifted drag in the handler of the lift. The header says a drag gives `dragLift` and then `dragEnd`, and that a finger coming back arrives as `dragMove`. |
| 7 | A touch that ends a scene plays every beat that is left, so all its remaining sounds played at once. Each game kept a flag of its own. | 8 | `scene.ts`: `play(progress, finishing)`. A beat that makes a sound stays quiet when `finishing` is true. |
| 8 | The outcome is saved when a scene starts but is seen later, and nothing said the two are kept apart. A scene that only shows something passed an empty save and wondered. | 6 | The header of `scene.ts` says both. |
| 9 | A scene started by a held finger or a rub is ended by that finger's next move. | 2 | A line in the header of `scene.ts`. It was a pilot note already. |
| 10 | `scene.test.ts` wrote out a run of ten numbers counting up, which a reader of the learning claims takes for a possible match. | 1 | The test checks the same thing without the list. Only the template can fix this for the games to come. |
| 11 | A wrapper round `state.ts` could not tell a record that was read from a fresh state, and repeated the test. | 7 | `state.ts` exports `isReadable` and `isRecord`. |
| 12 | `finishCycle` and `beginCycle` were typed for the three template fields, so a larger state had to be merged back by hand. | 3 | Both hand back the type they were given. |
| 13 | The stored `finished` and the wrapper's own fields can disagree, and a wrapper that cannot restore its fields opened on a judged cycle with nothing in it. | 3 | The header of `state.ts` says which wins and what a fresh cycle keeps. |
| 14 | Before the unlock only the newest voice of a touch is kept, so a first touch that sets off two sounds lost the first. | 4 | The header of `audio.ts` says one touch, one voice, and `voiceOf` joins them. |
| 15 | Every game wrote the same bridge from voices kept as numbers to `tone` and `noise`. | 19 | `audio.ts`: a `Note` type and `voiceOf`. The numbers and their range test stay in the game. |
| 16 | All but one game read `seed=` from the address, and seventeen wrote the same seeded stream. | 18 | New `rng.ts`: `makeRng`, `below`, `pick` and `seedOf`. |
| 17 | Canvas games each wrote the same fit of a 1180 by 820 stage into the surface, and its inverse for touches. | 5 | New `stage.ts`: `STAGE`, `fit` and `toStage`. One fit, made from the surface's size in CSS pixels, serves touches and the draw. A three.js game does not need it. |
| 18 | The Mount dropped what `ladder.update` returned, so every game changed that line. | 19 | The Mount keeps it in `playing.guidance` for the draw. |
| 19 | The loop dropped the step `clock.advance` returned, and `draw` had no way to be given it. | 3 | The Mount keeps it in `playing.step`, and sets it to 0 once the frame is drawn. |
| 20 | `resize` sets the canvas size itself, which a three.js game must replace with its renderer's sizing. | 5 | A comment at those two lines. |
| 21 | The Mount did not say what every game then wrote: a draw with no state and no size, where the 2D context comes from, sounds played inside the handler, the wrapper for the saved state, `tick` and its import, and that a `pressEnd` is not a tap. | 9 | Comments at the places they belong. |
| 22 | The generated `FIRST_VISIT` has two rows, the second at the band's oldest age. Games wanted more rows or another age, and one met an unused name. | 9 | The comment in `config.ts` says the rows are the game's to choose, and what to do with `OLDEST`. |
| 23 | Two presses of the ghost hand do harm where a tap counts, turns something over or starts a scene. | 3 | The comment on `TAP_PRESSES` asks for that list and says to set 1. |
| 24 | The sheet outline did not ask what each scene saves when it starts, and the sheet check does. | 3 | `ART.md`, under "The scenes". |

## A template change that was not made

| # | The fault or wish | Games | Why not |
| --- | --- | --- | --- |
| 25 | A stand-in for a 2D context, so a test can count a frame's draws and measure overlaps without a canvas. | 3 | The copies record different things (stamps only, or every fill with its transform), and each is shaped by its game's painters. It needs one design, not one copy taken as it stands. For the lead. |

## Per-game matters, and notes that change nothing

| # | The fault or wish | Games | Judgement |
| --- | --- | --- | --- |
| 26 | A slot whose read fails is taken for an empty one, and a game whose first scene saves at its start writes over it. | 2 | For the lead. The two games fixed it in two ways (write nothing all visit, or nothing until the first touch), and `test/template-mount.test.tsx` holds today's behaviour. |
| 27 | Whether a press in the grown-up's corner reaches the game. | 9 | Per-game: some answer it as bare backdrop, some not at all, one answers every touch. `inCorner` serves all three. |
| 28 | A second finger gets no answer, which one reader took for a fault. | 3 | Nothing. The header of `input.ts` says so since version 2; a game whose sheet promises every touch an answer gives it in its Mount. |
| 29 | No hold: a held finger drifts past the tap slop and becomes a drag. No hold pose for the ghost hand. | 1 | Per-game. |
| 30 | No help in telling a rub from a pull. | 1 | Per-game, until a second game needs it. |
| 31 | A toddler's smeared tap becomes a drag of nothing; the slop is too small below age 4. | 2 | Per-game: the right slop depends on what can be dragged. |
| 32 | A palm that lands first is the working finger, and the finger that draws is ignored. | 1 | Per-game. |
| 33 | A sound that lasts as long as a touch, and a note that warbles. | 2 | Per-game. |
| 34 | `guidance.ts` says little about the game's part: where the hand goes, what `demoIndex` is for, that it returns one object, a check that the hand's tap means what a finger's does. | 5 | Per-game. Five different wishes, each one sentence if the lead wants them in the header. |
| 35 | A three.js game stalls the first time each material is drawn, and nothing handles a lost context. | 3 | Per-game; the first belongs in the pilot notes. |
| 36 | `applyTier` only marks the canvas, so a canvas game passes the tier to its draw by hand. | 1 | Nothing: that is the hook's use. |
| 37 | The ladder ids as a type, so rules keyed by position are checked. | 2 | Per-game: a tuple with its own type works with `state.ts` unchanged. |
| 38 | A rule for a harder option the child picks; a first visit that must save at once; a first frame that opens as a finished cycle does; a place saved by its number outliving the layout. | 3 | Per-game. |
| 39 | Scene wishes of one game each: the first beats are not played by `start`, a beat cannot tell it has begun, chains of "walk there, then do that", a name for what a scene moves, an outcome only known by playing. | 5 | Per-game. |
| 40 | What canvas games learnt about drawing: one full-surface stamp a frame, a band stamped back over figures, shadows that ignore the transform, sprites cut at a few sizes. | 5 | Nothing in the template. They belong in the pilot notes. |
| 41 | The cloud machine: the browser Playwright asks for, the shared probe, stills that need `tier=0`, a save that waits for an idle page. | 7 | Nothing in the template. For the cloud page. |
| 42 | `symbols.ts`: a colon for division in Dutch schools, a minus sign, a fraction fitted to a height. | 2 | For the owner and the lead: the first is a decision, not a fix. |
| 43 | The sheet outline has no place for a first showing; an overlap test needs sizes as drawn. | 1 | Per-game. |
| 44 | Nothing says where authored content tables and their solver tests go. | 1 | Per-game; a line for the guide. |
| 45 | "Under about 80 draw calls" is written for WebGL and needs a canvas reading. | 1 | For the lead: `docs/art-direction.md`. |
| 46 | A shared helper so a model test can use the audit's own measure, and that measure's depth on open meshes. | 1 | For the lead: `scripts/intersections/`. |
| 47 | A game whose changes are single taps saves each at once. | 2 | Nothing: the Mount's comment on the two speeds says it. See the frozen files below. |

## For the lead: the frozen files

Nothing was changed in `perf.ts`, `quality.ts`, `attention.ts` or `saveCadence.ts`.

- `saveCadence.ts`: a change held back by the throttle is written only at the next change or at rest. One game lost a throttled change on a reload (who-made-that-sound). A write when the window ends would need a call from the loop.
- `perf.ts`: under a paused test clock `performance.now()` stands still, so `cpuMs` reads 0 in a stepped walkthrough (muddy-truck-wash).

## What is done, and what is still open

Done with the changes:

- Every file of `templates/cartridge/` is at `v3`, the four frozen files with them, in their first line only. A game's frozen copies are now on an earlier version and wait for `npm run new:game -- --refresh <key>`, which the lead runs.
- `test/template-mount.test.tsx` holds the new wiring: the overlay's gesture through the Mount's own handlers, a second finger that counts for nothing, a hold that is parked, taken away or leaves the corner, and `dragCancel` when the Mount is unmounted under a dragging finger.
- The guide (`docs/solutions/conventions/building-a-jam-game.md`) and [`pilot-notes.md`](pilot-notes.md) describe the new gesture, the two new files and the endings of a press and a drag.
- The nineteen games keep their own copies. None was changed, and none needs the new template to pass.

Still open, each for the lead or the owner:

- The two frozen-file requests above: the throttled change in `saveCadence.ts`, and `cpuMs` under a paused clock in `perf.ts`.
- The stand-in for a 2D context (row 25). It needs one design before it goes into the template.
- The failed slot read (row 26): whether a visit whose slot could not be read writes nothing, or nothing until the first touch.
- A canvas reading of "under about 80 draw calls" in `docs/art-direction.md` (row 45).
- The colon for division in `symbols.ts` (row 42), which is the owner's decision before a game for Dutch children shows division.
