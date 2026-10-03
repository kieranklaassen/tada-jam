<!-- template: cartridge/REFINEMENT.md v1 -->
# Refinement log

## Status

- Stage: game, on the toy. The rules, the save, the four characters with their tastes, the errors as consequences, the idle ladder and the four short scenes are in and run. The toy still waits for the owner's checkpoint; the gates are not finished (see "Open").
- Sheet: in `ART.md` at commit `2f24260` (sheet part sha256 `64167625dec6f9e1821e04482569c2e21ea02080d10c06c93a0d1e06fec34ad7`, unchanged since; only the look was written below it).
- Open: sheet ready for check, round 1
- Everything from "the game on the toy" onward was built while the check runs, at the builder's own risk, against the sheet at `2f24260`: `surface.ts`, `mud.ts`, `silhouette.ts`, `cycle.ts`, `washState.ts`, `tastes.ts`, `reactions.ts`, `scenes.ts`, `guide.ts`, `play.ts`. A finding under the representation, the mechanic questions, the error, the designed order or the records reopens them.
- Look in use: first reserved choice, enamel toy cars. The Mount shows the real scene at load: with no saved slot it is always the same first visit (Tipper in the bay, the fire engine at the door, a fixed seed), so the lead can take the still at 1180 by 820. With the shell's child age at 4 the first showing plays in the first four seconds; with it at 2 or 3 the scene stands still. Frame rate at DPR 2: not measured here; the lead's to take on a graphics card. At tier 0 the scene is 27 to 30 draw calls and about 35,000 triangles, with no post pass and no shadow map.
- Open, the gates: the intersection audit is not yet enforced (see the pass log for where it stands); the cold playtest proxy has not been run on a production build; no frame rate is measured; no perf probe run (`npm run perf:jam`) has been made, since this machine has no graphics card.
- Requests to the lead:
  1. A row in the claimed-styles registry of `docs/art-direction.md` once the owner has seen the look: "Muddy Truck Wash | Enamel toy cars 3D: die-cast vehicles in hard gloss enamel chipped to zinc, lamp eyes, on dark wet concrete in a teal tiled wash bay | `games/muddy-truck-wash/ART.md`".
  2. The frame rate of the look at DPR 2 on a graphics card, and the loudness of the voices on a real machine (`voices.ts` holds every one as numbers; `voices.test.ts` holds the ranges).
  3. The template points under "Template notes" marked **for the template**.
- Findings not fixed: see "Still weak" under the pass log.
- Where the game differs from the sheet as written. The sheet is not edited while its check runs, so these stand here until the check's report comes back, and then go into the sheet as part of the next round:
  1. **The first showing.** The sheet has the vehicle brake with its nose under the hose on its hook and a drop fall from the nozzle. In the game the drop falls from a tap on the rack's long arm, which hangs over the vehicle's nose, and the vehicle only shuffles under it. With the drop falling from the hose the nose was hidden behind the rack at the moment that matters. The sheet also says the showing is for the first vehicle that ever rolls in with dried mud; on a first visit that starts on dried mud (a child of 4 or older) it plays for the vehicle already in the bay, in the first seconds.
  2. **The cloth on soft mud and on foam.** The sheet says it smears onto the clean paint beside it. In the game the cloth carries what it picked up along the rub: the next three clean patches under the finger get it, and then the cloth is clean. Smearing all around, as first built, turned a whole vehicle brown in one rub.
  3. **The seed.** The sheet says it picks the next vehicle and lays out its mud. It only lays out the mud: the roster comes in its own order, so every vehicle is back within four washes.
  4. **Small things in the grid.** A bare finger on foam pops bubbles and leaves no hole. A wet vehicle sent off leaves drops, not tyre lines. The fire engine has no wipers.
  5. **Which vehicle a new position lays out.** The position moves when a wash is judged, and the vehicle that then appears at the door is laid out for the new position; the one rolling in was already standing there with its mud. The sheet does not say which, and this is the one-cycle lag in the template notes.
- Where this run differs from the cloud page: `npx playwright install` was not run. The machine came with a Chromium (revision 1194) and an instruction not to download another; the repository's Playwright asks for revision 1243. Stills were taken with the installed browser by its path, and the audit was run by pointing `PLAYWRIGHT_BROWSERS_PATH` at a folder outside the repository that links revision 1243's file names to the installed one. Nothing in the repository was changed for this.
- Machine: Node 24 installed with nvm (the machine came with 22).

### Template notes

One entry a file. The other games wait for these.

