<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: sheet, with the look spike and the rules built. No toy yet, as the brief says.
- The sheet's check, round 1 (checker: B): open, 9 findings, on the sheet at `c4f9ba9` (hash `45ab1170dc484757fca139faf6805db59bc789df0476ac6512b24a71a8632721`). All nine replacements are pasted as written (commit `edd2ad5`); none was left out.
- The sheet now: commit `23e11a3`, hash `38e2a8fe07423a9020a75116f9bf30b65d357e1e6b630795fe6519151df9e3c6`.
- Open: sheet ready for check, round 2
- For the round 2 checker: besides the pasted findings, five lines of the sheet were changed by the builder in `23e11a3`, so that the sheet says what the rules do. They are new text and have not been checked:
  1. Under "what is stored", `chair` and `friend` may be nobody, on a first visit before the first pair has come in (this follows finding 5).
  2. Under "what is stored", `cape` is also `off` while nobody is in the chair.
  3. Under "How a cycle ends", hair that is not under the cape springs back, and the door stays shut while a customer is under the cape.
  4. Under "A thing shown once", the snip takes the longest tuft to half its length and gives fluff and no piece, as in the grid (this follows finding 4).
  5. Under "A thing shown once", the pull takes the shortest tuft longer.
- Look in use: the first reserved choice, wet watercolour. Spike: the Mount paints the salon at load from a fixed seed (`spike.ts`), with nothing playable behind it. Stills were looked at on this machine (software drawing, Chromium) at 1180 by 820, pixel ratios 1 and 2, and at two other landscape shapes; none is committed. The still on a real graphics card and the frame rate are the lead's to take. The look did not fail on clarity here, so no second look is proposed. The spike shows the first pair already seated, which is the salon after they have come in, not the empty chair a first visit now opens on.
- The rules: pure modules with tests, no renderer and no DOM, **brought into line with the sheet at `23e11a3` in commit `68a259f`, still before the sheet has passed, at this builder's own risk**. They are `rules.ts` (the sizes), `tastes.ts`, `grid.ts`, `voices.ts`, `world.ts` (the model), `showing.ts` (the error as a consequence), `deal.ts` (what a position lays out), `cycle.ts`, `save.ts` (the saved state, wrapping `state.ts`) and `rng.ts`; the position ids are in `LADDER` in `config.ts`. The Mount does not use them yet: it still reads and writes the template's three fields.
- What round 1 changed in the rules: a first visit opens on an empty chair with the first pair at the door; the ribbon is stored with its tuft, its face or its place on the floor, and a worn clipping with whose face and which spot; a showing saves its whole outcome when it starts, the mane it changes included; and every cell and every head rub has a sound of its own in `voices.ts`.
- Open: a request to the lead for the registry row of the look (the wording is at the end of `ART.md`).
- Not done, and not in this run: the toy, the idle ladder's content, the scenes, sound through Web Audio, the overlap tests, the frame-budget test, and every measurement.
- Last run on this machine before the last push: `npx tsc --noEmit`, `npx vitest run games/wild-hair-salon test/games.test.ts` (22 files, 331 tests), `npm run -s wordless:check`, `node scripts/egress-check.ts`, `npm run build`, `npm run egress:built`, `npm run education:built`: all passed. CI on the branch has not been read from here.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

One entry a file copied from the template.

