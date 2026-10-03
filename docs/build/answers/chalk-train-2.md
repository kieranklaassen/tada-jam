# Answers for Chalk Train: the check of the sheet, round 2

Checked: the sheet part of `games/chalk-train/ART.md` (everything above `## The look`) whose sha256 is `4bb4d37935e4f57d6a701618fbb66c5a076bb39e7ee26460259976745d533025`. Checker: D. Outcome: **OPEN round 2: 4 findings**. Line numbers are lines of `ART.md` as it stood with that hash.

Paste each replacement as it stands, bring anything you built on the old text into line, write the round and its outcome into the status block with the new sheet commit and hash, and set `Open: sheet ready for check, round 3`. Where a finding changes the mechanic, the error, the designed order or the saved state, the rules written on the old text are reopened. If you believe a finding is wrong, do not ignore it: paste nothing for it and say why in the status block, in one or two sentences, for the next checker.

## The checker's report

Check of the Chalk Train design sheet (`chalk-train`, band 2 to 4), round 2, checker D. File: ``games/chalk-train/ART.md` as checked`, lines 1 to 235 (everything above `## The look`); its sha256 is `4bb4d37935e4f57d6a701618fbb66c5a076bb39e7ee26460259976745d533025`, as named.

Records: all four exist, and code, standing and check state are as the lookup prints today (us-ca 4.4 Writing: department-published-foundation, confirmed; nl / 7 and / 3 of the peuter card and Voorbereidend schrijven / 4 of the fase 1 card: curriculum-institute-guidance, confirmed; none is a core goal). Code 4.4 matches three us-ca records, as the pasted parenthesis says, and "/ 3" matches two nl records, which the claim now tells apart by scope.
Limits: the changed Limits text (nl / 7, lines 214 and 215) and the parts the new claim takes agree with each record's Limits; nothing comes from the examples.
Levels: the changed Age point and claim match the lookup for ages 2, 3 and 4 (us-ca official: infant-toddler; preschool-tk Early; Early and Later. nl convention: peuters; peuters up to the fourth birthday and fase-1 groep 1, with einde-po labelled; no gap). No infant-toddler record in any of the four lanes carries making marks.

All twelve round 1 replacements are in the sheet word for word (21 replacement strings, each found exactly once), and a word-level diff shows no other change above `## The look`. The findings below are all on pasted text read against its neighbours.

Findings

1. **"The designed order, and what is stored", line 118, against line 54 (grid, A rider × Line) and line 19.** The pasted "while a wagon is free" leaves the other case unanswered: at `two-at-once` the two riders of the layout and the one waiting ahead are three riders for two wagons, and the pasted cell at line 54 has every waiting rider climb aboard. Replace line 118 with:
`**The harder option the child can see and pick.** From the first cycle on, the next rider is drawn in at its stop when the child's first mark begins the cycle, so while the child works the next rider is already waiting on the tar. The train has two wagons at every position, so while a wagon is free the child may fetch the waiting rider before taking the current rider home and carry both at once. It is farther away, so it looks like more, and it is never asked for. With both wagons taken the train still comes to a waiting rider and stops with its coupling clunk; the rider peers into the full wagons, stays at its stop, and climbs aboard the next time the train comes with a wagon free.`

2. **"The designed order, and what is stored", line 114, against lines 105 and 118.** "Both wagons are needed" is a demand, but line 105 says a layout offers and never demands, the same line says "in any order the child likes" (one rider home and then the other uses one wagon), and line 118 says carrying two is never asked for. Replace line 114 with:
`6. \`two-at-once\`: two riders wait at two stops, each with its own home, and there is a wagon for each. A combination of everything before, in any order the child likes.`

3. **"The scenes", line 181 (pasted sentence "Of a layout with two riders only the first waits ahead…"), against lines 128, 137 and 141 (ruling 5; "Found as left").** The second rider is now drawn in a cycle after its layout was chosen, and line 128 says `position` may have moved in between. After a put-away during an ending the saved state cannot tell whether the waiting rider's layout has a second rider. Example: `position` reads `two-at-once` after a cycle that went well, and the waiting rider was laid out either from `far-rider` (the position then moved up) or from `two-at-once` (already at the top). Add as a new line after line 141:
`- \`ahead\`: the ladder id of the layout the rider waiting ahead was laid out from; an unknown id is read as \`position\`. \`position\` may have moved since that rider was drawn in, so this field is what says, after a load as well, whether a second rider of that layout is drawn in when its cycle begins.`

4. **"### The claim", line 234 (ruling 11).** The claim takes "experiencing that a mark can tell someone something" from nl / 3, a statement about communicating whose Limits says it names no partner, and in the game the one told is a character; line 219 says so under the nl heading but the claim does not. This is my reading that ruling 11 reaches a record on communicating; the lead may rule otherwise. Insert after the sentence "The Dutch statements are guidance and not law." (the rest of the line stays):
`In the game the one a mark tells is a character, the engine or a rider, and not a person; the statement does not say with whom.`

finding 1: pasted
finding 2: pasted
finding 3: pasted
finding 4: pasted
finding 5: pasted
finding 6: pasted
finding 7: pasted
finding 8: pasted
finding 9: pasted
finding 10: pasted
finding 11: pasted
finding 12: pasted

OPEN round 2: 4 findings

## From the lead

Finding 4 stands: ruling 11 also covers a record on communicating that names no partner, where the one told in the game is a character.

Two more replacements, under ruling 9 (what a record's Limits is silent on is written "Not in Limits", never "Left open by Limits"). They are in text that round 1 passed before that ruling existed. Paste them with the four above; the next round confirms them with the rest.

5. **The records, us-ca, the line under `us-ca 4.4` that begins "Left open by Limits:".** Replace the line with:
`  Not in Limits: a shape of stroke, a tool and a surface. The five kinds of mark, the finger and the glass are the game's own choices.`

6. **The records, nl, the line under the fase 1 statement on preparatory writing that begins "Left open by Limits:".** Replace the line with:
`  Not in Limits: a shape of stroke. The five kinds of mark are the game's own choice.`
