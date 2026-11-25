<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates.
- Look in use: lithographed tin toys (first choice; the fallback was not needed).
- Sheet: checked once by a reader who did not write it, eleven findings, all taken (commit 05aafe92). It changed again after the cold playtest (how a swap passes, what a touch in a scene does, the rim push) and those changes had no second check.
- Open: no child and no iPad has been in front of it. The owner has not seen the look or the toy.

### Template notes

- `input.ts`, `stage.ts`, `rng.ts` and their tests: removed. Seven sitters that are both tapped and carried, a rim that is pushed, and a scene that spends a touch made the touch path the game's own (`play.ts`), with the same slop, grace and regrab distances. **For the template:** a game with its own touch path keeps three files nothing imports.
- `config.ts`, `manifest.ts`, `index.ts`, the Mount: changed as meant. `state.test.ts`: one line, the ladder has one place.
- The rest of the copied files: as copied.
- **For the template:** the Mount's save throttle keeps the last of a burst of changes until the next change or a put-away. This game hands it over 400 ms after the last touch; others may want that.
- **For the audit:** a renderer that draws the same scene with two cameras (a picture painted from the room) is watched by the first one that drew it. The Mount draws the room once before it paints a picture from a save, so the audit watches the child's camera.

### For the owner to decide

- The look and the toy (no toy checkpoint was held; the request was for the whole game).
- The band, 3 to 7.

## Pass log

Frame cost is JavaScript a frame on a machine without a graphics card; absolute frame rates there mean nothing and are not given.

| Pass | Looked at | Critique | Fix set | Frame cost | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | The look spike, 1180×820 | Reads as tin, the fronts and behinds tell apart; the wall shouted | Paler wall, window mirrored always in one place | not measured | Keys read as an 8 |
| 2 | Stills of every act, every side | Curl of the tail read as a 9, keys as an 8, the board's back was blank | Bow-shaped keys, loose curl, the painted lady has a behind too | 142k triangles, down to 93k with six pictures | Far sitters stand behind near ones |
| 3 | Cold playtest by a reader who had seen nothing (15 findings) | Two seen passing through each other in a swap; a first touch in a scene did two things; nothing asked to be touched | Swap passes round the child's side; a touch before the picture is seen only ends the scene; guidance ring and tin hand; rim push | same | Monocle has no cord |
| 4 | Intersection audit, every act | Picture flew through the painter, spun through whoever stood beside it, keys sank in the table, brush in the wall | New flights, spin before growth, smaller keys, wall set back | 58 draw calls in play, CPU p95 2.6 ms | Allowed contacts listed with caps in the audit file |
| 5 | Code review (12 findings) | Winding keys were frozen after the first frame; a head could stay turned; a hop during a table turn snapped; the painter looked at the wrong sitter after a table turn; picture paint cost | All fixed, `game.test.ts` holds five | picture shader: about 100 noise lookups a pixel fewer | |
| 6 | Second cold playtest, by a reader who had seen nothing (12 findings) | Keys came loose from their animals (the same fault as pass 5 found); a stand pulled turned the table; truthful and funny; reload as left | Keys fixed, a stand is part of its sitter | same | Far sitters are hidden by near ones; the giraffe's head covers one hung picture; the board's pairing is found by chance; a carried animal is large; on a slow machine the guidance takes long |

## For the pull request

### How the game meets the quality bar

- **Alive at idle:** sitters breathe, blink, look to the side they want seen; the painter sways, blinks and measures. Parked, nothing moves.
- **Motion and sound on every touch:** the tin gives and clicks as the finger lands; things that do not move answer with paint dots. Synthesized only.
- **Weight:** stand first, body after, loose parts last; springs per character.
- **Kid-clear and wordless:** seven silhouettes; no word, letter, numeral or symbol.
- **Guidance:** ring and tin hand, one act at a time, gone on touch.
- **Frame rate:** 58 draw calls and about 93k triangles at the fullest tier; JavaScript p95 2.6 ms a frame (Chromium, software renderer, DPR 2, no throttle, production build). No physical iPad measured, so 60 fps is not shown.
- **Procedural only, its own look.**

### The learning claim

None. The game has no learning goal and claims no school skill.

### Defaults taken for the owner

- Nothing can be wrong and nothing is counted. Seven pictures replace the oldest.
- On a first visit the elephant stands alone; from age 5 the pig joins it.

### What the next builder should know

- An `InstancedMesh` whose matrices change must say so every frame (`instanceMatrix.needsUpdate`); the frozen keys passed two playtests and an audit because they are right on the first frame.
- A reaction that can be cut short needs one place that lets go of everything it set.

## Pass: the loop, made plain

Told: the loop was not clear to a young child. Likely cause: everything that answered glowed alike, the hand showed a gesture without what it was for, and nobody visibly wanted the next thing. Change: the section of the same name in `ART.md`. Checked by `round.test.ts` and by recording the untouched first visit and reading it frame by frame. Not yet checked: the same child again, and a real iPad.
