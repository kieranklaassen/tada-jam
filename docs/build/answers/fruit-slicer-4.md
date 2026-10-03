# Answers for Fruit Slicer: the check of the sheet, round 4

Checked: the sheet part of `games/fruit-slicer/ART.md` (everything above `## The look`) whose sha256 is `d75923063bacbf520dc92ed531f07ace0fc7dd7b655ee038af96fb9e0e6dea7a`. Checker: F. Outcome: **PASSED round 4**. Line numbers are lines of `ART.md` as it stood with that hash.

The sheet has passed. Record the round, the checker and this hash in the status block. The sheet part must keep this hash until the game is merged; if you change it, ask for a new round.

A note on commits, for every lane: a commit message ends with the one line `Co-Authored-By: Claude Code <noreply@anthropic.com>` and holds no web address. If a tool adds a second trailer with a link to your session, take it out of the message before you commit; do not rewrite a commit already pushed.

## The checker's report

Check of the design sheet of `fruit-slicer` (Fruit Slicer, band 9 to 12), round 4, checker F. File: ``games/fruit-slicer/ART.md` as checked`, everything above `## The look`; its sha256 computes to d75923063bacbf520dc92ed531f07ace0fc7dd7b655ee038af96fb9e0e6dea7a, as given. The diff against the round 3 copy shows changes in lines 41, 85, 112, 156 and 160 of the sheet part and nothing else there.

Records: all 13 named records and `us-ca 6.NS.6.c` looked up today; code, standing, regime (`nl 10 B d`: 2026) and check state (every one `confirmed`) are as the sheet says.
Limits: the changed line 85 read against the Limits of all 14 records (none states how close a cut should be); the sweep of the whole sheet for rulings 8 to 11 read every grid cell, every "Limits taken" and "Left open by Limits" line, every in-part mark in the list and the claim, and every "no record" sentence, and found no place.
Levels: no changed line touches a level; the outlines for ages 9 to 12 in both jurisdictions still print as lines 172 to 174 and 193 to 195 say (levels, `derived` and `convention`, sub-bands, the three gap lines, both lane labels).

Findings

None.

Checked and not a finding:
- The pasted text of line 112 worked through against its neighbours. A tin that is open and empty is reachable (lines 40 and 80), the swap now saves `tinOpen` with `window` and `queue`, and the customer who steps back takes the value "none" that line 130 already holds for the position it carries, which line 120 already says moves nothing; so the cut made with the truth shown can no longer move the position (line 71), and no tin stands open before a cut for the next customer (line 158). "Anything in that tin" (line 112) and "holds a misfit" (lines 41, 118, 156) name the same state, since a tin that holds a fit has shut and is the serve.
- Lines 41, 156 and 162 now agree on what a touch on one who waits does in each of the three states of the window (empty or served: that one steps up; unserved with an empty tin: the two change places; unserved with a misfit: the serve, and the one who waits steps up at the next touch).
- Line 160 names every field each of the two gliders changes (`pieces`, `window`, `finished`, `tinOpen` for the pelican at the window; `pieces`, `queue`, `seed` for one that waits), agrees with the last sentence of line 112 and with line 137, and its two "on load" clauses match what is stored.
- Ruling 8: all thirty cells carry a sound word, the changed Customer and Poke cell included ("its own flinch and noise"); no row or column shares one sound (fruit and piece share the thwack and the tick and differ in pitch).
- Ruling 9: each "Limits taken" line holds only what that record's Limits says, what Limits is silent on is marked as the game's own choice or "Not in Limits", and the nine records taken in part are claimed in part with the part named; `us-ca 4.NF.3.a`, `nl rw/bew/6/01/fase2` and the notation statement of 1F are taken whole with no act left out. The counts in the claim hold (four, six, one, two).
- Ruling 10: lines 85, 187, 218, 222 to 225, 227 and the claim speak for the records the game names. The second sentence of line 187 gives a nearest record not used and names it with its check state; the grade 6 mathematics lane, listed today, holds no fraction statement nearer to the game than the one named, so the sentence says no more than the lane carries.
- Ruling 11: no named record is about people or about communicating beyond the explaining and reason-giving that the claim already says are not asked.

finding 1: pasted
finding 2: pasted
finding 3: pasted
finding 4: pasted

PASSED round 4 d75923063bacbf520dc92ed531f07ace0fc7dd7b655ee038af96fb9e0e6dea7a
