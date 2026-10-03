<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: toy. Run 3 built it on the rules and the look of run 1.
- Look in use: first reserved choice, Blueprint and balsa.
- **What the lead should try first:** open `?chrome=0&seed=7#/play/bridge-crew`. (1) Drag from the left lip across the gap: one plank, and it swings down and knocks on the bank. (2) Tap the tube pile, then drag from the top of the rock straight up to the plank's end: the plank comes back up and stands. (3) Tap any part; tap it again while it rings. (4) Rest a finger on a pin for half a second. (5) Close a triangle of sticks and watch the chief; then build a square. (6) Take your hands off for five seconds. `spike=1` in the address shows the still spike of run 1, and `tier=3` the lowest tier.
- Sheet check, round 1 (checker: B): open, 14 findings; all pasted at `b7c2270`.
- Sheet check, round 2 (checker: D): open, 5 findings, read against sha256 `1f16834c…40a9`. All five replacements are pasted as written, at commit `4f2a5d5`. No finding was refused. Finding 5 replaced the arch sentence that was my own.
- Sheet now: commit `4f2a5d5`; sheet part sha256 `c6a42b6e2f236978d4e4395b156c55cde2f0318eba9cf664508fc14a766f3e5e`.
- Rules after round 2: brought into line at `1340c60`. Finding 3 changed a rule (the chief's two models are filled from the two differences nearest the trolley), finding 4 changed the saved state (a sheet's entry remembers that its job vehicle was sent home). Finding 2's rule already matched and has a new test. Findings 1 and 5 are text only.
- Renderer: canvas 2D with the game's own solver (`frame.ts`). matter.js is not used.
- The guide, the cloud page, the toy page and the pilot notes did not differ on anything this run met.
- Open: sheet ready for check, round 3

**What the toy holds.** Of the grid's six objects and five gestures: the plank, the stick, the tube, the thread and the pin, each laid, plucked, turned and taken off, with the sound and the motion its cell names. It does not hold the Load column or the test trolley, and no vehicle stands at the bank: a load brings the give, which is a scene of the game. They are left out, not stubbed. A first visit opens on the free yard (`TOY_SHEET` in `config.ts`), the one sheet with the whole kit; the designed order, the judging and the scenes are in the rules and unwired.

**No one has listened.** Every sound is numbers held to a range by tests (`voices.ts`) and played through `audio.ts` (`sound.ts`). Nobody on this machine can hear, so loudness, pitch and whether a clack sounds like a clack are unchecked.

What is open besides the check:

- **Waiting for the lead:** the round 3 check; the owner's answer on the look and the toy; the commit that holds `symbols.ts`; frame rates on a real graphics card; a registry row for the look when it is accepted.
- **Measured here, on the software renderer, for comparison between passes only:** the game's own work in a frame on the production build, top tier pinned, 1180 by 820 at pixel ratio 2, a bridge of eight parts being plucked: median 0.6 ms unthrottled, 2.8 ms at four times CPU throttle, 4.4 ms at six times (Chromium, SwiftShader). This is not a frame rate and says nothing about an iPad.
- **Findings not fixed:**
  - Only the first variant of each position has a bridge in the tests that crosses it.
  - Taste thresholds (`TASTE`) and part strengths (`kit.ts`) are first values. With no load in the toy, a part gives only under its own weight, which the yard's kit rarely reaches, so a give has no picture yet.
  - The hold that takes a pin out is shown by nothing: the ghost hand shows a lay and a pick only. A part hanging loose shows a small ring where its pin was, and a tap there puts the pin back.
  - A swinging part is kept out of the ground (a test measures it) but not out of other parts or the tray: a long chain can swing across the tray's box.
  - While a new part is dragged out, what is already built does not yet lean toward it, as the sheet's toy heading says it does.
  - The thirds of the sheet above the cliffs are empty until a child builds up there.
  - The model's limits from run 1 stand (first-order theory; a straight run of threads through a free pin counts as not held).

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

