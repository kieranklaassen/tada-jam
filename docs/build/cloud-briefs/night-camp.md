# Brief: Night Camp (`night-camp`)

Read `docs/build/CLOUD.md` first. This brief is the whole contract for your game; the guide it points to holds the rules.

## The game

- Key: `night-camp`. Name: Night Camp. Age band: 9 to 12. Emoji: 🏕️.
- Generator: `npm run new:game -- night-camp "Night Camp" 9-12 🏕️`
- Branch: `lane/night-camp`. Base branch: `feat/learning-games-build`. Base commit: the one your starting message names.
- Subject and the skill that is the verb: Mathematics: rates and planning, with the night as a test the child starts.
- Suggested renderer: canvas 2D ("Canvas or three.js" in the guide decides what follows from it). Say in the sheet if you choose otherwise, and why.
- The demo it comes from: `lab/arcade/protos/campfire-nights/`. Read it for the idea, the verb and the feel in the hand. Copy no line of it.

## The idea

The child plans a camp for the night: the fire eats wood at a rate, the lantern oil, the water, and each camper needs so much per hour. The child lays in supplies and sets things up, then starts the night as a test and sees where the plan ran short, changes it and runs it again. The demo's night clock that pushed the player is gone: the night runs only when the child starts it and on attended time. Quantities per unit of time are shown as lengths and piles, with numerals laid on them by `symbols.ts`.

The owner's bar for every game: lively and funny, never slow or quiet; animated, cute and warm; deep enough to come back to for weeks through combinations and characters; with no score, coin, streak, reward, praise or timer that pushes. Short animated scenes are welcome where the guide allows them.

## The looks reserved for it, in order

1. Survey map and field kit
2. Scale-model diorama

Each is a row of the ledger in section 4 of `docs/art-direction.md`; build from the row's own description.

## The records the skill rests on

These were read from the education pack on 2026-10-02. They are where your sheet's records part starts, not the part itself: read each record file and its Limits, check each one again with `npm run -s education:find -- --id <pack id>`, drop one that does not carry your verb, and add one that does. The sheet names no school skill without a record. The skill line at the top of this brief is the wording of the roster; where the Notes below say the records carry less or carry it in another subject, your sheet follows the records, and its claim says only what they carry.

