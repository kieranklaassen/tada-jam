# Answers for Claw Machine: the check of the sheet, round 4

Checked: the sheet part of `games/claw-machine/ART.md` (everything above `## The look`) whose sha256 is `25f1ec29012c2627aef6701860b91cae1380ba9dfbdd69974b66d7f11e8515a6`. Checker: F. Outcome: **OPEN round 4: 2 findings**. Line numbers are lines of `ART.md` as it stood with that hash.

Paste each replacement as it stands, bring anything you built on the old text into line, write the round and its outcome into the status block with the new sheet commit and hash, and set `Open: sheet ready for check, round 5`. Where a finding changes the mechanic, the error, the designed order or the saved state, the rules written on the old text are reopened. If you believe a finding is wrong, do not ignore it: paste nothing for it and say why in the status block, in one or two sentences, for the next checker.

A note on commits, for every lane: a commit message ends with the one line `Co-Authored-By: Claude Code <noreply@anthropic.com>` and holds no web address. If a tool adds a second trailer with a link to your session, take it out of the message before you commit; do not rewrite a commit already pushed.

## The checker's report

Check of the design sheet for `claw-machine` (Claw Machine, band 4 to 6), round 4, checker F. File read: ``games/claw-machine/ART.md` as checked`, lines 1 to 185 (everything above `## The look`); its sha256 computes to `25f1ec29012c2627aef6701860b91cae1380ba9dfbdd69974b66d7f11e8515a6`, as given. Line numbers are lines of that file.

Records: all six print today as the sheet says (`us-ca 2.5` department-published-foundation; `us-ca K.MD.3` and `us-ca 1.MD.4` state-board-adopted-standard; the three nl records curriculum-institute-guidance; all `confirmed`). The round 3 copy with the 38 listed changes applied is identical to the round 4 sheet part, so no line changed that the list does not name; the round 3 answers file has no "From the lead" section.
Limits: every "Limits taken", "Left open by Limits" and "Not taken" line was read against that record's Limits for rulings 9 to 11 and holds; K.MD.3 and 1.MD.4 are claimed in part with the part named, the "no nl record" sentence (line 173) speaks for the three records named, and no record is about people or communicating. Ruling 8: all 30 cells and the answers of line 43 (empty ledge, crates, hemmed-in toy) carry a sound; the end-of-rail row now sounds the bell in all five cells, but each plays something else (ding; ring, zip and click; ring and thud; double ding; hum), which is a shared instrument and not a fault.
Levels: the outlines for ages 4, 5 and 6 print as the sheet says in both jurisdictions (us-ca official, nl convention, lanes labelled, no gap), though no changed line touches a level or a record. Arithmetic of the changed lines holds: 9 toys as 3 colours by 3 kinds, 5 and 4 by size with each kind in both sizes, fullest belly six with its snack; a showing of two seconds a gobbler is 4 to 6 seconds for crews of two or three; each scene's length is inside the pack's 4 to 10 seconds.

Findings

1. "The characters and their fixed tastes", line 134 (change 13). The watcher is a new character with reactions but no want, where this heading and characters-with-opinions.md ask for each character's one want, always visible. The paragraph that should stand:

   `**The watcher.** One more creature is in the cabinet and has no part in the sorting: a small watcher that sits on the floor beside the tray, out of the claw's reach. It takes no toy and has no taste. Its one visible want is to see what the claw does next, and it shows in its eyes, which follow the claw; it asks nothing of the child. It jumps at a bang, laughs when a toy comes flying back or a stack comes down, and hops with a peep when a finger lands on it; a finger on it moves nothing else. Its feelings are about what happens in the cabinet and never about the child, and nothing about it is saved.`

2. "The scenes", line 140 (change 22), ruling 12. The changed sentence makes the first showing the second of two scenes on one touch (the claw on a crate, or on the gate), and nothing says its mark is written in the first scene's save; by line 111 alone the mark is written only when the showing starts, so a game put away in the delivery or the tip-out is found in a state the sheet does not define. The Cause sentence that should stand:

   `Cause: a crew comes in that goes by an attribute whose showing has not yet played; it follows the delivery or the tip-out that brought the crew in without a pause, and a touch ends both. Its mark in `shown` is written in the save made when that delivery or tip-out starts, so a game put away in either scene is found with the crew lined up and its snacks in the bellies, and no showing plays on load.`

change 1: in the sheet
change 2: in the sheet
change 3: in the sheet
change 4: in the sheet
change 5: in the sheet
change 6: in the sheet
change 7: in the sheet
change 8: in the sheet
change 9: in the sheet
change 10: in the sheet
change 11: in the sheet
change 12: in the sheet
change 13: in the sheet
change 14: in the sheet
change 15: in the sheet
change 16: in the sheet
change 17: in the sheet
change 18: in the sheet
change 19: in the sheet
change 20: in the sheet
change 21: in the sheet
change 22: in the sheet
change 23: in the sheet
change 24: in the sheet
change 25: in the sheet
change 26: in the sheet
change 27: in the sheet
change 28: in the sheet
change 29: in the sheet
change 30: in the sheet
change 31: in the sheet
change 32: in the sheet
change 33: in the sheet
change 34: in the sheet
change 35: in the sheet
change 36: in the sheet
change 37: in the sheet
change 38: in the sheet

OPEN round 4: 2 findings

## From the lead

Finding 2 is taken up, with other text than the checker gave. Three checkers of other sheets have pointed out that ruling 12 read to the letter would save a first showing's mark with the scene before it, and a child who put the game away between the two would then never see the showing. The lead has ruled the near case: a showing that is seen once and follows another scene on the same touch is marked when it starts, and is owed until then. So in place of the checker's replacement for the Cause sentence of the first showing, paste this, and make the game do it:

`Cause: a crew comes in that goes by an attribute whose showing has not yet played; it follows the delivery or the tip-out that brought the crew in without a pause, and a touch ends both. Its mark in `shown` is written when the showing itself starts. A game put away in the delivery or the tip-out before that is found with the crew lined up and its snacks in the bellies; no showing plays on load, and the showing that is still owed starts at the child's first touch after the game is opened again.`

One more, from the checker's notes, which the lead makes a finding of this round (ruling 12's own case): after the sentence "A scene's outcome is saved when the scene starts." in "The designed order, and what is stored", add:

`The ending's fields (`finished`, the moved `position` and `crates`) are written in the save made when the chewing of the cycle's last toy starts, so a game put away in that chew is found ended and plays no ending on load.`

