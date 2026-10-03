# Answers for Fix-It Stall: the check of the sheet, round 5

Checked: the sheet part of `games/fix-it-stall/ART.md` (everything above `## The look`) whose sha256 is `2c19e0f9099aefeebc182a72bae8a2f55154f9c134ea34376ec2ab16a93c6cd3`. Checker: G. Outcome: **PASSED round 5**. Line numbers are lines of `ART.md` as it stood with that hash.

The sheet has passed. Record the round, the checker and this hash in the status block. The sheet part must keep this hash until the game is merged; if you change it, ask for a new round.

A note on commits, for every lane: a commit message ends with the one line `Co-Authored-By: Claude Code <noreply@anthropic.com>` and holds no web address. If a tool adds a second trailer with a link to your session, take it out of the message before you commit; do not rewrite a commit already pushed.

## The checker's report

Fix-it Stall, design sheet, round 5 (checker G, short round)

Verified, in order:
(a) Diff of fix-it-stall-r4.md against fix-it-stall-r5.md: one changed line in the whole file, line 130 ("The representation", bullet "Symbol"), and within it only the last sentence. `## The look` is at line 328 in both copies; the sheet part of r5 (lines 1 to 327) hashes to 2c19e0f9099aefeebc182a72bae8a2f55154f9c134ea34376ec2ab16a93c6cd3, the hash given. The new sentence stands as written: "It is drawn through the game's own `symbols.ts`, the copy of the template's module, and nowhere else."
(b) "It" is plain: every "it" of the bullet stands for the numeral introduced in its first sentence, and only the numeral can be drawn. Read against every sentence of the sheet part on numerals, numbers, symbols, `symbols.ts` and the ticket (lines 13, 15, 120, 129, 131, 190, 213, 275, 297, 303, 306, 322): none is contradicted. Line 15 ("drawn only in `symbols.ts`", one such place, the order ticket) says the same; lines 120, 275 and 306 speak of current, energy and measured numbers, not of the count on the ticket; lines 297, 303 and 322 speak of circuit symbols and units. No other sentence of the sheet part speaks of "this run" or of a module that comes from the lead, so nothing else is stale in the same way. The sentence also agrees with the guide (line 159 of building-a-jam-game.md: `symbols.ts` is in the template and is copied into a game whose band starts at 6 or above; the template folder holds it).
(c) Nothing else reopened; no record lookup run.

Findings: none.

finding 1: pasted

PASSED round 5 2c19e0f9099aefeebc182a72bae8a2f55154f9c134ea34376ec2ab16a93c6cd3
