<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: toy, built and pushed, and the rules written as pure modules beside it. The run stops here: the owner sees the toy before the game is built on it, and the sheet waits for its check.
- Sheet as pushed for the check: commit `f5f963d`, sha256 of the sheet part `11f75200bb12e675854d59ebb3e8ebf296e0f47c37942c6cacea1d793d955db1` (`awk '/^## The look/{exit} {print}' games/claw-machine/ART.md | sha256sum`). The look was written below it afterwards; the sheet part is unchanged.
- Look in use: Stud bricks, the first and only reserved row. Spike commit `756d9d4`. Stills taken on software GL at 1180 by 820; no frame rate taken here (the lead measures it on a graphics card). At load the Mount shows the toy from a fixed layout: 64 draw calls and about 58,000 triangles.
- Renderer: raw three.js, as the brief suggests. No physics engine: toys click onto fixed places, so the world is a pure model stepped at 120 a second.
- The toy (`toybox.ts`, `claw.ts`, `toyScene.ts`): the claw over a tray of seven toys, no goal, nothing saved. The gobblers stand by, breathe, blink and watch the claw; the claw cannot reach them yet and they take no toys.
- The rules (`toys.ts`, `gobblers.ts`, `order.ts`, `world.ts`, `deeds.ts`, `save.ts`, `tray.ts`, `belly.ts`, with a test beside each) were written while the check runs, at the builder's own risk, against the sheet at commit `f5f963d`. Nothing on screen uses them yet: the Mount still saves the template's state and shows the toy. A finding under the representation, the mechanic questions, the error, the designed order or the records reopens them.
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
- `config.ts`: changed in three places. `BACKDROP` is the cabinet's dark, so no pale flash shows before the first frame. `LADDER` holds the game's nine position ids and exports their type, and `FIRST_VISIT` has a row for each age of the band. **For the template:** `FIRST_VISIT` as generated has two rows (youngest and oldest); a band three years wide wants a middle row, and the comment could say rows may be added.
- `input.ts`: used as copied. **For the template:** a game whose action is the lift itself (here the lift drops the claw) cannot wait for `dragEnd`, which arrives only after the lift grace; it has to act on `dragLift` and remember that it did. The header could say that `dragLift` is the moment of the lift and `dragEnd` the moment the drag is given up.
- `audio.ts`: used as copied (`tone`, `noise`, `GameAudio`). The `tick` voice is no longer used by the game.
- `state.ts`: as copied. `save.ts` wraps it as its header says: it calls `deserialize` for the version, the position and the ending, and reads the same record again for the game's fields. `world.ts` moves the position through `finishCycle` and `beginCycle`. **For the template:** a game whose ending can be told from its own state (here: the tray is clear at the last sort) has to decide whether the saved `finished` flag or the state wins when they disagree; this game lets the state win, so a damaged flag can never leave a finished load with nothing to take.
- `guidance.ts`, `scene.ts`, `overlay.ts`: as copied, not yet used beyond what the Mount already wires.
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

Written as the game is built and kept at the end of this file: the pull request is made from it. At this point the toy and the rules exist; the game is not built on them yet, so several lines say "not yet".

### How the game meets the quality bar

- **Alive at idle.** The gobblers breathe, blink and watch the claw, each at its own pace; the cable sways a hair and the jaws work a little. All of it runs on the attended clock and stops when the game is unattended or hidden.
- **Motion and sound on every touch.** The claw answers when the finger lands (jaws snap open, the trolley sets off, a motor chirp), and every drop ends in a catch, a ring of hops and a ratchet, or in the tray ringing a note. Every voice is synthesized from numbers in `voices.ts`.
- **Weight, squash and follow-through.** The cable swings against the trolley and swings slower under a load; the claw and every toy squash on landing and spring back; a hop is a small throw with a landing.
- **Kid-clear.** Seven big toys in three flat colours on a pale tray, three gobblers on a dark wall, one claw. Places on the tray are about 150 px across at 1180 by 820.
- **Wordless clarity for the declared age.** Nothing on the kid side is a word, letter, numeral or symbol; a category is a gobbler's own body. `npm run wordless:check` passes.
- **Wordless guidance.** Not yet: the idle ladder runs and shows nothing. It comes with the game stage.
- **60 fps on a mid-range iPad.** Not measured here: this machine draws in software. 64 draw calls and about 58,000 triangles at load, no shadow map, no post pass, pixel ratio capped at 2, geometry built once. The lead takes the frame rate on a graphics card. No physical iPad was measured.
- **Procedural or committed assets only.** No asset at all: every shape is built from numbers at load, and there is no texture.
- **Its own art direction.** Stud bricks, written up in `ART.md` under "The look".
- **Nothing passes through anything.** Not yet audited: the audit config is not written. The toy model has tests that no toy is lost, no two stand on the same studs, and the claw rides clear of what stands near.
- **Found as left.** The rules and the saved state hold it (`save.test.ts`); the Mount does not use them yet, and the toy on screen starts from the same layout at every load.

### The learning claim

As the sheet has it (`ART.md`, "The claim"), with the check states read through the lookup on 2026-10-03, all six `confirmed`:

Claw Machine is designed from one California learning foundation for preschool and transitional kindergarten published by the state department (`us-ca 2.5`, Mathematics, Strand 2.0) and from the sorting part only of two California content standards adopted by the State Board of Education (`us-ca K.MD.3` and `us-ca 1.MD.4`); and from three statements of guidance by the Dutch curriculum institute, which are not law and say what can be offered: the fase 1 goal `nl rw/mk/3/01/fase1` and the two content-card statements the sheet cites by pack id. Sorting the same toys a second way rests on `us-ca 2.5` alone. The game counts nothing and says nothing about what any child can do.

The check states have to be read again on the day of the pull request.

### Defaults taken for the owner

- Every default under "Symbols, and the defaults awaiting the owner" in the guide, as written. None is in the game's way.
- The demo's lucky grab is gone and its verb is new (sorting), as the brief says; its swing and its drop are kept.
- The game's own choices where the records leave things open: the three attributes are colour, kind and size; loads are four to nine toys; a sort has two or three groups.
- A swallowed toy is shown small in the belly, and a toy has no face (both are listed for the owner in the status block).

### What the next builder should know

- A stud-brick look needs no texture and no light: colour in the vertices, a camera-fixed shade and highlight, and a seam drawn in the shader from each face's own size (`view/plastic.ts`). The seam is what makes boxes read as bricks.
- Build studs only where no brick sits on them, and measure a build without its studs: then stacked toys seat like real bricks and a stud is never a collision.
- Eyes made of discs read as tubes from a camera above. A ball with a pupil riding on it reads from every angle.
- A group of full-size toys needs as much room as the tray it came from. Either the group is shown small or the gobblers become the size of the tray; decide it before modelling the characters.
- With the camera above and in front, a thing held in the air over the back of the tray overlaps what stands behind the tray on screen. A contact shadow on the tray is what says where it is; keep the ride low and lift only over tall things.
- When the lift is the action, act on `dragLift`, not `dragEnd`.
- Stills on this machine: a paused clock stepped 33 ms at a time from the first drawn frame, with the pre-installed Chromium given by `executablePath`.
