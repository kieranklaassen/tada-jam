# Answers for Hats for All: the check of the sheet, round 6

Checked: the sheet part of `games/hats-for-all/ART.md` (everything above `## The look`) whose sha256 is `6b78bde2698f2d6f441be6f50cf9e5c9cd21c531975b650ad3b945e7c62db520`. Checker: H. Outcome: **OPEN round 6: 2 findings**. Line numbers are lines of `ART.md` as it stood with that hash.

Paste each replacement as it stands, bring anything you built on the old text into line, write the round and its outcome into the status block with the new sheet commit and hash, and set `Open: sheet ready for check, round 7`. Where a finding changes the mechanic, the error, the designed order or the saved state, the rules written on the old text are reopened. If you believe a finding is wrong, do not ignore it: paste nothing for it and say why in the status block, in one or two sentences, for the next checker.

A note on commits, for every lane: a commit message ends with the one line `Co-Authored-By: Claude Code <noreply@anthropic.com>` and holds no web address. If a tool adds a second trailer with a link to your session, take it out of the message before you commit; do not rewrite a commit already pushed.

## The checker's report

Check of the design sheet for `hats-for-all` (Hats for All, band 2 to 4), round 6, checker H. Sheet read: ``games/hats-for-all/ART.md` as checked`, lines 1 to 199 (everything above `## The look`). That part hashes to `6b78bde2698f2d6f441be6f50cf9e5c9cd21c531975b650ad3b945e7c62db520`, as named. Line numbers below are lines of that file.

Records: the diff of the round 5 and round 6 copies shows thirteen changed lines (23, 27, 39, 40, 71, 81, 115, 130, 135, 140, 145, 164, 166), holding exactly the sixteen changes the builder lists, each as written, and nothing else. All seven named records print today with the code, standing and `confirmed` state the sheet gives. No changed sentence touches a record's standing, a level or the claim.
Limits: lines 164 and 166 now use the words of the Limits sections of `us-ca` 1.6 and 2.1, and say no more than those sections. The sweep for rulings 8 to 11 found nothing: all 30 grid cells carry a sound (the five rewritten creature cells keep "boing", the hum, the babble and echo, "tok" and "flap-flap") and no row or column shares one; every "Limits taken" line is inside its record's Limits; the four records taken in part are claimed in part; every "no record" sentence speaks for what the sheet names or read.
Levels: ages 2, 3 and 4 print in both jurisdictions as lines 159 and 174 say. The new leaving rule (line 145) was worked through every position: only at `one-short` can the one who is to leave stand bare, a hatted creature always exists to leave in its place, and the row for `one-short` and its Guess answer (line 65) now hold every time. The bare one's show (line 135) can arise only at `one-short` before the leave, and is about the hats.

Findings:

1. **The designed order, and what is stored, line 81, with The scenes, line 149 (ruling 5).** The new sentence says a parade that was held waits through a reopening. That holds for a cycle's first parade, which can be rebuilt from the fields. It does not hold for a finished crew's second parade (line 149, "parades again, every time"): on load, `finished` true with the pairs right is the same state whether that parade is owed or not, and no field holds it. Two pastes:

   In line 81, replace the sentence that opens "When the game is opened again" with:

   `When the game is opened again, or looked at again after it was put aside, nothing comes by itself: a change or a parade that was held waits until the child has touched a hat or a creature, and comes when the crew has been left alone after that. The one thing that does not wait through a closing is a finished crew's second parade ("How a cycle ends" under The scenes).`

   In line 149, replace the sentence that opens "The finished crew and its hats still answer every touch" with:

   `The finished crew and its hats still answer every touch as the grid says; if the child unsettles the pairs and sets them right again the crew parades again, every time, but the cycle was judged at its first parade and the position does not move twice. A second parade that is owed is short-lived: no field holds it, so it waits as any held parade does while the game is only put aside, and is gone when the game is closed, which opens again with the finished crew at rest as the child left it and no parade owed.`

   If the builder would sooner store it, that is a new field of the saved state and a matter for the next round; the replacement above adds none.

2. **The object-by-action grid, line 42.** The cell it sums up was rewritten in line 39: the creature now bends down, looks at the tile and babbles at the holes from where it stands. Line 42 still has it shouting into a hole, which is the touching the change took out. Replace "the creature shouting into a hole" with:

   `the creature babbling at the holes of the tile`

finding 1: pasted

OPEN round 6: 2 findings
