<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: toy, built and pushed. The owner sees it before the game is built on it. The sheet waits for its check.
- Sheet as pushed for the check: commit `f5f963d`, sha256 of the sheet part `11f75200bb12e675854d59ebb3e8ebf296e0f47c37942c6cacea1d793d955db1` (`awk '/^## The look/{exit} {print}' games/claw-machine/ART.md | sha256sum`). The look was written below it afterwards; the sheet part is unchanged.
- Look in use: Stud bricks, the first and only reserved row. Spike commit `756d9d4`. Stills taken on software GL at 1180 by 820; no frame rate taken here (the lead measures it on a graphics card). At load the Mount shows the toy from a fixed layout: 64 draw calls and about 58,000 triangles.
- Renderer: raw three.js, as the brief suggests. No physics engine: toys click onto fixed places, so the world is a pure model stepped at 120 a second.
- The toy (`toybox.ts`, `claw.ts`, `toyScene.ts`): the claw over a tray of seven toys, no goal, nothing saved. The gobblers stand by, breathe, blink and watch the claw; the claw cannot reach them yet and they take no toys.
- Open: sheet ready for check, round 1
- Open: the owner's answer on the look and on the toy.
- Open, not yet built in the toy (each is a cell of the sheet's grid): a big toy on a stack teetering and coming down; the claw swinging into things; the claw waiting above a thing; the bell at the end of the rail is heard but has no brick to see yet. They come with the game stage.
- Open, for the game stage: the intersection audit config (`scripts/intersections/games/claw-machine.ts`) is not written yet; the idle ladder runs but shows nothing; no frame-budget test yet.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Requests to the lead

- `docs/art-direction.md`, section 3: a registry row for Claw Machine when the look is accepted. Style: "Stud bricks 3D: moulded plastic bricks on one stud grid, a seam round every brick, saturated red, blue and yellow toys on a pale studded tray in a green rim, brick bins with frog eyes in a dark cabinet". Art guide: `games/claw-machine/ART.md`.
- The frame rate of the look, on a graphics card, at DPR 2 (tier 0 is pinned with `?tier=0`).
- Loudness of the voices on a real machine: every voice is in `voices.ts` as numbers, with its ranges in `RANGE`.

### Template notes

- `claw-machine.tsx` (the Mount): changed. The stage is created and disposed here, `resize` hands the size to the stage, `draw` draws the toy's picture, gestures go to the toy, and the loop plays the step and the sounds. Everything else is as copied. **For the template:** the Mount sets the canvas size itself in `resize` (`canvas.width = ...`); a three.js game has to replace those two assignments with its renderer's own sizing, and a comment there saying so would save a search.
- `config.ts`: changed in one value, `BACKDROP`, to the cabinet's dark, so no pale flash shows before the first frame. `LADDER` and `FIRST_VISIT` are still the template's placeholders: the game's own order is in `ladder.ts` until the game stage puts its ids here.
- `input.ts`: used as copied. **For the template:** a game whose action is the lift itself (here the lift drops the claw) cannot wait for `dragEnd`, which arrives only after the lift grace; it has to act on `dragLift` and remember that it did. The header could say that `dragLift` is the moment of the lift and `dragEnd` the moment the drag is given up.
- `audio.ts`: used as copied (`tone`, `noise`, `GameAudio`). The `tick` voice is no longer used by the game.
- `state.ts`, `guidance.ts`, `scene.ts`, `overlay.ts`: as copied, not yet used beyond what the Mount already wires.
- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`: frozen, untouched.

### For the owner to decide

- The look: Stud bricks, as the Mount shows it at load.
- The toy: put the claw somewhere and let it drop. Is doing it again and again a pleasure with nothing to achieve?
- A swallowed toy is chewed small and stands behind the belly window at under half its size, so a whole group fits a belly and can be seen as a group. Tipped out, it is full size again. Is that acceptable, or should a group be shown at full size somewhere else?
- A toy has no face: a duck is a brick duck with no eye, so that nothing about a toy varies but its colour, kind and size. Is a duck without an eye still a duck to him?
- The taller crate: when a cycle ends, a second crate offers the next step up, and choosing it never costs a step. It is in the sheet and not built.
- The defaults in the guide ("Symbols, and the defaults awaiting the owner") are taken as written; the game needs none of them changed.

## Pass log

One row per pass. Stills are taken on software GL with a paused clock stepped from the first drawn frame, at 1180 by 820, and kept outside the repository. No frame rate can be taken on this machine.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | The first still of the spike, at rest | "The monsters have tubes for eyes and I can't see their faces. The white ones at the back are a big pile of white. I can't see the toys in the tummies. The bottom is cut off." | Eyes became balls with pupils that ride on them and face the child. The waiting crew stands lower, behind the parapet, in its shade. Bellies got a white lining and a pink floor, and a lower sill. Lamps, bars and the trim cap came off the cabinet. The camera fit was rewritten to hold every key point. | not taken (software GL) | Toys in bellies are small. |
| 2 | The spike again, then the toy in a scripted walkthrough (grab, carry, swing, let go, bonk, stack) | "The duck looks like blocks. The claw is a big dark lump. When I carry a toy it looks like it is at the yellow one's mouth." | The duck got a round head and a narrow bill. The jaws became light steel with green teeth, and the cable pale. The claw rides lower over a bare tray and climbs only over tall things. | not taken (software GL) | A carried toy over the back row still overlaps the gobblers on screen; its shadow on the tray is what says where it is. Little gloss shows on flat brick tops. The waiting crew reads as grey more than white. |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

Nothing yet. One entry for each line of the quality bar, saying how the game meets it so far. Each frame rate comes with the engine, the throttle, the pixel ratio and the build it was measured on, and with whether a physical iPad was measured.

### The learning claim

Nothing yet. The claim as the sheet has it, with each record's standing and its check state read again on the day of the pull request, in the pack's Summary or the game's own words only. A game with no learning goal says so.

### Defaults taken for the owner

Nothing yet. Each default the game took in the owner's place, from the guide or from its own sheet.

### What the next builder should know

Nothing yet. What this build taught that the guide and the template do not say.
