<!-- template: cartridge/REFINEMENT.md v1 -->
# Refinement log

## Status

- Stage: toy. The toy is in the look and runs: tap a tool, press or rub the vehicle. It waits for the owner's checkpoint.
- Sheet: in `ART.md` at commit `2f24260` (sheet part sha256 `64167625dec6f9e1821e04482569c2e21ea02080d10c06c93a0d1e06fec34ad7`, unchanged since; the look was written below it).
- Open: sheet ready for check, round 1
- Look in use: first reserved choice, enamel toy cars. Spike: the Mount shows the real scene at load with a fixed seed (Tipper in the bay at `dried-patches`, the fire engine at the door). Stills taken here at 1180 by 820 on software GL, kept outside the repository. Frame rate at DPR 2: not measured here; it is the lead's to take on a graphics card. At full quality the scene is 28 draw calls and about 35,000 triangles with the copy under the floor.
- Work built while the check runs, at the builder's own risk, against the sheet at `2f24260`: `surface.ts` (the table of what each tool turns each patch into), `mud.ts` (arriving mud by position), `silhouette.ts`, `reactions.ts`. A finding under the representation, the mechanic questions, the error, the designed order or the records reopens them.
- Requests to the lead: a row in the claimed-styles registry of `docs/art-direction.md` for this game once the owner has seen the look: "Muddy Truck Wash | Enamel toy cars 3D: die-cast vehicles in hard gloss enamel chipped to zinc, lamp eyes, on dark wet concrete in a teal tiled wash bay | `games/muddy-truck-wash/ART.md`".
- Findings not fixed: see "Still weak" under the pass log.
- Where this run differs from the cloud page: nothing.
- Machine: Node 24 installed with nvm (the machine came with 22). The pre-installed Chromium at `/opt/pw-browsers/chromium` was used for stills, with SwiftShader.

### Template notes

One line a file, kept current as each helper is used in the running game.

- **The Mount** (`game.tsx`): changed, in four places. (1) `resize` sized the canvas by hand; with three.js it calls the renderer's `setPixelRatio` and `setSize(w, h, false)` and then draws. (2) `draw` renders the scene. (3) `act` is the game's own. (4) A fault any three.js or tiered game will meet: the Mount applies a tier only through `resize()`, which returns early when the size and the pixel ratio are unchanged. A tier field other than `dpr` is then never applied, and on a display of ratio 1 no tier is. Fixed locally by calling the view's `setTier(governor.settings)` wherever `governor.sample` returns true, before `resize()`. The template should have a hook there.
- **`input.ts`**: used as copied. The game answers on `press` and lets go on `tap`, `pressEnd`, `dragLift` and `dragEnd`; `dragMove` carries the rub. Two things a builder should know: one finger works at a time, so a second finger on the vehicle does nothing; and a `press` is not followed by a `dragMove` until the finger has moved past `TAP_SLOP`, so whatever starts on `press` must not wait for a move. `countsAsDone` and `progressToward` are not used: a rub has no target and counts dab by dab.
- **`audio.ts`**: used as copied (`GameAudio`, `tone`). It lacks a noise source, which any game with scrubbing, spray or wind needs: added in the game's own `sound.ts`, with a player that turns a list of plain notes into a `Voice`. `tick` is no longer used. Candidate for the template: a `noise` beside `tone`.
- **`config.ts`**: changed as meant: `Tier` has `reflections` and `particles`, `LADDER` and `FIRST_VISIT` hold the game's ids, `BACKDROP` is the bay's dark.
- **`perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`** (frozen): used as copied through the Mount. `installJamPerf` reads the renderer's own `info.render` counts.
- **`state.ts`**: not used yet (the toy saves nothing).
- **`guidance.ts`**: the Mount still runs the ladder; nothing is shown from it yet.
- **`scene.ts`**: not used yet.
- **`ART.md` outline**: used as copied. The heading "The designed order, and what is stored" asks for the ids "as they stand in `config.ts`", so the ladder ids went into `config.ts` with the sheet, before any other code.
- **The generator**: the copy passed `npx tsc --noEmit`, the game's tests, the wordless check and the egress check untouched.

The stages in order are sheet, toy, game, gates. Someone with no session to read resumes from this block and the files.

### For the owner to decide

- The look, at the toy checkpoint: enamel toy cars as spiked.
- The toy: whether rubbing a tool over the vehicle is a pleasure with nothing to achieve.
- Nothing beyond the defaults in the guide, which the sheet works under as written.

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
