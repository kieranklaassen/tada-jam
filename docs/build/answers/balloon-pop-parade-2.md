# Answers for Balloon Pop Parade: the check of the sheet, round 2

Checked: the sheet part of `games/balloon-pop-parade/ART.md` (everything above `## The look`) whose sha256 is `21be665f52a86c79fbca9099d9d71440bfddf2e557124ac726c98356ce04f1a7`. Checker: D. Outcome: **OPEN round 2: 6 findings**. Line numbers are lines of `ART.md` as it stood with that hash.

Paste each replacement as it stands, bring anything you built on the old text into line, write the round and its outcome into the status block with the new sheet commit and hash, and set `Open: sheet ready for check, round 3`. Where a finding changes the mechanic, the error, the designed order or the saved state, the rules written on the old text are reopened. If you believe a finding is wrong, do not ignore it: paste nothing for it and say why in the status block, in one or two sentences, for the next checker.

## The checker's report

Check of the design sheet for `balloon-pop-parade` (Balloon Pop Parade, band 2 to 4), round 2, checker D. File read: ``games/balloon-pop-parade/ART.md` as checked`, lines 1 to 203; the sheet part hashes to `21be665f52a86c79fbca9099d9d71440bfddf2e557124ac726c98356ce04f1a7`. No file changed, no git run, `--wording` never passed.

Records: all nine exist, with code, scope, standing (`department-published-foundation` x4, `curriculum-institute-guidance` x5) and check state (`confirmed` x9) as the lookup prints today; `us-ca 2.1` and `nl` Hoeveelheden / 1, named as not used, exist and are confirmed, and the fase 1 sub-heading named on line 190 holds ten card records.
Limits: every changed "Limits taken" line holds only what that record's Limits says, except one item under the wrong label (finding 6); line 190 gives one record's number to three records (finding 2); the claim names whole five records whose own lines say "Not used" or "Short of the record" (finding 1).
Levels: us-ca ages 2, 3, 4 and nl ages 2, 3, 4 match the outlines where changed text touches them (line 190: peuters up to the fourth birthday, fase-1 groep 1; line 194: preschool-tk from age 3, Early and Later). The diff of the two copies is exactly the twelve pasted blocks, with no other changed line.

## Findings

**1. "The claim", line 202 (ruling 9).** Lines 165, 167, 169, 186 and 188 say the game takes only a part of `us-ca 2.5`, `1.4`, `1.6`, `nl` Hoeveelheden / 4 and the fase 1 Opereren met vormen en figuren / 1, and the claim names all five whole. Replace line 202 with:

```
Balloon Pop Parade is designed from four California learning foundations published by a state department, which are foundations and not standards: `us-ca 2.3` of the infant-toddler foundations, and, each in part, `us-ca 2.5`, `1.4` and `1.6` of the preschool and transitional kindergarten mathematics foundations (of `2.5` the earlier statement's sorting by one attribute, and not the later statement's more than one; of `1.4` seeing a small set without counting, and not telling how many; of `1.6` comparing two sets that are plainly equal or plainly unequal, and not the words for it or the later statement's comparing by counting). It is also designed from five statements of Dutch curriculum-institute guidance, which is guidance and not law: Opereren met vormen en figuren / 1 and Hoeveelheden / 3 and 6 of the peuter card; in part Hoeveelheden / 4 of the peuter card, of which it takes small amounts compared by eye, and not larger amounts or equal rows; and in part Opereren met vormen en figuren / 1 of the fase 1 card, of which it takes sorting by one attribute, and not by more than one. All nine records are confirmed. Sorting by one attribute is taken from both jurisdictions at every age of the band. Seeing a small set at a glance and comparing two small sets are taken from the Dutch peuter card and, from age 3, from the California preschool foundations; for age 2 no California record is named for them. Giving one for each is taken from the Dutch peuter card alone; no California record is named for it.
```

**2. "The records / nl", line 190 (pack: education, limits-come-from-the-limits-section.md; ruling 9).** "Their limit of 2 or 3" gives that number to all three peuter amount records, but only Hoeveelheden / 6 names it; the Limits of Hoeveelheden / 3 and / 4 say no number is set, as lines 184 and 186 already state. Replace line 190 with:

