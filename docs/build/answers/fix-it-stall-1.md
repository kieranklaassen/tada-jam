# Answers for Fix-it Stall: the check of the sheet, round 1

Checked: the sheet part of `games/fix-it-stall/ART.md` (everything above `## The look`) whose sha256 is `0585a62e0a40d226105a4869612f164d0fc828f64f6f005618a3d09435be8423`. Checker: B. Outcome: **OPEN round 1: 18 findings**. Line numbers are lines of `ART.md` as it stood with that hash.

Paste each replacement as it stands, bring anything you built on the old text into line, write the round and its outcome into the status block with the new sheet commit and hash, and set `Open: sheet ready for check, round 2`. Where a finding changes the mechanic, the error, the designed order or the saved state, the rules written on the old text are reopened. If you believe a finding is wrong, do not ignore it: paste nothing for it and say why in the status block, in one or two sentences, for the next checker.

## The checker's report

Check of the design sheet for `fix-it-stall` (Fix-it Stall, band 9 to 12), round 1. File read: `games/fix-it-stall/ART.md` as checked, everything above `## The look`. Line numbers are lines of that file.

Records: all ten exist; code, standing, regime (`nl 42`: 2006; the two draft items: 2027-draft) and check state (`confirmed`, all ten) are as the lookup prints today. No web address and no suspected paste of official wording; the two quoted Summaries match the pack's text.
Limits: each limit taken was compared with that record's Limits. Faults: one sentence under "Limits taken" is not from Limits (line 284), one says the game uses nothing the goal leaves unnamed although it uses a test lamp (line 305), and `us-ca 5-PS1-3` is read for more than the game does (lines 280-281).
Levels: levels, basis (`derived`, `convention`), lane labels and the three gap lines are as printed for ages 9, 10, 11 and 12 in both jurisdictions. The `grade-6` science lane holds no record on electricity, but it does hold `us-ca MS-ETS1-1` to `us-ca MS-ETS1-4`, so "grade 6 holds nothing on this skill" is not as printed.

