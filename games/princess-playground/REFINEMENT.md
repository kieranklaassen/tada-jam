<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: toy, with the rules written beside it. The game is not built on the toy: this run ends here, as its brief says.
- Sheet check, round 1 (checker: B): open, 16 findings, on the sheet at commit `132bc32b788487e3e11e1bc87506fc20be09abdb` (hash of the sheet part `05fd9b4210a767d42c06a0cf8a61da725bbc4031b03a0b191b852d1765d82fd6`). All 16 replacements were pasted as written; none was disputed.
- Sheet now: commit `19240adfc751abc0ad40436987df850d0e90c361`, the stage boundary of the pasted sheet. The hash of the sheet part (everything above `## The look`) is `c2e26354142adaa20ec65ad45bd1b9634b2968955e550610d4b0c9895b601661`, and it has not changed since that commit. It has not passed.
- Brought into line with the pasted text: `marks.ts` (a cell is smooth, raked or a mark; the tray starts raked; the rake is out while any cell is deeper than raked; Dot's ring and a bite that deepens with weight), `save.ts` (the end of a ride clears `moves`), `rides.ts` (no "too much", since no ride asks for level; Bo sits and does not doze at `high-asks`), `grid.ts` (a sound in every cell), and the tests of each, with new ones for the guess answer position by position and for how a load rests the plank. The toy needed no change.
- Rules: written against the sheet at `19240ad`, at the builder's own risk, while its check runs. A finding under the representation, the mechanic questions, the error, the designed order or the records reopens them.
- Look in use: sand tray, the first reserved choice. Spike: stills taken at 1180 by 820, pixel ratio 2, on a software renderer (SwiftShader); it read clearly and nothing asked for a second look. Frame rate not measured: no graphics card on this machine. The lead takes the still and the frame rate on a real one.
- What the Mount shows at load: the toy, on the first ride as it is laid out (Pim on the left end, Mog and Bo in the sand, Dot at the rim), seed 1, every load. Nothing of the toy is saved yet.
- Renderer: three.js, raw, on the template's canvas. No physics engine: the plank and the hops are the game's own model (`plank.ts`, `motion.ts`).
- Checks run on 2026-10-03 at the last commit of the latest run: `npx tsc --noEmit`, `npx vitest run games/princess-playground test/games.test.ts` (all passed), `npm run -s wordless:check`, `node scripts/egress-check.ts`, `npm run build`, `npm run egress:built`, `npm run education:built`. All passed on this machine. CI was not read.
- Open: sheet ready for check, round 2
- Answers handled: `docs/build/answers/princess-playground-1.md` on the base branch. Before any run ends, look there for a higher number.
- Open: one request to the lead: a registry row for the look in `docs/art-direction.md` (Princess Playground, sand tray, art guide `games/princess-playground/ART.md`).
- A draft pull request, number 37, is open from this branch so it can be read; the lead merges by squash and may close it.
- Open, in the toy: the ring of grains thrown when an end knocks is heard and leaves its bite in the sand, but no grains fly yet; the friends' own reactions to what happens to them (Pim crowing on top, Mog flat-eared underneath, Bo snoring) are in `tastes.ts` and not yet in their bodies; Bo's heavy lids barely show; the ghost hand is not drawn (the idle glow and a wiggle are).
- Not yet written, for the game and the gates: the intersection audit config `scripts/intersections/games/princess-playground.ts` (meshes are named already), the frame-budget test, the rake, the scenes and showings, and the wiring of `save.ts` and `marks.ts` into the Mount.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Where things are

| File | What it holds |
| --- | --- |
| `world.ts` | The tray, the plank and the four friends as numbers; where a friend may stand; the grid places lie on. |
| `arrangement.ts` | Who is where: the model of the world. A tap, a friend let go, the tilt from the two totals, Dot in company. |
| `plank.ts` | The plank turning, knocking and floating level. |
| `motion.ts`, `personality.ts`, `pose.ts`, `rest.ts` | Friends hopping, riding, tossed and carried, each by its own numbers; what the view draws. |
| `voices.ts`, `sound.ts` | Every sound as numbers inside stated ranges; the bridge to Web Audio. |
| `rides.ts` | The designed order: five kinds and the mixed place, layouts, when a want is met, judging, what a move does. |
| `save.ts`, `marks.ts` | What is saved and how it is repaired; the sand as a coarse grid. Not wired into the Mount yet. |
| `tastes.ts`, `grid.ts` | The friends' fixed tastes; the object-by-action grid as data. |
| `toy.ts` | Finger, playground and sand joined up. |
| `view/` | The three.js stage: the sand shader and its height canvas, the friends' meshes. |

### Template notes

- `config.ts`: changed, as meant. Added a `grain` field to `Tier`, the ladder ids, the first-visit rows, and three numbers for judging a ride. **For the template:** `FIRST_VISIT` puts its second row at the band's oldest age; a band of 2 to 5 wanted the step at 4, so the row was rewritten. A comment saying the rows are the game's to choose would save the next builder a look.
- The Mount (`princess-playground.tsx`): changed in the six places its comments mark and nowhere else: the stage is made, `applyTier` sets the grain, `draw` renders, `resize` sizes the renderer, gestures go to the toy, and the loop steps it. **For the template:** `resize` sets `canvas.width` and `canvas.height` itself; a three.js game must replace those two assignments with its renderer's own sizing, and the comment there could say so. The loop also throws away the step `clock.advance` returns; the game has to change that line to keep it.
- `audio.ts`: used as copied. `tone` and `noise` were enough for every voice. **For the template:** a voice written as a list of numbers with a test on its ranges (this game's `voices.ts` and `sound.ts`) would serve any builder who cannot hear; it is about forty lines.
- `input.ts`: used as copied. The press, tap and drag gestures mapped onto touch, hop and carry without change.
- `guidance.ts`: used as copied. Only `glow` and `demoIndex` are read so far.
- `state.ts`: used as copied and wrapped by `save.ts`, as its header says to. The second read of the raw record worked as described.
- `scene.ts`, `overlay.ts`: used as copied; `scene.ts` is not used yet.
- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`: frozen, untouched.
- `ART.md`: the outline's line under `## The records` was replaced by a sentence of the game's own.

### For the owner to decide

- The look: sand tray, as the stills show it. The friends are painted pebbles with faces; the ledger row says "a few smooth stones or shells as the only objects" and "no characters made of the material", which this reads as: characters may be stones, never sand.
- The toy: a tap puts a friend on the seesaw; the plank tips, knocks and throws. Whether it is a pleasure in the hand, and whether it is loud and lively enough.
- The name: the princess is the smallest pebble, with a shell for a crown, and the playground is a seesaw in a sand tray. Whether that is princess enough for the name.
- The skill line of the roster calls weight "science". The records carry comparing weight as measurement in the mathematics lane in both jurisdictions, with one California science foundation that lists weight as an example property. The sheet follows the records.
- No default of the guide needed changing.

## Pass log

One row per pass: what was looked at, the critique written as the child, the one themed fix set, what was reverted, the measured frame rate, and what is still weak. Every still so far is from the dev build on a software renderer at 1180 by 820, pixel ratio 2, tier 0 pinned, clock paused and stepped, 0.4 s after the first drawn frame unless said.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | The spike at rest. | "They look grumpy and dark. Is that one a horn? I can't see the big one's face." | Light: both lights raised. Paint: brighter coral, teal and blue-green. Faces: eyes larger and moved up onto the front of the head so they read from above; a small smile; smooth normals on Mog. Crown: larger, cream. Sand: finer rake, finer grain. | Not measured (software renderer). | Eyes had no pupils; tray corners cut off; shadows not seen. |
| 2 | The same, reshot. | "Their eyes are white. The box is too big for the screen." | Pupils pushed out along each eye's own slope. Camera a step back and aimed higher. Shadows moved out from under the bodies, to the right, and darkened with a cool tint. Grain calmer. | Not measured. | Bo's lids do not show. A lot of cloth above the tray, kept as room for a toss. |
| 3 | The toy: a tap on Bo, mid-air and settled; then Mog and Bo stacked, a groove and a poke. | "He jumped on and she went up! He has vampire teeth when he jumps. The cat is squashed under the seesaw person." | Open mouth made a wider smile, not a tall one. Default places moved clear of the two seats and put on the saved grid; the strip under the plank widened so nobody stands against a seat. | Not measured. 23 draw calls, about 16,000 triangles. | No grains fly at a knock. Motion judged only from model tests and stills: no video yet. |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

So far, at the toy stage. Nothing here is a frame rate: every number below was read on a machine with no graphics card (Chromium on SwiftShader), and no physical iPad was measured.

- **Alive at idle.** Each friend breathes at its own rate and blinks on its own timer; Dot's colour follows its company. It all runs on the attended clock and stops when the game is unattended or hidden (the template's `attention.ts`, untouched). Still to come: the asker's look at the plank, Bo's snore.
- **Motion and sound on every touch.** A press on a friend is answered in the same frame with a squash and that friend's own chirp, before the tap is known. The plank rocks, the sand takes a dimple or a groove, and a touch on the cloth still gives a soft tap. No touch lands in silence.
- **Weight, squash and follow-through.** Hops gather, leap, arc and land with a squash set by the friend's own numbers; the plank turns faster for a bigger difference, knocks, rebounds and settles; a throw is higher for a lighter friend; Pim's crown lags and swings on. `motion.test.ts` holds the chain in order (land, knock, toss) and that the heavier friend throws Pim higher.
- **Kid-clear.** Four large bodies in four hues the sand does not have, one plank, one stone, a plain pale surface. Targets are padded: the smallest friend answers a touch within about 115 to 130 logical pixels across at 1180 by 820, depending on how far back she stands.
- **Wordless clarity for the declared age.** No word, numeral or symbol anywhere on the kid side; `npm run -s wordless:check` passes. Everything essential is one tap, and a second tap undoes the first.
- **Wordless guidance.** The template's idle ladder drives a warm ring in the sand under one friend who could hop on, and a wiggle when a showing starts. The ghost hand is not drawn yet.
- **60 fps on a mid-range iPad.** Not measured. What can be said: 23 draw calls and about 16,000 triangles, no shadow map, no post pass, pixel ratio capped at 2, one 512 by 320 texture sent again only when the sand was touched, geometry built once at mount. The lead measures.
- **Procedural or committed assets only.** Everything is geometry, a shader and a canvas drawn at run time. No file is loaded.
- **Its own art direction.** Sand tray: `ART.md`, "The look".

Found as left, the intersection audit and the cold playtest proxy belong to the game and gates stages and have not been run. What stands in for the audit so far is `motion.test.ts`, "nothing passes through anything": two minutes of seeded taps, carries and knocks on four seeds, in which nobody sinks into the sand or into the friend below.

### The learning claim

As the sheet has it (`ART.md`, "The claim"), with every check state read on 2026-10-03; read them again on the day of the pull request.

Princess Playground is designed from five California learning foundations published by state departments, which are foundations and not standards (`us-ca 1.1` Exploration and `us-ca 2.2` Social Interactions for infants and toddlers; `us-ca 3.1` Measurement and Data, `us-ca 2.1` Physical Science and `us-ca 1.8` Self for preschool and transitional kindergarten), each confirmed; for a five-year-old, in its one-against-one rides only, from one California content standard adopted by the State Board, `us-ca K.MD.2`, confirmed; and from seven statements of SLO's Dutch content cards for peuters and for fase 1, which are curriculum-institute guidance and not law (`nl Gewicht / 1`, `2` and `3` and `Open staan voor de emoties van een ander / 4` for peuters; `nl Gewicht / 4` and `5` and `Herkennen, begrijpen van en aanpassen aan emoties van anderen / 4` for fase 1), each confirmed.

What it takes from them, and from which: causing an effect and guessing what comes next from `us-ca 1.1` alone; exploring and comparing how heavy things are from `us-ca 2.1`, `us-ca 3.1` and `us-ca K.MD.2` and from `nl Gewicht / 1`, `2` and `4`; doing that on a seesaw from `nl Gewicht / 3` and `5` alone, the seesaw being the game's own choice under the California records; noticing how a friend in the game is doing and answering with one simple act that is never required from `us-ca 2.2` and `us-ca 1.8` and the two Dutch social-emotional statements, which speak of other people where the game offers a character. A friend who stands apart and is brought in is the game's own situation, named by none of these records. It says nothing about what any child has reached. The sheet's first check found 16 things to change, all pasted; it has not yet passed.

### Defaults taken for the owner

- Every default under "Symbols, and the defaults awaiting the owner" in the guide, as written: no symbol, letter or word; no camera shake and no impact pause (the response is the chain, the sound and the squash); invented, synthesized voices and no speech.
- The demo's verb was kept and narrowed: the demo is dollhouse play over a whole playground, and its star was the seesaw. The game keeps picking a friend up and putting it on things, and makes the seesaw the whole playground.
- The game's own choices, which no record sets: four friends, weights 2, 3, 3 and 4, six positions, a ride judged by moves beyond the fewest (well within 2, mixed within 5).

### What the next builder should know

- Put places on the grid you save them on. Friends' places in the sand were first rounded to a hundredth of a unit and saved to a hundredth of the tray; a trip through storage then nudged friends that stood shoulder to shoulder. Once every place came from one grid function, saving and loading became exact, and the test that makes 300 seeded moves through storage has held since.
- Search for a free place, do not push. Pushing a friend away from each neighbour in turn left it too near the first one whenever a rim was in the way. Looking outward in rings from the wanted place and taking the first free one is shorter and always ends.
- Write tests on the default layout before taking stills. Two default places touched and one overlapped the waiting place; a test on "the default places themselves are free" found all three, which a still would have shown only as a small overlap.
- A voice as numbers is cheap to hold in range. The test over every voice at the edges of its inputs caught a landing thump whose glide went under the lowest frequency for the heavier friends.
- A plank that rebounds will throw its riders again on the second knock unless a throw has a floor. Below the floor a rider only bobs.
- On a software renderer, read layout and colour from a still and nothing else. Three passes fixed things a still shows well (dark paint, eyes without pupils, a tray cut off by the frame). Whether the toy feels good is not in any of them.
