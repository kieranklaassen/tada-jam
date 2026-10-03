# Brief: Wild Hair Salon (`wild-hair-salon`)

Read `docs/build/CLOUD.md` first. This brief is the whole contract for your game; the guide it points to holds the rules.

## The game

- Key: `wild-hair-salon`. Name: Wild Hair Salon. Age band: 4 to 6. Emoji: ✂️.
- Generator: `npm run new:game -- wild-hair-salon "Wild Hair Salon" 4-6 ✂️`
- Branch: `lane/wild-hair-salon`. Base branch: `feat/learning-games-build`. Base commit: the one your starting message names.
- Subject and the skill that is the verb: Mathematics: longer and shorter, and making a length match.
- Suggested renderer: canvas 2D ("Canvas or three.js" in the guide decides what follows from it). Say in the sheet if you choose otherwise, and why.
- The demo it comes from: `lab/arcade/protos/wild-hair-salon/`. Read it for the idea, the verb and the feel in the hand. Copy no line of it.

## The idea

Customers arrive with wild hair and show the length they want by pointing at something as long (another customer's fringe, a ribbon). The child pulls a lock longer or snips it shorter and can lay it beside the thing it should match. A length that is off is a funny haircut the customer reacts to, and hair grows back when the child pulls, so nothing is lost. Each customer has fixed tastes.

The owner's bar for every game: lively and funny, never slow or quiet; animated, cute and warm; deep enough to come back to for weeks through combinations and characters; with no score, coin, streak, reward, praise or timer that pushes. Short animated scenes are welcome where the guide allows them.

## The looks reserved for it, in order

1. Wet watercolour (demo: `bark-boats`)

Each is a row of the ledger in section 4 of `docs/art-direction.md`; build from the row's own description. Only one row could be reserved: if it fails in the spike, propose a second in your status block, in the ledger's columns.

## The records the skill rests on

These were read from the education pack on 2026-10-02. They are where your sheet's records part starts, not the part itself: read each record file and its Limits, check each one again with `npm run -s education:find -- --id <pack id>`, drop one that does not carry your verb, and add one that does. The sheet names no school skill without a record. The skill line at the top of this brief is the wording of the roster; where the Notes below say the records carry less or carry it in another subject, your sheet follows the records, and its claim says only what they carry.

### us-ca
- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-3-0-measurement-and-data-3-1` (code 3.1, Mathematics / Strand 3.0): standing department-published-foundation; check state confirmed; level preschool-tk (ages 4 and 5), basis official. Asks, in our words: notice that things differ in length and, at the later age, compare two objects and say what the comparison shows. Limits the game takes: at the earlier age awareness only; at the later age two objects; no units, numbers or tools; putting them side by side is an example, not a required way.
- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-3-0-measurement-and-data-3-2` (code 3.2, Mathematics / Strand 3.0): standing department-published-foundation; check state confirmed; level preschool-tk (ages 4 and 5), basis official. Asks, in our words: put a few objects in order by length. Limits the game takes: about three objects at the earlier age and four or five at the later age, both given as examples; no units or numbers; the direction of the order is not stated.
- `edu.us-ca.kindergarten.mathematics.objective.k-md-2` (code K.MD.2): standing state-board-adopted-standard; check state confirmed; level kindergarten (ages 5 and 6), basis official. Asks, in our words: compare two objects directly on one measurable feature and say which has more or less of it. Limits the game takes: exactly two objects; no units, rulers or numbers; the difference is put in words such as longer and shorter, not as an amount; ordering three is not in it.
- `edu.us-ca.grade-1.mathematics.objective.1-md-1` (code 1.MD.1): standing state-board-adopted-standard; check state confirmed; level grade-1 (age 6), basis official. Asks, in our words: put three objects in order by length, and compare two lengths by way of a third object. Limits the game takes: three objects for ordering, two for the indirect comparison; no units or numbers; length only.

### nl
- `edu.nl.fase-1.mathematics.objective.89bb477b-2b37-4d5e-91b8-2a6ddfb709dc` (code rw/m/1/04/fase1): standing curriculum-institute-guidance; check state confirmed; level fase-1 (ages 4 to 6, groep 1 to 3), basis convention. Asks, in our words: compare and order by length (and by the distance around). Limits the game takes: no objects, units or number of objects are named; the ways the source prints (by eye, measuring off, holding side by side) are an example, not a limit.
- `edu.nl.fase-1.mathematics.objective.a825be0e-b3d2-46d1-a297-4a2ecdc81999` (code rw/m/1/02/fase1): standing curriculum-institute-guidance; check state confirmed; level fase-1 (ages 4 to 6), basis convention. Asks, in our words: work with the ideas of length, such as long, longer, longest, short, shorter and equally long. Limits the game takes: the words listed are examples; no units; nothing says in which year.
- `edu.nl.peuters.mathematics.objective.inhoudskaart-rekenen-wiskunde-peuters-meten-meetkunde-meten-lengte-omtrek-en-oppervlakte-1` (code Lengte, omtrek en oppervlakte / 1, the pack's code for a card bullet): standing curriculum-institute-guidance; check state confirmed; level peuters (age 4 up to the fourth birthday), basis convention. Asks, in our words: compare by length, directly. Limits the game takes: a direct comparison; no measuring tool, steps or units; this statement is about length only.

### Notes
- Thinnest support is age 4 in us-ca: foundations only, and comparing two lengths is in the Later statement while the Early one asks only awareness. Open with two lengths that differ plainly. nl has no thin age in this band.
- No record named here is other than `confirmed`.
- Not carried as worded: "making a length match". No us-ca record asks a child to make one length equal to another; the records ask comparing, ordering and, in K.MD.2, saying the difference. nl carries "equally long" only as an example word in rw/m/1/02/fase1. Claim "comparing two lengths directly", and present cutting to a match as the game's own use of repeated direct comparison. Measuring with units is a neighbouring statement in both jurisdictions and is not claimed.

## This run

This run covers the design and the rules. Two pilot games are proving the template's helpers in a running game first, so you do not build your toy yet.

1. The steps under "Getting the code" in the cloud page.
2. The design sheet, pushed with `Open: sheet ready for check, round 1`.
3. The look spike for your first reserved look: the game's real scene in the style, at the quality bar, shown by the Mount at load with a fixed seed and with nothing playable behind it.
4. The rules as pure modules with tests beside them (no renderer, no DOM), in new files of your own, leaving the copied template files as they are wherever you can: the model of the world, the object-by-action grid, the errors as consequences, the characters' tastes, the designed order with its position ids in `config.ts`, the saved state with its defensive `deserialize`, and the size test. The guide lets a remote builder write rules while the check of its sheet runs, at its own risk: record in the status block the sheet commit they were written against.
5. Stop there: write the status block, push, and report. Your next message brings the checker's report on your sheet and the commit that holds what the pilots changed in the template.

## Defaults that bind you

The owner has not yet answered the questions listed under "Symbols, and the defaults awaiting the owner" in the guide. Work under each default as written there. If your design needs one of them answered differently, do not assume it: say so under what the owner has to decide.
