# Answers for Seed Lab: the check of the sheet, round 5

Checked: the sheet part of `games/seed-lab/ART.md` (everything above `## The look`) whose sha256 is `706bf5e9eed799f698a73d2697525d6971ce2724f068a3ef74fcbedd8fa200f1`. Checker: G. Outcome: **PASSED round 5**. Line numbers are lines of `ART.md` as it stood with that hash.

The sheet has passed. Record the round, the checker and this hash in the status block. The sheet part must keep this hash until the game is merged; if you change it, ask for a new round.

A note on commits, for every lane: a commit message ends with the one line `Co-Authored-By: Claude Code <noreply@anthropic.com>` and holds no web address. If a tool adds a second trailer with a link to your session, take it out of the message before you commit; do not rewrite a commit already pushed.

## The checker's report

Seed Lab (`seed-lab`, 9 to 12), sheet check round 5, checker G.

What was verified, in order:
- (a) Diff of `seed-lab-r4.md` against `seed-lab-r5.md`: above `## The look` (line 219 in both) the only difference is line 15, the last sentence of the bullet "Symbol rule" under "The band and its age rule". Old: "This run draws none." New, as written in the sheet: "The numerals are drawn through the game's own `symbols.ts`, the copy of the template's module, and nowhere else." Nothing else in the sheet part changed. The sheet part of r5 hashes to 706bf5e9eed799f698a73d2697525d6971ce2724f068a3ef74fcbedd8fa200f1, as given. All other differences (lines 270 to 274 and 277 to 280) are below `## The look` and outside this check.
- (b) The new sentence read against every sentence of the sheet part on numerals, `symbols.ts` or "this run": line 15 sentences 1 to 3 (numerals in `symbols.ts` only, two places, none alone), line 13 (no symbol standing alone), line 65 ("Object, picture, symbol": numerals in two places, and the count beside a sorted group not drawn while the owner's answer is awaited), line 101 (a wish is the sketch drawn that many times). No "this run" sentence is left in the sheet part. "The copy of the template's module" agrees with the guide (the template holds `symbols.ts` and the generator copies it into a game whose band starts at 6 or above). No record is touched by the change, so no lookup was run.
- Result: no contradiction and no sentence stale in the same way. The pass rests on one reading, stated so the lead can test it: the new sentence says by which route numerals are drawn, as sentence 1 of the same bullet already does, and it does not undo line 65's last sentence, under which the count beside a sorted group stays undrawn by default. If the built game does draw that count, line 65 is the stale sentence; the build was not read, so that cannot be judged here.

Findings in the sheet part: none.

Outside the checked part, not a finding and not in the hash (below `## The look`): line 253, the bullet "No writing", still says the numerals of the sheet "come later", while line 271 below it says the wish's numeral is drawn. It is stale in the same way the old sentence was. If the lead wants it in line, the bullet can read: "- **No writing.** A journal invites handwriting, and the game draws none: no word, no letter, and no scribble that could be read as one. The only numerals are the ones the sheet names, drawn through `symbols.ts`."

Seen in this sheet that other sheets may share:
- A sentence about what "this run" draws or leaves out is true when the sheet is written and goes stale once the game is built; the same statement can sit a second time in the art guide below the sheet, where no sheet check reads it.

finding 1: pasted
PASSED round 5 — sheet part hash 706bf5e9eed799f698a73d2697525d6971ce2724f068a3ef74fcbedd8fa200f1
