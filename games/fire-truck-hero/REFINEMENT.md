<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: game, being built on the toy. The owner has been shown the toy and has not answered; the lead has the lanes build on. The Mount now shows the game: a yard of things that answer the hose, the bell on the gate, and the drive to the next yard. Tests for the game's own modules, the scenes' saves, the audit and the passes are still to come in this run.
- Sheet, round 1: checked by checker B, outcome open with 11 findings. All eleven replacements are pasted as they stand, in commit `0b2db37`. None was disputed.
- Sheet, round 2: checked by checker D, outcome open with 3 findings. All three replacements are pasted as they stand, in commit `98fb2e4`. None was disputed. The game's rules keep no spot for the duck, the snail or the logs, so both replacements of finding 1 are pasted.
- Sheet, as it stands now: commit `cd41e93972c62a4116629321d76e3e643c56a3f7`. The hash of its sheet part is `ff852ea5c8f4f22fceea0f556600570110a84060f7d6f90ed020b1e5348649ec`. It holds the pastes of both rounds and one sentence of the builder's own that changed after round 2, below.
- A correction: the status block of commit `9a3a3b0` gave a wrong ending for the round 1 hash. The text round 1 checked is the text of commit `471110b`, with the hash the checker's report names.
- Look in use: the first reserved look, Garden-toy plastic. The spike is clear at age two on a software-rendered still: a few big separate toys, each a hue of its own, on plain pale sand. The second look was not needed and not spiked. The frame rate of the spike is the lead's to take.
- Renderer: three.js (raw), as the brief suggests. 10 draw calls and about 38,000 triangles in the heaviest moment of the toy; 20 draw calls and about 44,000 triangles in the spike.
- What the Mount shows: the toy, at `?chrome=0#/play/fire-truck-hero`. The look spike, for the still at 1180 by 820, is at `?chrome=0&spike=1#/play/fire-truck-hero`. Both use fixed seeds.
- Rules: pure modules, tested and not wired into the Mount: `things.ts`, `grid.ts`, `world.ts`, `tastes.ts`, `yards.ts`, `save.ts`, with `ground.ts` and `layout.ts` under them. Written against the sheet at `471110b` and brought into line with the sheet as it stands now. A finding in round 2 on the grid, the designed order, the error or the records reopens them.
- Open: sheet ready for check, round 3
- Open: the owner's answer on the look and the toy.
- Open: two requests to the lead, below.
- Open: the truck's want at rest (its nozzle turned to what wants water, a drop at its tip) and the bee at the closed bud are in the sheet and in `tastes.ts` as cues, and are not drawn yet. They belong to the game on the toy.
- Not done, and not in this run's brief: the game on the toy (the things in the yard answering water, the wants, the scenes, the gate, the saved yard), the audit config `scripts/intersections/games/fire-truck-hero.ts`, the cold playtest proxy, and the perf runs through the shared probe.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The parts below belong to the block.

### Requests to the lead

1. **The registry row** for the look, in section 3 of `docs/art-direction.md`, and the ledger row to `claimed` after the merge. Proposed row: Game "Fire Truck Hero"; Style "Garden-toy plastic 3D: fat blow-moulded toys with a mould seam and screw bosses, sun-faded primaries with a satin shine, on a pale sand pit inside a cream picket fence and green hedges, in daylight"; Art guide `games/fire-truck-hero/ART.md`.
2. **The frame rates.** Every number here was taken on a software renderer. The spike's frame rate at a pixel ratio of 2, and the toy's in WebKit and in throttled Chrome, are the lead's to take on a real graphics card. The game reads the `tier` query, so the shared probe can pin a tier.

### What changed in the sheet after round 2

**The three replacements**, pasted from the checker's report without a change: what is saved of the animals and where each is put on load (lines 112 and 118 of the sheet as checked); which marks on open sand dry and which stay, with the saved grid's states named (lines 26 and 113); and the school skill said for the ten records named and no others, with filling, the force of water and growing as its outcomes (line 159).

