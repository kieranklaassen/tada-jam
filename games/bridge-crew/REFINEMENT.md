<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: gates. Run 4 built the game on the toy.
- Sheet the game stands on: round 4, as pasted. Commit `55b19cb`; sheet part sha256 `2ec1e59ab4516efa6b02745fc8117d801e0efede06b7be2c900c97a365f2ca42`.
- Sheet check, round 4 (checker: F): open, 2 findings, read against sha256 `6a615151…22d1`. Both replacements are pasted as written at `55b19cb`. No finding was refused. Round 4 read the row `across` that I had added myself, and both findings bring its neighbours into line with it.
- From the lead, pasted in the same commit: under "The band and its age rule" the sentence on the numerals now says that both are drawn through the game's own `symbols.ts` and nowhere else. The game does draw both (the count beside a vehicle's crates in `fleet.ts`, the count beside the trolley's weights in `props.ts`), and no other file draws text.
- Rules after round 4: nothing to change. The rules already kept a vehicle on one bank only, let either vehicle be sent home, and kept the newest sheet's parked vehicles while it lies on the rack; a new test in `save.test.ts` holds all three.
- Earlier rounds: round 1 (B, 14 findings) pasted at `b7c2270`; round 2 (D, 5) at `4f2a5d5`; round 3 (E, 4) at `0a76b32`. No finding of any round was refused.
- Look in use: first reserved choice, Blueprint and balsa. Built on at the builder's own risk: the owner has seen the toy and has not answered.
- Renderer: canvas 2D with the game's own solver (`frame.ts`). matter.js is not used.
- The guide, the cloud page, the game page and the pilot notes did not differ on anything this run met.
- Open: sheet ready for check, round 5

**What the lead should try first.** Open `?chrome=0&seed=7#/play/bridge-crew` with a fresh slot.

1. Tap the van with nothing built: it drives off the bank, floats and comes back.
2. Drag a plank from lip to lip and tap the van: the plank creaks and cracks under it, and a pencil ring marks the spot. Do it again and watch the top left margin afterwards.
3. Tap the plank twice to turn it on edge and send the van: it crosses, the next sheet's roll slides in at the right, and the jelly truck draws up.
4. Drag the trolley (the small cart, right of the tray) onto the plank; tap its compartment to add weights. Tap the pad with the pencil to keep a tracing; tap the kept tracing to lay it on the board.
5. Tap the roll. On the second sheet, with the rock: build, and use the rack at the top right to go back.
6. `seed=<n>` fixes the visit; `tier=3` is the lowest tier; `spike=1` is the still spike of run 1.

**What is still weak.**

