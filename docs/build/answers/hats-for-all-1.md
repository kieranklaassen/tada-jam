# Answers for Hats for All: the check of the sheet, round 1

Checked: the sheet part of `games/hats-for-all/ART.md` (everything above `## The look`) whose sha256 is `4036d60f259b42d407b943b8da5a98086111f802bd4314f16a176867cc105fd0`. Checker: B. Outcome: **OPEN round 1: 14 findings**. Line numbers are lines of `ART.md` as it stood with that hash.

Paste each replacement as it stands, bring anything you built on the old text into line, write the round and its outcome into the status block with the new sheet commit and hash, and set `Open: sheet ready for check, round 2`. Where a finding changes the mechanic, the error, the designed order or the saved state, the rules written on the old text are reopened. If you believe a finding is wrong, do not ignore it: paste nothing for it and say why in the status block, in one or two sentences, for the next checker.

## The checker's report

Check of the design sheet for `hats-for-all` (Hats for All, band 2 to 4), round 1.
Sheet read: `games/hats-for-all/ART.md` as checked (lines 1 to 199, everything above `## The look`). Line numbers below are lines of that file.

Records: all seven pack ids exist; code, standing (three `department-published-foundation`, four `curriculum-institute-guidance`, no regime applies) and check state (`confirmed`) are as the lookup prints today.
Limits: each limit taken was read against that record's Limits; all are there except one way of comparing on the peuter record Hoeveelheden / 4 (finding 13), and the Later statement of `us-ca` 2.4 is used for a three-year-old without saying so (finding 12).
Levels: ages 2, 3 and 4 print in both jurisdictions as the sheet says (levels, sub-bands, `official` / `convention`, no gap line, the end-of-primary label at `nl` age 4). All ten headings are present in order, no position id names a grade, groep or level, the age default is open-ended at both ends (ruling 4), no web address, no suspected paste of official wording.

## Findings

**1. "The four mechanic questions" line 65, "The designed order" line 81, "The scenes" lines 144 and 146.** The Guess answer does not hold for the game as designed: the parade's cause is true the instant the last head is hatted, `finished` is saved and the cycle judged at that instant, so at `spare-hat` a child who taps every hat succeeds before the spare is touched. "As paired as it can be" is also never defined, and `one-leaves` is missing from the answer.

Line 65, replace with:
`- **Guess.** At `two-heads` and `three-heads`, yes, on purpose: there are as many hats as heads and a tapped hat goes to a bare head, so a two-year-old cannot go wrong. At `one-leaves` the tossed hat goes home on one tap and nothing else needs doing. From `spare-hat` on, no: tapping every hat leaves a hat loose, because the crew sets off only after it has been left alone; tapping at random takes hats off heads again; and the crew is ready only when the child has seen who has one and stopped there.`

Line 81, replace with:
`**A cycle** is one crew. Some creatures walk in bare-headed with one tile of hats; the child gives the hats out; when the crew is as paired as it can be and has been left alone, the cycle's change comes (one more walks in, or one walks out, never more than one at a time); the child sets the pairs right again; and when every head has exactly one hat, no hat is loose and the crew has been left alone, the crew parades. "As paired as it can be" means no tower, no loose hat, and either every head has exactly one hat or every hat is on a head. "Left alone" means no touch on a hat or a creature for two seconds of attended game time, while the last reactions play out; it is the game waiting for the child, it shows nothing and hurries nobody. Sets are five or fewer throughout: at most five heads on the mat and five hats in a tile.`

Line 144, replace the cause with: `(cause: the crew is as paired as it can be and has been left alone, and a `come` is held)`
Line 146, replace the cause with: `(the ending; cause: every head has exactly one hat, no hat is loose, no change is held, and the crew has been left alone)`

