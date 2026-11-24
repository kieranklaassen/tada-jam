<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates. Built, refined in the passes below, and in review in its pull request.
- Sheet: check round 1 (a reader who did not write it) returned five findings, pasted word for word. Round 2 was confirmed from the diff, which held only those replacements.
- Look in use: the first reserved row, sponge-stippled flat poster. The second row was not tried.
- Open: the owner has not seen the toy or the game; nobody has listened to the sounds; no physical iPad was measured.

### Template notes

- `state.ts`: replaced. The game has no position and no finish; the save is the room it settles to. `state.test.ts` went with it.
- `config.ts`: `LADDER` and `FIRST_VISIT` went; tiers set `dpr` and `dabs`. `TAP_PRESSES` is 1, since a second tap takes the blanket off again.
- The Mount: the template's, with the gestures moved behind `Play` so that tests use the same path.
- Frozen files and the rest: used as copied. `scene.ts` is not used, since a dash blocks nothing.

### For the owner to decide

- The look and the toy.
- Whether a dropped blanket should always go on at the first touch, or only at the lift (now at the touch, as the toy asks).

## Pass log

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | first frame, a cover, a dash to the dish | Fan and pipe cross; the sausage lies over the spout, not in it; feet hidden | fan to the other hand, a wide spout, a seat for the rocking chair | not measured | divers |
| 2 | four covered, the bell, four at one boot | Four boots for one boot, and two divers gone | one loose prop, worn by the first to come up; divers drawn in their place | not measured | heads cut off by a straight line |
| 3 | divers at all five places | Cut heads look cut; whoever is up a wall is behind the chairs; a cat's tail behind the armchair | in up to the neck, with the neck at the mouth; hunters up a wall stand in front; the tail to the free side | not measured | a run through the air |
| 4 | runs to high places and home | They run on nothing, and a finger finds them where they are not | `footing`: on the floor, then a leap, one function for drawing and touch | 58 fps in software Chrome, DPR up to 2 | first want |
| 5 | cold playtest proxy, about 65 actions as a child of 3 and of 6 | Everyone fooled at once is a dead end; a blanket on a runner pops it home; the aunt is cut off at the edge; the basket hardly answers; no hint of the bell | the sausage looks out by itself and is what the hand shows; a walk home is never under 0.6 s; hunters keep off the edges; a bigger hop; the bell is shown once two are covered | see below | a pile of four is hard to read; a blanket hides what its owner believes, which is the trick and is not shown |

## For the pull request

### How the game meets the quality bar

- **Alive at idle:** four breaths, four blinks, a tail, a fan, a rocking chair, a fish that faces the sausage.
- **Motion and sound on every touch:** held by `play.test.ts` and `view.test.ts`; a touch on the bare room puffs, sounds and turns every pair of eyes.
- **Weight and follow-through:** a blanket opens as it falls; whoever is touched squashes and rings down; hair stands on end.
- **Silhouettes:** four shapes nobody could swap; targets 96 units or more.
- **Wordless clarity:** no words, letters, numerals or signs; the eyes are the readout.
- **Guidance:** one next act from the room, shown by a halo and a hand.
- **Frame rate:** 58 fps over 41 s in throttle-1 headless Chrome with software drawing, auto quality (tier 2, DPR 1.25), own work 0.7 ms at the 95th percentile. No physical iPad and no WebKit measured.
- **Draw count:** 68 stamps at the most in the tests, capped at 80; the eyes, mouths and blanket outlines are live fills on top.
- **Assets:** all drawn in code; sounds are numbers.

### The learning claim

None. The game has no learning goal and cites no record.

### Defaults taken for the owner

- Four characters and five places, and no more to come.
- A fresh sausage waits for a touch; it never comes down by itself.
- `childAge` sets nothing.

### What the next builder should know

Draw and touch a moving character from one function. The rules here move in straight lines; the drawing lifted them to the floor, and for one pass a finger missed them.
