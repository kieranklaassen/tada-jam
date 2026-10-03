# Brief: Monster Pizza (`monster-pizza`)

Read `docs/build/CLOUD.md` first. This brief is the whole contract for your game; the guide it points to holds the rules.

## The game

- Key: `monster-pizza`. Name: Monster Pizza. Age band: 4 to 7. Emoji: 🍕.
- Generator: `npm run new:game -- monster-pizza "Monster Pizza" 4-7 🍕`
- Branch: `lane/monster-pizza`. Base branch: `feat/learning-games-build`. Base commit: the one your starting message names.
- Subject and the skill that is the verb: Mathematics: counting out a set to match a pictured set, to five and then to ten; steps in order.
- Renderer: canvas 2D, fixed. You are the pilot for that kind of game, so do not choose another ("Canvas or three.js" in the guide decides what follows from it).
- The demo it comes from: `lab/arcade/protos/monster-pizza/`. Read it for the idea, the verb and the feel in the hand. Copy no line of it.

## The idea

Monsters order pizza by showing a picture of the toppings they want. The child counts out that many of each onto the pizza, bakes it and serves it, in the real order of the job. A wrong count is a consequence in the world and a funny one (too many peppers and the monster breathes a small flame), and the pizza stays as it is so the child changes one thing and serves again. No numeral is shown: the band starts at four. Each monster has fixed tastes. This is counting to match for one customer at a time; it must not become a second Pebble Table, whose core is sharing a pile fairly.

The owner's bar for every game: lively and funny, never slow or quiet; animated, cute and warm; deep enough to come back to for weeks through combinations and characters; with no score, coin, streak, reward, praise or timer that pushes. Short animated scenes are welcome where the guide allows them.

## The looks reserved for it, in order

1. Felt-tip marker drawing
2. Thick-line primaries

Each is a row of the ledger in section 4 of `docs/art-direction.md`; build from the row's own description.

## The records the skill rests on

These were read from the education pack on 2026-10-02. They are where your sheet's records part starts, not the part itself: read each record file and its Limits, check each one again with `npm run -s education:find -- --id <pack id>`, drop one that does not carry your verb, and add one that does. The sheet names no school skill without a record. The skill line at the top of this brief is the wording of the roster; where the Notes below say the records carry less or carry it in another subject, your sheet follows the records, and its claim says only what they carry.

### us-ca
- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-1-0-counting-and-cardinality-1-2` (code 1.2, Mathematics / Strand 1.0): standing department-published-foundation; check state confirmed; level preschool-tk (ages 4 and 5), basis official. Asks, in our words: count a set by giving each thing exactly one number word. Limits the game takes: sets of five or more at the earlier age and ten or more at the later age, both lower bounds; no upper bound, no layout and no adult help are stated.
- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-1-0-counting-and-cardinality-1-6` (code 1.6, Mathematics / Strand 1.0): standing department-published-foundation; check state confirmed; level preschool-tk (ages 4 and 5), basis official. Asks, in our words: look at two sets and tell whether they are the same in number or which has more, at the later age by counting both. Limits the game takes: two groups only; no number range; how many more is not asked; at the earlier age the difference is plain to see and counting is optional.
- `edu.us-ca.kindergarten.mathematics.objective.k-cc-5` (code K.CC.5): standing state-board-adopted-standard; check state confirmed; level kindergarten (ages 5 and 6), basis official. Asks, in our words: count to find how many, and count out a group of a size that is given as a number. Limits the game takes: up to 20 things in a row, grid or ring and up to 10 when scattered; counting out for numbers 1 to 20.
- `edu.us-ca.kindergarten.mathematics.objective.k-cc-6` (code K.CC.6): standing state-board-adopted-standard; check state confirmed; level kindergarten (ages 5 and 6), basis official. Asks, in our words: tell whether one group has more, fewer or as many as another, for example by pairing the things off or by counting both. Limits the game takes: groups of objects, not written numerals; a footnote names groups of up to ten as included; pairing and counting are example ways.
- `edu.us-ca.preschool-tk.practical-life-feelings.objective.approaches-to-learning-strand-2-0-executive-functioning-2-1` (code 2.1, Approaches to Learning / Strand 2.0): standing department-published-foundation; check state confirmed; level preschool-tk (ages 4 and 5), basis official. Asks, in our words: keep a few pieces of information in mind and act on them in a task of several steps. Limits the game takes: about one or two pieces at the earlier age and about two or three at the later age, stated as ranges; adult support is part of both statements, less at the later age.

