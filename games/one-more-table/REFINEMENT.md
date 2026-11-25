<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates.
- Look in use: Folk-painted panel, the first of the two looks given to the game. The second was not needed.
- The sheet: checked one round by someone who did not write it. Its five findings are in the sheet. Corrected after the build where it said something the game does not do (no forks are lifted, a guest dropped on a head lands with its own plop, the feast is as long as the table).
- Plan review: the check of the sheet, which holds the same decisions, took its place.
- Open: nobody has heard the sounds, nobody has held it on an iPad and no child has played it.

### Template notes

- `state.ts`, `scene.ts` and `input.ts` replaced by `save.ts`, `table.ts` and `play.ts`. `config.ts`: the designed order and the ladder removed (the ladder is in `guidance.ts`, with the quicker times the project asks for now: glow at 1.5 s, hand at 3 s). `stage.ts` exports its own point type. The four frozen files are untouched.

### For the owner to decide

- The look and the toy, by playing it.
- The sounds: every one is set by numbers on a machine with no speaker.

## Pass log

Frame cost is counted, not timed: there is no graphics hardware where this was built, so no frame rate here says anything about a tablet.

| Pass | Looked at | Critique | Fix set | Frame cost | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | Spike at 1180 by 820: two at the table, the baby waiting | "The baby is cross. The plates cover their mouths. The light on the paint spills out." | Baby's brow removed; short ones taller and dishes lower; the loaded edge of a stroke stays inside it | about 110 pieces | Wall bare |
| 2 | The house full, every length of the table, squash, feast, home | "It never goes out of the window. The house goes on for ever. Mice are in the grass." | Walls moved so that the cow stands at the window and the bear and moose in the garden; grass ends at the house; mice and cuckoo moved; birds and clouds in the sky; the chimney comes out of the roof | 237 at the fullest | See below |
| 3 | The whole loop on the production build, and the rules played in tests | A pull that had sent everyone home could ring the bell when it let go; at two lengths the bell stood half a unit off the frame | Only a finger that took the bell rings it; more room at the sides; the candle's flat disc is gone; a small one at the door holds its dish beside the knob | 237 at the fullest, budget 260 | The house is small at the full table |
| 4 | The cold playtest proxy on the production build: fresh sessions by someone who had read nothing | Two high, one cause: with the table full the ladder never started, so nothing led to the bell or home. Then: the one at the door hard to pick up, a pie face with no eyes, small people at the full table | The ladder starts there too (tested); wider targets for the one at the door and the dishes; eyes stay open in the pie; the camera gives the full table a tenth more | 237 at the fullest, budget 260 | Crowded from the seventh guest on; upright phones are asked to turn |

Code review, by one reviewer who did not build it (not the many-reviewer pass). Fifteen findings, thirteen fixed, among them: after a first round left to its end the next carry was taken for a pull; picking up the one at the door while the table opened for it stopped the game; a guest or dish held while everyone went home was lost from the save; a body spring that did not rest at ten frames a second; a tapped pull that putting away threw away. Each has a test. Left: small arrays and closures made each frame, and the moves test looks at width only.

## For the pull request

### How the game meets the quality bar

- **Alive at idle**: everyone breathes at their own pace and looks at the finger or the door, the one at the door nudges the table open, steam, leaves, curtain, cat and sun move.
- **Motion and sound on every touch**: the knob, bell, guests, dishes, eight things in the house and the ground each answer when the finger lands, each with its own sound (tested).
- **Weight and follow-through**: springs on the table, bell and bodies, a wave along the row at every landing, squash to a floor and a breath out.
- **Silhouettes and tappables**: light faces on dark grounds; knob and bell never under 100 units across at any length (tested).
- **Wordless clarity at three**: one waits with a dish beside one large wheel, a stool shows in the gap, no word, numeral or sign. A whole round is shown once.
- **Idle guidance**: glow at 1.5 s, hand at 3 s, for the pull, then the bell, then the push (tested at each).
- **60 fps**: not measured on a tablet. 237 pieces at the fullest table (budget 260, counted in a test), about 10 ms of script at the 95th percentile with the processor slowed six times in desktop Chrome with software drawing, no post pass, no picture made after the first frame.
- **Assets**: all drawn and sounded by code; nothing loaded.

### The learning claim

None. The game has no learning goal, names no record and makes no claim.

### Defaults taken for the owner

Ages 3 to 6; canvas 2D; Folk-painted panel; a tap does all a pull does; at home there are always two; the order of guests moves on by three after each going home; upright phones are asked to turn.

### What the next builder should know

A state that ends a drag by itself (here, everyone going home) must clear what the finger holds, the shown round and the automatic moves included: every stuck state in this game was that one.
