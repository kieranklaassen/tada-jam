# Brief: Bread Day (`bread-day`)

Read `docs/build/CLOUD.md` first. This brief is the whole contract for your game; the guide it points to holds the rules.

## The game

- Key: `bread-day`. Name: Bread Day. Age band: 4 to 6. Emoji: 🍞.
- Generator: `npm run new:game -- bread-day "Bread Day" 4-6 🍞`
- Branch: `lane/bread-day`. Base branch: `feat/learning-games-build`. Base commit: the one your starting message names.
- Subject and the skill that is the verb: Science and practical life: materials change, and a task has a real order.
- Suggested renderer: canvas 2D ("Canvas or three.js" in the guide decides what follows from it). Say in the sheet if you choose otherwise, and why.
- The demo it comes from: `lab/arcade/protos/bread-day/`. Read it for the idea, the verb and the feel in the hand. Copy no line of it.

## The idea

Flour and water become dough; kneading changes it; warmth makes it rise; the oven turns it gold. The order is the real one, and a wrong order has its true result, which is funny and can be mended (no water gives a dusty heap, an unrisen loaf bakes into a brick the baker knocks on). Rising runs on attended game time only and never while the game is parked. Each customer at the door has a fixed taste in bread.

The owner's bar for every game: lively and funny, never slow or quiet; animated, cute and warm; deep enough to come back to for weeks through combinations and characters; with no score, coin, streak, reward, praise or timer that pushes. Short animated scenes are welcome where the guide allows them.

## The looks reserved for it, in order

1. Linocut print (demo: `ice-palace`)

Each is a row of the ledger in section 4 of `docs/art-direction.md`; build from the row's own description. Only one row could be reserved: if it fails in the spike, propose a second in your status block, in the ledger's columns.

## The records the skill rests on

These were read from the education pack on 2026-10-02. They are where your sheet's records part starts, not the part itself: read each record file and its Limits, check each one again with `npm run -s education:find -- --id <pack id>`, drop one that does not carry your verb, and add one that does. The sheet names no school skill without a record. The skill line at the top of this brief is the wording of the roster; where the Notes below say the records carry less or carry it in another subject, your sheet follows the records, and its claim says only what they carry.

### us-ca
- `edu.us-ca.preschool-tk.science.objective.science-strand-2-0-physical-science-2-3` (code 2.3, Science / Strand 2.0): standing department-published-foundation; check state confirmed; level preschool-tk (ages 4 and 5), basis official. Asks, in our words: explore with the senses how objects and materials change and describe the changes; at the later age also explain them. Limits the game takes: the kinds of change are examples (colour, shape, texture and temperature at both ages, form added at the later age); the child's explanation need not be the scientific one; terms such as dissolving and reversible are not used.
- `edu.us-ca.preschool-tk.science.objective.science-strand-2-0-physical-science-2-1` (code 2.1, Science / Strand 2.0): standing department-published-foundation; check state confirmed; level preschool-tk (ages 4 and 5), basis official. Asks, in our words: explore materials and say what they are like. Limits the game takes: the properties listed are examples; solid or not solid at the earlier age, and solid, liquid or gas at the later age; describing, not explaining why materials differ.
- `edu.us-ca.preschool-tk.science.objective.science-strand-1-0-science-and-engineering-practices-1-5` (code 1.5, Science / Strand 1.0): standing department-published-foundation; check state confirmed; level preschool-tk (ages 4 and 5), basis official. Asks, in our words: say what will happen, with a reason, and find out by trying. Limits the game takes: adult support is stated for the checking (earlier age) and for planning the check (later age); talking about why a prediction held is only beginning; no topics are named.
- `edu.us-ca.preschool-tk.practical-life-feelings.objective.approaches-to-learning-strand-2-0-executive-functioning-2-1` (code 2.1, Approaches to Learning / Strand 2.0): standing department-published-foundation; check state confirmed; level preschool-tk (ages 4 and 5), basis official. Asks, in our words: keep a few pieces of information in mind and act on them in a task of several steps. Limits the game takes: about one or two pieces at the earlier age and about two or three at the later age; adult support is part of both statements.

