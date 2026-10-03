# Brief: Hats for All (`hats-for-all`)

Read `docs/build/CLOUD.md` first. This brief is the whole contract for your game; the guide it points to holds the rules.

## The game

- Key: `hats-for-all`. Name: Hats for All. Age band: 2 to 4. Emoji: 🎩.
- Generator: `npm run new:game -- hats-for-all "Hats for All" 2-4 🎩`
- Branch: `lane/hats-for-all`. Base branch: `feat/learning-games-build`. Base commit: the one your starting message names.
- Subject and the skill that is the verb: Mathematics: one for each, one more and one fewer.
- Suggested renderer: three.js ("Canvas or three.js" in the guide decides what follows from it). Say in the sheet if you choose otherwise, and why.
- It comes from no demo: it is a new design.

## The idea

A few small creatures each want one hat. The child gives one to each; one creature left without waits in plain view, and a spare hat does something funny. Then one more creature arrives, or one wanders off. Sets stay at five or fewer. This is pairing one with one; it must not become dividing a pile into equal shares, which is Pebble Table's core.

The owner's bar for every game: lively and funny, never slow or quiet; animated, cute and warm; deep enough to come back to for weeks through combinations and characters; with no score, coin, streak, reward, praise or timer that pushes. Short animated scenes are welcome where the guide allows them.

## The looks reserved for it, in order

1. Foam play mats
2. Lift-the-flap board book

Each is a row of the ledger in section 4 of `docs/art-direction.md`; build from the row's own description.

## The records the skill rests on

These were read from the education pack on 2026-10-02. They are where your sheet's records part starts, not the part itself: read each record file and its Limits, check each one again with `npm run -s education:find -- --id <pack id>`, drop one that does not carry your verb, and add one that does. The sheet names no school skill without a record. The skill line at the top of this brief is the wording of the roster; where the Notes below say the records carry less or carry it in another subject, your sheet follows the records, and its claim says only what they carry.

### us-ca
- `edu.us-ca.infant-toddler.mathematics.objective.cognitive-development-strand-2-0-emergent-mathematical-thinking-2-1` (code 2.1): standing department-published-foundation; check state confirmed; level infant-toddler (age 2), basis official. Asks, in our words: a toddler uses number words about amounts and says stretches of the count list, with slips. Limits the game takes: no number range; the word need not match the amount; counting one by one is not mentioned.
- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-1-0-counting-and-cardinality-1-2` (code 1.2): standing department-published-foundation; check state confirmed; level preschool-tk (ages 3 to 4), basis official. Asks, in our words: a child counts a set by giving each thing exactly one number word. Limits the game takes: five or more things at 3 to 4½ and ten or more at 4 to 5½, both lower bounds with no upper bound; it pairs a word with a thing, not a thing with a thing.
- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-1-0-counting-and-cardinality-1-6` (code 1.6): standing department-published-foundation; check state confirmed; level preschool-tk (ages 3 to 4), basis official. Asks, in our words: a child looks at two groups and tells whether they are equal or which has more. Limits the game takes: two groups only; at 3 to 4½ the groups are plainly equal or plainly unequal and counting is optional; words for the smaller group come only in the Later statement; never how many more.
- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-2-0-operations-and-algebraic-thinking-2-1` (code 2.1): standing department-published-foundation; check state confirmed; level preschool-tk (ages 3 to 4), basis official. Asks, in our words: at 3 to 4½ a child knows that putting things in makes a group's number go up and taking things out makes it go down; at 4 to 5½ that one thing in or out changes a small group by exactly one. Limits the game takes: only the direction of change in the Early statement; the exact change of one only in the Later one; the size of the group is given no number.
- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-2-0-operations-and-algebraic-thinking-2-4` (code 2.4): standing department-published-foundation; check state confirmed; level preschool-tk (ages 3 to 4), basis official. Asks, in our words: a child deals things out so that each receiver gets the same amount. Limits the game takes: two receivers and a few things at 3 to 4½; a few more things and possibly more receivers at 4 to 5½; leftovers are not mentioned.

