# Brief: Fruit Slicer (`fruit-slicer`)

Read `docs/build/CLOUD.md` first. This brief is the whole contract for your game; the guide it points to holds the rules.

## The game

- Key: `fruit-slicer`. Name: Fruit Slicer. Age band: 9 to 12. Emoji: 🍉.
- Generator: `npm run new:game -- fruit-slicer "Fruit Slicer" 9-12 🍉`
- Branch: `lane/fruit-slicer`. Base branch: `feat/learning-games-build`. Base commit: the one your starting message names.
- Subject and the skill that is the verb: Mathematics: fractions on a strip: the cut is placed at a fraction of the length, with the notation laid on the quantity.
- Suggested renderer: canvas 2D ("Canvas or three.js" in the guide decides what follows from it). Say in the sheet if you choose otherwise, and why.
- The demo it comes from: `lab/arcade/protos/fruit-slicer/`. Read it for the idea, the verb and the feel in the hand. Copy no line of it.

## The idea

Long fruit lies along a strip, and each customer orders a fraction of its length. The child places the cut; the piece is laid against the order, so a cut that is off shows by how much and in which direction. Equal fractions are found by cutting (two quarters lie exactly on a half). The demo's flying fruit and its clock are gone; what is kept is the swing of the blade and the wet, satisfying slice. Numerals and the fraction bar are allowed here, drawn only by `symbols.ts` and always on or beside the length they name; no symbol stands alone.

The owner's bar for every game: lively and funny, never slow or quiet; animated, cute and warm; deep enough to come back to for weeks through combinations and characters; with no score, coin, streak, reward, praise or timer that pushes. Short animated scenes are welcome where the guide allows them.

## The looks reserved for it, in order

1. Comic-book halftone
2. Vector arcade glow (demo: `glow-pegs`)

Each is a row of the ledger in section 4 of `docs/art-direction.md`; build from the row's own description.

## The records the skill rests on

These were read from the education pack on 2026-10-02. They are where your sheet's records part starts, not the part itself: read each record file and its Limits, check each one again with `npm run -s education:find -- --id <pack id>`, drop one that does not carry your verb, and add one that does. The sheet names no school skill without a record. The skill line at the top of this brief is the wording of the roster; where the Notes below say the records carry less or carry it in another subject, your sheet follows the records, and its claim says only what they carry.

### us-ca
- `edu.us-ca.grade-4.mathematics.objective.4-nf-1` (code 4.NF.1): standing state-board-adopted-standard; check state confirmed; level grade-4 (ages 9 to 10), basis derived. Asks, in our words: explain with fraction pictures why a fraction keeps its size when top and bottom are multiplied by the same number (more parts, each smaller), and make equivalent fractions. Limits the game takes: grade 4 denominators are nine values only (halves through sixths, then eighths, tenths, twelfths and hundredths), so an equivalent is in range only when its denominator is on that list; the explanation uses a visual model; lowest terms are not asked.
- `edu.us-ca.grade-4.mathematics.objective.4-nf-2` (code 4.NF.2): standing state-board-adopted-standard; check state confirmed; level grade-4 (ages 9 to 10), basis derived. Asks, in our words: compare two fractions whose tops and bottoms both differ, for example by a shared denominator or against one half, record the result with <, = or > and give a reason. Limits the game takes: the same nine denominators (thirds against fifths would need fifteenths, which is off the list); two fractions at a time; both of wholes of one size; the strategies are examples.
- `edu.us-ca.grade-4.mathematics.objective.4-nf-3-a` (code 4.NF.3.a): standing state-board-adopted-standard; check state confirmed; level grade-4 (ages 9 to 10), basis derived. Asks, in our words: see a fraction with a top above 1 as that many unit pieces joined, and adding and subtracting as joining and separating pieces of one whole. Limits the game takes: the same nine denominators; pieces of one same whole; like denominators only; the fraction may be more than one whole.
- `edu.us-ca.grade-4.mathematics.objective.4-md-4` (code 4.MD.4): standing state-board-adopted-standard; check state confirmed; level grade-4 (ages 9 to 10), basis derived. Asks, in our words: mark a set of measurements taken to halves, fourths and eighths of a unit along a line, and answer adding and subtracting questions from it. Limits the game takes: 1/2, 1/4 and 1/8 only; it is a data record, used here only for marks at fractions of a unit on a line.
- `edu.us-ca.grade-5.mathematics.objective.5-nf-4-a` (code 5.NF.4.a): standing state-board-adopted-standard; check state confirmed; level grade-5 (ages 10 to 11), basis derived. Asks, in our words: read a fraction of an amount as cutting the amount into equal parts and taking some of them, and multiply a whole number or a fraction by a fraction. Limits the game takes: one factor is a fraction; no denominator list; mixed numbers are not named in this part.
- `edu.us-ca.grade-6.mathematics.objective.6-ns-6-c` (code 6.NS.6.c): standing state-board-adopted-standard; check state confirmed; level grade-6 (ages 11 to 12), basis derived. Asks, in our words: place whole numbers, fractions and decimals of either sign on a number line that runs across or up and down. Limits the game takes: both directions named; negative numbers are included; no number range.

