<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Resumed: "after the run that pastes your sentences" (the look pass, cut off part-way with its work uncommitted), then "to take up at the end of your look pass. Round 5 of your sheet is answered", then "after the run before this one. A new last step for every game: the reader", in that order.
- Stage: gates. The game is built on the toy and the gates were run as far as the build machine takes them (below). The lead reports that it passes the gates on the lead's machine as well and that its intersection audit is clean there. It stands on the sheet that passed round 4, with ten details pasted since so that the sheet says what the game does; round 5 reads only those.
- Sheet, round 1: checker B, 14 findings, all pasted at commit `06c946d`.
- Sheet, round 2: checker D, 4 findings, all pasted at commit `d9a0c46`.
- Sheet, round 3: checker E, on the text with sheet part sha256 `26cdd160de55cad7ff69e3dc309676351c6b290327f1de763efc3b89cdbf2e78`. Outcome: 2 findings. Both replacements are pasted as the checker wrote them, none disputed, at commit `8f106a2` (sheet part sha256 `3c3a46542314229cc47bae57cd57ac510e4a7cbc345796262c7f43d843317e3b`). Brought into line at commit `90798d1`: every sound the grid's cells now name is a voice of the game (twenty-one new ones in `voices.ts`, held to the stated ranges), and each of the thirty cells is played through the game in a test and heard as the sheet has it.
- Sheet, round 4: checker F. Outcome: **passed**, no findings. The text it judged has sheet part sha256 `3c3a46542314229cc47bae57cd57ac510e4a7cbc345796262c7f43d843317e3b` and is held by commit `8f106a2`. 
- Sheet, after the pass: ten sentences of detail were changed in eight lines, each to say what the built game does, at commit `d3ab9e7` (sheet part sha256 `0eb1ff4c7122d2c662c9297de9dba822b3bb252784e19b64955d175e3daf1d4b`). They are listed below, old and new. None changes the mechanic, the error, the designed order, the records or the claim; one is a row of the table of saved fields, which now names a field the save has held since it was written.
- Look in use: foam play mats, the first reserved look. The owner had been shown the toy and had not answered when the game was built on it; that was done at the builder's risk. Everything that is not drawing is outside `view/`, so another look replaces only that folder.
- Open: sheet ready for check, round 5

**What the lead should try first**

1. A first visit with a fresh slot: the first showing plays by itself, once (a creature walks to the tile, stamps, and the hat pops onto its own head). Then touch nothing for ten seconds: thin orange rings come up round the hats that can be taken, and the ghost hand presses one.
2. Tap every hat. With a spare hat in the tile the last one comes out with nobody under it and scuttles beside a round spot; tap it and it goes home; leave the crew alone for two seconds and it parades.
3. After the parade a creature of the next crew waits in the arch, ringed. Tap it or the arch.
4. Drag a hat onto a head that has one (the tower slips over its eyes), then a third (the tower of three falls, every time). Pull a creature to another, to the tile, to nowhere.
5. Put the game away in the middle of any scene and open it: nothing replays, and the world is as the scene leaves it.
6. `?seed=<n>` in the address fixes a first visit's crews; `?tier=3` shows the lowest tier; three quick taps in the top right corner show the grown-up overlay.

**What ran on the build machine, and what did not**

