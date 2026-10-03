# Answers for Fruit Slicer: the check of the sheet, round 3

Checked: the sheet part of `games/fruit-slicer/ART.md` (everything above `## The look`) whose sha256 is `9e8166f69b49578f037e3cf3f528bef8cb5cdba6a6ad334d6aeb6bdfe307edbd`. Checker: E. Outcome: **OPEN round 3: 4 findings**. Line numbers are lines of `ART.md` as it stood with that hash.

Paste each replacement as it stands, bring anything you built on the old text into line, write the round and its outcome into the status block with the new sheet commit and hash, and set `Open: sheet ready for check, round 4`. Where a finding changes the mechanic, the error, the designed order or the saved state, the rules written on the old text are reopened. If you believe a finding is wrong, do not ignore it: paste nothing for it and say why in the status block, in one or two sentences, for the next checker.

## The checker's report

Check of the design sheet of `fruit-slicer` (Fruit Slicer, band 9 to 12), round 3, checker E. File: `games/fruit-slicer/ART.md` as checked, everything above `## The look`; its sha256 computes to 9e8166f69b49578f037e3cf3f528bef8cb5cdba6a6ad334d6aeb6bdfe307edbd, as given. The diff against the round 2 copy shows changes in lines 112, 160, 180, 182, 226 and 232 of the sheet part and nothing else there.

Records: all 13 named records and `us-ca 6.NS.6.c` looked up today; code, standing, regime (`nl 10 B d`: 2026) and check state (every one `confirmed`) are as the sheet says.
Limits: the changed lines 180, 182, 226 and 232 read against the Summary and Limits of the records they speak for, and they match; the sweep of the whole sheet for rulings 8 to 11 found one place (finding 4).
Levels: the outlines for ages 9 to 12 in both jurisdictions print as lines 172 to 174 and 193 to 195 say (levels, `derived` and `convention`, sub-bands, the three gap lines, both lane labels).

Findings

1. **The designed order, and what is stored, line 112, the first new sentence (the touch on one who waits).** Ruling 5. The sentence saves `window` and `queue` when the two change places, and leaves out `tinOpen`, which belongs to the tin at the window (line 132). An open and empty tin is reachable by the sheet's own text: a piece of the wrong fruit springs the tin open (line 40) and the customer picks it out (line 80). Left set, the next customer's tin stands open before any cut, against line 158 ("never before"); cleared with nothing else said, a customer whose true length was shown can be called back and cut for with the tin shut, against line 71 (only a first cut made before the tin opened moves the child on). Replace the sentence that runs from "While an unserved customer stands at the window" to "steps up at the next touch." with:
"While an unserved customer stands at the window, a touch on one who waits has one of two answers. With the tin at the window empty the two change places and nothing is judged: a tin that stood open shuts, and `window`, `queue` and `tinOpen` are saved as they then stand; a customer who steps back after its tin had stood open carries the new thing of no position from then on, since the truth of its order has been shown, so its cycle moves nothing. With anything in that tin the customer at the window takes its order as it is, which is the serve, and the one who waits steps up at the next touch."
(The value "none" for the position a customer carries is already in the form of `window` and `queue`, line 130, and line 120 already says such a customer moves nothing.)

2. **The grid, line 41 (Customer, Poke), and The scenes, line 156 (the Cause of the serve).** The new sentence in line 112 makes a touch on one who waits a cause of the serve and says that this one then steps up only at the next touch; the grid cell still says a poked waiting one "then steps up", and the Cause of the serve still names only a touch on the customer at the window. Replace line 41 with:
"| **Customer** | Only a tuft, a feather tip or a whisker end comes off with a snip, and it pops back; the customer looks about, puzzled. | Each has its own flinch and noise. A waiting one then steps up, or changes places with an unserved one at the window, unless that one's tin holds a misfit: then that one takes its order as it is, as it does when it is poked itself ("The designed order, and what is stored"; "The scenes"). | It eats the piece as it is with a gulp of its own, bypassing the tin, and its body shows exactly what went in. | Splat on the face; it licks the juice off in its own way. | It is rolled flat as a page, then springs back into shape with a honk. |"
and in line 156 replace "Cause: the tin shuts on a fit, or the child sends the customer off by touching it while its tin holds a misfit, or feeds it by hand." with:
"Cause: the tin shuts on a fit, or the child sends the customer off while its tin holds a misfit, by touching it or by touching one who waits, or feeds it by hand."

3. **The scenes, line 160 (the glider), the "Saved as the first beat starts" sentence and "On load".** Ruling 5. Line 112 now says a whole uncut fruit given to a waiting pelican "is the glider all the same", with `queue` and `seed` saved; line 160 still says of every glider that `window` becomes none, that `finished` and `tinOpen` are cleared and that on load the window is empty, which for a waiting pelican would wipe the customer at the window, and it names neither `queue` nor `seed`. Replace the two sentences ("Saved as the first beat starts: the fruit leaves `pieces`, ... On load the window is empty and the two wait.") with:
"Saved as the first beat starts: the fruit leaves `pieces`. For the pelican at the window, so does any piece it had already eaten; any piece in its tin is set on the shelf; `window` becomes none, and `finished` and `tinOpen` are cleared; a customer fed by hand is judged mixed, so `position` does not move; on load the window is empty and the two wait. For a pelican that waits, nothing at the window changes and `position` does not move: `window`, `finished`, `tinOpen` and the pieces in the tin stay as they are, and `queue` and `seed` take the customer who joins in its place ("The designed order, and what is stored"); on load the window is as it was left and two wait."

4. **The error as a consequence, line 85 (second sentence).** Ruling 10. "No record says" speaks for the whole pack; the sheet read thirteen records and one more by code. Replace "No record says how close a cut by eye should be." with:
"None of the records named below says how close a cut by eye should be."

Checked and not a finding: the six grid rows under ruling 8 (every cell has a sound word; no row or column shares one; fruit and piece share the thwack and the tick and differ in pitch); every "Limits taken" line and every in-part mark in the list and the claim under ruling 9 (each matches its record's Limits; `us-ca 4.NF.3.a` and `nl rw/bew/6/01/fase2` are taken whole and no act of either is left out); ruling 11 (no named record is about people or communicating beyond the explaining and reason-giving the claim already says are not asked); the other "no record" sentences (lines 187, 218, 222 to 225 and the claim are scoped to the records the game names; "Neither set" in line 227 reads as the two sets of named records); the counts in the pasted claim (four California records, six guidance goals, one core-goal item, two reference-level statements); the second new sentence of line 112 (a piece given to one who waits, or flung at any customer, is said to be short-lived and leaves `pieces`, which agrees with the grid's Give and Fling cells and with lines 133 and 137).

finding 1: pasted
finding 2: pasted
finding 3: pasted
finding 4: pasted

OPEN round 3: 4 findings