- **The Mount** (`game.tsx`): changed, and it has one fault.
  - `resize` sized the canvas by hand; with three.js it calls the renderer's `setPixelRatio` and `setSize(w, h, false)` and then draws. `draw` renders the scene. `act` is the game's own.
  - **For the template (a fault):** the Mount applies a tier only through `resize()`, which returns early when the size and the pixel ratio are unchanged. A tier field other than `dpr` is then never applied, and on a display of ratio 1 no tier is. Fixed locally by calling the view's `setTier(governor.settings)` wherever `governor.sample` returns true, before `resize()`. The template needs a hook there.
  - The game is built when the slot has been read, not before: `play` is null until then and the bay stands empty. The template's `state` variable became the game object; the save callback of `SaveCadence` serializes from it.
  - The loading `then` has to draw once itself, with easing off, or a parked or resting game shows the empty bay until the next frame.
  - A scene playing is not idleness: the Mount calls `ladder.touch` while one runs, next to the template's own call for a working finger.
  - **For the template:** a save needs two speeds, and the Mount had one. A dab is saved at the throttle (`cadence.change(now)`); a scene's outcome is saved at once (`cadence.change(now, true)`). The game sets `dirty` and `urgent` and the Mount passes them on. `SaveCadence` already takes the flag; the Mount's comment could say when to use it.
- **`input.ts`**: used as copied. The game answers on `press` and lets go on `tap`, `pressEnd`, `dragLift` and `dragEnd`; `dragMove` carries the rub. Three things a builder should know:
  - One finger works at a time, so a second finger on the vehicle does nothing. The cue table allows up to three; for a two-year-old's whole hand on the glass one working finger is the safer rule.
  - A `press` is not followed by a `dragMove` until the finger has passed `TAP_SLOP`, so whatever starts on `press` must not wait for a move.
  - `countsAsDone` and `progressToward` are not used: a rub has no target and counts dab by dab, each one saved as it lands.
- **`audio.ts`**: used as copied (`GameAudio`, `tone`). **For the template:** it lacks a noise source, which any game with scrubbing, spray, wind or an engine needs. Added in the game's own `sound.ts`, with a player that turns a list of plain notes into a `Voice`; a `noise` beside `tone` would save every such game the same forty lines. `tick` is no longer used.
- **`state.ts`**: used as copied (`freshState`, `deserialize`, `serialize`, `finishCycle`, `beginCycle`, the position rules). The game's save wraps it in `washState.ts`. Three notes:
  - `deserialize` returns only the template's three fields, so a game with more reads the raw record a second time in its own wrapper. That works; the header could say it is the intended way.
  - In a game where the touch that ends a cycle also begins the next, `finishCycle` is followed at once by `beginCycle` and `finished` is false in every save. The sheet says so.
  - **For every game with a visible next customer:** the position moves when a cycle is judged, but the one who waits is already on screen with its mud, so the move shows on the customer after next. It is a one-cycle lag, not a fault; a sheet should say which customer the new position lays out.
- **`scene.ts`**: used as copied, for all four scenes. Four notes:
  - The game calls `finish()` first thing in every press, before the press is answered, so a touch ends the scene and is then an ordinary touch. A scene that a press starts must be started after that call.
  - A beat that lays things down as it goes (a trail, a row of glints) has to count what it has laid, since `play(1)` on a finish jumps its progress.
  - A scene set off by a dab (the shine) lets go of the finger first, or the rub that caused it would be read as the touch that ends it.
  - There is no way to queue a second scene after the first. Appending the second scene's beats with their `at` shifted worked (the first showing follows the roll-in that way).
- **`guidance.ts`**: used as copied (`IdleLadder`, `handPose`). What to show is the game's own `guide.ts`. **For the template, for ages 2 to 4:** `handPose` presses twice for a tap. A two-year-old who copies that taps twice, and a second tap on the same thing must then do no harm: here a second tap on a tool within 1.2 seconds keeps it in hand. A single press for the youngest band would be safer.
- **`config.ts`**: changed as meant: `Tier` has `reflections` and `particles`, `LADDER` and `FIRST_VISIT` hold the game's ids, `BACKDROP` is the bay's dark.
- **`perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`** (frozen): used as copied through the Mount. `installJamPerf` reads the renderer's own `info.render` counts. Under a paused test clock `performance.now()` stands still too, so `cpuMs` reads 0 in a stepped walkthrough.
- **`ART.md` outline**: used as copied. The heading "The designed order, and what is stored" asks for the ids "as they stand in `config.ts`", so the ladder ids went into `config.ts` with the sheet, before any other code.
- **`REFINEMENT.md` outline**: used as copied; "Template notes", "For the owner to decide" and "For the pull request" were added.
- **The generator**: the untouched copy passed `npx tsc --noEmit`, the game's tests, the wordless check and the egress check.
- **Not in the template, written here, wanted by every three.js game:** a grown-up overlay (`overlay.ts`, plain DOM, 70 lines, with a test); a way to make stills on software GL without stalls (see "What the next builder should know").

