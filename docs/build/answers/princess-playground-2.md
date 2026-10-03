# Answers for Princess Playground: the check of the sheet, round 2

Checked: the sheet part of `games/princess-playground/ART.md` (everything above `## The look`) whose sha256 is `c2e26354142adaa20ec65ad45bd1b9634b2968955e550610d4b0c9895b601661`. Checker: D. Outcome: **OPEN round 2: 2 findings**. Line numbers are lines of `ART.md` as it stood with that hash.

Paste each replacement as it stands, bring anything you built on the old text into line, write the round and its outcome into the status block with the new sheet commit and hash, and set `Open: sheet ready for check, round 3`. Where a finding changes the mechanic, the error, the designed order or the saved state, the rules written on the old text are reopened. If you believe a finding is wrong, do not ignore it: paste nothing for it and say why in the status block, in one or two sentences, for the next checker.

## The checker's report

Check of the design sheet, `princess-playground`, round 2, checker D. Sheet: ``games/princess-playground/ART.md` as checked`; the sheet part (above `## The look`) hashes to c2e26354142adaa20ec65ad45bd1b9634b2968955e550610d4b0c9895b601661, as named. Line numbers are lines of that file.

Records: all 13 looked up again by id today; code, scope, standing and check state (`confirmed`, all 13) are as the sheet says; no regime applies. Levels as printed today: us-ca `official` (infant-toddler at 2; preschool-tk Early / both / Later at 3 / 4 / 5; kindergarten and the cross-grade lane at 5), nl `convention` (peuters at 2, 3 and up to the fourth birthday; fase-1 groep 1 at 4, groep 1 or 2 at 5; einde-po from 4); no gap line.
Limits: read again in the record files for every changed "Limits taken" line (`us-ca 1.1`, `us-ca 2.2`, `us-ca 1.8`, `nl Gewicht / 4`) and for what the new text says of `us-ca 3.1`, `us-ca K.MD.2`, `nl Gewicht / 1`, `2`, `3`, `5` and the two Dutch feelings statements: each holds. The diff of the two copies shows only the 16 pastes and nothing else changed; no web address; no suspected paste of official wording; grid checked cell by cell against ruling 8 (every cell has a sound, no row or column shares one).
The changed sentences were worked through with the weights 2, 3, 3, 4 and against the saved-state table: two pasted replacements say something the sheet's own rules do not bear out (findings 1 and 2).

Findings

1. **The four mechanic questions, Guess, line 69, and Where the two differ, Age 2, line 216.** The pasted Guess sentence is wrong in two places when the weights are worked through: at `middle-asks` Bo tapped first lifts Mog at once (4 against 3), so the plank does not always first show too light or level; and at `near-side`, with Bo on Pim (6) and both Mog and Dot on the far end (6), the plank floats level, so "that end stays down until he is tapped off" is not what happens. Line 216 says "any touch resolves it", which line 69 contradicts (a tap on the sand, the plank or the asker does not).
   Line 69, replace the bullet with: `- **Guess.** Mostly yes, and by design, because a two-year-old must never be stuck (pack: game-design, ages-2-to-4.md). At `little-asks` and `high-asks` any one tap on a friend other than the asker resolves the ride. At `middle-asks` and `big-asks` tapping the friends on the far side one after another resolves it by the second tap at the latest: the first tap shows too light or level, except Bo at `middle-asks`, who lifts Mog at once. Only at `near-side`, and when that kind comes round in `any-asks`, does a tap make things worse: Bo lands on the asker, and while he sits there she cannot go up, because Mog and Dot together on the far end only float the plank level; tapping him off again frees her. So a child can climb the order by tapping; what each position adds is one more thing to notice, never a gate. Every try shows which end got heavier, so trying things out is weighing, and each tap is undone by tapping again.`
   Line 216, replace the bullet with: `- **Age 2.** The California foundation for age 2 is about cause and effect and names no weight. The Dutch peuter cards, for about 2 to 4, name heavy and light. The first position follows California: a tap on any of the other friends resolves it and nothing about weight has to be worked out. Heavy and light are there to be found from the first minute, as in the Dutch cards, and nothing asks for them.`

2. **The scenes, lines 142 and 152 (ruling 5; guide "Found as left").** Both "saved when it starts" lists claim every field the scene changes and leave out `marks`, which line 121 now says keeps every bite, and which both scenes change: the ride's plank rocks three times and the next asker's leaving can tip it (line 39: where an end comes down the bite mark stays), and the `little-asks` and `high-asks` showings thump an end into the sand.
   Line 142, replace with: `**The ride**, the ending of every cycle. Cause: the plank carries the asker where it wanted to go. About six seconds, built on `scene.ts`. Its outcome is saved when it starts, in every field the scene changes: `finished` is set, `position` holds the place after the move, `waiting` names the next asker, that friend is taken out of `left`, `right` or `sand`, `moves` is cleared, and `marks` holds the sand as it lies at the scene's end, with every bite the rocking plank and the leaving friend make.`
   Line 152, replace the last sentence with: `A showing's outcome is saved when it starts: its id is added to `shown`, and `left`, `right`, `sand` and `marks` are saved as they stand at its end, so one put away or touched midway is found finished and never plays again.`

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
finding 13: pasted
finding 14: pasted
finding 15: pasted
finding 16: pasted

OPEN round 2: 2 findings