### nl
- `edu.nl.peuters.mathematics.objective.inhoudskaart-rekenen-wiskunde-peuters-getallen-getalbegrip-hoeveelheden-3` (code Hoeveelheden / 3, the pack's code for a card bullet): standing curriculum-institute-guidance; check state confirmed; level peuters (age 4 up to the fourth birthday), basis convention. Asks, in our words: make one-to-one pairs by putting objects with each other. Limits the game takes: an offer for children of about 2 to 4; no counting, number words or number of objects are named.
- `edu.nl.fase-1.mathematics.objective.af14ff56-8932-4032-bd6c-031aeb12ab5d` (code rw/gb/2/01/fase1): standing curriculum-institute-guidance; check state confirmed; level fase-1 (ages 4 to 7, groep 1 to 3), basis convention. Asks, in our words: count amounts to find how many, and learn the rules of counting. Limits the game takes: "up to at least 20" with no upper limit; no year inside the band; the rules of counting are not listed. Stopping at 5 and then 10 is the game's own choice inside this.
- `edu.nl.fase-1.mathematics.objective.0b3e8f72-07b7-4fad-8ec6-10d82fd65b62` (code rw/gb/2/08/fase1): standing curriculum-institute-guidance; check state confirmed; level fase-1 (ages 4 to 7), basis convention. Asks, in our words: show an amount in another form. Limits the game takes: up to at least 20; the example the source prints (fingers, pictures, blocks, number symbols) is an example, not a limit, so objects and pictures alone are within it.
- `edu.nl.fase-1.mathematics.objective.a9357f6e-1801-45cd-b570-42993c24a14a` (code rw/gb/2/03/fase1): standing curriculum-institute-guidance; check state confirmed; level fase-1 (ages 4 to 7), basis convention. Asks, in our words: compare and order amounts. Limits the game takes: up to at least 20; no size is given for the larger amounts it also mentions.
- `edu.nl.fase-1.mathematics.objective.3a5d0830-68ef-4f22-a3be-46239d1168cf` (code rw/m/6/04/fase1): standing curriculum-institute-guidance; check state confirmed; level fase-1 (ages 4 to 7), basis convention. Asks, in our words: put events in order of time. Limits the game takes: Limits leaves this open (no number of events, no span of time, no means such as pictures).

### Notes
- Thinnest support is age 7. us-ca returns grade 1 only (basis derived; grade 2 is not in the pack), and no grade 1 mathematics record carries counting out a set to 10: that lane works with numerals and sums, which this game does not show. nl at 7 is groep 3 (fase 1, covered) or groep 4 (fase 2, where counting runs to at least 1000). So the top of the band is the game's own stretch (larger or scattered sets) and claims no grade 1 record. At age 4 us-ca rests on foundations only.
- No record named here is other than `confirmed`.
- Not carried as worded: (a) "to match a pictured set": in us-ca K.CC.5 the counting out starts from a number that is told, not from a picture. With no numerals and no voice, the pictured-set form rests on K.CC.6 and foundation 1.6 (making a set with as many) together with one-to-one counting; word the claim that way. (b) "doing steps in order" has no us-ca record at kindergarten or grade 1; it rests on foundation 2.1 only (ages 4 and 5, with adult support), which is about holding steps in mind. In nl the nearest statement is ordering events in time, not following a recipe. (c) Scattered toppings stay at 10 or fewer under K.CC.5.

## This run

You are one of two pilot games: the first to use the cartridge template in a running game. This run goes as far as it can.

1. The steps under "Getting the code" in the cloud page.
2. The design sheet, pushed with `Open: sheet ready for check, round 1`.
3. The look spike for your first reserved look, shown by the Mount at load with a fixed seed.
4. The toy: the one action the finger performs most, in the look, with its sound and motion.
5. Then the rules as pure modules with tests, the characters, the errors as consequences, the guidance ladder and the short scenes. The guide lets a remote builder write rules while the check of its sheet runs, at its own risk: record in the status block the sheet commit they were written against.

As a pilot you have one more duty. Use every copied helper in the running game (`input.ts`, `audio.ts`, `guidance.ts`, `scene.ts`, the position rules in `state.ts`, the Mount's resize and attention handling), and write under **Template notes** in your status block, for each file: used as copied, or what you had to change and why. The other seventeen games wait for those notes before they build their toys, so push them as you learn them, not at the end.

## Defaults that bind you

The owner has not yet answered the questions listed under "Symbols, and the defaults awaiting the owner" in the guide. Work under each default as written there. If your design needs one of them answered differently, do not assume it: say so under what the owner has to decide.
