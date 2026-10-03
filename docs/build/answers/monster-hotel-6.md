# Answers for Monster Hotel: the check of the sheet, round 6

Checked: the sheet part of `games/monster-hotel/ART.md` (everything above `## The look`) whose sha256 is `20b52b416397432dab83556af63d1e91a7d02216ad91e7efa2b3b7cee94131e1`. Checker: H. Outcome: **PASSED round 6**. Line numbers are lines of `ART.md` as it stood with that hash.

The sheet has passed. Record the round, the checker and this hash in the status block. The sheet part must keep this hash until the game is merged; if you change it, ask for a new round.

A note on commits, for every lane: a commit message ends with the one line `Co-Authored-By: Claude Code <noreply@anthropic.com>` and holds no web address. If a tool adds a second trailer with a link to your session, take it out of the message before you commit; do not rewrite a commit already pushed.

## The checker's report

Check of the Monster Hotel design sheet (key `monster-hotel`, band 9 to 12), round 6, checker H. Short round: no record lookup was needed or run.

Verified, in order:
- (a) Diff of ``games/monster-hotel/ART.md` as checked` against `monster-hotel-r6.md`: both are 285 lines with `## The look` at line 211, and the whole files differ in line 13 only, in its last sentence only. The sheet part of the r6 copy (lines 1 to 210) hashes to 20b52b416397432dab83556af63d1e91a7d02216ad91e7efa2b3b7cee94131e1, the hash given. The new sentence stands in the sheet word for word as round 5 wrote it ("The numerals on the two dials are drawn through the game's own `symbols.ts`, the copy of the template's module, and nowhere else."), and the old sentence ("Both are drawn through ...") is gone.
- (b) The new sentence read against its neighbours in the bullet "Symbols" (line 13) and against every other sentence of the sheet part that speaks of numerals, symbols or `symbols.ts`: line 11 (no symbol standing alone, play never depending on reading one), line 13's first four sentences (numerals drawn only in `symbols.ts`; numerals in one place, beside the flames and the icicles on the two dials; play never depends on a numeral; no letter or word), lines 38 and 39 (the dial rows of the grid, one to three flames or icicles), line 60 (the only symbols in the game are the numerals on the two dials, beside the flames and icicles they count), line 103 (nothing shows the place: no number, no label), line 115 (`kit` holds each dial from 1 to 3), line 123 (a pure function lists every numeral the page may draw, and it lists the two dials only), and line 152 (the stove at three flames). The new sentence contradicts none of them: each names the same two dials as the only place a numeral is drawn and `symbols.ts` as the only module that draws it. The subject "The numerals on the two dials" now has one referent, which was the point of round 5's finding.
- (c) Nothing else was reopened.

No findings.

finding 1: pasted

PASSED round 6 — sheet part hash 20b52b416397432dab83556af63d1e91a7d02216ad91e7efa2b3b7cee94131e1
