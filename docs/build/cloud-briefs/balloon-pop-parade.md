# Brief: Balloon Pop Parade (`balloon-pop-parade`)

Read `docs/build/CLOUD.md` first. This brief is the whole contract for your game; the guide it points to holds the rules.

## The game

- Key: `balloon-pop-parade`. Name: Balloon Pop Parade. Age band: 2 to 4. Emoji: 🎈.
- Generator: `npm run new:game -- balloon-pop-parade "Balloon Pop Parade" 2-4 🎈`
- Branch: `lane/balloon-pop-parade`. Base branch: `feat/learning-games-build`. Base commit: the one your starting message names.
- Subject and the skill that is the verb: Mathematics: matching by one attribute, and small sets of one to three.
- Suggested renderer: three.js ("Canvas or three.js" in the guide decides what follows from it). Say in the sheet if you choose otherwise, and why.
- The demo it comes from: `lab/arcade/protos/balloon-pop-parade/`. Read it for the idea, the verb and the feel in the hand. Copy no line of it.

## The idea

A parade of friends comes by, and each wants balloons. The demo was free popping, where the only decision was when to tap; the game keeps the parade, the squeak and the pop, and gets a new verb. The child chooses which balloon goes to which friend by one attribute (colour first), and how many: a friend who shows two gets two, never more than three. Popping stays a pleasure with a funny consequence and no penalty. The decision is always which one and how many, never where or when to tap.

The owner's bar for every game: lively and funny, never slow or quiet; animated, cute and warm; deep enough to come back to for weeks through combinations and characters; with no score, coin, streak, reward, praise or timer that pushes. Short animated scenes are welcome where the guide allows them.

## The looks reserved for it, in order

1. Inflatable vinyl toys
2. Papier-mâché carnival

Each is a row of the ledger in section 4 of `docs/art-direction.md`; build from the row's own description.

## The records the skill rests on

These were read from the education pack on 2026-10-02. They are where your sheet's records part starts, not the part itself: read each record file and its Limits, check each one again with `npm run -s education:find -- --id <pack id>`, drop one that does not carry your verb, and add one that does. The sheet names no school skill without a record. The skill line at the top of this brief is the wording of the roster; where the Notes below say the records carry less or carry it in another subject, your sheet follows the records, and its claim says only what they carry.

### us-ca
- `edu.us-ca.infant-toddler.mathematics.objective.cognitive-development-strand-2-0-emergent-mathematical-thinking-2-3` (code 2.3): standing department-published-foundation; check state confirmed; level infant-toddler (age 2), basis official. Asks, in our words: a toddler puts things into two or more groups by one feature, colour being one of the examples. Limits the game takes: one attribute at a time; no upper number of groups; naming the groups happens only sometimes, so no colour word is needed.
- `edu.us-ca.infant-toddler.mathematics.objective.cognitive-development-strand-2-0-emergent-mathematical-thinking-2-1` (code 2.1): standing department-published-foundation; check state confirmed; level infant-toddler (age 2), basis official. Asks, in our words: a toddler uses number words about amounts and says stretches of the count list, with slips. Limits the game takes: no number range; the word need not match the amount; counting one by one and numerals are not mentioned, so sets of one to three at age 2 are the game's own choice.
- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-2-0-operations-and-algebraic-thinking-2-5` (code 2.5): standing department-published-foundation; check state confirmed; level preschool-tk (ages 3 to 4), basis official. Asks, in our words: a child sees how things are alike and different and sorts them into two or more groups by one attribute. Limits the game takes: one attribute in the Early statement; more than one only in the Later statement, and then possibly in two steps; no attribute is named, so colour is the game's choice.
- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-1-0-counting-and-cardinality-1-4` (code 1.4): standing department-published-foundation; check state confirmed; level preschool-tk (ages 3 to 4), basis official. Asks, in our words: a child tells how many are in a small group at a glance, without counting. Limits the game takes: Early statement: a small group, with one to four as its example; Later statement: one to five; no arrangement is stated; larger sets are counted, which is another foundation.

### nl
- `edu.nl.peuters.mathematics.objective.inhoudskaart-rekenen-wiskunde-peuters-meten-meetkunde-meetkunde-opereren-met-vormen-en-figuren-1` (code Opereren met vormen en figuren / 1): standing curriculum-institute-guidance; check state confirmed; level peuters (ages 2 to 3, and a child just turned 4), basis convention. Asks, in our words: exploring what things are like (colour is one of the examples) and sorting them by one property. Limits the game takes: one property; two at once is not mentioned; no number of objects or groups.
- `edu.nl.peuters.mathematics.objective.inhoudskaart-rekenen-wiskunde-peuters-getallen-getalbegrip-hoeveelheden-6` (code Hoeveelheden / 6): standing curriculum-institute-guidance; check state confirmed; level peuters (ages 2 to 3, and a child just turned 4), basis convention. Asks, in our words: recognising a small group of 2 or 3 without counting. Limits the game takes: only 2 and 3 are named; no arrangement is stated; a set of one is not in this record.
- `edu.nl.peuters.mathematics.objective.inhoudskaart-rekenen-wiskunde-peuters-getallen-getalbegrip-hoeveelheden-1` (code Hoeveelheden / 1): standing curriculum-institute-guidance; check state confirmed; level peuters (ages 2 to 3, and a child just turned 4), basis convention. Asks, in our words: counting small amounts. Limits the game takes: "small" with no number; digits are not mentioned.
- `edu.nl.fase-1.mathematics.objective.inhoudskaart-rekenen-wiskunde-fase-1-meten-meetkunde-meetkunde-opereren-met-vormen-en-figuren-1` (code Opereren met vormen en figuren / 1): standing curriculum-institute-guidance; check state confirmed; level fase-1 (age 4, groep 1), basis convention. Asks, in our words: sorting things by one attribute or by more than one. Limits the game takes: what a school offers in groep 1 and 2, no year stated; no attribute named.

### Notes
- Thinnest support: quantity at age 2 in us-ca (the number record sets no range and does not ask that the word fits the amount). At 2 the game rests on grouping by colour; the size of a set may vary but must never be something a two-year-old has to get right.
- No record here is other than `confirmed`.
- Not carried: "matching" as a word (the records say sorting or grouping by one attribute, which a colour match is the smallest case of); a set of exactly one in the Dutch at-a-glance record (2 or 3 only); any numeral. Sets of one to three sit inside us-ca 1.4 for ages 3 to 4; for nl the top of three is the record's, the bottom of one is the game's choice.

## This run

This run covers the design and the rules. Two pilot games are proving the template's helpers in a running game first, so you do not build your toy yet.

1. The steps under "Getting the code" in the cloud page.
2. The design sheet, pushed with `Open: sheet ready for check, round 1`.
3. The look spike for your first reserved look: the game's real scene in the style, at the quality bar, shown by the Mount at load with a fixed seed and with nothing playable behind it.
4. The rules as pure modules with tests beside them (no renderer, no DOM), in new files of your own, leaving the copied template files as they are wherever you can: the model of the world, the object-by-action grid, the errors as consequences, the characters' tastes, the designed order with its position ids in `config.ts`, the saved state with its defensive `deserialize`, and the size test. The guide lets a remote builder write rules while the check of its sheet runs, at its own risk: record in the status block the sheet commit they were written against.
5. Stop there: write the status block, push, and report. Your next message brings the checker's report on your sheet and the commit that holds what the pilots changed in the template.

## Defaults that bind you

The owner has not yet answered the questions listed under "Symbols, and the defaults awaiting the owner" in the guide. Work under each default as written there. If your design needs one of them answered differently, do not assume it: say so under what the owner has to decide.
