<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: toy. The slice is built as a toy in the look, with sound, and the Mount shows it at load. Nothing of the game's cycle is wired: the rules for orders, customers, the tin and the judging are written and tested, and wait for the game stage.
- Look in use: comic-book halftone, the first reserved row. The second row was not spiked.
- For the lead, what to try first when the toy opens (`?chrome=0&seed=7#/play/fruit-slicer`, and `&fps=1` for the overlay):
  1. Land a finger on the bare counter above the board: the blade and its hairline are there at once. Pull straight down through the fruit.
  2. One long stroke from above the board to below the shelf, through everything.
  3. Tap the crate a few times: fresh fruit lands, the far lane is shoved onto the shelf, and what drops off the shelf goes to the dog.
  4. Swipe across the bare counter (the awning flaps), across the crate (one fruit of each kind), and past the dog.
  5. Tap a fruit, a short piece, the dog. Then take the hands off for seven seconds: the glow, then the ghost hand.
  6. `&spike=1` still shows the look spike's still, with the game's page (window, queue, tin).
- Sound: every touch has a voice, held as plain numbers in `voices.ts` and played through `audio.ts`. No one has listened to any of them. Loudness and character are the first thing to check with ears.
- Check of the sheet. Round 1 (checker B): open, 16 findings, all pasted. Round 2 (checker D): open, 3 findings, all pasted as given, none refused; it judged the sheet part with hash `60f8fa129516481f599a0fe6a21733bc170b4d484701928607ac9e6eb8e3e1cc` (commit `2029cc4`). With them, at the lead's asking, two sentences of the builder's own were added to "Two wait, and the child calls one": what a touch on a waiting customer does while the one at the window is unserved, and what becomes of a piece given to one who waits or flung at any customer. The next checker reads those as new text.
- The sheet to check in round 3 is the one at commit `cc46a75fdaf8c2d105438559610fe86f8f121523`. The hash of its sheet part there, and at the tip of this run, is `9e8166f69b49578f037e3cf3f528bef8cb5cdba6a6ad334d6aeb6bdfe307edbd`. The look below the sheet was brought up to the toy without touching it.
- The rules follow the sheet at `cc46a75`, still ahead of its pass, at the builder's own risk. What round 2 changed in them: a pelican already served can still leave as the glider, taking what it had eaten; a served customer fed another piece eats it with nothing more judged; a piece given to one who waits is eaten and gone, a whole fruit given to a waiting pelican is the glider and another customer joins the queue, and a piece flung at any customer is gone (`cycle.ts`).
- Open: sheet ready for check, round 3
- Open, requests to the lead:
  - Stills and a frame rate of the toy on a real graphics card, at pixel ratio 2.
  - Ears on the voices.
  - The registry row for the look once the owner has seen it.
  - `symbols.ts`: nothing about what its functions take or return changed in this run. The toy draws no numeral, since nobody orders anything in it; the spike still does.
  - No frozen file needs changing.
- Open, not yet done or still weak:
  - The toy holds two acts, the slice and the poke, on four things: the fruit, a piece, the crate and the dog. Carrying a piece, flinging one and the roller are not in it, and neither are the tin and the customers. A drag always cuts; how a carry is told from a stroke is the first thing the game stage has to settle.
  - The wall is bare until the first cut. The awning sways and the dog breathes, but a child's eye has little to rest on up there.
  - The spatters gather above the place of the cut, since the wall is close; they read as red stars more than as juice.
  - The cat and the boa are not drawn yet.
  - No overlap test of what is drawn against what the model holds yet: the toy's pieces are drawn exactly where the model has them, the model holds that no two overlap, and the flights to the dog are effects with no body. The test belongs with the game's carried pieces.
  - The cold playtest proxy was run here in its short form only (ten seconds hands off, then a scripted minute, with stills, on the production build). A newcomer's eyes are the lead's or the owner's.
  - Commit `2266bcd` failed the typecheck and was fixed by `98ce6b4`; CI is red on that one push.
