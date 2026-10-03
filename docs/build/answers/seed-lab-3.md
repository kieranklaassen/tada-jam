# Answers for Seed Lab: the check of the sheet, round 3

Checked: the sheet part of `games/seed-lab/ART.md` (everything above `## The look`) whose sha256 is `06a44f23f11e15db980b6e00fa710cc30127f4c2d033055ac2bb9792ec9eb20e`. Checker: E. Outcome: **OPEN round 3: 7 findings**. Line numbers are lines of `ART.md` as it stood with that hash.

Paste each replacement as it stands, bring anything you built on the old text into line, write the round and its outcome into the status block with the new sheet commit and hash, and set `Open: sheet ready for check, round 4`. Where a finding changes the mechanic, the error, the designed order or the saved state, the rules written on the old text are reopened. If you believe a finding is wrong, do not ignore it: paste nothing for it and say why in the status block, in one or two sentences, for the next checker.

## The checker's report

Check of the design sheet of `seed-lab` (Seed Lab, band 9 to 12), round 3, checker E. File read: ``games/seed-lab/ART.md` as checked`, lines 1 to 218 (sha256 of that part computed here: `06a44f23f11e15db980b6e00fa710cc30127f4c2d033055ac2bb9792ec9eb20e`, as given). No file changed, no git that writes, lookup and file reads only, `--wording` never passed.

Records: the diff of the two copies holds the five round 2 replacements, the lead's item 6 in lines 180 and 182, the builder's two sentences in lines 157 and 158, and no other change; all seven records looked up by id today, with code, standing (two `state-board-adopted-standard`, five `curriculum-institute-guidance`, no regime) and check state (all `confirmed`) as the sheet says; no web address, no suspected paste of official wording.
Limits: lines 180, 182 and 202 read against the Limits of `us-ca MS-LS3-2`, `us-ca MS-LS1-5` and `nl ojw/pdm/3/07/fase3`: each "Not in Limits" names only things that Limits section does not mention, and the one "Left open by Limits" (line 202) names only what that Limits says the statement does not name. The other four "Limits taken" lines hold only what their Limits say.
Levels: outline for ages 9, 10, 11, 12 in both jurisdictions is as lines 173 to 175, 188 and 191 say. Sweep for rulings 8 to 11: no grid cell without a sound word and no row or column with one sound (ruling 8); no named record is about people or communicating (ruling 11); ruling 9 gives finding 4 and ruling 10 gives findings 1, 3, 5, 6 and 7.

## Findings

**1. The representation, line 61 (ruling 10).** "since no record sets it" speaks for the whole pack. Replace "What follows is the game's own choice, since no record sets it:" with:

> What follows is the game's own choice, since none of the records named under "The records" sets it:

**2. The scenes, line 157, the showing of a new tool (ruling 5; the builder's new sentence read against the saved-state table and line 131).** The sentence has the showing add one plant, or two with the packet plant, to a page bounded at twelve pots and eighteen border plants, and says nothing of where they go when no pot is free. With the shelf and the tray full the copy must shoulder a plant out; with the border full too, the oldest border plant leaves the page, which changes `sketched` (and `pods`, where that plant bore one), neither of them in the list, and which line 131 says happens at the child's own action only. Naming those two fields instead would contradict line 131, so the showing is confined. Two replacements in line 157.

Replace "Cause: the visitor that carries a new tool in has set it down." with:

> Cause: the visitor that carries a new tool in has set it down, and a pot stands free for each plant the showing adds.

Add after "Filled in from: which plants are on the page.":

> The copy, and the packet plant where one is sown, go only into pots that stand free, in the tray or on the shelf: a showing shoulders no plant out, sends none to the border and none off the page, and while too few pots stand free the tool lies where it was set down for the child to use and the showing waits until they do.

The "Saved when the scene starts" sentence then stands as written: with nothing displaced, `plants`, `nextId`, `dry` and `shown` are every field the scene changes. The cause is a test on saved state (the tool in `kit`, its id not in `shown`, a free pot), so no field is added. The builder's test for this scene gets one case with all twelve pots taken.

**3. The records, us-ca, line 175 (ruling 10).** "Neither grade-4 nor grade-5 holds a record on..." speaks for two levels the sheet does not say it read. Replace the sentence "Neither grade-4 nor grade-5 holds a record on traits passing from parents to young, so for a Californian child in those grades the game names no record and claims nothing." with:

> The game names no record of grade-4 or grade-5, so for a Californian child in those grades it claims nothing.

**4. The records, us-ca, line 179, and The claim, line 217 (ruling 9).** The Summary of `us-ca MS-LS3-2` has the student build and use a model; in the game the model is the game's (the beads under the loupe, lines 57 and 61) and the child may use it, so an act of the record is left out, and neither the line beside the code nor the claim says so. Line 181 already says the like for `us-ca MS-LS1-5`, and the claim names neither as taken in part.

In line 179 replace "In the game: a runner gives a copy with one line to one parent, a pod gives six young that differ, and the loupe shows what each took from whom." with:

> In the game, in part: a runner gives a copy with one line to one parent, a pod gives six young that differ, and the loupe shows what each took from whom. The model is the game's own and the child may use it; building one is not taken and is asked for by nothing.

In line 217 replace "From the California standards it takes this and no more: a model that shows why young by runner carry what their one parent carries while young from seed vary, and that both surroundings and inherited factors shape how a plant grows." with:

> From the California standards it takes this and no more, each in part: from `us-ca MS-LS3-2` the use of a model that the game supplies and the child does not build, which shows why young by runner carry what their one parent carries while young from seed vary; and from `us-ca MS-LS1-5` the evidence that both surroundings and inherited factors shape how a plant grows, with the explaining asked for by nothing.

**5. Where the two differ, line 208, Age (ruling 10).** Two places speak for lanes and levels the sheet does not say it read.

Replace "In the lanes the pack holds for this band, California has records on inheritance in grade 6 only (the middle-school expectations that the preferred integrated course model places there), which the lookup returns for ages 11 and 12; grade-4 and grade-5 hold none, and grade 3 is not in the pack." with:

> The California records named are in grade 6 only (the middle-school expectations that the preferred integrated course model places there), which the lookup returns for ages 11 and 12; the game names none in grade-4 or grade-5, and grade 3 is not in the pack.

Replace "So for a child of 9 the passing on of traits is in no record of the child's own level in either jurisdiction:" with:

> So for a child of 9 the passing on of traits is in none of the records named for the child's own level in either jurisdiction:

**6. Where the two differ, line 209, Variation among the young (ruling 10; the sentence is a round 1 paste, older than the ruling).** It speaks for three lanes. Replace "No Dutch record in the fase 2, fase 3 or end-of-primary science lanes states either." with:

> None of the Dutch records named states either.

**7. Where the two differ, line 213, In neither (ruling 10).** The first sentence speaks for both jurisdictions across the band and the last for the pack.

Replace "No record of either jurisdiction in this band asks a child to choose parents in order to get a wanted trait." with:

> None of the records named, of either jurisdiction, asks a child to choose parents in order to get a wanted trait.

Replace "Which factor hides which is in no record and is the game's own." with:

> Which factor hides which is in none of the records named and is the game's own.

finding 1: pasted
finding 2: pasted
finding 3: pasted
finding 4: pasted
finding 5: pasted
finding 6: pasted
finding 7: pasted (the builder's two sentences are in lines 157 and 158, each beginning "Saved when the scene starts:"; the one in line 158 names every field that scene changes; the one in line 157 is finding 2 of this round)

OPEN round 3: 7 findings
