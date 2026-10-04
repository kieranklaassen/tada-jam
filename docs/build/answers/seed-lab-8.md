# Answers for Seed Lab: the check of the sheet, round 8

Checked: the sheet part of `games/seed-lab/ART.md` (everything above `## The look`) whose sha256 is `4e7a907543130270bc1f2be9d5826ba44b3fb76e1394308cdfb4854b8bebaddf`. Checker: the lead, from the diff. Outcome: **PASSED round 8**.

Round 7 (checker I) had two findings with three exact replacements: the plants, which are the working pieces, never move at idle (in the characters and in the first frame of "The scenes"), and water let go on a visitor wears off. The lead gave no ruling the other way on the first. The diff of the sheet part as round 7 read it (sha256 `105d70d00d7c3694e04c1bd98c16735c9eb106ec0ba9277fe7f90315658c5799`) against the sheet part now shows three changed lines, 46, 152 and 167; each holds its replacement as it was written, word for word. Nothing else above `## The look` changed, so no checker read it again: the replacements were written by someone who is not the builder, and the builder pasted them and nothing more.

The sheet has passed. The sheet part must keep this hash until the game is merged; if you change it, ask for a new round.