**2. "The scenes", line 149 (How a cycle ends).** The sheet does not say what a touch does to a finished crew, although every touch must be answered and line 140 says no scene plays only sometimes for the same cause; without a rule the parade either goes dead or the cycle is judged twice. Replace with:
`**How a cycle ends.** The parade's last pose stays for as long as the child likes, with the hats on. The finished crew and its hats still answer every touch as the grid says; if the child unsettles the pairs and sets them right again the crew parades again, every time, but the cycle was judged at its first parade and the position does not move twice. If the child does nothing, nothing new starts: no next crew by itself and no countdown.`

**3. "The designed order, and what is stored", lines 110 to 112 (ruling 5).** A tile of four or five hats of three kinds holds two of a kind, so hats stored by kind cannot rebuild which hole is empty, yet the sheet says a hat leaves and returns to its own hole. Replace the three rows with:
`| `crew` | The creatures on the mat in row order, at most five: each one's kind and the hats on its head from the bottom up, each hat named by its hole in `tile`. |`
`| `tile` | The hats of this cycle in hole order, at most five: each one's kind. A hole shows empty when its hat is named in `crew` or `loose`. |`
`| `loose` | Which hats lie loose on the floor, each named by its hole in `tile`, and beside which round spot each one rests. |`

**4. "The error as a consequence" line 71, and the grid lines 35 and 37, fifth cells (ruling 5; pack: game-design, ages-2-to-4.md and the-mechanic-is-the-school-skill.md).** A loose hat that roams "where it lands" and "about" cannot be rebuilt from a stored spot, and a roaming essential target asks a two-year-old to aim and time.
Line 71, replace with:
`- **One hat too many taken out.** The hat has nobody under it: it lands on the floor, skids to the nearest round spot and scuttles in a small circle beside it, slowly enough for a two-year-old's tap, bumping the feet there, and every creature turns to watch it. It shows by itself that every head already has one. One tap sends it home.`
Line 35, fifth cell, replace with: `Becomes a loose hat: it skids to the nearest round spot and starts to scuttle in a small circle beside it.`
Line 37, fifth cell, replace with: `Skids, spins like a coin and scuttles on beside the round spot nearest to where it stops.`

**5. The grid, line 38, third cell (Top hat of a tower, drag to a hatted head).** Moving the top hat of one tower onto a head with one hat makes a tower of two there, not three; the cell contradicts the cause on line 147 (a third hat on one head). Replace the cell with:
`Onto a head with one hat: the tower changes heads, the first creature blinks in the light and the second goes dark. Onto a head that already has two: a tower of three, which sways, salutes and topples, and every hat of it bounces home (a secret that works every time).`

**6. The grid, line 37, third cell (ruling 5).** A hat that stays sideways on a leaning tower is a lasting state that no field holds. Replace the cell with:
`Lands sideways on the hat already there, the tower leans with a creak, and the hat then rights itself: a tower of two like any other.`

**7. The grid, line 36, fourth cell.** "Goes home, as a tap does" says the cell is the tap cell again, and every cell has to look and sound different. Replace the cell with:
`Is carried home along the path the finger drew and pushed into its hole under the finger with a rising squeak; its creature waves it off.`

**8. "The characters and their fixed tastes", line 130, the "Cannot stand" cell of Wig (ruling 5).** "Has to be popped back up" reads as a job left for the child and a lasting state no field holds, against line 133 (a short act that ends with the hat worn). Replace the cell with:
`the cone: it sinks point first into Wig's soft top, and Wig pops it back up with a belly bounce and a grumble`

**9. "The records", `### us-ca`, line 161 (ruling 7).** The sheet takes pairing one with one from the Dutch card alone, but under the California heading it says so only for age 2. Replace with:
`At `infant-toddler` no record carries pairing one with one or one more and one fewer, so for a two-year-old in California the game rests on no record and names nothing in its place. At `preschool-tk` no record is named for pairing one thing with one thing as such: that part is taken from the Dutch peuter card alone, and for California the game is designed only from the comparing, the change and the equal dealing of the three records below.`