### us-ca
- `edu.us-ca.grade-4.mathematics.objective.4-oa-3` (code 4.OA.3): standing state-board-adopted-standard; check state confirmed; level grade-4 (ages 9 to 10), basis derived. Asks, in our words: solve story problems of more than one step in whole numbers, decide what a remainder means, and check by estimating that the answer is sensible. Limits the game takes: whole numbers in and whole-number answers; no range in the statement (the grade's neighbours multiply at most four digits by one or two by two and divide at most four digits by one); the record writes the unknown as a letter, which the jam's kid side never shows.
- `edu.us-ca.grade-4.mathematics.objective.4-md-2` (code 4.MD.2): standing state-board-adopted-standard; check state confirmed; level grade-4 (ages 9 to 10), basis derived. Asks, in our words: solve story problems about time spans, liquid volumes, masses, distances and money with the four operations, showing the amounts on a diagram such as a line with a scale. Limits the game takes: five kinds of quantity; "simple" fractions and decimals are not defined; a change of unit goes from larger to smaller only; no number range.
- `edu.us-ca.grade-5.mathematics.objective.5-oa-3` (code 5.OA.3): standing state-board-adopted-standard; check state confirmed; level grade-5 (ages 10 to 11), basis derived. Asks, in our words: from two given rules build two number rows, see how the terms in the same position relate, pair them and draw the pairs as points. Limits the game takes: two rules, both given; the explanation is informal; the statement's example adds a fixed number from 0; no number range.
- `edu.us-ca.grade-6.mathematics.objective.6-rp-2` (code 6.RP.2): standing state-board-adopted-standard; check state confirmed; level grade-6 (ages 11 to 12), basis derived. Asks, in our words: understand the amount for one that belongs to a ratio, and talk in rates. Limits the game takes: unit rates go no further than non-complex fractions; the second number of the ratio is not zero.
- `edu.us-ca.grade-6.mathematics.objective.6-rp-3-a` (code 6.RP.3.a): standing state-board-adopted-standard; check state confirmed; level grade-6 (ages 11 to 12), basis derived. Asks, in our words: build tables of matching ratio pairs, work out the gaps, draw the pairs as points and compare two ratios by their tables. Limits the game takes: the amounts in the tables are whole numbers; tables, tape diagrams and double number lines are example tools.
- `edu.us-ca.grade-6.mathematics.objective.6-rp-3-b` (code 6.RP.3.b): standing state-board-adopted-standard; check state confirmed; level grade-6 (ages 11 to 12), basis derived. Asks, in our words: solve how-much-for-one problems, price per item and steady speed among them. Limits the game takes: those two kinds are included, not the only ones; no number range; the non-complex-fraction limit of 6.RP.2 holds.

### nl
- `edu.nl.fase-2.mathematics.objective.c68e65fb-31aa-4aef-a8ec-b80019d39a63` (code rw/verh/2/03/fase2): standing curriculum-institute-guidance; check state confirmed; level fase-2 (ages 9 to 10), basis convention. Asks, in our words: solve simple ratio problems in numbers with a ratio model prepared for the child (recipes, prices), by doubling, halving, multiplying and dividing. Limits the game takes: an offer for groep 4 to 6 with no year; "simple"; the model is prepared for the child and is not named; no number range.
- `edu.nl.fase-2.mathematics.objective.04dd6299-7923-43a0-9bf1-f0f42a41f7c1` (code rw/m/8/01/fase2): standing curriculum-institute-guidance; check state confirmed; level fase-2 (ages 9 to 10), basis convention. Asks, in our words: calculate, in simple meaningful situations, with combined quantities such as price per kilogram, per metre, per litre and kilometres per hour. Limits the game takes: those four are the only combined quantities named, as examples; no situations named; no number range.
- `edu.nl.fase-3.mathematics.objective.87b06a71-c7bb-468a-8596-32f990748f3b` (code rw/m/8/03/fase3): standing curriculum-institute-guidance; check state confirmed; level fase-3 (ages 10 to 12), basis convention. Asks, in our words: interpret, compare and calculate with a price or a number per unit of length, area, capacity, weight or time. Limits the game takes: an offer for groep 7 and 8 with no year; five kinds of unit and no particular unit, currency or formula; no number range.
- `edu.nl.fase-3.mathematics.objective.dcc92663-f69d-42d8-80ee-4bdb1575f789` (code rw/verh/2/07/fase3): standing curriculum-institute-guidance; check state confirmed; level fase-3 (ages 10 to 12), basis convention. Asks, in our words: use strip tables, ratio tables and scale lines as a means of solving ratio problems. Limits the game takes: the tools are named, the subject of the problems is not; no number range.
- `edu.nl.einde-po.mathematics.objective.26c57e57-5ee4-459f-9a5f-9044cf3f2e8e` (code 10 C e): standing legal-core-goal, regime 2026; check state confirmed; level einde-po (end-of-primary goal), basis convention. Asks, in our words: solve ratio problems. Limits the game takes: an item under goal sentence 10 C; no kinds of problem, no method and no number range.
- `edu.nl.einde-po.mathematics.objective.referentieniveau-1f-rekenen-2-verhoudingen-c-gebruiken-functioneel-gebruiken-1` (no printed code): standing legal-reference-level; check state confirmed; level einde-po (reference level 1F, end of primary school), basis convention. Asks, in our words: solve simple ratio problems with easy numbers in practical situations. Limits the game takes: "simple" and "nice numbers" are not defined; no number range.

### Notes
- Difference at 9 to 10: the Dutch fase 2 records already offer ratio problems with a prepared model and "per" quantities; California names ratio and unit rate first in grade 6 (11 to 12), and gives grades 4 and 5 whole-number problems of several steps, measurement problems and two-rule patterns. Follow this at 9 to 10: whole numbers, whole-number answers and a table laid out for the child, which is inside us-ca 4.OA.3 and nl rw/verh/2/03/fase2 at once. Reason: the California grade 4 limit (whole numbers only) is the tighter one, and the Dutch records leave the range open. A California claim uses the word "rate" only from the grade 6 records.
- A burn rate (a number per unit of time) is named by nl rw/m/8/03/fase3 at 10 to 12. In fase 2 the "per" quantities named are prices and kilometres per hour, so fuel per hour at age 9 is the game's own choice under "such as". On the California side unit price and steady speed are the kinds named, as included kinds.
- Not carried: two rates at once (used up against made). Only us-ca 5.OA.3 comes near, with two given rules compared term by term; no Dutch record names it. "Planning" is in no mathematics record. Narrow the claim to "working out whether a stock lasts: whole-number reasoning in several steps (9 to 10), then ratio tables and amount-for-one reasoning (nl from 9, us-ca from 11)". Rates with fractions inside fractions are beyond California grade 6.
- No record asks for working against the clock, and the night is not a countdown (jam rule on timers).
- Also near, all confirmed: nl rw/verh/2/02/fase2 (how a ratio table is built), nl rw/m/8/02/fase3 (speeds), us-ca 5.NBT.6 (division of at most four digits by two, the grade 5 number size). Every record named is `confirmed`.

## This run

This run covers the design and the rules. Two pilot games are proving the template's helpers in a running game first, so you do not build your toy yet.

1. The steps under "Getting the code" in the cloud page.
2. The design sheet, pushed with `Open: sheet ready for check, round 1`.
3. The look spike for your first reserved look: the game's real scene in the style, at the quality bar, shown by the Mount at load with a fixed seed and with nothing playable behind it.
4. The rules as pure modules with tests beside them (no renderer, no DOM), in new files of your own, leaving the copied template files as they are wherever you can: the model of the world, the object-by-action grid, the errors as consequences, the characters' tastes, the designed order with its position ids in `config.ts`, the saved state with its defensive `deserialize`, and the size test. The guide lets a remote builder write rules while the check of its sheet runs, at its own risk: record in the status block the sheet commit they were written against.
5. Stop there: write the status block, push, and report. Your next message brings the checker's report on your sheet and the commit that holds what the pilots changed in the template.

Numerals and mathematics signs are allowed in your band, and the module that draws them, `symbols.ts`, is being proven by one game first (Fruit Slicer). In this run, design where each numeral lies in the sheet and in the pure rules, and draw none yet: your next message names the commit that holds the module to start from.

## Defaults that bind you

The owner has not yet answered the questions listed under "Symbols, and the defaults awaiting the owner" in the guide. Work under each default as written there. If your design needs one of them answered differently, do not assume it: say so under what the owner has to decide.