- `bridge-crew.tsx` (the Mount): changed as the pilot notes say. The toy is built when the slot has been read and the load draws once itself; `draw` has a case with no state (the bare sheet colour); voices the toy queued are played inside the gesture handler and again after the step in the loop; a change is saved at the throttle; what `ladder.update` returns is kept and handed to `draw`; `seed=<n>` is read from the address; a press in the grown-up's corner is not passed on. **For the template:** all of this could be in the copied Mount as comments turned into code: every game rewrites the same eight lines.
- `config.ts`: `Tier` has a second field, `grain`, with a visible effect on the two lowest tiers; `TOY_SHEET` names the sheet a first visit opens on while the game is a toy.
- `state.ts`: as copied, wrapped by `save.ts`. **For the template:** an exported `isRecord(raw)` would save each wrapper its own.
- `input.ts`: as copied. **For the template:** a lift is followed by a 300 ms grace in which a finger coming down within 140 px carries on the same drag. For a game where one drag follows another from the place the last one ended (a part laid from the end of the part before), two quick drags join into one. It did not need changing here, but a scripted walkthrough must wait out the grace between drags, and a fast child may meet it.
- `guidance.ts`, `audio.ts`, `overlay.ts`: as copied. `scene.ts`: as copied and not used yet.
- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`: frozen, untouched.
- The game's own modules. Rules: `kit`, `frame`, `sites`, `run`, `vehicles`, `order`, `save`, `grid`, `consequence`, `voices`. Toy: `pose`, `motion`, `layout`, `toy` (all pure), `sound`, `view`. Look: `look`, `sheet`, `figures`, `spike`. `bridges.fixture.ts` is for tests only.
- **For the cloud page:** the Playwright in `node_modules` asks for a newer browser than the machine has; `chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })` works with no install.

### For the owner to decide

- **The look**: Blueprint and balsa, as the toy shows it.
- **The toy**: laying parts pin to pin, with no load and no vehicle yet. Is building, plucking and watching a shape hold or fold a pleasure by itself, or does it need the trolley's weight before it is one?
- **The drawn dip.** The model's dip is drawn six times larger, by one fixed factor. Acceptable in a game that is true where it claims to be science?
- **The tracing's second line** (game stage): a picture of how a traced design would dip, or a reading on the object?
- **More than one "better"**: the jelly truck likes a soft deck.
- **The hold on a pin.** Taking a pin out needs a finger to rest on it for half a second. It is the only hold in the game.

## Pass log

One row per pass. Passes 1 and 2 were on the spike and pass 3 on the toy, all on the software renderer; no frame rate could be taken here.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | The spike at 1180 by 820, pixel ratio 2, 1.5 s after load | "I can see it is a plan of a bridge and the sticks look real. The little truck is tiny and I cannot see its face. There is hardly any water. The box of parts sits on the edge of the paper." | Sizes: van and chief drawn larger with a face in pencil; water raised and firmer; tray moved inside the border | Not measured (software renderer) | Upper third of the sheet empty; piles in the tray do not show how many are left |
| 2 | The same still after the fix set | "The truck looks worried about the gap, good. The bird is funny. I want to pull a stick out of the box." | None | Not measured | Nothing moves; no strain or dip to see at rest; other sheets not looked at |
| 3 | The toy on the dev build at 1180 by 820, pixel ratio 2, seed 7: at open, a bridge folding, a bridge built, a part being laid, a pluck, ten seconds idle | "The planks fell down and swung, that was good, but one went right through the wall and another hung under the floor. I cannot tell a plank from a stick once it is on. The stick box is just a dark block. The bird pecking its little triangle when I made one is funny. Nothing told me I could hold a pin." | What a part looks like and where it may go: planks drawn thicker than sticks; a pile's shadow under the whole pile; a hanging part leans on the ground and a swinging one knocks on the bank and comes back; each link of a chain carried by the part above it. (Also fixed before this row: parts that had never been turned were drawn at the corner of the screen; a new part landed already hanging. And after it: the ghost hand's part lay against the chief's model, so it now lays on the far bank.) | Not measured (software renderer). Work in a frame: median 0.6 ms, 4.4 ms at six times throttle | No load, so plucking plays small forces; the hold on a pin is shown by nothing; a chain can swing over the tray; the built parts do not lean toward a part being dragged; nobody has heard it |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

As the toy stands. Each line says what exists.

- **Alive at idle:** the crew chief does one of five things every few seconds and breathes and blinks between them; the water's dashes drift; the loose end of the string sways; a hanging part swings a long while. All of it stops while unattended or hidden.
- **Motion and sound on every touch:** a press is answered where it lands: a pin clicks in, a part lifts, a pile stirs, the chief starts. Every gesture the toy holds has its own voice. Nobody has heard them.
- **Weight, squash, follow-through:** a part lands from above with its shadow a beat behind and overshoots once; a part with nothing to hold it swings and knocks on the bank; the chief draws back before it reaches.
- **Kid-clear:** four kinds of part that read apart by depth, thinness, roundness and line, plain on one blue; the pile last picked stands proud in corner marks.
- **Wordless clarity for the declared age:** no word, letter, numeral or sign is drawn; `npm run wordless:check` passes.
- **Wordless guidance:** after three idle seconds the pins and the piles are ringed; after five a ghost hand lays a part on the far bank, away from the gap, and on its next turn picks another pile. Any touch clears it.
- **60 fps:** not measured. One full-surface stamp a frame; the rest is small sprites; a test bounds the canvas calls for the fullest bridge. Adaptive quality and the grown-up overlay are the template's.
- **Procedural or committed assets only:** everything is drawn and synthesized in code.
- **Its own art direction:** Blueprint and balsa, in `ART.md` under "The look".

### The learning claim

As the sheet has it at `4f2a5d5`, read through the lookup on 2026-10-03: designed from five California State Board-adopted science standards on engineering design (`us-ca 3-5-ETS1-2`, `us-ca 3-5-ETS1-3`, `us-ca MS-ETS1-2`, `us-ca MS-ETS1-3`, `us-ca MS-ETS1-4`; all confirmed), and from four goals of SLO's curriculum guidance for fase 2 and fase 3 (`nl ojw/nattech/3/01/fase2`, `nl ojw/nattech/3/02/fase2`, `nl ojw/nattech/3/01/fase3`, `nl ojw/nattech/3/08/fase3`; guidance, not law; all confirmed) and the Dutch legal core goal 45 of 2006 (`nl 45`; still in force; an end-of-primary goal; confirmed). From the California standards it takes the loop of fair test, failure, improvement and comparison, and it does not teach structures on their authority. The plank on edge standing for the profile is the game's own reading, beyond the Dutch records. The check states are to be read again on the day of the pull request. No attainment claim.

### Defaults taken for the owner

- No symbol stands alone; no reading on the object (no number for sag, force, length or part count).
- No letters and no written words.
- No camera shake and no impact pause.
- No speech; the characters will have invented, synthesized voices.
- The look is the lead's first reserved row.
- The demo `draw-a-bridge` got a new verb (pin-to-pin parts in place of a free-hand stroke) and keeps its feel: a line that becomes a solid thing with weight.

### What the next builder should know

- A kit of pin-jointed parts needs no physics engine. A plane frame solved at rest (about 300 lines, `frame.ts`) gives who carries what, where it dips, which part gives first and whether the shape is held, in a few milliseconds, and it is the same every time. Tests hold it to textbook results.
- "Is the shape held?" is the hard part. Solve with a tiny stiffness added everywhere and a small fixed nudge both ways: whatever moves by cells and not by hundredths is not held. Leave those parts out and solve again.
- The model corrected the builder more than once: a post above a hinge with threads down to the banks cannot hold it (the threads would have to push); a beam balanced on one prop lifts its far end, so a thread there goes slack. Write the fixture bridges before trusting a design in the sheet.
- Keep one bridge per position in a fixture and cross it in a test. It caught kits that could not span their own gap.
- The check asked for a stored thing behind every "stays" in the sheet (a hat, a loose end, a parked vehicle). Write the saved-state table last and walk every such word against it before asking for the check.
- A test that every number handed to the canvas is a real number would have saved a pass: a part that had "never been turned" had been turning for an infinite time, and zero times the sine of infinity is not zero. The view test now feeds the view a recording pen in every state and checks.
- Keep a part's rest (where it should be) apart from its springs (where it is), and let a part that loses its hold keep its place and swing on from there. Then folding costs no special case.