**10. "The records", `### nl`, line 185 (ruling 7; pack: education, cite-by-id-or-code-never-by-link.md).** One record is mentioned with no id or code, and the nl heading does not say that no Dutch record is named for the equal dealing the claim takes from California. Replace with:
`Read and not used: the peuter card's Hoeveelheden / 1 (counting small amounts) and the fase 1 card's Optellen en aftrekken met hele getallen (tot tenminste 20) / 2 (the words that go with adding and taking away), because the game neither counts aloud nor speaks. No Dutch record is named for dealing out equally: the peuter card has one, Bewerkingen / 2 (fair sharing), and the game does not use it, since the Dutch pairing record already carries one for each and the game deals no pile into shares.`

**11. "Where the two differ", lines 192 and 194 (ruling 6).** Neither point says which jurisdiction the game follows there.
Line 192, replace with:
`- **A change of exactly one.** The Dutch peuter card has the change one at a time from age 2. The California foundation has only the direction of the change in its Early statement and the change of exactly one in its Later statement. The game follows the Dutch record and moves one creature at a time for everyone; for a three-year-old in California it is designed only from the direction of the change, and the change of exactly one is the game's own choice there.`
Line 194, replace with:
`- **Standing.** The California records are foundations published by a state department. The Dutch records are guidance from the curriculum institute. Neither is a standard or the law, and the two are not equated. The game follows neither over the other here: the claim gives each in the words of its own standing.`

**12. "Where the two differ" line 193 and `### us-ca` line 168 (ruling 6; pack: education, limits-come-from-the-limits-section.md and age-maps-to-levels-through-the-lookup.md).** Age 3 returns the Early sub-band only, and the first-visit default for a three-year-old is `three-heads`, so a row of three or more is beyond the Early statement of 2.4 for that child; the sheet rests it on the Later statement without saying so, and the point names no jurisdiction followed.
Line 168, replace the sentence that begins "Limits taken:" with:
`Limits taken: the Early statement has two receivers and a few things, which is the position `two-heads`; the Later statement allows more receivers, and for a child of 4 or older every row of three or more rests on it, while for a three-year-old such a row is beyond the Early statement and is the game's own choice.`
Line 193, replace with:
`- **How many.** Neither sets five as a top. The California foundation on dealing has two receivers in its Early statement and more than two only in its Later statement; the Dutch records set no number. The game follows the Dutch records and lets its rows grow past two heads for everyone, so for a three-year-old in California every row of three or more is beyond the Early statement and is the game's own choice. Five or fewer comes from the game-design pack's rule for ages 2 to 4 and is the game's own choice in both.`

**13. `### nl`, line 181 (Hoeveelheden / 4), the "Limits taken" sentence.** "By the pairs" is not a way the record's Limits names (it names by eye and by rows), and line 50 says the game's two rows are never lined up. Replace the first sentence of "Limits taken" with:
`Limits taken: the small amounts only, compared by eye; the record's other way, matching rows, appears in the game as a hat on each head of one row, which is the game's own form of it, since its two rows are never lined up; counting is not named as a way to compare, and the game asks for none.`

**14. "The claim", line 198 (ruling 7, and ruling 1 as it bears on what the game takes).** The claim names the dealing foundation whole although the game takes only one for each (dividing a pile into equal shares is another game's core), and it does not say outright from which jurisdiction the pairing is taken. Replace with:
`Hats for All is designed from three California preschool and transitional kindergarten learning foundations, which are foundations published by a state department and not standards (comparing two groups, how a group changes when things are put in or taken out, and dealing out so that each receiver gets the same, of which the game takes only one for each and never a pile dealt into shares), and from four records of guidance by the Dutch curriculum institute, which is guidance and not law (three from its content card for peuters, on pairing one with one, on one more and one fewer, and on comparing small amounts, and one from its fase 1 card, on comparing amounts). The pairing of one with one is taken from the Dutch record alone; no California record is named for it. Every record named is `confirmed`. For a two-year-old in California the game rests on no record. Nothing here says what a child has reached.`

OPEN round 1: 14 findings
