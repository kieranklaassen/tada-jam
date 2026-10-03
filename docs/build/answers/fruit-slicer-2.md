# Answers for Fruit Slicer: the check of the sheet, round 2

Checked: the sheet part of `games/fruit-slicer/ART.md` (everything above `## The look`) whose sha256 is `60f8fa129516481f599a0fe6a21733bc170b4d484701928607ac9e6eb8e3e1cc`. Checker: D. Outcome: **OPEN round 2: 3 findings**. Line numbers are lines of `ART.md` as it stood with that hash.

Paste each replacement as it stands, bring anything you built on the old text into line, write the round and its outcome into the status block with the new sheet commit and hash, and set `Open: sheet ready for check, round 3`. Where a finding changes the mechanic, the error, the designed order or the saved state, the rules written on the old text are reopened. If you believe a finding is wrong, do not ignore it: paste nothing for it and say why in the status block, in one or two sentences, for the next checker.

## The checker's report

Check of the design sheet of `fruit-slicer` (Fruit Slicer, band 9 to 12), round 2, checker D. File: ``games/fruit-slicer/ART.md` as checked`, everything above `## The look`; its sha256 computes to 60f8fa129516481f599a0fe6a21733bc170b4d484701928607ac9e6eb8e3e1cc, as given. The diff against the round 1 copy shows the 16 pastes and the regrouped denominators sentence in line 181, and no other change.

Records: all 13 named records and `us-ca 6.NS.6.c` looked up today; code, standing, regime (`nl 10 B d`: 2026) and check state (every one `confirmed`) are as the sheet says.
Limits: every changed "Limits taken" line (179, 181, 183, 200, 202) and every changed sentence under "Where the two differ" and "The claim" was read against the Limits of the record it speaks for; they match, apart from finding 1 (a part not taken, not said) and finding 3 (a record not named).
Levels: ages 9, 10, 11 and 12 in both jurisdictions print as lines 172 to 174, 187 and 193 to 195 say (levels, `derived` and `convention`, sub-bands, the three gap lines, both lane labels).

Findings

1. **The claim, line 232 (first sentence), with lines 180 and 182.** Ruling 9. The pasted claim now marks each record taken in part, so `us-ca 4.NF.1` and `us-ca 4.NF.2`, left unmarked, are now said to be taken whole. Their Summaries ask the child to explain why two fractions are equal, and to write the result of a comparison and give a reason for it; in this game the lengths and the game do that, and the child tells and writes nothing. The same claim already treats the Dutch comparing records this way ("with the reason shown"). Round 1's finding 1 also counts nine records in part and its replacement marks eight.
Replace the first sentence of line 232 with:
"Fruit Slicer is designed from four content standards adopted by the California State Board of Education for grade 4 and grade 5 mathematics: `us-ca 4.NF.3.a`, and in part `us-ca 4.NF.1` (one length given two names by cutting, with the reason there to be seen in the lengths; the child is not asked to explain it), `us-ca 4.NF.2` (two shares compared as lengths, with the game ruling both into the same parts and laying the sign; the child writes no sign and gives no reason) and `us-ca 5.NF.4.a` (a fruit or a piece seen as equal parts of which some are taken; no product is named and no chain of operations is asked for)."
So that the list agrees with the claim, replace line 180 with:
"- `edu.us-ca.grade-4.mathematics.objective.4-nf-1` (`us-ca 4.NF.1`): state-board-adopted-standard, confirmed. Taken in part: one length gets two names by cutting, more parts and each part smaller: two quarter pieces on a half, four eighth pieces on the same half. Explaining why the two are equal, which the record also asks of the child, is not asked in a game without words: the lengths show it."
and replace line 182 with:
"- `edu.us-ca.grade-4.mathematics.objective.4-nf-2` (`us-ca 4.NF.2`): state-board-adopted-standard, confirmed. Taken in part: the cat's two shares differ in both numbers; they are compared as lengths from one left edge, then ruled into the same parts, and the sign for less than, equal or greater than is laid between them. The game does the ruling and lays the sign: writing the result and giving a reason for it, which the record also asks of the child, are not asked."
(Lines 181 and 183 stay as they are.)

2. **The scenes, line 160 (the glider), the pasted "Saved as the first beat starts" sentence.** Ruling 5. The last pose of a serve stays as long as the child likes (line 162) and every cell works (line 32), so a pelican that has already been served can be fed a whole uncut fruit, and the glider plays every time; in that case `finished` is set and the pieces it ate lie in `pieces` inside it (lines 133, 137), and the list names neither. Replace the two pasted sentences ("Saved as the first beat starts: the fruit leaves `pieces`, ... On load the window is empty and the two wait.") with:
"Saved as the first beat starts: the fruit leaves `pieces`, and so does any piece the pelican had already eaten; any piece in the pelican's tin is set on the shelf; `window` becomes none, and `finished` and `tinOpen` are cleared; a customer fed by hand is judged mixed, so `position` does not move. On load the window is empty and the two wait."

3. **Where the two differ, line 226 (the new bullet "More than one whole").** Three Dutch `fase-3` records are named (lines 205 to 210), so "The Dutch `fase-3` record" does not say which one, and the California record is not given by code either (pack: education, name-the-records-a-claim-rests-on.md). What the bullet says of each record is in that record's Limits. Replace the bullet with:
"- **More than one whole.** `us-ca 4.NF.3.a`, the California record the boa's order rests on, speaks of a fraction whose top number is above one and does not say that it is less than one whole. `nl rw/gb/5/06/fase3` speaks of compound fractions and does not define them. The game follows the California record: from `longer` on the boa's order is written as one fraction whose top number is larger than its bottom number, never as a whole number with a fraction beside it."

Checked and not a finding: the six grid rows (every cell has a sound, no row or column shares one; fruit and piece under the roller share the tick and differ in pitch, which ruling 8 allows); the three outcomes of a cycle cover the three causes of the serve; lines 120, 122 and 130 worked through for a move up, a move down and a move up then down (no second step on one idea, and the stored id decides); lines 133 and 137 against everything the sheet says stays; line 187 against the levels printed for 9, 11 and 12; the regrouped denominators in line 181 agree with that record's Limits.

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

OPEN round 2: 3 findings

## From the lead

One more, in text no round has opened. Handle it with the three above; the next checker reads your sentences as new text.

4. **The designed order and The scenes, on the customers who wait.** The sheet does not say what a touch on a waiting customer does while the one at the window is still unserved, nor what a piece given to a waiting customer becomes. The saved state has one `window` and holds eaten pieces only inside the served customer, so the rules have already had to choose. Write that choice into the sheet in one sentence each, where the waiting customers are described, so that every touch has an answer and nothing a waiting customer takes is lost on load (it is stored, or it is short-lived and the sentence says so), and bring the rules into line if they differ.
