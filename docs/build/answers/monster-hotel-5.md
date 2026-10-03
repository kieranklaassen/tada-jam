# Answers for Monster Hotel: the check of the sheet, round 5

Checked: the sheet part of `games/monster-hotel/ART.md` (everything above `## The look`) whose sha256 is `c8647e35c380a98d4819cafd7aee6f2090813aaaa0d40f41e3b9adbd79e34f1e`. Checker: G. Outcome: **OPEN round 5: 1 findings**. Line numbers are lines of `ART.md` as it stood with that hash.

Paste each replacement as it stands, bring anything you built on the old text into line, write the round and its outcome into the status block with the new sheet commit and hash, and set `Open: sheet ready for check, round 6`. Where a finding changes the mechanic, the error, the designed order or the saved state, the rules written on the old text are reopened. If you believe a finding is wrong, do not ignore it: paste nothing for it and say why in the status block, in one or two sentences, for the next checker.

A note on commits, for every lane: a commit message ends with the one line `Co-Authored-By: Claude Code <noreply@anthropic.com>` and holds no web address. If a tool adds a second trailer with a link to your session, take it out of the message before you commit; do not rewrite a commit already pushed.

## The checker's report

Monster Hotel, round 5 (short round), checker G.

Verified, in order:
- (a) Diff of monster-hotel-r4.md against monster-hotel-r5.md: above `## The look` (line 211 in both) the only difference is line 13, the last sentence of the bullet "Symbols" under "The band and its age rule"; old and new sentence are exactly as the particulars give them. The sheet part of the r5 copy hashes to c8647e35c380a98d4819cafd7aee6f2090813aaaa0d40f41e3b9adbd79e34f1e, as stated. (The other differences, lines 240, 251-264 and 280-285, are all below `## The look` and not part of this check.)
- (b) Read the new sentence against every sentence of the sheet part that speaks of numerals, `symbols.ts` or a run: line 11 (no symbol standing alone), line 13 (the rest of the bullet), lines 38-39 (the dials), line 60 (the only symbols are the numerals on the two dials), line 115 (`kit`, dial 1 to 3), line 123 (the pure function lists the two dials only). None of these is stale in the same way: no other sentence of the sheet part says what "this run" or a later one does. The template does hold `symbols.ts` and its test, so "the copy of the template's module" agrees with the guide.
- One fault found, in the new sentence's first word, against its nearest neighbour and against lines 60 and 123.

Findings

R5-1. "The band and its age rule", bullet "Symbols", line 13, last sentence. The sentence opens with "Both", and the sentence right before it is "No letter and no word is drawn anywhere.", so the nearest pair it can pick up is the letter and the word, which reads as the opposite of the wordless rule; the next pair back, "numerals and mathematics signs", would have the game draw signs, which lines 60 and 123 rule out (the only symbols are the numerals on the two dials). Only the third reading, the numeral on each of the two dials, is meant. Replace the last sentence of line 13 with exactly:

The numerals on the two dials are drawn through the game's own `symbols.ts`, the copy of the template's module, and nowhere else.

(The sheet part's hash changes with this edit, so the next copy needs a fresh hash.)

finding 1: pasted
OPEN round 5: 1 findings
