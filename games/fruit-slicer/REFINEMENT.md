<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: sheet. The first run is done: the sheet is written and waits for its check, the look spike is in, and the rules are written as pure modules with tests. Nothing playable exists yet, by the brief: the toy waits for the template version the canvas pilot proves.
- The sheet is whole at commit `c4a4b13443211be0a75c6bbdc08f4d3e8cf3be72`. The hash of its sheet part there, and at the tip of this run, is `063c1a193bde3958c52b782016a8258be98dff4888f98896a8ac02242fa6a211`: the look was written below it without touching it.
- The rules were written against the sheet at that commit, before its check, at the builder's own risk. A finding under the representation, the mechanic questions, the error, the designed order or the records reopens them.
- Records: two records of the brief were dropped because the game does not carry them (`us-ca 4.MD.4`, a data record, and `us-ca 6.NS.6.c`, a number line with negative numbers), and one Dutch record was added that the Limits of another point to (`nl rw/gb/5/01/fase2`). The sheet says why for the second under `us-ca`; the first is simply not named, since the game shows no set of measurements.
- Look in use: comic-book halftone, the first reserved row. The spike is the Mount's frame at load: one still, built by the game's own rules from a fixed seed (`SPIKE_SEED` in `spikeScene.ts`), with nothing playable behind it. Stills were taken here at 1180 by 820, at pixel ratios 1 and 2, in headless Chromium drawing in software, and are kept outside the repository. No frame rate was measured: that is the lead's, on a real graphics card.
- Open: sheet ready for check, round 1
- Open, requests to the lead: take the still of the spike and its frame rate at pixel ratio 2; the registry row for the look once the owner has seen it. No frozen file needs changing.
- Open, not yet done or still weak:
  - The shelf's rows are 36 design units tall in the spike, under the 48 px floor for a hit target. To settle with the toy: fewer rows, or a taller counter panel.
  - The cat and the boa are not drawn yet; the spike shows the pelican, the twins, the ants and the dog.
  - No frame-budget test and no overlap test yet: both belong to the toy and the game. The rules already hold that no two pieces of a lane overlap, in play and on load.
  - Commit `2266bcd` failed the typecheck (an unused name in a test) and was pushed before the failure was read; `98ce6b4`, the next one, fixes it. CI is red on that one push.