### nl
- `edu.nl.peuters.mathematics.objective.inhoudskaart-rekenen-wiskunde-peuters-getallen-getalbegrip-hoeveelheden-3` (code Hoeveelheden / 3): standing curriculum-institute-guidance; check state confirmed; level peuters (ages 2 to 3, and a child just turned 4), basis convention. Asks, in our words: making one-to-one pairs by coupling things, laying them together or joining them, as a saucer by each cup. Limits the game takes: no counting and no number words are asked; no number of things is set.
- `edu.nl.peuters.mathematics.objective.inhoudskaart-rekenen-wiskunde-peuters-getallen-bewerkingen-bewerkingen-1` (code Bewerkingen / 1): standing curriculum-institute-guidance; check state confirmed; level peuters (ages 2 to 3, and a child just turned 4), basis convention. Asks, in our words: experiencing that adding or taking away one thing or one person makes one more or one fewer. Limits the game takes: always one at a time; no number range (the ten of the card's example rhyme is not one); no written sums or signs.
- `edu.nl.peuters.mathematics.objective.inhoudskaart-rekenen-wiskunde-peuters-getallen-getalbegrip-hoeveelheden-4` (code Hoeveelheden / 4): standing curriculum-institute-guidance; check state confirmed; level peuters (ages 2 to 3, and a child just turned 4), basis convention. Asks, in our words: comparing small amounts by eye or by laying equal rows, and larger amounts by eye when the difference is big. Limits the game takes: no numbers for small or larger; counting is not named as a way to compare.
- `edu.nl.peuters.mathematics.objective.inhoudskaart-rekenen-wiskunde-peuters-getallen-getalbegrip-hoeveelheden-1` (code Hoeveelheden / 1): standing curriculum-institute-guidance; check state confirmed; level peuters (ages 2 to 3, and a child just turned 4), basis convention. Asks, in our words: counting small amounts. Limits the game takes: "small" with no number; digits are not mentioned.
- `edu.nl.fase-1.mathematics.objective.inhoudskaart-rekenen-wiskunde-fase-1-getallen-bewerkingen-optellen-en-aftrekken-met-hele-getallen-tot-tenminste-20-2` (code Optellen en aftrekken met hele getallen (tot tenminste 20) / 2): standing curriculum-institute-guidance; check state confirmed; level fase-1 (age 4, groep 1), basis convention. Asks, in our words: using, while acting on amounts, the words that go with adding and taking away, "one more" among the examples. Limits the game takes: what a school offers in groep 1 and 2, no year stated; the card's heading gives up to at least 20 with no upper bound; no written signs.

### Notes
- Thinnest support: us-ca at age 2 (the number-words record only; pairing one to one is not in it). For a two-year-old in California a hat for each head is the game's own content; keep it self-correcting by sight (a bare head, a spare hat) with no count asked. The Dutch peuter card carries the pairing itself from age 2.
- No record here is other than `confirmed`.
- Not carried: "up to about five" as a top. In us-ca five is a floor (at least five things at 3 to 4½), so five fits but is not the record's limit; the Dutch records give no number, so five is the game's own choice there. Thing-to-thing "one for each" is stated outright only in nl (Hoeveelheden / 3); us-ca carries it through one word per thing (1.2), equal-or-more for two groups (1.6) and equal dealing (2.4), and a row of more than two heads goes beyond the Early statement of 2.4. A change of exactly one is in us-ca only in the Later statement: for a three-year-old claim that the group gets bigger or smaller, not that it changes by one.

## This run

This run covers the design and the rules. Two pilot games are proving the template's helpers in a running game first, so you do not build your toy yet.

1. The steps under "Getting the code" in the cloud page.
2. The design sheet, pushed with `Open: sheet ready for check, round 1`.
3. The look spike for your first reserved look: the game's real scene in the style, at the quality bar, shown by the Mount at load with a fixed seed and with nothing playable behind it.
4. The rules as pure modules with tests beside them (no renderer, no DOM), in new files of your own, leaving the copied template files as they are wherever you can: the model of the world, the object-by-action grid, the errors as consequences, the characters' tastes, the designed order with its position ids in `config.ts`, the saved state with its defensive `deserialize`, and the size test. The guide lets a remote builder write rules while the check of its sheet runs, at its own risk: record in the status block the sheet commit they were written against.
5. Stop there: write the status block, push, and report. Your next message brings the checker's report on your sheet and the commit that holds what the pilots changed in the template.

## Defaults that bind you

The owner has not yet answered the questions listed under "Symbols, and the defaults awaiting the owner" in the guide. Work under each default as written there. If your design needs one of them answered differently, do not assume it: say so under what the owner has to decide.
