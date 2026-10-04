<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Resumed: 4 October, after a cut-off on 3 October. The game run stood in its last gate, "nothing passes through anything"; it was finished on 4 October and this block is its end.
- Stage: gates. The game run is done: the game is built on the toy and is what the Mount shows.
- Sheet: passed round 3 (checker E). The game stands on the sheet at commit `1dfee6e`, sha256 of the sheet part `17c8a0ee8deeba697f9196089f5224aaa8cd6b66a6e09c132a78a1469d856774` (`awk '/^## The look/{exit} {print}' games/claw-machine/ART.md | sha256sum`). Rounds 1 (13 findings) and 2 (3 findings) were pasted as written. Answers handled: `claw-machine-1.md`, `-2.md`, `-3.md`.
- Look in use: Stud bricks, the first and only reserved row. The owner has not answered on it; the lead has asked for a look pass, which comes next.
- Renderer: raw three.js. No physics engine: the world is a pure model stepped at 120 a second, and the view draws the picture the model hands it.
- **What the lead should try first.** (1) A first visit, `?seed=7`, hands off for ten seconds, then a tap on the crate at the back: the delivery and the first showing of colour. (2) A toy to a gobbler that takes it and one to each that does not: each has its own way. (3) A finger on a gobbler: each takes the lift its own way. (4) Three small toys stacked, a fourth, then a big one on a stack of two. (5) Put the game away in the middle of a delivery and open it again.
- **Still weak.**
  - A first visit is a dark cabinet, a bare tray and one small crate far at the back. In the cold playtest the newcomer's first finger went to the claw and to the bells, not to the crate; the glow is thin and the ghost hand reads as a white block. Every touch is answered, so nothing is stuck, but the one want of the scene is the smallest thing on the screen. The look pass is for this.
  - The gobblers show little on their faces when nothing is in their mouths: two eyes that follow, and no more.
  - A toy carried over the back row overlaps the gobblers on the screen; only its shadow says where it is.
  - A toy let go at the end of the rail hops off the bell onto the tray. The sheet has it slide down a sloped rim; the cabinet has no slope there, because the bell post stands where the rim would carry the toy.
  - The crate does not tip as a whole: its bed tips, like a tipper truck's. A whole crate tipping in the claw swept its riders through the claw.
  - The crew that rode the crate hops down from it once it is back on the ledge, over the gate, and not from the air over the tray.
  - No frame rate has been taken (this machine draws in software), and no voice has been heard.
- **Open.**
  - The look pass the lead has asked for, then the closing run.
  - The owner's answer on the look.
  - The lead's frame rate on a graphics card, and loudness by ear.
- **What was run on 4 October, and passed:** `npx tsc --noEmit`; `npm test` (218 files, 2110 tests); `npm run -s wordless:check`; `node scripts/egress-check.ts`; `npm run build`; `npm run egress:built`; `npm run education:built`; `npm run check:intersections -- claw-machine --ci` six times running, two of them while the machine was busy, each clean (no open finding; one allowance, a pupil in its eye). **Not run:** `npm run perf:jam` and any frame rate (software GL only); nothing was heard.
- Draw calls, read from the grown-up overlay's counters on the production build at tier 0: 19 on a first visit, 25 with a crew of three and six toys, 28 with a crew of two, a crew waiting and eight toys. The frame-budget test holds the heaviest moments under 80. About 40,000 to 47,000 triangles.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Someone with no session to read resumes from this block and the files. The parts below belong to the block.

### Requests to the lead

- `docs/art-direction.md`, section 3: a registry row for Claw Machine when the look is accepted. Its text is at the end of `ART.md`.
- The frame rate of the look, on a graphics card, at DPR 2 (tier 0 is pinned with `?tier=0`).
- Loudness of the voices on a real machine: every voice is in `voices.ts` as numbers, with its ranges in `RANGE`.
- `scripts/intersections/core.ts` (frozen, so only a note): on a mesh that is not closed, its measure of how deep one thing is in another is the furthest sample point whose nearest triangle faces away, and at an edge or a corner that choice is a coin's toss. Once two such meshes cross at all, the depth it reports can be many times the true one. It never reports a crossing that is not there, so a game that crosses nothing is judged truly; a game that leans on a depth cap is not.