### nl
- `edu.nl.fase-1.science.objective.13f0a068-94bf-4ccf-9e14-a72369056a80` (code ojw/pdm/3/02/fase1): standing curriculum-institute-guidance; check state confirmed; level fase-1 (ages 4 to 6, groep 1 to 3), basis convention. Asks, in our words: realise that people usually have to process and prepare food. Limits the game takes: "usually" leaves room for food eaten as it is; no food, no example of processing or preparing and no place are named.
- `edu.nl.fase-1.science.objective.ecc1e9b1-b39e-4920-96a2-a877bd5caeed` (code ojw/nattech/1/01/fase1): standing curriculum-institute-guidance; check state confirmed; level fase-1 (ages 4 to 6), basis convention. Asks, in our words: explore and discover properties of materials and substances. Limits the game takes: no property, material or substance is named; it does not say whether changes are meant; measuring is not mentioned.
- `edu.nl.fase-1.science.objective.9b4f69ee-01e3-47fe-aca0-f042ce526bc5` (code ojw/nattech/2/02/fase1): standing curriculum-institute-guidance; check state confirmed; level fase-1 (ages 4 to 6), basis convention. Asks, in our words: discover and wonder about light, sound, heat, force and electricity. Limits the game takes: discovering and wondering only, with no explaining, measuring or rule; for temperature the brackets name heat; no safety condition for heat is stated.
- `edu.nl.fase-1.science.objective.f68683c7-1b22-45af-a553-8b704ef5a296` (code ojw/nattech/3/04/fase1): standing curriculum-institute-guidance; check state confirmed; level fase-1 (ages 4 to 6), basis convention. Asks, in our words: work with a simple working drawing or manual. Limits the game takes: a simple one that is given to the child, who is not asked to make it; it does not say whether the manual has pictures or text, so pictures alone are within it.
- `edu.nl.fase-1.mathematics.objective.3a5d0830-68ef-4f22-a3be-46239d1168cf` (code rw/m/6/04/fase1): standing curriculum-institute-guidance; check state confirmed; level fase-1 (ages 4 to 6), basis convention. Asks, in our words: put events in order of time. Limits the game takes: Limits leaves this open (no number of events, no span of time, no means).

### Notes
- Thinnest support is us-ca at age 6, and already a five-year-old in kindergarten: no kindergarten, grade 1 or cross-grade science record carries materials changing. The us-ca claim rests on the preschool and transitional kindergarten foundations alone, which run to 5½, so for age 6 the game claims no California record. nl covers the whole band, but only in general terms.
- No record named here is other than `confirmed`. (The kindergarten science lane holds two records that print `unconfirmed (wording-differs)`; neither is used.)
- Not carried as worded: rising. No record in either jurisdiction says anything about dough rising or what causes it. Mixing and heating are not named either: us-ca foundation 2.3 covers them only as changes a child sees and describes (texture, form, temperature), and no nl statement names a change of material at all; the nearest say that food is prepared and that heat is something to wonder about. Narrow the claim to "a material looks and feels different after something is done to it, and the child sees the change". "A task in its real order": us-ca has foundation 2.1 only (holding steps in mind, with adult support, ages 4 and 5); nl has following a given manual and ordering events.

## This run

This run covers the design and the rules. Two pilot games are proving the template's helpers in a running game first, so you do not build your toy yet.

1. The steps under "Getting the code" in the cloud page.
2. The design sheet, pushed with `Open: sheet ready for check, round 1`.
3. The look spike for your first reserved look: the game's real scene in the style, at the quality bar, shown by the Mount at load with a fixed seed and with nothing playable behind it.
4. The rules as pure modules with tests beside them (no renderer, no DOM), in new files of your own, leaving the copied template files as they are wherever you can: the model of the world, the object-by-action grid, the errors as consequences, the characters' tastes, the designed order with its position ids in `config.ts`, the saved state with its defensive `deserialize`, and the size test. The guide lets a remote builder write rules while the check of its sheet runs, at its own risk: record in the status block the sheet commit they were written against.
5. Stop there: write the status block, push, and report. Your next message brings the checker's report on your sheet and the commit that holds what the pilots changed in the template.

## Defaults that bind you

The owner has not yet answered the questions listed under "Symbols, and the defaults awaiting the owner" in the guide. Work under each default as written there. If your design needs one of them answered differently, do not assume it: say so under what the owner has to decide.