- What was measured here, on the production build, in Chromium drawing in software, with no graphics card: the toy's own work a frame, tier 0 pinned, pixel ratio 2, 1180 by 820, with the processor throttled six times, through a busy stretch of strokes and crate taps: 95th percentile 4.1 and 4.4 ms in two runs of twenty seconds (median 2.4 and 2.6), against the jam's target of under 8 ms; unthrottled, 0.5 ms. These say the toy's own work is small. They are not a frame rate, and no physical iPad was measured.
- What ran at the end of this run, all passing here: `npx tsc --noEmit`; `npx vitest run games/fruit-slicer test/games.test.ts` (31 files, 387 tests; the game's own take about four seconds); `npm run -s wordless:check`; `node scripts/egress-check.ts`; `npm run check` whole; `npm run build`, `npm run egress:built`, `npm run education:built`. A green run here is not the gate: CI is.
- Answer files handled: `docs/build/answers/fruit-slicer-1.md` and `fruit-slicer-2.md`. None with a higher number was on the base branch when this run ended.
- Next run: the owner's answer on the look and the toy, the third check of the sheet, and then the game on the toy.

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
- `fruit-slicer.tsx` (the Mount): changed where its comments say a game goes in, following the pilot notes, and nowhere else:
  - `draw` has a case with no state: the bare page of the look, until the slot has been read.
  - The toy is built in the loading `then`, which draws once itself.
  - The game queues its sounds, and they are played in the gesture handler right after the game has answered, and again after the step in the loop (`flush`).
  - What `ladder.update` returns is kept and handed to the draw.
  - `seed=<n>` in the address fixes the visit's random streams; without it a new seed is drawn.
  - A touch in the top right corner, 72 by 72, goes to the overlay and to nothing else.
  - The state is the game of `save.ts`, not the template's three fields, and it is saved at the throttle when a touch has changed it. Nothing is saved in the air, since the world changes on the touch and what moves afterwards is only shown.
  - One thing **for the template**: the pilot notes say a press has one ending, `tap`, `dragLift`, `dragEnd` or `pressEnd`. A drag in fact gets two, `dragLift` and then `dragEnd` after the grace, so whatever a game does on the lift has to be safe to do twice. The toy's `lift` is.
- New files of this game's own that any canvas game would want, **for the template** if the lead agrees: `stage.ts` (`fit`, `toStage`, about twenty lines, as the pilot notes describe); `sound.ts` (the bridge from notes to a `Voice`, with a delay for a run of notes); the counted frame-budget test (`frameBudget.test.ts`: the painters run on a stand-in context that counts every call, so no canvas and no DOM is needed).
- `audio.ts`: as copied; the toy plays through it. One gap **for the template**: the cloud page asks for every voice as plain numbers in a pure module with a range test, and the template has no shape for that. `voices.ts` here uses a note of kind, pitch, glide, wave, peak, attack, length and delay, which maps one to one onto `tone` and `noise`; the adapter that plays a list of notes is a few lines the toy will add. The note type, the adapter and the range test would serve every game.
- `input.ts`, `guidance.ts`, `scene.ts`, `overlay.ts`, `ART.md`, `REFINEMENT.md`: as copied.
- The four frozen files are untouched.
- Not the template, but for the next cloud builder: a check script that pipes each command through `tail` hides its exit code. Mine did, and one red commit was pushed. Read the exit code, not the last line.

### For the owner to decide

The game works under every default of the guide as written and asks for none to be changed. These are for the owner all the same:

- **The give of a tin**: a cut within one twenty-fourth of the fruit's length counts as a fit. No record sets it. It decides how often a first cut succeeds, so it is the first thing to judge with a child at the toy checkpoint.
- **No fraction on a piece the child cut.** Under the default on readings, the written fraction is laid only on what was ordered (the ticket and the tin), never on a cut piece. A child therefore never sees a name for a piece of its own making. If the owner would like a piece that lies exactly on ruled parts to show its fraction, that is a change to the default.
- **A piece rings by its length** (half the length, an octave higher). It is true of a string and is used as a toy, not taught. Whether it stays is a matter of taste.
- **The look**: comic-book halftone, at the toy checkpoint.
- **The toy**: the slice. Whether cutting fruit again and again, with its thwack, its juice on the wall and the dog, is a pleasure with nothing to achieve is his to say at the same checkpoint.
- **The voices**: nobody has heard them.

## Pass log

One row per pass: what was looked at, the critique written as the child, the one themed fix set, what was reverted, the measured frame rate, and what is still weak. Passes 1 and 2 are on the look spike, a still; pass 3 is on the toy.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | The spike's first still, 1180 by 820 at pixel ratio 2, headless Chromium in software. | "The bird's head is stuck in the roof. The two mice have their noses through each other. The ants are one black blob. The star is sitting on the end of the red bar so I can't see where it was cut. Why is the bottom shelf spotty when the top one isn't?" | Clarity of the working area and the figures: a lower awning and the pelican moved clear of it; the twins apart, nose to nose; smaller ants, spaced, one lifting its legs; the burst, the drops and the speed lines moved off the cut end; the shelf made the same plain slab as the board, with no dots. Nothing reverted. | Not measured: a still, on a machine with no graphics card. | The speed lines are thin and read as a scratch. The shelf rows are thin for a finger. The ticket's bracket is fine but the tin's fraction sits on a dotted lid and needs its white edge to read. |
| 2 | The same still after the fix set, at pixel ratios 1 and 2. | "It's a comic. The bird wants the red thing on its card, three bits out of four. The red bar in the box is too short, there's a gap by the zigzag. I'd cut it again." | None: this pass only checked the first. | Not measured. | Nothing moves yet, so nothing says "touch me". The cat and the boa are not drawn. The dog's tongue is a plain rectangle. |
| 3 | The toy, through a scripted minute at 1180 by 820: the load, a finger down, a cut, a long stroke through both lanes and the shelf, six crate taps, then seven seconds hands off. Dev build at pixel ratio 1, then the production build at pixel ratio 2. | "It's a long red thing and a dog. When I put my finger down there's a knife and a line, good. When I cut, a big white star sits right on the place I cut, so I can't see my cut. All the red stars on the wall are in one lump. Why is the dog standing in a black box? The hand shows me to chop. The top is empty." | The cut stays readable and the setting reads as what it is: the burst pops above the piece, not on the cut; the drops for the wall fan out wider and land as rounder splats; the dog looks out of a dark arch with a pale sill instead of a box. Nothing reverted. | Not a frame rate: the toy's own work a frame on the production build, Chromium in software, tier 0, pixel ratio 2, processor throttled six times: 95th percentile 4.1 and 4.4 ms over two busy runs of twenty seconds. | The wall is bare until the first cut. The spatters still gather above the cut and read as red stars. A drag always cuts, so a piece cannot be moved. The first fruits from the crate can all be one colour, by the seed. |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

So far there is a design sheet, the toy and the rules for the game. No frame rate has been measured on any machine, and no physical iPad has been used.

- **Alive at idle.** The dog breathes without stopping, its ears trail a beat behind and never move as one, and after a rest it does one small thing (a blink, an ear flick, a sniff, a head tilt, a yawn, a pant), never the same twice running; the awning's scallops sway out of step. All of it stops when the game rests, since it runs on the attended clock. A test holds that no two of the dog's actions are the same or nearly.
- **Motion and sound on every touch.** The blade and its ring are there when the finger lands. A cut answers with a thwack whose pitch follows the length cut, a burst, drops that spatter the wall and two pieces hopping apart; a tap on anything gets its own voice and movement; a swing that crosses nothing whistles and flaps the awning. Thirty-two answers of the grid are held different in look and in sound by a test; the toy uses the eight that need no customer. No one has heard the voices.
- **Weight, squash and follow-through.** Pieces hop and land with a squash that never changes their length; a fresh fruit drops in and settles; the crate rocks on a stiff spring and the awning flaps on a loose one; the dog's reactions overshoot and its ears follow late.
- **Kid-clear.** Two panels, few things, heavy outlines. The fruit, the board and the shelf are flat; the dots are on the wall, the counter, the crate and the dog. Every length on the counter starts from one left edge at one scale. Lanes and rows are 56 units tall.
- **Wordless clarity for the declared age.** No word or letter anywhere. Digits and the fraction bar are drawn only by `symbols.ts`, each on a bracket over the share it names or on the lid of a tin of that length; the toy shows none, since nobody orders anything in it. `npm run wordless:check` passes.
- **Wordless guidance.** The idle ladder in its first form: after a few seconds the longest fruit on the board glows, then a ghost hand strokes straight down across it, at a different place each time and never one that would pass for a half, a third or a quarter; with the board bare the crate glows and the hand taps it. Any touch clears it.
- **60 fps on a mid-range iPad.** Not measured. Measured here instead, on the production build in Chromium drawing in software, tier 0 pinned, pixel ratio 2, 1180 by 820, processor throttled six times: the toy's own work a frame, 95th percentile 4.1 and 4.4 ms in two busy runs (target under 8 ms). One full-surface composite a frame; the heaviest frame the rules allow is 178 figures and about 1,500 context calls, held by a counted test. The pixel ratio is capped at 2 by the template's tiers.
- **Procedural or committed assets only.** Everything is drawn at run time on a canvas 2D context and every sound is synthesized; no image, font or sound file. The source and built egress scans pass, and so does the scan for pack ids in the build.
- **Its own art direction.** Comic-book halftone, the first row reserved for the game; written up in `ART.md` under "The look". The registry row is a request to the lead once the owner has seen it.
- **Found as left.** The world changes on the touch and what moves afterwards is only shown, so the game is whole at every instant. A test puts the toy away at every step of a stroke and opens it exactly as it was, with no effect running and no sound waiting.

### The learning claim

As the sheet has it; every check state below was read with the lookup on 2026-10-03 and has to be read again on the day of the pull request.

Fruit Slicer is designed from four content standards adopted by the California State Board of Education for grade 4 and grade 5 mathematics: `us-ca 4.NF.3.a`, and in part `us-ca 4.NF.1` (one length given two names by cutting, with the reason there to be seen in the lengths; the child is not asked to explain it), `us-ca 4.NF.2` (two shares compared as lengths, with the game ruling both into the same parts and laying the sign; the child writes no sign and gives no reason) and `us-ca 5.NF.4.a` (a fruit or a piece seen as equal parts of which some are taken; no product is named and no chain of operations is asked for). For the Netherlands it is designed from six goals of SLO's guidance for fase 2 and fase 3, which is guidance and not law: `nl rw/bew/6/01/fase2`, and in part `nl rw/gb/5/01/fase2` (without doubling), `nl rw/verh/1/02/fase2` (of a whole, not of a quantity), `nl rw/bew/6/02/fase3` (a part of a length, placed by eye; never the whole from a part), `nl rw/gb/5/05/fase3` (equal shares made in pieces; no row is asked for or written) and `nl rw/gb/5/06/fase3` (comparing and giving a place; nothing is put in order). It is also designed in part from one item of the legal core goals of 2026, `nl 10 B d` (comparing, with the reason shown; no ordering, and simplifying only as far as two names for one length), and from two statements of the legal reference level 1F, one in part (comparing only, with no number line) and one on the notation with a horizontal bar; those three are end-of-primary goals. The signs for less than, equal and greater than are taken from the California records alone: no Dutch record the game names carries them. The parts beyond half and quarter follow the California list and are, on the Dutch side, the game's own choice. For California the plain cut of one share from one fruit rests on the `grade-5` record alone. Every record named was confirmed when the lookup was read on 2026-10-03.

It is built on a representation taken from one with evidence behind it for fraction size: an estimate on a line followed by the true place beside it. The strip with a pictured share, as built here, is school practice and has no trial of its own. It makes no claim about what a child who plays it has reached.

It names no California grade 6 record. The sheet has been checked twice by people who did not write it (16 findings, then 3, all pasted) and waits for its third check.

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
- Let the world change on the touch and let every movement afterwards be an effect that only shows how. Found as left then costs nothing: there is never anything in the air to put down before a save.
- Keep the toy's runtime out of the Mount, in a class that takes gestures and seconds and gives a frame and a list of sounds. A test can then play the whole toy, a put-away in the middle of a stroke included.
- A stroke is a run of short steps. Test the step that ends exactly on the line it is meant to cross: with a strict comparison on both sides it cuts never, and a child's straight slow stroke hits that case.
- A list of the things that left the world has to be read from the world before they left; and when a cut piece is itself what drops, it drops at its new length.
- Give the painters the context to draw on and have them return what they drew. A stand-in that counts calls then gives a frame budget that does not depend on the machine.
