<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: sheet, with the look spike and the rules of run 1 on top of it. No toy and no game yet. Run 2 did one thing: it took in the first check of the sheet.
- Sheet check, round 1 (checker: B): open, 14 findings, read against the sheet with sha256 `362aa271…ce9d4` (commit `0a96fd5`). All fourteen replacements are pasted as written, at commit `b7c2270`. No finding was refused.
- Sheet now: commit `b7c2270`; sheet part sha256 `1f16834cfe9dda1ce186d942147b549720540d94a2e081d8c3f196c678c740a9`.
- For the next checker: one sentence of the sheet differs from both the text round 1 read and its replacements, and no finding covers it. Under "The representation" the arch now reads that sticks pinned in a curve carry by squeeze and that a curve of three or more keeps its shape only when posts tie it to the deck. I changed it at `1c88806`, after `0a96fd5`, because the model finds a bare arch of three pinned sticks not held (a test says so). My other change at `1c88806`, to the cell Pin by Take off, is gone: the checker's row stands there.
- Rules: brought into line with the pasted text at `86e1e7a` and `c35bf5c` (findings 2, 4, 5, 6, 7, 8, 10 and 11 touched rules; 1, 3, 9, 12, 13 and 14 are text only). What changed: a voice for each of the thirty cells; a part can hang loose at one end and a pin put back holds it again; one ring at most; runs on a sheet taken back from the rack never count; the near bank holds a list of vehicles; hats are saved with the sheet; the trolley stands, rides under the plank or hangs from a pin; an idea not yet shown is shown at the end of the crossing.
- Look in use: first reserved choice, Blueprint and balsa. The Mount shows the spike at load from a fixed seed with nothing playable behind it (`spike.ts`). Stills were taken here on the software renderer only. The frame rate is the lead's to take.
- Renderer: canvas 2D with the game's own solver (`frame.ts`). matter.js is not used.
- The guide and the cloud page did not differ on anything these runs met.
- Open: sheet ready for check, round 2

What is open besides the check:

- **Waiting for the lead:** the round 2 check; the template commit from the canvas pilot; the commit that holds `symbols.ts` to start from; the frame rate of the spike; a registry row for the look when it is accepted (a request, not made here).
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

As the sheet has it at `b7c2270`, read through the lookup on 2026-10-03: designed from five California State Board-adopted science standards on engineering design (`us-ca 3-5-ETS1-2`, `us-ca 3-5-ETS1-3`, `us-ca MS-ETS1-2`, `us-ca MS-ETS1-3`, `us-ca MS-ETS1-4`; all confirmed), and from four goals of SLO's curriculum guidance for fase 2 and fase 3 (`nl ojw/nattech/3/01/fase2`, `nl ojw/nattech/3/02/fase2`, `nl ojw/nattech/3/01/fase3`, `nl ojw/nattech/3/08/fase3`; guidance, not law; all confirmed) and the Dutch legal core goal 45 of 2006 (`nl 45`; still in force; an end-of-primary goal; confirmed). From the California standards it takes the loop of fair test, failure, improvement and comparison, and it does not teach structures on their authority. The plank on edge standing for the profile is the game's own reading, beyond the Dutch records. The check states are to be read again on the day of the pull request. No attainment claim.

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
