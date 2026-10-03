# Brief: Muddy Truck Wash (`muddy-truck-wash`)

Read `docs/build/CLOUD.md` first. This brief is the whole contract for your game; the guide it points to holds the rules.

## The game

- Key: `muddy-truck-wash`. Name: Muddy Truck Wash. Age band: 2 to 4. Emoji: 🚚.
- Generator: `npm run new:game -- muddy-truck-wash "Muddy Truck Wash" 2-4 🚚`
- Branch: `lane/muddy-truck-wash`. Base branch: `feat/learning-games-build`. Base commit: the one your starting message names.
- Subject and the skill that is the verb: Practical life: a wash in its steps, each tool doing its own job. Science: what water does to mud.
- Renderer: three.js, fixed. You are the pilot for that kind of game, so do not choose another ("Canvas or three.js" in the guide decides what follows from it).
- The demo it comes from: `lab/arcade/protos/muddy-truck-wash/`. Read it for the idea, the verb and the feel in the hand. Copy no line of it.

## The idea

Muddy toy vehicles roll in, and the child soaps, rinses and dries them. Each tool does only its own job, and the order matters because of what the materials do, never because the game says so: soap lifts mud into foam but leaves it on the truck, water carries foam and loose mud away, the cloth dries and shines, and water on dry caked mud only softens it. Every touch is answered and no order is a dead end; a truck that leaves half washed is funny, not wrong. The mud is a coarse saved grid. Each vehicle has a fixed taste the child can learn (one loves bubbles, one cannot stand the cloth on its nose).

The owner's bar for every game: lively and funny, never slow or quiet; animated, cute and warm; deep enough to come back to for weeks through combinations and characters; with no score, coin, streak, reward, praise or timer that pushes. Short animated scenes are welcome where the guide allows them.

## The looks reserved for it, in order

1. Enamel toy cars
2. Lithographed tin toys

Each is a row of the ledger in section 4 of `docs/art-direction.md`; build from the row's own description.

## The records the skill rests on

These were read from the education pack on 2026-10-02. They are where your sheet's records part starts, not the part itself: read each record file and its Limits, check each one again with `npm run -s education:find -- --id <pack id>`, drop one that does not carry your verb, and add one that does. The sheet names no school skill without a record. The skill line at the top of this brief is the wording of the roster; where the Notes below say the records carry less or carry it in another subject, your sheet follows the records, and its claim says only what they carry.

### us-ca
- `edu.us-ca.infant-toddler.practical-life-feelings.objective.cognitive-development-strand-4-0-memory-4-1` (code 4.1): standing department-published-foundation; check state confirmed; level infant-toddler (age 2), basis official. Asks, in our words: a toddler knows ahead of time which step comes next in a routine they know well. Limits the game takes: familiar routines only; no number of steps is given, so three steps is the game's own choice.
- `edu.us-ca.infant-toddler.science.objective.cognitive-development-strand-1-0-exploration-1-1` (code 1.1): standing department-published-foundation; check state confirmed; level infant-toddler (age 2), basis official. Asks, in our words: a toddler makes easy guesses about what an action will bring about and thinks back over why something happened. Limits the game takes: the guess need not be right; no materials or events are named, so water and mud are the game's choice.
- `edu.us-ca.preschool-tk.practical-life-feelings.objective.health-strand-2-0-health-and-safety-habits-2-1` (code 2.1): standing department-published-foundation; check state confirmed; level preschool-tk (ages 3 to 4), basis official. Asks, in our words: a child knows part of the order of steps for washing hands, and at the later age most or all of it. Limits the game takes: it is about the child's own hands, not an object; part of the order at 3 to 4½; the statements list no steps and no count (a note under them describes a routine that runs wet, soap, rinse, dry); it is about knowing the steps.
- `edu.us-ca.preschool-tk.science.objective.science-strand-2-0-physical-science-2-3` (code 2.3): standing department-published-foundation; check state confirmed; level preschool-tk (ages 3 to 4), basis official. Asks, in our words: a child explores with the senses how things and materials change (texture, shape, colour and temperature are examples) and says what changed. Limits the game takes: explore and describe in the Early statement, explaining only in the Later one; no words for dissolving or melting are used; the child's account need not be the scientific one.
- `edu.us-ca.preschool-tk.science.objective.science-strand-5-0-engineering-technology-and-applications-of-science-5-2` (code 5.2): standing department-published-foundation; check state confirmed; level preschool-tk (ages 3 to 4), basis official. Asks, in our words: with an adult's support a child notices and explores how tools and made things help people with everyday needs. Limits the game takes: adult support is stated at the earlier age; no tools are named, so sponge, hose and cloth are the game's choice; working out several solutions is only in the Later statement.

