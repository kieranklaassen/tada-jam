# Answers for Monster Pizza: the check of the sheet, round 5

Checked: the sheet part of `games/monster-pizza/ART.md` (everything above `## The look`) whose sha256 is `92220d8dc3782f39fbbdd5a72e20c7aebc2ee27c62a7bb0fd98f9ddf680675c4`. Checker: the lead, from the diff. Outcome: **PASSED round 5**.

Round 4 (checker F) had four findings, each with its exact replacement: when the pieces on a pizza shuffle up and which piece bounces off, the poke that ends a scene and the wait after a pizza is pushed back, the first kitchen saved as the game opens, and what "Baking" saves at its start. The diff of the sheet part as round 4 read it (sha256 `751ecc107f746d21d15270b3c3ae52a3186f598d86e99c55ae1bc803aa81953c`) against the sheet part now shows four changed lines, 31, 165, 167 and 173; each holds its replacement as it was written, word for word. Nothing else above `## The look` changed, so no checker read it again: the replacements were written by someone who is not the builder, and the builder pasted them and nothing more.

The sheet has passed. The sheet part must keep this hash until the update is merged; if you change it, ask for a new round.
