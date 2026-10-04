# Answers for Claw Machine: the check of the sheet, round 5

Checked: the sheet part of `games/claw-machine/ART.md` (everything above `## The look`) whose sha256 is `0d136f0904c70c54d6fb19b353736449fbc3cb6e12d7ed0e5318adeebd28441d`. Checker: G. Outcome: **OPEN round 5: 2 findings**. Line numbers are lines of `ART.md` as it stood with that hash.

Paste each replacement as it stands, bring anything you built on the old text into line, write the round and its outcome into the status block with the new sheet commit and hash, and set `Open: sheet ready for check, round 6`. Where a finding changes the mechanic, the error, the designed order or the saved state, the rules written on the old text are reopened. If you believe a finding is wrong, do not ignore it: paste nothing for it and say why in the status block, in one or two sentences, for the next checker.

A note on commits, for every lane: a commit message ends with the one line `Co-Authored-By: Claude Code <noreply@anthropic.com>` and holds no web address. If a tool adds a second trailer with a link to your session, take it out of the message before you commit; do not rewrite a commit already pushed.

## The checker's report

Check of the design sheet for `claw-machine` (Claw Machine, band 4 to 6), round 5, checker G. File read: ``games/claw-machine/ART.md` as checked`, lines 1 to 185 (everything above `## The look`); its sha256 computes to `0d136f0904c70c54d6fb19b353736449fbc3cb6e12d7ed0e5318adeebd28441d`, as given. Line numbers are lines of that file.

Records: all six print today as the sheet says (`us-ca 2.5` department-published-foundation; `us-ca K.MD.3` and `us-ca 1.MD.4` state-board-adopted-standard; the three nl records curriculum-institute-guidance; all `confirmed`). The diff of the two copies shows six changed lines in the sheet part (28, 111, 134, 140, 143, 145); they hold exactly the seven changes the status block lists, each in the sheet word for word, and no line changed that the list does not name.
Limits: sweep for rulings 8 to 11 over the whole sheet part. All 30 grid cells and the answers of line 43 carry a sound, and no row or column shares one sound (the bell row is one instrument played five ways). Every "Limits taken", "Left open by Limits" and "Not taken" line holds against that record's Limits; K.MD.3 and 1.MD.4 are claimed in part with the part named. Line 173 speaks for the three nl records named, and line 177's "alone" is scoped by its own second clause to the three us-ca records named. No record is about people or communicating.
Levels: the outlines for ages 4, 5 and 6 print as the sheet says in both jurisdictions (us-ca official, nl convention, lanes labelled, no gap); no changed line touches a level or a record. The changed scene lengths (6 to 8 seconds for a first visit's delivery) are inside the pack's 4 to 10 seconds. Changes 1, 2, 3 and 7 hold against their neighbours. Changes 4 to 6 (the crew at the tray on a first visit) leave two sentences elsewhere that no longer fit, below.

Findings

1. "The scenes", line 143 (changes 5 and 6), against the Cause sentence of line 140. On a first visit the delivery now says the crew is there already and nothing comes over the step, while the first showing's only cause is a crew that comes in, following the delivery or tip-out that brought it in. So the sheet leaves the first visit's showing without a cause (the showing a child must see before the first sort, by guided-discovery.md), and the snacks on the tongues (line 145) with no stated way into the bellies. Replace the sentence that begins "On a first visit no old crew stands at the tray" and ends "and it slides away." with:

   `On a first visit no old crew stands at the tray and the new one is there already, so nothing comes over the step: the claw lifts the crate a little where it stands, its bed tips, and the toys are kicked up off it and thrown over the heads of the crew onto their studs, the front row of the tray first and then the back row, each toy of the back row by a bounce on the place in front of its own; the crew watches them fly; the claw sets the crate back and it slides away. This crew counts as coming in with its load: the first showing follows the delivery of a first visit without a pause, as it follows any delivery, and the snacks it holds up and gulps are the ones that stood on its tongues.`

2. "The scenes", line 145, last sentence (change 4), against line 130, ruling 5. The sheet's one rule for what a snack looks like takes its other two properties from the first toy listed in `cycle.toys`, and on a first visit the changed sentence puts snacks in view while `cycle` is empty. So what the first-visit snacks are rebuilt from is not said, and nothing holds them to the same look once the delivery starts. Replace the sentence that begins "That crew is the first crew of the load" with:

   `That crew is the first crew of the load the crate is laid out for, and until the crate is taken each of its snacks takes its other two properties from the first toy of that load, the toy that is listed first in `cycle.toys` once the delivery starts; so the crew and its snacks are rebuilt from `crates` and are not fields of the saved state.`

finding 1: pasted (the watcher's paragraph, line 134, as the checker gave it)
finding 2: pasted (line 140, in the lead's text, which stands in place of the checker's; the checker's own sentence is not in the sheet)
from the lead, the ending's fields: pasted (line 111, after "A scene's outcome is saved when the scene starts.")

OPEN round 5: 2 findings

## From the lead

One more, from the checker's notes, so that the sentence on the ending's fields cannot be read of a wrong try that is spat back. In "The designed order, and what is stored", in the sentence the lead gave in round 4, replace the words

`when the chewing of the cycle's last toy starts`

with

`when the chew that swallows the cycle's last toy starts`

and change nothing else in that sentence.