### nl
- `edu.nl.peuters.practical-life-feelings.objective.inhoudskaart-orientatie-op-jezelf-en-de-wereld-peuters-de-samenleving-veilige-leefomgeving-2` (code (Veilige) leefomgeving / 2): standing curriculum-institute-guidance; check state confirmed; level peuters (ages 2 to 3, and a child just turned 4), basis convention. Asks, in our words: discovering that a safe place to live asks for clean, careful and safe handling of things, appliances and tools. Limits the game takes: discovering only; no tools or dangers are named; no order of steps.
- `edu.nl.peuters.practical-life-feelings.objective.inhoudskaart-orientatie-op-jezelf-en-de-wereld-peuters-de-samenleving-veilige-leefomgeving-1` (code (Veilige) leefomgeving / 1): standing curriculum-institute-guidance; check state confirmed; level peuters (ages 2 to 3, and a child just turned 4), basis convention. Asks, in our words: paying attention to the child's own surroundings and looking after them. Limits the game takes: no task is named, so washing is the game's choice; the surroundings are not defined.
- `edu.nl.peuters.science.objective.inhoudskaart-orientatie-op-jezelf-en-de-wereld-peuters-verschijnselen-uit-natuurkunde-en-techniek-materialen-stoffen-en-voorwerpen-1` (code Materialen, stoffen en voorwerpen / 1): standing curriculum-institute-guidance; check state confirmed; level peuters (ages 2 to 3, and a child just turned 4), basis convention. Asks, in our words: experimenting with safe materials, substances and objects. Limits the game takes: no question to answer and no result to reach; no material is named, so water and mud are the game's choice.
- `edu.nl.peuters.science.objective.inhoudskaart-orientatie-op-jezelf-en-de-wereld-peuters-verschijnselen-uit-natuurkunde-en-techniek-natuurkundige-verschijnselen-2` (code Natuurkundige verschijnselen / 2): standing curriculum-institute-guidance; check state confirmed; level peuters (ages 2 to 3, and a child just turned 4), basis convention. Asks, in our words: discovering and wondering about light, sound, warmth, force (of water and of magnets) and a lamp. Limits the game takes: discovering and wondering only, no explaining and no measuring; of water it names only its force.
- `edu.nl.fase-1.practical-life-feelings.objective.inhoudskaart-orientatie-op-jezelf-en-de-wereld-fase-1-de-samenleving-veilige-leefomgeving-2` (code (Veilige) leefomgeving / 2): standing curriculum-institute-guidance; check state confirmed; level fase-1 (age 4, groep 1), basis convention. Asks, in our words: discovering that a safe place asks for clean, exact, safe and careful action, for example handling things, materials and tools with care and good sense. Limits the game takes: what a school offers in groep 1 and 2, with no year stated; no tools named.

### Notes
- Thinnest support: us-ca at age 2 (one routine record and one cause-and-effect record, neither naming water, washing or tools). For a two-year-old the wash has to read as a known routine with one obvious next step, and every touch must show its effect at once.
- No record here is other than `confirmed`.
- Not carried by any record: a wash of a thing in ordered steps (us-ca 2.1 is the order for washing one's own hands; the Dutch records name hygiene and care with no steps); mud, or dirt coming off in water, by name (the records speak only of materials changing and of experimenting with materials); what each tool is for (us-ca 5.2 needs adult support at 3 to 4½, the Dutch records speak of handling tools with care). Narrow the claim to: designed from the handwashing-order foundation as the shape of a wash, and from exploring how a material changes.

## This run

You are one of two pilot games, the first of your kind of renderer to use the cartridge template in a running game. This run goes as far as it can.

1. The steps under "Getting the code" in the cloud page.
2. The design sheet, pushed with `Open: sheet ready for check, round 1`.
3. The look spike for your first reserved look, shown by the Mount at load with a fixed seed.
4. The toy: the one action the finger performs most, in the look, with its sound and motion.
5. Then the rules as pure modules with tests, the characters, the errors as consequences, the guidance ladder and the short scenes. The guide lets a remote builder write rules while the check of its sheet runs, at its own risk: record in the status block the sheet commit they were written against.

As a pilot you have one more duty. Use every copied helper in the running game (`input.ts`, `audio.ts`, `guidance.ts`, `scene.ts`, the position rules in `state.ts`, the Mount's resize and attention handling), and write under **Template notes** in your status block, for each file: used as copied, or what you had to change and why. Muddy Truck Wash has done the same for three.js and the template you start from already holds what it learned. The other canvas games wait for your notes before they build their toys, so push them as you learn them, not at the end.

## Defaults that bind you

The owner has not yet answered the questions listed under "Symbols, and the defaults awaiting the owner" in the guide. Work under each default as written there. If your design needs one of them answered differently, do not assume it: say so under what the owner has to decide.