The stages in order are sheet, toy, game, gates. Someone with no session to read resumes from this block and the files.

### For the owner to decide

- The look, at the toy checkpoint: enamel toy cars as spiked.
- The toy: whether rubbing a tool over the vehicle is a pleasure with nothing to achieve.
- Whether the first showing may play at load on a first visit that starts on dried mud (age 4 and up). It is a first showing, not a replay, and it is marked when it starts; the guide says no scene replays on load and does not name this case.
- Nothing else beyond the defaults in the guide, which the sheet and the game work under as written: no symbol, no letter, no word, no camera shake, no impact pause, no speech.

## Pass log

Every still on this machine is software GL (SwiftShader) at 1180 by 820, taken on a paused clock with `Math.random` seeded, and kept outside the repository. No frame rate could be measured here: the column says so in each row, and the lead takes it on a graphics card.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1, the look spike | Tipper in the bay at `dried-patches`, the fire engine at the door, the rack, at 0.5 s | "A yellow truck with eyes. It is small and far away, the towel is a white box, and there are grey scratches all over its roof." | Camera lower and nearer; fewer chips; the bed's lip no longer cuts the cab roof; the cloth hangs as cloth; the copy under the floor only on the wet pad; upward faces give back a long light on the far wall | not measured (software GL) | paint read as plastic; nothing looked glossy |
| 2, the seven surfaces | One vehicle in bands of dried mud, soft mud, both foams, wet, dull and shiny paint | "The shiny bit and the dull bit are the same orange. The wet bit looks like foam." | Dull paint under a film of dust; polished paint deeper, with two crisp streaks of light; water as darker paint with beads and thin runs; foam a solid white with blue shade | not measured | the dust made every arriving vehicle look faded (lightened in pass 6) |
| 3, the toy | A scripted rub with the sponge, the hose and the cloth, stills mid-rub | "Bubbles! But the foam falls off in white flowers, and nothing is left on the floor." | Rounder blobs; what lands stays on the floor as water, mud or foam | not measured | the tool hovered where it was let go |
| 4, the scenes | The puddle, the send-off and the first showing, frame by frame | "The truck hides behind the hose when the drop falls. Its eyes are covered in mud. The red truck drives through the bucket." | Eyes are a material nothing covers; the rack stands toward the child, clear of the lane; a tap on the rack's long arm hangs over the nose, so the showing plays in the open; a dried patch on the nose at `dried-patches`, open to the sky | not measured | the first drop was small |
| 5, the idle ladder | The glow at 4.4 s and the hand at 6 s and 16 s | "Everything went foggy. The hand points at the towel but the truck is muddy." | The hand shows the tool a wash takes up next, not the one with the most patches; the glow is on edges only | not measured | the glow still hazed the vehicles (fixed in pass 7) |
| 6, the intersection audit | Seven runs of the audit over 13 moments, 519 samples, 41 pieces | Not a child's critique: what passes through what. First run 44 open findings | Fixed as real: flush faces in Tipper's bed, on the tractor's mudguards, on the ladder and the door post; rear axles so close their tyres overlapped; a cloth and a sponge that dipped into the floor at a wheel; a tool left in the lane as the next vehicle drove in; a tool that crossed through the body between two far spots; the nozzle hanging through its coil. Allowed as meant, each with a reason and a cap: eyelids, pupils, the hinged bed, the body on its springs, a sponge or cloth pressed on paint, a tool on the rack | not measured | see "The audit" below |
| 7, the cold playtest proxy | The production build, cold, with the shell's default age: 10 s hands off, then a newcomer's minute, 44 stills | Six unclear moments, listed under "The cold playtest proxy" below | A cloth's smear is a short streak; Tipper's bed bounces; the glow is on the tools only and they swell with it; the hand reaches in from the open floor; a poke on paint throws dust; the first drop is bigger and the look at it longer | not measured | see the after list below |

### The audit

