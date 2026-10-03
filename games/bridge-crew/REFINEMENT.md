<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: sheet, with the look spike and the rules of run 1 on top of it, as the brief asked. No toy and no game yet. Run 1 ended here, as the brief says.
- Sheet: written in full, not yet checked. It stands at commit `1c88806`; sheet part sha256 `2d06cb50dbc9d4d94335dec066c15fb43b4fa56f933b9eb1ba18c48069caff19`. It was first pushed whole at `0a96fd5` (sha256 `362aa271…ce9d4`); two sentences were changed since, both to match what the model does: the arch under "The representation" and the cell Pin by Take off in the grid.
- Rules: written against the sheet at `0a96fd5` before its check, at this builder's own risk (guide, step 3), and they agree with the sheet at `1c88806`. A finding under the representation, the mechanic questions, the error, the designed order or the records reopens them.
- Look in use: first reserved choice, Blueprint and balsa. The Mount shows the spike at load from a fixed seed with nothing playable behind it (`spike.ts`). Stills were taken here on the software renderer only (layout, silhouettes, colour). The frame rate is the lead's to take.
- Renderer: canvas 2D with the game's own solver (`frame.ts`), as the brief suggests. matter.js is not used.
- The guide and the cloud page did not differ on anything this run met.
- Open: sheet ready for check, round 1

What is open besides the check:

- **Waiting for the lead:** the checker's report; the template commit from the canvas pilot; the commit that holds `symbols.ts` to start from; the frame rate of the spike; a registry row for the look when it is accepted (a request, not made here).
- **Not built, by the brief:** the toy, the Mount's real drawing and touch, the scenes as beat lists on `scene.ts`, what the idle ladder shows, the secrets, every numeral.
- **Findings not fixed:**
  - Only the first variant of each position has a bridge in the tests that crosses it (`bridges.fixture.ts`). Variants two and three are laid out and checked for shape, not yet for a crossing.
  - The numbers each taste turns on (`TASTE` in `vehicles.ts`) and the strengths in `kit.ts` are first values, set so the fixture bridges behave as the sheet describes. No child has tried them.
  - The model is first-order: threads in a straight line through a free pin, and any part hanging from one pin, are found as "not held" and left out of what carries the load (a hanging part's weight stays on its pin). True for a frame; a real chain would hang in a curve and carry. The sheet says displacements are small; it does not spell this case out.
  - `voices.ts` is numbers only. Nothing has been heard, and its `play` has not driven `audio.ts` in a browser.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

- `bridge-crew.tsx` (the Mount): changed in one place. `draw` paints the spike, once for each size of the backing store, and the file imports `spike.ts`. Everything else is as copied. **For the template:** the blank `draw` runs every frame; a scene that is still wants "paint once per size", which each game will write for itself.
- `config.ts`: `BACKDROP` is the sheet's blue; `LADDER` holds the fifteen position ids; `FIRST_VISIT` has rows from age 9 and from age 11, so the unused `OLDEST` was dropped. Tier table and governor as copied.
- `state.ts`: as copied, and wrapped by `save.ts` the intended way (its `deserialize` first, then the same raw record again). **For the template:** the wrapper cannot tell from the result whether the base read a record or gave a fresh state, so it repeats the version test on the raw record; a small exported `isRecord(raw)` would save every game that line.
- `audio.ts`, `input.ts`, `guidance.ts`, `scene.ts`, `overlay.ts`: as copied, used only as the Mount wires them.
- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`: frozen, untouched.
- New modules of the game's own, all pure but the last four: `kit.ts`, `frame.ts`, `sites.ts`, `run.ts`, `vehicles.ts`, `order.ts`, `save.ts`, `grid.ts`, `consequence.ts`, `voices.ts`; and for the spike `look.ts`, `sheet.ts`, `figures.ts`, `spike.ts`. `bridges.fixture.ts` holds bridges for the tests and is imported by no game file.
- **For the cloud page:** the Playwright in `node_modules` asks for a newer browser build than the one on the machine. Stills worked with `chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })`, with no install. Node 24 came from `nvm install 24` as the page says.

### For the owner to decide

- **The look**, at the toy checkpoint: Blueprint and balsa, as spiked.
- **The drawn dip.** The model's dip is drawn six times larger, by one fixed factor, so it can be seen. The sheet says so. Is that acceptable in a game that is "true wherever it claims to be science"?
- **The tracing's second line.** A tracing laid on the board shows how that design would dip under the same load, as a second line. The sheet takes this as a picture of how a thing behaves, not as a reading on the object. If it counts as a reading, comparing needs another form.
- **More than one "better".** The brief says a better bridge sags less and uses less. The jelly truck likes a soft deck and is bored by a stiff one, so a bridge can be better for one vehicle and worse for another. The sheet keeps this on purpose; it is the owner's to confirm.
- **Numerals** lie in two places only (the trolley's stack, a vehicle's crates). None is drawn yet.

## Pass log

One row per pass. Both passes were on the spike, on the software renderer; no frame rate could be taken here.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | The spike at 1180 by 820, pixel ratio 2, 1.5 s after load | "I can see it is a plan of a bridge and the sticks look real. The little truck is tiny and I cannot see its face. There is hardly any water. The box of parts sits on the edge of the paper." | Sizes: van and chief drawn larger with a face in pencil; water raised and firmer; tray moved inside the border | Not measured (software renderer) | Upper third of the sheet empty; piles in the tray do not show how many are left |
| 2 | The same still after the fix set | "The truck looks worried about the gap, good. The bird is funny. I want to pull a stick out of the box." | None | Not measured | Nothing moves; no strain or dip to see at rest; other sheets not looked at |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

So far there is a still scene and the rules. Each line says what exists.

- **Alive at idle:** not yet. The spike is still.
- **Motion and sound on every touch:** not yet. The rules name what every one of the thirty cells shows and sounds (`grid.ts`, `voices.ts`); nothing is drawn moving or heard.
- **Weight, squash, follow-through:** not yet. The rest pose of the bridge under its own weight is the model's.
- **Kid-clear:** the four kinds of part read apart in the still by depth, thinness, roundness and line; parts are plain balsa and paper on blue.
- **Wordless clarity for the declared age:** no word, letter, numeral or sign is drawn; `npm run wordless:check` passes. The drawing's dimension line carries no figure.
- **Wordless guidance:** not yet.
- **60 fps:** not measured. The spike paints once per size and nothing per frame.
- **Procedural or committed assets only:** everything is drawn in code; no asset is committed.
- **Its own art direction:** Blueprint and balsa, written in `ART.md` under "The look".

### The learning claim

As the sheet has it at `1c88806`, read through the lookup on 2026-10-03: designed from five California State Board-adopted science standards on engineering design (`us-ca 3-5-ETS1-2`, `3-5-ETS1-3`, `MS-ETS1-2`, `MS-ETS1-3`, `MS-ETS1-4`; all confirmed) and from four goals of SLO's curriculum guidance (`nl ojw/nattech/3/01/fase2`, `3/02/fase2`, `3/01/fase3`, `3/08/fase3`; guidance, not law; all confirmed) and the Dutch legal core goal 45 of 2006 (still in force; an end-of-primary goal; confirmed). The check states are to be read again on the day of the pull request. No attainment claim.

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
