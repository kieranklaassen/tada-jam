# Brief: Seed Lab (`seed-lab`)

Read `docs/build/CLOUD.md` first. This brief is the whole contract for your game; the guide it points to holds the rules.

## The game

- Key: `seed-lab`. Name: Seed Lab. Age band: 9 to 12. Emoji: 🌱.
- Generator: `npm run new:game -- seed-lab "Seed Lab" 9-12 🌱`
- Branch: `lane/seed-lab`. Base branch: `feat/learning-games-build`. Base commit: the one your starting message names.
- Subject and the skill that is the verb: Science: traits pass from parents to young, with variation.
- Suggested renderer: canvas 2D ("Canvas or three.js" in the guide decides what follows from it). Say in the sheet if you choose otherwise, and why.
- The demo it comes from: `lab/arcade/protos/mutant-garden/`. Read it for the idea, the verb and the feel in the hand. Copy no line of it.

## The idea

Plants with visible traits (colour, height, leaf shape, spots). The child chooses two parents, sows, and sees young that resemble them and differ from each other; over a few generations the child steers towards a plant they or a visitor want. The model of inheritance is true as far as it claims anything and claims no more than the records carry. Randomness is seeded. More than one route reaches a wanted plant, and the odd results are kept and enjoyed.

The owner's bar for every game: lively and funny, never slow or quiet; animated, cute and warm; deep enough to come back to for weeks through combinations and characters; with no score, coin, streak, reward, praise or timer that pushes. Short animated scenes are welcome where the guide allows them.

## The looks reserved for it, in order

1. Naturalist's field journal
2. Ink brush

Each is a row of the ledger in section 4 of `docs/art-direction.md`; build from the row's own description.

## The records the skill rests on

These were read from the education pack on 2026-10-02. They are where your sheet's records part starts, not the part itself: read each record file and its Limits, check each one again with `npm run -s education:find -- --id <pack id>`, drop one that does not carry your verb, and add one that does. The sheet names no school skill without a record. The skill line at the top of this brief is the wording of the roster; where the Notes below say the records carry less or carry it in another subject, your sheet follows the records, and its claim says only what they carry.

### us-ca
- `edu.us-ca.grade-6.science.objective.ms-ls3-heredity-inheritance-and-variation-of-traits-ms-ls3-2` (code MS-LS3-2): standing state-board-adopted-standard; check state confirmed; level grade-6 (ages 11 to 12), basis derived. Asks, in our words: use a model to show why young from one parent are genetic copies while young from two parents differ from one another. Limits the game takes: no assessment boundary printed; the kinds of model in the clarification (diagrams, simulations, Punnett squares) are examples.
- `edu.us-ca.grade-6.science.objective.ms-ls1-from-molecules-to-organisms-structures-and-processes-ms-ls1-5` (code MS-LS1-5): standing state-board-adopted-standard; check state confirmed; level grade-6 (ages 11 to 12), basis derived. Asks, in our words: explain from evidence how both the surroundings and inherited factors shape how a living thing grows. Limits the game takes: how genes work, how they are regulated and the biochemistry are left out; the conditions and varieties in the clarification are examples.
- `edu.us-ca.grade-6.science.objective.ms-ls1-from-molecules-to-organisms-structures-and-processes-ms-ls1-4` (code MS-LS1-4): standing state-board-adopted-standard; check state confirmed; level grade-6 (ages 11 to 12), basis derived. Asks, in our words: argue from evidence how animal behaviours and special plant structures change the chance of reproducing successfully (drawing pollinators, getting seeds carried). Limits the game takes: no assessment boundary printed; it is about the chance of reproducing, not about which traits pass on.

