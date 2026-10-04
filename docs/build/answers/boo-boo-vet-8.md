# Answers for Boo-Boo Vet: the check of the sheet, round 8

Checked: the sheet part of `games/boo-boo-vet/ART.md` (everything above `## The look`) whose sha256 is `4fbae62ad9d12b13ce23c8b7ba5dfb88ab681c95a362de50b3757bf61ad3b8cb`. Checker: the lead, from the diff. Outcome: **PASSED round 8**.

Round 7 (checker I) had two findings, each with its exact replacement: the last sentence of the well scene, and the sentence on a frightened animal under "The error as a consequence". The sheet part as round 7 read it (sha256 `e94e909365c8b5705b41acf3ee543910238b3e09c768cf207c13786c5b499d1f`) with those two replacements put in is, byte for byte, the sheet part at commit `3304910e` and after. Nothing else above `## The look` changed, so no checker read it again: the replacements were written by someone who is not the builder, and the builder pasted them and nothing more.

The sheet has passed. The sheet part must keep this hash until the game is merged; if you change it, ask for a new round.
