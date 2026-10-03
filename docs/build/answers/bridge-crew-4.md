# Answers for Bridge Crew: the check of the sheet, round 4

Checked: the sheet part of `games/bridge-crew/ART.md` (everything above `## The look`) whose sha256 is `6a615151bd7154460516548adc0222ee00a6c886e70706020c484369c21522d1`. Checker: F. Outcome: **OPEN round 4: 2 findings**. Line numbers are lines of `ART.md` as it stood with that hash.

Paste each replacement as it stands, bring anything you built on the old text into line, write the round and its outcome into the status block with the new sheet commit and hash, and set `Open: sheet ready for check, round 5`. Where a finding changes the mechanic, the error, the designed order or the saved state, the rules written on the old text are reopened. If you believe a finding is wrong, do not ignore it: paste nothing for it and say why in the status block, in one or two sentences, for the next checker.

## The checker's report

Check of the Bridge Crew sheet (`bridge-crew`, band 9 to 12), round 4, checker F. File: ``games/bridge-crew/ART.md` as checked`, everything above `## The look` (line 227); its sha256 is `6a615151bd7154460516548adc0222ee00a6c886e70706020c484369c21522d1`, as given. The diff against the round 3 copy shows five changed lines in the sheet part: the four pastes (136, 187, 218, 221) and one new row of the saved-state table (133, `across`). The answers file has no "From the lead" section.

Records: all ten named records print today with the code, standing, regime (`nl 45`: legal-core-goal, 2006) and check state (all `confirmed`) the sheet gives. None is about people or communicating (ruling 11: no case). Line 184 speaks for the four `us-ca` science lanes the lookup returned (14, 13, 19 and 6 records); their Summaries bear it out, `us-ca 4-ESS3-2` included. Line 221 holds for the ten records as read.
Limits: line 187 as pasted agrees with the Limits of `us-ca 3-5-ETS1-3`. In the sweep for ruling 9 the other nine "Limits taken" lines hold only what each Limits says, each "left open" is stated by that Limits itself, and no record is taken in part and claimed whole. Ruling 8: all 30 grid cells carry a sound word. Ruling 10: every "no record" sentence is scoped to the records named or the lanes returned.
Levels: no changed line touches a level. The outlines for science at 9, 10, 11 and 12 in both jurisdictions still print the levels, sub-bands, bases, lane labels and gaps as lines 182 and 201 give them. The changed `shown` row (136) agrees with lines 168 and 169. The new `across` row (133) agrees with lines 138, 166 and 174, and disagrees with its two neighbours below.

Findings

1. **The designed order, and what is stored: line 116, against the new row at line 133 (ruling 5; "Found as left").** Until this round the third sentence of line 116 was the only rule for a vehicle on the far bank, and it puts the job vehicle at the near bank once the bridge has changed since its crossing. The new `across` row says a change to the bridge leaves a parked vehicle of the newest sheet where it is. The last sentence of line 116 exempts the newest sheet only for its tries and its waiting vehicles, so for a judged newest sheet taken back from the rack after a change to its bridge the two lines put the job vehicle on different banks. Replace the sentence `The newest sheet keeps its tries and its waiting vehicles while it lies on the rack, and its cycle goes on when it is back on the board.` with:
``The newest sheet is not rebuilt that way: while it lies on the rack it keeps its tries, its waiting vehicles and its parked vehicles, which `tries`, `waiting` and `across` hold, and its cycle goes on when it is back on the board.``

2. **Every field of the saved state: line 132, against the new row at line 133.** `waiting` keeps "the one other vehicle" at the near bank from the job vehicle's crossing on, with no end. `across` puts that same vehicle on the far bank from its own crossing until it is sent home. Between those two moments the two rows hold one vehicle on both banks, and `waiting` does not say it returns when sent home. Replace the row with:
``| `waiting` | Which vehicles stand at the near bank of the newest sheet: its job vehicle until it has crossed, then the one other vehicle until it has crossed, and each of the two again once it has been sent home. A vehicle is never in both `waiting` and `across`. |``

finding 1: pasted
finding 2: pasted
finding 3: pasted
finding 4: pasted

OPEN round 4: 2 findings