### Template notes

- `claw-machine.tsx` (the Mount): changed. The stage is created and disposed here, `resize` hands the size to the stage, the game is built when the slot has been read, gestures go to the game, and the loop plays the step, the sounds and the picture. **For the template:** the Mount sets the canvas size itself in `resize` (`canvas.width = ...`); a three.js game has to replace those two assignments with its renderer's own sizing, and a comment there saying so would save a search.
- `config.ts`: changed in three places. `BACKDROP` is the cabinet's own colour, so no flash shows before the first frame. `LADDER` holds the game's nine position ids and exports their type, and `FIRST_VISIT` has a row for each age of the band. **For the template:** `FIRST_VISIT` as generated has two rows (youngest and oldest); a band three years wide wants a middle row, and the comment could say rows may be added.
- `input.ts`: used as copied. **For the template:** a game whose action is the lift itself (here the lift drops the claw) cannot wait for `dragEnd`, which arrives only after the lift grace; it has to act on `dragLift` and remember that it did. The header could say that `dragLift` is the moment of the lift and `dragEnd` the moment the drag is given up.
- `audio.ts`: used as copied (`tone`, `noise`, `GameAudio`).
- `state.ts`: as copied. `save.ts` wraps it as its header says: it calls `deserialize` for the version, the position and the ending, and reads the same record again for the game's fields. **For the template:** a game whose ending can be told from its own state (here: the tray is clear at the last sort) has to decide whether the saved `finished` flag or the state wins when they disagree; this game lets the state win, so a damaged flag can never leave a finished load with nothing to take.
- `guidance.ts`, `scene.ts`, `overlay.ts`: used as copied. The ladder's glow and demonstration are drawn by the stage from `guide.ts`; the four scenes run on `scene.ts`.
- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`: frozen, untouched.
- **For the template, from the audit:** a model that hands the view a plain picture each frame can be checked against the audit's own measure in a test, without a browser, and far faster than a run of the audit: build the same meshes from the picture and ask `pairDepth` of every pair. This run did so with a scratch test outside the repository (it imports from `scripts/`, which a game may not) and found five times what the browser run found, because it could sample every moment of every reaction. A shared helper for that, under `scripts/intersections/`, would let each three.js game keep such a test.

### For the owner to decide

- The look: Stud bricks.
- The toy: put the claw somewhere and let it drop. Is doing it again and again a pleasure with nothing to achieve?
- A swallowed toy is chewed small and stands behind the belly window at under half its size, so a whole group fits a belly and can be seen as a group. Tipped out, it is full size again. Is that acceptable, or should a group be shown at full size somewhere else?
- A toy has no face: a duck is a brick duck with no eye, so that nothing about a toy varies but its colour, kind and size. Is a duck without an eye still a duck to him?
- The taller crate: when a cycle ends, a second crate offers the next step up, and choosing it never costs a step.
- A first visit opens on a bare tray with one crate waiting, and nothing comes in until the child touches the crate. It is the rule that the next load waits for the child's touch; it also makes the first screen the emptiest one.
- The defaults in the guide ("Symbols, and the defaults awaiting the owner") are taken as written; the game needs none of them changed.

## Pass log

One row per pass. Stills are taken on software GL with a paused clock stepped from the first drawn frame, at 1180 by 820, and kept outside the repository. No frame rate can be taken on this machine. Passes 1 and 2 were on the toy; passes 3 to 6 are the game run, on the production build (`npm run build`, `vite preview`, `?chrome=0&seed=7&tier=0`).

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | The first still of the spike, at rest | "The monsters have tubes for eyes and I can't see their faces. The white ones at the back are a big pile of white. I can't see the toys in the tummies. The bottom is cut off." | Eyes became balls with pupils that ride on them and face the child. The waiting crew stands lower, behind the parapet, in its shade. Bellies got a white lining and a pink floor, and a lower sill. Lamps, bars and the trim cap came off the cabinet. The camera fit was rewritten to hold every key point. | not taken (software GL) | Toys in bellies are small. |
| 2 | The spike again, then the toy in a scripted walkthrough (grab, carry, swing, let go, bonk, stack) | "The duck looks like blocks. The claw is a big dark lump. When I carry a toy it looks like it is at the yellow one's mouth." | The duck got a round head and a narrow bill. The jaws became light steel with green teeth, and the cable pale. The claw rides lower over a bare tray and climbs only over tall things. | not taken (software GL) | A carried toy over the back row still overlaps the gobblers on screen; its shadow on the tray is what says where it is. Little gloss shows on flat brick tops. The waiting crew reads as grey more than white. |
| 3 | The audit's close-ups of the claw holding a car, a duck and a gobbler's knob | "The claw is squeezing right through the car. Its teeth are inside it." | The jaws close as wide as the part they hold and no further (the grip was a fixed number). Only the hub squashes on landing, so the teeth stay beside the top plate. The claw drops only once it is over the very point, and stands still until its hoist has wound up. Its jaws stay wide for a moment after letting go. | not taken | The teeth hold a toy by a hair of air on each side; it reads as holding. |
| 4 | A delivery, still by still: hoist, tip, pour, set down | "The box turned round and I couldn't see the toys come out. Then it flew through the monsters. A toy went through the box." | The crate stays level and its bed tips, like a tipper truck's. It pours from just behind the tray while no one stands on the step, the front row first, each toy straight onto its own stud. The crew rides it back and hops down over the gate. | not taken | The crew's hop down is far at the back. |
| 5 | The delivery again after pass 4, and a first visit with hands off for ten seconds | "The box goes up so high I can't see the claw any more. And before I touch anything it's just dark and empty." | Past the gate the crate comes down low over the empty step, so the claw that holds it and its riders stay in the frame, and goes up again before it crosses back. | not taken | The first screen is still dark and bare, and the crate is its smallest thing. This is for the look pass. |
| 6 | Feeding: a right toy, a wrong toy to red, to blue; a lift; stacks; a big toy on Little | "When the red one has the wrong duck the claw runs off and sits on my yellow duck like it wants it." | After letting a toy go the claw backs off to a bare place where there is one. (It backs off at all so that nothing spat or thrown comes up through it.) | not taken | A wrong toy on a tongue is easy to see; a gobbler's face says little about it. |

## The cold playtest

On the production build, on 4 October, with a reader who had seen nothing of the game or its files: a fresh agent on the builder's own model, given five stills and no words about them. Four were a first visit at 1, 3, 6 and 10 seconds with hands off; the fifth was the screen after one touch on the crate and the scenes that follow.

- **Before the touch.** It named a brick room, an empty white board with a green edge, a claw on a string, two cream knobs on posts, and "a small jumble" far back that it could not make out. It saw the ring fade in round the jumble and "a white blocky lump" above it, which it guessed was a hand. Its first finger went to the claw, "the biggest, nearest, toy-like thing"; its second to the cream knobs, "because they look like buttons". Its words: "The thing the game wants touched is the smallest, messiest object on screen." "The board is a big empty white nothing." "The room is dark and gloomy."
- **After the touch.** "Much better. Two big box monsters, one red and one blue, with googly eyes, white peg teeth and open glass bellies. Each has a tiny car of its own colour inside." "The monsters want to be fed cars of their own colour." It expected a child to poke a car or drag it to the monster, and guessed both outcomes: a chomp and the car in the belly, or the car spat back.
- **What it found weak after the touch.** Whether to move the claw or the cars is not shown. The claw and its cable hang between the two gobblers. The snacks in the bellies are small. "The monsters stare with no expression; they do not look hungry or keen." The bells are unexplained. The room is dark.
- **What that means.** The sort reads at once from the bodies and the snacks: that is the game. A first touch on the claw or a bell is answered (the tray rings, the bell dings), so a child who goes there first is playing the toy and not stuck; a poke on a toy sends the claw to take it. The first screen, the hand and the faces are what the look pass is for.

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

- **Alive at idle.** The gobblers breathe, blink and watch the claw or the toy in its jaws, each at its own pace; riders on a crate cannot sit still; the cable sways a hair and the jaws work a little when the claw holds nothing. All of it runs on the attended clock and stops when the game is unattended or hidden.
- **Motion and sound on every touch.** The claw answers when the finger lands (jaws snap open, the trolley sets off, a motor chirp). Each of the thirty cells of the sheet's grid, and the five answers of the empty ledge, has its own deed with its own motion and its own voice (`deeds.test.ts`, `voices.test.ts`, `gameGrid.test.ts`). Every voice is synthesized from numbers in `voices.ts`.
- **Weight, squash and follow-through.** The cable swings against the trolley and swings slower under a load; the hub squashes when the claw lands; a toy squashes on landing and a stack squashes and hops as one; a throw is a plain arc under one fall, worked out from where it has to land.
- **Kid-clear.** Up to nine toys in three flat colours on a pale tray, two or three gobblers with ball eyes on a dark wall, one claw. Places on the tray are about 150 px across at 1180 by 820.
- **Wordless clarity for the declared age.** Nothing on the kid side is a word, letter, numeral or symbol; a category is a gobbler's own body. `npm run wordless:check` passes.
- **Wordless guidance.** The idle ladder marks what can be touched with a gold ring after three seconds and shows a tap with a ghost hand after five (`guide.ts`): on the crate when a cycle has ended, on the gate when the tray is clear and a crew waits, otherwise on a toy and then on a gobbler. A touch, and any scene, sets it back.
- **60 fps on a mid-range iPad.** Not measured here: this machine draws in software. At most 28 draw calls were seen in play and the frame-budget test holds the heaviest moments under 80; no shadow map, no post pass, pixel ratio capped at 2, four tiers that change the pixel ratio only. The lead takes the frame rate on a graphics card. No physical iPad was measured.
- **Procedural or committed assets only.** No asset at all: every shape is built from numbers at load, and there is no texture.
- **Its own art direction.** Stud bricks, written up in `ART.md` under "The look".
- **Nothing passes through anything.** The intersection audit is enforced and clean, with one allowance: a pupil in its eye. Its moments reach a first visit, each crew with right and wrong toys and lifts, the ledge, the bells, stacks, the tip-out, the ending and a delivery. Things stand on the tops of studs, never in them, so the audit needs no cap for seating.
- **Found as left.** The game is built from the saved slot; what a scene changes is saved when the scene starts; a touch ends a scene with everything where it was going. Tests put the game away at more than sixty moments, scenes included, and find it as left with nothing replayed (`game.test.ts`, `save.test.ts`).

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
- Stand things on the tops of studs, never in them, and keep a sliver of air between any two things that touch. Then nothing crosses anything at rest, the audit needs no allowance for seating, and what it reports is real.
- Run the audit's measure on the model, not only in the browser. A model that hands the view a plain picture can be checked at every moment of every reaction in a minute and a half; the browser run samples four times a second and takes two and a half minutes. Most of what this game had wrong was found that way.
- What the audit found was almost never a mesh: it was a rule missing from the model. A grip that was a fixed number. A claw that came back down onto what it had let go. A throw whose top cleared a head and whose way down did not. A pose that leant a body about its feet and so pushed the feet through the floor. A thing fixed to a character and drawn from last step's position. Write those rules once, in the model.
- A thing that leaves a character (a toy from a mouth) should be carried by the character until it is clear of it, and only then thrown: then no pose of the character can pass through it.
- Eyes made of discs read as tubes from a camera above. A ball with a pupil riding on it reads from every angle.
- A group of full-size toys needs as much room as the tray it came from. Either the group is shown small or the gobblers become the size of the tray; decide it before modelling the characters.
- With the camera above and in front, a thing held in the air over the back of the tray overlaps what stands behind the tray on screen. A contact shadow on the tray is what says where it is; keep the ride low and lift only over tall things.
- When the lift is the action, act on `dragLift`, not `dragEnd`.
- Stills on this machine: a paused clock stepped 33 ms at a time from the first drawn frame, with the pre-installed Chromium given by `executablePath`.
