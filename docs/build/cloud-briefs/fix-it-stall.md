# Brief: Fix-it Stall (`fix-it-stall`)

Read `docs/build/CLOUD.md` first. This brief is the whole contract for your game; the guide it points to holds the rules.

## The game

- Key: `fix-it-stall`. Name: Fix-it Stall. Age band: 9 to 12. Emoji: 🔧.
- Generator: `npm run new:game -- fix-it-stall "Fix-it Stall" 9-12 🔧`
- Branch: `lane/fix-it-stall`. Base branch: `feat/learning-games-build`. Base commit: the one your starting message names.
- Subject and the skill that is the verb: Science: a complete circuit and what its parts do.
- Suggested renderer: canvas 2D ("Canvas or three.js" in the guide decides what follows from it). Say in the sheet if you choose otherwise, and why.
- It comes from no demo: it is a new design.

## The idea

A repair stall. Customers bring toys, lamps and fans that have stopped; the child opens them, finds the break and makes the circuit whole with cells, wires, switches, lamps and motors. The model is true: a closed loop, a source, a load; a short circuit does something funny and safe. More than one repair works, and a neater one is visibly neater.

The owner's bar for every game: lively and funny, never slow or quiet; animated, cute and warm; deep enough to come back to for weeks through combinations and characters; with no score, coin, streak, reward, praise or timer that pushes. Short animated scenes are welcome where the guide allows them.

## The looks reserved for it, in order

1. Electronics bench
2. Squared-paper pencil

Each is a row of the ledger in section 4 of `docs/art-direction.md`; build from the row's own description.

## The records the skill rests on

These were read from the education pack on 2026-10-02. They are where your sheet's records part starts, not the part itself: read each record file and its Limits, check each one again with `npm run -s education:find -- --id <pack id>`, drop one that does not carry your verb, and add one that does. The sheet names no school skill without a record. The skill line at the top of this brief is the wording of the roster; where the Notes below say the records carry less or carry it in another subject, your sheet follows the records, and its claim says only what they carry.

### us-ca
- `edu.us-ca.grade-4.science.objective.4-ps3-2` (code 4-PS3-2): standing state-board-adopted-standard; check state confirmed; level grade-4 (ages 9 to 10), basis derived. Asks, in our words: observe evidence that energy moves from one place to another, carried by electric current, heat, light or sound. Limits the game takes: energy is not measured in numbers; four carriers are named.
- `edu.us-ca.grade-4.science.objective.4-ps3-4` (code 4-PS3-4): standing state-board-adopted-standard; check state confirmed; level grade-4 (ages 9 to 10), basis derived. Asks, in our words: design, try out and improve a device that turns one kind of energy into another. Limits the game takes: only devices that turn motion into electricity or use stored energy to make motion, light or sound; circuits appear as example devices in the clarification, and time, cost and materials as example limits.
- `edu.us-ca.grade-5.science.objective.5-ps1-3` (code 5-PS1-3): standing state-board-adopted-standard; check state confirmed; level grade-5 (ages 10 to 11), basis derived. Asks, in our words: observe and measure to tell which material is which by its properties; carrying electricity is one of the example properties. Limits the game takes: density is left out; the materials and properties listed are examples.
- `edu.us-ca.cross-grade.science.objective.3-5-ets1-3` (code 3-5-ETS1-3): standing state-board-adopted-standard; check state confirmed; level cross-grade (a band record for grades 3 to 5: ages 9 to 11 here), basis derived. Asks, in our words: run fair tests on a model, changing one thing at a time, and study where it fails to find what to improve. Limits the game takes: holds for the whole band, not one grade; none of the cross-grade design records is for grade 6.