### nl
- `edu.nl.fase-2.science.objective.8d8e77f7-4928-43e6-ad77-3d395ba997ae` (code ojw/pdm/3/10/fase2): standing curriculum-institute-guidance; check state confirmed; level fase-2 (ages 9 to 10), basis convention. Asks, in our words: explore how animals reproduce and realise that a living thing always comes from another of the same kind. Limits the game takes: an offer for groep 4 to 6 with no year; the first part is about animals; the ways are not listed; the Dutch word covers both kind and species.
- `edu.nl.fase-2.science.objective.85460e58-4e77-4ee3-881a-96a551defb2a` (code ojw/pdm/3/08/fase2): standing curriculum-institute-guidance; check state confirmed; level fase-2 (ages 9 to 10), basis convention. Asks, in our words: explore the forms of reproduction in plants: seed that forms in a fruit, tuber, bulb and runners. Limits the game takes: four forms named and no others; pollination is not named.
- `edu.nl.fase-3.science.objective.cf826416-0c06-4aa6-a476-12f80b22243a` (code ojw/pdm/3/14/fase3): standing curriculum-institute-guidance; check state confirmed; level fase-3 (ages 10 to 12), basis convention. Asks, in our words: realise that the characteristics of a kind are passed on to the young, and what follows from that. Limits the game takes: an offer for groep 7 and 8 with no year; the verb is realising; it does not say what the consequence is; no level of detail on how characteristics pass; no plants or animals named.
- `edu.nl.fase-3.science.objective.82170ab5-6a15-48e7-896a-a47bd6294ac5` (code ojw/pdm/3/12/fase3): standing curriculum-institute-guidance; check state confirmed; level fase-3 (ages 10 to 12), basis convention. Asks, in our words: investigate and observe the difference between reproduction through seed and through tuber, bulb and runners. Limits the game takes: two sides compared; no plants named; the words sexual and asexual are not used; cuttings and spores are not named.
- `edu.nl.fase-3.science.objective.002763c1-3b1d-4277-ac8f-27815a44858f` (code ojw/pdm/3/07/fase3): standing curriculum-institute-guidance; check state confirmed; level fase-3 (ages 10 to 12), basis convention. Asks, in our words: carry out simple experiments with plants, for example on what influences growth, without losing sight of care for living things. Limits the game takes: the experiments are simple; the factors are examples; one condition is set: care for living organisms.

### Notes
- Difference inside the band: California carries inheritance only in grade 6 (ages 11 to 12). Grades 4 and 5 hold no record on traits passing on, and grade 3 is not in the pack, so nothing is named for a Californian nine- or ten-year-old. The Dutch records offer "same kind" and plant reproduction at 9 to 10 and the passing on of characteristics at 10 to 12. For 9 to 10 follow nl (young are of the parents' kind; new plants from seed) and name no California record. For the variation model at 11 to 12 follow us-ca MS-LS3-2, the only record in either set that states that the young of two parents differ from one another.
- Variation between the young is not stated by any Dutch record: the fase 3 record leaves "what follows" open, and the remark that a seedling differs a little from its parents is the pack's illustration, not the statement. Claim variation for California grade 6 only.
- Not carried: "choosing parents to get a wanted trait". No statement of either jurisdiction in the band asks for choosing parents or breeding for a trait (us-ca MS-LS1-5 mentions breeds only as an example of an inherited factor). The nearest, nl ojw/pdm/5/12/fase3 (`edu.nl.fase-3.science.objective.d936f2d0-2096-4576-82b2-aa1615902cdb`, confirmed: why people keep animals and manage crops), names no breeding. Narrow the claim to "traits pass from parents to young, and two parents give young that differ"; the choosing is the game's play, not a claimed school skill.
- Depth: MS-LS1-5 keeps the working of genes out and the Dutch records set no level; dominant and recessive are in no record, so any dominance rule is the game's own choice. No end-of-primary record, in force or draft, names heredity (2006 goal 41 is about structure, form and function).
- Do not use nl ojw/pdm/3/15/fase3: it names hereditary characteristics, but inside human reproduction and sexuality.
- Not `confirmed`: none of the records named. One neighbour is `unconfirmed (wording-differs)`: us-ca 4-LS1-1 (structures that serve survival and reproduction, grade 4); it is not about inheritance and is not used.

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
