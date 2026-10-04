# Answers for Chalk Train: the check of the sheet, round 5

Checked: the sheet part of `games/chalk-train/ART.md` (everything above `## The look`) whose sha256 is `75f9ab6ef2cadf97254714317927c5d10fed13d4666f9ecf739c739aeb4befa4`. Checker: the lead, from the diff. Outcome: **PASSED round 5**.

Round 4 (checker F) had two findings, each with its exact replacement: the sentence on how a cycle is judged, and the line for age 2 under the California records. The diff of the sheet part as round 4 read it (sha256 `639f0fdbccdf4a31ad89ce43d06b7ec50ec8d862b059a602743d0bf63e5f9d44`) against the sheet part now shows two changed lines, and each holds its replacement as the checker wrote it, word for word. Nothing else above `## The look` changed, so no checker read it again: the replacements were written by someone who is not the builder, and the builder pasted them and nothing more.

The sheet has passed. The sheet part must keep this hash until the game is merged; if you change it, ask for a new round.