```
Not named: the peuter card's statement on counting small amounts (Hoeveelheden / 1). The game has no number words and never asks for a count, so its verb does not rest on that record. Not named either: the fase 1 card's statements on amounts (the bullets under Hoeveelheden (tot tenminste 20)). For amounts the game is designed from the peuter card alone, which the lookup returns at age 4 only up to the fourth birthday; for a four-year-old in groep 1 those three records are from the level below the child's own, and the limit of 2 or 3, which of the three only Hoeveelheden / 6 names, is taken from there.
```

**3. "The scenes", line 146 ("Found as left"; ruling 5).** `troop` is saved when the finger lifts but `finished` and `position` only when the scene starts after the flight, so a put-away during that flight leaves every friend holding a balloon with the cycle never judged, a state no sentence covers; and the beats run "in the order the balloons were taken" while the same line says that order is gone on load, with nothing said for a cycle finished after a load. Replace line 146 with:

```
**1. The march on the spot (the ending of a cycle).** *Cause:* the last friend of the troop takes its balloon; the scene plays each time that happens, also when a troop already served is filled again after a pop. *Beats, 5 to 7 seconds:* each friend in turn does its kind's own proud move with its balloon, in the order the balloons were taken; the troop marches three squeaky steps on the spot together; the balloons bob up in a wave from one end to the other; the troop settles, swaying, each friend looking up at its balloon. *Filled in from:* the kind, the size of the troop, and whether the balloons came one at a time (the friends take turns) or as one bunch (they jump together); the order of taking is short-lived and is not stored, so after a load the friends who already held a balloon go first, in the order they stand, and those served since follow in the order they were served. *Saved at the start,* which is the moment the finger lifts on the bunch that serves the last friend, before its flight is drawn: the first time for a troop, `finished` and `position` (the cycle is judged from `slips` at that moment), in the same save as `troop`; a later playing for the same troop saves `troop` and nothing more. *After it:* the troop stays as it is for as long as the child likes.
```

**4. "The designed order, and what is stored", line 111 (unchanged text that a change now contradicts).** "Its ending does not replay" is said of a finished troop without limit, while the new clause on line 146 has the ending play again each time a served troop is filled again after a pop. Replace line 111 with:

```
- `finished`: the troop on screen has been served and its cycle judged; both are stored in one save, when the finger lifts on the bunch that serves the last friend. On load its ending does not replay. In play the ending plays again each time the troop is filled again after a pop, and the cycle is not judged a second time. The next troop comes in on the child's touch.
```

**5. "The scenes", line 150 (pack: game-design, guided-discovery.md).** "Otherwise the other two play inside the step-in" covers only a game that does not open on a pair, so for a child of 4 or older the third showing (the first bunches) has no stated place. In line 150 replace the sentence "Otherwise the other two play inside the step-in, before the child's troop walks in." with:

```
Every first showing that does not play at the opening plays inside the step-in at which its idea arrives, before the child's troop walks in.
```

**6. "The records / us-ca", line 169 (ruling 9).** Whether two sets that differ by one count as clearly different is something Limits is silent on, and the line files it under "Left open by Limits". Replace line 169 with:

```
  Limits taken: two groups only (the friends without a balloon, and the balloons in one bunch); from the earlier statement, groups that are clearly equal or clearly different, with counting optional. Not used: the later statement's comparing by counting and its words for the smaller group. Left open by Limits: no number range, so one to three is the game's choice. Not in Limits: whether two sets of at most three that differ by one count as clearly different; treating them so is the game's own choice. Short of the record: the game asks for no word such as "same" or "more".
```

finding 1: pasted
finding 2: pasted
finding 3: pasted (no separate paste; its sentence stands in line 150 as finding 2 gave it)
finding 4: pasted
finding 5: pasted
finding 6: pasted
finding 7: pasted
finding 8: pasted
finding 9: pasted

OPEN round 2: 6 findings
