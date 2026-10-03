# Brief: Bridge Crew (`bridge-crew`)

Read `docs/build/CLOUD.md` first. This brief is the whole contract for your game; the guide it points to holds the rules.

## The game

- Key: `bridge-crew`. Name: Bridge Crew. Age band: 9 to 12. Emoji: 🌉.
- Generator: `npm run new:game -- bridge-crew "Bridge Crew" 9-12 🌉`
- Branch: `lane/bridge-crew`. Base branch: `feat/learning-games-build`. Base commit: the one your starting message names.
- Subject and the skill that is the verb: Science and engineering: design, test and improve a crossing from a kit of parts.
- Suggested renderer: canvas 2D with matter.js or the game's own solver ("Canvas or three.js" in the guide decides what follows from it). Say in the sheet if you choose otherwise, and why.
- The demo it comes from: `lab/arcade/protos/draw-a-bridge/`. Read it for the idea, the verb and the feel in the hand. Copy no line of it.

## The idea

A gap, a kit of beams, cables and props, and a queue of odd vehicles that want to cross. The child builds, starts the test, watches where the crossing bends or fails, and improves it. Failure is large, funny and free. More than one design works, any working one stands, and a better one is visibly better in the world (it sags less, it uses less). The model is true wherever it claims to be science. The running test is a view and is not saved; the bridge is. Nothing babyish, no competition, no stored best.

The owner's bar for every game: lively and funny, never slow or quiet; animated, cute and warm; deep enough to come back to for weeks through combinations and characters; with no score, coin, streak, reward, praise or timer that pushes. Short animated scenes are welcome where the guide allows them.

## The looks reserved for it, in order

1. Blueprint and balsa
2. Perforated-strip construction set

Each is a row of the ledger in section 4 of `docs/art-direction.md`; build from the row's own description.

## The records the skill rests on

These were read from the education pack on 2026-10-02. They are where your sheet's records part starts, not the part itself: read each record file and its Limits, check each one again with `npm run -s education:find -- --id <pack id>`, drop one that does not carry your verb, and add one that does. The sheet names no school skill without a record. The skill line at the top of this brief is the wording of the roster; where the Notes below say the records carry less or carry it in another subject, your sheet follows the records, and its claim says only what they carry.

### us-ca
- `edu.us-ca.cross-grade.science.objective.3-5-ets1-1` (code 3-5-ETS1-1): standing state-board-adopted-standard; check state confirmed; level cross-grade (a band record for grades 3 to 5: ages 9 to 11 here), basis derived. Asks, in our words: state a simple design problem that comes from a need, with what a good solution must do and what limits the work. Limits the game takes: holds for the whole band, not one grade; the problem is simple; the limits named are time, cost or materials.
- `edu.us-ca.cross-grade.science.objective.3-5-ets1-2` (code 3-5-ETS1-2): standing state-board-adopted-standard; check state confirmed; level cross-grade (grades 3 to 5: ages 9 to 11), basis derived. Asks, in our words: think up several solutions and compare how well each would probably do against the demands and the limits. Limits the game takes: whole band; the comparison is by expected performance; building and testing are not in this record.
- `edu.us-ca.cross-grade.science.objective.3-5-ets1-3` (code 3-5-ETS1-3): standing state-board-adopted-standard; check state confirmed; level cross-grade (grades 3 to 5: ages 9 to 11), basis derived. Asks, in our words: plan and run fair tests on a model, changing one thing at a time, and study where it fails to find what to improve. Limits the game takes: whole band; the tests are fair tests with the other variables held; names no load, material or kind of structure.
- `edu.us-ca.grade-6.science.objective.ms-ets1-engineering-design-ms-ets1-3` (code MS-ETS1-3): standing state-board-adopted-standard; check state confirmed; level grade-6 (ages 11 to 12), basis derived. Asks, in our words: compare the test results of several designs and join the strongest features of each into a better one. Limits the game takes: no clarification and no assessment boundary printed; holds for grades 6 to 8 as a band, not for grade 6 alone.
- `edu.us-ca.grade-6.science.objective.ms-ets1-engineering-design-ms-ets1-4` (code MS-ETS1-4): standing state-board-adopted-standard; check state confirmed; level grade-6 (ages 11 to 12), basis derived. Asks, in our words: build a model that yields data, so a design is tested and changed over repeated rounds. Limits the game takes: no clarification and no boundary printed; band of grades 6 to 8.
- `edu.us-ca.grade-5.science.objective.5-ps2-1` (code 5-PS2-1): standing state-board-adopted-standard; check state confirmed; level grade-5 (ages 10 to 11), basis derived. Asks, in our words: back up with evidence the claim that Earth's gravity pulls things down, toward the planet's centre. Limits the game takes: no mathematical description of gravity.