- **Nobody has heard it.** Every sound is numbers held to a range by tests.
- **Not built, of what the sheet names:** the secret of the barge's horn under an arch; copying one part from a tracing (a tracing can be laid, compared and swapped whole); the pin's tick when a part on it shifts; built parts leaning toward a part being dragged out.
- **Built, and not as the sheet's words have it:** a tracing laid on the board is lifted again on load (it is not a saved field). A stick used as a road is carried by the model as the sheet says, but the vehicle is drawn level on it, not tilting with a wheel off.
- **A side view lets things overlap that stand side by side:** a vehicle drives in front of posts and stays that rise from the deck, which is what the bus's hats are about. Two vehicles parked on the far bank of the widest gaps run off the right edge of the sheet, and the second stands under the roll.
- **Not looked at in a browser:** the sheets after `rock-prop`, the vehicles other than the van and the jelly truck, the chief's models for the six ideas after the plank on edge, the one-change showing, and the barge. Tests draw every one of them with a recording pen and hold every number to a real number; no eye has judged them.
- **The model is harsh on the first sheet:** one weight on the trolley at the middle of a flat four-cell plank cracks it (the model's numbers: a strength of 1.2 against a bending of 1.24). True to the model, and a child may read it as the trolley being broken.
- Only the first variant of each position has a bridge in the tests that crosses it. Taste thresholds and strengths are first values.
- The hold that takes a pin out is still shown by nothing.

**Measured here, on the software renderer, for comparison between passes only** (not a frame rate): the toy's work in a frame was a median 0.6 ms on the production build. The game's has not been measured again.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

- `bridge-crew.tsx` (the Mount): changed as the pilot notes say. The toy is built when the slot has been read and the load draws once itself; `draw` has a case with no state (the bare sheet colour); voices the toy queued are played inside the gesture handler and again after the step in the loop; a change is saved at the throttle; what `ladder.update` returns is kept and handed to `draw`; `seed=<n>` is read from the address; a press in the grown-up's corner is not passed on. **For the template:** all of this could be in the copied Mount as comments turned into code: every game rewrites the same eight lines.
- `config.ts`: `Tier` has a second field, `grain`, with a visible effect on the two lowest tiers; `TOY_SHEET` names the sheet a first visit opens on while the game is a toy.
- `state.ts`: as copied, wrapped by `save.ts`. **For the template:** an exported `isRecord(raw)` would save each wrapper its own.
- `input.ts`: as copied. **For the template:** a lift is followed by a 300 ms grace in which a finger coming down within 140 px carries on the same drag. For a game where one drag follows another from the place the last one ended (a part laid from the end of the part before), two quick drags join into one. It did not need changing here, but a scripted walkthrough must wait out the grace between drags, and a fast child may meet it.
- `guidance.ts`, `audio.ts`, `overlay.ts`: as copied. `scene.ts`: as copied and not used yet.
- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`: frozen, untouched.
- The game's own modules. Rules: `kit`, `frame`, `sites`, `run`, `vehicles`, `order`, `save`, `grid`, `consequence`, `voices`. Toy: `pose`, `motion`, `layout`, `toy` (all pure), `sound`, `view`. Look: `look`, `sheet`, `figures`, `spike`. `bridges.fixture.ts` is for tests only.
- `symbols.ts` and `symbols.test.ts`: the template's, copied as they stand at `d316d6cc` of the base branch, first lines kept, unchanged. Used through `drawWhole` only. Nothing was missing.
- `scene.ts`: as copied, used for the give and the crossing (`stage.ts` holds their beats). **For the template:** a scene ended by a touch plays every remaining beat to its end in one call, so a beat that cues a sound must know it is being skipped, or every sound of the scene plays at once; the game keeps a flag for it. A `finishing` argument to `play` would save each game that flag.
- `config.ts`: `TOY_SHEET` is null now: a first visit opens where the designed order starts.
- **For the cloud page:** the Playwright in `node_modules` asks for a newer browser than the machine has; `chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })` works with no install.

### For the owner to decide

- **The look**: Blueprint and balsa.
- **The toy and the game on it**: seen as a toy; not yet answered.
- **The drawn dip.** The model's dip is drawn six times larger, by one fixed factor. Acceptable in a game that is true where it claims to be science?
- **The tracing's second line**: a traced design laid on the board is drawn as it would lie under the same load. A picture of how a thing behaves, or a reading on the object?
- **More than one "better"**: the jelly truck likes a soft deck and is bored by a stiff one.
- **The hold on a pin**: the only hold in the game, half a second.
- **One weight cracks a flat plank.** Should the first sheet's plank be a little stronger laid flat, so the trolley has something to show before it breaks it? It is a number in `kit.ts`; the frame model stays as true either way.

## Pass log

One row per pass. Passes 1 and 2 were on the spike, pass 3 on the toy, and passes 4 to 6 on the game, all on the software renderer; no frame rate could be taken here.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | The spike at 1180 by 820, pixel ratio 2, 1.5 s after load | "I can see it is a plan of a bridge and the sticks look real. The little truck is tiny and I cannot see its face. There is hardly any water. The box of parts sits on the edge of the paper." | Sizes: van and chief drawn larger with a face in pencil; water raised and firmer; tray moved inside the border | Not measured (software renderer) | Upper third of the sheet empty; piles in the tray do not show how many are left |
| 2 | The same still after the fix set | "The truck looks worried about the gap, good. The bird is funny. I want to pull a stick out of the box." | None | Not measured | Nothing moves; no strain or dip to see at rest; other sheets not looked at |
| 3 | The toy on the dev build at 1180 by 820, pixel ratio 2, seed 7: at open, a bridge folding, a bridge built, a part being laid, a pluck, ten seconds idle | "The planks fell down and swung, that was good, but one went right through the wall and another hung under the floor. I cannot tell a plank from a stick once it is on. The stick box is just a dark block. The bird pecking its little triangle when I made one is funny. Nothing told me I could hold a pin." | What a part looks like and where it may go: planks drawn thicker than sticks; a pile's shadow under the whole pile; a hanging part leans on the ground and a swinging one knocks on the bank and comes back; each link of a chain carried by the part above it. (Also fixed before this row: parts that had never been turned were drawn at the corner of the screen; a new part landed already hanging. And after it: the ghost hand's part lay against the chief's model, so it now lays on the far bank.) | Not measured (software renderer). Work in a frame: median 0.6 ms, 4.4 ms at six times throttle | No load, so plucking plays small forces; the hold on a pin is shown by nothing; a chain can swing over the tray; the built parts do not lean toward a part being dragged; nobody has heard it |
| 4 | The game on the dev build, seed 7: two failed runs and the chief's showing, the trolley, a tracing, the crossing, the next sheet | "The truck falling in is the best bit. The bird did something with a tiny stick up in the corner and I could not see what. What are the three grey squares? The number by the boxes is good, I can see it carries two." | Reading the margin and the tools: the chief's models drawn at nearly twice the size, with a block that presses on them; the tracing pad drawn as paper with a pencil; the trolley larger in its compartment | Not measured (software renderer) | The showing happens far from where the eye is; nothing leads to it |
| 5 | Cold playtest proxy on the production build, fresh slot, seed 11: ten seconds hands off, then a newcomer's minute (the truck first, a short plank, a stray drag, a plank across, a run, another, a turn, a crossing) | Invites at ten seconds: the van at the edge of the gap with its 2, rings on the two lips, marks round the tray and the tools, the ghost hand laying a part on the far bank. Unclear moments, six: a pale box painted over the bank beside the floating van; with all three planks laid in the wrong places nothing showed how to take one back; the chief's showing went unseen in the corner; three things glow at once at the start; one weight on the trolley broke the flat plank at once; the grey squares in the tools box | What to do next is shown: the water's veil kept between the banks; with the kit spent and no road the ghost hand carries a part to the tray; corner marks round the chief's models while it shows. And found by the overlap test written in this pass: a floating vehicle went through rocks and ledges and through the bank's corner on its way out, so it now clambers over and leaps out beside the bank | Not measured | Three things still glow at once; the trolley on the first sheet |
| 6 | The same proxy again on a new production build | Of the six, four are gone (the pale box, the kit spent, the unseen showing, the grey squares after this pass's fix). Two remain: three things glow at once at the start, and one weight breaks the flat plank. One new: the nose of the next vehicle behind the roll was too small to read | Empty places read as places: an empty tracing slot is a dashed outline; the vehicle behind the roll is drawn larger; a tube rolling its load off and wheels on a thread have their own sounds | Not measured | The glow at the start marks pins, tray and tools together; the first sheet's flat plank against the trolley is the owner's to decide |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

As the game stands at the end of run 4.

- **Alive at idle:** the vehicle at the gap creeps to the edge, looks down and backs up, and every waiting or parked vehicle minds its own cargo in its own time; the crew chief does one of five things every few seconds; the barge noses forward and back at its mooring; the water drifts. All of it stops while unattended or hidden.
- **Motion and sound on every touch:** a press is answered where it lands: a pin clicks in, a part lifts, a pile stirs, a vehicle starts and sounds its own horn, the trolley ticks, paper rustles. Each of the grid's thirty cells has a voice of its own. Nobody has heard them.
- **Weight, squash, follow-through:** parts land from above and overshoot once; a part with nothing to hold it swings and knocks on the bank; a straining part draws thin or bulges and creaks before it gives; the bridge springs back and rings when the load leaves it.
- **Kid-clear:** four kinds of part that read apart, plain on one blue; vehicles and chief as the only figures; a pencil ring on the spot where a part gave.
- **Wordless clarity for the declared age:** no word or letter anywhere. Two numerals, each beside the quantity it names (a vehicle's crates, the trolley's weights), drawn through `symbols.ts`; `npm run wordless:check` passes. No symbol stands alone and nothing depends on reading one.
- **Wordless guidance:** rings and corner marks after three idle seconds; then a ghost hand shows one move for the state the board is in: lay a part, pick a pile, send the vehicle when a road reaches across, unroll the next sheet, or carry a part back when the kit is spent. Never where a part belongs.
- **60 fps:** not measured. One full-surface stamp a frame, sprites for parts, and a test that bounds the canvas calls for the fullest bridge. A run is computed once when the vehicle sets off (a few milliseconds) and read out after.
- **Procedural or committed assets only:** everything is drawn and synthesized in code.
- **Its own art direction:** Blueprint and balsa; the registry row's text is at the end of `ART.md`.
- **Nothing passes through anything** (a canvas game's own tests): a folding bridge is played for twelve seconds and no part goes into the ground; the give is played on every sheet for every vehicle and no wheel goes into a bank, a rock or a ledge. What a side view cannot avoid is listed under "still weak".
- **Found as left:** every scene's outcome is in the saved state the moment it starts and is saved at once; tests put the game away mid-run and mid-scene and open it again.

### The learning claim

As the sheet has it at `55b19cb`, read through the lookup on 2026-10-03: designed from five California State Board-adopted science standards on engineering design (`us-ca 3-5-ETS1-2`, `us-ca 3-5-ETS1-3`, `us-ca MS-ETS1-2`, `us-ca MS-ETS1-3`, `us-ca MS-ETS1-4`; all confirmed), and from four goals of SLO's curriculum guidance for fase 2 and fase 3 (`nl ojw/nattech/3/01/fase2`, `nl ojw/nattech/3/02/fase2`, `nl ojw/nattech/3/01/fase3`, `nl ojw/nattech/3/08/fase3`; guidance, not law; all confirmed) and the Dutch legal core goal 45 of 2006 (`nl 45`; still in force; an end-of-primary goal; confirmed). From the California standards it takes the loop of fair test, failure, improvement and comparison, and it does not teach structures on their authority. The plank on edge standing for the profile is the game's own reading, beyond the Dutch records. The check states are to be read again on the day of the pull request. No attainment claim.

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
- Compute a run once, when the vehicle sets off, as a list of answers half a cell apart, and read it out in time. The watching is then free, and the same list gives the creaks, the reaction and the consequence.
- Ask of every vehicle "which bank is it on?" before writing the saved state. One list for the near bank was not enough: a change to the bridge forgot who had crossed it.
- Write the overlap test for a scene before looking at it. The give looked fine in a still and went through a rock, a ledge and the bank's corner on other sheets.
- A class field's initial value in a subclass is set after the parent's constructor has run. A parent that calls an overridden method while it builds itself has its result overwritten; the game runs its model once more at the end of its own constructor.
