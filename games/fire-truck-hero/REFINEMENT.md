<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: gates, being run. The game is built on the toy; the last gates (five enforced audit runs on the final build, the frame CPU of the game, the built-asset checks on the final build) are under way and their results are not in this block yet. This run did steps 5 to 9 of the guide: the cycle, the grid with a motion and a sound for every cell, the scenes, the characters, the idle ladder, the frame-budget test, the intersection audit, the logged passes and the cold playtest proxy.
- Sheet: the game stands on the sheet as it is at commit `0d7b73aeba9ec80dd26125ab51d74019b8733392`. The hash of its sheet part is `b9246e4ee04de9ec7609a16a144b0a7d4bf0b41daa88105189cb00a2d3c4f19c`. Rounds 1, 2 and 3 are handled (11, 3 and 2 findings by checkers B, D and E; every replacement pasted as it stands, none disputed). Round 4 has not come back. The sheet has two sentences of the builder's own that changed after round 3 read it, listed below.
- Look in use: the first reserved look, Garden-toy plastic. The owner has been shown the toy and has not answered, so the game is built on at the builder's own risk: everything that is not drawing is outside the view (`game.ts`, `yardMotion.ts`, `scenes.ts` and the rules), and a rejected look costs `stage.ts`, `yardView.ts` and the model files.
- Renderer: three.js (raw). The fullest yard is 37 draw calls and about 64,000 triangles with a stream running; no shadow maps and no post pass.
- What the Mount shows: the game, at `?chrome=0#/play/fire-truck-hero`. `seed=<n>` fixes its random stream for stills. `spike=1` shows the fullest yard standing still and taking no touch.
- Open: sheet ready for check, round 4
- Open: the owner's answer on the look and the toy.
- Open: two requests to the lead, below.
- Not run, and why: the shared perf probe (it launches an installed Chrome by channel, which this machine has not got) and any frame rate (no graphics card). The intersection audit was run with this machine's own Chromium, by pointing Playwright's browser folder at it from outside the repository.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The parts below belong to the block.

### What the lead should try first

1. A first visit with no age: `?chrome=0#/play/fire-truck-hero` with an empty slot. Touch nothing for ten seconds: the truck shows the fire with one small spit, a blue ring comes round the fire, and a ghost hand taps it. Then three taps on the fire, and watch the ending.
2. Ring the bell three times and watch the drive. Then hold a finger on the bell in the next yard: the drive must play out under a held finger.
3. Put the game away in the middle of an ending and in the middle of a drive, and open it again: no scene replays, and after the drive the truck stands in the new yard.
4. The whole garden: put `{"v":1,"position":"whole-garden","finished":false,"yard":{"place":"whole-garden","arrangement":0},"seen":["fire","pool","seed","patch","boat","wheel","cat"]}` in the slot `tada-jam:slot:fire-truck-hero`. Fill the pool until it runs over toward the pot, hold the stream on the wheel, and soak the cat until she takes the truck's roof.
5. Listen. Nobody has heard any of it.

### Requests to the lead

1. **The registry row** for the look, in section 3 of `docs/art-direction.md`, and the ledger row to `claimed` after the merge. The text of the row is at the end of `ART.md`.
2. **The frame rates**, in WebKit and in throttled Chrome and at four times the pixels, on a real graphics card. The game reads the `tier` query. Everything measured here was on a software renderer.

### What changed in the sheet after round 3

**The two replacements of round 3**, pasted from the checker's report without a change, in commit `0d7b73a`: both under "Where the two differ", so that what is said of California at age 2 and of the Dutch peuter card is said of the records the sheet names and of no others. Neither touches the mechanic, the error, the designed order or the saved state, so nothing in the rules was reopened.

**Two sentences of the builder's own, changed after round 3 read the sheet**, for round 4 to check. Both are in "The scenes":

1. The fire's ending: "A cat who sat by the fire looks at the wet logs, then at the truck, and turns her back with her tail up. The truck settles on its springs, its nozzle droops and its light stops." in place of "Whoever is in the yard comes to look, each in its own way: the cat stalks round the wet ring, the snail sets off toward it, the duck waddles through the puddle. The truck settles on its springs and its light stops." Reason: no arrangement puts the snail or the duck in a yard with the fire, and the cat's part is what her fixed taste already says.
2. The duck's ending: "paddles along its own side of the pool, one way and back the other" in place of "paddles a lap round whatever else floats there". Reason: a lap round the boat would take the duck through the pool's wall; on its own side it meets nothing.

Round 3 read the gate "straight ahead of the truck" and found that it contradicts nothing.