Status block: it names only a hash for the sheet (the hash matches this file). It must name the commit that holds the sheet as this round read it (branch tip 044bb5f4, or the sheet's stage-boundary commit).

Headings are all there and in order. Position ids name no grade, groep or level. The two jurisdictions are under separate headings and nothing equates them.

## Findings

**1. "The band and its age rule", line 16 (ruling 4).** The default is written as the closed range "9 or 10" and repaired by a later sentence. Replace the line with:

`- **What `ctx.childAge` sets.** Only where a first visit starts in the designed order: no age, or 10 and younger, starts at the first position (`gap`); 11 and older starts at the second (`switch`). A saved position always wins, every position is reached by play at any age, and nothing is locked or hidden by age.`

**2. "The object-by-action grid", lines 45 and 75 (model true where it claims science).** "The representation" says a bead's speed is the current, so doubled current is beads twice as fast, not "twice as thick"; and cells side by side do change something, since each carries half. Line 45 also names no sound for nose to nose. Replace line 45 with:

`| Add a second | Nose to tail: beads faster, lamp brighter, hum higher. Side by side: the lamp does not change, and each cell sends out half the beads at half the speed, the two streams joining into the one the lamp had before. **W** nose to nose: the two lean on each other like arm-wrestlers with a low strained creak, the beads shiver on the spot, and nothing runs. |`

Replace line 75 with:

`| Add a second | In a row: both dim, and the beads slow everywhere in the loop. Side by side: both at full glow, and the beads leave the cell twice as fast and divide at the fork, each lamp getting the stream it had alone. **W** three cells on one lamp: it flares, goes pik, and the glass turns smoky. It is now a blown lamp, which is a gap, and the tray has more. |`

**3. "The object-by-action grid", line 86, and "The representation", line 122 (model true where it claims science).** The model is stated as fixed resistances on steady direct current, yet line 87 makes a spun motor a source; that is outside the stated model, and a motor that is a source is braked by a lead across its legs and does not coast. Replace line 86 with:

`| Lead straight across it | It stops short with a falling whirr, braked by the lead across its own legs, while the rest of the loop runs harder. |`

Replace line 122 with:

`**Where the model is true, and where it stops.** Every result on screen is computed from the circuit as it lies: ideal parts of fixed resistance on steady direct current, solved again at every change. A motor is the one part that is also a source: while a cell turns it, it is a fixed resistance; spun by hand it is a small source for as long as it turns, which lights a lamp with no cell and brakes the blade when a lead lies across its legs. Nothing is scripted to light. It leaves out, and does not claim: cells running down (no clock runs), a filament's resistance changing as it heats, why a turning motor is a source (magnetism), and static electricity. The beads are the one invented thing. Current cannot be seen, and the beads stand for it as the arrows in a school drawing do.`

**4. "The object-by-action grid", line 95.** The buzzer is the one object with no wrong use marked. Replace the line with:

`| Add a second | In a row: both mutter. Side by side: both at full rasp a hair apart in pitch, so they throb against each other. **W** three cells on one buzzer: it shrieks, its arm is a blur, and it skitters backwards across the mat on its own rattle until its leads pull it up short. |`

**5. "The object-by-action grid", lines 55, 56, 63, 65, 76, 84, 103, 105 and 106.** These cells give a look and no sound of their own, and line 63 gives the same result as line 67. Replace each line with:

- Line 55: `| Add a second | End to end: the join bites with a lower clack, and the same loop runs by a longer way round; the lid will bulge. **W** both clips on one pad: a loop of nothing, which sags and twangs. |`
- Line 56: `| Lead straight across it | The two leads share the beads, each carrying half, and plait themselves together with a zip. |`
- Line 63: `| Clip it into a loop | With the lever down the loop runs at the last bite. With the lever up nothing starts: the switch is a gap, and its open contact gives one dry tick as the clip bites. |`
- Line 65: `| Add a second | In a row: both must be down, and the first lever to fall clacks to no effect. Side by side: either will do, so one lamp is worked from two places, and the second lever to fall clacks to no effect. |`
- Line 76: `| Lead straight across it | It goes dark with a tink of cooling glass while everything else in the loop runs harder. **W** if it was the only thing in the loop, that is a short and the flag pops. |`
- Line 84: `| Turn it round | **W** It spins the other way, and its whirr turns breathy, like air drawn in: a fan sucks, so scarves and whiskers lean in, and a toy car backs into its owner's foot. |`
- Line 103: `| Clip it into a loop | The clip bites each as its material sounds: a ring on the spoon, a scrape on the pencil, a squeak on the rubber. The spoon, the key and the foil pass everything. The pencil passes a little through its graphite, so a lamp glows dull. The rubber, the stick and the string pass nothing. |`
- Line 105: `| Add a second | In a row: one thing that blocks, anywhere in the loop, stops the whole loop, and the hum cuts off in that frame. Side by side: one thing that passes is enough, and the hum comes back at full pitch. |`
- Line 106: `| Lead straight across it | **W** Whatever it was no longer matters: a rubber with a lead across it "works", and the lead settles over it with a slap. |`

**6. "The four mechanic questions", line 138.** The answer skips the second position, where one flick succeeds. It says a random lead "most often makes a short", which the solved circuit does not bear out: in a dead loop a lead does nothing unless it crosses the break or the cell. It also leaves out swapping every part from the tray. Replace the line with:

`- **Guess.** At the first two positions, yes: the gap is in plain sight and any lead across it works, and a switch left up needs one flick; from the third position on the break cannot be seen, a lead clipped at random changes nothing unless it crosses the break or shorts the cell and pops the flag, swapping every part in turn for one from the tray does mend a single break but each swap is itself a test whose result the child sees, and from `double` on no single lead or swap makes the gadget run.`

**7. "The error as a consequence", line 148 (model true where it claims science).** "Across a sound piece of a dead loop it stays dark" and "the one place" are false for a good cell, across which the test lamp lights. The lamp is dull only when a load shares its loop, and with two breaks neither lights. Replace the line with:

`| Left a gap in the loop | Nothing runs, anywhere. No bead moves. | The test lamp, which is a lamp with a lead on each leg, glows when it is clipped across the break: there it closes the loop through the rest of the gadget, dully when a lamp, a motor or a buzzer shares that loop with it. Across a sound trace, lead or part of a dead loop it stays dark. Across a cell it glows if the cell is good, whether the loop is dead or not, and stays dark if the cell is flat. So, the cell aside, the break is the one place where something put across it comes alive, and with two breaks in one loop neither comes alive until the other is closed. |`

**8. "The designed order, and what is stored", line 212, first sentence (ruling 5).** Three things the sheet says stay have no place in the stored circuit: which way round a part lies (the "Turn it round" row of every object, and the position `backwards`), the test lamp when it is clipped on, and a part that lies loose on the mat (lines 83 and 255 have loose things). Replace the first sentence with:

`A circuit is stored as the gadget's kind, which of its traces are cracked, its parts (kind, the two pads in order, the order being the way round the part lies, or for a part that lies loose its place as a cell of a coarse grid over the mat, and whichever of these applies: a switch's lever, a flat cell, a popped flag, a blown lamp, a part open inside, what a bench odd is made of) and its leads (the two pads, or one pad and a loose end). The test lamp is stored as a part of the board it is clipped to, each of its two clips on a pad or loose, and lies at its own place on the mat when neither clip holds.`

**9. "The scenes", line 244, and "The designed order, and what is stored", line 206.** "At a position whose idea is not yet in `shown`" has no single meaning: the job on the bench was laid out before the position last moved (line 192), and one time in three it holds an earlier kind of break (line 180). After the mend the circuit no longer says which kind it was. Replace line 244 with:

`- **Cause.** The first hand-back that ran of a job whose own idea is not yet in `shown`. A job's idea is the id of the position its breaks were drawn for when it was laid out (the position's own kind two times in three, an earlier one otherwise); it is kept in `job` and is not read from `position`, which may have moved since. It follows the hand-back scene.`

Replace line 206 with:

`| `job` | The customer at the bench: who, which gadget, the id of the idea its breaks were laid out for, its circuit, its ticket or none, whether its lid is open, and whether a hand-back has already failed (`missed`). |`

**10. "The scenes", line 247, and the stored table after line 210 (ruling 5).** The old hand's mended board is said to stay beside the child's mend for comparison, and on load "the world is as the last scene left it", but no field says her board is mended or for which idea. In line 247 replace the sentence "The child's mend is still in its owner's hands beside her board, and the two can be compared." with:

`The child's mend is still in its owner's hands beside her board, and the two can be compared: her board stays mended until the next cycle starts, and on load it is rebuilt from `board`.`

Add this row after line 210:

`| `board` | The id of the idea whose neat way stands mended on the old hand's practice board, or none: set when that scene starts, cleared when the next cycle starts. |`

**11. "The records", us-ca, lines 280-281 (ruling 1).** The record is about telling which material is which from its properties. The game's odds are known by sight and the game finds one property of each, so "told apart by one property" says more than the game does. Replace both lines with:

`  In the game: each bench odd is put in a loop to find one property of its material, whether it lets current through. The game never asks which material an unknown thing is; the odds are known by sight.`
`  Limits taken: density is left out. Left open by Limits: the materials and properties listed are examples, so the seven bench odds and the one property tested are the game's own choice. The game is designed from this record in part: it tests one example property, measures nothing, and does not tell one material from another by its properties, which is what the record's observing and measuring are for.`

**12. "The records", us-ca, line 284.** "The band it belongs to has no record for grade 6" is not in the record's Limits, and it hides that the `grade-6` lane holds engineering design records of its own. Replace the line with:

`  Limits taken: it holds for the whole band of grades 3 to 5 and not for one grade; it carries no clarification and no assessment boundary; the tests are fair tests whose aim is to find what to improve. From the lookup, not from Limits: the `cross-grade` science lane holds no record for a band that includes grade 6; the `grade-6` lane holds that band's own engineering design records (`us-ca MS-ETS1-1` to `us-ca MS-ETS1-4`), which are not named here.`

**13. "The records", us-ca line 269 and nl line 292 (ruling 7).** Each jurisdiction lacks a record for a part of the skill, and the sentence saying so stands only under "Where the two differ", not under the jurisdiction's own heading. Replace line 269 with:

`The game is designed from `grade-4`, `grade-5` and the `cross-grade` lane. The `grade-6` lane holds no record on electricity, and nothing is named in its place. No us-ca record is named for the closed circuit or for what each part adds to a working thing: no record of the `grade-4`, `grade-5`, `grade-6` or `cross-grade` science lanes names them, nothing is named in their place, and those parts are taken from nl.`

Replace line 292 with:

`The game is designed from `fase-2`, `fase-3` and the `einde-po` lane. No nl record is named for energy carried from the source by the current and arriving elsewhere as light, heat or sound, and nothing is named in its place; that part is taken from us-ca. For testing where a design fails, the only nl record named is a draft item, not in force (`nl 30 A e`).`

**14. "The records", nl, line 305.** "Uses none of the things the goal does not name" is untrue, since the test lamp is an instrument the goal does not name; what Limits leaves open is to be marked as the game's own choice. Replace the line with:

`  Limits taken: a 2006 goal that is still in force; its examples are an open list; it names no steps of an investigation, no instrument, no unit and no number, and states no safety condition. The game takes electricity from the list. Left open by Limits: no instrument is named, so the test lamp is the game's own choice; the game uses no unit, no measured number and no fixed steps of an investigation.`

**15. "Where the two differ", lines 317, 318 and 319 (ruling 6).** These three points state a difference and do not say which jurisdiction the game follows there. Line 317 also says "only" of the Dutch side, where other Dutch records near it exist and are simply not named (for one, `nl 45`, a 2006 core goal still in force). Line 319 says "both Dutch fase records" where three are named and two name danger. Replace the three lines with:

`- **Finding the break.** California has a cross-grade record on looking at where a model fails, for grades 3 to 5. On the Dutch side the game names for it only the draft item on repairing (`nl 30 A e`), which is not in force. The game follows us-ca here, and narrows "finding the break" to testing whether the loop is closed and which piece lets current through.`
`- **The parts.** A cell, a lead, a switch, a lamp, a motor and a buzzer are named by no record of either jurisdiction and are the game's own choice. What each part adds rests only on the Dutch draft item 30 A c, a draft core goal, not in force. Nothing on the California side carries it. The game follows nl here.`
`- **Danger.** The two Dutch fase records on electricity name its danger. No California record named here does. The game follows neither here: it shows no danger of electricity and claims none.`

**16. "Where the two differ", line 320.** "Grade 6 holds nothing on this skill" is not as the lookup prints: the lane holds no record on electricity, but it holds four engineering design records. Replace the line with:

`- **Ages.** The California records named are for grade 4, grade 5 and the band of grades 3 to 5. The `grade-6` lane holds no record on electricity, and its engineering design records (`us-ca MS-ETS1-1` to `us-ca MS-ETS1-4`) are not named. The Dutch fase records run through groep 8. So for the oldest children the game rests on the Dutch records only and follows nl.`

**17. "Where the two differ", line 321 (ruling 1).** "The game shows none" is untrue of kinds of circuit: the grid shows parts in a row and side by side, and the position `branch` shows two loops on one source. Replace the line with:

`- **Neither names** a circuit symbol, a unit, or a kind of circuit. The game shows no circuit symbol and no unit and follows both in that. It does show parts in a row and side by side, two loops on one source (the position `branch`), a short, and a source put in backwards; those rest on no record of either jurisdiction and are the game's own choice.`

**18. "The claim", line 325 (rulings 1 and 7).** The third sentence names two California records where the first names four. The claim does not say from which jurisdiction each part of the skill is taken. And `nl 30 A c` is claimed whole although the sheet itself says the game does less than describing. Replace the line with:

`Fix-it Stall is designed from two California content standards adopted by the State Board of Education for grade 4 (`us-ca 4-PS3-2` and `us-ca 4-PS3-4`), in part from one for grade 5 (`us-ca 5-PS1-3`, of which it takes one example property and not the telling of one material from another), and from one cross-grade engineering design standard for grades 3 to 5 (`us-ca 3-5-ETS1-3`); and from three SLO fase goals, which are curriculum-institute guidance and not law (`nl ojw/nattech/2/06/fase2`, `nl ojw/nattech/1/02/fase2` and `nl ojw/nattech/2/06/fase3`), from core goal 42 of 2006, a legal core goal still in force (`nl 42`), and from two items of a draft core goal, not in force (`nl 30 A e`, and in part `nl 30 A c`, whose describing the game does not ask for). Every record named was `confirmed` when it was read on 2026-10-03. Part by part: the closed circuit is taken from nl only (the two fase goals on electricity, guidance), no us-ca record is named for it, and for California the game is not described as teaching circuits; energy carried by the current and arriving as light, heat or sound is taken from us-ca only (`us-ca 4-PS3-2`); which materials let current through is taken from nl (guidance) and, as one example property, in part from us-ca (`us-ca 5-PS1-3`); a device that is tested and improved, and finding where it fails, are taken from us-ca (`us-ca 4-PS3-4` and `us-ca 3-5-ETS1-3`) and on the Dutch side from a draft item, not in force (`nl 30 A e`); what each part adds is taken only from a draft item, not in force (`nl 30 A c`). No us-ca record is named for grade 6, so for a child in grade 6 the game rests on the nl records only. Nothing here says what a child has reached, and the game is not described as raising attainment.`

OPEN round 1: 18 findings
