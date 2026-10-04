# Answers for Claw Machine: the check of the sheet, round 6

Checked: the sheet part of `games/claw-machine/ART.md` (everything above `## The look`) whose sha256 is `6b48449a0d0b96ba531e3389a7695429b2346dda6f0ed0bf3c42a4612c6857bc`. Checker: the lead, from the diff. Outcome: **PASSED round 6**.

Round 5 (checker G) had two findings, each with its exact replacement (the delivery on a first visit, and what the first crew's snacks are rebuilt from), and the lead added a change of a few words in the sentence on the ending's fields. The diff of the sheet part as round 5 read it (sha256 `0d136f0904c70c54d6fb19b353736449fbc3cb6e12d7ed0e5318adeebd28441d`) against the sheet part now shows three changed lines; each holds its replacement as it was written, word for word, and the words the lead's change replaced are gone. Nothing else above `## The look` changed, so no checker read it again: the replacements were written by someone who is not the builder, and the builder pasted them and nothing more.

The sheet has passed. The sheet part must keep this hash until the game is merged; if you change it, ask for a new round.
