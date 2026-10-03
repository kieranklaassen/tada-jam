<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: sheet, with the look spike and the rules written. First run, from base commit 2a133cc on `feat/learning-games-build`. This run stops here, as its brief says.
- Sheet: whole, not yet checked. The text to check is the sheet part of `ART.md` (everything above `## The look`) as pushed in commit 044bb5f, "Fix-it Stall sheet: the records, ready for check". It has not changed since.
- Sheet hash (`awk '/^## The look/{exit} {print}' games/fix-it-stall/ART.md | sha256sum`): `0585a62e0a40d226105a4869612f164d0fc828f64f6f005618a3d09435be8423`
- Rules: written while the check runs, at the builder's own risk, against the sheet at commit 044bb5f. A finding under the representation, the mechanic questions, the error, the designed order or the records reopens them.
- Look in use: Electronics bench, the first reserved look. The spike is in: the Mount shows it at load, one fixed moment, nothing playable (`spike.ts`). Stills taken here in headless Chromium on a software renderer at 1180 by 820, pixel ratio 1 and 2, kept outside the repository. No frame rate measured here: the lead takes it on a real graphics card.
- Renderer: canvas 2D, as the brief suggests.
- Not built: the toy, any touch, any sound played, any numeral drawn, the overlap tests of a canvas game. The Mount still answers a press with the template's tick only.
- Two places where the rules hold something the sheet does not say yet. Both are for the sheet's next round, and neither was written into the sheet after it was pushed for its check:
  1. A job stores the position it was laid out from (`Job.from` in `jobs.ts`). The neat way is shown for the idea of the job in hand, and with the next customer laid out a cycle ahead that is not always the stored position. The sheet's list of what `job` holds does not name it. Wanted in the sheet, under "What is stored", in the row for `job`: "The customer at the bench: who, which position it was laid out from, which gadget, its circuit, its ticket or none, whether its lid is open, and whether a hand-back has already failed (`missed`)."
  2. The buzzer's row of the grid marks no wrong use, and the guide asks for one for each object. `grid.ts` has none for it and its test says so. Proposed for the sheet: too many cells make it shriek and walk off the board, as a motor does.
- Requests to the lead: none that block. A registry row for the look when it is accepted.
- Open: sheet ready for check, round 1

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

- `fix-it-stall.tsx` (the Mount): changed in one place. `draw` calls the spike with the canvas's 2D context, the size, the pixel ratio and the attended clock's seconds, and writes the count of sprites and figures into `drawn.drawCalls`. Everything else is as copied.
- `audio.ts`, `input.ts`, `guidance.ts`, `scene.ts`, `overlay.ts` and the four frozen files: as copied, untouched.
- **For the template:** a shadow's blur and offset on a 2D canvas ignore the transform, so a painter that scales its scene has to scale them by hand (`lifted` in `paint.ts`). A canvas game's first helper will hit this.
- `config.ts`: `LADDER` holds the ten position ids and `FIRST_VISIT` its two rows. Nothing else changed.
- `state.ts`: untouched, and wrapped by `save.ts` as its header says to: `deserializeStall` calls `deserialize` for the three template fields and reads the same raw record again for its own.
- **For the template:** `finishCycle` returns the whole object it was given with two fields changed, typed as `GameState`. A wrapper has to spread it back over its own state (`{ ...stall, ...judged }` in `cycle.ts`) to keep its type. A generic signature, `<S extends GameState>(state: S, …): S`, would save every game that wraps the state the same line.
- **For the template:** `FIRST_VISIT` as generated puts its second row at the band's oldest age. A band of four ages wanted it one age earlier, which the file allows; the comment could say the row's age is the game's choice.

### For the owner to decide

- **The plus and minus signs on a cell.** A real cell has them printed on its ends, and both are in the jam's list of signs. They would mark a pole, not a quantity, so the sheet does not use them: the two ends of a cell are told apart by shape and colour. May they be drawn on the cell as on a real one?
- **The numeral on an order ticket.** The sheet lays a numeral from 1 to 3 beside the drawn group of parts a customer asks for, from the position `ticket` on. The drawing carries the order without it. It is a quantity asked for, which the default on readings allows; if the owner would rather have no numeral in this game, the ticket works without.
- **A lamp that blows.** Three cells on one lamp blow it: the lamp becomes a gap and the tray gives another. It is true, large and free, and the state otherwise stays. If a part that breaks reads as a lost piece, the lamp can dazzle without blowing.
- The look and the toy, at the toy checkpoint.

