# Answers for Night Camp: the check of the sheet, round 8

Checked: the sheet part of `games/night-camp/ART.md` (everything above `## The look`) whose sha256 is `c66a8aa54bd783fd8afa44376f2e2e13c8729645a6a205934fb5124c122c6806`. Checker: the lead, from the diff. Outcome: **PASSED round 8**.

Round 7 (checker I) had one finding, with its exact replacement: the Limits line of `us-ca 6.RP.3.a`. The diff of the sheet part as round 7 read it (sha256 `b7e0137630a977fe902c825913e504aed3a3e28ae39fd698439e62341b8d54c8`) against the sheet part at commit `960b983d` and after shows one changed line, and that line is the replacement as the checker wrote it, word for word. Nothing else above `## The look` changed, so no checker read it again: the replacement was written by someone who is not the builder, and the builder pasted it and nothing more.

The sheet has passed. The sheet part must keep this hash until the game is merged; if you change it, ask for a new round.
