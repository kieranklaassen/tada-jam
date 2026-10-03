# Brief: Claw Machine (`claw-machine`)

Read `docs/build/CLOUD.md` first. This brief is the whole contract for your game; the guide it points to holds the rules.

## The game

- Key: `claw-machine`. Name: Claw Machine. Age band: 4 to 6. Emoji: 🧸.
- Generator: `npm run new:game -- claw-machine "Claw Machine" 4-6 🧸`
- Branch: `lane/claw-machine`. Base branch: `feat/learning-games-build`. Base commit: the one your starting message names.
- Subject and the skill that is the verb: Mathematics: sorting by one attribute, then a second way.
- Suggested renderer: three.js ("Canvas or three.js" in the guide decides what follows from it). Say in the sheet if you choose otherwise, and why.
- The demo it comes from: `lab/arcade/protos/claw-machine/`. Read it for the idea, the verb and the feel in the hand. Copy no line of it.

## The idea

The claw is a sorting hand. It always grabs what it is put on (the demo's lucky grab is gone), and the child decides where each toy goes: into chutes by colour first, and later the same toys sorted another way (by kind, by size). A toy in the wrong chute comes back out in a funny way. The swing and the drop keep the demo's feel.

The owner's bar for every game: lively and funny, never slow or quiet; animated, cute and warm; deep enough to come back to for weeks through combinations and characters; with no score, coin, streak, reward, praise or timer that pushes. Short animated scenes are welcome where the guide allows them.

## The looks reserved for it, in order

1. Stud bricks

Each is a row of the ledger in section 4 of `docs/art-direction.md`; build from the row's own description. Only one row could be reserved: if it fails in the spike, propose a second in your status block, in the ledger's columns.

## The records the skill rests on

These were read from the education pack on 2026-10-02. They are where your sheet's records part starts, not the part itself: read each record file and its Limits, check each one again with `npm run -s education:find -- --id <pack id>`, drop one that does not carry your verb, and add one that does. The sheet names no school skill without a record. The skill line at the top of this brief is the wording of the roster; where the Notes below say the records carry less or carry it in another subject, your sheet follows the records, and its claim says only what they carry.

### us-ca
- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-2-0-operations-and-algebraic-thinking-2-5` (code 2.5, Mathematics / Strand 2.0): standing department-published-foundation; check state confirmed; level preschool-tk (ages 4 and 5), basis official. Asks, in our words: sort objects into groups by one attribute; at the later age by one or more, and sort on a second attribute after the first. Limits the game takes: one attribute and two or more groups at the earlier age; at the later age two attributes may be handled in two steps, so holding both at once is not required; no attributes are named.
- `edu.us-ca.kindergarten.mathematics.objective.k-md-3` (code K.MD.3): standing state-board-adopted-standard; check state confirmed; level kindergarten (ages 5 and 6), basis official. Asks, in our words: sort objects into given categories, count each category and put the categories in order by count. Limits the game takes: a footnote keeps each category to ten objects or fewer; the categories are supplied, the child does not invent them; graphs are not mentioned.
- `edu.us-ca.grade-1.mathematics.objective.1-md-4` (code 1.MD.4): standing state-board-adopted-standard; check state confirmed; level grade-1 (age 6), basis official. Asks, in our words: sort data into categories, show it, and ask and answer how-many questions about it. Limits the game takes: at most three categories; no number range; no kind of chart is named.

### nl
- `edu.nl.fase-1.mathematics.objective.a9ab9439-c201-44d5-8734-0def1bcfd1b7` (code rw/mk/3/01/fase1): standing curriculum-institute-guidance; check state confirmed; level fase-1 (ages 4 to 6, groep 1 to 3), basis convention. Asks, in our words: sort objects by one or more characteristics. Limits the game takes: no characteristics and no number of objects or groups are named; the example the source prints (gathering all the red triangles) is an example, not a limit.
- `edu.nl.fase-1.mathematics.objective.inhoudskaart-rekenen-wiskunde-fase-1-meten-meetkunde-meetkunde-opereren-met-vormen-en-figuren-1` (code Opereren met vormen en figuren / 1, the pack's code for a card bullet): standing curriculum-institute-guidance; check state confirmed; level fase-1, the card for groep 1 and 2 (ages 4 to 6), basis convention. Asks, in our words: sort objects by one or more attributes. Limits the game takes: no attributes or objects named and no highest number of either; it stands under a sub-heading about shapes but is not limited to shape.
- `edu.nl.peuters.mathematics.objective.inhoudskaart-rekenen-wiskunde-peuters-meten-meetkunde-meetkunde-opereren-met-vormen-en-figuren-1` (code Opereren met vormen en figuren / 1, the pack's code for a card bullet): standing curriculum-institute-guidance; check state confirmed; level peuters (age 4 up to the fourth birthday), basis convention. Asks, in our words: look into the properties of objects and sort by one property. Limits the game takes: one property; sorting by two at once is not mentioned; the properties listed are examples; no number of objects or groups.

### Notes
- Thinnest support is us-ca at age 6. K.MD.3 adds counting each group and ordering the groups by count, and grade 1's 1.MD.4 is about data and how-many questions; a game without counters shows only the sorting part of both and should say so.
- No record named here is other than `confirmed`. The two nl card records carry the same pack code on two different cards, so cite them by pack id.
- Not carried as worded: "then sorting the same objects a second way". In us-ca only foundation 2.5 names it, in its Later statement (ages 4 to 5½); K.MD.3 and 1.MD.4 do not. In nl "one or more characteristics" covers a second attribute, but sorting the same set again is the pack's illustration, not the goal's words. Under K.MD.3 the categories are given, so the bins show the rule and the child is not asked to invent it.

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
