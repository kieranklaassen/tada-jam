# Answers for Night Camp: the check of the sheet, round 5

Checked: the sheet part of `games/night-camp/ART.md` (everything above `## The look`) whose sha256 is `40911a7cf7ff8792e7519bbc1776ed21162ef8af198249ffd34f424e2804e2c1`. Checker: G. Outcome: **PASSED round 5**. Line numbers are lines of `ART.md` as it stood with that hash.

The sheet has passed. Record the round, the checker and this hash in the status block. The sheet part must keep this hash until the game is merged; if you change it, ask for a new round.

A note on commits, for every lane: a commit message ends with the one line `Co-Authored-By: Claude Code <noreply@anthropic.com>` and holds no web address. If a tool adds a second trailer with a link to your session, take it out of the message before you commit; do not rewrite a commit already pushed.

## The checker's report

Checker G, Night Camp (`night-camp`, band 9 to 12), round 5, short round. No file changed, no git command that writes, no record lookup.

Verified, in order:
- (a) Diff of ``games/night-camp/ART.md` as checked` against `night-camp-r5.md`: `## The look` is at line 240 in both; the sheet part (lines 1 to 239) differs in exactly one line, line 68, and in nothing else (byte comparison; first difference at line 68, one hunk). Line 68 now reads, character for character, the new sentence asked for: `**Where each numeral lies.** All drawn by the game's own `symbols.ts`, the copy of the template's module, and nowhere else.` The sha256 of lines 1 to 239 of the r5 copy is 40911a7cf7ff8792e7519bbc1776ed21162ef8af198249ffd34f424e2804e2c1, the hash given. (Everything else the diff shows is below line 240, outside this check.)
- (b) The new sentence read against every other sentence of the sheet part on numerals, `symbols.ts` or "this run": line 14 (Symbol rule: all drawn by `symbols.ts`, on or beside the quantity, none alone), line 16 (whole numbers and fractions only, no decimal mark), line 23 (the numeral at the end of the row follows the last piece, in the toy), line 66 (the order stops at whole numbers and fractions on their quantities, no operation sign), lines 70 to 75 (the six places, with a fraction as two whole numbers with a bar and a whole number with a fraction beside it), line 77 (where no numeral lies). None is contradicted. The old "none in this run" was in tension with line 23; the new sentence removes that. "The copy of the template's module" agrees with the guide ("The design sheet" area, line 159, and "Symbols, and the defaults awaiting the owner"): the template holds `symbols.ts`, the generator copies it into a game whose band starts at 6 or above, and that module draws whole numbers, fractions with a bar and mixed numbers, which covers everything lines 70 to 75 ask for. No other sentence of the sheet part speaks of "this run", a spike or a build stage; nothing else is stale in the same way.
- (c) Nothing else reopened.

Findings: none.

finding 1: pasted
PASSED round 5 — sheet part hash 40911a7cf7ff8792e7519bbc1776ed21162ef8af198249ffd34f424e2804e2c1
