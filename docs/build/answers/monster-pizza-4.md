# Answers for Monster Pizza: the check of the sheet, round 4

Checked: the sheet part of `games/monster-pizza/ART.md` (everything above `## The look`) whose sha256 is `751ecc107f746d21d15270b3c3ae52a3186f598d86e99c55ae1bc803aa81953c`. Checker: F. Outcome: **OPEN round 4: 4 findings**. Line numbers are lines of `ART.md` as it stood with that hash.

Paste each replacement as it stands, bring anything you built on the old text into line, write the round and its outcome into the status block with the new sheet commit and hash, and set `Open: sheet ready for check, round 5`. Where a finding changes the mechanic, the error, the designed order or the saved state, the rules written on the old text are reopened. If you believe a finding is wrong, do not ignore it: paste nothing for it and say why in the status block, in one or two sentences, for the next checker.

A note on commits, for every lane: a commit message ends with the one line `Co-Authored-By: Claude Code <noreply@anthropic.com>` and holds no web address. If a tool adds a second trailer with a link to your session, take it out of the message before you commit; do not rewrite a commit already pushed.

## The checker's report

Check of the design sheet for `monster-pizza` (Monster Pizza, band 4 to 7), round 4, checker F. Sheet read: ``games/monster-pizza/ART.md` as checked`, lines 1 to 244 (everything above `## The look`); its sha256 computed here is `751ecc107f746d21d15270b3c3ae52a3186f598d86e99c55ae1bc803aa81953c`, as named. The round 3 answers file has no "From the lead" section.

Records: all nine pack ids looked up today; code, scope, standing (three `department-published-foundation`, two `state-board-adopted-standard`, four `curriculum-institute-guidance`) and `confirmed` are as the sheet says. No changed line touches a record, a limit or the claim.
Limits: the Limits section of each of the nine records read for the sweep of rulings 8 to 11; the sweep found nothing (all thirty cells name a sound and no row or column shares one; the six records taken in part are claimed in part; every "no record" sentence speaks for the records named here or for the game; no record about people stands where the game offers a character).
Levels: no changed text touches a level, so no outline was run. The diff of the two copies shows eight changed lines above `## The look` (27, 31, 116, 134, 165, 167, 169, 171), each one named in the builder's list, and no other.

Findings

1. "The toy", line 31 (contradicts line 29 after the change). Line 29 says a piece that arrives at a full pizza bounces off and rolls home; the new clause says that when one more has no gap, room is made for it. Nothing in the toy section says where the one ends and the other begins (the twelve is only on line 112). Replace "and the pizza keeps them where they were put, until it is so full that one more has no gap to land in: then the pieces lying there shuffle up to make room for it." with:
   `and the pizza keeps them where they were put, until a pizza that holds fewer than twelve has no gap for one more to land in: then the pieces lying there shuffle up to make room for it, so twelve always fit and only a thirteenth is the extra piece that bounces off.`

2. "The scenes", line 165 (ruling 5; pack: game-design, touch-answers-bigger-than-the-touch.md and liveliness-from-causing-and-comedy.md). Before the change the touch that ended a scene was an ordinary touch and had its answer; now a tap on the customer "serves nothing" and a customer "takes no other", and neither says how the touch is answered, so both can be built as a dead touch or a bare refusal. The third exception also makes a wait that outlasts its scene, is no field of the saved state, and is not said to be short-lived. The status block says the game shows working lips, treats a serving in that time as a poke and does not save the wait; the sheet should say it. Replace everything from "Three exceptions:" to the end of the line with:
   `Three exceptions: a tap on the customer that ends a scene is only a poke, which the customer answers at once in its own manner with a motion and a sound, and serves nothing, and so is every tap on it that comes within a second of the last such poke, so a double tap, or a child drumming on the customer for as long as it likes, never serves the same pizza twice; a touch on a tub that ends the first showing before its piece has hopped hops that piece and puts out no other, so one touch is still one piece; and a customer that has pushed a pizza back takes no other until the tasting it gave would have ended, however soon a touch ended it, so a try is never quicker than its tasting: until then it goes on working its lips over the taste, a pizza served to it by a tap or a slide is answered as a poke and is back on the board as it was, and the wait runs on attended game time, is not saved and is gone on load.`

3. "The scenes", line 167 (found as left; ruling 5). In round 3 the first customer came in through "Stepping up", whose save at the start held it. Now a first visit opens with a customer, a card, tubs and two at the door that no scene saves, and line 181 promises the kitchen is found as it was left; the sheet names no moment at which that first kitchen is saved, so a game put away before the first touch can open on a different customer. Replace "A first visit opens with a customer already at the counter and its card open, so the counter is never empty and the first customer is not seen walking in." with:
   `A first visit opens with a customer already at the counter and its card open, so the counter is never empty and the first customer is not seen walking in; that first kitchen (the customer, its order, the tubs, the empty unbaked pizza and the two at the door) is saved as the game opens, before any touch, so a game put away at once is found with the same customer and the same card.`

4. "The scenes", line 173 (ruling 5). Line 134 as changed puts `to-the-oven` in `shown` once a pizza has gone to the oven, so "Baking" now changes `shown`, and its list of what is saved at the start does not name it. Replace "*Saved at the start:* the pizza as baked." with:
   `*Saved at the start:* the pizza as baked, and \`to-the-oven\` in \`shown\` where it is not there yet.`

Checked and not a fault:
- Line 27 (a finger that slipped): agrees with lines 24, 25 and 62; one touch is still one piece. Line 48 speaks of a carried piece let go, and the slip is defined as a tap.
- Line 116 (what shows the position): the sentence now agrees with lines 15 and 118, which round 3 passed; the size of the rolls is a view of `position` and `waiting` and needs no field. It is an exception to "nothing shows it", said openly; see the list below the verdict.
- Line 134 (`shown`): both marks can be rebuilt as the sentence says; after any finished first cycle both are set, so "the first customer a child ever serves" and "that same first cycle" on lines 169 and 171 need no field of their own.
- Line 169 (the first showing): its mark is written at its own start (ruling 12, near case); put away before it starts, it is still owed and starts at its next cause. The piece that lands unheard on a cold open is said as an exception at the scene, for one piece, and the pitch still follows how many lie on the pizza.
- Line 171 (to the oven, shown): "since the game was opened" is a condition of the visit and is not saved, so nothing plays on load and the showing is still owed until the child lays or moves a piece (ruling 12, near case).
- Line 31, the shuffle: the spots it changes are in `pizza`, and lines 54, 89 and 177 still hold.

change 1 (what `shown` holds): in the sheet
change 2 (a touch that ends a scene): in the sheet
change 3 (stepping up): in the sheet
change 4 (the first showing): in the sheet
change 5 (to the oven, shown): in the sheet
change 6 (what the pizza keeps): in the sheet
change 7 (a finger that slipped): in the sheet
change 8 (what shows the position): in the sheet

OPEN round 4: 4 findings
