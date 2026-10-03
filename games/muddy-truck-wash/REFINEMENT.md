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

No pass yet. One row per pass: what was looked at, the critique written as the child, the one themed fix set, what was reverted, the measured frame rate, and what is still weak.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |

## For the pull request

Written as the game is built; the lead builds the pull request from it.

### How the game meets the quality bar so far

- Nothing is drawn yet. Each line of the bar is filled in here as it is met.

### What the next builder should know

- Node 24 is not on the cloud machine by default: `nvm install 24` in `/opt/nvm`, then put its `bin` first on `PATH` in every command, since the shell does not keep it.
- Read the records with `npm run -s education:find -- --id <pack id>` and then the file it names; the Summary or gloss and the Limits are all a sheet needs.