## Pass log

No pass yet. One row per pass: what was looked at, the critique written as the child, the one themed fix set, what was reverted, the measured frame rate, and what is still weak.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

So far only the spike and the rules exist. Each line says what is there and what is not.

- **Alive at idle.** In the spike: beads run round every live loop, a lit lamp's glow breathes by a hair, the owl blinks about every five seconds. All of it runs on the attended clock and stops when the game rests. Not yet: any character's own idle motion.
- **Motion and sound on every touch.** Not built. The grid of 35 answers and their voices are in `grid.ts` and `voices.ts` as data, each voice held inside a stated range by a test. Nobody has heard them.
- **Weight, squash and follow-through.** Not built.
- **Kid-clear.** The spike has one large green board in the middle of a plain grey mat, copper on green, and few objects round it. The working pieces are plain.
- **Wordless clarity for the declared age.** No word, letter, numeral or symbol is drawn. `npm run -s wordless:check` passes. The one numeral of the design (on an order ticket) is not drawn yet.
- **Wordless guidance.** The template's ladder runs; the game does not yet tell it what to show.
- **60 fps on a mid-range iPad.** Not measured. The spike paints everything still once per size and blits it; a frame adds two fills for the beads of each board, one sprite per glow, one figure per blade and the owl's eyes. No frame rate was taken on this machine, which has no graphics card, and no physical iPad was measured.
- **Procedural or committed assets only.** Everything is drawn at run time. `node scripts/egress-check.ts`, `npm run egress:built` and `npm run education:built` pass.
- **Its own art direction.** Electronics bench, the first reserved look. First notes are in `ART.md` under "The look".

### The learning claim

As the sheet has it, read on 2026-10-03, every record `confirmed` that day:

Fix-it Stall is designed from two California content standards adopted by the State Board of Education for grade 4 (`us-ca 4-PS3-2` and `us-ca 4-PS3-4`), in part from one for grade 5 (`us-ca 5-PS1-3`), and from one cross-grade engineering design standard for grades 3 to 5 (`us-ca 3-5-ETS1-3`); and from three SLO fase goals, which are curriculum-institute guidance and not law (`nl ojw/nattech/2/06/fase2`, `nl ojw/nattech/1/02/fase2` and `nl ojw/nattech/2/06/fase3`), from core goal 42 of 2006, a legal core goal still in force (`nl 42`), and from two items of a draft core goal, not in force (`nl 30 A c` and `nl 30 A e`). For California the game is designed from the two grade 4 standards on energy and a designed device and is not described as teaching circuits. Nothing says what a child has reached.

The check states are to be read again on the day of the pull request.

### Defaults taken for the owner

- No symbol stands alone: the ticket's numeral lies beside the drawn parts it counts, and the ticket reads without it.
- No reading on the object: no meter and no gauge. Brighter, faster and louder are seen and heard.
- No letters and no written words.
- No camera shake and no impact pause: a short and a blown lamp answer with glow, puff, flag and sound.
- No speech: the characters will have invented, synthesized voices.
- The look is the lead's first pick for the game.
- The game's own, awaiting him: the three questions under "For the owner to decide" above.

### What the next builder should know

- **Solve the circuit, do not script it.** A circuit of pads, traces, leads and parts is a small linear system: nodal analysis with each cell as a push in parallel with its own small resistance needs no extra unknowns, and Gaussian elimination over forty nodes is nothing. Every cell of the grid then falls out as a test (`solve.test.ts`) and no cell needs a special case.
- **Give every pad a tiny leak to ground** so that a pad nothing reaches does not make the system singular. It shows as a difference in the ninth decimal, so compare currents to six.
- **Let a job prove itself.** `jobs.test.ts` lays out 120 jobs at every position and checks that each arrives broken and that one plain mend of each break, made only with the finger's acts and the tray, makes it run. The layout itself refuses a second break that undoes the first (a flat cell beside one that pushes the wrong way lights a lamp dimly).
- **A waiting customer needs its own position.** With the next customer laid out a cycle ahead, anything that depends on "the idea of this job" must be stored with the job, or it reads the wrong position.
- **The hand-back takes the stall's tool away.** A mend that only works through the test lamp must not count, so the owner's try runs with the test lamp off the board.
- **On a 2D canvas a shadow ignores the transform.** Scale blur and offset by hand, and cast each part's shadow once from a plain footprint, or every inner shape darkens the one under it.