**One word still open from round 1.** The cat climbs onto the truck's roof "with a scrabble of claws on tin", as pasted. In the look the truck is plastic. And where she sits is the hose reel at the back of the truck, which is the one place on it clear of the light and the nozzle.

**Where the rules settled what the sheet leaves open**, to be confirmed: when every spot is taken the soaked cat stays where she is; a boat carried over the rim stays aground beside the pool; a yard is judged "mixed" also when the child made a puddle on open sand; three taps a few seconds apart make a puddle, since a place counts as having had its fill at half a gulp short of it; and a held finger that rings the gate open does nothing more until it lifts.

### Template notes

One entry a copied file. "As copied" means byte-equal to what the generator made.

- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts` (frozen): as copied.
- `manifest.ts`, `index.ts`: as generated.
- `input.ts`, `guidance.ts`, `scene.ts`, `overlay.ts`, `audio.ts`, `state.ts` and their tests: as copied, and all now used in a running game. `state.ts` is wrapped by `save.ts` as its header says. `scene.ts` plays every scene of the game.
- `config.ts`: changed, as meant. `BACKDROP` is the yard's sky. `Tier` has three more fields (`detail`, `shine`, `drops`) with a row each, and each has a visible effect. `LADDER` holds the six places and `FIRST_VISIT` three rows. **For the template:** the generated `FIRST_VISIT` builds its second row with a spread on `OLDEST > YOUNGEST`; a band of three ages wants a row in the middle, and a comment saying rows may be added between would save the next builder a moment.
- `fire-truck-hero.tsx` (the Mount): changed at the places its comments name. The game is made when the slot has been read, `draw` has a case with no game (the sky), the idle ladder's result is kept and handed to the stage, and what the game changed is saved at one of the two speeds. **For the template:** (1) `resize` sets `canvas.width` and `canvas.height` itself; a three.js game must replace those two assignments with the renderer's own sizing. (2) A finger that comes back to a drag it had let go arrives as `dragMove` with no `press` before it, so a game whose press starts something that runs on has to take it up again on that move. (3) A scene that a held finger starts (here the drive, from a finger held on the bell) is ended by that same finger's next wobble if the game treats it as a touch. The game has to ignore that finger until it lifts. `scene.ts` could say so beside its rule about a rub.
- `scene.ts`, as copied, with one thing to know. **For the template:** a touch that ends a scene calls every beat that had not ended, at once. A beat that only makes a sound then makes every remaining sound of the scene in one frame. The game here plays no sound while it finishes a scene. The header's note on beats that lay things down could name sounds too.
- `audio.ts`, as copied, with one thing to know. **For the template:** before sound is unlocked, `play` keeps only the newest voice. A first touch that makes two sounds must send them as one voice, or the first is dropped.
- **Missing, for the template or the cloud page:** (1) nothing handles a lost WebGL context beyond what three.js does by itself. (2) The repository's Playwright asks for a browser build this machine does not have. Stills and the audit were run with the machine's own Chromium: stills through `executablePath` in a script outside the repository, the audit by making a folder outside the repository with the name Playwright asks for and a link to the machine's browser in it, and pointing `PLAYWRIGHT_BROWSERS_PATH` at that folder. (3) The harness writes a save to its slot only when the page has been idle, which under a paused clock may never come: a still script that reads the slot back sees the old state. The save had reached `ctx.storage`.

### For the owner to decide

- **The look**: Garden-toy plastic. And whether the truck should have a face in its windscreen, as it has now.
- **The toy and the game on it**: squirting a hose at things that each answer in their own way.
- **Sound**: the builder cannot hear. Every voice is numbers held to ranges by a test, and nobody has listened yet.
- **A fire for a two-year-old.** A small friendly fire that the truck puts out, with nobody in danger. The sheet keeps it as the story and claims no school skill for it.
- **Sand that dries by itself.** Damp sand goes pale again over a quarter to half a minute of play. Puddles and mud stay. It changes with time alone, kept to scribbles.
- **A seed that flowers in three gulps.** Faster than life, and said so in the sheet.
- **The joke is always on the cat.** She is put out and never hurt, and she has no feeling about the child.
- **A cat who is smaller in the boat and on the truck.** She is drawn at under half her size where she naps in the boat and at three quarters on the truck's reel, because at her size on the sand she would stand through both. She grows back as she walks off. It is a toy's liberty, and it shows.
- **A duck that taps a dry pool floor.** Its want shows by a tap of the beak every few seconds, heard three times after a touch and silent after that.
- **Defaults taken from the guide**, all kept: no camera shake and no impact pause, no speech, no symbol of any kind, no reading on any object.

## Pass log

Every still here is 1180 by 820 from Chromium on a software renderer (SwiftShader), on a paused clock with a fixed seed. A still shows layout, silhouette and colour. It says nothing about frame rate, and no frame rate was measured: that is the lead's. No physical iPad was measured.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | The spike, 1.2 s after the first frame. | As the child: the truck looks away and has no face, so it is a red box. Everything is small in a big pit. The pool's wall is in pieces and the bell is a yellow plate. The gate is a sliver at the edge. | One set, "big toys with faces": every toy scaled up to about 100 logical pixels or more, the truck's eyes moved to its windscreen with a ladder on its roof and the nozzle on the cab, the gate moved to the far fence, two lathe profiles turned the right way out, the camera closer and steeper with the hedges allowed to run off the sides. | Not measured. | The flames are flat orange. The far left eye of the truck is hidden by the turret. |
| 2 | The toy: a tap in the air, a sweep, a held spot, the idle cue at 5.7 and 6.3 s. | As the child: the water is thin blue leaves, not a fat jet. My tap leaves a small spot. My sweep leaves no line. The mud is a grey coin. I cannot see the ring on the sand, and the hand is a white blob. | One set, "water you can see": fatter drops less stretched, a gulp's blot about twice as wide, a stream that leaves a line, mud that is dark and lumpy, standing water kept out of mud, and the idle cue in blue with a hand that reaches in from the child's side. | Frame CPU only, below. | The hand's finger is short seen from above. A stream held still is mud after about four gulps, so the puddle shows for a moment only. |
| 3 | A honk, and a drawn zigzag 1.5 s after the finger lifted. | As the child: only the top of the truck jumps, its wheels are glued down. The line fades to dashes at once. | One set: the whole truck hops on a softer spring, lands once and bounces low; the stream's line is wider. | Not measured. | In a long toy session the mud patches add up, since nothing clears them. In the game a new yard does. |
| 4 | The game's first look: the whole garden played through (the pool filled and run over, the seed grown, the wheel held, the cat soaked), and the first drive. | As the child: I tap the pool and the boat fills up, not the pool. The pool looks full before I start. The wheel is a grey frame, I cannot see it turn. The boat is on the grass in one blink. The cat walks right through the pool. | One set, "what I tap is what gets wet, and nothing goes through anything": the boat lies at the side of the pool and the middle is the pool's; a cream pool floor so water shows; the wheel rebuilt as a paddle wheel leaning toward the child in two colours; the boat rides over the rim; the cat walks round what stands in her way. | Not measured. | The cat is small in the boat. The boat aground looks like litter. |
| 5 | The intersection audit's own pictures, over four runs: 56 findings, then 12, 3, 1 and none. | As the child: the cat sits inside the truck's blue light. The duck swims through the boat. The duck goes through the pool's wall. There is water inside the dry boat. The next yard's cat stands in the hedge while it slides in. | One set, "everything has its own place": the cat sits on the hose reel, clear of the light and nozzle, and jumps there in a high arc; the duck keeps to its side and rides over the rim in an arc; the boat's floor is thick; a yard that slides in is whole from its first frame; the fence stops short of the hedges; the barrel stays clear of the cab. 24 meant contacts are allowed with a reason and a cap each. | Not measured. | A boat that rolls over comes up out of the water to do it. |
| 6 | The cold playtest proxy on the production build, twice: the shell's default age (a pool, a boat and a duck) and a first visit with no age (the fire). The lists are below. | As the child: nothing tells me where to touch, the ring is under the pool. The hand taps the sand under the bell, not the bell. The duck behind the fence does nothing when I squirt it. The first water in the pool makes everything stop for a moment. | One set, "the cue is on the thing": the ring goes round the wanting thing and is wider than it; the hand presses at the height the thing's picture stands; the one who waits beyond the fence hops and answers; every program is compiled when the stage is made. | Frame CPU only, below. | The hand's cuff covers part of the bell while it presses. |
| 7 | A finger held on the bell, and the drive. | As the child: I hold the bell, the gate opens, and at once I am in the next yard. I never see the truck drive. | One fix: the finger that rang the gate open does nothing more until it lifts, and the stream stops with the yard it was for. | Not measured. | Nothing new. |

**The cold playtest proxy.** Production build, fresh slot, hands off for ten seconds and then a newcomer's minute, with stills.

*First run, the shell's default age.* What the scene invites with no touch: the pool, once the ghost hand shows it at six seconds. Unclear moments:

1. At four seconds nothing marks the pool: the ring lay on the sand under it. Fixed: the ring is wider than the thing.
2. The duck beyond the fence looks touchable and did nothing. Fixed: it hops and quacks when water lands by the fence in front of it.
3. The first gulp into the pool stalled the picture. Fixed: every program is compiled when the stage is made.
4. After the ending the next thing is the bell, and the hand tapped the sand under it. Fixed in the second run.
5. A boat carried over the rim lies beside the pool and reads as a thing dropped, not a thing to play with. Not fixed: it answers water as a boat on sand does.

*Second run, a first visit with no age.* What the scene invites with no touch: the fire, by the truck's small spit at two seconds, the ring at four and the hand at six. Unclear moments:

1. The hand pressed the sand under the bell. Fixed: it presses on the bell.
2. With the fire out, the yard is black logs and a bell: a child who goes on squirting the logs floats them, which is the grid's own answer.

Rerun after the fixes, the lists are: run one, item 5 only; run two, item 2 only.

**Frame CPU**, the one thing a machine with no graphics card can say. Production build, the toy's heaviest moment (a held stream swept round the yard with a honk now and then), tier 0 pinned, Chromium with the CPU throttled through the devtools protocol, the 95th percentile of the game's own work a frame from `window.__jamPerf.cpuMs`. Renderer: ANGLE on SwiftShader.

| Throttle | Viewport pixel ratio | Frames | Median | 95th percentile |
| --- | --- | --- | --- | --- |
| 6x | 1 | 347 | 4.2 ms | 7.7 ms |
| 6x | 2 | 108 | 4.4 ms | 11.5 ms |
| 4x | 2 | 109 | 3.4 ms | 10.6 ms |

One run each. The game's own work does not depend on the pixel ratio, so the first row, with three times the frames, is the better reading: under the jam's 8 ms at 6x, with little to spare. The two rows at a pixel ratio of 2 hold about a hundred frames each, so their 95th percentile is the fifth-worst frame and mostly measures the host.

Frame CPU for the game itself, in the whole garden, is not taken yet: it follows the audit runs below, in the next commit.

**The intersection audit.** `scripts/intersections/games/fire-truck-hero.ts` has 15 moments that reach every yard of the order from a saved state: each thing with a gulp, its fill, too much, a sweep and water from a neighbour; each ending; the worm; the cat's walk, her jump to the truck and the honk that sends her off; the marooned cat; the bell, the latch and the drive; a touch in the middle of a drive; and a rest. Water in the air, steam, ripples, shadows, the idle ring and the ghost hand are not audited: they fly through one another or are flat decals. What the audit cannot read is covered by tests on the model: `places.test.ts` (no way round passes through a thing), `layout.test.ts` (the truck's lane crosses no spot), `yardMotion.test.ts` (the snail's goal is clear of everything) and `thingMotion.test.ts` (every pose stays in bounds).

Runs so far: 56 findings on the first run, then 12, 3 and 1 as each set was fixed, and none on the fifth, with 24 allowed. The audit is set to `enforce: true`. The five `--ci` runs on the final build, two of them under CPU load, are under way as this is written; their result follows in the next commit.

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

- **Alive at idle.** The flame flickers, the truck's body bobs like a motor ticking over, it blinks and its eyes follow its nozzle, the cat breathes and flicks her tail, the duck bobs or taps a dry floor, the bee circles the pot and bumps the bud, and whoever waits in the next yard shows beyond the fence. The six plain things do not fidget. All of it runs on the attended clock and stops when the game is unattended or hidden.
- **Motion and sound on every touch.** Every place on the screen answers: a thing takes the gulp and answers with the grid's cell, the bell rings, the truck honks and hops, open sand goes dark, and the one beyond the fence hops. Each of the 35 cells has a motion of its own (`thingMotion.test.ts`, `animalMotion.test.ts`) and a sound no other cell has (`grid.test.ts`, `yardVoices.test.ts`). The sounds are synthesized.
- **Weight, squash and follow-through.** Everything with weight sits on a spring stepped on game time. The truck rocks back at every gulp and swings past level, the cat goes straight up stiff and lands, the pool is knocked like a drum when empty and sloshes when full, the boat rocks on its keel, the bell swings and dies away.
- **Kid-clear.** One to five big toys a yard, each a hue of its own, on plain pale sand. The six working things are plain and have no faces; the animals and the truck have them.
- **Wordless clarity for the declared age.** The band is 2 to 4 and the kid side has no word, letter, numeral or symbol; `npm run wordless:check` passes. Every touch works with a tap, no thing takes more than five gulps, nothing a child needs is in the bottom strip, and a held finger and a tapping finger reach the same things. One thing a yard wants water, and the truck's nozzle turns to it with a drop at its tip.
- **Wordless guidance.** A new kind of thing is shown once by the truck with one small spit, before any touch. After three seconds idle a blue ring breathes round the thing that wants water, and after five a ghost hand taps it once; once the want is met both go to the bell. It backs off, stops after four tries and vanishes on any touch.
- **60 fps on a mid-range iPad.** Not measured: no graphics card on the build machine and no physical iPad. Built to the budget: pixel ratio capped at 2, 37 draw calls in the fullest yard, no shadow maps, no post pass, geometry built once, every program compiled when the stage is made, the loop paused when unattended, four quality tiers that change drawing only, the grown-up overlay behind three taps in the top right corner or `fps=1`, and a counted frame-budget test (`frameBudget.test.ts`). Frame CPU under throttle is in the pass log.
- **Procedural or committed assets only.** No asset at all is loaded: every shape, colour, shadow and sound is made by code. `egress:check`, `egress:built` and `education:built` pass.
- **Its own art direction.** Garden-toy plastic, written up in `ART.md` under "The look", with the registry row's text at its end.
- **Nothing passes through anything.** The intersection audit is clean and enforced; see the pass log.
- **Found as left.** Water in the air lands when the game rests, each scene saves its outcome when it starts, no scene replays on load, the next yard waits for the child's touch, and nothing eases in (`game.test.ts`, `motionFaults.test.ts`). The largest save is far under half the cap (`save.test.ts`).

### The learning claim

As the sheet has it after three rounds of its check, with round 4 still to come: Fire Truck Hero is designed from five learning foundations published by California state departments for infants and toddlers and for preschool and transitional kindergarten, which are foundations and not standards, and from five bullets of the content cards of SLO, the Dutch curriculum institute, four for peuters and one for fase 1, which are guidance and not law. All ten records printed `confirmed` in the lookup on 2026-10-03; read them again on the day of the pull request. What the game is designed from them to offer is cause and effect with water. Guessing what the water will do and finding out by trying it is taken from the California foundations. Filling and the force of water are taken from the Dutch cards for peuters. Growing is taken from both: in California as watering that helps a plant grow, from age 3, and in the Netherlands as a plant that grows and flowers on the peuter card and as a plant's need for water on the fase 1 card. Its fire is a story and rests on no record. The records are named by pack id under "The records" in `ART.md`. Nothing in the game says what a child has reached.

### Defaults taken for the owner

- From the guide's list, all as written: no symbol and no numeral for a band that starts below 6, no letters and no written words, no reading on any object, no camera shake and no impact pause, no speech, and the look taken in the order the lead reserved it.
- From the sheet: a fire as the game's story; a seed that flowers in three gulps; damp sand that dries by itself while puddles and mud stay; a cat who is always the one the joke is on; one default only from the child's age, which is where a first visit starts.
- From the build: a cat drawn smaller in the boat and on the truck; a duck's tap heard three times and then silent; a held finger on the bell that does nothing more until it lifts.

### What the next builder should know

- **Compile every program when the stage is made.** The first water in the pool, the first steam and the ghost hand each brought a new program, and each first use stalled a frame: on the software renderer for ten seconds or more, enough to time out a still. Show everything for the moment, call the renderer's `compile`, and hide it again.
- **Put the way on where it crosses nothing.** The first gate stood where the truck had to cross the places things stand on to reach it. A gate straight ahead of the truck needs no path-finding and no allowance.
- **Two sets of models for a slide between scenes.** The yard that leaves and the yard that arrives are on screen together, and both may hold a pool. Building every model twice and swapping the two sets costs a little memory and no draw calls.
- **Settle the motion of what slides in.** A new yard's motion that is made and not settled leaves every animal at the origin until the slide is over.
- **A thing in a thing needs its own place and its own reach.** A boat in the middle of a pool takes every tap meant for the pool. Lay it to one side, and let the smallest thing whose reach holds the point win.
- **A child touches the picture of a thing.** The stage tests the finger's ray against a ball round each tall thing before it asks the ground, and the ghost hand presses at the height the picture stands.
- **An idle cue must be wider than the thing it marks**, or it lies hidden under it.
- **Tests for motion find real faults.** A second pair of eyes writing tests from the sheet found seven: two cells with the same motion, two animals with the same tempo, a flick that turned a wheel a whole turn, a jump in one frame, three things that eased in on load.
- **Lathe profiles have a direction.** Run every profile from the bottom of the outside to the top, and down the inside last.
- **Count frames before reading a 95th percentile** on a software renderer.
