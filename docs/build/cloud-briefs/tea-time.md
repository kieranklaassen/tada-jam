# Brief: Tea Time (`tea-time`)

Read `docs/build/CLOUD.md` first. This brief is the whole contract for your game; the guide it points to holds the rules.

## The game

- Key: `tea-time`. Name: Tea Time. Age band: 4 to 6. Emoji: 🫖.
- Generator: `npm run new:game -- tea-time "Tea Time" 4-6 🫖`
- Branch: `lane/tea-time`. Base branch: `feat/learning-games-build`. Base commit: the one your starting message names.
- Subject and the skill that is the verb: Practical life: pouring to a level, and a place for each thing.
- Suggested renderer: three.js ("Canvas or three.js" in the guide decides what follows from it). Say in the sheet if you choose otherwise, and why.
- The demo it comes from: `lab/arcade/protos/tea-time/`. Read it for the idea, the verb and the feel in the hand. Copy no line of it.

## The idea

The child sets a table, a cup and saucer and spoon for each guest, and pours: hold to pour, let go in time. A spill is small, funny and wipeable. Each guest has a fixed taste (one wants only a drop, one wants it to the brim). The level must be readable in the cup at every moment of the pour.

The owner's bar for every game: lively and funny, never slow or quiet; animated, cute and warm; deep enough to come back to for weeks through combinations and characters; with no score, coin, streak, reward, praise or timer that pushes. Short animated scenes are welcome where the guide allows them.

## The looks reserved for it, in order

1. Blue-and-white glazed pottery

Each is a row of the ledger in section 4 of `docs/art-direction.md`; build from the row's own description. Only one row could be reserved: if it fails in the spike, propose a second in your status block, in the ledger's columns.

## The records the skill rests on

These were read from the education pack on 2026-10-02. They are where your sheet's records part starts, not the part itself: read each record file and its Limits, check each one again with `npm run -s education:find -- --id <pack id>`, drop one that does not carry your verb, and add one that does. The sheet names no school skill without a record. The skill line at the top of this brief is the wording of the roster; where the Notes below say the records carry less or carry it in another subject, your sheet follows the records, and its claim says only what they carry.

### us-ca
- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-3-0-measurement-and-data-3-1` (code 3.1, Mathematics / Strand 3.0): standing department-published-foundation; check state confirmed; level preschool-tk (ages 4 and 5), basis official. Asks, in our words: notice that things differ in how much they hold and, at the later age, compare two objects and say what the comparison shows. Limits the game takes: capacity is one of the three attributes named; awareness only at the earlier age; two objects at the later age; no units, numbers or tools; the way of comparing is not prescribed.
- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-3-0-measurement-and-data-3-2` (code 3.2, Mathematics / Strand 3.0): standing department-published-foundation; check state confirmed; level preschool-tk (ages 4 and 5), basis official. Asks, in our words: put a few objects in order by one attribute. Limits the game takes: capacity is named only as an example attribute; about three objects at the earlier age, four or five at the later age; no units or numbers.
- `edu.us-ca.kindergarten.mathematics.objective.k-md-2` (code K.MD.2): standing state-board-adopted-standard; check state confirmed; level kindergarten (ages 5 and 6), basis official. Asks, in our words: compare two objects directly on one measurable feature and say which has more or less of it. Limits the game takes: exactly two objects; no units or numbers; the statement's own example is height, so capacity is the game's choice of feature.
- `edu.us-ca.cross-grade.practical-life-feelings.objective.early-elementary-2-h-1` (code 2.H.1, Early Elementary): standing voluntary-guidance; check state confirmed; level cross-grade (returned beside kindergarten and grade 1 at ages 5 and 6), basis official. Asks, in our words: keep order in the places one uses and among one's own things, with guidance. Limits the game takes: voluntary guidance, not a standard; the band is tied to no grade; with guidance, not alone; no spaces, belongings or degree of tidiness are named.

### nl
- `edu.nl.fase-1.mathematics.objective.2851b1d6-b3b5-4cbe-bc68-e95640898948` (code rw/m/3/04/fase1): standing curriculum-institute-guidance; check state confirmed; level fase-1 (ages 4 to 6, groep 1 to 3), basis convention. Asks, in our words: compare and order by how much things hold. Limits the game takes: the Dutch term can mean capacity, volume or contents and the goal does not choose; the six ways it lists, pouring from one into the other among them, are examples; no units and no number of containers.
- `edu.nl.fase-1.mathematics.objective.9de7e388-f85c-4ef6-9fbd-d5911b20db6a` (code rw/m/3/02/fase1): standing curriculum-institute-guidance; check state confirmed; level fase-1 (ages 4 to 6), basis convention. Asks, in our words: work with the ideas full, fuller, equally full, too much, too little and enough. Limits the game takes: the words listed are examples; no unit is among them.
- `edu.nl.fase-1.practical-life-feelings.objective.f6f10753-a49c-408e-81b7-03206cb9edc0` (code ojw/ds/1/01/fase1): standing curriculum-institute-guidance; check state confirmed; level fase-1 (ages 4 to 6), basis convention. Asks, in our words: take care of one's own surroundings at home, in class and at school. Limits the game takes: no tasks and no level of independence are named.
- `edu.nl.peuters.mathematics.objective.inhoudskaart-rekenen-wiskunde-peuters-meten-meetkunde-meten-inhoud-2` (code Inhoud / 2, the pack's code for a card bullet): standing curriculum-institute-guidance; check state confirmed; level peuters (age 4 up to the fourth birthday), basis convention. Asks, in our words: get to know how much things hold by filling, pouring over and emptying. Limits the game takes: three actions are named; no measures and no counting of scoops.
- `edu.nl.peuters.mathematics.objective.inhoudskaart-rekenen-wiskunde-peuters-getallen-getalbegrip-hoeveelheden-3` (code Hoeveelheden / 3, the pack's code for a card bullet): standing curriculum-institute-guidance; check state confirmed; level peuters (age 4 up to the fourth birthday), basis convention. Asks, in our words: make one-to-one pairs by putting objects with each other; a saucer by each cup is the statement's own example. Limits the game takes: no counting, number words or number of objects are named.

### Notes
- Thinnest support is us-ca. At age 6 in grade 1 the measurement records are about length only, so comparing capacity has no grade 1 record. At age 4 no preschool foundation carries keeping things in their place; 2.H.1 is cross-grade voluntary guidance that is returned only from age 5.
- No record named here is other than `confirmed`. 2.H.1 is voluntary guidance and is worded as that.
- Not carried as worded: "pouring to a level without spilling" as a hand skill has no record in either jurisdiction (movement and motor development are outside the pack's four subjects). What the records carry is the mathematics around it: in us-ca comparing how much two containers hold; in nl filling, pouring over and the ideas full, equally full and enough. "A place for each thing when setting a table": us-ca has only 2.H.1; nl has care for one's surroundings, which names no tasks, and for a child just turned four the one-to-one pairing record. If the builder wants a mathematics footing for table setting in us-ca, K.CC.6 (pairing one group against another, kindergarten, state-board-adopted-standard, confirmed) is the record; it is listed under monster-pizza.

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