- `wild-hair-salon.tsx` (the Mount): changed in two places for the spike. One import, and `draw` now copies the painted salon to the canvas and sets `drawn.drawCalls`. Everything else is as generated. The toy will replace `draw` again.
- `config.ts`: changed in `LADDER` and `FIRST_VISIT` only. `FIRST_VISIT` has three rows, one for each age of the band; the generated expression gives two.
- `state.ts`: as generated, and wrapped by `save.ts` the way its header says. That worked without touching it: `save.ts` calls `deserialize` for the three fields and reads the same record again for its own.
- `audio.ts`, `input.ts`, `guidance.ts`, `scene.ts`, `overlay.ts`: as generated, not yet used beyond what the blank Mount does.
- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts` (frozen): untouched.
- **For the template:** the Mount does not say where a canvas game gets its 2D context or which pixels `draw` works in. The spike takes `canvas.getContext('2d')` and paints in device pixels (`canvas.width`, `canvas.height`), fitting the scene itself. A line in the comment on `draw` would settle it for the next canvas game.
- **For the template:** a game whose saved state is more than the three fields needs a `freshGame` and a `deserializeGame` of its own, and the Mount imports `deserialize` and `serialize` by name. A comment at those two imports, pointing at the wrapper, would save a wrong first guess.
- **For the template:** nothing in it draws a seeded stream of chance, and both a painter and a dealer of layouts need one. This game has `rng.ts`; if a second game writes the same, it belongs in the template.

### For the owner to decide

One line for each thing only the owner can settle.

- The look, wet watercolour, and the toy, at the toy checkpoint. Neither can be judged from this run: there is no toy yet.
- The cast: a lion, a poodle, a yak and an angora rabbit. The demo had a porcupine where this game has the rabbit, because spikes are not locks.
- No default from the guide's list needed a different answer for this design.

## Pass log

No pass yet. One row per pass: what was looked at, the critique written as the child, the one themed fix set, what was reverted, the measured frame rate, and what is still weak.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

So far there is a painted still and the rules; nothing moves and nothing sounds. Each line says what exists.

- **Alive at idle.** Not yet. The spike is a still.
- **Motion and sound on every touch.** Not yet. Every sound exists as numbers (`voices.ts`): thirty cell voices, ten others and one head-rub voice for each customer, held inside stated ranges by a test, none alike. Nobody has heard them.
- **Weight, squash and follow-through.** Not yet.
- **Kid-clear.** In the spike: two big figures, one large flat cape, and two flat strips of strong warm colour on its cool blue, side by side with top ends level. White paper is left round every figure.
- **Wordless clarity for the declared age.** No text call anywhere; the wordless check passes. The band starts at 4, so there is no `symbols.ts`.
- **Wordless guidance.** Not yet. The sheet says what the ladder shows.
- **60 fps on a mid-range iPad.** Not measured, and not measurable on this machine. The spike paints once for each surface size and copies one sheet per frame. No frame rate is claimed and no physical iPad was measured.
- **Procedural or committed assets only.** Everything is painted at run time from a seed. No asset file, no font, no address.
- **Its own art direction.** Wet watercolour, the first reserved look; written at the end of `ART.md`.

### The learning claim

As the sheet has it, to be read again on the day of the pull request: Wild Hair Salon is designed from comparing two lengths directly. In California it is designed from `us-ca 3.1` of Strand 3.0 in Mathematics, a learning foundation for preschool and transitional kindergarten published by the state department (a foundation, not a standard), and from two content standards adopted by the State Board of Education, `us-ca K.MD.2` and, for comparing two lengths through a third thing only, `us-ca 1.MD.1`. In the Netherlands it is designed from guidance of the curriculum institute SLO, which is not law: the fase 1 goals `nl rw/m/1/04/fase1` (comparing by length only) and `nl rw/m/1/02/fase1`, and one bullet of the peuter content card, cited by pack id in the sheet. Each record is taken in part, as the sheet's claim says record by record, and no part that has a child say, name or use words is in the game. All six were `confirmed` in the lookup on 2026-10-03. Making a lock as long as its model is the game's own use of repeated direct comparison; no record named asks for it. The claim was reworded in round 1 of the sheet's check and has not passed yet.

### Defaults taken for the owner

- Every default in the guide's list as written. In particular: no symbol of any kind, no speech, creature voices invented and synthesized, no camera shake and no impact pause.
- The game's own: one lock for each customer; the friend's hair, and any hair not under the cape, always springs back; every size (the lengths, "plainly", "a little", when two ends meet) is the game's own choice, since no record gives one.

### What the next builder should know

- A wash that is soft because it was drawn small and scaled up needs two stages each way; one stage shows as blocks at the edge.
- A fade in a canvas gradient must end in the same colour at no strength. Ending in transparent black leaves a dark ring.
- Transparent paint laid with `multiply` darkens over whatever is beneath it. Put bare paper back under a figure before painting it, and it keeps its colour and a white halo.
- Chain the checks and the commit with `&&`, never with `;`. One commit on this branch (`4279730`) was pushed with a failing test of this game's own because of that; the next commit (`b6e99c4`) fixed it.