- Ran and passed: `npx tsc --noEmit`; `npx vitest run games/hats-for-all test/games.test.ts` (347 tests, about 6 seconds); `npx vitest run`, the whole repository (2176 passed, 1 skipped); `npm run -s wordless:check`; `node scripts/egress-check.ts`; `npm run build`; `npm run egress:built`; `npm run education:built`.
- The intersection audit, `npm run check:intersections -- hats-for-all --ci`: `enforce: true`, eleven moments from saved worlds, 1203 samples, 32 pieces. Passes: 46 findings, then 13, then 1, then none. Five enforced runs in a row came back clean with the same samples, pieces and findings each time (0 open, 0 allowed, 2 under the pixel floor), the first of them while stills were being taken on the same machine, and a sixth with a replay of the second pass's thirteen findings. No contact is allowed: every finding was fixed at its root. A seventh run, on the final build, was clean as well.
- The audit ran with the Chromium already on the machine (141), reached through a private browsers folder outside the repository, because Playwright's own build could not be downloaded here. CI uses Playwright's own.
- Not run on the build machine: any frame rate (it draws in software); any listening (it has no sound); `compound audit` (no file under `docs/solutions/` was touched).
- Frame rates, as the lead measured and reported them: 60 a second in Chrome at six times CPU throttle; 59.6 at twenty times throttle and four times the pixels; 59.9 in WebKit; 18 draw calls. The build, the pixel ratio and whether a physical iPad was measured are the lead's to state.

**What is still weak**

- Nobody has heard the game. Thirty-three voices and twenty tunes of babble are numbers held to ranges; whether "pomf" sounds muffled and "plap" flat is for ears.
- The builder has not seen it move at speed. The stills say layout, colour and that nothing passes through anything; the weight of a landing and the comedy of the acts are for the lead's and the owner's eyes.
- The same kind of creature can be in two crews running: it walks off to the left and a moment later walks in from the right.
- The idle rings round neighbouring hats in the tile touch at their sides.
- The two free round spots at the ends of the row may read as places to put something.
- A hat on a round head rests on its very top and stands proud at the sides.
- The acts are short and simple; "walks as a hat with legs" and "runs a circle under it" are the two that carry most of the comedy.

**Requests to the lead**

- The check of the sheet, round 5, on the ten sentences listed above.
- A listen to the sounds on a real machine.
- The registry row in section 3 of `docs/art-direction.md`: its text is at the end of `ART.md`.
- `scripts/jam-intersections.mjs` (the file, the change, the reason): its cache of prepared pieces is keyed by the geometry's uuid, and the audit seeds `Math.random`, so after a reload a new geometry gets the uuid an older one had and the old triangles are used. A game that cuts a mesh from its saved state is then checked against the wrong mesh (here the hat tile: three false z-fights). Worked around in the game by naming each cut of the tile; the audit would be safer keyed by the positions it was sent.

**The sentences changed after the pass, for round 5**

Line numbers are lines of `ART.md` as it stands at commit `d3ab9e7`. Everything else above `## The look` is as round 4 passed it.

- The grid, hat in the tile, let go anywhere else (line 35).
  Old: "it skids to the nearest round spot with a long rubbery squeal"
  New: "it skids to the nearest round spot that has no loose hat beside it with a long rubbery squeal"
- The grid, loose hat on the floor, let go anywhere else (line 37).
  Old: "scuttles on beside the round spot nearest to where it stops"
  New: "scuttles on beside the round spot nearest to where it stops that has no loose hat beside it"
- The error as a consequence, one hat too many (line 71).
  Old: "skids to the nearest round spot and scuttles"
  New: "skids to the nearest round spot that has no loose hat beside it and scuttles"
- What is stored, the row for `crew` (line 110).
  Old: "| `crew` | The creatures on the mat in row order, at most five: each one's kind and the hats on its head from the bottom up, each hat named by its hole in `tile`. |"
  New: "| `crew` | The creatures on the mat in row order, at most five: each one's kind, the round spot it stands on, and the hats on its head from the bottom up, each hat named by its hole in `tile`. |"
- The scenes, the first showing (line 142).
  Old: "(once ever; cause: the very first crew walks in)"
  New: "(once ever; cause: the game is opened for the first time, with the first crew standing on its spots)"
- The scenes, one leaves (line 145).
  Old: "the hat comes down on its empty spot"
  New: "the hat comes down beside its empty spot"
- The scenes, the parade (line 146).
  Old: "march once round the mat"
  New: "march once round the row of round spots"
- The scenes, the parade (line 146).
  Old: "come to rest in a row on the far side, facing the arch"
  New: "come to rest on their own round spots, looking towards the arch"
