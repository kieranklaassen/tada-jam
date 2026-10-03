# Brief: Princess Playground (`princess-playground`)

Read `docs/build/CLOUD.md` first. This brief is the whole contract for your game; the guide it points to holds the rules.

## The game

- Key: `princess-playground`. Name: Princess Playground. Age band: 2 to 5. Emoji: 👑.
- Generator: `npm run new:game -- princess-playground "Princess Playground" 2-5 👑`
- Branch: `lane/princess-playground`. Base branch: `feat/learning-games-build`. Base commit: the one your starting message names.
- Subject and the skill that is the verb: Science: heavy and light on the seesaw. Feelings: bringing in a friend who is left out.
- Suggested renderer: three.js ("Canvas or three.js" in the guide decides what follows from it). Say in the sheet if you choose otherwise, and why.
- The demo it comes from: `lab/arcade/protos/princess-playground/`. Read it for the idea, the verb and the feel in the hand. Copy no line of it.

## The idea

A playground with a seesaw and a few friends of plainly different sizes. Who sits where decides which end goes down; two small ones can lift a big one. A friend who stands apart can be invited onto the seesaw, brightens visibly, and changes the balance. Every placement does something, and the funniest results come from the wrong ones. The feelings part is shown by what the friends do, never said.

The owner's bar for every game: lively and funny, never slow or quiet; animated, cute and warm; deep enough to come back to for weeks through combinations and characters; with no score, coin, streak, reward, praise or timer that pushes. Short animated scenes are welcome where the guide allows them.

## The looks reserved for it, in order

1. Sand tray (demo: `sand-kingdom`)

Each is a row of the ledger in section 4 of `docs/art-direction.md`; build from the row's own description. Only one row could be reserved: if it fails in the spike, propose a second in your status block, in the ledger's columns.

## The records the skill rests on

These were read from the education pack on 2026-10-02. They are where your sheet's records part starts, not the part itself: read each record file and its Limits, check each one again with `npm run -s education:find -- --id <pack id>`, drop one that does not carry your verb, and add one that does. The sheet names no school skill without a record. The skill line at the top of this brief is the wording of the roster; where the Notes below say the records carry less or carry it in another subject, your sheet follows the records, and its claim says only what they carry.