### nl
- `edu.nl.fase-2.science.objective.e358bee9-5fb8-48bc-a017-77e45d5da836` (code ojw/nattech/3/01/fase2): standing curriculum-institute-guidance; check state confirmed; level fase-2 (ages 9 to 10), basis convention. Asks, in our words: investigate which structures and building principles make objects, buildings and works such as bridges stable and sturdy. Limits the game takes: an offer for groep 4 to 6 with no year; the five principles (wide base, triangles, arch, profile, tube) and the four places (cupboard, tower, pyramid, bridge) are examples; no materials, loads or sizes.
- `edu.nl.fase-2.science.objective.6a502ec1-5c26-48d6-b4e3-652e082a9c45` (code ojw/nattech/3/02/fase2): standing curriculum-institute-guidance; check state confirmed; level fase-2 (ages 9 to 10), basis convention. Asks, in our words: make an object with simple building principles such as profiles and triangles, so that it is stable and sturdy. Limits the game takes: an offer with no year; the two principles are examples; no object, size or material; this record is about making (investigating is the record above).
- `edu.nl.fase-3.science.objective.319db8b5-fb05-443e-8f7a-a16d2e8f7631` (code ojw/nattech/3/01/fase3): standing curriculum-institute-guidance; check state confirmed; level fase-3 (ages 10 to 12), basis convention. Asks, in our words: design and make an object with building principles such as profiles and triangles, stable and sturdy. Limits the game takes: an offer for groep 7 and 8 with no year; the principles are examples; no object, size, material or load.
- `edu.nl.fase-3.science.objective.5f0b6318-73b4-4a88-8c27-04a18b3f235c` (code ojw/nattech/2/04/fase3): standing curriculum-institute-guidance; check state confirmed; level fase-3 (ages 10 to 12), basis convention. Asks, in our words: investigate force as a phenomenon: gravity, friction, the force of air and the upward force of water. Limits the game takes: four forces named; no unit and no instrument (the newton is not mentioned); nothing ties them to a structure.
- `edu.nl.fase-3.science.objective.b618c7a5-ba69-42d8-a62b-2f49216bca14` (code ojw/nattech/3/08/fase3): standing curriculum-institute-guidance; check state confirmed; level fase-3 (ages 10 to 12), basis convention. Asks, in our words: set up and carry out a comparing experiment that uses a technical principle. Limits the game takes: "comparative" is not explained and the principle is not named.
- `edu.nl.einde-po.science.objective.e652ff27-3b26-4820-8d7b-32e9d38836e1` (code 45): standing legal-core-goal, regime 2006; check state confirmed; level einde-po (end-of-primary goal), basis convention. Asks, in our words: learn to design solutions for technical problems, carry them out and evaluate them. Limits the game takes: a 2006 core goal, still in force (the 2027 draft would withdraw it); three steps named; no problem, material, tool or safety condition; not said how often the steps repeat.

### Notes
- Difference at 9 to 10: the Dutch fase 2 records name the content itself (principles that make a construction stable and sturdy, a bridge among the examples); the California records for grades 4 and 5 name only the design process (state the problem, compare ideas, test fairly) and hold no record on structures. Follow nl for what the kit teaches (triangles, profiles, arch, wide base) and us-ca for the loop (state the demand, test fairly, look at the failure, improve), because each set is silent where the other speaks. The California claim is "designed from the engineering design expectations", never "teaches structures".
- At 11 to 12: us-ca moves to the grade 6 lane (also MS-ETS1-1 on demands and limits and MS-ETS1-2 on comparing by a fixed procedure, both confirmed, both for the band of grades 6 to 8); none of the cross-grade design records is for grade 6. nl fase 3 adds designing before making, and the four named forces.
- Not carried: "forces and why a structure holds or fails". No California record in grades 4 to 6 ties a force to a structure: 5-PS2-1 is gravity pulling down, and 4-PS3-3 (collisions, confirmed) points away from forces. The Dutch records name forces without tying them to a construction. Tension, compression, beams, cables and props are named by no statement of either jurisdiction (they appear at most in the pack's illustrations, which are not limits). Narrow the claim to "which building principles make a crossing stable and sturdy, found by testing to failure and improving". Loads, spans and materials are the game's own choice.
- Every record named is `confirmed`. Three Dutch draft nodes come near and may only be cited as "draft core goal, not in force" (standing draft-not-yet-in-force, regime 2027-draft, confirmed): 29 C b (research and design steps in repeated rounds), 30 A d (experimenting with constructions and profiles, among other principles) and 30 C c (forces and change in movement).

## This run

This run covers the design and the rules. The template you start from is its second version, proven by a three.js game; the canvas pilot (Monster Pizza) is proving it for a canvas game first, so you do not build your toy yet.

1. The steps under "Getting the code" in the cloud page.
2. The design sheet, pushed with `Open: sheet ready for check, round 1`.
3. The look spike for your first reserved look: the game's real scene in the style, at the quality bar, shown by the Mount at load with a fixed seed and with nothing playable behind it.
4. The rules as pure modules with tests beside them (no renderer, no DOM), in new files of your own, leaving the copied template files as they are wherever you can: the model of the world, the object-by-action grid, the errors as consequences, the characters' tastes, the designed order with its position ids in `config.ts`, the saved state with its defensive `deserialize`, and the size test. The guide lets a remote builder write rules while the check of its sheet runs, at its own risk: record in the status block the sheet commit they were written against.
5. Stop there: write the status block, push, and report. Your next message brings the checker's report on your sheet and the commit that holds what the canvas pilot changed in the template.

Numerals and mathematics signs are allowed in your band, and the module that draws them, `symbols.ts`, is being proven by one game first (Fruit Slicer). In this run, design where each numeral lies in the sheet and in the pure rules, and draw none yet: your next message names the commit that holds the module to start from.

## Defaults that bind you

The owner has not yet answered the questions listed under "Symbols, and the defaults awaiting the owner" in the guide. Work under each default as written there. If your design needs one of them answered differently, do not assume it: say so under what the owner has to decide.
