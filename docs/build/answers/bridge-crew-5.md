# Answers for Bridge Crew: the check of the sheet, round 5

Checked: the sheet part of `games/bridge-crew/ART.md` (everything above `## The look`) whose sha256 is `2ec1e59ab4516efa6b02745fc8117d801e0efede06b7be2c900c97a365f2ca42`. Checker: G. Outcome: **PASSED round 5**. Line numbers are lines of `ART.md` as it stood with that hash.

The sheet has passed. Record the round, the checker and this hash in the status block. The sheet part must keep this hash until the game is merged; if you change it, ask for a new round.

A note on commits, for every lane: a commit message ends with the one line `Co-Authored-By: Claude Code <noreply@anthropic.com>` and holds no web address. If a tool adds a second trailer with a link to your session, take it out of the message before you commit; do not rewrite a commit already pushed.

## The checker's report

Check of the Bridge Crew sheet (`bridge-crew`, band 9 to 12), round 5, checker G. File: ``games/bridge-crew/ART.md` as checked`, everything above `## The look` (line 227). Its sha256 computes to `2ec1e59ab4516efa6b02745fc8117d801e0efede06b7be2c900c97a365f2ca42`, as given. The diff against the round 4 copy shows three changed lines in the sheet part and no other: 17, 116 and 132. The round 4 answers file has no "From the lead" section.

Records: all ten named records print today with the code, standing, regime (`nl 45`: legal-core-goal, 2006) and check state (all `confirmed`) the sheet gives. None is about people or about communicating, so ruling 11 has no case. Every "no record" sentence (lines 184, 218, 220, 221) is scoped to the records named or to the four science lanes the sheet says the lookup returned (ruling 10).
Limits: in the sweep for ruling 9, each of the ten "Limits taken" lines holds only what that record's Limits says, each "Left open" is something that Limits itself says is not named, the one "Not in Limits" (line 187) is marked as the game's own choice, and no record is taken in part and claimed whole. Ruling 8: all 30 grid cells carry a sound word and no row or column has one sound across its cells.
Levels: no changed line touches a level or a record, so no outline was run again. The changed lines were read against their neighbours. Line 116 agrees with the `tries`, `waiting` and `across` rows (132 to 134). Line 132 agrees with lines 117, 118, 133 and 166, and the two rows keep each of the two vehicles on exactly one bank through every order of crossing and sending home. Line 174 ("beside the other vehicle") describes the state the crossing ends in; where the other vehicle has since crossed, the `across` row already settled its bank in round 4, which passed line 174 against it, so the paste does not newly contradict it and it is not reopened.

Findings

No finding of my own.

1. **The band and its age rule: line 17 (the place the lead asked to be ruled on).** The sentence was changed as asked and stands word for word: "Both numerals are drawn through the game's own `symbols.ts`, the copy of the template's module, and nowhere else." Read against every sentence of the sheet part that speaks of numerals or of `symbols.ts` (lines 14, 15, 16, 17, 67, 119, 120), it agrees with each: line 14 already says the numerals are drawn only in `symbols.ts`, lines 15, 16 and 120 name the same two places, and line 67 stops the symbol stage at those two numerals. "The copy of the template's module" agrees with the guide, where `symbols.ts` is in the template and is copied into a game whose band starts at 6 or above. No sentence of the sheet part still speaks of a stage at which the trolley, the vehicles or the numerals are not yet in the game, so nothing is stale. Closed: the sheet stays as it is, because the sentence is the one asked for and nothing else in the sheet part contradicts it.

finding 1: pasted
finding 2: pasted

PASSED round 5 2ec1e59ab4516efa6b02745fc8117d801e0efede06b7be2c900c97a365f2ca42