- What ran at the end of this run, all passing here: `npx tsc --noEmit`; `npx vitest run games/fruit-slicer test/games.test.ts` (23 files, 303 tests; the game's own take under 3 seconds); `npm run -s wordless:check`; `node scripts/egress-check.ts`; `npm run check` whole (215 files, 2133 tests passed, 1 skipped); `npm run build`, `npm run egress:built`, `npm run education:built`. A green run here is not the gate: CI is.
- Next run: the checker's report on the sheet, then the template version the canvas pilot proved, then the toy (the slice) in this look on the real scene.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

- `symbols.ts` (new; **for the template**). This game is the pilot for it. It draws a whole number, a fraction with a horizontal bar, a mixed number, the eight signs by name, and a decimal number with a point or a comma; it takes numbers, a fraction as two integers or a sign by name, never a string; it imports nothing and knows nothing of fruit, and its test holds that. What writing it showed:
  - The check refuses a helper that takes the text as a parameter, so every `fillText` and `strokeText` formats its number in place (`String(Math.round(n))`) and carries its own `wordless-ok: numeral` comment. An outline under a fill is therefore two commented calls, not one helper.
  - A sign is chosen by a chain of conditionals whose branches are all literals, in one text call. That passes the check, and a `switch` with a call a case would need a comment a case.
  - The fraction bar is a filled rectangle. The check cannot see it, so it is on the reviewer's list: a bar drawn anywhere but `symbols.ts` would pass unseen.
  - `divide` draws the obelus. Dutch schools write division with a colon. The module has no way to ask for the colon yet; it wants a decision before a game for Dutch children shows division.
  - A number below zero is drawn with the hyphen `String` gives, not the minus sign. No game needs it yet.
  - The decimal number is drawn digit by digit on cells of one width, since a comma cannot be put into a formatted number without a call the check refuses.
  - The font is the system stack at weight 800, set in the module. A look that wants its own numerals has only the ink (fill, edge, edge width) to change.
  - Its test runs on a small recorder that stands in for the canvas, so it needs no DOM, and it reads the source to hold the comment on every text call.
- `config.ts`: changed in two places only, as the brief asks: `LADDER` holds the twelve position ids of the sheet and `FIRST_VISIT` has a second row at age 11. Nothing else was touched; the game's own numbers (lengths, the give, the shelf) are in `measure.ts` and `world.ts`.
- `state.ts`: used as copied and wrapped by `save.ts`, as its header says to. It worked as described. One gap **for the template**: `deserialize` gives a fresh state for a record it cannot read without saying that it did, so a wrapper has to repeat the test (not a record, or another version) to know whether to build its own fresh fields. A small exported `isReadable(raw)` would save every game that copy.
- `fruit-slicer.tsx` (the Mount): changed in one place. `draw` copies the spike's still to the canvas, and there is one import for it. Everything else is as generated.
- `audio.ts`: as copied, and not yet used beyond what the Mount wires. One gap **for the template**: the cloud page asks for every voice as plain numbers in a pure module with a range test, and the template has no shape for that. `voices.ts` here uses a note of kind, pitch, glide, wave, peak, attack, length and delay, which maps one to one onto `tone` and `noise`; the adapter that plays a list of notes is a few lines the toy will add. The note type, the adapter and the range test would serve every game.
- `input.ts`, `guidance.ts`, `scene.ts`, `overlay.ts`, `ART.md`, `REFINEMENT.md`: as copied.
- The four frozen files are untouched.
- Not the template, but for the next cloud builder: a check script that pipes each command through `tail` hides its exit code. Mine did, and one red commit was pushed. Read the exit code, not the last line.

### For the owner to decide

The game works under every default of the guide as written and asks for none to be changed. These are for the owner all the same:

- **The give of a tin**: a cut within one twenty-fourth of the fruit's length counts as a fit. No record sets it. It decides how often a first cut succeeds, so it is the first thing to judge with a child at the toy checkpoint.
- **No fraction on a piece the child cut.** Under the default on readings, the written fraction is laid only on what was ordered (the ticket and the tin), never on a cut piece. A child therefore never sees a name for a piece of its own making. If the owner would like a piece that lies exactly on ruled parts to show its fraction, that is a change to the default.
- **A piece rings by its length** (half the length, an octave higher). It is true of a string and is used as a toy, not taught. Whether it stays is a matter of taste.
- **The look**: comic-book halftone, at the toy checkpoint.

## Pass log

One row per pass: what was looked at, the critique written as the child, the one themed fix set, what was reverted, the measured frame rate, and what is still weak. The passes so far are on the look spike, a still.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | The spike's first still, 1180 by 820 at pixel ratio 2, headless Chromium in software. | "The bird's head is stuck in the roof. The two mice have their noses through each other. The ants are one black blob. The star is sitting on the end of the red bar so I can't see where it was cut. Why is the bottom shelf spotty when the top one isn't?" | Clarity of the working area and the figures: a lower awning and the pelican moved clear of it; the twins apart, nose to nose; smaller ants, spaced, one lifting its legs; the burst, the drops and the speed lines moved off the cut end; the shelf made the same plain slab as the board, with no dots. Nothing reverted. | Not measured: a still, on a machine with no graphics card. | The speed lines are thin and read as a scratch. The shelf rows are thin for a finger. The ticket's bracket is fine but the tin's fraction sits on a dotted lid and needs its white edge to read. |
| 2 | The same still after the fix set, at pixel ratios 1 and 2. | "It's a comic. The bird wants the red thing on its card, three bits out of four. The red bar in the box is too short, there's a gap by the zigzag. I'd cut it again." | None: this pass only checked the first. | Not measured. | Nothing moves yet, so nothing says "touch me". The cat and the boa are not drawn. The dog's tongue is a plain rectangle. |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

So far there is a design sheet, a still and the rules. No frame rate has been measured on any machine, and no physical iPad has been used.

- **Alive at idle.** Not yet: the spike is a still. The sheet gives each character its tempo and its funny part, and the look's motion rules are in `ART.md`.
- **Motion and sound on every touch.** Not yet built. Designed: the object-by-action grid in `grid.ts` gives all thirty cells a result that looks different and a voice that sounds different, and a test holds both. Every voice is plain numbers in `voices.ts`, each inside a stated range; nobody has heard them.
- **Weight, squash and follow-through.** Not yet built. The look snaps to a pose, overshoots and settles; working pieces move only as the idea needs.
- **Kid-clear.** In the still: three panels, few things, heavy outlines; the fruit, the board, the shelf, the tin and the tickets are flat, and the dots are on the setting and the characters. Every length on the counter starts from one left edge at one scale.
- **Wordless clarity for the declared age.** No word or letter anywhere. Digits and the fraction bar are drawn only by `symbols.ts`, each on a bracket over the share it names or on the lid of a tin of that length; none appears before the position named `written`. `npm run wordless:check` passes.
- **Wordless guidance.** The template's idle ladder is wired in the Mount. What it shows for this game (what can be touched, then a stroke across the far end of a fruit, never where to cut) is designed in the sheet and not yet built.
- **60 fps on a mid-range iPad.** Not measured. The still is painted once for a size of surface and copied each frame, which is one draw. The pixel ratio is capped at 2 by the template's tiers.
- **Procedural or committed assets only.** Everything is drawn at run time on a canvas 2D context; no image, font or sound file. The source and built egress scans pass, and so does the scan for pack ids in the build.
- **Its own art direction.** Comic-book halftone, the first row reserved for the game; written up in `ART.md` under "The look". The registry row is a request to the lead once the owner has seen it.

### The learning claim

As the sheet has it; every check state below was read with the lookup on 2026-10-03 and has to be read again on the day of the pull request.

Fruit Slicer is designed from four content standards adopted by the California State Board of Education for grade 4 and grade 5 mathematics (`us-ca 4.NF.1`, `4.NF.2`, `4.NF.3.a` and `5.NF.4.a`; each state-board-adopted-standard, confirmed), and, for the Netherlands, from six goals of SLO's guidance for fase 2 and fase 3, which is guidance and not law (`nl rw/gb/5/01/fase2`, `rw/verh/1/02/fase2`, `rw/bew/6/01/fase2`, `rw/bew/6/02/fase3`, `rw/gb/5/05/fase3` and `rw/gb/5/06/fase3`; each curriculum-institute-guidance, confirmed), from one item of the legal core goals of 2026 (`nl 10 B d`; legal-core-goal, regime 2026, confirmed) and from two statements of the legal reference level 1F (legal-reference-level, confirmed), those three being end-of-primary goals. It names no California grade 6 record. It makes no claim about what a child who plays it has reached.

The sheet has not yet been checked by someone who did not write it.

### Defaults taken for the owner

From the guide, each kept as written:

- No symbol stands alone: every fraction and sign sits on or beside the length it names, and no order can be known only by reading one.
- No letters and no written words, on a ticket or anywhere else. The comic look is drawn without its sound words.
- No reading on the object: nothing is written on a piece the child cut, and no number says how close a cut was. How close it was is the gap or the overhang.
- No camera shake and no impact pause: the slice answers with its chain, its sound and squash.
- No speech: the characters' voices are invented and synthesized.
- The look is the first row the lead reserved; the second was not spiked.
- The demo's verb was changed (its flying fruit and clock are gone); its swing of the blade and its wet slice are kept.

From the game's own sheet:

- The give of a tin is one twenty-fourth of the fruit's length to either side.
- The parts in play are halves, quarters, eighths, thirds, sixths, fifths, tenths and twelfths; hundredths are left out.
- Written fractions start at the fifth position, after halves and quarters have been cut by eye.
- A first visit from age 11 opens where the notation first appears.
- A piece rings by its length, as a string does.

### What the next builder should know

- Decide what the tin's give is in the same unit as the shortest piece a cut can make. Here both are one twenty-fourth of the fruit, so anything thinner than the give is not a piece, and the largest state is bounded by one number.
- Keep every length a whole number of points, with a whole that divides by every part in play and by twice each. Two quarters then lie exactly on a half with no rounding, and "fits" never depends on floating point.
- A tolerance that is fair for an order is too loose for a taste. With twelfths, a give of one twenty-fourth lets every length count as "a whole number of parts". The ants' taste uses the give or a quarter of a part, whichever is smaller.
- A test that lays out hundreds of customers at every position and holds each to the limits found two faults the eye had missed: the twins ordering a share whose halves were not yet in play, and the cat ordering a whole.
- A position's id can be derived from what a customer carries, so "shown once" needs no extra field on the customer: `ideaOf` in `orders.ts`.
- On load, do not re-place saved pieces through the rule that sets a piece down: that rule snaps to a neighbour, and a legal state would open changed. Keep a saved place when it is free and fall back to the rule only when it is not.
- For a still on a machine with no graphics card, a canvas 2D scene is drawn as it will look; only the frame rate is unknown.
