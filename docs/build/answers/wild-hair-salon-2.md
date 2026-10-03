# Answers for Wild Hair Salon: the check of the sheet, round 2

Checked: the sheet part of `games/wild-hair-salon/ART.md` (everything above `## The look`) whose sha256 is `38e2a8fe07423a9020a75116f9bf30b65d357e1e6b630795fe6519151df9e3c6`. Checker: D. Outcome: **OPEN round 2: 1 findings**. Line numbers are lines of `ART.md` as it stood with that hash.

Paste each replacement as it stands, bring anything you built on the old text into line, write the round and its outcome into the status block with the new sheet commit and hash, and set `Open: sheet ready for check, round 3`. Where a finding changes the mechanic, the error, the designed order or the saved state, the rules written on the old text are reopened. If you believe a finding is wrong, do not ignore it: paste nothing for it and say why in the status block, in one or two sentences, for the next checker.

## The checker's report

Check of the design sheet for `wild-hair-salon` (Wild Hair Salon, band 4 to 6), round 2, checker D. File read: `wild-hair-salon-r2.md`, everything above `## The look`; its sha256 is `38e2a8fe07423a9020a75116f9bf30b65d357e1e6b630795fe6519151df9e3c6`, as given. Line numbers are lines of that file.

Records: all six exist, and code, standing and check state (`confirmed`) are as the lookup prints today; the changed record lines (163, 165, 186, 191) hold no web address and no suspected paste of official wording.
Limits: the two changed "Limits taken" lines (163 for `us-ca 3.1`, 165 for `us-ca K.MD.2`) hold only what each record's Limits says, and the claim (191) names the part taken of each record and says no more than the records carry.
Levels: unchanged since round 1 and still as printed at 4, 5 and 6 in both jurisdictions (us-ca official, nl convention, lane labels as printed, no gap). The diff shows 18 pasted lines and five lines the builder changed itself (101, 106, 142, 143, 146); all were read with their neighbours, and one fault is open.

## Findings

**1. "The designed order, and what is stored", line 112 (ruling 5).** The coming-in list leaves out `clippings` and `ribbon`, which line 148 says change when the pair that was done go out, and the first sentence now contradicts line 146, under which a lock held while the cape is off springs back and is not stored as held. Replace the line with:

`A lock under the cape that is held in the fingers is stored at the length it has. Hair that springs back, which is the friend's at any time and the customer's while the cape is off, changes neither `lock`, `model` nor `mane` when it is pulled or snipped. A ribbon or a clipping carried in the fingers is stored where it was picked up. No scene is stored, and each scene's outcome is saved when it starts: for the cape coming off, `cape`, `finished` and the new position; for coming in, the new `chair`, `friend`, `waiting`, `seed`, `lock`, `model`, `seat` and `mane`, with `cape` set to `on` and `finished` cleared, and what the pair that go out change: the pieces stuck on their faces taken out of `clippings`, and in `ribbon` a ribbon that hung beside a lock, in the mane or round a face put back on its peg at the length it has; for a thing shown once, its mark in `shown`, with what it changes in `mane` and `clippings`, and for the ribbon the ribbon on its peg at the length the showing leaves it. So a game put away in the middle of any scene opens in the state that scene ends in and plays nothing again. The largest state the game can reach is under two kilobytes, and a test holds it under half the 64 KB cap.`

finding 1: pasted
finding 2: pasted
finding 3: pasted
finding 4: pasted
finding 5: pasted
finding 6: pasted
finding 7: pasted
finding 8: pasted
finding 9: pasted

OPEN round 2: 1 findings