### us-ca
- `edu.us-ca.infant-toddler.science.objective.cognitive-development-strand-1-0-exploration-1-1` (code 1.1): standing department-published-foundation; check state confirmed; level infant-toddler (age 2), basis official. Asks, in our words: a toddler makes easy guesses about what an action will bring about and thinks back over why something happened. Limits the game takes: the guess need not be right; weight is not named at this level.
- `edu.us-ca.infant-toddler.practical-life-feelings.objective.social-and-emotional-development-strand-2-0-social-interactions-2-2` (code 2.2): standing department-published-foundation; check state confirmed; level infant-toddler (age 2), basis official. Asks, in our words: a toddler shows they know another person can feel differently from them, shows concern, and now and then answers in a way that could make the other feel better. Limits the game takes: the helpful answer happens only sometimes and is said to possibly help, not to help; no feelings are named.
- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-3-0-measurement-and-data-3-1` (code 3.1): standing department-published-foundation; check state confirmed; level preschool-tk (ages 3 to 5), basis official. Asks, in our words: at 3 to 4½ a child notices and tells that things differ in how heavy they are (also in length and in how much they hold); at 4 to 5½ the child compares two objects on one of these and tells the result. Limits the game takes: awareness only in the Early statement; two objects in the Later one; no units, numbers or tools; a seesaw or balance is not named. It is a mathematics record.
- `edu.us-ca.preschool-tk.science.objective.science-strand-2-0-physical-science-2-1` (code 2.1): standing department-published-foundation; check state confirmed; level preschool-tk (ages 3 to 5), basis official. Asks, in our words: a child explores things and says what they are like, weight being one of the example properties. Limits the game takes: weight is one example among several; describing, not explaining.
- `edu.us-ca.preschool-tk.practical-life-feelings.objective.social-and-emotional-development-strand-1-0-self-1-8` (code 1.8): standing department-published-foundation; check state confirmed; level preschool-tk (ages 3 to 5), basis official. Asks, in our words: at 3 to 4½ a child feels along with another and shows concern for what someone who is upset needs; at 4 to 5½ the child comforts and helps, at times with an adult's support. Limits the game takes: helping is not in the Early statement; no situation, such as being left out, is named.

### nl
- `edu.nl.peuters.mathematics.objective.inhoudskaart-rekenen-wiskunde-peuters-meten-meetkunde-meten-gewicht-3` (code Gewicht / 3): standing curriculum-institute-guidance; check state confirmed; level peuters (ages 2 to 3, and a child just turned 4), basis convention. Asks, in our words: gaining experience with weighing by informal means, and the card names a seesaw, a balance and the hands. Limits the game takes: informal only; no grams, kilograms or scale with numbers. It is a mathematics record.
- `edu.nl.peuters.mathematics.objective.inhoudskaart-rekenen-wiskunde-peuters-meten-meetkunde-meten-gewicht-2` (code Gewicht / 2): standing curriculum-institute-guidance; check state confirmed; level peuters (ages 2 to 3, and a child just turned 4), basis convention. Asks, in our words: lifting and "weighing" different things, comparing which is heavier or lighter, and learning to recognise those words. Limits the game takes: recognising the words, saying them is not mentioned; no units and no numbers.
- `edu.nl.peuters.practical-life-feelings.objective.inhoudskaart-sociaal-emotionele-ontwikkeling-peuters-sociale-competenties-de-ander-besef-van-de-ander-open-staan-voor-de-emoties-van-een-ander-4` (code Open staan voor de emoties van een ander / 4): standing curriculum-institute-guidance; check state confirmed; level peuters (ages 2 to 3, and a child just turned 4), basis convention. Asks, in our words: reacting in a basic way to what others need. Limits the game takes: a simple reaction; nothing says the child meets the need; no needs and no persons are named.
- `edu.nl.fase-1.mathematics.objective.inhoudskaart-rekenen-wiskunde-fase-1-meten-meetkunde-meten-gewicht-5` (code Gewicht / 5): standing curriculum-institute-guidance; check state confirmed; level fase-1 (ages 4 to 5, groep 1 and 2), basis convention. Asks, in our words: measuring with informal weighing means such as a seesaw, a balance and the hands. Limits the game takes: what a school offers in groep 1 and 2, no year stated; the three means are examples; no standard units and no numerals.
- `edu.nl.fase-1.practical-life-feelings.objective.inhoudskaart-sociaal-emotionele-ontwikkeling-fase-1-sociale-competenties-de-ander-besef-van-de-ander-herkennen-begrijpen-van-en-aanpassen-aan-emoties-van-anderen-4` (code Herkennen, begrijpen van en aanpassen aan emoties van anderen / 4): standing curriculum-institute-guidance; check state confirmed; level fase-1 (ages 4 to 5, groep 1 and 2), basis convention. Asks, in our words: taking the feelings and the situation of others into account in what the child does. Limits the game takes: no behaviour is named; what a school offers, no year stated.

### Notes
- Thinnest support: age 2 in us-ca. No infant-toddler record names weight (mathematics 2.2 has size words only), and helping another happens only now and then. At 2 the seesaw is cause-and-effect play, and bringing the friend in is an invitation that is never required or judged. At age 5 the Later preschool statements still apply (the lookup returns `preschool-tk` for a five-year-old) and it also returns kindergarten, where `edu.us-ca.kindergarten.mathematics.objective.k-md-2` (code K.MD.2, state-board-adopted-standard, confirmed) compares exactly two objects directly, with no units; kindergarten holds no adopted standard for social-emotional learning.
- No record here is other than `confirmed`.
- Not carried: "science" as the label for heavy and light. In both jurisdictions comparing weight is measurement in the mathematics lane; only us-ca science 2.1 lists weight as a property, and no Dutch science record names weight or balance. Why a seesaw tips (balance, distance from the middle) is in no record: keep it to heavier side down, lighter side up. Being left out, or inviting someone in, is named in no record of either jurisdiction: the records carry noticing another's feelings and a basic or helping response, and in us-ca helping is only in the Later statement (4 to 5½). For ages 2 to 3 claim noticing and concern. The nearest Dutch record for the act of approaching is `edu.nl.peuters.practical-life-feelings.objective.inhoudskaart-sociaal-emotionele-ontwikkeling-peuters-emotionele-competenties-relaties-sociale-vaardigheden-plezier-beleven-in-het-omgaan-met-een-ander-3` (confirmed): making contact with other children, with or without language.

## This run

This run covers the design, the look, the toy and the rules. The template you start from is its second version, which holds what the first three.js game (Muddy Truck Wash) learned in a running game, so you build your toy in this run.

1. The steps under "Getting the code" in the cloud page.
2. The design sheet, pushed with `Open: sheet ready for check, round 1`.
3. The look spike for your first reserved look: the game's real scene in the style, at the quality bar, shown by the Mount at load with a fixed seed.
4. The toy: the one action the finger performs most, in the look, with its sound and motion, answered when the finger lands.
5. The rules as pure modules with tests beside them (no renderer, no DOM), in new files of your own, leaving the copied template files as they are wherever you can: the model of the world, the object-by-action grid, the errors as consequences, the characters' tastes, the designed order with its position ids in `config.ts`, the saved state with its defensive `deserialize`, and the size test. The guide lets a remote builder write rules while the check of its sheet runs, at its own risk: record in the status block the sheet commit they were written against.
6. Stop there: write the status block, push, and report. Do not build the game on the toy yet: the owner sees every toy first, and your next message brings the checker's report on your sheet and his answer on your look and your toy.

## Defaults that bind you

The owner has not yet answered the questions listed under "Symbols, and the defaults awaiting the owner" in the guide. Work under each default as written there. If your design needs one of them answered differently, do not assume it: say so under what the owner has to decide.