### nl
- `edu.nl.fase-2.science.objective.3dbdc70f-49e7-40d3-b9fa-e8644d532c2c` (code ojw/nattech/2/06/fase2): standing curriculum-institute-guidance; check state confirmed; level fase-2 (ages 9 to 10), basis convention. Asks, in our words: investigate electricity: current goes round in a closed circuit, how static electricity arises, and its use and danger for people. Limits the game takes: an offer for groep 4 to 6 with no year; three parts named; no apparatus (no battery or bulb), no kind of circuit, no symbols and no units; danger is named without safety rules.
- `edu.nl.fase-2.science.objective.7c777238-cf10-441b-84be-a92eddd2b2ed` (code ojw/nattech/1/02/fase2): standing curriculum-institute-guidance; check state confirmed; level fase-2 (ages 9 to 10), basis convention. Asks, in our words: explore observable properties of materials such as conducting and insulating heat, sound or electricity. Limits the game takes: the properties are examples, and "and/or" leaves open which of the three are offered.
- `edu.nl.fase-3.science.objective.9ac342b5-e074-49d9-8c09-f4921771051e` (code ojw/nattech/2/06/fase3): standing curriculum-institute-guidance; check state confirmed; level fase-3 (ages 10 to 12), basis convention. Asks, in our words: investigate electricity: materials that conduct or insulate, circuits, how an electromagnet works, static electricity, and thinking about use and danger. Limits the game takes: an offer for groep 7 and 8 with no year; five parts named; no material, kind of circuit, symbol or unit (volt and ampere are not mentioned); no safety condition stated.
- `edu.nl.einde-po.science.objective.c3d8c8c0-0f94-4dec-8ce6-f52fab27158f` (code 42): standing legal-core-goal, regime 2006; check state confirmed; level einde-po (end-of-primary goal), basis convention. Asks, in our words: learn to investigate materials and physical phenomena, electricity among the examples. Limits the game takes: a 2006 core goal, still in force (the 2027 draft would withdraw it); six examples in an open list; no steps, instrument, unit or safety condition.
- `edu.nl.einde-po.science.objective.conceptkerndoelen-2027-onderdeel-f-mens-en-natuur-domein-natuurkundige-en-scheikundige-verschijnselen-en-technische-systemen-kerndoel-30-30-a-c` (code 30 A c): standing draft-not-yet-in-force, regime 2027-draft; check state confirmed; level einde-po (end-of-primary goal), basis convention. Asks, in our words: describe how the parts contribute to the working of an object or system. Limits the game takes: a draft core goal, not in force; the verb is describing; no object, system or part is named.
- `edu.nl.einde-po.science.objective.conceptkerndoelen-2027-onderdeel-f-mens-en-natuur-domein-natuurkundige-en-scheikundige-verschijnselen-en-technische-systemen-kerndoel-30-30-a-e` (code 30 A e): standing draft-not-yet-in-force, regime 2027-draft; check state confirmed; level einde-po (end-of-primary goal), basis convention. Asks, in our words: experiment with designing, making and repairing. Limits the game takes: a draft core goal, not in force; three activities, no level of mastery; no product, material, tool or safety condition.

### Notes
- Difference at 9 to 10: the Dutch fase 2 record names the closed circuit itself. California grade 4 names energy carried by electric current and a designed device, with circuits only as an example; no California record in grades 4 to 6 names a complete circuit, a switch or what a part does, and grades 5 and 6 hold nothing on electricity beyond conduction as an example property. Follow nl for the circuit idea (the loop must be closed; conductors and insulators at 10 to 12) and us-ca for the frame (a device that turns stored energy into light, sound or motion, tested and improved). The California claim is "designed from 4-PS3-2 and 4-PS3-4", never "teaches circuits".
- Not carried: the parts. Source, wire, switch, lamp and motor are named by no record of either jurisdiction; the Dutch records name no apparatus, and the battery, bulb and paper-clip switch in their notes are the pack's illustrations, not limits. The parts are the game's own choice. What each part does rests only on draft 30 A c, cited as "draft core goal, not in force".
- Finding the break: us-ca 3-5-ETS1-3 (looking at where a model fails) for ages 9 to 11; nl only the draft node on repairing. Narrow "finding the break" to "testing whether the loop is closed and which piece lets current through".
- No circuit symbols, no volts or amperes and no series or parallel circuits are named anywhere; California leaves numbers for energy out. A wordless game needs none of them.
- Danger of electricity is part of both Dutch fase records (and of draft node 30 C d, not in force); the game need not claim it. Every record named is `confirmed`; the two drafts are confirmed as records and are not law.

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