**One sentence of the builder's own, changed after round 2 read it.** In "The scenes", under how a cycle ends: "The gate stands in the far fence, straight ahead of the truck, with a bell hanging out over the sand from its post, and over the fence beside it the next yard shows:". Round 2 read "toward the right" there and found it sound. Reason for the change: the truck drives on through the gate, and from its place any way to a gate on the right crosses the spots where things stand. Straight ahead of the truck it crosses none (`layout.test.ts` holds that).

**One word still open from round 1.** The cat climbs onto the truck's roof "with a scrabble of claws on tin", as pasted. In the look the truck is plastic.

**What followed in the code.** A snail found on load is on its patch and out, however far it had glided (`game.test.ts`). The duck, the snail and the logs are placed from the gulps of the thing they belong to. Puddles and mud on open sand stay; damp sand dries.

Rounds 1's pastes and the three sentences added then are in the history of this file at commit `751dd34`.

Two smaller points the rules settled where the sheet is silent, to be confirmed with the game: when every spot is taken the soaked cat stays where she is, and a boat carried over the rim stays aground beside the pool. And one rule is wider than its sentence: a yard is judged "mixed" also when the child made a puddle on open sand, since the dry ground is a thing of the grid with a fill.

### Template notes

One entry a copied file. "As copied" means byte-equal to what the generator made.

- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts` (frozen): as copied.
- `manifest.ts`, `index.ts`: as generated.
- `input.ts`, `guidance.ts`, `scene.ts`, `overlay.ts`, `audio.ts`, `state.ts` and their tests: as copied. `scene.ts` is not used yet. `state.ts` is wrapped by `save.ts` as its header says.
- `config.ts`: changed, as meant. `BACKDROP` is the yard's sky. `Tier` has three more fields (`detail`, `shine`, `drops`) with a row each. `LADDER` holds the six places and `FIRST_VISIT` three rows. **For the template:** the generated `FIRST_VISIT` builds its second row with a spread on `OLDEST > YOUNGEST`; a band of three ages wants a row in the middle, and a comment saying rows may be added between would save the next builder a moment.
- `fire-truck-hero.tsx` (the Mount): changed at the places its comments name: the stage is made once, `applyTier` and `draw` call it, `act` turns gestures into the hose, the loop steps the toy, and going to rest lands the water in the air. Two things had to change that the comments do not name. **For the template:** (1) `resize` sets `canvas.width` and `canvas.height` itself; a three.js game must replace those two assignments with the renderer's own sizing, or the two fight. A comment there would say so. (2) A finger that comes back to a drag it had let go arrives as `dragMove` with no `press` before it, so a game whose press starts something that runs on (a stream, a rub) has to take it up again on that move. `input.ts` says a drag survives a lift; it does not say that the game sees no new press.
- `audio.ts`, as copied, with one thing to know. **For the template:** before sound is unlocked, `play` keeps only the newest voice. A first touch that makes two sounds (here the hose and the pop of water starting) must send them as one voice, or the first is dropped. The header could say so. `tick` is no longer used by the Mount.
- **Missing, for the template or the cloud page:** (1) nothing handles a lost WebGL context; this game does not either yet. (2) The repository's Playwright asks for a browser build this machine does not have. Stills were taken with the machine's own Chromium through `executablePath`, with a script kept outside the repository. (3) The shared perf probe launches the installed Chrome by channel, which a cloud machine has not got, so frame CPU here was read with a small probe outside the repository, as the note on measuring without a graphics card allows.

### For the owner to decide

- **The look**: Garden-toy plastic, as in the spike. And whether the truck should have a face in its windscreen, as it has now.
- **The toy**: squirting a hose on sand, with a honk on the truck. Does repeating it please with nothing to achieve?
- **Sound**: the builder cannot hear. Every voice is numbers held to ranges by a test, and nobody has listened yet.
- **A fire for a two-year-old.** The brief gives the game a small friendly fire that the truck puts out, with nobody in danger. The sheet keeps it as the story and claims no school skill for it. The owner may want it gentler still, or want to see it before it is built.
- **Sand that dries by itself.** Damp sand goes pale again over a quarter to half a minute of play, so the sand is never used up. Puddles and mud stay. This is a thing that changes with time alone, kept to scribbles: is that the right side of the line?
- **A seed that flowers in three gulps.** Faster than life, and said so in the sheet. The direction is true and the speed is a time-lapse.
- **The joke is always on the cat.** She is put out and never hurt, and she has no feeling about the child.
- **Defaults taken from the guide**, all kept: no camera shake and no impact pause, no speech, no symbol of any kind, no reading on any object.

## Pass log

Every still here is 1180 by 820 from Chromium on a software renderer (SwiftShader), on a paused clock with fixed seeds. A still shows layout, silhouette and colour. It says nothing about frame rate, and no frame rate was measured: that is the lead's. No physical iPad was measured.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | The spike, 1.2 s after the first frame. | As the child: the truck looks away and has no face, so it is a red box. Everything is small in a big pit. The pool's wall is in pieces and the bell is a yellow plate. The gate is a sliver at the edge. | One set, "big toys with faces": every toy scaled up to about 100 logical pixels or more, the truck's eyes moved to its windscreen with a ladder on its roof and the nozzle on the cab, the gate moved to the far fence, two lathe profiles turned the right way out, the camera closer and steeper with the hedges allowed to run off the sides. | Not measured. | The flames are flat orange. The far left eye of the truck is hidden by the turret. |
| 2 | The toy: a tap in the air, a sweep, a held spot, the idle cue at 5.7 and 6.3 s. | As the child: the water is thin blue leaves, not a fat jet. My tap leaves a small spot. My sweep leaves no line. The mud is a grey coin. I cannot see the ring on the sand, and the hand is a white blob. | One set, "water you can see": fatter drops less stretched, a gulp's blot about twice as wide, a stream that leaves a line, mud that is dark and lumpy, standing water kept out of mud, and the idle cue in blue with a hand that reaches in from the child's side. | Frame CPU only, below. | The hand's finger is short seen from above. A stream held still is mud after about four gulps, so the puddle shows for a moment only. |
| 3 | A honk, and a drawn zigzag 1.5 s after the finger lifted. | As the child: only the top of the truck jumps, its wheels are glued down. The line fades to dashes at once. | One set: the whole truck hops on a softer spring, lands once and bounces low; the stream's line is wider. | Not measured. | In a long toy session the mud patches add up, since nothing clears them. In the game a new yard does. |

**Frame CPU**, the one thing a machine with no graphics card can say. Production build, the toy's heaviest moment (a held stream swept round the yard with a honk now and then), tier 0 pinned, Chromium with the CPU throttled through the devtools protocol, the 95th percentile of the game's own work a frame from `window.__jamPerf.cpuMs`. Renderer: ANGLE on SwiftShader.

| Throttle | Viewport pixel ratio | Frames | Median | 95th percentile |
| --- | --- | --- | --- | --- |
| 6x | 1 | 347 | 4.2 ms | 7.7 ms |
| 6x | 2 | 108 | 4.4 ms | 11.5 ms |
| 4x | 2 | 109 | 3.4 ms | 10.6 ms |

One run each. The game's own work does not depend on the pixel ratio, so the first row, with three times the frames, is the better reading: under the jam's 8 ms at 6x, with little to spare. The two rows at a pixel ratio of 2 hold about a hundred frames each, so their 95th percentile is the fifth-worst frame and mostly measures the host.

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it. The game is at the toy stage, so several lines say what is there so far and what is still to come.

### How the game meets the quality bar

- **Alive at idle.** The truck's body bobs like a motor ticking over, it blinks at uneven gaps, and its eyes follow its nozzle. In the spike every thing idles in its own way. All of it runs on the attended clock and stops when the game is unattended or hidden. To come: the animals of each yard.
- **Motion and sound on every touch.** Every touch on the screen is answered: anywhere but the truck sends water there, with the hose's hiss, the landing's splat and a mark on the sand; the truck honks, hops and turns its light. No touch lands in silence. The sounds are synthesized.
- **Weight, squash and follow-through.** The truck rocks back on a spring at every gulp, swings forward past level and settles, squashes as it rocks and stretches as it hops. The nozzle overshoots. The landing point of a stream trails the finger like a real hose.
- **Kid-clear.** A few big toys, each a hue of its own, on plain pale sand of a contrasting hue. Every toy in the spike is about 100 logical pixels across or more at 1180 by 820. The background is a fence, hedges and two trees.
- **Wordless clarity for the declared age.** The band is 2 to 4 and the kid side has no word, letter, numeral or symbol; `npm run wordless:check` passes. Every touch works with a tap. Nothing a child needs is in the bottom strip. To come: one want a yard.
- **Wordless guidance.** After three seconds idle a blue ring breathes on open sand in front of the truck, and after five a ghost hand taps there once. It backs off, stops after four tries and vanishes on any touch. It shows on dry sand, wet sand and grass, and a test holds that. To come: the ladder pointing at a yard's want.
- **60 fps on a mid-range iPad.** Not measured: no graphics card on the build machine and no physical iPad. Built to the budget: pixel ratio capped at 2, 10 draw calls in the toy and 20 in the fullest yard, no shadow maps (blob shadows in one instanced mesh), no post pass, geometry built once, the loop paused when unattended, adaptive quality with four tiers, and the grown-up overlay behind three taps in the top right corner or `fps=1`. Frame CPU under 6x throttle is in the pass log. The frame rates are the lead's to take.
- **Procedural or committed assets only.** No asset at all is loaded: every shape, colour, shadow and sound is made by code. `egress:check`, `egress:built` and `education:built` pass.
- **Its own art direction.** Garden-toy plastic, written up in `ART.md` under "The look", with a request to the lead for the registry row.

Also: the toy's rules of touch are tested without a renderer. `toy.test.ts` holds that the answer to a touch starts before any frame is played, `drops.test.ts` counts the work of the heaviest stream, and `voices.test.ts` holds every voice inside stated ranges of pitch, loudness and length.

### The learning claim

As the sheet has it after its first check, with round 2 still to come: Fire Truck Hero is designed from five learning foundations published by California state departments for infants and toddlers and for preschool and transitional kindergarten, which are foundations and not standards, and from five bullets of the content cards of SLO, the Dutch curriculum institute, four for peuters and one for fase 1, which are guidance and not law. All ten records printed `confirmed` in the lookup on 2026-10-03; read them again on the day of the pull request. What the game is designed from them to offer is cause and effect with water. Guessing what the water will do and finding out by trying it is taken from the California foundations. Filling and the force of water are taken from the Dutch cards for peuters. Growing is taken from both: in California as watering that helps a plant grow, from age 3, and in the Netherlands as a plant that grows and flowers on the peuter card and as a plant's need for water on the fase 1 card. Its fire is a story and rests on no record. The records are named by pack id under "The records" in `ART.md`. Nothing in the game says what a child has reached.

### Defaults taken for the owner

- From the guide's list, all as written: no symbol and no numeral for a band that starts below 6, no letters and no written words, no reading on any object, no camera shake and no impact pause, no speech, and the look taken in the order the lead reserved it.
- From the sheet: a fire as the game's story; a seed that flowers in three gulps; damp sand that dries by itself while puddles and mud stay; a cat who is always the one the joke is on; one default only from the child's age, which is where a first visit starts.

### What the next builder should know

- **Lathe profiles have a direction.** A profile that runs from the top down, or from the inside out, comes out inside out and is drawn in pieces. Run every profile from the bottom of the outside to the top, and down the inside last.
- **From a camera this steep, put what must be seen on the far edge, not the side.** A gate in a side hedge is a sliver, and what lies beyond it is off the screen. The far fence faces the child and has the world beyond it in view.
- **A child touches the picture of a thing, not the ground under it.** A tall thing's picture stands above its foot on the screen. The stage tests the finger's ray against the truck's own bulk before it asks the ground. The things of the game need the same.
- **An idle cue in white vanishes on pale sand.** The first ring was white and could not be seen. Pick the cue's hue against every surface in the scene and hold it with a test.
- **A fast sweep needs marks between the gulps.** Water that counts lands three times a second, which at a child's sweeping speed is a row of blots. The small drops of the stream carry no water in the model and leave the marks that make the line.
- **Count frames before reading a 95th percentile.** On the software renderer a 30 second run at a pixel ratio of 2 holds about a hundred frames. The same run with a viewport ratio of 1 holds three times as many and measures the same work.