`scripts/intersections/games/muddy-truck-wash.ts` holds 13 moments that reach every state: the first showing, wetting and soaping, the sneeze, rinsing and drying, the puddle three times, a send-off after each vehicle, every tool on every part a taste belongs to for three vehicles, a touch in the middle of a send-off, and a rest.

- It was run with the installed Chromium (see "Where this run differs" in the status block).
- After the fixes of pass 6 it was run in sets of five, one set after each later change, some while other work loaded the machine. Every run of the last three sets was clean: 0 open, 519 samples, 41 pieces, 2 hidden. The number of allowed contacts was the same within a set but for one run (34, 34, 34, 34, 33): an allowed contact is a thing in motion, and a blink or a press caught a frame apart can fall on either side of the reporting floor. Across the runs the deepest allowed contact stayed under its cap with room: eyelids 1.61 against 1.8, a lid over a pupil 0.77 against 1.0, the sponge 0.15 against 0.3, a tool on the rack 0.11 against 0.2.
- What it cannot read is covered by model tests: `play.test.ts` (a scene's end state, a touch in the middle of one, the pool of flying things), `motion.test.ts` (a hinged part stays between shut and its stop; nothing blows up on a long frame), `surface.test.ts` and `mud.test.ts` (no mud off the body).
- The flying things (bubbles, drops, crumbs, foam), the jet of the hose, the ghost hand and the copy under the floor are ignored by name: they are drawn with no body.

### The cold playtest proxy

Run on the production build, served by `vite preview`, with a fresh slot and the shell's default child age.

**Hands off, 10 seconds.** A muddy yellow dump truck with big lamp eyes faces the child in the middle of the screen; a red fire engine peeks in at the door on the right, and three tools hang on a rack on the left. Something is already going on: the truck shuffles forward, a drop falls from the tap onto its dried nose, the patch goes dark, and the truck goes cross-eyed at it. By 5 s it is back in its place, breathing and glancing at the sponge. From 8 s the tools glow, and at 10 s a pale hand shows one of them being touched.

**The newcomer's minute, before.** Unclear moments:

1. The hand lay on the sponge while its finger showed the hose: which one?
2. The glow lightened both vehicles all over and read as haze, not as "these can be touched".
3. The drop of the first showing was small and quick: the patch going dark was seen, the cause could be missed.
4. A bare finger on plain paint was answered by a sound and a bounce only: in a still nothing had happened.
5. Tipper's bed swung wide open at the first stroke of the sponge: it read as tipping, not as liking the foam.
6. One rub of the cloth over a rinsed vehicle with soft mud on it turned the whole vehicle brown, twice in the minute: it read as "the cloth makes mud", not "the cloth smears".

**After.** The same script was run again on a new production build and the two sets of stills compared.

- Gone: 1 (the hand reaches in from the open floor and its fingertip is on the hose alone), 2 (the vehicles are no longer lightened; the tools glow and swell), 5 (the bed bounces and stays down), 6 (the same rub of the cloth left one short dark streak on the fire engine and shone the rest; neither vehicle turned brown).
- Smaller, not gone: 3 (the drop is half as big again, splashes, and the vehicle stays cross-eyed at the patch for half a second longer; whether a child connects the drop with the dark patch is for a child to show) and 4 (a poke on plain paint throws three puffs of dust; in a still they are small).
- New: none seen in the after run.
- Added after the second run, from reading its stills: a tap on the bare floor or on the wall did nothing at all. The floor now answers by what is in hand (the hose wets it, the sponge leaves suds, anything else knocks up dust), and a tap on nothing still knocks. A third run has not been made.

### Still weak

- No frame rate, no WebKit run and no perf probe: this machine has no graphics card. The budgets are written (about 12 ms a frame, never under 45 fps, under 80 draw calls, pixel ratio 2 at most, no post pass); what is counted here is 27 to 30 draw calls and about 35,000 triangles at tier 0.
- The renderer asks for antialiasing. At pixel ratio 2 on an iPad that may cost more than it gives; if the lead's number is low, turning it off at tier 0 is the first thing to try (it is fixed at context creation, so it cannot be a tier).
- Nobody has heard a sound. Every voice is inside its stated range; whether a scrub sounds like a scrub is for the first listener.
- The hose in hand is a nozzle with no hose behind it.
- A bare finger on foam pops bubbles but leaves no hole in the foam, which the sheet's grid describes.
- The fire engine has no wipers to flap at soap in its eyes; it squeezes its eyes shut and blows bubbles.
- The ghost hand is a plain mitten.
- The tool in hand hovers where it was last used; after a send-off it waits above the bay.
- The floor keeps every mark of a visit and is never cleaned: after many washes the pad's front is all foam.
- Layout was only looked at in landscape at 1180 by 820. The camera backs off to keep the whole bay in view at any shape; a portrait surface has not been judged.

## For the pull request

### How the game meets the quality bar

- **Alive at idle.** Each vehicle breathes at its own rate, shakes with its idling engine, blinks on its own clock and glances at the thing it likes; the nozzle on the rack lets a drop go every few seconds. Nothing asks, flashes or beckons. All of it runs on the attended clock and stops when the game is unattended or hidden.
- **Motion and sound on every touch.** The answer starts on the press, in the same call (`play.test.ts` holds it): the patch changes, its own voice sounds, things fly, and the body dips toward the finger. The reactions table gives every hand on every surface its own answer, and a test fails if two cells answer alike.
- **Weight, squash and follow-through.** A body on three springs, tyres that flatten under the pressed end, a moving part thrown by the body's own jolts, a brake dip on rolling in, a pull-back before driving off.
- **Kid-clear.** One vehicle in the bay, one at the door, three tools, on a dark floor against a dark tiled wall; the vehicles carry all the colour.
- **Wordless clarity for the declared age.** No word, letter, numeral or symbol; no voice. One vehicle wants one thing. Each tool changes what it touches at once. Tool targets are 124 logical pixels across, the puddle's 132, none in the bottom strip.
- **Wordless guidance.** The template's ladder: the tools on the rack glow and swell, then a ghost hand shows one move (the tool a wash takes up next, one short rub, or a touch on the vehicle at the door), backs off, and stops. Any touch clears it.
- **60 fps on a mid-range iPad.** Not measured on this machine. Built for it: pixel ratio capped at 2, 27 to 30 draw calls, no shadow map, no post pass, geometry built once at mount, one shader for every solid thing, the loop paused when unattended. Four tiers shed the pixel ratio, the copy under the floor and the number of flying things drawn.
- **Procedural or committed assets only.** Everything is built in code: shapes, the matcap, the noise, the sounds. No file is fetched.
- **Its own art direction.** Enamel toy cars, as `ART.md` describes below the sheet.

Frame rates for the pull request: none from this machine. Engine, throttle, pixel ratio and build are the lead's to state. No physical iPad was measured.

### The learning claim, as the sheet has it

Muddy Truck Wash is designed from four California learning foundations published by a state department and five pieces of guidance from the Dutch curriculum institute, named with their standing and check state in `ART.md` under "The records". All nine were confirmed when read on 2026-10-03; the check state is to be read again on the day of the pull request. The game claims nothing about what a child has reached.

### Defaults taken for the owner

Every default under "Symbols, and the defaults awaiting the owner" in the guide is kept as written: no symbol, no letter, no written word, no reading on an object, no camera shake, no impact pause, no speech (the vehicles' voices are synthesized noises).

### What the next builder should know

- Node 24 is not on the cloud machine by default: `nvm install 24`, then put its `bin` first on `PATH` in every command, since the shell does not keep it.
- Read the records with `npm run -s education:find -- --id <pack id>` and then the file it names; the Summary or gloss and the Limits are all a sheet needs.
- The machine may come with a Chromium that is not the revision the repository's Playwright asks for. Stills work with `chromium.launch({ executablePath })`. The audit script launches its own browser: a folder outside the repository with the expected revision's folder and file names linked to the installed browser, named in `PLAYWRIGHT_BROWSERS_PATH`, let it run unchanged.
- Software GL falls behind a clock stepped faster than it can draw: frames queue up, and a later screenshot waits half a minute for the backlog and times out. Read one pixel back with `gl.readPixels` after every step of the clock and the stall is gone. For a still, step one more frame and take the screenshot straight after it, or it can come out blank.
- The audit is the best reviewer of geometry there is. Its first run found faces lying in one plane, overlapping tyres and tools dipping into the floor that no still had shown. Run it as soon as there is a scene, with `userData.jamObject` on each character's root and `userData.jamInstanceObjects` on its instanced parts.
- A finding that comes and goes between runs is a thing in motion caught at different moments, not noise: here it was a tool crossing through the body between two taps.
- Play the game headless in a test before anything else can play it. A test that tapped at random for 400 taps found a fault in the save that no walkthrough would have.
- The cold playtest proxy found the worst fault of the build (a cloth that turned the whole vehicle brown) in its first minute. Run it before the audit, not after.