- How the next one starts (line 151).
  Old: "The first creature of the next crew stands waiting in the arch"
  New: "A creature of the next crew stands waiting in the arch, one whose kind is not on the mat with the finished crew where there is one"
- How the next one starts (line 151).
  Old: "the finished crew walks out"
  New: "the finished crew walks off to the left"

**Findings not yet fixed**

- None from the audit. From the cold playtest proxy, see "What is still weak".

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

- `hats-for-all.tsx` (the Mount): changed where its comments say to, and as the pilot notes say. The game is made when the slot has been read; `draw` has a case with no game (the bare mat); sounds are played inside the gesture handler and after the step; a scene playing touches the ladder; the ladder's result is kept in a variable for `draw`; `?seed=<n>` fixes a first visit. **For the template**: a threshold between a smeared tap and a drag belongs in the Mount or in `input.ts` for a band that starts below 4 (here 44 pixels): `TAP_SLOP` alone turns a toddler's tap into a drag of nothing.
- `config.ts`: tuned as meant. `Tier` has `stipple`; `LADDER` holds the eight ids; `FIRST_VISIT` has a row for each age of the band.
- `state.ts`: as copied. `save.ts` wraps it as the file asks. **For the template**: the wrapper repeats the test for "a record of this version"; an exported helper would keep the two reads from drifting apart.
- `scene.ts`: as copied. Each scene is a few cues and one last beat that settles the theatre; the walking and flying between cues are chains in `play.ts`, which `settle` runs to their ends, so a finished scene leaves the stage as the save has it. **For the template**: `Scene` has no way to ask how long it has run or to hold a chain; a game whose beats are "walk there, then do that" builds its own, as here.
- `audio.ts`: as copied, with the template's later fix taken from the base branch in the closing run: fingers on the glass are counted, so a second finger or a palm lifting inside a touch does not end the wait the first finger started. `sound.ts` turns a voice written as numbers into its `tone` and `noise`.
- `guidance.ts`: as copied; `handPose` and the ladder drive the rings and the ghost hand. What they show is in `guide.ts`.
- `input.ts`, `overlay.ts`: as copied. The Mount reads `CORNER` from `overlay.ts` to keep the grown-up's corner bare.
- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`: frozen and untouched.
- three.js: `ExtrudeGeometry` with a negative `bevelOffset` breaks on an outline with sharp teeth or a sharp point (the inner edge crosses itself): cut the top face inside the outline yourself and bevel outwards. A body that leans by rotating about its feet puts a foot through the floor: lean by a shear.
- The machine: Node 24 from `nvm` under `/opt/nvm`. Playwright drove the Chromium already on the machine; for stills by its path, and for the audit through a folder of links named as Playwright expects, kept outside the repository. In software a frame at a pixel ratio of 2 takes about half a second.

### For the owner to decide

- The look, foam play mats, and the toy: shown to him before the game was built on the toy, and not answered when the builder last heard.
- Speech. The game speaks no number word, by the guide's default. With a number word heard on each hat as it is given, the game could also be designed from the records on number words, and a two-year-old in California would then have a record under the game; as it stands that child has none.
- Whether the cycle's change and the parade may come by themselves. They come two seconds after the crew is left alone, as the consequence of the child's last move. If he wants them to wait for a touch, the scenes change.
- Whether this band needs a harder option laid beside an easier one for the child to pick. The sheet offers none and says what the child can choose in its place.
- Whether three kinds of hat are plain enough for working pieces. Each is one flat colour and one simple outline; the kinds exist so that the creatures can have tastes.
- Whether the first showing may play by itself on a first visit. It is the one scene that no touch causes; it plays once ever.

## Pass log

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| Spike 1 | The first still of the scene, software, 1180 by 820, pixel ratio 1 | Half the floor was missing and a stray triangle crossed it; the hats and the creatures already read. | The jigsaw tiles' bevel is cut outside the outline; the mat widened to fill the view. | Not measured (software) | The top third is empty wall; the shadows are faint. |
| Spike 2 | Stills after four taps and a poke in the floor, pixel ratios 1 and 2; the lowest tier | A hat on a head, in its hole and loose on the floor cannot be confused. At ratio 2 the stipple and the bevels show. Bare creatures did nothing to show they want a hat. | The camera moved in and down; a bare creature pats its head now and then; darker shadows; one step of bevel on the floor. | Not measured (software) | The wall above the row is kept empty on purpose, as room for a tower of hats. |
| Round spots | A still after four taps | The sheet has the creatures stand on round spots; the scene drew none. | Five lighter discs inlaid flush in the mat. | Not measured (software) | The two empty spots at the ends may read as places to put something. |
| Game 1 | A whole first cycle on the dev server: the first showing, the hand, the parade, the next crew | "The orange light is on the hats and the red one goes orange. The hand is under the hat, not on it. There are two purple ones." | The glow became a ring round a thing; the hand's finger sits on its target; a creature not already on the mat waits in the arch. | Not measured (software) | The rings were wide and ran together. |
| Audit 1 | The intersection audit's first run: 46 findings | Hats sank into heads and the floor, leaning bodies put a foot through the mat, ears and hands were inside bodies, a flying hat's tip dived into the tile. | A body leans by a shear; a hat rests on the head and is lifted by as much as a tipped corner dips; flights lie down or stand up in the high middle of their way and come over a hole before going in; ears and hands lie in front of the body; a creature's parts share no plane; the moments find their meshes. | Not measured | 13 findings. |
| Audit 2 | The second run: 13 findings | A pressed hat sank into the mat; a tower's hats crossed; Flop's ear brushed the arch; three z-fights were the audit taking one tile for another. | A pressed hat gets thinner and keeps its underside on the mat; a tower's hats stand square; ears swing less; each cut of the tile carries its own name. | Not measured | 1 finding. |
| Audit 3 | The third run: 1 finding | A hat carried to the top of a tower rose through the hat below it. | A hat on its way to a head is as high as the head before it comes in over it; a falling tower's hats leave from the top down. | Not measured | None: five enforced runs clean, and one with a replay. |
| Cold 1 | The cold playtest proxy on the production build, fresh slot, the shell's default age: ten seconds hands off, then a newcomer's minute, two dozen stills | "All the hats are in one long orange stripe. Which one do I press? The yellow hat has orange on it. When they walk round they are all in a heap by the door." Unclear moments: 4 (the stripe, the tint, the heap at the turn, the same creature leaving left and coming in right). | A thin ring that hugs each thing and stops short of the next; the parade's line opens out. | Not measured (software): 19 draw calls, about 36,000 triangles | The rings touched the hats' near edges. |
| Cold 2 | The same stills again, same seed | "Each hat has its own ring now. The ring cuts the bottom of the blue hat." Unclear moments: 2 (the ring on the near edge; the same creature twice running). | A little more room inside each ring; the grown-up's corner answers nothing; a touch on the wall presses the mat's far edge. | Not measured (software) | The same creature in two crews running. |
| Cold 3 | The same stills a third time, same seed | "The hand shows me the blue hat. They walk in a line now." Unclear moments: 1 (the same creature in two crews running). | None: the list is as short as this run gets it. | Not measured (software) | See "What is still weak". |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

The builder's machine draws in software and measured no frame rate. The lead measured on a real graphics card and reported: 60 a second in Chrome at six times CPU throttle, 59.6 at twenty times throttle and four times the pixels, 59.9 in WebKit, 18 draw calls. The build, the pixel ratio and whether a physical iPad was measured are the lead's to state.

- **Alive at idle.** Each creature breathes at its own tempo, sways, blinks at moments of its own, looks at the hats while bare and up at its hat when it has one, and a bare one pats its head now and then. A loose hat scuttles in a small circle. All of it runs on the attended clock and stops when the game rests.
- **Motion and sound on every touch.** A hat, a creature, the arch and the bare floor each answer when the finger lands, and each of the grid's thirty cells has its own motion and its own sequence of sounds, by test (`game.test.ts`). Sound is synthesized from numbers in `voices.ts`.
- **Weight, squash, and follow-through.** A hat squashes under the finger, turns over in the air and squashes on landing; what it lands on squashes and springs back with that creature's own spring; a body leans as foam does, feet planted.
- **Kid-clear.** At most five creatures and five hats, each with its own outline and colour, on a floor of a hue no piece uses; the hats lie on the lightest, plainest surface; the hats themselves stay plain.
- **Wordless clarity for the declared age.** No word, letter, numeral or symbol on the kid side; `npm run wordless:check` passes. Everything essential is a tap; a drag is an extra, and a smeared tap still counts as a tap. One want in every scene: bare heads look at the hats and pat themselves; after the parade one creature waits in the arch.
- **Wordless guidance.** The idle ladder is whole: a thin ring round each thing that can be touched now, then the ghost hand presses one of them once (`guide.ts`), and it shows nothing while there is nothing to do but wait. A cold playtest proxy was run three times on the production build.
- **60 fps on a mid-range iPad.** Measured by the lead (above). Built for it: pixel ratio capped at 2, 20 draw calls at the most and about 39,000 triangles in the busiest stretch by a counted test (`frameBudget.test.ts`), no shadow map, no post pass, geometry built once, the loop paused when unattended, four tiers, the grown-up overlay.
- **Nothing passes through anything.** The intersection audit is enforced with no allowance, on eleven moments that start from saved worlds and reach every creature under every hat, towers, loose hats, a carried hat, pulled creatures, each scene and a touch in the middle of each. Model tests hold what it cannot see between samples: no walker meets a stander, the tile, the arch or a loose hat in any scene of any position.
- **Procedural or committed assets only.** Everything is built in code: no texture file, no font, no clip.
- **Its own art direction.** Foam play mats; the art guide is the part of `ART.md` under "The look".

### The learning claim

As the sheet has it, which passed round 4 of its check (checker F, sheet part sha256 `3c3a4654…317e3b`) and whose records part and claim are unchanged since: Hats for All is designed from three California preschool and transitional kindergarten learning foundations, which are foundations published by a state department and not standards (two of them in part), and from four records of guidance by the Dutch curriculum institute, which is guidance and not law (two of them in part). The pairing of one with one is taken from the Dutch record alone. Every record named was `confirmed` when each of the four checkers read the lookup on 2026-10-03; the states are to be read again on the day of the pull request. For a two-year-old in California the game rests on no record. Nothing here says what a child has reached. The records are named by pack id in `ART.md`, "The records", with what is taken and not taken of each.

### Defaults taken for the owner

- No symbol of any kind: the band starts below 6.
- No speech: every creature's voice is invented and synthesized, and no number word is spoken.
- No camera shake and no pause on impact: the answer to a touch is carried by chains of consequence, sound and squash.
- The look is the first row reserved for the game; no other row was spiked.
- From the sheet: sets of five or fewer; three kinds of hat; the cycle's change and the parade come by themselves once the crew has been left alone for two seconds; no harder option laid beside an easier one; the first showing plays by itself once.

### What the next builder should know

- Write every sound as numbers with a range test before wiring it: the test caught a voice below its lowest pitch on a machine that cannot hear.
- Keep the stage as a pure "theatre" of numbers that the game tells what happened and the view only draws. The game, its thirty cells and its scenes are then tested with no renderer, and the scene graph can be built in a test to count a frame's draws.
- Write the grid as data and play every cell through the game in a test that compares what was seen and heard with the grid. When the sheet's check asked three times for sounds in the cells, the test said which cells were still the same.
- Give the rules and the view the same pure geometry, lanes included, and test the lanes: who walks where, and that no walker meets a stander. It found two walkers entering on the same spot before the audit ran.
- Start every audit moment from a saved world. A drag in an audit moment needs the mesh found by name; a pattern that ends in `$` misses, because the label carries a colour after the name.
- A fixed seed in the address is what lets a still be taken again.