### nl
- `edu.nl.fase-2.mathematics.objective.d147c1ee-a77d-4de5-8bb6-2f0ed78db700` (code rw/verh/1/02/fase2): standing curriculum-institute-guidance; check state confirmed; level fase-2 (ages 9 to 10), basis convention. Asks, in our words: explore and use, in concrete sharing situations, half and a quarter of a whole and of a quantity. Limits the game takes: an offer for groep 4 to 6 with no year; half and quarter are the only fractions; no number range; fraction notation is not mentioned.
- `edu.nl.fase-2.mathematics.objective.61276199-d643-4545-8411-ba3ed923f097` (code rw/bew/6/01/fase2): standing curriculum-institute-guidance; check state confirmed; level fase-2 (ages 9 to 10), basis convention. Asks, in our words: explore joining fractions that are said of a thing and finding their difference. Limits the game takes: expressly without fraction notation; exploring, with no method or fluency; no denominators named (the band's concepts are whole, half and quarter, rw/gb/5/01/fase2); the printed half-loaf example is not a limit.
- `edu.nl.fase-3.mathematics.objective.01a57126-2aa6-4575-8a4f-0cb68a165f86` (code rw/gb/5/05/fase3): standing curriculum-institute-guidance; check state confirmed; level fase-3 (ages 10 to 12), basis convention. Asks, in our words: think up rows of equivalent fractions. Limits the game takes: an offer for groep 7 and 8 with no year; the rows are thought up by the child, not only read; no denominators, starting fractions or row length.
- `edu.nl.fase-3.mathematics.objective.060a4233-7c11-4a0b-be4a-6207cb07a8e9` (code rw/gb/5/06/fase3): standing curriculum-institute-guidance; check state confirmed; level fase-3 (ages 10 to 12), basis convention. Asks, in our words: carry out fixed procedures for comparing, ordering and positioning fractions, mixed numbers included. Limits the game takes: does not say which procedures or on what the fractions are positioned (a number line is one reading); no denominators and no number range.
- `edu.nl.einde-po.mathematics.objective.cf930236-879b-4650-8c02-808ab63b93c7` (code 10 B d): standing legal-core-goal, regime 2026; check state confirmed; level einde-po (end-of-primary goal), basis convention. Asks, in our words: order, simplify and compare fractions and give the reason. Limits the game takes: an item under goal sentence 10 B; a reason is asked with the answer; no method prescribed; no range of denominators.
- `edu.nl.einde-po.mathematics.objective.referentieniveau-1f-rekenen-1-getallen-c-gebruiken-paraat-hebben-10` (no printed code): standing legal-reference-level; check state confirmed; level einde-po (reference level 1F, end of primary school), basis convention. Asks, in our words: compare and order simple fractions and place them on the number line in meaningful situations. Limits the game takes: "simple" is not defined; the placing is tied to meaningful situations; the printed example (a quarter and a half litre) is an example of the level, not a limit.

### Notes
- Difference at 9 to 10: California grade 4 has written fractions, equivalence and comparison with nine denominators; the Dutch fase 2 records name only whole, half and quarter and say "without notation"; written fractions, equivalence rows and comparing come in fase 3 (10 to 12). Follow this order: open on halves and quarters cut by eye with no symbol (inside both sets), then lay the notation on the strip and widen to the grade 4 denominator list. Reason: that list is the only denominator range either set states, so it sets the game's range; for nl say that notation at 9 goes beyond the fase 2 records and that the denominators are the game's own choice (no Dutch record names any).
- Number line: no California record for grade 4 or 5 names a fraction as a point on a number line (4.MD.4 is a line plot; 4.NF.6, confirmed, names a number line only in an example for decimals); the grade 6 record covers it and adds negative numbers the game does not need; grade 3 is not in the pack. For California ages 9 to 11 claim "a fraction of a strip, as a visual model", not "the number line". On the Dutch side the number line is named only at the end of primary school (the 1F record above, and at 1S `edu.nl.einde-po.mathematics.objective.referentieniveau-1s-rekenen-1-getallen-c-gebruiken-paraat-hebben-7`, legal-reference-level, confirmed).
- The cut at a fraction of the length rests on us-ca 5.NF.4.a (grade 5) and, for nl, on the fase 2 half-and-quarter record and on rw/bew/6/02/fase3 (`edu.nl.fase-3.mathematics.objective.b3a0749d-be59-4f73-b4a4-f8b42cc85ed1`, curriculum-institute-guidance, confirmed: a fraction applied to an amount).
- Signs and notation: the signs <, = and > are printed by us-ca 4.NF.2 only. On the Dutch side the 1F statement on greater and less than names the two relations without printing the signs, and the 2026 item 16 A a asks for mathematical symbols without listing any (both end-of-primary, both confirmed). The horizontal fraction bar is named by the Dutch 1F record `edu.nl.einde-po.mathematics.objective.referentieniveau-1f-rekenen-1-getallen-a-notatie-taal-en-betekenis-paraat-hebben-4` (legal-reference-level, confirmed).
- Not carried: no record sets how close a cut made by eye must be, and none asks for working against the clock; the tolerance is the game's own choice. Every record named is `confirmed`.

## This run

This run covers the design and the rules. The template you start from is its second version, proven by a three.js game; the canvas pilot (Monster Pizza) is proving it for a canvas game first, so you do not build your toy yet.

1. The steps under "Getting the code" in the cloud page.
2. The design sheet, pushed with `Open: sheet ready for check, round 1`.
3. The look spike for your first reserved look: the game's real scene in the style, at the quality bar, shown by the Mount at load with a fixed seed and with nothing playable behind it.
4. The rules as pure modules with tests beside them (no renderer, no DOM), in new files of your own, leaving the copied template files as they are wherever you can: the model of the world, the object-by-action grid, the errors as consequences, the characters' tastes, the designed order with its position ids in `config.ts`, the saved state with its defensive `deserialize`, and the size test. The guide lets a remote builder write rules while the check of its sheet runs, at its own risk: record in the status block the sheet commit they were written against.
5. Stop there: write the status block, push, and report. Your next message brings the checker's report on your sheet and the commit that holds what the canvas pilot changed in the template.

You are also the pilot for `symbols.ts`, the one module that draws numerals and mathematics signs: the template has none yet. Write it in this run as the guide describes (drawing functions that take numbers or a fraction as two integers, never a string), with its test and with the `wordless-ok: numeral <reason>` comments the check asks for, keep it free of anything particular to fruit, and report it under **Template notes**. The other games for ages 9 to 12 wait for it.

## Defaults that bind you

The owner has not yet answered the questions listed under "Symbols, and the defaults awaiting the owner" in the guide. Work under each default as written there. If your design needs one of them answered differently, do not assume it: say so under what the owner has to decide.
